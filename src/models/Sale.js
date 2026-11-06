/**
 * @fileoverview Modèle Mongoose pour les ventes au comptoir et encaissements définitifs.
 * @module models/Sale
 * Conforme aux sections 5.12, 7 et aux règles de gestion 3, 4 et 5.
 */

import mongoose from 'mongoose';
import { PAYMENT_METHODS_LIST } from '../config/constants.js';

const saleLineItemSchema = new mongoose.Schema(
  {
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      required: [true, 'L’identifiant du repas est obligatoire.']
    },
    nom_repas: {
      type: String,
      required: [true, 'Le libellé du repas est obligatoire.'],
      trim: true
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité vendue est obligatoire.'],
      min: [1, 'La quantité doit être au minimum de 1.']
    },
    prix_unitaire: {
      type: Number,
      required: [true, 'Le prix unitaire appliqué est obligatoire.'],
      min: [0, 'Le prix ne peut pas être négatif.']
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

const saleSchema = new mongoose.Schema(
  {
    numero_recu: {
      type: String,
      required: [true, 'Le numéro de reçu de caisse est obligatoire.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true
    },
    cashier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le caissier responsable est obligatoire.'],
      index: true
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true
    },
    cash_session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashSession',
      required: [true, 'La session de caisse active est obligatoire.'],
      index: true
    },
    date_vente: {
      type: Date,
      default: Date.now,
      index: true
    },
    lignes: {
      type: [saleLineItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Une vente doit comporter au moins un article vendu.'
      }
    },
    reduction: {
      type: Number,
      default: 0,
      min: [0, 'La réduction ne peut pas être négative.']
    },
    montant_total: {
      type: Number,
      required: [true, 'Le montant total est obligatoire.'],
      min: [0, 'Le montant total ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    montant_paye: {
      type: Number,
      required: [true, 'Le montant versé est obligatoire.'],
      min: [0, 'Le montant versé ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    reste_a_payer: {
      type: Number,
      default: 0,
      min: [0, 'Le reste à payer ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    monnaie_rendue: {
      type: Number,
      default: 0,
      min: [0, 'La monnaie rendue ne peut pas être négative.'],
      set: (val) => Math.round(val * 100) / 100
    },
    mode_paiement: {
      type: String,
      required: [true, 'Le mode de paiement est obligatoire.'],
      enum: {
        values: PAYMENT_METHODS_LIST,
        message: 'Mode de paiement ({VALUE}) non reconnu.'
      }
    },
    statut: {
      type: String,
      enum: ['validée', 'annulée'],
      default: 'validée',
      index: true
    },
    motif_annulation: {
      type: String,
      default: null,
      trim: true,
      maxlength: [255, 'Le motif d’annulation ne peut pas dépasser 255 caractères.']
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

// Calcul et vérification automatique des montants et du reste à payer
saleSchema.pre('validate', function (next) {
  if (this.lignes && this.lignes.length > 0) {
    const totalArticles = this.lignes.reduce(
      (somme, ligne) => somme + (ligne.sous_total || (ligne.quantite * ligne.prix_unitaire)),
      0
    );
    const reductionAppliquee = this.reduction || 0;
    this.montant_total = Math.max(0, Math.round((totalArticles - reductionAppliquee) * 100) / 100);

    const montantVerse = this.montant_paye || 0;
    if (montantVerse >= this.montant_total) {
      this.reste_a_payer = 0;
      this.monnaie_rendue = Math.round((montantVerse - this.montant_total) * 100) / 100;
    } else {
      this.reste_a_payer = Math.round((this.montant_total - montantVerse) * 100) / 100;
      this.monnaie_rendue = 0;
    }
  }
  next();
});

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;

