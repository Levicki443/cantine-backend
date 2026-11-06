/**
 * @fileoverview Gestionnaire de connexion à la base de données MongoDB.
 * @module config/db
 * Intègre la résilience, la surveillance des événements et l'arrêt gracieux.
 */

import mongoose from 'mongoose';

/**
 * Options de configuration de la connexion Mongoose.
 */
const MONGOOSE_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Forcer l'IPv4 pour éviter les délais DNS indésirables
};

/**
 * Initialise la connexion à MongoDB.
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cantine_manager';

  try {
    const conn = await mongoose.connect(uri, MONGOOSE_OPTIONS);
    console.log(`[Base de données] MongoDB connecté avec succès : ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Base de données] Erreur critique lors de la connexion MongoDB : ${error.message}`);
    // En environnement de production, une défaillance de la base doit interrompre le démarrage du service
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Déconnecte proprement Mongoose.
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('[Base de données] Connexion MongoDB fermée proprement.');
  } catch (error) {
    console.error(`[Base de données] Erreur lors de la fermeture de MongoDB : ${error.message}`);
  }
};

/**
 * Vérifie l'état actuel de la connexion MongoDB.
 * @returns {boolean} Vrai si connecté, faux sinon.
 */
export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Surveillance des événements du cycle de vie Mongoose
mongoose.connection.on('connected', () => {
  console.log('[Base de données] Événement : Connexion MongoDB établie.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Base de données] Événement : Erreur de connexion MongoDB : ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Base de données] Événement : Connexion MongoDB interrompue.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Base de données] Événement : Connexion MongoDB rétablie.');
});

