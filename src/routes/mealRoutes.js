/**
 * @fileoverview Définition des routes de l'API pour les repas et la carte de la cantine.
 * @module routes/mealRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getMeals,
  getMealById,
  createMeal,
  updateMeal,
  adjustPortions,
  toggleMealAvailability,
  deleteMeal
} from '../controllers/mealController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createMealSchema,
  updateMealSchema,
  adjustPortionsSchema
} from '../validators/mealValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/meals
 * @desc    Lister et filtrer les repas (accessible pour consultation des menus)
 * @access  Public ou authentifié
 */
router.get('/', getMeals);

/**
 * @route   GET /api/meals/:id
 * @desc    Consulter la fiche d'un repas
 * @access  Public ou authentifié
 */
router.get('/:id', getMealById);

// Les routes ci-dessous nécessitent une authentification
router.use(authenticate);

/**
 * @route   POST /api/meals
 * @desc    Créer un nouveau repas
 * @access  Admin, Gestionnaire
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(createMealSchema),
  createMeal
);

/**
 * @route   PUT /api/meals/:id
 * @desc    Modifier un repas existant
 * @access  Admin, Gestionnaire
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateMealSchema),
  updateMeal
);

/**
 * @route   PATCH /api/meals/:id/portions
 * @desc    Ajuster le stock de portions disponibles
 * @access  Admin, Gestionnaire, Personnel de cuisine
 */
router.patch(
  '/:id/portions',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  validate(adjustPortionsSchema),
  adjustPortions
);

/**
 * @route   PATCH /api/meals/:id/availability
 * @desc    Basculer la disponibilité immédiate du repas
 * @access  Admin, Gestionnaire, Personnel de cuisine
 */
router.patch(
  '/:id/availability',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  toggleMealAvailability
);

/**
 * @route   DELETE /api/meals/:id
 * @desc    Archiver un repas
 * @access  Admin, Gestionnaire
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  deleteMeal
);

export default router;

