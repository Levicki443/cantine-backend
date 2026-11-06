/**
 * @fileoverview Modèle Mongoose pour la comptabilité des dépenses d'exploitation.
 * @module models/Expense
 * Conforme aux sections 5.15, 7 et à la règle de gestion 10 (catégorisation des dépenses).
 */

import mongoose from 'mongoose';
import {
  EXPENSE_CATEGORIES_LIST,
  PAYMENT_METHODS_LIST
} from '../config/constants.js';

const expenseSchema = new mongoose.Schema(
  {
    categorie: {
      type: String,
      required: [true, 'La catégorie de la dépense est obligatoire.'],
      enum: {
        values: EXPENSE_CATEGORIES_LIST,
        message: 'La catégorie de dépense ({VALUE}) n’est pas valide.'
      },
      index: true
    },
    description: {
      type: String,
      required: [true, 'La description de la charge est obligatoire.'],
      trim: true,
      minlength: [3, 'La description doit comporter au moins 3 caractères.'],
      maxlength: [255, 'La description ne peut pas dépasser 255 caractères.']
    },
    montant: {
      type: Number,
      required: [true, 'Le montant de la dépense est obligatoire.'],
      min: [0.01, 'Le montant de la dépense doit être strictement positif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    mode_paiement: {
      type: String,
      required: [true, 'Le mode de règlement est obligatoire.'],
      enum: {
        values: PAYMENT_METHODS_LIST,
        message: 'Mode de règlement ({VALUE}) non reconnu.'
      },
      default: 'espèces'
    },
    justificatif: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'Le justificatif ne peut pas dépasser 255 caractères.']
    },
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur ayant engagé la dépense est obligatoire."],
      index: true
    },
    statut: {
      type: String,
      enum: ['en attente', 'validée', 'rejetée'],
      default: 'validée',
      index: true
    },
    validateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

expenseSchema.index({ categorie: 1, date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;

