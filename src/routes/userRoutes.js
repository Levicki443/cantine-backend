/**
 * @fileoverview Routes d'administration des utilisateurs et du personnel.
 * @module routes/userRoutes
 * Sécurisé par RBAC strict (Administrateur uniquement).
 */

import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Toutes les routes utilisateurs nécessitent d'être administrateur
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;

