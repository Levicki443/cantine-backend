/**
 * @fileoverview Contrôleur pour la gestion des repas et plats de la cantine.
 * @module controllers/mealController
 * Conforme aux sections 5.4, 7 et aux règles d'audit.
 */

import Meal from '../models/Meal.js';
import AuditLog from '../models/AuditLog.js';
import {
  AUDIT_ACTIONS,
  ENTITY_STATUSES,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

/**
 * Récupère la liste paginée des repas avec filtres de recherche.
 */
export const getMeals = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    } else {
      filtre.statut = { $ne: ENTITY_STATUSES.ARCHIVED };
    }

    if (req.query.categorie) {
      filtre.categorie = req.query.categorie;
    }

    if (req.query.disponible !== undefined) {
      filtre.disponible = req.query.disponible === 'true';
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q.trim(), 'i');
      filtre.$or = [{ nom: regex }, { description: regex }];
    }

    const [total, repas] = await Promise.all([
      Meal.countDocuments(filtre),
      Meal.find(filtre).sort({ categorie: 1, nom: 1 }).skip(skip).limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      repas
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte le détail d'un repas par son identifiant.
 */
export const getMealById = async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Repas introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      repas: meal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée un nouveau repas dans la carte de la cantine.
 */
export const createMeal = async (req, res, next) => {
  try {
    const nouveauRepas = await Meal.create(req.body);

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Meal',
      reference: nouveauRepas._id.toString(),
      details: {
        nom: nouveauRepas.nom,
        categorie: nouveauRepas.categorie,
        prix: nouveauRepas.prix
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Repas ajouté avec succès à la carte.',
      repas: nouveauRepas
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Modifie les caractéristiques d'un repas existant.
 */
export const updateMeal = async (req, res, next) => {
  try {
    const meal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Repas introuvable.'
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Meal',
      reference: meal._id.toString(),
      details: { modifications: req.body },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Repas mis à jour avec succès.',
      repas: meal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ajuste le nombre de portions disponibles pour le service.
 */
export const adjustPortions = async (req, res, next) => {
  try {
    const { quantite, operation } = req.body;
    const meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Repas introuvable.'
      });
    }

    if (operation === 'ajouter') {
      await meal.ajouterPortions(quantite);
    } else {
      await meal.deduirePortions(quantite);
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Meal',
      reference: meal._id.toString(),
      details: {
        operation: `Ajustement portions (${operation})`,
        quantite,
        nouvelleQuantiteDisponible: meal.quantite_disponible
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Portions ajustées avec succès (${operation} de ${quantite}).`,
      quantite_disponible: meal.quantite_disponible,
      disponible: meal.disponible
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Active ou désactive la disponibilité d'un repas.
 */
export const toggleMealAvailability = async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Repas introuvable.'
      });
    }

    meal.disponible = !meal.disponible;
    await meal.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Meal',
      reference: meal._id.toString(),
      details: { disponibilite: meal.disponible },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Disponibilité du plat modifiée : ${meal.disponible ? 'Disponible à la vente' : 'Indisponible'}.`,
      disponible: meal.disponible
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive un repas (suppression logique pour préserver les historiques comptables).
 */
export const deleteMeal = async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Repas introuvable.'
      });
    }

    meal.statut = ENTITY_STATUSES.ARCHIVED;
    meal.disponible = false;
    await meal.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.DELETE,
      entite: 'Meal',
      reference: meal._id.toString(),
      details: { statut: 'archivé' },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Repas archivé avec succès.'
    });
  } catch (error) {
    next(error);
  }
};

