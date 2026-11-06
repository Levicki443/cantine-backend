/**
 * @fileoverview Définition des routes pour la planification intelligente des menus et achats.
 * @module routes/planningRoutes
 * Conforme aux sections 2 et 5 du cahier des charges opérationnel.
 */

import express from 'express';
import {
  estimateIngredients,
  generatePurchaseList,
  duplicateWeekMenu
} from '../controllers/planningController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   POST /api/planning/estimate-ingredients
 * @desc    Estime automatiquement les ingrédients requis selon les portions prévues
 * @access  Privé (Administrateur, Gestionnaire, Cuisine)
 */
router.post(
  '/estimate-ingredients',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  estimateIngredients
);

/**
 * @route   POST /api/planning/purchase-list
 * @desc    Génère la liste d'achats automatique (Besoin prévisionnel - Stock disponible)
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.post(
  '/purchase-list',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  generatePurchaseList
);

/**
 * @route   POST /api/planning/duplicate-week
 * @desc    Duplique une semaine entière de programmation de menus
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.post(
  '/duplicate-week',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  duplicateWeekMenu
);

export default router;

