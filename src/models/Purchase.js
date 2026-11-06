/**
 * @fileoverview Modèle Mongoose pour les approvisionnements et commandes fournisseurs.
 * @module models/Purchase
 * Conforme aux sections 5.10, 7 et à la règle de gestion 7 (entrée en stock sur réception validée).
 */

import mongoose from 'mongoose';
import {
  PURCHASE_RECEIPT_STATUSES,
  PURCHASE_RECEIPT_STATUSES_LIST,
  PAYMENT_STATUSES,
  PAYMENT_STATUSES_LIST,
  PAYMENT_METHODS_LIST
} from '../config/constants.js';

const purchaseLineItemSchema = new mongoose.Schema(
  {
    ingredient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, "L'identifiant de l'ingrédient est obligatoire."]
    },
    quantite_commandee: {
      type: Number,
      required: [true, 'La quantité commandée est obligatoire.'],
      min: [0.001, 'La quantité doit être supérieure à zéro.']
    },
    quantite_recue: {
      type: Number,
      default: 0,
      min: [0, 'La quantité reçue ne peut pas être négative.']
    },
    prix_unitaire: {
      type: Number,
      required: [true, 'Le prix unitaire d’achat est obligatoire.'],
      min: [0, 'Le prix unitaire ne peut pas être négatif.']
    },
    sous_total: {
      type: Number,
      required: true,
      default: function () {
        return Math.round(this.quantite_commandee * this.prix_unitaire * 100) / 100;
      }
    }
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: [true, 'La référence d’approvisionnement est obligatoire.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Le fournisseur associé est obligatoire.'],
      index: true
    },
    date_approvisionnement: {
      type: Date,
      default: Date.now,
      index: true
    },
    lignes: {
      type: [purchaseLineItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'L’approvisionnement doit comporter au moins une ligne d’ingrédient.'
      }
    },
    montant_total: {
      type: Number,
      required: [true, 'Le montant total est obligatoire.'],
      min: [0, 'Le montant total ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    mode_paiement: {
      type: String,
      enum: {
        values: PAYMENT_METHODS_LIST,
        message: 'Le mode de paiement ({VALUE}) n’est pas valide.'
      },
      default: 'espèces'
    },
    statut_paiement: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES_LIST,
        message: 'Le statut de paiement ({VALUE}) n’est pas valide.'
      },
      default: PAYMENT_STATUSES.PENDING
    },
    statut_reception: {
      type: String,
      enum: {
        values: PURCHASE_RECEIPT_STATUSES_LIST,
        message: 'Le statut de réception ({VALUE}) n’est pas valide.'
      },
      default: PURCHASE_RECEIPT_STATUSES.ORDERED,
      index: true
    },
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur responsable est obligatoire."]
    },
    date_reception: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères.']
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
 * Calcul automatique du montant total avant validation.
 */
purchaseSchema.pre('validate', function (next) {
  if (this.lignes && this.lignes.length > 0) {
    this.montant_total = this.lignes.reduce(
      (total, ligne) => total + ligne.sous_total,
      0
    );
    this.montant_total = Math.round(this.montant_total * 100) / 100;
  }
  next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;

