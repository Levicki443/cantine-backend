/**
 * @fileoverview Définition des routes pour la satisfaction client, réclamations et fidélité.
 * @module routes/feedbackRoutes
 * Conforme à la section 8 du cahier des charges opérationnel.
 */

import express from 'express';
import {
  getFeedbacks,
  createFeedback,
  updateFeedbackStatus,
  getSatisfactionKPIs
} from '../controllers/feedbackController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/feedbacks
 * @desc    Liste les avis et réclamations avec filtres
 * @access  Privé (Personnel de cantine)
 */
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getFeedbacks
);

/**
 * @route   GET /api/feedbacks/kpis
 * @desc    Obtient le taux de satisfaction globale et synthèse des retours
 * @access  Privé (Personnel de cantine)
 */
router.get(
  '/kpis',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getSatisfactionKPIs
);

/**
 * @route   POST /api/feedbacks
 * @desc    Soumettre un avis ou réclamation (public ou client connecté)
 * @access  Public / Authentifié
 */
router.post(
  '/',
  createFeedback
);

/**
 * @route   PATCH /api/feedbacks/:id
 * @desc    Traiter une réclamation ou apporter une réponse
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  updateFeedbackStatus
);

export default router;

