export const calculateProductionSteps = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return 1;

    // Base step for the current recipe
    let steps = 1;

    // Add complexity based on ingredient count
    if (ingredients.length > 3) steps += 1;
    if (ingredients.length > 6) steps += 1;
    if (ingredients.length > 9) steps += 1;

    return Math.min(steps, 10); // Cap at 10 steps
};

export const calculateTotalResourceCost = (recipe, recipes) => {
    const costs = new Map();
    const recipeMap = new Map();

    recipes.forEach(r => recipeMap.set(r.outputName, r));

    const addCosts = (itemName, quantity = 1) => {
        const recipe = recipeMap.get(itemName);

        if (!recipe || recipe.ingredients.length === 0) {
            // Raw resource
            costs.set(itemName, (costs.get(itemName) || 0) + quantity);
            return;
        }

        recipe.ingredients.forEach(ingredient => {
            addCosts(ingredient.name, ingredient.quantity * quantity);
        });
    };

    recipe.ingredients.forEach(ingredient => {
        addCosts(ingredient.name, ingredient.quantity);
    });

    return Object.fromEntries(costs);
};

export const estimateOptimalConstructionTime = (recipe) => {
    let baseTime = 60; // 1 minute base

    // Time based on tier
    baseTime += (recipe.outputTier - 1) * 120;

    // Time based on ingredients
    baseTime += recipe.ingredients.length * 30;

    // Time based on complexity keywords
    const complexityKeywords = ['Advanced', 'Quantum', 'Matrix', 'Crystal', 'Exotic'];
    const hasComplexIngredients = recipe.ingredients.some(ing =>
        complexityKeywords.some(keyword => ing.name.includes(keyword))
    );

    if (hasComplexIngredients) {
        baseTime *= 1.5;
    }

    return Math.round(baseTime);
};

export const validateRecipeConsistency = (recipe, allRecipes) => {
    const issues = [];

    // Check for missing ingredient recipes
    const allOutputNames = new Set(allRecipes.map(r => r.outputName));
    recipe.ingredients.forEach(ingredient => {
        if (!allOutputNames.has(ingredient.name)) {
            issues.push({
                type: 'missing_recipe',
                message: `No recipe found for ingredient: ${ingredient.name}`,
                severity: 'warning'
            });
        }
    });

    // Check tier consistency
    const ingredientTiers = recipe.ingredients
        .map(ing => allRecipes.find(r => r.outputName === ing.name))
        .filter(Boolean)
        .map(r => r.outputTier);

    const maxIngredientTier = Math.max(...ingredientTiers, 0);
    if (recipe.outputTier < maxIngredientTier) {
        issues.push({
            type: 'tier_inconsistency',
            message: `Output tier (${recipe.outputTier}) is lower than ingredient tiers (max: ${maxIngredientTier})`,
            severity: 'error'
        });
    }

    // Check construction time reasonableness
    const estimatedTime = estimateOptimalConstructionTime(recipe);
    const timeDiff = Math.abs(recipe.constructionTime - estimatedTime);
    if (timeDiff > estimatedTime * 0.5) {
        issues.push({
            type: 'time_inconsistency',
            message: `Construction time seems unusual. Estimated: ${Math.round(estimatedTime / 60)} minutes`,
            severity: 'warning'
        });
    }

    return issues;
}; 