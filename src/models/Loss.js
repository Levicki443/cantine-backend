/**
 * @fileoverview Modèle Mongoose pour l'enregistrement et le suivi des pertes alimentaires.
 * @module models/Loss
 * Conforme aux sections 5.17 et 7 du cahier des charges officiel.
 */

import mongoose from 'mongoose';

const lossSchema = new mongoose.Schema(
  {
    ingredient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      default: null,
      index: true
    },
    meal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      default: null,
      index: true
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité perdue est obligatoire.'],
      min: [0.001, 'La quantité perdue doit être strictement positive.']
    },
    unite: {
      type: String,
      required: [true, "L'unité de mesure est obligatoire."],
      trim: true
    },
    motif: {
      type: String,
      required: [true, 'Le motif de la perte est obligatoire.'],
      enum: {
        values: [
          'produit périmé',
          'produit abîmé',
          'erreur de préparation',
          'repas non vendu',
          'gaspillage',
          'autre'
        ],
        message: 'Le motif spécifié ({VALUE}) n’est pas valide.'
      },
      index: true
    },
    cout_estime: {
      type: Number,
      default: 0,
      min: [0, 'Le coût estimé de la perte ne peut pas être négatif.'],
      set: (val) => Math.round(val * 100) / 100
    },
    observation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'L’observation ne peut pas dépasser 500 caractères.']
    },
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur responsable du signalement est obligatoire."],
      index: true
    },
    date: {
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

// Au moins un ingrédient ou un repas doit être désigné
lossSchema.pre('validate', function (next) {
  if (!this.ingredient_id && !this.meal_id) {
    return next(new Error('La perte doit désigner soit un ingrédient, soit un plat/repas préparé.'));
  }
  next();
});

const Loss = mongoose.model('Loss', lossSchema);

export default Loss;

