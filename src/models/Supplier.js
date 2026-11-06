/**
 * @fileoverview Modèle Mongoose pour les fournisseurs de denrées et matériels de la cantine.
 * @module models/Supplier
 * Conforme aux sections 5.9 et 7 du cahier des charges officiel.
 */

import mongoose from 'mongoose';
import { ENTITY_STATUSES, ENTITY_STATUSES_LIST } from '../config/constants.js';

const supplierSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'La raison sociale ou nom du fournisseur est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit comporter au moins 2 caractères.'],
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères.'],
      index: true
    },
    contact: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Le nom du contact ne peut pas dépasser 100 caractères.']
    },
    telephone: {
      type: String,
      required: [true, 'Le numéro de téléphone du fournisseur est obligatoire.'],
      trim: true,
      maxlength: [25, 'Le numéro de téléphone ne peut pas dépasser 25 caractères.']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Veuillez renseigner une adresse courriel valide.'
      ]
    },
    adresse: {
      type: String,
      trim: true,
      default: '',
      maxlength: [255, 'L’adresse ne peut pas dépasser 255 caractères.']
    },
    produits_fournis: {
      type: [String],
      default: []
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

supplierSchema.index({ nom: 'text', contact: 'text' });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

