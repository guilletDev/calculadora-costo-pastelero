import { BaseIngredient, Recipe } from './types';

const INGREDIENTS_KEY = 'recipe-calculator-ingredients';
const RECIPES_KEY = 'recipe-calculator-recipes';

export const storage = {
  // Base Ingredients
  getIngredients: (): BaseIngredient[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(INGREDIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveIngredients: (ingredients: BaseIngredient[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
  },
  
  // Recipes
  getRecipes: (): Recipe[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveRecipes: (recipes: Recipe[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
  },
};
