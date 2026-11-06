/**
 * @fileoverview Schémas de validation Joi pour les stocks, approvisionnements et pertes.
 * @module validators/stockValidator
 * Conforme aux sections 5.6, 5.7, 5.10 et 5.17 du cahier des charges.
 */

import Joi from 'joi';
import {
  INGREDIENT_UNITS_LIST,
  ENTITY_STATUSES_LIST,
  STOCK_MOVEMENT_TYPES_LIST,
  PAYMENT_METHODS_LIST
} from '../config/constants.js';

export const createIngredientSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(80).required().messages({
    'string.empty': 'Le nom de l’ingrédient est obligatoire.',
    'string.min': 'Le nom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le nom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le nom de l’ingrédient est obligatoire.'
  }),
  categorie: Joi.string().trim().required().messages({
    'string.empty': 'La catégorie de l’ingrédient est obligatoire.',
    'any.required': 'La catégorie de l’ingrédient est obligatoire.'
  }),
  unite: Joi.string()
    .valid(...INGREDIENT_UNITS_LIST)
    .required()
    .messages({
      'any.only': 'L’unité de mesure ({VALUE}) n’est pas valide.',
      'any.required': 'L’unité de mesure est obligatoire.'
    }),
  quantite_stock: Joi.number().min(0).default(0).messages({
    'number.min': 'La quantité initiale en stock ne peut pas être négative.'
  }),
  seuil_minimum: Joi.number().min(0).default(5).messages({
    'number.min': 'Le seuil d’alerte ne peut pas être négatif.'
  }),
  prix_reference: Joi.number().min(0).required().messages({
    'number.min': 'Le prix de référence ne peut pas être négatif.',
    'any.required': 'Le prix d’achat de référence est obligatoire.'
  }),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
});

export const updateIngredientSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(80),
  categorie: Joi.string().trim(),
  unite: Joi.string().valid(...INGREDIENT_UNITS_LIST),
  seuil_minimum: Joi.number().min(0),
  prix_reference: Joi.number().min(0),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
}).min(1);

export const adjustStockSchema = Joi.object({
  quantite: Joi.number().positive().required().messages({
    'number.positive': 'La quantité doit être strictement positive.',
    'any.required': 'La quantité est obligatoire.'
  }),
  type_mouvement: Joi.string()
    .valid(...STOCK_MOVEMENT_TYPES_LIST)
    .required()
    .messages({
      'any.only': 'Le type de mouvement ({VALUE}) n’est pas valide.',
      'any.required': 'Le type de mouvement est obligatoire.'
    }),
  motif: Joi.string().trim().min(3).max(255).required().messages({
    'string.empty': 'Le motif de régularisation est obligatoire.',
    'any.required': 'Le motif est obligatoire.'
  }),
  reference_operation: Joi.string().trim().allow('', null)
});

export const createPurchaseSchema = Joi.object({
  supplier_id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'L’identifiant du fournisseur doit être un ObjectId valide.',
    'any.required': 'Le fournisseur est obligatoire.'
  }),
  date_approvisionnement: Joi.date().iso().default(Date.now),
  mode_paiement: Joi.string()
    .valid(...PAYMENT_METHODS_LIST)
    .default('espèces'),
  notes: Joi.string().trim().max(500).allow('', null),
  lignes: Joi.array()
    .items(
      Joi.object({
        ingredient_id: Joi.string().hex().length(24).required().messages({
          'string.hex': 'L’identifiant de l’ingrédient doit être un ObjectId valide.',
          'any.required': 'L’ingrédient est obligatoire.'
        }),
        quantite_commandee: Joi.number().positive().required().messages({
          'number.positive': 'La quantité commandée doit être strictement positive.',
          'any.required': 'La quantité commandée est obligatoire.'
        }),
        prix_unitaire: Joi.number().min(0).required().messages({
          'number.min': 'Le prix unitaire ne peut pas être négatif.',
          'any.required': 'Le prix unitaire est obligatoire.'
        })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'La commande doit comporter au moins un ingrédient.',
      'any.required': 'La liste des ingrédients est obligatoire.'
    })
});

export const receivePurchaseSchema = Joi.object({
  lignes_recues: Joi.array()
    .items(
      Joi.object({
        ingredient_id: Joi.string().hex().length(24).required(),
        quantite_recue: Joi.number().min(0).required()
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Veuillez spécifier les quantités reçues.',
      'any.required': 'Les quantités reçues sont obligatoires.'
    })
});

