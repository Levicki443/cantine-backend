/**
 * @fileoverview Constantes métier et énumérations standardisées du système Cantine Manager.
 * @module config/constants
 * Conforme aux exigences du cahier des charges officiel.
 */

/**
 * Rôles des acteurs autorisés du système.
 */
export const ROLES = Object.freeze({
  ADMIN: 'administrateur',
  MANAGER: 'gestionnaire',
  CASHIER: 'caissier',
  KITCHEN: 'cuisine',
  CLIENT: 'client'
});

/**
 * Liste des rôles sous forme de tableau immuable.
 */
export const ROLES_LIST = Object.freeze(Object.values(ROLES));

/**
 * Catégories de repas disponibles au sein de l'établissement.
 */
export const MEAL_CATEGORIES = Object.freeze({
  BREAKFAST: 'petit-déjeuner',
  LUNCH: 'déjeuner',
  DINNER: 'dîner',
  DRINKS: 'boissons',
  DESSERTS: 'desserts',
  SNACKS: 'snacks'
});

export const MEAL_CATEGORIES_LIST = Object.freeze(Object.values(MEAL_CATEGORIES));

/**
 * Statuts du cycle de vie des commandes clients.
 */
export const ORDER_STATUSES = Object.freeze({
  CREATED: 'créée',
  CONFIRMED: 'confirmée',
  PREPARING: 'en préparation',
  READY: 'prête',
  SERVED: 'servie',
  DELIVERED: 'livrée',
  CANCELLED: 'annulée'
});

export const ORDER_STATUSES_LIST = Object.freeze(Object.values(ORDER_STATUSES));

/**
 * Statuts des paiements d'une vente ou d'une commande.
 */
export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'en attente',
  PARTIAL: 'partiel',
  PAID: 'payé',
  REFUNDED: 'remboursé'
});

export const PAYMENT_STATUSES_LIST = Object.freeze(Object.values(PAYMENT_STATUSES));

/**
 * Modes de règlement financiers autorisés.
 */
export const PAYMENT_METHODS = Object.freeze({
  CASH: 'espèces',
  MOBILE_MONEY: 'Mobile Money',
  CREDIT_CARD: 'carte bancaire',
  AUTHORIZED_CREDIT: 'crédit autorisé'
});

export const PAYMENT_METHODS_LIST = Object.freeze(Object.values(PAYMENT_METHODS));

/**
 * Statuts d'une session de caisse journalière.
 */
export const CASH_SESSION_STATUSES = Object.freeze({
  OPEN: 'ouverte',
  CLOSED: 'clôturée'
});

export const CASH_SESSION_STATUSES_LIST = Object.freeze(Object.values(CASH_SESSION_STATUSES));

/**
 * Catégories officielles des dépenses d'exploitation.
 */
export const EXPENSE_CATEGORIES = Object.freeze({
  FOOD: 'nourriture',
  TRANSPORT: 'transport',
  ELECTRICITY: 'électricité',
  WATER: 'eau',
  MAINTENANCE: 'entretien',
  KITCHEN_EQUIPMENT: 'matériel de cuisine',
  OTHER: 'autres'
});

export const EXPENSE_CATEGORIES_LIST = Object.freeze(Object.values(EXPENSE_CATEGORIES));

/**
 * Types de mouvements de stock d'ingrédients.
 */
export const STOCK_MOVEMENT_TYPES = Object.freeze({
  PURCHASE_ENTRY: 'entrée approvisionnement',
  PREPARATION_EXIT: 'sortie préparation',
  SALE_EXIT: 'sortie vente',
  LOSS_EXIT: 'sortie perte',
  INVENTORY_ADJUSTMENT: 'ajustement inventaire'
});

export const STOCK_MOVEMENT_TYPES_LIST = Object.freeze(Object.values(STOCK_MOVEMENT_TYPES));

/**
 * Unités de mesure strictes pour les ingrédients.
 */
export const INGREDIENT_UNITS = Object.freeze({
  KILOGRAM: 'kilogramme',
  GRAM: 'gramme',
  LITER: 'litre',
  MILLILITER: 'millilitre',
  UNIT: 'unité',
  BAG: 'sac',
  BOX: 'carton'
});

export const INGREDIENT_UNITS_LIST = Object.freeze(Object.values(INGREDIENT_UNITS));

/**
 * Statuts de réception d'un approvisionnement fournisseur.
 */
export const PURCHASE_RECEIPT_STATUSES = Object.freeze({
  ORDERED: 'commandé',
  PARTIALLY_RECEIVED: 'partiellement reçu',
  RECEIVED: 'reçu',
  CANCELLED: 'annulé'
});

export const PURCHASE_RECEIPT_STATUSES_LIST = Object.freeze(Object.values(PURCHASE_RECEIPT_STATUSES));

/**
 * Statuts de validité d'une entité dans le système.
 */
export const ENTITY_STATUSES = Object.freeze({
  ACTIVE: 'actif',
  INACTIVE: 'inactif',
  ARCHIVED: 'archivé'
});

export const ENTITY_STATUSES_LIST = Object.freeze(Object.values(ENTITY_STATUSES));

/**
 * Catégories de clients enregistrés.
 */
export const CLIENT_CATEGORIES = Object.freeze({
  PUPIL: 'élève',
  STUDENT: 'étudiant',
  EMPLOYEE: 'employé',
  VISITOR: 'visiteur',
  OTHER: 'autre'
});

export const CLIENT_CATEGORIES_LIST = Object.freeze(Object.values(CLIENT_CATEGORIES));

/**
 * Actions pour le journal d'audit de sécurité (AuditLogs).
 */
export const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'création',
  UPDATE: 'modification',
  DELETE: 'suppression_ou_archivage',
  LOGIN: 'connexion',
  LOGOUT: 'déconnexion',
  CASH_OPEN: 'ouverture_caisse',
  CASH_CLOSE: 'clôture_caisse',
  STOCK_ADJUSTMENT: 'ajustement_stock',
  PAYMENT_REFUND: 'remboursement'
});

export const AUDIT_ACTIONS_LIST = Object.freeze(Object.values(AUDIT_ACTIONS));

/**
 * Paramètres par défaut de pagination et de sécurité.
 */
export const SYSTEM_DEFAULTS = Object.freeze({
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  BCRYPT_SALT_ROUNDS: 12
});

