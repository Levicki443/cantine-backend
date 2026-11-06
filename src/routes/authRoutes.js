/**
 * @fileoverview Définition des routes d'authentification et de gestion des profils.
 * @module routes/authRoutes
 * Conforme aux règles d'accès RBAC et de validation stricte.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getProfile,
  changePassword
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema
} from '../validators/authValidator.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Limitation spécifique et renforcée pour les tentatives de connexion (anti-brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 tentatives maximum par IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Trop de tentatives de connexion échouées. Veuillez patienter 15 minutes.'
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Créer un nouvel utilisateur (accès réservé aux administrateurs)
 * @access  Privé (Admin) ou Public si initialisation de la base (premier compte)
 */
router.post(
  '/register',
  validate(registerSchema),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion et émission du jeton d'accès JWT
 * @access  Public
 */
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Privé (Tous rôles authentifiés)
 */
router.get(
  '/profile',
  authenticate,
  getProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Mettre à jour son mot de passe
 * @access  Privé (Tous rôles authentifiés)
 */
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;

