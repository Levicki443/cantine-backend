/**
 * @fileoverview Schémas de validation Joi pour le point de vente, caisse et encaissements.
 * @module validators/posValidator
 * Conforme aux sections 5.11, 5.12, 5.13 et 5.14 du cahier des charges.
 */

import Joi from 'joi';
import { PAYMENT_METHODS_LIST } from '../config/constants.js';

export const openSessionSchema = Joi.object({
  montant_initial: Joi.number().min(0).required().messages({
    'number.min': 'Le fond de caisse initial ne peut pas être négatif.',
    'any.required': 'Le montant initial du fond de caisse est obligatoire.'
  })
});

export const closeSessionSchema = Joi.object({
  montant_reel: Joi.number().min(0).required().messages({
    'number.min': 'Le montant réel compté ne peut pas être négatif.',
    'any.required': 'Le montant réel compté est obligatoire.'
  }),
  motif_ecart: Joi.string().trim().max(500).allow('', null)
});

export const createSaleSchema = Joi.object({
  client_id: Joi.string().hex().length(24).allow(null),
  order_id: Joi.string().hex().length(24).allow(null),
  reduction: Joi.number().min(0).default(0),
  montant_paye: Joi.number().min(0).required().messages({
    'number.min': 'Le montant payé ne peut pas être négatif.',
    'any.required': 'Le montant versé par le client est obligatoire.'
  }),
  mode_paiement: Joi.string()
    .valid(...PAYMENT_METHODS_LIST)
    .required()
    .messages({
      'any.only': 'Le mode de règlement sélectionné n’est pas valide.',
      'any.required': 'Le mode de règlement est obligatoire.'
    }),
  reference_externe: Joi.string().trim().max(100).allow('', null),
  lignes: Joi.array()
    .items(
      Joi.object({
        meal_id: Joi.string().hex().length(24).required().messages({
          'string.hex': 'L’identifiant du plat doit être un ObjectId valide.',
          'any.required': 'L’identifiant du plat est obligatoire.'
        }),
        quantite: Joi.number().integer().min(1).required().messages({
          'number.min': 'La quantité doit être au moins égale à 1.',
          'any.required': 'La quantité est obligatoire.'
        })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'La vente doit contenir au moins un plat ou article.',
      'any.required': 'La liste des articles vendus est obligatoire.'
    })
});

export const cancelSaleSchema = Joi.object({
  motif_annulation: Joi.string().trim().min(5).max(255).required().messages({
    'string.empty': 'Le motif d’annulation est obligatoire.',
    'string.min': 'Le motif d’annulation doit comporter au moins {#limit} caractères.',
    'any.required': 'Le motif d’annulation est obligatoire pour justifier l’opération comptable.'
  })
});

