/**
 * @fileoverview Contrôleur pour la comptabilité et validation des dépenses d'exploitation.
 * @module controllers/expenseController
 * Conforme à la section 5.15 et à la règle de gestion 10 (catégorisation des dépenses).
 */

import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';
import {
  AUDIT_ACTIONS,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

/**
 * Récupère la liste paginée des dépenses avec filtres de catégorie et de statut.
 */
export const getExpenses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || SYSTEM_DEFAULTS.PAGE);
    const limit = Math.min(
      SYSTEM_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || SYSTEM_DEFAULTS.LIMIT)
    );
    const skip = (page - 1) * limit;

    const filtre = {};

    if (req.query.categorie) {
      filtre.categorie = req.query.categorie;
    }

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    const [total, depenses] = await Promise.all([
      Expense.countDocuments(filtre),
      Expense.find(filtre)
        .populate('utilisateur_id', 'nom prenom role')
        .populate('validateur_id', 'nom prenom')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limite: limit,
      depenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistre une nouvelle dépense d'exploitation.
 */
export const createExpense = async (req, res, next) => {
  try {
    const nouvelleDepense = await Expense.create({
      ...req.body,
      utilisateur_id: req.user._id
    });

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.CREATE,
      entite: 'Expense',
      reference: nouvelleDepense._id.toString(),
      details: {
        categorie: nouvelleDepense.categorie,
        montant: nouvelleDepense.montant,
        description: nouvelleDepense.description
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Dépense enregistrée avec succès.',
      depense: nouvelleDepense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Valide ou rejette formellement une dépense (approbation hiérarchique).
 */
export const validateExpense = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const depense = await Expense.findById(req.params.id);

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense introuvable.'
      });
    }

    depense.statut = statut;
    depense.validateur_id = req.user._id;
    await depense.save();

    await AuditLog.record({
      utilisateurId: req.user._id,
      action: AUDIT_ACTIONS.UPDATE,
      entite: 'Expense',
      reference: depense._id.toString(),
      details: { decision: statut },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Statut de la dépense mis à jour : « ${statut} ».`,
      depense
    });
  } catch (error) {
    next(error);
  }
};

