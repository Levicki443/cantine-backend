/**
 * @fileoverview Modèle Mongoose pour les utilisateurs du système Cantine Manager.
 * @module models/User
 * Conforme à la section 7 et aux exigences de sécurité de niveau bancaire.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  ROLES,
  ROLES_LIST,
  ENTITY_STATUSES,
  ENTITY_STATUSES_LIST,
  SYSTEM_DEFAULTS
} from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom de famille est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit comporter au moins 2 caractères.'],
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères.']
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est obligatoire.'],
      trim: true,
      minlength: [2, 'Le prénom doit comporter au moins 2 caractères.'],
      maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères.']
    },
    email: {
      type: String,
      required: [true, "L'adresse courriel est obligatoire."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Veuillez fournir une adresse courriel valide.'
      ]
    },
    telephone: {
      type: String,
      trim: true,
      default: null,
      maxlength: [20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères.']
    },
    mot_de_passe_hash: {
      type: String,
      required: [true, 'Le mot de passe haché est obligatoire.'],
      select: false // Sécurité audit bancaire : exclu par défaut des requêtes
    },
    role: {
      type: String,
      enum: {
        values: ROLES_LIST,
        message: 'Le rôle spécifié ({VALUE}) n’est pas valide.'
      },
      default: ROLES.CLIENT,
      index: true
    },
    statut: {
      type: String,
      enum: {
        values: ENTITY_STATUSES_LIST,
        message: 'Le statut spécifié ({VALUE}) n’est pas valide.'
      },
      default: ENTITY_STATUSES.ACTIVE,
      index: true
    },
    derniere_connexion: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'date_creation', updatedAt: 'date_mise_a_jour' },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.mot_de_passe_hash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hachage automatique du mot de passe avant chaque enregistrement si modifié
userSchema.pre('save', async function (next) {
  if (!this.isModified('mot_de_passe_hash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(SYSTEM_DEFAULTS.BCRYPT_SALT_ROUNDS);
    this.mot_de_passe_hash = await bcrypt.hash(this.mot_de_passe_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare un mot de passe en clair avec le hash stocké.
 * @param {string} candidatePassword Mot de passe à vérifier.
 * @returns {Promise<boolean>} Vrai si concordance, faux sinon.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.mot_de_passe_hash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.mot_de_passe_hash);
};

const User = mongoose.model('User', userSchema);

export default User;

