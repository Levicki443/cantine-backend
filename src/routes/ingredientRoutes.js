/**
 * @fileoverview Définition des routes de l'API pour les ingrédients et stocks alimentaires.
 * @module routes/ingredientRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getIngredients,
  getStockAlerts,
  getIngredientById,
  createIngredient,
  updateIngredient,
  adjustStock,
  getIngredientMovements
} from '../controllers/ingredientController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createIngredientSchema,
  updateIngredientSchema,
  adjustStockSchema
} from '../validators/stockValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Toutes les opérations sur les ingrédients requièrent une authentification
router.use(authenticate);

/**
 * @route   GET /api/ingredients
 * @desc    Lister et filtrer les ingrédients avec pagination
 * @access  Admin, Gestionnaire, Personnel de cuisine
 */
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  getIngredients
);

/**
 * @route   GET /api/ingredients/alerts
 * @desc    Obtenir la liste des ingrédients en rupture ou sous le seuil d'alerte
 * @access  Admin, Gestionnaire, Personnel de cuisine
 */
router.get(
  '/alerts',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  getStockAlerts
);

/**
 * @route   GET /api/ingredients/:id
 * @desc    Consulter la fiche technique et le stock d'un ingrédient
 * @access  Admin, Gestionnaire, Personnel de cuisine
 */
router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  getIngredientById
);

/**
 * @route   GET /api/ingredients/:id/movements
 * @desc    Consulter l'historique inaltérable des mouvements de stock
 * @access  Admin, Gestionnaire
 */
router.get(
  '/:id/movements',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getIngredientMovements
);

/**
 * @route   POST /api/ingredients
 * @desc    Enregistrer une nouvelle matière première
 * @access  Admin, Gestionnaire
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(createIngredientSchema),
  createIngredient
);

/**
 * @route   PUT /api/ingredients/:id
 * @desc    Modifier les paramètres de référence de l'ingrédient
 * @access  Admin, Gestionnaire
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateIngredientSchema),
  updateIngredient
);

/**
 * @route   POST /api/ingredients/:id/adjust
 * @desc    Ajuster manuellement le stock avec motif obligatoire
 * @access  Admin, Gestionnaire
 */
router.post(
  '/:id/adjust',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(adjustStockSchema),
  adjustStock
);

export default router;

