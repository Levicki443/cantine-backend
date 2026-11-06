/**
 * @fileoverview Contrôleur pour la gestion complète des clients et abonnements prépayés.
 * @module controllers/clientController
 * Conforme aux sections 5.3, 5.16 et aux exigences d'audit bancaire.
 */

import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import {
  AUDIT_ACTIONS,
  ENTITY_STATUSES,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

/**
 * Récupère la liste paginée des clients avec recherche multicritère.
 */
export const getClients = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    if (req.query.categorie) {
      filtre.categorie = req.query.categorie;
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q.trim(), 'i');
      filtre.$or = [{ nom: regex }, { prenom: regex }, { telephone: regex }];
    }

    const [total, clients] = await Promise.all([
      Client.countDocuments(filtre),
      Client.find(filtre).sort({ date_inscription: -1 }).skip(skip).limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      clients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte le profil détaillé d'un client par son identifiant.
 */
export const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistre un nouveau client dans la base de données.
 */
export const createClient = async (req, res, next) => {
  try {
    const nouveauClient = await Client.create(req.body);

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Client',
      reference: nouveauClient._id.toString(),
      details: {
        nom: nouveauClient.nom,
        prenom: nouveauClient.prenom,
        categorie: nouveauClient.categorie
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Client enregistré avec succès.',
      client: nouveauClient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Modifie les données d'un client.
 */
export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client introuvable.'
      });
    }

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Client',
      reference: client._id.toString(),
      details: { modifications: req.body },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Informations du client mises à jour.',
      client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recharge le solde prépayé du compte d'un client (abonnement / repas prépayés).
 */
export const rechargerSolde = async (req, res, next) => {
  try {
    const { montant, mode_paiement, reference_externe } = req.body;
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client introuvable.'
      });
    }

    // Créditer le solde du client
    await client.crediterSolde(montant);

    // Enregistrer le paiement correspondant pour garantir la traçabilité comptable
    const referencePaiement = `REC-SOLDE-${Date.now().toString(36).toUpperCase()}`;
    const paiement = await Payment.create({
      reference: referencePaiement,
      client_id: client._id,
      cashier_id: req.user._id,
      montant,
      mode_paiement,
      type_operation: 'encaissement',
      reference_externe: reference_externe || null
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Client',
      reference: client._id.toString(),
      details: {
        operation: 'Rechargement de solde',
        montant,
        nouveauSolde: client.solde,
        paiementId: paiement._id.toString()
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Compte rechargé avec succès de ${montant} FCFA.`,
      nouveauSolde: client.solde,
      paiement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bascule le statut d'un client (actif/inactif) sans suppression physique des données.
 */
export const toggleClientStatus = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client introuvable.'
      });
    }

    client.statut =
      client.statut === ENTITY_STATUSES.ACTIVE
        ? ENTITY_STATUSES.INACTIVE
        : ENTITY_STATUSES.ACTIVE;

    await client.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.DELETE,
      entite: 'Client',
      reference: client._id.toString(),
      details: { nouveauStatut: client.statut },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Statut du client modifié avec succès : « ${client.statut} ».`,
      statut: client.statut
    });
  } catch (error) {
    next(error);
  }
};

