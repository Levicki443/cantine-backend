/**
 * @fileoverview Contrôleur des statistiques décisionnelles, journal d'audit et notifications Backoffice.
 * @module controllers/adminStatsController
 * Centralise les 15 indicateurs clés et l'agrégation temps réel depuis MongoDB.
 */

import User from '../models/User.js';
import Meal from '../models/Meal.js';
import Order from '../models/Order.js';
import Sale from '../models/Sale.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { ROLES, ENTITY_STATUSES } from '../config/constants.js';

// Paramètres par défaut de la cantine
let systemSettings = {
  nom_cantine: 'Cantine Manager — Institut Supérieur Jean Paul II',
  email_contact: 'contact@cantine-manager.ci',
  telephone_contact: '+225 07 00 00 00 00',
  horaires: {
    petit_dejeuner: '07h00 - 08h30',
    dejeuner: '11h30 - 14h30',
    diner: '18h30 - 20h30'
  },
  seuil_alerte_stock_defaut: 10,
  modes_paiement_actifs: ['espèces', 'portefeuille', 'wave', 'orange_money', 'carte']
};

/**
 * Calcule et agrège l'ensemble des 15 indicateurs réels du Dashboard Administrateur.
 */
export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const finJour = new Date(debutJour.getTime() + 24 * 60 * 60 * 1000 - 1);

    const debutSemaine = new Date(debutJour);
    debutSemaine.setDate(debutJour.getDate() - debutJour.getDay() + 1); // Lundi

    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

    const [
      totalUsers,
      clientsCount,
      adminsCount,
      managersCount,
      cashiersCount,
      totalMeals,
      mealsDisponibles,
      mealsRupture,
      totalOrders,
      ordersEnAttente,
      ordersTerminees,
      caJourAgg,
      caSemaineAgg,
      caMoisAgg,
      totalTransactions,
      topVentesAgg,
      repartitionPaiementsAgg,
      ventes7DerniersJoursAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: ROLES.CLIENT }),
      User.countDocuments({ role: ROLES.ADMIN }),
      User.countDocuments({ role: ROLES.GESTIONNAIRE }),
      User.countDocuments({ role: ROLES.CAISSIER }),
      Meal.countDocuments({ statut: ENTITY_STATUSES.ACTIVE }),
      Meal.countDocuments({ statut: ENTITY_STATUSES.ACTIVE, disponible: true }),
      Meal.countDocuments({ statut: ENTITY_STATUSES.ACTIVE, disponible: false }),
      Order.countDocuments(),
      Order.countDocuments({ statut: 'en_attente' }),
      Order.countDocuments({ statut: { $in: ['prete', 'livree'] } }),
      // CA Jour (Ventes POS + Commandes payées)
      Sale.aggregate([
        { $match: { date_vente: { $gte: debutJour, $lte: finJour }, statut: { $ne: 'annulée' } } },
        { $group: { _id: null, total: { $sum: '$montant_total' } } }
      ]),
      // CA Semaine
      Sale.aggregate([
        { $match: { date_vente: { $gte: debutSemaine }, statut: { $ne: 'annulée' } } },
        { $group: { _id: null, total: { $sum: '$montant_total' } } }
      ]),
      // CA Mois
      Sale.aggregate([
        { $match: { date_vente: { $gte: debutMois }, statut: { $ne: 'annulée' } } },
        { $group: { _id: null, total: { $sum: '$montant_total' } } }
      ]),
      Sale.countDocuments({ statut: { $ne: 'annulée' } }),
      // Top 5 produits les plus vendus
      Sale.aggregate([
        { $match: { statut: { $ne: 'annulée' } } },
        { $unwind: '$lignes' },
        { $group: { _id: '$lignes.nom_repas', quantiteTotale: { $sum: '$lignes.quantite' }, ca: { $sum: '$lignes.sous_total' } } },
        { $sort: { quantiteTotale: -1 } },
        { $limit: 5 }
      ]),
      // Répartition des méthodes de paiement
      Sale.aggregate([
        { $match: { statut: { $ne: 'annulée' } } },
        { $group: { _id: '$mode_paiement', totalMontant: { $sum: '$montant_total' }, count: { $sum: 1 } } }
      ]),
      // Évolution des ventes sur les 7 derniers jours
      Sale.aggregate([
        { $match: { date_vente: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, statut: { $ne: 'annulée' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date_vente' } },
            ca: { $sum: '$montant_total' },
            volume: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      indicateurs: {
        totalUsers,
        clientsCount,
        adminsCount,
        managersCount,
        cashiersCount,
        totalMeals,
        mealsDisponibles,
        mealsRupture,
        totalOrders,
        ordersEnAttente,
        ordersTerminees,
        caJournalier: caJourAgg[0]?.total || 0,
        caHebdomadaire: caSemaineAgg[0]?.total || 0,
        caMensuel: caMoisAgg[0]?.total || 0,
        totalTransactions
      },
      graphiques: {
        topVentes: topVentesAgg,
        repartitionPaiements: repartitionPaiementsAgg,
        evolutionVentes: ventes7DerniersJoursAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le journal d'audit de sécurité avec pagination.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('utilisateur_id', 'nom prenom email role')
        .sort({ date: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / take),
      logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les notifications pour l'administrateur.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ utilisateur_id: req.user._id }, { role_cible: { $in: ['administrateur', null] } }]
    })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const nonLues = notifications.filter((n) => !n.lu).length;

    res.status(200).json({ success: true, notifications, nonLues });
  } catch (error) {
    next(error);
  }
};

/**
 * Marque une notification comme lue.
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { lu: true });
    res.status(200).json({ success: true, message: 'Notification marquée comme lue.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère ou met à jour les paramètres généraux de l'établissement.
 */
export const getSettings = (req, res) => {
  res.status(200).json({ success: true, settings: systemSettings });
};

export const updateSettings = (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.status(200).json({ success: true, message: 'Paramètres mis à jour.', settings: systemSettings });
};

