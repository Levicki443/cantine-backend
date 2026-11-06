/**
 * @fileoverview Contrôleur intelligent pour la planification des menus et le calcul automatique des approvisionnements.
 * @module controllers/planningController
 * Conforme aux sections 2 et 5 du cahier des charges opérationnel.
 */

import Recipe from '../models/Recipe.js';
import Ingredient from '../models/Ingredient.js';
import Menu from '../models/Menu.js';
import Meal from '../models/Meal.js';

/**
 * Calcule automatiquement les ingrédients nécessaires pour une liste de plats et leurs portions prévues.
 * Exemple : 100 Garba + 50 Attiéké poisson -> semoule, poisson, huile, piment.
 */
export const estimateIngredients = async (req, res, next) => {
  try {
    const { elements = [] } = req.body;
    // elements: Array<{ meal_id: string, portions: number }>

    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir au moins un plat avec son nombre de portions prévues.'
      });
    }

    const mapIngredients = new Map();

    for (const item of elements) {
      const { meal_id, portions } = item;
      if (!meal_id || portions <= 0) continue;

      const recipe = await Recipe.findOne({ meal_id }).populate('ingredients.ingredient_id');
      const meal = await Meal.findById(meal_id);

      if (recipe && recipe.ingredients.length > 0) {
        const ratio = portions / (recipe.nombre_portions || 1);

        for (const ingItem of recipe.ingredients) {
          const ing = ingItem.ingredient_id;
          if (!ing) continue;

          const ingId = ing._id.toString();
          const qteRequise = Math.round(ingItem.quantite * ratio * 1000) / 1000;

          if (mapIngredients.has(ingId)) {
            const existant = mapIngredients.get(ingId);
            existant.quantite_necessaire += qteRequise;
            existant.plats_concernes.push({
              plat: meal?.nom || recipe.nom,
              portions
            });
          } else {
            mapIngredients.set(ingId, {
              ingredient_id: ing._id,
              nom: ing.nom,
              categorie: ing.categorie,
              unite: ingItem.unite || ing.unite,
              quantite_stock: ing.quantite_stock,
              seuil_minimum: ing.seuil_minimum,
              prix_reference: ing.prix_reference,
              quantite_necessaire: qteRequise,
              plats_concernes: [
                {
                  plat: meal?.nom || recipe.nom,
                  portions
                }
              ]
            });
          }
        }
      }
    }

    const listeIngredients = Array.from(mapIngredients.values()).map((item) => ({
      ...item,
      quantite_necessaire: Math.round(item.quantite_necessaire * 100) / 100
    }));

    res.status(200).json({
      success: true,
      total_ingredients: listeIngredients.length,
      ingredients: listeIngredients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Génère automatiquement la liste d'achats prévisionnelle selon la formule officielle :
 * Quantité à acheter = Besoin prévisionnel - Stock disponible utilisable.
 */
export const generatePurchaseList = async (req, res, next) => {
  try {
    const { elements = [] } = req.body;

    const mapIngredients = new Map();

    for (const item of elements) {
      const { meal_id, portions } = item;
      if (!meal_id || portions <= 0) continue;

      const recipe = await Recipe.findOne({ meal_id }).populate('ingredients.ingredient_id');

      if (recipe) {
        const ratio = portions / (recipe.nombre_portions || 1);

        for (const ingItem of recipe.ingredients) {
          const ing = ingItem.ingredient_id;
          if (!ing) continue;

          const ingId = ing._id.toString();
          const qteRequise = Math.round(ingItem.quantite * ratio * 1000) / 1000;

          if (mapIngredients.has(ingId)) {
            mapIngredients.get(ingId).besoin += qteRequise;
          } else {
            mapIngredients.set(ingId, {
              ingredient: ing,
              besoin: qteRequise
            });
          }
        }
      }
    }

    let budgetTotalEstime = 0;
    const listeAchats = [];

    for (const entry of mapIngredients.values()) {
      const { ingredient, besoin } = entry;
      const stockDispo = ingredient.quantite_stock || 0;
      const quantiteAcheter = Math.max(0, Math.round((besoin - stockDispo) * 100) / 100);
      const coutEstime = Math.round(quantiteAcheter * (ingredient.prix_reference || 0));

      budgetTotalEstime += coutEstime;

      listeAchats.push({
        ingredient_id: ingredient._id,
        nom: ingredient.nom,
        categorie: ingredient.categorie,
        unite: ingredient.unite,
        prix_unitaire: ingredient.prix_reference,
        besoin_previsionnel: Math.round(besoin * 100) / 100,
        stock_disponible: stockDispo,
        quantite_a_acheter: quantiteAcheter,
        cout_estime: coutEstime,
        achat_requis: quantiteAcheter > 0
      });
    }

    res.status(200).json({
      success: true,
      budget_total_estime: budgetTotalEstime,
      nb_articles_a_commander: listeAchats.filter((a) => a.achat_requis).length,
      liste_achats: listeAchats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplique la programmation d'une semaine de menus vers la semaine suivante.
 */
export const duplicateWeekMenu = async (req, res, next) => {
  try {
    const { date_source_debut, date_cible_debut } = req.body;

    const dSourceDebut = new Date(date_source_debut);
    const dSourceFin = new Date(dSourceDebut);
    dSourceFin.setDate(dSourceFin.getDate() + 7);

    const dCibleDebut = new Date(date_cible_debut);
    const decalageJours = Math.round((dCibleDebut - dSourceDebut) / (1000 * 60 * 60 * 24));

    const menusExistants = await Menu.find({
      date: { $gte: dSourceDebut, $lt: dSourceFin }
    });

    if (menusExistants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun menu trouvé pour la semaine source indiquée.'
      });
    }

    const menusCopies = [];
    for (const m of menusExistants) {
      const nouvelleDate = new Date(m.date);
      nouvelleDate.setDate(nouvelleDate.getDate() + decalageJours);

      const menuDuplique = await Menu.create({
        date: nouvelleDate,
        description: `Menu dupliqué depuis la semaine du ${dSourceDebut.toLocaleDateString('fr-FR')}`,
        statut: m.statut,
        articles: m.articles,
        cree_par: req.user?._id || m.cree_par
      });

      menusCopies.push(menuDuplique);
    }

    res.status(201).json({
      success: true,
      message: `${menusCopies.length} jours de menus dupliqués avec succès pour la nouvelle semaine.`,
      menus: menusCopies
    });
  } catch (error) {
    next(error);
  }
};

