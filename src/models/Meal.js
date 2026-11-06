/**
 * @fileoverview Modèle Mongoose pour les repas et articles vendus au menu de la cantine.
 * @module models/Meal
 * Conforme aux sections 5.4, 7 et à la règle de gestion 8 (respect des disponibilités).
 */

import mongoose from 'mongoose';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORIES_LIST,
  ENTITY_STATUSES,
  ENTITY_STATUSES_LIST
} from '../config/constants.js';

const mealSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du repas est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit comporter au moins 2 caractères.'],
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères.']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères.']
    },
    categorie: {
      type: String,
      required: [true, 'La catégorie du repas est obligatoire.'],
      enum: {
        values: MEAL_CATEGORIES_LIST,
        message: 'La catégorie ({VALUE}) n’est pas valide.'
      },
      default: MEAL_CATEGORIES.LUNCH,
      index: true
    },
    prix: {
      type: Number,
      required: [true, 'Le prix du repas est obligatoire.'],
      min: [0, 'Le prix du repas ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    image: {
      type: String,
      default: null,
      trim: true
    },
    quantite_disponible: {
      type: Number,
      default: 0,
      min: [0, 'La quantité disponible ne peut pas être négative.']
    },
    disponible: {
      type: Boolean,
      default: true,
      index: true
    },
    periode_disponibilite: {
      type: String,
      trim: true,
      default: 'toute la journée'
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

// Index textuel pour les recherches rapides
mealSchema.index({ nom: 'text', description: 'text' });
mealSchema.index({ categorie: 1, disponible: 1 });

/**
 * Déduit des portions disponibles lors d'une commande ou vente validée.
 * @param {number} quantite Nombre de portions vendues.
 */
mealSchema.methods.deduirePortions = async function (quantite) {
  if (quantite <= 0) {
    throw new Error('La quantité à déduire doit être supérieure à zéro.');
  }

  if (!this.disponible || this.quantite_disponible < quantite) {
    throw new Error(
      `Repas indisponible en quantité suffisante : « ${this.nom} » (Disponible : ${this.quantite_disponible}, Requis : ${quantite}).`
    );
  }

  this.quantite_disponible -= quantite;
  if (this.quantite_disponible === 0) {
    this.disponible = false;
  }
  return this.save();
};

/**
 * Réapprovisionne les portions préparées par la cuisine.
 * @param {number} quantite Nombre de portions prêtes.
 */
mealSchema.methods.ajouterPortions = async function (quantite) {
  if (quantite <= 0) {
    throw new Error('La quantité à ajouter doit être supérieure à zéro.');
  }

  this.quantite_disponible += quantite;
  if (this.quantite_disponible > 0) {
    this.disponible = true;
  }
  return this.save();
};

const Meal = mongoose.model('Meal', mealSchema);

export default Meal;

