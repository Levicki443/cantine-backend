/**
 * @fileoverview Routes de supervision des commandes pour l'administration.
 * @module routes/orderRoutes
 * Accessible aux administrateurs et aux gestionnaires de cantine.
 */

import express from 'express';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.GESTIONNAIRE));

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);

export default router;

