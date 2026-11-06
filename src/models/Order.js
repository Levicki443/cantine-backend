/**
 * @fileoverview Modèle Mongoose pour les commandes clients (repas et menus).
 * @module models/Order
 * Conforme aux sections 5.11, 7 et aux règles de gestion 3 et 15.
 */

import mongoose from 'mongoose';
import {
  ORDER_STATUSES,
  ORDER_STATUSES_LIST,
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_LIST
} from '../config/constants.js';

const orderLineItemSchema = new mongoose.Schema(
  {
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      required: [true, "L'identifiant du repas est obligatoire."]
    },
    nom_repas: {
      type: String,
      required: [true, 'Le nom du repas au moment de la commande est obligatoire.'],
      trim: true
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité commandée est obligatoire.'],
      min: [1, 'La quantité commandée doit être d’au moins 1.']
    },
    prix_unitaire: {
      type: Number,
      required: [true, 'Le prix unitaire est obligatoire.'],
      min: [0, 'Le prix unitaire ne peut pas être négatif.']
    },
    sous_total: {
      type: Number,
      required: true,
      default: function () {
        return Math.round(this.quantite * this.prix_unitaire * 100) / 100;
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    numero_commande: {
      type: String,
      required: [true, 'Le numéro de commande est obligatoire.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true
    },
    nom_client_libre: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'Le nom client ne peut pas dépasser 100 caractères.']
    },
    date_commande: {
      type: Date,
      default: Date.now,
      index: true
    },
    lignes: {
      type: [orderLineItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Une commande doit comporter au moins un repas.'
      }
    },
    montant_total: {
      type: Number,
      required: [true, 'Le montant total est obligatoire.'],
      min: [0, 'Le montant total ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    statut: {
      type: String,
      enum: {
        values: ORDER_STATUSES_LIST,
        message: 'Le statut de commande ({VALUE}) n’est pas valide.'
      },
      default: ORDER_STATUSES.CREATED,
      index: true
    },
    statut_paiement: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES_LIST,
        message: 'Le statut de paiement ({VALUE}) n’est pas valide.'
      },
      default: PAYMENT_STATUSES.PENDING,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Les remarques ne peuvent pas dépasser 500 caractères.']
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

// Calcul automatique du montant total avant validation
orderSchema.pre('validate', function (next) {
  if (this.lignes && this.lignes.length > 0) {
    this.montant_total = this.lignes.reduce(
      (somme, ligne) => somme + (ligne.sous_total || (ligne.quantite * ligne.prix_unitaire)),
      0
    );
    this.montant_total = Math.round(this.montant_total * 100) / 100;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

