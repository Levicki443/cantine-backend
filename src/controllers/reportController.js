/**
 * @fileoverview Contrôleur pour le tableau de bord décisionnel et les rapports statistiques.
 * @module controllers/reportController
 * Conforme aux sections 5.2, 5.19 et à la règle de gestion 12 (calculs sur transactions réelles).
 */

import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import Purchase from '../models/Purchase.js';
import Ingredient from '../models/Ingredient.js';
import Meal from '../models/Meal.js';
import { ENTITY_STATUSES } from '../config/constants.js';

/**
 * Récupère les métriques clés synthétiques du tableau de bord d'accueil.
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const debutJournee = new Date();
    debutJournee.setHours(0, 0, 0, 0);

    const finJournee = new Date();
    finJournee.setHours(23, 59, 59, 999);

    const [
      ventesAujourdhui,
      depensesAujourdhui,
      alertesStock,
      totalRepasActifs,
      dernieresVentes
    ] = await Promise.all([
      // Agrégation du chiffre d'affaires du jour (ventes non annulées)
      Sale.aggregate([
        {
          $match: {
            date_vente: { $gte: debutJournee, $lte: finJournee },
            statut: { $ne: 'annulée' }
          }
        },
        {
          $group: {
            _id: null,
            chiffreAffaires: { $sum: '$montant_total' },
            totalVentes: { $sum: 1 },
            totalPortionsVendues: { $sum: { $sum: '$lignes.quantite' } }
          }
        }
      ]),
      // Agrégation des dépenses du jour validées
      Expense.aggregate([
        {
          $match: {
            date: { $gte: debutJournee, $lte: finJournee },
            statut: 'validée'
          }
        },
        {
          $group: {
            _id: null,
            totalDepenses: { $sum: '$montant' }
          }
        }
      ]),
      // Décompte des ingrédients en rupture ou stock faible
      Ingredient.countDocuments({
        statut: ENTITY_STATUSES.ACTIVE,
        $expr: { $lte: ['$quantite_stock', '$seuil_minimum'] }
      }),
      // Nombre de repas actifs à la carte
      Meal.countDocuments({
        statut: ENTITY_STATUSES.ACTIVE,
        disponible: true
      }),
      // Les 5 dernières transactions pour le journal de bord
      Sale.find({ statut: { $ne: 'annulée' } })
        .populate('cashier_id', 'nom prenom')
        .sort({ date_vente: -1 })
        .limit(5)
    ]);

    const caJour = ventesAujourdhui[0]?.chiffreAffaires || 0;
    const depensesJour = depensesAujourdhui[0]?.totalDepenses || 0;
    const soldeEstime = Math.round((caJour - depensesJour) * 100) / 100;

    res.status(200).json({
      success: true,
      indicateurs: {
        chiffreAffairesJournalier: caJour,
        depensesJournalieres: depensesJour,
        soldeNetEstime: soldeEstime,
        nombreVentes: ventesAujourdhui[0]?.totalVentes || 0,
        portionsServies: ventesAujourdhui[0]?.totalPortionsVendues || 0,
        ingredientsEnAlerte: alertesStock,
        repasDisponibles: totalRepasActifs
      },
      dernieresVentes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Génère le rapport financier d'exploitation sur une période donnée (recettes, dépenses, résultat).
 */
export const getFinancialReport = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    const filtreDate = {};
    if (dateDebut || dateFin) {
      filtreDate.date = {};
      if (dateDebut) {
        filtreDate.date.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        filtreDate.date.$lte = new Date(dateFin);
      }
    }

    const filtreVente = { statut: { $ne: 'annulée' } };
    if (filtreDate.date) {
      filtreVente.date_vente = filtreDate.date;
    }

    const filtreDepense = { statut: 'validée' };
    if (filtreDate.date) {
      filtreDepense.date = filtreDate.date;
    }

    const filtreAchat = {};
    if (filtreDate.date) {
      filtreAchat.date_approvisionnement = filtreDate.date;
    }

    const [totalVentes, totalDepenses, totalAchats, repartitionPaiements] = await Promise.all([
      Sale.aggregate([
        { $match: filtreVente },
        { $group: { _id: null, total: { $sum: '$montant_total' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: filtreDepense },
        { $group: { _id: null, total: { $sum: '$montant' }, count: { $sum: 1 } } }
      ]),
      Purchase.aggregate([
        { $match: filtreAchat },
        { $group: { _id: null, total: { $sum: '$montant_total' }, count: { $sum: 1 } } }
      ]),
      // Répartition des ventes par mode de règlement
      Sale.aggregate([
        { $match: filtreVente },
        { $group: { _id: '$mode_paiement', montant: { $sum: '$montant_total' }, volume: { $sum: 1 } } }
      ])
    ]);

    const recettes = totalVentes[0]?.total || 0;
    const charges = totalDepenses[0]?.total || 0;
    const approvisionnements = totalAchats[0]?.total || 0;
    const resultatNet = Math.round((recettes - charges - approvisionnements) * 100) / 100;

    res.status(200).json({
      success: true,
      bilanFinancier: {
        recettesVentes: recettes,
        chargesExploitation: charges,
        achatsFournisseurs: approvisionnements,
        resultatNet,
        nombreVentes: totalVentes[0]?.count || 0,
        nombreDepenses: totalDepenses[0]?.count || 0
      },
      repartitionPaiements
    });
  } catch (error) {
    next(error);
  }
};

