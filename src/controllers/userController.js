/**
 * @fileoverview Contrôleur d'administration pour la gestion globale des utilisateurs.
 * @module controllers/userController
 * Gestion des comptes (Clients, Caissiers, Gestionnaires, Admins), statuts et audit.
 */

import User from '../models/User.js';
import Client from '../models/Client.js';
import AuditLog from '../models/AuditLog.js';
import { AUDIT_ACTIONS, ROLES, ROLES_LIST } from '../config/constants.js';

/**
 * Récupère la liste filtrée et paginée des utilisateurs.
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, statut, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role && ROLES_LIST.includes(role)) {
      filter.role = role;
    }
    if (statut) {
      filter.statut = statut;
    }
    if (search) {
      const sanitized = search.trim();
      filter.$or = [
        { nom: { $regex: sanitized, $options: 'i' } },
        { prenom: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
        { telephone: { $regex: sanitized, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-mot_de_passe')
        .sort({ date_creation: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / take),
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le détail d'un utilisateur par son ID.
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-mot_de_passe');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    let clientInfo = null;
    if (user.role === ROLES.CLIENT) {
      clientInfo = await Client.findOne({ user_id: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      client: clientInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour les informations, le rôle ou le statut d'un utilisateur.
 */
export const updateUser = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, role, statut } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    // Protection : interdiction de rétrograder le dernier administrateur actif
    if (targetUser.role === ROLES.ADMIN && role && role !== ROLES.ADMIN) {
      const activeAdmins = await User.countDocuments({ role: ROLES.ADMIN, statut: 'actif' });
      if (activeAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de rétrograder le dernier administrateur actif du système.'
        });
      }
    }

    if (nom) targetUser.nom = nom.trim();
    if (prenom) targetUser.prenom = prenom.trim();
    if (email) targetUser.email = email.toLowerCase().trim();
    if (telephone !== undefined) targetUser.telephone = telephone ? telephone.trim() : null;
    if (role && ROLES_LIST.includes(role)) targetUser.role = role;
    if (statut && ['actif', 'inactif', 'suspendu'].includes(statut)) targetUser.statut = statut;

    await targetUser.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'User',
      reference: targetUser._id.toString(),
      details: { roleModifie: role, statutModifie: statut },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès.',
      user: {
        _id: targetUser._id,
        nom: targetUser.nom,
        prenom: targetUser.prenom,
        email: targetUser.email,
        role: targetUser.role,
        statut: targetUser.statut
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bascule le statut d'un compte (actif / inactif).
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Compte introuvable.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte administrateur.'
      });
    }

    user.statut = user.statut === 'actif' ? 'inactif' : 'actif';
    await user.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'User',
      reference: user._id.toString(),
      details: { nouveauStatut: user.statut },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Le compte a été ${user.statut === 'actif' ? 'activé' : 'désactivé'} avec succès.`,
      statut: user.statut
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime un compte utilisateur avec vérifications strictes.
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Compte introuvable.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte.'
      });
    }

    if (user.role === ROLES.ADMIN) {
      const activeAdmins = await User.countDocuments({ role: ROLES.ADMIN, statut: 'actif' });
      if (activeAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le dernier administrateur.'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    if (user.role === ROLES.CLIENT) {
      await Client.findOneAndDelete({ user_id: req.params.id });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.DELETE,
      entite: 'User',
      reference: user.email,
      details: { nom: `${user.prenom} ${user.nom}`, role: user.role },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Compte supprimé définitivement du système.'
    });
  } catch (error) {
    next(error);
  }
};

