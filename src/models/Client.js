/**
 * @fileoverview Modèle Mongoose pour les clients de la cantine (élèves, employés, visiteurs).
 * @module models/Client
 * Conforme aux sections 5.3, 5.16 et 7 du cahier des charges.
 */

import mongoose from 'mongoose';
import {
  CLIENT_CATEGORIES,
  CLIENT_CATEGORIES_LIST,
  ENTITY_STATUSES,
  ENTITY_STATUSES_LIST
} from '../config/constants.js';

const clientSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du client est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit comporter au moins 2 caractères.'],
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères.']
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom du client est obligatoire.'],
      trim: true,
      minlength: [2, 'Le prénom doit comporter au moins 2 caractères.'],
      maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères.']
    },
    telephone: {
      type: String,
      trim: true,
      default: null,
      maxlength: [20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères.']
    },
    adresse: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, "L'adresse ne peut pas dépasser 255 caractères."]
    },
    categorie: {
      type: String,
      enum: {
        values: CLIENT_CATEGORIES_LIST,
        message: 'La catégorie spécifiée ({VALUE}) n’est pas valide.'
      },
      default: CLIENT_CATEGORIES.OTHER,
      index: true
    },
    solde: {
      type: Number,
      default: 0,
      min: [0, 'Le solde prépayé ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100 // Arrondi au centime
    },
    credit_autorise: {
      type: Boolean,
      default: false
    },
    plafond_credit: {
      type: Number,
      default: 0,
      min: [0, 'Le plafond de crédit ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    statut: {
      type: String,
      enum: {
        values: ENTITY_STATUSES_LIST,
        message: 'Le statut spécifié ({VALUE}) n’est pas valide.'
      },
      default: ENTITY_STATUSES.ACTIVE,
      index: true
    }
  },
  {
    timestamps: { createdAt: 'date_inscription', updatedAt: 'date_mise_a_jour' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index composé pour les recherches rapides par nom et prénom
clientSchema.index({ nom: 1, prenom: 1 });
clientSchema.index({ telephone: 1 });

/**
 * Propriété virtuelle retournant le nom complet formaté.
 */
clientSchema.virtual('nom_complet').get(function () {
  return `${this.prenom} ${this.nom}`.trim();
});

/**
 * Créditer le compte prépayé d'un client.
 * @param {number} montant Montant à créditer.
 */
clientSchema.methods.crediterSolde = async function (montant) {
  if (montant <= 0) {
    throw new Error('Le montant à créditer doit être strictement supérieur à zéro.');
  }
  this.solde = Math.round((this.solde + montant) * 100) / 100;
  return this.save();
};

/**
 * Débiter le compte prépayé d'un client avec contrôle strict du solde et du plafond de crédit.
 * @param {number} montant Montant à débiter.
 */
clientSchema.methods.debiterSolde = async function (montant) {
  if (montant <= 0) {
    throw new Error('Le montant à débiter doit être strictement supérieur à zéro.');
  }

  const soldeDisponible = this.credit_autorise
    ? this.solde + this.plafond_credit
    : this.solde;

  if (soldeDisponible < montant) {
    throw new Error(
      `Solde insuffisant. Disponible : ${this.solde} FCFA (Plafond crédit : ${this.credit_autorise ? this.plafond_credit : 0} FCFA).`
    );
  }

  this.solde = Math.round((this.solde - montant) * 100) / 100;
  return this.save();
};

const Client = mongoose.model('Client', clientSchema);

export default Client;

