/**
 * @fileoverview Modèle Mongoose pour la programmation hebdomadaire et les horaires de service.
 * @module models/WeeklyPlanning
 * Synchronise l'ardoise des étudiants avec les modifications du BackOffice.
 */

import mongoose from 'mongoose';

const jourPlanningSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // 'lundi', 'mardi', etc.
    label: { type: String, required: true },
    plat: { type: String, default: '' },
    dessert: { type: String, default: '' },
    statut: { type: String, default: 'Service garanti' }
  },
  { _id: false }
);

const weeklyPlanningSchema = new mongoose.Schema(
  {
    horaires: {
      statut_service: { type: String, default: 'Ouvert' },
      dejeuner: { type: String, default: '11h30 – 14h30' },
      diner: { type: String, default: '18h30 – 20h30' },
      petit_dejeuner: { type: String, default: '07h00 – 08h30' }
    },
    suggestion_chef: {
      nom: { type: String, default: 'Formule Gourmande & Équilibrée de la Cantine' },
      description: {
        type: String,
        default: 'Cuisinée chaque matin avec des produits frais du marché : viande tendre, poisson braisé ou sauce mijotée.'
      },
      tarif: { type: Number, default: 1500 }
    },
    jours: {
      type: [jourPlanningSchema],
      default: [
        { id: 'lundi', label: 'Lundi', plat: 'Riz blanc & Sauce Graine au poisson fumé', dessert: 'Jus de Bissap glacé', statut: 'Service garanti' },
        { id: 'mardi', label: 'Mardi', plat: 'Attiéké & Tilapia braisé sauce tomate-oignon', dessert: 'Coupe de fruits frais', statut: 'Service garanti' },
        { id: 'mercredi', label: 'Mercredi', plat: 'Garba authentique (Semoule de manioc & Thon frit)', dessert: 'Gnamakoudji frais', statut: 'Spécialité Ivoirienne' },
        { id: 'jeudi', label: 'Jeudi', plat: 'Placali & Sauce Kopê avec viande de bœuf', dessert: 'Banane douce', statut: 'Service garanti' },
        { id: 'vendredi', label: 'Vendredi', plat: 'Spaghetti sauté gourmand aux légumes & boulettes', dessert: 'Jus de Tamarin', statut: 'Service garanti' },
        { id: 'samedi', label: 'Samedi', plat: 'Menu Spécial Découverte du Chef', dessert: 'Salade de mangue', statut: 'Menu d’exception' }
      ]
    }
  },
  {
    timestamps: true
  }
);

const WeeklyPlanning = mongoose.model('WeeklyPlanning', weeklyPlanningSchema);

export default WeeklyPlanning;

