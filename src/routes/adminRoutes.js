/**
 * @fileoverview Routes de gestion globale, statistiques et audit pour le BackOffice.
 * @module routes/adminRoutes
 * Sécurisé par RBAC strict (Administrateur uniquement).
 */

import express from 'express';
import {
  getAdminDashboardStats,
  getAuditLogs,
  getNotifications,
  markNotificationAsRead,
  getSettings,
  updateSettings
} from '../controllers/adminStatsController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', getAdminDashboardStats);
router.get('/audit-logs', getAuditLogs);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;

