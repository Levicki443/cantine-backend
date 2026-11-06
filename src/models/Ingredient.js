/**
 * @fileoverview Modèle Mongoose pour les ingrédients et matières premières alimentaires.
 * @module models/Ingredient
 * Conforme aux sections 5.6, 5.7, 7 et à la règle de gestion 6 (stocks non négatifs).
 */

import mongoose from 'mongoose';
import {
  INGREDIENT_UNITS_LIST,
  ENTITY_STATUSES,
  ENTITY_STATUSES_LIST
} from '../config/constants.js';

const ingredientSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de l'ingrédient est obligatoire."],
      unique: true,
      trim: true,
      minlength: [2, "Le nom doit comporter au moins 2 caractères."],
      maxlength: [80, "Le nom ne peut pas dépasser 80 caractères."]
    },
    categorie: {
      type: String,
      required: [true, 'La catégorie de l’ingrédient est obligatoire.'],
      trim: true,
      index: true
    },
    unite: {
      type: String,
      required: [true, "L'unité de mesure est obligatoire."],
      enum: {
        values: INGREDIENT_UNITS_LIST,
        message: "L'unité de mesure ({VALUE}) n'est pas valide."
      }
    },
    quantite_stock: {
      type: Number,
      required: [true, 'La quantité en stock est obligatoire.'],
      default: 0,
      min: [0, 'Le stock d’un ingrédient ne peut jamais être négatif.']
    },
    seuil_minimum: {
      type: Number,
      required: [true, "Le seuil d'alerte minimum est obligatoire."],
      default: 5,
      min: [0, 'Le seuil minimum ne peut pas être négatif.']
    },
    prix_reference: {
      type: Number,
      required: [true, "Le prix d'achat de référence est obligatoire."],
      min: [0, 'Le prix de référence ne peut pas être négatif.']
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

// Index textuel pour les recherches rapides par nom ou catégorie
ingredientSchema.index({ nom: 'text', categorie: 'text' });

/**
 * Propriété virtuelle indiquant si l'ingrédient est sous le seuil d'alerte.
 */
ingredientSchema.virtual('est_en_alerte_stock').get(function () {
  return this.quantite_stock <= this.seuil_minimum;
});

/**
 * Propriété virtuelle indiquant si l'ingrédient est en rupture totale.
 */
ingredientSchema.virtual('est_en_rupture').get(function () {
  return this.quantite_stock === 0;
});

/**
 * Incrémente le stock lors d'une réception d'approvisionnement validée.
 * @param {number} quantite Quantité à ajouter.
 */
ingredientSchema.methods.ajouterStock = async function (quantite) {
  if (quantite <= 0) {
    throw new Error('La quantité à ajouter doit être strictement positive.');
  }
  this.quantite_stock = Math.round((this.quantite_stock + quantite) * 1000) / 1000;
  return this.save();
};

/**
 * Décrémente le stock pour une recette, une vente ou une perte avec contrôle strict.
 * @param {number} quantite Quantité à retirer.
 */
ingredientSchema.methods.retirerStock = async function (quantite) {
  if (quantite <= 0) {
    throw new Error('La quantité à déduire doit être strictement positive.');
  }
  if (this.quantite_stock < quantite) {
    throw new Error(
      `Stock insuffisant pour « ${this.nom} ». Disponible : ${this.quantite_stock} ${this.unite}, requis : ${quantite} ${this.unite}.`
    );
  }
  this.quantite_stock = Math.round((this.quantite_stock - quantite) * 1000) / 1000;
  return this.save();
};

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

export default Ingredient;

