/**
 * @fileoverview Définition des routes de l'API pour les tableaux de bord et rapports financiers.
 * @module routes/reportRoutes
 * Sécurisé par RBAC (accès réservé à la direction et gestionnaires).
 */

import express from 'express';
import {
  getDashboardSummary,
  getFinancialReport
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/reports/dashboard
 * @desc    Obtenir la synthèse opérationnelle du tableau de bord d'accueil
 * @access  Admin, Gestionnaire
 */
router.get(
  '/dashboard',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getDashboardSummary
);

/**
 * @route   GET /api/reports/financial
 * @desc    Générer le bilan financier filtrable par dates
 * @access  Admin, Gestionnaire
 */
router.get(
  '/financial',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getFinancialReport
);

export default router;

