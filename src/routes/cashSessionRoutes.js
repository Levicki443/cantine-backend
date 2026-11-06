/**
 * @fileoverview Définition des routes de l'API pour les sessions de caisse.
 * @module routes/cashSessionRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getCurrentSession,
  openSession,
  closeSession,
  getCashSessions,
  getCashSessionById
} from '../controllers/cashSessionController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  openSessionSchema,
  closeSessionSchema
} from '../validators/posValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/cash-sessions/current
 * @desc    Obtenir la session de caisse en cours du caissier connecté
 * @access  Caissier, Admin
 */
router.get(
  '/current',
  authorize(ROLES.CASHIER, ROLES.ADMIN),
  getCurrentSession
);

/**
 * @route   POST /api/cash-sessions/open
 * @desc    Ouvrir une nouvelle session de caisse
 * @access  Caissier, Admin
 */
router.post(
  '/open',
  authorize(ROLES.CASHIER, ROLES.ADMIN),
  validate(openSessionSchema),
  openSession
);

/**
 * @route   POST /api/cash-sessions/close
 * @desc    Clôturer la session de caisse en cours avec justification des écarts
 * @access  Caissier, Admin
 */
router.post(
  '/close',
  authorize(ROLES.CASHIER, ROLES.ADMIN),
  validate(closeSessionSchema),
  closeSession
);

/**
 * @route   GET /api/cash-sessions
 * @desc    Lister l'historique des sessions de caisse avec pagination
 * @access  Admin, Gestionnaire
 */
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getCashSessions
);

/**
 * @route   GET /api/cash-sessions/:id
 * @desc    Consulter le détail d'une session de caisse et ses transactions
 * @access  Admin, Gestionnaire, Caissier
 */
router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getCashSessionById
);

export default router;

