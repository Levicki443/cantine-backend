/**
 * @fileoverview Middlewares d'authentification et de contrôle d'accès par rôle (RBAC).
 * @module middlewares/authMiddleware
 * Conforme aux normes de sécurité bancaire et aux règles de gestion 1 & 2.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ENTITY_STATUSES } from '../config/constants.js';

/**
 * Vérifie la présence et la validité du jeton JWT.
 * Injecte l'utilisateur authentifié dans l'objet de requête `req.user`.
 */
export const authenticate = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès refusé. Aucun jeton d’authentification fourni.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret_de_secours_non_securise'
    );

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'L’utilisateur associé à ce jeton n’existe plus.'
      });
    }

    if (currentUser.statut !== ENTITY_STATUSES.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: 'Ce compte utilisateur a été suspendu ou désactivé.'
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Votre session a expiré. Veuillez vous reconnecter.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Jeton d’authentification invalide ou corrompu.'
    });
  }
};

/**
 * Restreint l'accès aux seules personnes possédant les rôles autorisés.
 * @param {...string} roles Liste des rôles ayant droit d'accès.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification préalable requise.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès non autorisé pour le rôle : « ${req.user.role} ».`
      });
    }

    next();
  };
};

