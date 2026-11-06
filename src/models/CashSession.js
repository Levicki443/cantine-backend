/**
 * @fileoverview Modèle Mongoose pour les sessions de caisse journalières des caissiers.
 * @module models/CashSession
 * Conforme aux sections 5.14, 7 et aux exigences de contrôle financier.
 */

import mongoose from 'mongoose';
import {
  CASH_SESSION_STATUSES,
  CASH_SESSION_STATUSES_LIST
} from '../config/constants.js';

const cashSessionSchema = new mongoose.Schema(
  {
    caissier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le caissier titulaire de la session est obligatoire.'],
      index: true
    },
    date_ouverture: {
      type: Date,
      default: Date.now,
      index: true
    },
    montant_initial: {
      type: Number,
      required: [true, 'Le fond de caisse initial est obligatoire.'],
      min: [0, 'Le fond de caisse ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    total_encaissements: {
      type: Number,
      default: 0,
      min: [0, 'Le total des encaissements ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    total_sorties: {
      type: Number,
      default: 0,
      min: [0, 'Le total des sorties ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    montant_theorique: {
      type: Number,
      default: function () {
        return this.montant_initial;
      },
      set: (val) => Math.round(val * 100) / 100
    },
    montant_reel: {
      type: Number,
      default: null,
      set: (val) => (val !== null ? Math.round(val * 100) / 100 : null)
    },
    ecart: {
      type: Number,
      default: null,
      set: (val) => (val !== null ? Math.round(val * 100) / 100 : null)
    },
    motif_ecart: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Le motif d’écart ne peut pas dépasser 500 caractères.']
    },
    date_cloture: {
      type: Date,
      default: null
    },
    statut: {
      type: String,
      enum: {
        values: CASH_SESSION_STATUSES_LIST,
        message: 'Le statut de session ({VALUE}) n’est pas valide.'
      },
      default: CASH_SESSION_STATUSES.OPEN,
      index: true
    }
  },
  {
    timestamps: { createdAt: 'date_creation', updatedAt: 'date_mise_a_jour' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Enregistre un encaissement dans la session de caisse en cours.
 * @param {number} montant Montant encaissé.
 */
cashSessionSchema.methods.ajouterEncaissement = async function (montant) {
  if (this.statut !== CASH_SESSION_STATUSES.OPEN) {
    throw new Error('Impossible d’enregistrer une vente sur une session de caisse clôturée.');
  }
  if (montant <= 0) {
    throw new Error('Le montant de l’encaissement doit être strictement positif.');
  }

  this.total_encaissements = Math.round((this.total_encaissements + montant) * 100) / 100;
  this.montant_theorique = Math.round((this.montant_theorique + montant) * 100) / 100;
  return this.save();
};

/**
 * Enregistre une sortie de caisse exceptionnelle autorisée.
 * @param {number} montant Montant retiré de la caisse.
 */
cashSessionSchema.methods.ajouterSortie = async function (montant) {
  if (this.statut !== CASH_SESSION_STATUSES.OPEN) {
    throw new Error('Impossible d’enregistrer une sortie sur une session clôturée.');
  }
  if (montant <= 0) {
    throw new Error('Le montant de la sortie doit être strictement positif.');
  }

  this.total_sorties = Math.round((this.total_sorties + montant) * 100) / 100;
  this.montant_theorique = Math.round((this.montant_theorique - montant) * 100) / 100;
  return this.save();
};

/**
 * Clôture formelle de la session avec calcul de l'écart théorique / réel.
 * @param {number} montantReel Montant effectivement compté dans le tiroir-caisse.
 * @param {string|null} motifEcart Justification obligatoire en cas d'écart.
 */
cashSessionSchema.methods.cloturer = async function (montantReel, motifEcart = null) {
  if (this.statut === CASH_SESSION_STATUSES.CLOSED) {
    throw new Error('Cette session de caisse est déjà clôturée.');
  }
  if (montantReel < 0) {
    throw new Error('Le montant compté ne peut pas être négatif.');
  }

  const ecartCalcule = Math.round((montantReel - this.montant_theorique) * 100) / 100;

  if (ecartCalcule !== 0 && (!motifEcart || motifEcart.trim().length === 0)) {
    throw new Error('Un écart entre le montant théorique et le montant réel exige une justification explicite.');
  }

  this.montant_reel = montantReel;
  this.ecart = ecartCalcule;
  this.motif_ecart = motifEcart ? motifEcart.trim() : null;
  this.date_cloture = new Date();
  this.statut = CASH_SESSION_STATUSES.CLOSED;

  return this.save();
};

const CashSession = mongoose.model('CashSession', cashSessionSchema);

export default CashSession;

