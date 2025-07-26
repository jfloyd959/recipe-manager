export const loadCSVFromPublic = async () => {
    try {
        // console.log('Attempting to load CSV from /finalComponentList.csv');
        const response = await fetch('/finalComponentList.csv');

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('CSV loaded, first 200 characters:', csvText.substring(0, 200));

        const parsedData = parseCSVData(csvText);
        console.log('Parsed data:', {
            recipes: parsedData.recipes.length,
            finals: parsedData.finals.length,
            ingredients: parsedData.ingredients.length,
            components: parsedData.components.length,
            rawResources: parsedData.rawResources.length
        });

        return parsedData;
    } catch (error) {
        console.error('Error loading CSV from public folder:', error);
        return null;
    }
};

const parseCSVData = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    console.log('CSV Headers:', headers);

    const recipes = [];
    const components = [];
    const ingredients = [];
    const finals = [];
    const rawResources = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const item = {};

        headers.forEach((header, index) => {
            item[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
        });

        if (!item.OutputName || !item.OutputType) continue;

        const outputType = item.OutputType?.trim().toUpperCase();
        const outputName = item.OutputName?.trim();
        const extractedIngredients = extractIngredients(item);

        // Determine completion status based on ingredients
        let completionStatus = 'missing';
        if (extractedIngredients.length > 0) {
            // Check if all ingredients have quantities > 0
            const hasValidQuantities = extractedIngredients.every(ing => ing.quantity > 0);
            completionStatus = hasValidQuantities ? 'complete' : 'partial';
        }

        // Extract subtype by cleaning the name
        let subtype = outputName;
        // Remove size indicators
        subtype = subtype.replace(/\b(XXS|XS|S|M|L|XL|XXL|CAP|CMD|CLASS\d+|TTN)\b/gi, '').trim();
        // Remove tier indicators
        subtype = subtype.replace(/\bT[1-5]\b/gi, '').trim();
        // Clean up extra spaces
        subtype = subtype.replace(/\s+/g, ' ').trim();

        // console.log(`Processing item: ${outputName}, Type: ${outputType}, Ingredients: ${extractedIngredients.length}, Status: ${completionStatus}`);

        // Check if this resource needs usage increase from CSV
        const needsUsageIncrease = (item.NEEDS_USAGE_INCREASE || '').toUpperCase() === 'TRUE';

        // Create the base recipe object
        const baseRecipe = {
            id: item.OutputID || `recipe_${Date.now()}_${i}`,
            outputName: item.OutputName,
            outputType: outputType,
            outputTier: parseInt(item.OutputTier) || 1,
            constructionTime: parseInt(item.ConstructionTime) || 0,
            planetTypes: item.PlanetTypes || '',
            factions: item.Factions || 'MUD;ONI;USTUR',
            resourceType: item.ResourceType || 'COMPONENT',
            functionalPurpose: item.FunctionalPurpose || 'STRUCTURAL',
            usageCategory: item['Usage Category'] || outputType,
            ingredients: extractedIngredients,
            isFinalized: completionStatus === 'complete',
            completionStatus: completionStatus,
            category: outputType,
            subtype: subtype,
            needsUsageIncrease: needsUsageIncrease,
            // ADD MISSING BUILDINGRESOURCE PROPERTY
            BuildingResource: item.BuildingResource || 'FALSE'
        };

        // Add to recipes array (for Recipe Editor)
        recipes.push(baseRecipe);

        // Categorize based on output type and production chain position
        if (['SHIP_COMPONENTS', 'SHIP_MODULES', 'SHIP_WEAPONS', 'COUNTERMEASURES', 'MISSILES', 'HAB_ASSETS', 'BOMBS'].includes(outputType)) {
            // FINALS - End products of the production chain
            const categoryMap = {
                'SHIP_COMPONENTS': 'Ship Components',
                'SHIP_MODULES': 'Ship Modules',
                'SHIP_WEAPONS': 'Ship Weapons',
                'COUNTERMEASURES': 'Countermeasures',
                'MISSILES': 'Missiles',
                'HAB_ASSETS': 'Habitat Assets',
                'BOMBS': 'Bombs'
            };

            finals.push({
                ...baseRecipe,
                type: 'Final Product',
                category: categoryMap[outputType] || outputType
            });
        }
        else if (outputType === 'INGREDIENT') {
            // INGREDIENTS - Intermediate products that go into finals
            ingredients.push({
                ...baseRecipe,
                type: 'Ingredient',
                category: 'Ingredient'
            });
        }
        else if (outputType === 'COMPONENT') {
            // COMPONENTS - Basic components that go into ingredients
            components.push({
                ...baseRecipe,
                type: 'Component',
                category: 'Component'
            });
        }
        else if (outputType === 'BASIC RESOURCE' || outputType === 'Basic Resource') {
            // RAW RESOURCES - Base materials (handle both "BASIC RESOURCE" and "Basic Resource")
            rawResources.push({
                id: item.OutputID || `resource_${Date.now()}_${i}`,
                name: item.OutputName,
                type: 'Raw Resource',
                tier: parseInt(item.OutputTier) || 1,
                extractionRate: parseFloat(item.ExtractionRate) || 0,
                planetTypes: item.PlanetTypes?.split(';').filter(p => p.trim()) || [],
                factions: item.Factions?.split(';').filter(f => f.trim()) || [],
                isFinalized: true,
                category: 'Raw Resource',
                subtype: subtype,
                functionalPurpose: item.FunctionalPurpose
            });
        }
        else if (outputType === 'R4') {
            // R4 - Survival components, treat as basic components
            components.push({
                ...baseRecipe,
                type: 'Survival Component',
                category: 'Survival Component'
            });
        }
        else {
            //console.warn(`Unknown OutputType: ${outputType} for item: ${outputName}`);
        }
    }

    console.log('Final parsed counts:', {
        recipes: recipes.length,
        finals: finals.length,
        ingredients: ingredients.length,
        components: components.length,
        rawResources: rawResources.length
    });

    // Log completion status breakdown
    const completionStats = {
        complete: recipes.filter(r => r.completionStatus === 'complete').length,
        partial: recipes.filter(r => r.completionStatus === 'partial').length,
        missing: recipes.filter(r => r.completionStatus === 'missing').length
    };
    console.log('Recipe completion stats:', completionStats);

    return { recipes, finals, ingredients, components, rawResources };
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
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
};

