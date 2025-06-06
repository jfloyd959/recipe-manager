export const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    const recipes = [];
    const rawResources = new Set();

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const recipe = {
            id: values[0] || `recipe-${i}`,
            outputName: values[1] || '',
            outputType: values[2] || 'COMPONENT',
            outputTier: parseInt(values[3]) || 1,
            constructionTime: parseInt(values[4]) || 60,
            planetTypes: values[5] || '',
            factions: values[6] || '',
            resourceType: values[7] || '',
            functionalPurpose: values[8] || '',
            usageCategory: values[9] || '',
            productionSteps: parseInt(values[10]) || 1,
            ingredients: [],
            isFinalized: false,
            completionStatus: 'missing'
        };

        // Parse ingredients (Ingredient1, Quantity1, Ingredient2, Quantity2, etc.)
        for (let j = 11; j < values.length; j += 2) {
            const ingredientName = values[j];
            const quantity = parseInt(values[j + 1]);

            if (ingredientName && quantity > 0) {
                recipe.ingredients.push({
                    name: ingredientName,
                    quantity: quantity
                });
            }
        }

        // Determine completion status
        if (recipe.ingredients.length > 0) {
            recipe.completionStatus = 'complete';
        } else if (recipe.outputType === 'RAW_RESOURCE') {
            recipe.completionStatus = 'complete';
            rawResources.add(recipe.outputName);
        }

        recipes.push(recipe);
    }

    return {
        recipes,
        rawResources: Array.from(rawResources)
    };
};

export const parseMarkdownComponents = (markdownText) => {
    const lines = markdownText.split('\n');
    const components = [];
    let currentCategory = '';

    for (const line of lines) {
        const trimmed = line.trim();

        // Category headers (all caps lines)
        if (trimmed && trimmed === trimmed.toUpperCase() && !trimmed.includes('=')) {
            currentCategory = trimmed;
            continue;
        }

        // Component definitions (contain '=')
        if (trimmed.includes(' = ')) {
            const [name, recipe] = trimmed.split(' = ');
            const ingredients = recipe.split(' + ').map(ing => ing.trim());

            components.push({
                name: name.trim(),
                category: currentCategory,
                description: `${currentCategory} component`,
                suggestedTier: determineTierFromIngredients(ingredients),
                ingredients: ingredients,
                functionalPurpose: [determineFunctionalPurpose(currentCategory)]
            });
        }
    }

    return components;
};

const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
};

const determineTierFromIngredients = (ingredients) => {
    // Simple heuristic: more complex ingredients suggest higher tier
    if (ingredients.some(ing => ing.includes('Quantum') || ing.includes('Reality'))) return 5;
    if (ingredients.some(ing => ing.includes('Advanced') || ing.includes('Exotic'))) return 4;
    if (ingredients.some(ing => ing.includes('Crystal') || ing.includes('Matrix'))) return 3;
    if (ingredients.length > 3) return 2;
    return 1;
};

const determineFunctionalPurpose = (category) => {
    if (category.includes('PROPULSION')) return 'PROPULSION_SYSTEM';
    if (category.includes('COOLING')) return 'THERMAL_MANAGEMENT';
    if (category.includes('COMMUNICATION')) return 'COMMUNICATION_SYSTEM';
    if (category.includes('SHIELD')) return 'DEFENSE_SYSTEM';
    if (category.includes('POWER')) return 'POWER_SYSTEM';
    if (category.includes('WEAPON')) return 'WEAPON_SYSTEM';
    return 'STRUCTURAL_COMPONENT';
}; 