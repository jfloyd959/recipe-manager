export const generateSuggestions = (recipe, components) => {
    const suggestions = [];

    // Component-based suggestions
    const componentSuggestions = generateComponentSuggestions(recipe, components);
    suggestions.push(...componentSuggestions);

    // Naming suggestions
    const namingSuggestions = generateNamingSuggestions(recipe, components);
    suggestions.push(...namingSuggestions);

    // Tier suggestions
    const tierSuggestions = generateTierSuggestions(recipe, components);
    suggestions.push(...tierSuggestions);

    // Time suggestions
    const timeSuggestions = generateTimeSuggestions(recipe);
    suggestions.push(...timeSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
};

const generateComponentSuggestions = (recipe, components) => {
    const suggestions = [];

    if (!recipe.outputName) return suggestions;

    // Find similar components
    const matchingComponents = components.filter(comp => {
        const compName = comp.name || comp.outputName;
        return compName &&
            typeof compName === 'string' &&
            (compName.toLowerCase().includes(recipe.outputName.toLowerCase()) ||
                recipe.outputName.toLowerCase().includes(compName.toLowerCase()));
    });

    matchingComponents.forEach(comp => {
        if (comp.ingredients && comp.ingredients.length > 0) {
            suggestions.push({
                type: 'Component Match',
                confidence: 0.8,
                description: `Found similar component "${comp.name || comp.outputName}" with suggested ingredients`,
                changes: {
                    ingredients: comp.ingredients.map(ing => ({ name: ing, quantity: 1 })),
                    functionalPurpose: comp.functionalPurpose?.[0] || recipe.functionalPurpose,
                    outputTier: comp.suggestedTier || recipe.outputTier
                }
            });
        }
    });

    return suggestions;
};

const generateNamingSuggestions = (recipe, components) => {
    const suggestions = [];

    if (recipe.ingredients.length > 0 && !recipe.outputName) {
        const primaryIngredient = recipe.ingredients[0]?.name;
        if (primaryIngredient) {
            suggestions.push({
                type: 'Naming',
                confidence: 0.6,
                description: `Consider naming based on primary ingredient: "${primaryIngredient}"`,
                changes: {
                    outputName: `${primaryIngredient} Assembly`
                }
            });
        }
    }

    return suggestions;
};

const generateTierSuggestions = (recipe, components) => {
    const suggestions = [];

    if (recipe.ingredients.length > 0) {
        // Analyze ingredient complexity to suggest tier
        const hasAdvancedIngredients = recipe.ingredients.some(ing =>
            ing.name.includes('Advanced') ||
            ing.name.includes('Quantum') ||
            ing.name.includes('Crystal')
        );

        const ingredientCount = recipe.ingredients.length;
        let suggestedTier = 1;

        if (hasAdvancedIngredients) suggestedTier = Math.max(suggestedTier, 4);
        if (ingredientCount > 5) suggestedTier = Math.max(suggestedTier, 3);
        if (ingredientCount > 8) suggestedTier = Math.max(suggestedTier, 4);

        if (suggestedTier !== recipe.outputTier) {
            suggestions.push({
                type: 'Tier Adjustment',
                confidence: 0.7,
                description: `Based on ingredient complexity, consider Tier ${suggestedTier}`,
                changes: {
                    outputTier: suggestedTier
                }
            });
        }
    }

    return suggestions;
};

const generateTimeSuggestions = (recipe) => {
    const suggestions = [];

    if (recipe.ingredients.length > 0) {
        // Base time calculation
        let suggestedTime = 60; // Base 1 minute

        // Add time based on tier
        suggestedTime += (recipe.outputTier - 1) * 120; // +2 minutes per tier

        // Add time based on ingredient count
        suggestedTime += recipe.ingredients.length * 30; // +30 seconds per ingredient

        // Add time based on ingredient complexity
        const complexIngredients = recipe.ingredients.filter(ing =>
            ing.name.includes('Advanced') ||
            ing.name.includes('Quantum') ||
            ing.name.includes('Matrix')
        );
        suggestedTime += complexIngredients.length * 180; // +3 minutes per complex ingredient

        if (Math.abs(suggestedTime - recipe.constructionTime) > 60) {
            suggestions.push({
                type: 'Time Optimization',
                confidence: 0.6,
                description: `Consider adjusting construction time to ${Math.round(suggestedTime / 60)} minutes based on complexity`,
                changes: {
                    constructionTime: suggestedTime
                }
            });
        }
    }

    return suggestions;
}; 