/**
 * @fileoverview Contrôleur pour la gestion des menus journaliers de la cantine.
 * @module controllers/menuController
 * Conforme aux sections 5.5, 7 et aux exigences d'audit.
 */

import Menu from '../models/Menu.js';
import AuditLog from '../models/AuditLog.js';
import {
  AUDIT_ACTIONS,
  ENTITY_STATUSES,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

/**
 * Récupère la liste des menus avec filtrage par date ou période.
 */
export const getMenus = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.date) {
      const debutJour = new Date(req.query.date);
      debutJour.setHours(0, 0, 0, 0);
      const finJour = new Date(req.query.date);
      finJour.setHours(23, 59, 59, 999);
      filtre.date_menu = { $gte: debutJour, $lte: finJour };
    }

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    } else {
      filtre.statut = { $ne: ENTITY_STATUSES.ARCHIVED };
    }

    const [total, menus] = await Promise.all([
      Menu.countDocuments(filtre),
      Menu.find(filtre)
        .populate('repas.meal_id', 'nom categorie prix disponible image')
        .sort({ date_menu: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      menus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le menu prévu pour la journée en cours.
 */
export const getTodayMenu = async (req, res, next) => {
  try {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date();
    finJour.setHours(23, 59, 59, 999);

    const menu = await Menu.findOne({
      date_menu: { $gte: debutJour, $lte: finJour },
      statut: ENTITY_STATUSES.ACTIVE
    }).populate('repas.meal_id', 'nom categorie prix disponible image quantite_disponible');

    if (!menu) {
      return res.status(200).json({
        success: true,
        message: 'Aucun menu spécifique n’est planifié pour aujourd’hui.',
        menu: null
      });
    }

    res.status(200).json({
      success: true,
      menu
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte les détails d'un menu spécifique par son identifiant.
 */
export const getMenuById = async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.id).populate(
      'repas.meal_id',
      'nom categorie prix disponible image quantite_disponible'
    );

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      menu
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée un nouveau menu avec composition de repas.
 */
export const createMenu = async (req, res, next) => {
  try {
    const nouveauMenu = await Menu.create(req.body);

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Menu',
      reference: nouveauMenu._id.toString(),
      details: {
        nom: nouveauMenu.nom,
        dateMenu: nouveauMenu.date_menu,
        nbRepas: nouveauMenu.repas.length
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    const menuPeuple = await Menu.findById(nouveauMenu._id).populate(
      'repas.meal_id',
      'nom categorie prix'
    );

    res.status(201).json({
      success: true,
      message: 'Menu créé et publié avec succès.',
      menu: menuPeuple
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour un menu existant.
 */
export const updateMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('repas.meal_id', 'nom categorie prix disponible');

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu introuvable.'
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Menu',
      reference: menu._id.toString(),
      details: { modifications: req.body },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Menu mis à jour avec succès.',
      menu
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive un menu.
 */
export const deleteMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu introuvable.'
      });
    }

    menu.statut = ENTITY_STATUSES.ARCHIVED;
    await menu.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.DELETE,
      entite: 'Menu',
      reference: menu._id.toString(),
      details: { statut: 'archivé' },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Menu archivé avec succès.'
    });
  } catch (error) {
    next(error);
  }
};

