const fs = require('fs');

// Load component production steps from CSV
function loadComponentData() {
    const csvContent = fs.readFileSync('public/finalComponentList.csv', 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0].split(',');

    const nameIndex = header.indexOf('OutputName');
    const stepsIndex = header.indexOf('ProductionSteps');
    const tierIndex = header.indexOf('OutputTier');

    const components = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const name = parts[nameIndex]?.trim();
        const steps = parseInt(parts[stepsIndex]) || 0;
        const tier = parseInt(parts[tierIndex]) || 0;

        if (name) {
            components.set(name, { steps, tier });
        }
    }

    console.log(`✅ Loaded ${components.size} components from finalComponentList.csv`);
    return components;
}

// Function to parse TSV data from building recipes
function parseBuildingRecipesTsv() {
    const tsvContent = fs.readFileSync('public/buildingRecipes.tsv', 'utf8');
    const lines = tsvContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) return [];

    const headers = lines[0].split('\t').map(h => h.trim());
    const recipes = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        const recipe = {};
        headers.forEach((header, index) => {
            recipe[header] = parts[index];
        });

        // Extract ingredients from the recipe
        recipe.ingredients = [];
        for (let j = 1; j <= 8; j++) { // Assuming max 8 ingredients
            const ingredientName = recipe[`Ingredient${j}`];
            const quantity = recipe[`Quantity${j}`];
            if (ingredientName && quantity && ingredientName !== 'Auto-Built') {
                recipe.ingredients.push({
                    name: ingredientName,
                    quantity: parseInt(quantity) || 0
                });
            }
        }
        recipes.push(recipe);
    }

    console.log(`📋 Loaded ${recipes.length} building recipes`);
    return recipes;
}

// Helper function to extract resource name from building name
function extractResourceName(buildingName) {
    // Remove common building type suffixes and planet prefixes
    let resourceName = buildingName
        .replace(/\s+(Extractor|Processor|Farm)$/i, '') // Remove building type
        .replace(/^[a-z]+-/i, '') // Remove planet prefix like "oceanic-"
        .replace(/\s+T\d+$/i, ''); // Remove tier suffix

    return resourceName.trim();
}

// Helper function to get resource tier from component data
function getResourceTierFromName(buildingName, componentData) {
    const resourceName = extractResourceName(buildingName);

    // Try to find the resource in component data
    const resourceInfo = componentData.get(resourceName);
    if (resourceInfo) {
        return resourceInfo.tier;
    }

    // If not found directly, try common variations
    const variations = [
        resourceName + ' Ore',
        resourceName + ' Crystals',
        resourceName + ' Crystal',
        resourceName.replace(' Ore', ''),
        resourceName.replace(' Crystals', ''),
        resourceName.replace(' Crystal', '')
    ];

    for (const variation of variations) {
        const varInfo = componentData.get(variation);
        if (varInfo) {
            return varInfo.tier;
        }
    }

    return 'Unknown';
}

// Main analysis function - only analyze components used in building recipes
function analyzeUsedComponentsViolations(recipes, componentData) {
    const usedComponents = new Set();
    const violatingComponents = new Map();
    let totalViolationInstances = 0;

    // First, collect all unique components used in building recipes
    recipes.forEach(recipe => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                usedComponents.add(ingredient.name);
            });
        }
    });

    console.log(`🔍 Found ${usedComponents.size} unique components used in building recipes`);

    // Now analyze violations only for components that are actually used
    recipes.forEach(recipe => {
        const buildingName = recipe.OutputName;
        const buildingTier = parseInt(recipe.OutputTier);
        const buildingResourceTier = recipe.BuildingResourceTier ? parseInt(recipe.BuildingResourceTier) : 'N/A';
        const planetType = recipe.PlanetTypes;
        const category = recipe.ResourceType;

        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                const componentName = ingredient.name;
                const componentInfo = componentData.get(componentName);

                if (componentInfo && componentInfo.steps > 2) {
                    if (!violatingComponents.has(componentName)) {
                        violatingComponents.set(componentName, {
                            steps: componentInfo.steps,
                            tier: componentInfo.tier,
                            usages: []
                        });
                    }
                    violatingComponents.get(componentName).usages.push({
                        building: buildingName,
                        buildingTier: buildingTier,
                        buildingResourceTier: buildingResourceTier,
                        planet: planetType,
                        category: category,
                        quantity: ingredient.quantity,
                        resourceName: extractResourceName(buildingName), // Extract the resource being processed
                        resourceTier: getResourceTierFromName(buildingName, componentData) // Get tier of the resource
                    });
                    totalViolationInstances++;
                }
            });
        }
    });

    return { violatingComponents, totalViolationInstances, usedComponents };
}

