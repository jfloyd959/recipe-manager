export const loadPotentialComponents = async () => {
    try {
        console.log('Attempting to load potential components from /PotentialComponents.md');
        const response = await fetch('/PotentialComponents.md');

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const markdownText = await response.text();
        console.log('Markdown loaded, length:', markdownText.length);

        const parsedComponents = parseMarkdownComponents(markdownText);
        console.log('Parsed potential components:', parsedComponents.length);

        return parsedComponents;
    } catch (error) {
        console.error('Error loading potential components:', error);
        return [];
    }
};

const parseMarkdownComponents = (markdownText) => {
    const lines = markdownText.split('\n');
    const potentialComponents = [];
    let currentCategory = 'Uncategorized';
    let currentSubcategory = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Check for main categories (ALL CAPS headers)
        if (line.match(/^[A-Z\s&]+$/)) {
            currentCategory = line;
            currentSubcategory = '';
            continue;
        }

        // Check for subcategories (Title Case headers)
        if (line.match(/^[A-Z][a-z\s&]+$/) && !line.includes('=')) {
            currentSubcategory = line;
            continue;
        }

        // Parse component recipes (ComponentName = Ingredient1 + Ingredient2 + ...)
        const recipeMatch = line.match(/^(.+?)\s*=\s*(.+)$/);
        if (recipeMatch) {
            const componentName = recipeMatch[1].trim();
            const ingredientString = recipeMatch[2].trim();

            // Parse ingredients
            const ingredients = ingredientString
                .split('+')
                .map(ing => ing.trim())
                .filter(ing => ing.length > 0)
                .map(ing => ({
                    name: ing,
                    quantity: 1 // Default quantity, could be enhanced later
                }));

            // Determine tier based on ingredients or category
            const tier = determineTier(ingredientString, currentCategory);

            potentialComponents.push({
                id: `potential_${Date.now()}_${potentialComponents.length}`,
                name: componentName,
                type: 'Potential Component',
                tier: tier,
                constructionTime: estimateConstructionTime(tier, ingredients.length),
                ingredients: ingredients,
                category: currentCategory,
                subcategory: currentSubcategory,
                isFinalized: false,
                isPotential: true,
                source: 'PotentialComponents.md'
            });
        }
    }

    return potentialComponents;
};

const determineTier = (ingredientString, category) => {
    // Check for tier indicators in ingredient names
    if (ingredientString.includes('T5') || ingredientString.includes('Tier 5')) return 5;
    if (ingredientString.includes('T4') || ingredientString.includes('Tier 4')) return 4;
    if (ingredientString.includes('T3') || ingredientString.includes('Tier 3')) return 3;
    if (ingredientString.includes('T2') || ingredientString.includes('Tier 2')) return 2;

    // Check for advanced materials that indicate higher tiers
    const t5Materials = ['Quantum', 'Reality', 'Living Metal', 'Fusion Catalyst', 'Black Opal', 'Biolumite'];
    const t4Materials = ['Phase Shift', 'Plasma', 'Neural', 'Exotic', 'Abyssal'];
    const t3Materials = ['Titanium', 'Tungsten', 'Cryo', 'Emerald', 'Sapphire', 'Bio'];

    if (t5Materials.some(material => ingredientString.includes(material))) return 5;
    if (t4Materials.some(material => ingredientString.includes(material))) return 4;
    if (t3Materials.some(material => ingredientString.includes(material))) return 3;

    // Category-based tier estimation
    if (category.includes('QUANTUM') || category.includes('EXOTIC')) return 4;
    if (category.includes('ADVANCED') || category.includes('SPECIALIZED')) return 3;

    return 2; // Default tier
};

const estimateConstructionTime = (tier, ingredientCount) => {
    // Base time increases with tier and complexity
    const baseTime = tier * 60; // 60 seconds per tier
    const complexityMultiplier = Math.max(1, ingredientCount - 1) * 30; // +30s per additional ingredient
    return baseTime + complexityMultiplier;
}; 