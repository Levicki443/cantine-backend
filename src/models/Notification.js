/**
 * @fileoverview Modèle Mongoose pour le centre de notifications système et alertes de cantine.
 * @module models/Notification
 * Conforme aux sections 5.18 et 7 du cahier des charges officiel.
 */

import mongoose from 'mongoose';
import { ROLES_LIST } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null si notification collective destinée à un rôle
      index: true
    },
    role_cible: {
      type: String,
      enum: {
        values: [...ROLES_LIST, null],
        message: 'Le rôle cible ({VALUE}) n’est pas valide.'
      },
      default: null,
      index: true
    },
    titre: {
      type: String,
      required: [true, 'Le titre de la notification est obligatoire.'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères.']
    },
    message: {
      type: String,
      required: [true, 'Le message de la notification est obligatoire.'],
      trim: true,
      maxlength: [500, 'Le message ne peut pas dépasser 500 caractères.']
    },
    type: {
      type: String,
      enum: [
        'alerte_stock',
        'peremption',
        'nouvelle_commande',
        'commande_prete',
        'paiement',
        'rupture',
        'cloture_caisse',
        'depense',
        'systeme'
      ],
      default: 'systeme',
      index: true
    },
    lu: {
      type: Boolean,
      default: false,
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
 * Diffuse une notification de manière asynchrone sans bloquer l'appelant.
 * @param {Object} params Paramètres de la notification.
 */
notificationSchema.statics.emettre = async function ({
  utilisateurId = null,
  roleCible = null,
  titre,
  message,
  type = 'systeme'
}) {
  try {
    return await this.create({
      utilisateur_id: utilisateurId,
      role_cible: roleCible,
      titre,
      message,
      type,
      date: new Date()
    });
  } catch (error) {
    console.error(`[Notification] Échec de l'émission : ${error.message}`);
    return null;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

