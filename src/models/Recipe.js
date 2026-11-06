/**
 * @fileoverview Modèle Mongoose pour les fiches techniques et recettes de cuisine.
 * @module models/Recipe
 * Conforme aux sections 5.8 et 7 du cahier des charges officiel.
 */

import mongoose from 'mongoose';
import { INGREDIENT_UNITS_LIST } from '../config/constants.js';

const recipeIngredientItemSchema = new mongoose.Schema(
  {
    ingredient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, "L'identifiant de l'ingrédient est obligatoire."]
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité nécessaire est obligatoire.'],
      min: [0.001, 'La quantité de l’ingrédient doit être supérieure à zéro.']
    },
    unite: {
      type: String,
      required: [true, "L'unité de mesure est obligatoire."],
      enum: {
        values: INGREDIENT_UNITS_LIST,
        message: "L'unité ({VALUE}) n'est pas valide."
      }
    }
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      required: [true, 'Le repas associé est obligatoire.'],
      unique: true,
      index: true
    },
    nom: {
      type: String,
      required: [true, 'Le nom de la recette est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom de la recette doit comporter au moins 2 caractères.'],
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères.']
    },
    nombre_portions: {
      type: Number,
      required: [true, 'Le nombre de portions de base est obligatoire.'],
      min: [1, 'La recette doit prévoir au moins 1 portion.'],
      default: 1
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Les instructions ne peuvent pas dépasser 2000 caractères.']
    },
    cout_estime_portion: {
      type: Number,
      default: 0,
      min: [0, 'Le coût estimé par portion ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    ingredients: {
      type: [recipeIngredientItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Une recette doit comporter au moins un ingrédient.'
      }
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
 * Calcule les quantités requises de chaque ingrédient en fonction du nombre de portions souhaité.
 * @param {number} portionsDemandees Nombre de portions à préparer.
 * @returns {Array<{ ingredient_id: mongoose.Types.ObjectId, quantiteRecommandee: number, unite: string }>}
 */
recipeSchema.methods.calculerBesoins = function (portionsDemandees) {
  if (portionsDemandees <= 0) {
    throw new Error('Le nombre de portions à préparer doit être supérieur à zéro.');
  }

  const ratio = portionsDemandees / this.nombre_portions;

  return this.ingredients.map((item) => ({
    ingredient_id: item.ingredient_id,
    quantiteRecommandee: Math.round(item.quantite * ratio * 1000) / 1000,
    unite: item.unite
  }));
};

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;

