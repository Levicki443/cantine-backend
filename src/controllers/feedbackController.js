/**
 * @fileoverview Contrôleur pour la gestion de la satisfaction client, réclamations et fidélisation.
 * @module controllers/feedbackController
 * Conforme à la section 8 du cahier des charges opérationnel.
 */

import CustomerFeedback from '../models/CustomerFeedback.js';

/**
 * Récupère les retours clients avec filtres multicritères.
 */
export const getFeedbacks = async (req, res, next) => {
  try {
    const { type, statut, limite = 50 } = req.query;
    const filtre = {};

    if (type) filtre.type = type;
    if (statut) filtre.statut = statut;

    const feedbacks = await CustomerFeedback.find(filtre)
      .populate('meal_id', 'nom categorie')
      .populate('client_id', 'nom prenom categorie solde')
      .sort({ date_creation: -1 })
      .limit(parseInt(limite, 10));

    res.status(200).json({
      success: true,
      total: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistre un nouvel avis, réclamation ou suggestion de client.
 */
export const createFeedback = async (req, res, next) => {
  try {
    const {
      client_id,
      nom_client,
      telephone,
      type = 'avis',
      note_satisfaction,
      meal_id,
      commentaire
    } = req.body;

    const feedback = await CustomerFeedback.create({
      client_id: client_id || (req.user?.role === 'client' ? req.user._id : null),
      nom_client: nom_client || (req.user ? `${req.user.prenom} ${req.user.nom}` : 'Client Anonyme'),
      telephone,
      type,
      note_satisfaction,
      meal_id: meal_id || null,
      commentaire
    });

    res.status(201).json({
      success: true,
      message: 'Votre retour a bien été transmis à la cantine. Merci pour votre contribution !',
      feedback
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Traite une réclamation ou apporte une réponse gestionnaire.
 */
export const updateFeedbackStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut, reponse_gestionnaire } = req.body;

    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Avis ou réclamation introuvable.'
      });
    }

    if (statut) feedback.statut = statut;
    if (reponse_gestionnaire) {
      feedback.reponse_gestionnaire = reponse_gestionnaire;
      feedback.date_reponse = new Date();
    }

    await feedback.save();

    res.status(200).json({
      success: true,
      message: 'Retour client mis à jour avec succès.',
      feedback
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calcule les indicateurs clés (KPIs) de satisfaction client globale.
 */
export const getSatisfactionKPIs = async (req, res, next) => {
  try {
    const tousAvis = await CustomerFeedback.find();

    const total = tousAvis.length;
    if (total === 0) {
      return res.status(200).json({
        success: true,
        total_avis: 0,
        note_moyenne: 5.0,
        taux_satisfaction: 100,
        repartition: { avis: 0, reclamations: 0, suggestions: 0 },
        reclamations_non_resolues: 0
      });
    }

    const sommeNotes = tousAvis.reduce((acc, f) => acc + (f.note_satisfaction || 5), 0);
    const noteMoyenne = Math.round((sommeNotes / total) * 10) / 10;

    const avisPositifs = tousAvis.filter((f) => f.note_satisfaction >= 4).length;
    const tauxSatisfaction = Math.round((avisPositifs / total) * 100);

    const reclamations = tousAvis.filter((f) => f.type === 'reclamation');
    const reclamationsNonResolues = reclamations.filter((r) => r.statut !== 'resolu').length;

    res.status(200).json({
      success: true,
      total_avis: total,
      note_moyenne: noteMoyenne,
      taux_satisfaction: tauxSatisfaction,
      repartition: {
        avis: tousAvis.filter((f) => f.type === 'avis').length,
        reclamations: reclamations.length,
        suggestions: tousAvis.filter((f) => f.type === 'suggestion').length
      },
      reclamations_non_resolues: reclamationsNonResolues
    });
  } catch (error) {
    next(error);
  }
};

