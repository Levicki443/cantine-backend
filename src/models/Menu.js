/**
 * @fileoverview Modèle Mongoose pour les menus journaliers et périodiques de la cantine.
 * @module models/Menu
 * Conforme aux sections 5.5 et 7 du cahier des charges officiel.
 */

import mongoose from 'mongoose';
import { ENTITY_STATUSES, ENTITY_STATUSES_LIST } from '../config/constants.js';

const menuMealItemSchema = new mongoose.Schema(
  {
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      required: [true, 'L’identifiant du repas est obligatoire.']
    },
    type_plat: {
      type: String,
      enum: ['entrée', 'plat principal', 'accompagnement', 'dessert', 'boisson', 'autre'],
      default: 'plat principal'
    },
    quantite_allouee: {
      type: Number,
      required: [true, 'La quantité allouée pour ce repas est obligatoire.'],
      min: [1, 'La quantité allouée doit être d’au moins 1.']
    },
    quantite_restante: {
      type: Number,
      default: function () {
        return this.quantite_allouee;
      },
      min: [0, 'La quantité restante ne peut pas être négative.']
    }
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom ou l’intitulé du menu est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit comporter au moins 2 caractères.'],
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères.']
    },
    date_menu: {
      type: Date,
      required: [true, 'La date de service du menu est obligatoire.'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères.']
    },
    prix_formule: {
      type: Number,
      default: null,
      min: [0, 'Le prix de la formule ne peut pas être négatif.']
    },
    repas: {
      type: [menuMealItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Un menu doit comporter au moins un repas associé.'
      }
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

// Index composé pour rechercher les menus par date et statut
menuSchema.index({ date_menu: 1, statut: 1 });

/**
 * Décrémente la quantité restante d'un repas particulier dans le menu.
 * @param {string} mealId Identifiant du repas vendu.
 * @param {number} quantite Quantité vendue.
 */
menuSchema.methods.consommerRepas = async function (mealId, quantite = 1) {
  const item = this.repas.find(
    (r) => r.meal_id.toString() === mealId.toString()
  );

  if (!item) {
    throw new Error('Repas non trouvé dans la composition de ce menu.');
  }

  if (item.quantite_restante < quantite) {
    throw new Error(
      `Quantité restante insuffisante pour ce menu (Disponible : ${item.quantite_restante}, Requis : ${quantite}).`
    );
  }

  item.quantite_restante -= quantite;
  return this.save();
};

const Menu = mongoose.model('Menu', menuSchema);

export default Menu;

