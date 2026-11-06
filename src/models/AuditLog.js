/**
 * @fileoverview Modèle Mongoose pour le journal d'audit de sécurité (AuditLogs).
 * @module models/AuditLog
 * Assure la traçabilité complète de toutes les opérations sensibles du système.
 */

import mongoose from 'mongoose';
import { AUDIT_ACTIONS_LIST } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    utilisateur_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    action: {
      type: String,
      required: [true, "L'action d'audit est obligatoire."],
      enum: {
        values: AUDIT_ACTIONS_LIST,
        message: "L'action ({VALUE}) n'est pas reconnue."
      },
      index: true
    },
    entite: {
      type: String,
      required: [true, "L'entité ciblée est obligatoire."],
      trim: true,
      index: true
    },
    reference: {
      type: String,
      default: null,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: null,
      trim: true
    },
    user_agent: {
      type: String,
      default: null,
      trim: true
    },
    statut: {
      type: String,
      enum: ['succès', 'échec'],
      default: 'succès'
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
 * Enregistre une entrée d'audit de manière asynchrone et sécurisée.
 * Ne bloque pas le flux principal en cas d'erreur de journalisation.
 * @param {Object} params Paramètres de l'événement d'audit.
 * @returns {Promise<void>}
 */
auditLogSchema.statics.record = async function ({
  utilisateurId = null,
  action,
  entite,
  reference = null,
  details = {},
  ip = null,
  userAgent = null,
  statut = 'succès'
}) {
  try {
    await this.create({
      utilisateur_id: utilisateurId,
      action,
      entite,
      reference,
      details,
      ip,
      user_agent: userAgent,
      statut
    });
  } catch (error) {
    console.error(`[Audit] Échec de l'enregistrement de l'action ${action} sur ${entite} : ${error.message}`);
  }
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

