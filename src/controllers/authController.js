/**
 * @fileoverview Contrôleur des flux d'authentification et de gestion des identités.
 * @module controllers/authController
 * Conforme aux règles d'audit, de traçabilité et de sécurité bancaire.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import AuditLog from '../models/AuditLog.js';
import {
  ROLES,
  AUDIT_ACTIONS,
  ENTITY_STATUSES,
  CLIENT_CATEGORIES
} from '../config/constants.js';

/**
 * Génère un jeton d'authentification JWT signé.
 * @param {string} userId Identifiant MongoDB de l'utilisateur.
 * @param {string} role Rôle applicatif de l'utilisateur.
 * @returns {string} Jeton JWT.
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'secret_de_secours_non_securise',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

/**
 * Enregistrement / Création d'un nouvel utilisateur.
 * Le premier compte créé hérite automatiquement du rôle Administrateur.
 */
export const register = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe, role, statut } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Une adresse courriel identique est déjà associée à un compte.'
      });
    }

    // Si aucun utilisateur n'existe encore dans le système, le premier devient Administrateur
    const totalUsers = await User.countDocuments();
    const assignedRole = totalUsers === 0 ? ROLES.ADMIN : (role || ROLES.CLIENT);

    const newUser = await User.create({
      nom,
      prenom,
      email,
      telephone,
      mot_de_passe_hash: mot_de_passe,
      role: assignedRole,
      statut: statut || ENTITY_STATUSES.ACTIVE
    });

    // Création automatique du portefeuille client si inscription avec profil client
    let clientProfile = null;
    if (assignedRole === ROLES.CLIENT) {
      clientProfile = await Client.create({
        nom,
        prenom,
        telephone: telephone || '',
        categorie: CLIENT_CATEGORIES.STUDENT,
        solde: 0,
        credit_autorise: false,
        plafond_credit: 0,
        statut: ENTITY_STATUSES.ACTIVE
      });
    }

    await AuditLog.record({
      utilisateurId: req.user ? req.user._id : newUser._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'User',
      reference: newUser._id.toString(),
      details: { email: newUser.email, role: newUser.role },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    const token = generateToken(newUser._id, newUser.role);
    const userResponse = newUser.toJSON();
    if (clientProfile) {
      userResponse.solde = clientProfile.solde;
      userResponse.clientId = clientProfile._id;
      userResponse.categorie = clientProfile.categorie;
    }

    res.status(201).json({
      success: true,
      message: 'Compte utilisateur créé avec succès.',
      token,
      utilisateur: userResponse
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authentification d'un utilisateur et émission du jeton d'accès.
 */
export const login = async (req, res, next) => {
  try {
    const { email, mot_de_passe } = req.body;

    const user = await User.findOne({ email }).select('+mot_de_passe_hash');

    if (!user) {
      await AuditLog.record({
        action: AUDIT_ACTIONS.LOGIN,
        entite: 'User',
        reference: email,
        details: { raison: 'Utilisateur inexistant' },
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statut: 'échec'
      });

      return res.status(401).json({
        success: false,
        message: 'Identifiants de connexion invalides.'
      });
    }

    if (user.statut !== ENTITY_STATUSES.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: 'Ce compte utilisateur a été suspendu ou désactivé.'
      });
    }

    const isMatch = await user.comparePassword(mot_de_passe);
    if (!isMatch) {
      await AuditLog.record({
        utilisateurId: user._id,
        action: AUDIT_ACTIONS.LOGIN,
        entite: 'User',
        reference: user._id.toString(),
        details: { raison: 'Mot de passe incorrect' },
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statut: 'échec'
      });

      return res.status(401).json({
        success: false,
        message: 'Identifiants de connexion invalides.'
      });
    }

    // Mise à jour de la date de dernière connexion
    user.derniere_connexion = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

    // Récupération des informations de portefeuille si profil client
    const userResponse = user.toJSON();
    if (user.role === ROLES.CLIENT) {
      const client = await Client.findOne({
        $or: [
          ...(user.telephone ? [{ telephone: user.telephone }] : []),
          { nom: user.nom, prenom: user.prenom }
        ]
      });
      if (client) {
        userResponse.solde = client.solde;
        userResponse.clientId = client._id;
        userResponse.categorie = client.categorie;
      }
    }

    await AuditLog.record({
      utilisateurId: user._id,
      action: AUDIT_ACTIONS.LOGIN,
      entite: 'User',
      reference: user._id.toString(),
      details: { role: user.role },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      token,
      utilisateur: userResponse
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupération du profil de l'utilisateur actuellement connecté.
 */
export const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    utilisateur: req.user
  });
};

/**
 * Changement du mot de passe utilisateur.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    const user = await User.findById(req.user._id).select('+mot_de_passe_hash');
    const isMatch = await user.comparePassword(ancien_mot_de_passe);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "L'ancien mot de passe fourni est incorrect."
      });
    }

    user.mot_de_passe_hash = nouveau_mot_de_passe;
    await user.save();

    await AuditLog.record({
      utilisateurId: user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'User',
      reference: user._id.toString(),
      details: { motif: 'Mise à jour du mot de passe' },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès.'
    });
  } catch (error) {
    next(error);
  }
};

