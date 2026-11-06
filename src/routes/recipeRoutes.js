/**
 * @fileoverview Définition des routes de gestion des fiches techniques et calculs de rentabilité.
 * @module routes/recipeRoutes
 * Conforme à la section 4 du cahier des charges opérationnel.
 */

import express from 'express';
import {
  getRecipes,
  getRecipeById,
  upsertRecipe,
  calculateProfitability
} from '../controllers/recipeController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/recipes
 * @desc    Liste toutes les recettes enregistrées
 * @access  Privé (Personnel cantine)
 */
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getRecipes
);

/**
 * @route   GET /api/recipes/:id
 * @desc    Consulte les détails d'une recette
 * @access  Privé (Personnel cantine)
 */
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  getRecipeById
);

/**
 * @route   POST /api/recipes
 * @desc    Crée ou met à jour la fiche technique d'un plat
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  upsertRecipe
);

/**
 * @route   POST /api/recipes/:id/profitability
 * @desc    Calcule le coût de revient, la marge brute et simule les prix de vente cibles
 * @access  Privé (Administrateur, Gestionnaire)
 */
router.post(
  '/:id/profitability',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  calculateProfitability
);

export default router;

