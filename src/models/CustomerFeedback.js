/**
 * @fileoverview Modèle Mongoose pour le recueil des avis, réclamations et satisfaction client.
 * @module models/CustomerFeedback
 * Conforme à la section 8 du cahier des charges opérationnel.
 */

import mongoose from 'mongoose';

const customerFeedbackSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true
    },
    nom_client: {
      type: String,
      required: [true, 'Le nom du client est obligatoire.'],
      trim: true,
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères.']
    },
    telephone: {
      type: String,
      default: null,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Le type de retour est obligatoire.'],
      enum: {
        values: ['avis', 'reclamation', 'suggestion'],
        message: 'Le type ({VALUE}) n’est pas valide.'
      },
      default: 'avis',
      index: true
    },
    note_satisfaction: {
      type: Number,
      required: [true, 'La note de satisfaction est obligatoire.'],
      min: [1, 'La note minimale est de 1 étoile.'],
      max: [5, 'La note maximale est de 5 étoiles.']
    },
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      default: null,
      index: true
    },
    commentaire: {
      type: String,
      required: [true, 'Le message ou commentaire est obligatoire.'],
      trim: true,
      maxlength: [1500, 'Le commentaire ne peut pas dépasser 1500 caractères.']
    },
    statut: {
      type: String,
      enum: {
        values: ['nouveau', 'en_cours', 'resolu', 'archive'],
        message: 'Le statut ({VALUE}) n’est pas valide.'
      },
      default: 'nouveau',
      index: true
    },
    reponse_gestionnaire: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'La réponse ne peut pas dépasser 1000 caractères.']
    },
    date_reponse: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'date_creation', updatedAt: 'date_mise_a_jour' },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

const CustomerFeedback = mongoose.model('CustomerFeedback', customerFeedbackSchema);

export default CustomerFeedback;

