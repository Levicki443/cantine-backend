/**
 * @fileoverview Contrôleur pour la gestion des ingrédients et le suivi des stocks.
 * @module controllers/ingredientController
 * Conforme aux sections 5.6, 5.7, 7 et aux règles 6 et 16.
 */

import Ingredient from '../models/Ingredient.js';
import StockMovement from '../models/StockMovement.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import {
  AUDIT_ACTIONS,
  ENTITY_STATUSES,
  SYSTEM_DEFAULTS,
  ROLES
} from '../config/constants.js';

/**
 * Récupère la liste paginée des ingrédients avec critères de recherche.
 */
export const getIngredients = async (req, res, next) => {
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

    if (req.query.enAlerte === 'true') {
      filtre.$expr = { $lte: ['$quantite_stock', '$seuil_minimum'] };
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q.trim(), 'i');
      filtre.$or = [{ nom: regex }, { categorie: regex }];
    }

    const [total, ingredients] = await Promise.all([
      Ingredient.countDocuments(filtre),
      Ingredient.find(filtre).sort({ categorie: 1, nom: 1 }).skip(skip).limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      ingredients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les ingrédients actuellement en alerte de stock ou en rupture.
 */
export const getStockAlerts = async (req, res, next) => {
  try {
    const ingredientsEnAlerte = await Ingredient.find({
      statut: ENTITY_STATUSES.ACTIVE,
      $expr: { $lte: ['$quantite_stock', '$seuil_minimum'] }
    }).sort({ quantite_stock: 1 });

    res.status(200).json({
      success: true,
      totalAlerte: ingredientsEnAlerte.length,
      ingredients: ingredientsEnAlerte
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte le détail d'un ingrédient par son identifiant.
 */
export const getIngredientById = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingrédient introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      ingredient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée un nouvel ingrédient en stock.
 */
export const createIngredient = async (req, res, next) => {
  try {
    const nouvelIngredient = await Ingredient.create(req.body);

    // Si un stock initial est renseigné, enregistrer un mouvement initial
    if (nouvelIngredient.quantite_stock > 0) {
      await StockMovement.create({
        ingredient_id: nouvelIngredient._id,
        type_mouvement: 'ajustement inventaire',
        quantite: nouvelIngredient.quantite_stock,
        quantite_avant: 0,
        quantite_apres: nouvelIngredient.quantite_stock,
        motif: 'Stock initial à la création',
        utilisateur_id: req.user._id
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Ingredient',
      reference: nouvelIngredient._id.toString(),
      details: {
        nom: nouvelIngredient.nom,
        categorie: nouvelIngredient.categorie,
        stockInitial: nouvelIngredient.quantite_stock
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Ingrédient enregistré avec succès.',
      ingredient: nouvelIngredient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Modifie les paramètres d'un ingrédient (prix, seuil, etc.).
 */
export const updateIngredient = async (req, res, next) => {
  try {
    // Interdire la modification brute directe du stock par PUT (doit passer par adjustStock)
    const updates = { ...req.body };
    delete updates.quantite_stock;

    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingrédient introuvable.'
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Ingredient',
      reference: ingredient._id.toString(),
      details: { modifications: updates },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Ingrédient mis à jour avec succès.',
      ingredient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Régularise manuellement le stock (inventaire, perte ou correction avec justification obligatoire).
 */
export const adjustStock = async (req, res, next) => {
  try {
    const { quantite, type_mouvement, motif, reference_operation } = req.body;

    const mouvement = await StockMovement.enregistrer({
      ingredientId: req.params.id,
      typeMouvement: type_mouvement,
      quantite,
      motif,
      referenceOperation: reference_operation,
      utilisateurId: req.user._id
    });

    const ingredientMisAJour = await Ingredient.findById(req.params.id);

    // Si le stock passe sous le seuil d'alerte, émettre une notification
    if (ingredientMisAJour.est_en_alerte_stock) {
      await Notification.emettre({
        roleCible: ROLES.MANAGER,
        titre: `Alerte stock faible : ${ingredientMisAJour.nom}`,
        message: `Le stock actuel (${ingredientMisAJour.quantite_stock} ${ingredientMisAJour.unite}) est inférieur au seuil minimum (${ingredientMisAJour.seuil_minimum}).`,
        type: 'alerte_stock'
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.STOCK_ADJUSTMENT,
      entite: 'StockMovement',
      reference: mouvement._id.toString(),
      details: {
        ingredient: ingredientMisAJour.nom,
        mouvement: type_mouvement,
        quantite,
        nouveauStock: ingredientMisAJour.quantite_stock,
        motif
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Mouvement de stock enregistré avec succès.',
      nouveauStock: ingredientMisAJour.quantite_stock,
      mouvement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère l'historique complet et inaltérable des mouvements d'un ingrédient.
 */
export const getIngredientMovements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const [total, mouvements] = await Promise.all([
      StockMovement.countDocuments({ ingredient_id: req.params.id }),
      StockMovement.find({ ingredient_id: req.params.id })
        .populate('utilisateur_id', 'nom prenom role')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      mouvements
    });
  } catch (error) {
    next(error);
  }
};

