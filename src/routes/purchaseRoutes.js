/**
 * @fileoverview Définition des routes de l'API pour les approvisionnements et réceptions de stock.
 * @module routes/purchaseRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  receivePurchase
} from '../controllers/purchaseController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createPurchaseSchema,
  receivePurchaseSchema
} from '../validators/stockValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Toutes les opérations d'approvisionnement requièrent une authentification
router.use(authenticate);

/**
 * @route   GET /api/purchases
 * @desc    Lister et filtrer les approvisionnements avec pagination
 * @access  Admin, Gestionnaire
 */
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getPurchases
);

/**
 * @route   GET /api/purchases/:id
 * @desc    Consulter la fiche détaillée d'un approvisionnement
 * @access  Admin, Gestionnaire
 */
router.get(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  getPurchaseById
);

/**
 * @route   POST /api/purchases
 * @desc    Créer une nouvelle commande fournisseur
 * @access  Admin, Gestionnaire
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(createPurchaseSchema),
  createPurchase
);

/**
 * @route   PATCH /api/purchases/:id/receive
 * @desc    Valider la réception effective et incrémenter les stocks
 * @access  Admin, Gestionnaire
 */
router.patch(
  '/:id/receive',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(receivePurchaseSchema),
  receivePurchase
);

export default router;

