/**
 * @fileoverview Application principale et serveur HTTP pour Cantine Manager.
 * @module app
 * Configure Express, la sécurité bancaire, les middlewares et la résilience système.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB, isDatabaseConnected } from './config/db.js';

// Configuration absolue et résiliente des variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Importation de tous les routeurs modulaires de l'API REST
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import ingredientRoutes from './routes/ingredientRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import cashSessionRoutes from './routes/cashSessionRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import planningRoutes from './routes/planningRoutes.js';
import hygieneRoutes from './routes/hygieneRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Déclaration de confiance envers le reverse-proxy local (Vite) et d'infrastructure
app.set('trust proxy', 1);

// 1. Couche de sécurité HTTP (Helmet)
app.use(helmet());

// 2. Gestion des requêtes multi-origines (CORS) avec support ALLOW_ORIGINS / ALLOWED_ORIGINS
const originsEnv = process.env.ALLOW_ORIGINS || process.env.ALLOWED_ORIGINS;
const allowedOrigins = originsEnv
  ? originsEnv.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const isLocalDevOrigin = (origin) => {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origine (outils locaux ou tâches système)
      if (!origin) {
        return callback(null, true);
      }
      // Tolérance locale dynamique en développement (ports Vite 5173, 5174, etc.)
      if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      // Whitelist stricte déclarée (obligatoire en production)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Accès interdit par la politique de sécurité CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Limitation du débit (Rate Limiting anti-brute force et anti-DDoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requêtes par fenêtre et par adresse IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Nombre excessif de requêtes. Veuillez réessayer dans quelques minutes.'
  }
});

app.use('/api/', apiLimiter);

// 4. Analyse des corps de requêtes (Body Parsers sécurisés avec restriction de taille)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Point de contrôle de santé du système (Health Check)
app.get('/api/health', (req, res) => {
  const isDbUp = isDatabaseConnected();
  res.status(isDbUp ? 200 : 503).json({
    success: true,
    status: isDbUp ? 'en service' : 'dégradé',
    date: new Date().toISOString(),
    uptimeSecondes: Math.floor(process.uptime()),
    baseDeDonnees: isDbUp ? 'connectée' : 'déconnectée'
  });
});

// 6. Montage de l'ensemble des modules de routes applicatives
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/cash-sessions', cashSessionRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/hygiene', hygieneRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 7. Gestion des routes non trouvées (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ressource introuvable : ${req.method} ${req.originalUrl}`
  });
});

// 8. Gestionnaire d'erreurs centralisé (Zéro fuite d'informations sensibles en production)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Erreur Système] ${err.name || 'Error'} : ${err.message}`);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Une erreur interne est survenue sur le serveur.',
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// 9. Démarrage du serveur et arrêt gracieux
const PORT = process.env.PORT || 5000;
let serverInstance = null;

const startServer = async () => {
  try {
    // Connexion préalable à MongoDB
    await connectDB();

    serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Serveur] Cantine Manager opérationnel sur le port ${PORT} (mode : ${process.env.NODE_ENV || 'development'}).`);
    });
  } catch (error) {
    console.error(`[Serveur] Échec du démarrage du serveur : ${error.message}`);
    process.exit(1);
  }
};

// Arrêt gracieux (Graceful Shutdown)
const handleGracefulShutdown = async (signal) => {
  console.log(`[Serveur] Signal ${signal} reçu. Fermeture ordonnée en cours...`);

  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('[Serveur] Serveur HTTP fermé.');
      await disconnectDB();
      console.log('[Serveur] Arrêt complet et sécurisé terminé.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Démarrer automatiquement le serveur uniquement s'il n'est pas importé dans un cadre de test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
