/**
 * @fileoverview Modèle Mongoose pour les transactions financières et encaissements.
 * @module models/Payment
 * Conforme aux sections 5.13, 7 et aux règles de gestion 9 et 10.
 */

import mongoose from 'mongoose';
import {
  PAYMENT_METHODS_LIST,
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_LIST
} from '../config/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: [true, 'La référence unique du paiement est obligatoire.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
      index: true
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true
    },
    cashier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le caissier ayant enregistré l’opération est obligatoire.'],
      index: true
    },
    montant: {
      type: Number,
      required: [true, 'Le montant de la transaction est obligatoire.'],
      min: [0.01, 'Le montant de la transaction doit être strictement positif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    mode_paiement: {
      type: String,
      required: [true, 'Le mode de règlement est obligatoire.'],
      enum: {
        values: PAYMENT_METHODS_LIST,
        message: 'Mode de règlement ({VALUE}) non reconnu.'
      }
    },
    type_operation: {
      type: String,
      enum: ['encaissement', 'remboursement'],
      default: 'encaissement',
      index: true
    },
    reference_externe: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'La référence externe ne peut pas dépasser 100 caractères.']
    },
    statut: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES_LIST,
        message: 'Statut de paiement ({VALUE}) non reconnu.'
      },
      default: PAYMENT_STATUSES.PAID,
      index: true
    },
    motif_remboursement: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'Le motif du remboursement ne peut pas dépasser 255 caractères.']
    },
    date_paiement: {
      type: Date,
      default: Date.now,
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

// Règle 9 : un paiement doit être associé à une vente ou à une commande
paymentSchema.pre('validate', function (next) {
  if (!this.sale_id && !this.order_id && !this.client_id) {
    return next(
      new Error('Un paiement doit être impérativement associé à une vente, une commande ou un compte client.')
    );
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

