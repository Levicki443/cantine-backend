/**
 * @fileoverview Contrôleur pour la supervision et gestion des commandes au BackOffice.
 * @module controllers/orderController
 * Suivi du cycle de vie des commandes, statuts, filtres et traçabilité.
 */

import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { AUDIT_ACTIONS, ORDER_STATUSES_LIST } from '../config/constants.js';

/**
 * Récupère l'ensemble des commandes avec filtres et pagination.
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { statut, modePaiement, dateDebut, dateFin, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (statut && ORDER_STATUSES_LIST.includes(statut)) {
      filter.statut = statut;
    }
    if (modePaiement) {
      filter.mode_paiement = modePaiement;
    }
    if (dateDebut || dateFin) {
      filter.date_commande = {};
      if (dateDebut) filter.date_commande.$gte = new Date(dateDebut);
      if (dateFin) filter.date_commande.$lte = new Date(dateFin);
    }
    if (search) {
      filter.numero_commande = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('client_id', 'nom prenom email telephone')
        .sort({ date_commande: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / take),
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les détails complets d'une commande par son ID.
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('client_id', 'nom prenom email telephone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour le statut opérationnel d'une commande avec historisation.
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { statut, motif } = req.body;
    if (!ORDER_STATUSES_LIST.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts autorisés : ${ORDER_STATUSES_LIST.join(', ')}.`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }

    const ancienStatut = order.statut;
    order.statut = statut;
    order.historique_statuts.push({
      statut,
      modifie_par: req.user._id,
      date: new Date(),
      motif: motif || `Statut mis à jour vers ${statut}`
    });

    await order.save();

    // Notification système
    await Notification.create({
      role_cible: 'gestionnaire',
      titre: `Mise à jour commande ${order.numero_commande}`,
      message: `La commande ${order.numero_commande} est passée de "${ancienStatut}" à "${statut}".`,
      type: statut === 'prete' ? 'commande_prete' : 'systeme'
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Order',
      reference: order.numero_commande,
      details: { ancienStatut, nouveauStatut: statut },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Statut de la commande mis à jour vers : ${statut}.`,
      order
    });
  } catch (error) {
    next(error);
  }
};

