/**
 * @fileoverview Définition des routes pour la planification intelligente des menus et achats.
 * @module routes/planningRoutes
 * Conforme aux sections 2 et 5 du cahier des charges opérationnel.
 */

import express from 'express';
import {
  estimateIngredients,
  generatePurchaseList,
  duplicateWeekMenu,
  getWeeklyPlanning,
  updateWeeklyPlanning
} from '../controllers/planningController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/planning/weekly
 * @desc    Obtient le planning hebdomadaire, la suggestion du chef et les horaires (Public / Authentifié)
 */
router.get('/weekly', getWeeklyPlanning);

/**
 * @route   PUT /api/planning/weekly
 * @desc    Met à jour le planning hebdomadaire et les horaires de service (Admin / Gestionnaire)
 */
router.put(
  '/weekly',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.GESTIONNAIRE),
  updateWeeklyPlanning
);

/**
 * @route   POST /api/planning/estimate-ingredients
 * @desc    Estime automatiquement les ingrédients requis selon les portions prévues
 * @access  Privé (Administrateur, Gestionnaire, Cuisine)
 */
router.post(
  '/estimate-ingredients',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.GESTIONNAIRE),
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
  authorize(ROLES.ADMIN, ROLES.GESTIONNAIRE),
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
  authorize(ROLES.ADMIN, ROLES.GESTIONNAIRE),
  duplicateWeekMenu
);

export default router;
