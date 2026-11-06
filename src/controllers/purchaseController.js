/**
 * @fileoverview Contrôleur pour la gestion des approvisionnements fournisseurs et entrées en stock.
 * @module controllers/purchaseController
 * Conforme aux sections 5.10, 7 et à la règle de gestion 7 (entrée en stock sur réception validée).
 */

import Purchase from '../models/Purchase.js';
import StockMovement from '../models/StockMovement.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import {
  AUDIT_ACTIONS,
  PURCHASE_RECEIPT_STATUSES,
  STOCK_MOVEMENT_TYPES,
  SYSTEM_DEFAULTS,
  ROLES
} from '../config/constants.js';

/**
 * Récupère la liste paginée des commandes d'approvisionnement.
 */
export const getPurchases = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.supplier_id) {
      filtre.supplier_id = req.query.supplier_id;
    }

    if (req.query.statut_reception) {
      filtre.statut_reception = req.query.statut_reception;
    }

    if (req.query.statut_paiement) {
      filtre.statut_paiement = req.query.statut_paiement;
    }

    const [total, approvisionnements] = await Promise.all([
      Purchase.countDocuments(filtre),
      Purchase.find(filtre)
        .populate('supplier_id', 'nom contact telephone email')
        .populate('utilisateur_id', 'nom prenom')
        .populate('lignes.ingredient_id', 'nom unite')
        .sort({ date_approvisionnement: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      approvisionnements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte le détail d'un approvisionnement par son identifiant.
 */
export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier_id', 'nom contact telephone email adresse')
      .populate('utilisateur_id', 'nom prenom role')
      .populate('lignes.ingredient_id', 'nom unite quantite_stock seuil_minimum');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Commande d’approvisionnement introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      approvisionnement: purchase
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une commande d'approvisionnement auprès d'un fournisseur.
 */
export const createPurchase = async (req, res, next) => {
  try {
    const reference = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const nouvelAppro = await Purchase.create({
      ...req.body,
      reference,
      utilisateur_id: req.user._id,
      statut_reception: PURCHASE_RECEIPT_STATUSES.ORDERED
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Purchase',
      reference: nouvelAppro.reference,
      details: {
        fournisseurId: nouvelAppro.supplier_id,
        montantTotal: nouvelAppro.montant_total,
        nbLignes: nouvelAppro.lignes.length
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    const approPeuple = await Purchase.findById(nouvelAppro._id)
      .populate('supplier_id', 'nom contact telephone')
      .populate('lignes.ingredient_id', 'nom unite');

    res.status(201).json({
      success: true,
      message: 'Commande d’approvisionnement enregistrée avec succès.',
      approvisionnement: approPeuple
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Valide la réception effective des marchandises et met à jour les stocks (Règle 7).
 */
export const receivePurchase = async (req, res, next) => {
  try {
    const { lignes_recues } = req.body;
    const purchase = await Purchase.findById(req.params.id).populate(
      'lignes.ingredient_id',
      'nom unite quantite_stock'
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Approvisionnement introuvable.'
      });
    }

    if (purchase.statut_reception === PURCHASE_RECEIPT_STATUSES.RECEIVED) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande d’approvisionnement a déjà été intégralement réceptionnée.'
      });
    }

    let toutesLignesCompletes = true;

    // Traitement de chaque ligne reçue et injection sécurisée dans les stocks
    for (const ligneRecue of lignes_recues) {
      const ligneAchat = purchase.lignes.find(
        (l) => l.ingredient_id._id.toString() === ligneRecue.ingredient_id.toString()
      );

      if (ligneAchat) {
        const nouvelleQuantiteRecue = (ligneAchat.quantite_recue || 0) + ligneRecue.quantite_recue;
        ligneAchat.quantite_recue = nouvelleQuantiteRecue;

        if (nouvelleQuantiteRecue < ligneAchat.quantite_commandee) {
          toutesLignesCompletes = false;
        }

        // Règle 7 : entrée en stock uniquement sur réception validée via StockMovement
        if (ligneRecue.quantite_recue > 0) {
          await StockMovement.enregistrer({
            ingredientId: ligneAchat.ingredient_id._id,
            typeMouvement: STOCK_MOVEMENT_TYPES.PURCHASE_ENTRY,
            quantite: ligneRecue.quantite_recue,
            motif: `Réception approvisionnement ${purchase.reference}`,
            referenceOperation: purchase.reference,
            utilisateurId: req.user._id
          });
        }
      }
    }

    purchase.statut_reception = toutesLignesCompletes
      ? PURCHASE_RECEIPT_STATUSES.RECEIVED
      : PURCHASE_RECEIPT_STATUSES.PARTIALLY_RECEIVED;
    purchase.date_reception = new Date();
    await purchase.save();

    await Notification.emettre({
      roleCible: ROLES.MANAGER,
      titre: `Marchandises reçues : ${purchase.reference}`,
      message: `La réception de la commande ${purchase.reference} a été validée. Les stocks ont été incrémentés.`,
      type: 'systeme'
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Purchase',
      reference: purchase.reference,
      details: {
        statutReception: purchase.statut_reception,
        dateReception: purchase.date_reception
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Réception enregistrée avec succès. Les stocks ont été mis à jour.',
      approvisionnement: purchase
    });
  } catch (error) {
    next(error);
  }
};

