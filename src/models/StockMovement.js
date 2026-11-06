/**
 * @fileoverview Modèle Mongoose pour le grand livre des mouvements de stock (StockMovements).
 * @module models/StockMovement
 * Conforme aux sections 5.7, 7 et aux règles de gestion 6 et 16.
 */

import mongoose from 'mongoose';
import {
  STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPES_LIST
} from '../config/constants.js';
import Ingredient from './Ingredient.js';

const stockMovementSchema = new mongoose.Schema(
  {
    ingredient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, "L'identifiant de l'ingrédient est obligatoire."],
      index: true
    },
    type_mouvement: {
      type: String,
      required: [true, 'Le type de mouvement est obligatoire.'],
      enum: {
        values: STOCK_MOVEMENT_TYPES_LIST,
        message: 'Type de mouvement ({VALUE}) non reconnu.'
      },
      index: true
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité est obligatoire.'],
      min: [0.001, 'La quantité doit être strictement positive.']
    },
    quantite_avant: {
      type: Number,
      required: [true, 'Le stock antérieur est obligatoire.']
    },
    quantite_apres: {
      type: Number,
      required: [true, 'Le stock résultant est obligatoire.']
    },
    motif: {
      type: String,
      required: [true, 'Le motif de mouvement est obligatoire.'],
      trim: true,
      maxlength: [255, 'Le motif ne peut pas dépasser 255 caractères.']
    },
    reference_operation: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur responsable est obligatoire."],
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

/**
 * Enregistre un mouvement de stock de manière atomique et met à jour l'ingrédient.
 * Empêche formellement tout stock négatif conformément à la règle 6.
 * @param {Object} options Paramètres du mouvement.
 * @returns {Promise<Document>} Document de mouvement créé.
 */
stockMovementSchema.statics.enregistrer = async function ({
  ingredientId,
  typeMouvement,
  quantite,
  motif,
  referenceOperation = null,
  utilisateurId,
  session = null
}) {
  const query = Ingredient.findById(ingredientId);
  if (session) {
    query.session(session);
  }
  const ingredient = await query;

  if (!ingredient) {
    throw new Error(`Ingrédient introuvable (ID : ${ingredientId}).`);
  }

  const quantiteAvant = ingredient.quantite_stock;
  let quantiteApres = quantiteAvant;

  // Détermination du sens du flux
  const estEntree =
    typeMouvement === STOCK_MOVEMENT_TYPES.PURCHASE_ENTRY ||
    (typeMouvement === STOCK_MOVEMENT_TYPES.INVENTORY_ADJUSTMENT && quantite > 0);

  if (estEntree) {
    quantiteApres = Math.round((quantiteAvant + quantite) * 1000) / 1000;
  } else {
    const quantiteADeduire = Math.abs(quantite);
    if (quantiteAvant < quantiteADeduire) {
      throw new Error(
        `Opération rejetée : stock insuffisant pour « ${ingredient.nom} » (Disponible : ${quantiteAvant} ${ingredient.unite}, Déduction requise : ${quantiteADeduire} ${ingredient.unite}).`
      );
    }
    quantiteApres = Math.round((quantiteAvant - quantiteADeduire) * 1000) / 1000;
  }

  // Sauvegarde de l'ingrédient mis à jour
  ingredient.quantite_stock = quantiteApres;
  await ingredient.save({ session });

  // Création de la trace inaltérable du mouvement
  const options = session ? { session } : {};
  const [mouvement] = await this.create(
    [
      {
        ingredient_id: ingredientId,
        type_mouvement: typeMouvement,
        quantite: Math.abs(quantite),
        quantite_avant: quantiteAvant,
        quantite_apres: quantiteApres,
        motif,
        reference_operation: referenceOperation,
        utilisateur_id: utilisateurId,
        date: new Date()
      }
    ],
    options
  );

  return mouvement;
};

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;

