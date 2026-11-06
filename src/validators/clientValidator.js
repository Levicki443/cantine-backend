/**
 * @fileoverview Schémas de validation Joi pour le module de gestion des clients.
 * @module validators/clientValidator
 * Assure l'intégrité et le formatage des données clients (élèves, employés, etc.).
 */

import Joi from 'joi';
import {
  CLIENT_CATEGORIES_LIST,
  ENTITY_STATUSES_LIST,
  PAYMENT_METHODS_LIST
} from '../config/constants.js';

export const createClientSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Le nom du client est obligatoire.',
    'string.min': 'Le nom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le nom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le nom du client est obligatoire.'
  }),
  prenom: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Le prénom du client est obligatoire.',
    'string.min': 'Le prénom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le prénom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le prénom du client est obligatoire.'
  }),
  telephone: Joi.string().trim().max(20).allow('', null).messages({
    'string.max': 'Le numéro de téléphone ne peut pas dépasser {#limit} caractères.'
  }),
  adresse: Joi.string().trim().max(255).allow('', null).messages({
    'string.max': 'L’adresse ne peut pas dépasser {#limit} caractères.'
  }),
  categorie: Joi.string()
    .valid(...CLIENT_CATEGORIES_LIST)
    .messages({
      'any.only': 'La catégorie sélectionnée n’est pas valide.'
    }),
  solde: Joi.number().min(0).default(0).messages({
    'number.min': 'Le solde initial ne peut pas être négatif.'
  }),
  credit_autorise: Joi.boolean().default(false),
  plafond_credit: Joi.number().min(0).default(0).messages({
    'number.min': 'Le plafond de crédit ne peut pas être négatif.'
  }),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
});

export const updateClientSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(50).messages({
    'string.min': 'Le nom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le nom ne peut pas dépasser {#limit} caractères.'
  }),
  prenom: Joi.string().trim().min(2).max(50).messages({
    'string.min': 'Le prénom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le prénom ne peut pas dépasser {#limit} caractères.'
  }),
  telephone: Joi.string().trim().max(20).allow('', null),
  adresse: Joi.string().trim().max(255).allow('', null),
  categorie: Joi.string().valid(...CLIENT_CATEGORIES_LIST),
  credit_autorise: Joi.boolean(),
  plafond_credit: Joi.number().min(0),
  statut: Joi.string().valid(...ENTITY_STATUSES_LIST)
}).min(1);

export const rechargeClientSchema = Joi.object({
  montant: Joi.number().positive().required().messages({
    'number.base': 'Le montant doit être une valeur numérique.',
    'number.positive': 'Le montant à créditer doit être strictement supérieur à zéro.',
    'any.required': 'Le montant est obligatoire.'
  }),
  mode_paiement: Joi.string()
    .valid(...PAYMENT_METHODS_LIST)
    .required()
    .messages({
      'any.only': 'Le mode de paiement sélectionné n’est pas valide.',
      'any.required': 'Le mode de paiement est obligatoire.'
    }),
  reference_externe: Joi.string().trim().max(100).allow('', null)
});

