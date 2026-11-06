/**
 * @fileoverview Contrôleur pour les encaissements, ventes directes au comptoir et reçus.
 * @module controllers/saleController
 * Conforme aux sections 5.12, 5.13 et aux règles de gestion 3, 4, 5, 8, 9 et 10.
 */

import Sale from '../models/Sale.js';
import Meal from '../models/Meal.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import CashSession from '../models/CashSession.js';
import AuditLog from '../models/AuditLog.js';
import {
  CASH_SESSION_STATUSES,
  AUDIT_ACTIONS,
  SYSTEM_DEFAULTS,
  PAYMENT_METHODS
} from '../config/constants.js';

/**
 * Enregistre une vente au comptoir, déduit les portions et émet un reçu inaltérable.
 */
export const createSale = async (req, res, next) => {
  try {
    const { client_id, order_id, reduction = 0, montant_paye, mode_paiement, reference_externe, lignes } = req.body;

    // 1. Contrôle de la session de caisse active du caissier
    const sessionActive = await CashSession.findOne({
      caissier_id: req.user._id,
      statut: CASH_SESSION_STATUSES.OPEN
    });

    if (!sessionActive) {
      return res.status(400).json({
        success: false,
        message: 'Opération refusée : vous devez ouvrir une session de caisse avant d’encaisser des ventes.'
      });
    }

    // 2. Traitement des lignes de vente, figeage des prix (Règle 3) et déduction des stocks (Règle 8)
    const lignesTraitees = [];
    const repasModifies = [];

    for (const item of lignes) {
      const meal = await Meal.findById(item.meal_id);
      if (!meal) {
        return res.status(404).json({
          success: false,
          message: `Le repas (ID : ${item.meal_id}) est introuvable.`
        });
      }

      if (!meal.disponible || meal.quantite_disponible < item.quantite) {
        return res.status(400).json({
          success: false,
          message: `Repas « ${meal.nom} » indisponible en quantité suffisante (Disponible : ${meal.quantite_disponible}, Demandé : ${item.quantite}).`
        });
      }

      // Figer le prix unitaire au moment de la transaction
      const sousTotal = Math.round(item.quantite * meal.prix * 100) / 100;
      lignesTraitees.push({
        meal_id: meal._id,
        nom_repas: meal.nom,
        quantite: item.quantite,
        prix_unitaire: meal.prix,
        sous_total: sousTotal
      });

      // Déduction immédiate de la portion
      await meal.deduirePortions(item.quantite);
      repasModifies.push(meal);
    }

    // 3. Calculs financiers
    const totalBrut = lignesTraitees.reduce((acc, ligne) => acc + ligne.sous_total, 0);
    const montantTotal = Math.max(0, Math.round((totalBrut - reduction) * 100) / 100);

    // 4. Gestion du client (solde prépayé ou crédit) si applicable
    let clientConcerne = null;
    if (client_id) {
      clientConcerne = await Client.findById(client_id);
      if (mode_paiement === PAYMENT_METHODS.AUTHORIZED_CREDIT || mode_paiement === 'crédit autorisé') {
        if (!clientConcerne) {
          return res.status(404).json({
            success: false,
            message: 'Client introuvable pour ce règlement à crédit.'
          });
        }
        await clientConcerne.debiterSolde(montantTotal);
      }
    }

    // 5. Génération du numéro de reçu unique inaltérable
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const alea = Math.random().toString(36).substring(2, 6).toUpperCase();
    const numeroRecu = `REC-${dateStr}-${alea}`;

    // 6. Création de la vente (Règle 4)
    const nouvelleVente = await Sale.create({
      numero_recu: numeroRecu,
      order_id: order_id || null,
      cashier_id: req.user._id,
      client_id: client_id || null,
      cash_session_id: sessionActive._id,
      lignes: lignesTraitees,
      reduction,
      montant_total: montantTotal,
      montant_paye,
      mode_paiement
    });

    // 7. Mise à jour de la session de caisse
    await sessionActive.ajouterEncaissement(nouvelleVente.montant_paye);

    // 8. Émission de l'enregistrement de paiement (Règle 9)
    await Payment.create({
      reference: `PAY-${numeroRecu}`,
      sale_id: nouvelleVente._id,
      order_id: order_id || null,
      client_id: client_id || null,
      cashier_id: req.user._id,
      montant: nouvelleVente.montant_paye,
      mode_paiement,
      type_operation: 'encaissement',
      reference_externe: reference_externe || null
    });

    // 9. Journalisation inaltérable
    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Sale',
      reference: nouvelleVente.numero_recu,
      details: {
        total: nouvelleVente.montant_total,
        paye: nouvelleVente.montant_paye,
        monnaie: nouvelleVente.monnaie_rendue,
        mode: nouvelleVente.mode_paiement
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Vente enregistrée avec succès.',
      recu: nouvelleVente
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la liste des ventes avec filtres de date, caissier et pagination.
 */
export const getSales = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.cashier_id) {
      filtre.cashier_id = req.query.cashier_id;
    }

    if (req.query.client_id) {
      filtre.client_id = req.query.client_id;
    }

    if (req.query.mode_paiement) {
      filtre.mode_paiement = req.query.mode_paiement;
    }

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    const [total, ventes] = await Promise.all([
      Sale.countDocuments(filtre),
      Sale.find(filtre)
        .populate('cashier_id', 'nom prenom')
        .populate('client_id', 'nom prenom telephone')
        .sort({ date_vente: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      ventes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la fiche détaillée d'une vente pour réimpression ou contrôle de reçu.
 */
export const getSaleById = async (req, res, next) => {
  try {
    const vente = await Sale.findById(req.params.id)
      .populate('cashier_id', 'nom prenom role')
      .populate('client_id', 'nom prenom telephone categorie')
      .populate('cash_session_id', 'date_ouverture date_cloture statut');

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: 'Vente introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      vente
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Annule une vente avec justification obligatoire et rétablissement des stocks (Règles 4 & 5).
 */
export const cancelSale = async (req, res, next) => {
  try {
    const { motif_annulation } = req.body;
    const vente = await Sale.findById(req.params.id);

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: 'Vente introuvable.'
      });
    }

    if (vente.statut === 'annulée') {
      return res.status(400).json({
        success: false,
        message: 'Cette vente a déjà été annulée.'
      });
    }

    // Rétablissement des portions des repas vendus
    for (const ligne of vente.lignes) {
      const meal = await Meal.findById(ligne.meal_id);
      if (meal) {
        await meal.ajouterPortions(ligne.quantite);
      }
    }

    // Remboursement du solde client si payé par compte prépayé
    if (vente.client_id) {
      const client = await Client.findById(vente.client_id);
      if (client) {
        await client.crediterSolde(vente.montant_total);
      }
    }

    // Règle 4 & 5 : mise à jour du statut avec motif sans suppression physique
    vente.statut = 'annulée';
    vente.motif_annulation = motif_annulation.trim();
    await vente.save();

    // Règle 10 : traçabilité du remboursement
    await Payment.create({
      reference: `REM-${vente.numero_recu}`,
      sale_id: vente._id,
      client_id: vente.client_id || null,
      cashier_id: req.user._id,
      montant: vente.montant_total,
      mode_paiement: vente.mode_paiement,
      type_operation: 'remboursement',
      motif_remboursement: motif_annulation
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.PAYMENT_REFUND,
      entite: 'Sale',
      reference: vente.numero_recu,
      details: { motifAnnulation: motif_annulation, montantRembourse: vente.montant_total },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Vente annulée avec succès et stocks rétablis.',
      vente
    });
  } catch (error) {
    next(error);
  }
};

