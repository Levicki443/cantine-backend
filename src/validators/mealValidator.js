/**
 * @fileoverview Schémas de validation Joi pour les repas et les menus de la cantine.
 * @module validators/mealValidator
 * Conforme aux sections 5.4 et 5.5 du cahier des charges.
 */

import Joi from 'joi';
import {
  MEAL_CATEGORIES_LIST,
  ENTITY_STATUSES_LIST
} from '../config/constants.js';

export const createMealSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Le nom du repas est obligatoire.',
    'string.min': 'Le nom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le nom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le nom du repas est obligatoire.'
  }),
  description: Joi.string().trim().max(500).allow('', null),
  categorie: Joi.string()
    .valid(...MEAL_CATEGORIES_LIST)
    .required()
    .messages({
      'any.only': 'La catégorie du repas ({VALUE}) n’est pas valide.',
      'any.required': 'La catégorie du repas est obligatoire.'
    }),
  prix: Joi.number().min(0).required().messages({
    'number.base': 'Le prix doit être un nombre.',
    'number.min': 'Le prix du repas ne peut pas être négatif.',
    'any.required': 'Le prix du repas est obligatoire.'
  }),
  image: Joi.string().trim().allow('', null),
  quantite_disponible: Joi.number().integer().min(0).default(0),
  disponible: Joi.boolean().default(true),
  periode_disponibilite: Joi.string().trim().max(100).default('toute la journée'),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
});

export const updateMealSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(500).allow('', null),
  categorie: Joi.string().valid(...MEAL_CATEGORIES_LIST),
  prix: Joi.number().min(0),
  image: Joi.string().trim().allow('', null),
  quantite_disponible: Joi.number().integer().min(0),
  disponible: Joi.boolean(),
  periode_disponibilite: Joi.string().trim().max(100),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
}).min(1);

export const adjustPortionsSchema = Joi.object({
  quantite: Joi.number().integer().positive().required().messages({
    'number.positive': 'La quantité doit être strictement positive.',
    'any.required': 'La quantité est obligatoire.'
  }),
  operation: Joi.string().valid('ajouter', 'deduire').required().messages({
    'any.only': "L'opération doit être soit « ajouter » soit « deduire ».",
    'any.required': "L'opération est obligatoire."
  })
});

export const createMenuSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Le nom du menu est obligatoire.',
    'any.required': 'Le nom du menu est obligatoire.'
  }),
  date_menu: Joi.date().iso().required().messages({
    'date.base': 'La date du menu doit être une date valide au format ISO.',
    'any.required': 'La date du menu est obligatoire.'
  }),
  description: Joi.string().trim().max(500).allow('', null),
  prix_formule: Joi.number().min(0).allow(null),
  repas: Joi.array()
    .items(
      Joi.object({
        meal_id: Joi.string().hex().length(24).required().messages({
          'string.hex': "L'identifiant du repas doit être un ObjectId valide.",
          'any.required': "L'identifiant du repas est obligatoire."
        }),
        type_plat: Joi.string()
          .valid('entrée', 'plat principal', 'accompagnement', 'dessert', 'boisson', 'autre')
          .default('plat principal'),
        quantite_allouee: Joi.number().integer().min(1).required().messages({
          'number.min': 'La quantité allouée doit être d’au moins 1.',
          'any.required': 'La quantité allouée est obligatoire.'
        })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Le menu doit contenir au moins un repas associé.',
      'any.required': 'La liste des repas associés est obligatoire.'
    }),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
});

export const updateMenuSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100),
  date_menu: Joi.date().iso(),
  description: Joi.string().trim().max(500).allow('', null),
  prix_formule: Joi.number().min(0).allow(null),
  repas: Joi.array()
    .items(
      Joi.object({
        meal_id: Joi.string().hex().length(24).required(),
        type_plat: Joi.string()
          .valid('entrée', 'plat principal', 'accompagnement', 'dessert', 'boisson', 'autre')
          .default('plat principal'),
        quantite_allouee: Joi.number().integer().min(1).required()
      })
    )
    .min(1),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
}).min(1);

