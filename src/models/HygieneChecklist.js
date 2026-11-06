/**
 * @fileoverview Modèle Mongoose pour le suivi de l'hygiène et de la sécurité alimentaire.
 * @module models/HygieneChecklist
 * Conforme à la section 7 du cahier des charges opérationnel.
 */

import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    tache: {
      type: String,
      required: [true, 'Le libellé de la tâche d’hygiène est obligatoire.'],
      trim: true
    },
    effectue: {
      type: Boolean,
      default: false
    },
    responsable: {
      type: String,
      default: '',
      trim: true
    },
    heure_realisation: {
      type: String,
      default: null,
      trim: true
    },
    observation: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'L’observation ne peut pas dépasser 300 caractères.']
    }
  },
  { _id: false }
);

const hygieneChecklistSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'La date du contrôle d’hygiène est obligatoire.'],
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
      index: true
    },
    responsable_superviseur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le superviseur responsable est obligatoire.']
    },
    taches: {
      type: [checklistItemSchema],
      default: () => [
        { tache: 'Disponibilité d’eau propre potable' },
        { tache: 'Lavage systématique des mains et savon disponible' },
        { tache: 'Port de vêtements et tabliers propres' },
        { tache: 'Cheveux et barbes protégés par charlottes' },
        { tache: 'Ustensiles et couverts lavés et désinfectés' },
        { tache: 'Plans de travail et tables nettoyés et désinfectés' },
        { tache: 'Plats et aliments protégés contre les insectes' },
        { tache: 'Conservation correcte et séparation cru / cuit' },
        { tache: 'Nettoyage des équipements de cuisson (four, friteuse)' },
        { tache: 'Nettoyage complet de la cuisine en fin de journée' }
      ]
    },
    temperatures: {
      refrigerateur: {
        type: Number,
        default: null, // Ex: +3°C
        min: [-5, 'Température minimale invalide.'],
        max: [15, 'Température maximale de réfrigération dépassée.']
      },
      congelateur: {
        type: Number,
        default: null, // Ex: -18°C
        min: [-30, 'Température de congélation trop basse.'],
        max: [0, 'Température de congélation non conforme.']
      },
      maintien_au_chaud: {
        type: Number,
        default: null, // Ex: +63°C minimum légal
        min: [40, 'Température de maintien au chaud trop basse.']
      }
    },
    statut_conformite: {
      type: String,
      enum: {
        values: ['conforme', 'alerte', 'critique'],
        message: 'Le statut de conformité ({VALUE}) n’est pas valide.'
      },
      default: 'conforme',
      index: true
    },
    remarques_generales: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Les remarques ne peuvent pas dépasser 1000 caractères.']
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

// Calcul automatique du statut de conformité avant sauvegarde
hygieneChecklistSchema.pre('save', function (next) {
  const total = this.taches.length;
  const effectuees = this.taches.filter((t) => t.effectue).length;
  const ratio = total > 0 ? effectuees / total : 1;

  if (ratio < 0.6) {
    this.statut_conformite = 'critique';
  } else if (ratio < 0.9) {
    this.statut_conformite = 'alerte';
  } else {
    this.statut_conformite = 'conforme';
  }

  next();
});

const HygieneChecklist = mongoose.model('HygieneChecklist', hygieneChecklistSchema);

export default HygieneChecklist;

