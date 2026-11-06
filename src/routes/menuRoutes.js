/**
 * @fileoverview Définition des routes de l'API pour les menus journaliers et formules.
 * @module routes/menuRoutes
 * Sécurisé par RBAC et validation Joi des entrées.
 */

import express from 'express';
import {
  getMenus,
  getTodayMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
} from '../controllers/menuController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/authValidator.js';
import {
  createMenuSchema,
  updateMenuSchema
} from '../validators/mealValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/menus
 * @desc    Lister et filtrer les menus par date
 * @access  Public ou authentifié
 */
router.get('/', getMenus);

/**
 * @route   GET /api/menus/today
 * @desc    Obtenir le menu prévu pour aujourd'hui
 * @access  Public ou authentifié
 */
router.get('/today', getTodayMenu);

/**
 * @route   GET /api/menus/:id
 * @desc    Consulter le détail d'un menu
 * @access  Public ou authentifié
 */
router.get('/:id', getMenuById);

// Opérations d'administration restreintes
router.use(authenticate);

/**
 * @route   POST /api/menus
 * @desc    Créer et publier un nouveau menu
 * @access  Admin, Gestionnaire
 */
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(createMenuSchema),
  createMenu
);

/**
 * @route   PUT /api/menus/:id
 * @desc    Modifier un menu existant
 * @access  Admin, Gestionnaire
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateMenuSchema),
  updateMenu
);

/**
 * @route   DELETE /api/menus/:id
 * @desc    Archiver un menu
 * @access  Admin, Gestionnaire
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  deleteMenu
);

export default router;

