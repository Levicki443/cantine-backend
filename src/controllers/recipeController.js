/**
 * @fileoverview Contrôleur pour la gestion des recettes, coûts de revient et simulation de rentabilité.
 * @module controllers/recipeController
 * Conforme à la section 4 du cahier des charges opérationnel.
 */

import Recipe from '../models/Recipe.js';
import Meal from '../models/Meal.js';
import Ingredient from '../models/Ingredient.js';

/**
 * Récupère la liste complète des recettes avec détails des ingrédients et repas.
 */
export const getRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.find()
      .populate('meal_id', 'nom categorie prix quantite_disponible disponible')
      .populate('ingredients.ingredient_id', 'nom unite prix_reference quantite_stock seuil_minimum')
      .sort({ date_creation: -1 });

    res.status(200).json({
      success: true,
      total: recipes.length,
      recipes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consulte les détails d'une recette par son identifiant ou identifiant repas.
 */
export const getRecipeById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('meal_id')
      .populate('ingredients.ingredient_id');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Fiche technique de recette introuvable.'
      });
    }

    res.status(200).json({
      success: true,
      recipe
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enregistre ou met à jour la fiche technique d'un plat.
 */
export const upsertRecipe = async (req, res, next) => {
  try {
    const {
      meal_id,
      nom,
      nombre_portions = 1,
      instructions = '',
      ingredients = []
    } = req.body;

    // Calcul du coût estimé des ingrédients
    let coutTotalIngredients = 0;
    for (const item of ingredients) {
      const ing = await Ingredient.findById(item.ingredient_id);
      if (ing) {
        coutTotalIngredients += (ing.prix_reference || 0) * (item.quantite || 0);
      }
    }

    const coutEstimePortion =
      nombre_portions > 0 ? Math.round((coutTotalIngredients / nombre_portions) * 100) / 100 : 0;

    const recipe = await Recipe.findOneAndUpdate(
      { meal_id },
      {
        meal_id,
        nom,
        nombre_portions,
        instructions,
        ingredients,
        cout_estime_portion: coutEstimePortion
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Recette enregistrée avec succès.',
      recipe
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calcule la rentabilité exhaustive d'une portion (ingrédients + gaz/charbon/eau/emballage/main-d'œuvre).
 * Formules conformes à la section 4 :
 * - Coût total recette = Ingrédients + Frais directs + Part frais indirects
 * - Coût de revient par portion = Coût total ÷ Portions obtenues
 * - Bénéfice brut par portion = Prix de vente − Coût de revient
 * - Marge sur prix de vente = (Bénéfice brut ÷ Prix de vente) × 100
 */
export const calculateProfitability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      frais_gaz_charbon = 0,
      frais_eau_electricite = 0,
      frais_emballage = 0,
      frais_main_oeuvre = 0,
      frais_autres = 0,
      prix_vente_personnalise = null
    } = req.body;

    const recipe = await Recipe.findById(id)
      .populate('meal_id')
      .populate('ingredients.ingredient_id');

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recette introuvable.'
      });
    }

    // 1. Coût réel des ingrédients
    let coutIngredients = 0;
    const detailIngredients = [];

    for (const item of recipe.ingredients) {
      const ing = item.ingredient_id;
      const prixUnitaire = ing?.prix_reference || 0;
      const coutItem = Math.round(prixUnitaire * item.quantite * 100) / 100;
      coutIngredients += coutItem;

      detailIngredients.push({
        nom: ing?.nom || 'Ingrédient',
        quantite: item.quantite,
        unite: item.unite,
        prix_unitaire: prixUnitaire,
        cout_total: coutItem
      });
    }

    // 2. Frais d'exploitation associés
    const totalFraisAnnexes =
      Number(frais_gaz_charbon) +
      Number(frais_eau_electricite) +
      Number(frais_emballage) +
      Number(frais_main_oeuvre) +
      Number(frais_autres);

    // 3. Coût total de la préparation et coût unitaire
    const coutTotalPreparation = coutIngredients + totalFraisAnnexes;
    const portions = recipe.nombre_portions || 1;
    const coutRevientParPortion = Math.round((coutTotalPreparation / portions) * 100) / 100;

    // 4. Prix de vente et marge brute
    const prixVente = prix_vente_personnalise !== null
      ? Number(prix_vente_personnalise)
      : (recipe.meal_id?.prix || 0);

    const beneficeBrut = Math.round((prixVente - coutRevientParPortion) * 100) / 100;
    const margePourcentage =
      prixVente > 0 ? Math.round(((beneficeBrut / prixVente) * 100) * 100) / 100 : 0;

    // 5. Simulations de prix selon marges cibles (25%, 35%, 50%)
    const simulerPrix = (margeCible) => {
      if (margeCible >= 100) return 0;
      return Math.ceil(coutRevientParPortion / (1 - margeCible / 100) / 50) * 50; // Arrondi aux 50 FCFA
    };

    res.status(200).json({
      success: true,
      recette: {
        id: recipe._id,
        nom: recipe.nom,
        portions,
        plat: recipe.meal_id?.nom
      },
      couts: {
        total_ingredients: Math.round(coutIngredients * 100) / 100,
        total_frais_annexes: totalFraisAnnexes,
        cout_total_preparation: Math.round(coutTotalPreparation * 100) / 100,
        cout_revient_par_portion: coutRevientParPortion,
        detail_ingredients: detailIngredients
      },
      rentabilite: {
        prix_vente: prixVente,
        benefice_brut_portion: beneficeBrut,
        marge_brute_pourcentage: margePourcentage,
        rentable: beneficeBrut > 0
      },
      simulateur_prix: {
        pour_marge_25: simulerPrix(25),
        pour_marge_35: simulerPrix(35),
        pour_marge_50: simulerPrix(50)
      }
    });
  } catch (error) {
    next(error);
  }
};

