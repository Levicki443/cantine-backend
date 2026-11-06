/**
 * @fileoverview Définition des routes de l'API pour la gestion des clients.
 * @module routes/clientRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  rechargerSolde,
  toggleClientStatus
} from '../controllers/clientController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createClientSchema,
  updateClientSchema,
  rechargeClientSchema
} from '../validators/clientValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Toutes les opérations sur les clients requièrent une authentification préalable
router.use(authenticate);

/**
 * @route   GET /api/clients
 * @desc    Lister et rechercher les clients avec pagination
 * @access  Admin, Gestionnaire, Caissier
 */
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getClients
);

/**
 * @route   GET /api/clients/:id
 * @desc    Consulter la fiche détaillée d'un client
 * @access  Tous utilisateurs authentifiés
 */
router.get('/:id', getClientById);

/**
 * @route   POST /api/clients
 * @desc    Enregistrer un nouveau client
 * @access  Admin, Gestionnaire
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(createClientSchema),
  createClient
);

/**
 * @route   PUT /api/clients/:id
 * @desc    Modifier les informations d'un client
 * @access  Admin, Gestionnaire
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateClientSchema),
  updateClient
);

/**
 * @route   POST /api/clients/:id/recharge
 * @desc    Recharger le solde prépayé d'un client
 * @access  Admin, Caissier
 */
router.post(
  '/:id/recharge',
  authorize(ROLES.ADMIN, ROLES.CASHIER),
  validate(rechargeClientSchema),
  rechargerSolde
);

/**
 * @route   PATCH /api/clients/:id/status
 * @desc    Activer ou désactiver un client (archivage logique)
 * @access  Admin, Gestionnaire
 */
router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  toggleClientStatus
);

export default router;

