/**
 * @fileoverview Définition des routes pour le module d'hygiène et sécurité alimentaire.
 * @module routes/hygieneRoutes
 * Conforme à la section 7 du cahier des charges opérationnel.
 */

import express from 'express';
import {
  getDailyChecklist,
  updateDailyChecklist,
  getHygieneHistory
} from '../controllers/hygieneController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/hygiene/daily
 * @desc    Obtient ou initialise la checklist d'hygiène du jour
 * @access  Privé (Personnel de cantine)
 */
router.get(
  '/daily',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  getDailyChecklist
);

/**
 * @route   PUT /api/hygiene/daily/:id
 * @desc    Met à jour l'exécution des tâches d'hygiène et les températures
 * @access  Privé (Personnel de cantine)
 */
router.put(
  '/daily/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN),
  updateDailyChecklist
);

/**
 * @route   GET /api/hygiene/history
 * @desc    Consulte l'historique des rapports et taux de conformité
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.get(
  '/history',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getHygieneHistory
);

export default router;

