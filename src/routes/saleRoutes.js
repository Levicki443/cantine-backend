/**
 * @fileoverview Définition des routes de l'API pour les ventes et reçus de caisse.
 * @module routes/saleRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  cancelSale
} from '../controllers/saleController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createSaleSchema,
  cancelSaleSchema
} from '../validators/posValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   POST /api/sales
 * @desc    Encaisser une vente au comptoir et émettre un reçu
 * @access  Caissier, Admin
 */
router.post(
  '/',
  authorize(ROLES.CASHIER, ROLES.ADMIN),
  validate(createSaleSchema),
  createSale
);

/**
 * @route   GET /api/sales
 * @desc    Lister et filtrer les ventes avec pagination
 * @access  Caissier, Gestionnaire, Admin
 */
router.get(
  '/',
  authorize(ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN),
  getSales
);

/**
 * @route   GET /api/sales/:id
 * @desc    Consulter le reçu et détail complet d'une vente
 * @access  Tous utilisateurs authentifiés
 */
router.get('/:id', getSaleById);

/**
 * @route   POST /api/sales/:id/cancel
 * @desc    Annuler une vente avec justification obligatoire
 * @access  Admin, Gestionnaire
 */
router.post(
  '/:id/cancel',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(cancelSaleSchema),
  cancelSale
);

export default router;

