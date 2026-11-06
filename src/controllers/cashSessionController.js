/**
 * @fileoverview Contrôleur pour la gestion des sessions de caisse et clôtures journalières.
 * @module controllers/cashSessionController
 * Conforme aux sections 5.14, 7 et aux règles d'audit financier.
 */

import CashSession from '../models/CashSession.js';
import Sale from '../models/Sale.js';
import AuditLog from '../models/AuditLog.js';
import {
  CASH_SESSION_STATUSES,
  AUDIT_ACTIONS,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

/**
 * Récupère la session de caisse actuellement ouverte pour le caissier connecté.
 */
export const getCurrentSession = async (req, res, next) => {
  try {
    const sessionActive = await CashSession.findOne({
      caissier_id: req.user._id,
      statut: CASH_SESSION_STATUSES.OPEN
    });

    res.status(200).json({
      success: true,
      sessionActive: sessionActive || null,
      message: sessionActive ? 'Session de caisse active trouvée.' : 'Aucune session de caisse n’est ouverte.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ouvre une nouvelle session de caisse avec un fond de caisse initial.
 */
export const openSession = async (req, res, next) => {
  try {
    const { montant_initial } = req.body;

    // Vérifier si le caissier a déjà une session ouverte non clôturée
    const sessionExistante = await CashSession.findOne({
      caissier_id: req.user._id,
      statut: CASH_SESSION_STATUSES.OPEN
    });

    if (sessionExistante) {
      return res.status(400).json({
        success: false,
        message: 'Vous disposez déjà d’une session de caisse ouverte. Veuillez la clôturer avant d’en ouvrir une nouvelle.'
      });
    }

    const nouvelleSession = await CashSession.create({
      caissier_id: req.user._id,
      montant_initial,
      statut: CASH_SESSION_STATUSES.OPEN
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CASH_OPEN,
      entite: 'CashSession',
      reference: nouvelleSession._id.toString(),
      details: {
        fondDeCaisseInitial: montant_initial,
        dateOuverture: nouvelleSession.date_ouverture
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Session de caisse ouverte avec succès.',
      session: nouvelleSession
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clôture la session de caisse active avec comparaison théorique vs réel et justification des écarts.
 */
export const closeSession = async (req, res, next) => {
  try {
    const { montant_reel, motif_ecart } = req.body;

    const sessionActive = await CashSession.findOne({
      caissier_id: req.user._id,
      statut: CASH_SESSION_STATUSES.OPEN
    });

    if (!sessionActive) {
      return res.status(404).json({
        success: false,
        message: 'Aucune session de caisse ouverte trouvée pour cet utilisateur.'
      });
    }

    // Effectuer la clôture avec validation de l'écart
    await sessionActive.cloturer(montant_reel, motif_ecart);

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CASH_CLOSE,
      entite: 'CashSession',
      reference: sessionActive._id.toString(),
      details: {
        montantTheorique: sessionActive.montant_theorique,
        montantReel: sessionActive.montant_reel,
        ecart: sessionActive.ecart,
        motifEcart: sessionActive.motif_ecart
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Session de caisse clôturée avec succès.',
      session: sessionActive
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère la liste paginée des sessions de caisse (supervision comptable).
 */
export const getCashSessions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.caissier_id) {
      filtre.caissier_id = req.query.caissier_id;
    }

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    const [total, sessions] = await Promise.all([
      CashSession.countDocuments(filtre),
      CashSession.find(filtre)
        .populate('caissier_id', 'nom prenom role')
        .sort({ date_ouverture: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le détail d'une session de caisse ainsi que l'ensemble des ventes associées.
 */
export const getCashSessionById = async (req, res, next) => {
  try {
    const session = await CashSession.findById(req.params.id).populate(
      'caissier_id',
      'nom prenom role'
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session de caisse introuvable.'
      });
    }

    // Récupérer le récapitulatif des ventes associées à cette session
    const ventes = await Sale.find({ cash_session_id: session._id })
      .populate('client_id', 'nom prenom')
      .sort({ date_vente: -1 });

    res.status(200).json({
      success: true,
      session,
      totalVentesEnregistrees: ventes.length,
      ventes
    });
  } catch (error) {
    next(error);
  }
};

