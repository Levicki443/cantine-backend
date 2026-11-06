/**
 * @fileoverview Contrôleur pour le suivi quotidien des règles d'hygiène et de sécurité alimentaire.
 * @module controllers/hygieneController
 * Conforme à la section 7 du cahier des charges opérationnel.
 */

import HygieneChecklist from '../models/HygieneChecklist.js';

/**
 * Récupère ou initialise automatiquement la checklist d'hygiène de la journée en cours.
 */
export const getDailyChecklist = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let checklist = await HygieneChecklist.findOne({
      date: { $gte: today, $lt: tomorrow }
    }).populate('responsable_superviseur', 'nom prenom role email');

    // Initialisation automatique si aucune checklist n'a encore été créée pour ce jour
    if (!checklist) {
      checklist = await HygieneChecklist.create({
        date: today,
        responsable_superviseur: req.user._id
      });
      await checklist.populate('responsable_superviseur', 'nom prenom role email');
    }

    res.status(200).json({
      success: true,
      checklist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour les tâches, températures et remarques de la checklist quotidienne.
 */
export const updateDailyChecklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { taches, temperatures, remarques_generales } = req.body;

    const checklist = await HygieneChecklist.findById(id);

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de contrôle d’hygiène introuvable.'
      });
    }

    if (taches && Array.isArray(taches)) {
      checklist.taches = taches;
    }

    if (temperatures) {
      checklist.temperatures = {
        ...checklist.temperatures,
        ...temperatures
      };
    }

    if (remarques_generales !== undefined) {
      checklist.remarques_generales = remarques_generales;
    }

    await checklist.save();

    res.status(200).json({
      success: true,
      message: 'Fiche de contrôle d’hygiène mise à jour avec succès.',
      checklist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte l'historique complet des rapports d'hygiène avec filtres.
 */
export const getHygieneHistory = async (req, res, next) => {
  try {
    const { limite = 30, statut } = req.query;
    const filtre = {};

    if (statut) {
      filtre.statut_conformite = statut;
    }

    const historique = await HygieneChecklist.find(filtre)
      .populate('responsable_superviseur', 'nom prenom')
      .sort({ date: -1 })
      .limit(parseInt(limite, 10));

    // Calcul des statistiques globales d'hygiène
    const totalControles = historique.length;
    const conformes = historique.filter((h) => h.statut_conformite === 'conforme').length;
    const alertes = historique.filter((h) => h.statut_conformite === 'alerte').length;
    const critiques = historique.filter((h) => h.statut_conformite === 'critique').length;

    const tauxConformite =
      totalControles > 0 ? Math.round((conformes / totalControles) * 100) : 100;

    res.status(200).json({
      success: true,
      taux_conformite_global: tauxConformite,
      repartition: { conformes, alertes, critiques },
      total_rapports: totalControles,
      historique
    });
  } catch (error) {
    next(error);
  }
};

