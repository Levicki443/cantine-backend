/**
 * @fileoverview Définition des routes de l'API pour les dépenses de fonctionnement.
 * @module routes/expenseRoutes
 * Sécurisé par RBAC.
 */

import express from 'express';
import {
  getExpenses,
  createExpense,
  validateExpense
} from '../controllers/expenseController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/expenses
 * @desc    Lister et filtrer les dépenses
 * @access  Admin, Gestionnaire
 */
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getExpenses
);

/**
 * @route   POST /api/expenses
 * @desc    Enregistrer une dépense
 * @access  Admin, Gestionnaire, Caissier
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  createExpense
);

/**
 * @route   PATCH /api/expenses/:id/validate
 * @desc    Valider ou rejeter une dépense engagée
 * @access  Admin
 */
router.patch(
  '/:id/validate',
  authorize(ROLES.ADMIN),
  validateExpense
);

export default router;