// Generate detailed report content
function generateReportContent(analysisResult) {
    const { violatingComponents, totalViolationInstances, usedComponents } = analysisResult;

    let report = `================================================================================
🚨 BUILDING RECIPE COMPONENT VIOLATIONS ANALYSIS
================================================================================

📊 EXECUTIVE SUMMARY:
Total Components Used in Building Recipes: ${usedComponents.size}
Violating Components (>2 steps): ${violatingComponents.size}
Total Violation Instances: ${totalViolationInstances}
Violation Rate: ${((violatingComponents.size / usedComponents.size) * 100).toFixed(1)}%

📋 ALL ${violatingComponents.size} VIOLATING COMPONENTS USED IN BUILDING RECIPES:
--------------------------------------------------------------------------------
`;

    const sortedViolations = Array.from(violatingComponents.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return a[0].localeCompare(b[0]);
    });

    sortedViolations.forEach(([componentName, details], index) => {
        report += `\n${index + 1}. 🔴 ${componentName}
   Production Steps: ${details.steps}
   Component Tier: T${details.tier}
   Used in ${details.usages.length} buildings
`;

        // Group usages by resource tier and then by planet
        const usagesByResourceTier = new Map();
        details.usages.forEach(usage => {
            const key = usage.buildingResourceTier === 'N/A' ? 'Infrastructure' : `T${usage.buildingResourceTier}`;
            if (!usagesByResourceTier.has(key)) {
                usagesByResourceTier.set(key, []);
            }
            usagesByResourceTier.get(key).push(usage);
        });

        Array.from(usagesByResourceTier.entries()).sort().forEach(([resourceTierGroup, usages]) => {
            report += `   📍 ${resourceTierGroup} Buildings: ${usages.length} buildings\n`;
            const usagesByPlanet = new Map();
            usages.forEach(usage => {
                if (!usagesByPlanet.has(usage.planet)) {
                    usagesByPlanet.set(usage.planet, []);
                }
                usagesByPlanet.get(usage.planet).push(usage);
            });

            Array.from(usagesByPlanet.entries()).sort().forEach(([planet, planetUsages]) => {
                report += `      🌍 ${planet}: ${planetUsages.length} buildings\n`;
                planetUsages.forEach(usage => {
                    const resourceInfo = usage.resourceTier !== 'Unknown' ? ` [${usage.resourceName} T${usage.resourceTier}]` : ` [${usage.resourceName}]`;
                    report += `         • ${usage.building} T${usage.buildingTier} (${usage.category})${resourceInfo} - Qty: ${usage.quantity}\n`;
                });
            });
        });
        report += `----------------------------------------\n`;
    });

    // Critical analysis section
    report += `\n🚨 CRITICAL ANALYSIS:
--------------------------------------------------------------------------------\n`;

    const criticalEarlyGameBlockers = sortedViolations.filter(([name, info]) => info.tier <= 2);
    if (criticalEarlyGameBlockers.length > 0) {
        report += `⚠️ CRITICAL: The following T1-T2 components require >2 production steps and may block early-game progression:\n`;
        criticalEarlyGameBlockers.forEach(([name, info]) => {
            report += `  - ${name} (T${info.tier}, ${info.steps} steps) - Used in ${info.usages.length} buildings\n`;
        });
    } else {
        report += `✅ GOOD: No T1-T2 components require >2 steps - Excellent for early-game progression!\n`;
    }

    const highStepViolations = sortedViolations.filter(([name, info]) => info.steps >= 5);
    if (highStepViolations.length > 0) {
        report += `\n🔥 EXTREME VIOLATIONS (5+ steps): ${highStepViolations.length} components\n`;
        highStepViolations.forEach(([name, info]) => {
            report += `  - ${name} (T${info.tier}, ${info.steps} steps)\n`;
        });
    }

    report += `\n📝 Complete report saved to: BUILDING_RECIPE_VIOLATIONS.md\n`;
    return report;
}

// Main execution
console.log('🚀 Starting building recipe component violation analysis...');
try {
    const componentData = loadComponentData();
    const recipes = parseBuildingRecipesTsv();

    const analysisResult = analyzeUsedComponentsViolations(recipes, componentData);
    const reportContent = generateReportContent(analysisResult);

    fs.writeFileSync('BUILDING_RECIPE_VIOLATIONS.md', reportContent);
    console.log(reportContent); // Also print to console

} catch (error) {
    console.error('❌ Error during analysis:', error);
} 