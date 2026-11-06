/**
 * @fileoverview Schémas de validation Joi pour les opérations d'authentification.
 * @module validators/authValidator
 * Assure la sanitisation stricte et la conformité des données entrantes.
 */

import Joi from 'joi';
import { ROLES_LIST, ENTITY_STATUSES_LIST } from '../config/constants.js';

/**
 * Schéma de création d'un utilisateur (réservé aux administrateurs ou à l'initialisation).
 */
export const registerSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Le nom ne peut pas être vide.',
    'string.min': 'Le nom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le nom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le nom est obligatoire.'
  }),
  prenom: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Le prénom ne peut pas être vide.',
    'string.min': 'Le prénom doit comporter au moins {#limit} caractères.',
    'string.max': 'Le prénom ne peut pas dépasser {#limit} caractères.',
    'any.required': 'Le prénom est obligatoire.'
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': "L'adresse courriel ne peut pas être vide.",
    'string.email': "Le format de l'adresse courriel est invalide.",
    'any.required': "L'adresse courriel est obligatoire."
  }),
  telephone: Joi.string().trim().max(20).allow('', null).messages({
    'string.max': 'Le numéro de téléphone ne peut pas dépasser {#limit} caractères.'
  }),
  mot_de_passe: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/)
    .required()
    .messages({
      'string.empty': 'Le mot de passe ne peut pas être vide.',
      'string.min': 'Le mot de passe doit comporter au moins {#limit} caractères.',
      'string.max': 'Le mot de passe ne peut pas dépasser {#limit} caractères.',
      'string.pattern.base':
        'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial.',
      'any.required': 'Le mot de passe est obligatoire.'
    }),
  role: Joi.string()
    .valid(...ROLES_LIST)
    .messages({
      'any.only': 'Le rôle sélectionné n’est pas valide.'
    }),
  statut: Joi.string()
    .valid(...ENTITY_STATUSES_LIST)
    .messages({
      'any.only': 'Le statut sélectionné n’est pas valide.'
    })
});

/**
 * Schéma de connexion à l'application.
 */
export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': "L'adresse courriel ne peut pas être vide.",
    'string.email': "Le format de l'adresse courriel est invalide.",
    'any.required': "L'adresse courriel est obligatoire."
  }),
  mot_de_passe: Joi.string().required().messages({
    'string.empty': 'Le mot de passe ne peut pas être vide.',
    'any.required': 'Le mot de passe est obligatoire.'
  })
});

/**
 * Schéma de modification du mot de passe.
 */
export const changePasswordSchema = Joi.object({
  ancien_mot_de_passe: Joi.string().required().messages({
    'string.empty': "L'ancien mot de passe est obligatoire.",
    'any.required': "L'ancien mot de passe est obligatoire."
  }),
  nouveau_mot_de_passe: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/)
    .required()
    .messages({
      'string.empty': 'Le nouveau mot de passe ne peut pas être vide.',
      'string.min': 'Le nouveau mot de passe doit comporter au moins {#limit} caractères.',
      'string.pattern.base':
        'Le nouveau mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial.',
      'any.required': 'Le nouveau mot de passe est obligatoire.'
    })
});

/**
 * Middleware d'interception et de validation Joi.
 * @param {Joi.ObjectSchema} schema Schéma de validation à appliquer.
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true // Whitelisting strict : élimine tout champ inattendu (anti-pollution)
    });

    if (error) {
      const details = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Données transmises invalides.',
        erreurs: details
      });
    }

    req.body = value;
    next();
  };
};

