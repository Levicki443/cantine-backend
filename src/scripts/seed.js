/**
 * @fileoverview Script d'initialisation et de peuplement de la base de données.
 * @module scripts/seed
 * Crée les comptes de démonstration par rôle, les clients, les ingrédients et les repas.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Meal from '../models/Meal.js';
import Ingredient from '../models/Ingredient.js';
import {
  ROLES,
  ENTITY_STATUSES,
  CLIENT_CATEGORIES,
  MEAL_CATEGORIES,
  INGREDIENT_UNITS
} from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[Erreur Seed] La variable MONGODB_URI est introuvable.');
  process.exit(1);
}

/**
 * Initialise le peuplement des données système.
 */
const seedDatabase = async () => {
  try {
    console.log('[Seed] Connexion à MongoDB Atlas en cours...');
    await mongoose.connect(MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000
    });
    console.log('[Seed] Connecté avec succès au cluster.');

    // 1. Initialisation des utilisateurs par rôle
    const usersData = [
      {
        nom: 'Kouassi',
        prenom: 'Alexandre',
        email: 'admin@cantine.fr',
        telephone: '+225 0707070707',
        mot_de_passe_hash: 'Admin1234!',
        role: ROLES.ADMIN,
        statut: ENTITY_STATUSES.ACTIVE
      },
      {
        nom: 'Traoré',
        prenom: 'Aminata',
        email: 'gestionnaire@cantine.fr',
        telephone: '+225 0505050505',
        mot_de_passe_hash: 'Gestionnaire1234!',
        role: ROLES.MANAGER,
        statut: ENTITY_STATUSES.ACTIVE
      },
      {
        nom: 'Bamba',
        prenom: 'Souleymane',
        email: 'caisse@cantine.fr',
        telephone: '+225 0101010101',
        mot_de_passe_hash: 'Caisse1234!',
        role: ROLES.CASHIER,
        statut: ENTITY_STATUSES.ACTIVE
      },
      {
        nom: 'Koné',
        prenom: 'Fatou',
        email: 'client@cantine.fr',
        telephone: '+225 0808080808',
        mot_de_passe_hash: 'Client1234!',
        role: ROLES.CLIENT,
        statut: ENTITY_STATUSES.ACTIVE
      }
    ];

    console.log('[Seed] Création des comptes utilisateurs...');
    for (const u of usersData) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        console.log(`  ✓ Utilisateur créé : ${u.email} (${u.role})`);
      } else {
        console.log(`  ℹ Utilisateur existant : ${u.email} (${u.role})`);
      }
    }

    // 2. Fiche client correspondante pour Koné Fatou
    const existingClient = await Client.findOne({ telephone: '+225 0808080808' });
    if (!existingClient) {
      await Client.create({
        nom: 'Koné',
        prenom: 'Fatou',
        telephone: '+225 0808080808',
        adresse: 'Résidence Universitaire - Bâtiment C, Chambre 104',
        categorie: CLIENT_CATEGORIES.STUDENT,
        solde: 25000,
        credit_autorise: true,
        plafond_credit: 10000,
        statut: ENTITY_STATUSES.ACTIVE
      });
      console.log('  ✓ Client portefeuille créé : Koné Fatou (Solde: 25 000 FCFA)');
    }

    // 3. Ingrédients alimentaires de base
    const ingredientsData = [
      {
        nom: 'Riz Blanc Supérieur',
        categorie: 'Céréales',
        unite: INGREDIENT_UNITS.BAG,
        quantite_stock: 20,
        seuil_minimum: 5,
        prix_reference: 18500
      },
      {
        nom: 'Banane Plantain',
        categorie: 'Féculents',
        unite: INGREDIENT_UNITS.BOX,
        quantite_stock: 15,
        seuil_minimum: 4,
        prix_reference: 12000
      },
      {
        nom: 'Poulet Fermier Découpé',
        categorie: 'Viandes & Volailles',
        unite: INGREDIENT_UNITS.KILOGRAM,
        quantite_stock: 45,
        seuil_minimum: 10,
        prix_reference: 2800
      },
      {
        nom: 'Huile Végétale 5L',
        categorie: 'Épicerie',
        unite: INGREDIENT_UNITS.UNIT,
        quantite_stock: 10,
        seuil_minimum: 3,
        prix_reference: 8500
      },
      {
        nom: 'Fleurs d’Hibiscus Séchées (Bissap)',
        categorie: 'Boissons & Infusions',
        unite: INGREDIENT_UNITS.KILOGRAM,
        quantite_stock: 8,
        seuil_minimum: 2,
        prix_reference: 2500
      }
    ];

    console.log('[Seed] Création des ingrédients de stock...');
    for (const ing of ingredientsData) {
      const existing = await Ingredient.findOne({ nom: ing.nom });
      if (!existing) {
        await Ingredient.create(ing);
        console.log(`  ✓ Ingrédient créé : ${ing.nom} (Stock: ${ing.quantite_stock} ${ing.unite})`);
      }
    }

    // 4. Repas et articles au menu
    const mealsData = [
      {
        nom: 'Alloco & Poulet Braisé',
        description: 'Bananes plantains frites dorées servies avec quart de poulet braisé aux épices douces et sauce oignon pimentée.',
        categorie: MEAL_CATEGORIES.LUNCH,
        prix: 2500,
        quantite_disponible: 35,
        disponible: true
      },
      {
        nom: 'Riz au Gras Spécial Chef',
        description: 'Riz long grain cuisiné dans un bouillon riche aux légumes frais, servi avec viande de bœuf fondante.',
        categorie: MEAL_CATEGORIES.LUNCH,
        prix: 1800,
        quantite_disponible: 25,
        disponible: true
      },
      {
        nom: 'Attiéké & Poisson Tilapia Grillé',
        description: 'Semoule de manioc cuite à la vapeur, accompagnée de tilapia entier braisé et d’une garniture tomates-oignons.',
        categorie: MEAL_CATEGORIES.LUNCH,
        prix: 2200,
        quantite_disponible: 20,
        disponible: true
      },
      {
        nom: 'Petit-Déjeuner Continental',
        description: 'Deux viennoiseries au beurre, café au lait chaud ou thé, et un jus d’orange frais.',
        categorie: MEAL_CATEGORIES.BREAKFAST,
        prix: 1200,
        quantite_disponible: 15,
        disponible: true
      },
      {
        nom: 'Jus Artisanal de Bissap Glacé (50cl)',
        description: 'Boisson rafraîchissante traditionnelle à base de fleurs d’hibiscus, parfumée à la menthe et à la vanille.',
        categorie: MEAL_CATEGORIES.DRINKS,
        prix: 600,
        quantite_disponible: 50,
        disponible: true
      },
      {
        nom: 'Coupe de Fruits Frais Tropicaux',
        description: 'Mélange d’ananas pain de sucre, mangue mûre et papaye fraîche.',
        categorie: MEAL_CATEGORIES.DESSERTS,
        prix: 800,
        quantite_disponible: 18,
        disponible: true
      }
    ];

    console.log('[Seed] Création des plats et menus...');
    for (const meal of mealsData) {
      const existing = await Meal.findOne({ nom: meal.nom });
      if (!existing) {
        await Meal.create(meal);
        console.log(`  ✓ Repas créé : ${meal.nom} (${meal.prix} FCFA)`);
      }
    }

    console.log('\n======================================================');
    console.log('✅ Initialisation terminée avec succès !');
    console.log('Comptes de test opérationnels :');
    console.log('  - Administrateur : admin@cantine.fr / Admin1234!');
    console.log('  - Gestionnaire   : gestionnaire@cantine.fr / Gestionnaire1234!');
    console.log('  - Caissier       : caisse@cantine.fr / Caisse1234!');
    console.log('  - Client         : client@cantine.fr / Client1234!');
    console.log('======================================================\n');
  } catch (error) {
    console.error(`[Seed Erreur] : ${error.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Déconnecté de MongoDB. Terminé.');
    process.exit(0);
  }
};

seedDatabase();