const extractIngredients = (item) => {
    const ingredients = [];

    // First try the new format: single column with semicolon-separated ingredients
    if (item.Ingredients && item.Ingredients.trim()) {
        const ingredientString = item.Ingredients.trim();
        const ingredientPairs = ingredientString.split(';');

        for (const pair of ingredientPairs) {
            if (pair.trim()) {
                const parts = pair.trim().split(':');
                if (parts.length === 2) {
                    const name = parts[0].trim();
                    const quantity = parseInt(parts[1]) || 1;
                    if (name) {
                        ingredients.push({ name, quantity });
                    }
                }
            }
        }

        if (ingredients.length > 0) {
            //console.log(`Parsed ingredients from semicolon format for ${item.OutputName}:`, ingredients);

            // Special debug for Access Control
            if (item.OutputName === 'Access Control') {
                console.log('=== ACCESS CONTROL DEBUG ===');
                console.log('Raw Ingredients column:', item.Ingredients);
                console.log('Parsed ingredients:', ingredients);
                console.log('=== END ACCESS CONTROL DEBUG ===');
            }

            return ingredients;
        }
    }

    // Fallback to the old format: separate Ingredient1, Quantity1, etc. columns
    for (let i = 1; i <= 9; i++) {
        const ingredient = item[`Ingredient${i}`];
        const quantity = item[`Quantity${i}`];

        if (ingredient && ingredient.trim() && quantity && quantity.trim()) {
            ingredients.push({
                name: ingredient.trim(),
                quantity: parseInt(quantity) || 1
            });
        }
    }

    return ingredients;
}; 