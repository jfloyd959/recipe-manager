const fs = require('fs');
const path = require('path');

// Function to parse CSV data
function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }

    return data;
}

// Function to extract ship size from component name
function extractShipSize(componentName) {
    const sizePatterns = ['CLASS8', 'XXXS', 'XXS', 'CMD', 'CAP', 'TTN', 'XS', 'S', 'M', 'L'];
    for (const size of sizePatterns) {
        if (componentName.includes(size)) {
            return size;
        }
    }
    return 'UNKNOWN';
}

// Function to extract component type from name
function extractComponentType(componentName) {
    // Remove ship size and tier information
    // Use word boundaries to avoid matching "S" in the middle of words like "Suppressor"
    let cleanName = componentName.replace(/\b(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)\b/g, '').trim();
    cleanName = cleanName.replace(/T\d+$/, '').trim();
    return cleanName;
}

// Function to extract ingredients from a recipe
function extractIngredients(recipe) {
    const ingredients = [];

    for (let i = 1; i <= 9; i++) {
        const ingredient = recipe[`Ingredient${i}`];
        const quantity = recipe[`Quantity${i}`];

        if (ingredient && ingredient.trim() && !ingredient.includes('T1') && !ingredient.includes('T2') && !ingredient.includes('T3') && !ingredient.includes('T4') && !ingredient.includes('T5')) {
            ingredients.push({
                name: ingredient.trim(),
                quantity: parseInt(quantity) || 1
            });
        }
    }

    return ingredients;
}

// NEW: Function to build recipe lookup map
function buildRecipeMap(recipes) {
    const recipeMap = new Map();
    recipes.forEach(recipe => {
        recipeMap.set(recipe.OutputName, recipe);
    });
    return recipeMap;
}

// NEW: Function to analyze production chain for raw resources
function analyzeProductionChain(recipeName, recipeMap, visited = new Set(), recipeCount = 0) {
    if (visited.has(recipeName)) {
        return { rawResources: [], recipeCount: 0 }; // Prevent infinite loops
    }

    visited.add(recipeName);
    const recipe = recipeMap.get(recipeName);

    if (!recipe) {
        // If no recipe found, assume it's a basic resource
        return { rawResources: [recipeName], recipeCount: 0 };
    }

    recipeCount++;

    // Check if this is a basic resource
    const outputType = (recipe.OutputType || '').toUpperCase();
    if (outputType === 'BASIC RESOURCE') {
        return { rawResources: [recipeName], recipeCount: recipeCount };
    }

    // Otherwise, recursively check all ingredients
    const allRawResources = new Set();
    let totalRecipeCount = recipeCount;

    const ingredients = extractIngredients(recipe);
    for (const ingredient of ingredients) {
        if (ingredient && ingredient.name) {
            const result = analyzeProductionChain(ingredient.name, recipeMap, new Set(visited), 0);
            result.rawResources.forEach(resource => allRawResources.add(resource));
            totalRecipeCount += result.recipeCount;
        }
    }

    return {
        rawResources: Array.from(allRawResources),
        recipeCount: totalRecipeCount
    };
}

// NEW: Function to get resource tier
function getResourceTier(resourceName, recipeMap) {
    const recipe = recipeMap.get(resourceName);
    if (recipe && recipe.OutputTier) {
        return `T${recipe.OutputTier}`;
    }
    return 'T1'; // Default to T1 if not found
}

// NEW: Function to analyze ingredient details
function analyzeIngredientDetails(ingredientName, recipeMap) {
    const analysis = analyzeProductionChain(ingredientName, recipeMap);

    // Get tier information for each raw resource
    const rawResourcesWithTiers = analysis.rawResources.map(resource => ({
        name: resource,
        tier: getResourceTier(resource, recipeMap)
    }));

    return {
        name: ingredientName,
        recipeCount: analysis.recipeCount,
        rawResourceCount: analysis.rawResources.length,
        rawResources: rawResourcesWithTiers
    };
}

// Main function to generate the report
function generateComponentIngredientsReport() {
    try {
        // Read the CSV file
        const csvPath = path.join(__dirname, 'public', 'finalComponentList.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const recipes = parseCSV(csvContent);

        // Build recipe lookup map
        const recipeMap = buildRecipeMap(recipes);

        // UPDATED: Filter for final components - ALL types EXCEPT the excluded ones
        const excludedOutputTypes = ['R4', 'INGREDIENT', 'BASIC RESOURCE', 'COMPONENT', 'BUILDING'];

        const finalComponents = recipes.filter(recipe => {
            const outputType = (recipe.OutputType || '').toUpperCase();
            const tier = recipe.OutputTier || '1';

            // Include if OutputType is NOT in excluded list AND it's Tier 1 (to see base ingredients)
            return !excludedOutputTypes.includes(outputType) && tier === '1';
        });

        console.log(`\nFiltered final components:`);
        console.log(`Total recipes: ${recipes.length}`);
        console.log(`Final components (T1 only): ${finalComponents.length}`);

        // Show breakdown by output type
        const outputTypeBreakdown = {};
        finalComponents.forEach(recipe => {
            const outputType = recipe.OutputType || 'UNKNOWN';
            outputTypeBreakdown[outputType] = (outputTypeBreakdown[outputType] || 0) + 1;
        });

        console.log(`\nOutput type breakdown:`);
        Object.entries(outputTypeBreakdown)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });

        // Group components by type
        const componentsByType = {};

        finalComponents.forEach(recipe => {
            const componentType = extractComponentType(recipe.OutputName);
            const shipSize = extractShipSize(recipe.OutputName);
            const ingredients = extractIngredients(recipe);
            const outputType = recipe.OutputType || 'UNKNOWN';

            if (!componentsByType[componentType]) {
                componentsByType[componentType] = {
                    outputType: outputType, // Track the output type for better categorization
                    sizes: {}
                };
            }

            if (!componentsByType[componentType].sizes[shipSize]) {
                componentsByType[componentType].sizes[shipSize] = {
                    recipeName: recipe.OutputName,
                    ingredients: ingredients
                };
            }
        });

        // Generate the report
        let report = `# Final Component Ingredients Analysis Report (XXXS - M Focus)\n\n`;
        report += `**Generated on:** ${new Date().toLocaleString()}\n`;
        report += `**Focus:** Core ingredients for small to medium ships (XXXS - M)\n`;
        report += `**Enhanced:** Raw resource analysis for each ingredient's production chain\n`;
        report += `**Scope:** Excludes L+ ship size additions for separate analysis\n\n`;

        report += `## Executive Summary\n\n`;
        report += `This report analyzes the core ingredients used in final components for small to medium ships (XXXS - M sizes). `;
        report += `By focusing on these base ingredients, we can establish clear raw resource allocation strategies that are `;
        report += `accessible to new players and form the foundation for larger ship complexity.\n\n`;

        report += `### Key Findings:\n`;
        report += `- **Component Types Analyzed:** ${Object.keys(componentsByType).length}\n`;
        report += `- **Output Types Included:** ${Object.keys(outputTypeBreakdown).join(', ')}\n`;
        report += `- **Total Final Components:** ${finalComponents.length}\n`;
        report += `- **Ship Size Focus:** XXXS, XXS, XS, S, M (core progression for new players)\n`;
        report += `- **Ingredient Foundation:** Establishes base ingredients before L+ complexity\n`;
        report += `- **Raw Resource Analysis:** Current production chains analyzed for each core ingredient\n\n`;

        report += `### Output Type Breakdown:\n`;
        Object.entries(outputTypeBreakdown)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                report += `- **${type}:** ${count} components\n`;
            });
        report += `\n`;

        // Define ship size order for consistent reporting
        const shipSizeOrder = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        const mediumAndBelowSizes = ['XXXS', 'XXS', 'XS', 'S', 'M'];
        const largeSizes = ['L', 'CAP', 'CMD', 'CLASS8', 'TTN'];

        // FOCUS: Only analyze medium and below sizes for this report
        const focusSizes = mediumAndBelowSizes;

        // Sort component types alphabetically, but group by output type
        const componentsByOutputType = {};
        Object.entries(componentsByType).forEach(([componentType, data]) => {
            const outputType = data.outputType;
            if (!componentsByOutputType[outputType]) {
                componentsByOutputType[outputType] = {};
            }
            componentsByOutputType[outputType][componentType] = data;
        });

        // Process each output type
        Object.keys(componentsByOutputType).sort().forEach(outputType => {
            report += `# ${outputType} Components\n\n`;

            const componentsInType = componentsByOutputType[outputType];
            const sortedComponentTypes = Object.keys(componentsInType).sort();

            sortedComponentTypes.forEach(componentType => {
                report += `## ${componentType}\n\n`;
                report += `**Output Type:** ${outputType}\n\n`;

                const componentData = componentsInType[componentType].sizes;

                // Find base ingredients (used in medium and below)
                const baseIngredients = new Set();

                focusSizes.forEach(size => {
                    if (componentData[size]) {
                        componentData[size].ingredients.forEach(ing => {
                            baseIngredients.add(ing.name);
                        });
                    }
                });

                // Report base ingredients for medium and below WITH RAW RESOURCE ANALYSIS
                if (baseIngredients.size > 0) {
                    report += `### Core Ingredients (XXS - M sizes)\n`;
                    report += `**Used across all medium and smaller ship sizes:**\n\n`;

                    const baseIngredientsList = Array.from(baseIngredients).sort();
                    baseIngredientsList.forEach(ingredientName => {
                        const ingredientAnalysis = analyzeIngredientDetails(ingredientName, recipeMap);

                        report += `#### ${ingredientName}\n`;
                        report += `- **Production Chain:** ${ingredientAnalysis.recipeCount} recipes\n`;
                        report += `- **Raw Resources Used:** ${ingredientAnalysis.rawResourceCount} unique resources\n`;
                        report += `- **Current Raw Resources:** `;

                        if (ingredientAnalysis.rawResources.length > 0) {
                            const resourceList = ingredientAnalysis.rawResources
                                .map(resource => `${resource.name} (${resource.tier})`)
                                .join(', ');
                            report += `${resourceList}\n`;
                        } else {
                            report += `None found\n`;
                        }

                        // Resource tier analysis
                        const tierCounts = {};
                        ingredientAnalysis.rawResources.forEach(resource => {
                            tierCounts[resource.tier] = (tierCounts[resource.tier] || 0) + 1;
                        });

                        if (Object.keys(tierCounts).length > 0) {
                            report += `- **Tier Distribution:** `;
                            const tierSummary = Object.entries(tierCounts)
                                .map(([tier, count]) => `${count} ${tier}`)
                                .join(', ');
                            report += `${tierSummary}\n`;
                        }

                        report += `\n`;
                    });

                    report += `**Raw Resource Planning Notes:**\n`;
                    report += `- These ${baseIngredients.size} ingredients form the foundation for ${componentType} components\n`;
                    report += `- Target: Each ingredient should be limited to max 5 unique raw resources\n`;
                    report += `- Current analysis shows actual raw resource usage in production chains\n`;
                    report += `- Focus on low-tier raw resources accessible to new players\n`;
                    report += `- Ensure consistent resource requirements across XXS-M sizes\n\n`;
                } else {
                    report += `### No Core Ingredients Found\n`;
                    report += `This component type may not have consistent ingredients across XXS-M sizes, or may not exist in smaller ship sizes.\n\n`;
                }

                // Report size-specific progression (grouped by identical ingredients)
                report += `### Ship Size Progression\n\n`;

                // Group sizes by identical ingredient lists
                const ingredientGroups = {};
                focusSizes.forEach(size => {
                    if (componentData[size]) {
                        const ingredientKey = componentData[size].ingredients.map(ing => ing.name).sort().join('|');
                        if (!ingredientGroups[ingredientKey]) {
                            ingredientGroups[ingredientKey] = {
                                sizes: [],
                                ingredients: componentData[size].ingredients,
                                count: componentData[size].ingredients.length
                            };
                        }
                        ingredientGroups[ingredientKey].sizes.push(size);
                    }
                });

                // Report grouped sizes
                Object.values(ingredientGroups).forEach(group => {
                    const sizeList = group.sizes.join(', ');
                    const sizeRange = group.sizes.length > 1 ?
                        `**${group.sizes[0]} - ${group.sizes[group.sizes.length - 1]} Ships:**` :
                        `**${group.sizes[0]} Ships:**`;

                    report += sizeRange + '\n';
                    report += `- Ship Sizes: ${sizeList}\n`;
                    report += `- Ingredients: ${group.ingredients.map(ing => ing.name).join(', ')}\n`;
                    report += `- Ingredient Count: ${group.count}\n\n`;
                });

                // Enhanced ingredient analysis summary
                report += `### Ingredient Analysis Summary\n\n`;

                const allSizesWithData = focusSizes.filter(size => componentData[size]);
                if (allSizesWithData.length > 0) {
                    report += `**Size Range:** ${allSizesWithData[0]} to ${allSizesWithData[allSizesWithData.length - 1]}\n`;
                    report += `**Base Ingredient Count:** ${baseIngredients.size}\n`;

                    const maxIngredients = Math.max(...allSizesWithData.map(size => componentData[size].ingredients.length));
                    const minIngredients = Math.min(...allSizesWithData.map(size => componentData[size].ingredients.length));

                    report += `**Ingredient Range:** ${minIngredients} - ${maxIngredients} ingredients\n`;
                    report += `**Complexity Variation:** ${maxIngredients - minIngredients} ingredient difference between smallest and largest focused ships\n`;

                    // Raw resource summary for base ingredients
                    if (baseIngredients.size > 0) {
                        let totalRawResources = 0;
                        let totalRecipes = 0;
                        const allTiers = new Set();

                        Array.from(baseIngredients).forEach(ingredientName => {
                            const analysis = analyzeIngredientDetails(ingredientName, recipeMap);
                            totalRawResources += analysis.rawResourceCount;
                            totalRecipes += analysis.recipeCount;
                            analysis.rawResources.forEach(resource => allTiers.add(resource.tier));
                        });

                        report += `**Total Raw Resources (Base Ingredients):** ${totalRawResources}\n`;
                        report += `**Total Production Recipes:** ${totalRecipes}\n`;
                        report += `**Resource Tiers Used:** ${Array.from(allTiers).sort().join(', ')}\n`;
                    }
                    report += `\n`;
                } else {
                    report += `**No size data available for this component type.**\n\n`;
                }

                report += `---\n\n`;
            });
        });

        // Enhanced recommendations section
        report += `# Raw Resource Planning Recommendations\n\n`;

        report += `## For Small to Medium Ships (XXXS - M)\n`;
        report += `1. **Standardize Base Ingredients:** Ensure consistent ingredient sets across XXXS-M sizes\n`;
        report += `2. **Raw Resource Limits:** Cap each ingredient at 5 unique raw resources maximum\n`;
        report += `3. **Tier Accessibility:** Use primarily Tier 1-2 raw resources for new player accessibility\n`;
        report += `4. **Resource Overlap:** Minimize raw resource conflicts between component types\n`;
        report += `5. **Current Analysis:** Use the raw resource breakdowns above to identify optimization opportunities\n`;
        report += `6. **Focus Strategy:** This report focuses on core ingredients used in smaller ships to establish the foundation\n\n`;

        report += `## Next Steps\n`;
        report += `1. **Large Ship Analysis:** Create separate analysis for L+ size ingredient additions\n`;
        report += `2. **Resource Mapping:** Define clear raw resource allocation per component type\n`;
        report += `3. **Crossover Planning:** Plan for resource sharing in larger ship components\n`;
        report += `4. **Implementation:** Use this foundation to build larger ship complexity\n\n`;

        report += `## Implementation Strategy\n`;
        report += `1. **Phase 1:** Review current raw resource usage patterns (see analysis above)\n`;
        report += `2. **Phase 2:** Identify ingredients exceeding 5 raw resource limit\n`;
        report += `3. **Phase 3:** Plan ingredient-to-raw-resource mapping optimization\n`;
        report += `4. **Phase 4:** Address large ship complexity and crossover\n`;
        report += `5. **Phase 5:** Balance testing and iteration\n\n`;

        // Enhanced component type summary table organized by output type
        report += `# Component Type Summary\n\n`;

        Object.keys(componentsByOutputType).sort().forEach(outputType => {
            report += `## ${outputType} Summary\n\n`;
            report += `| Component Type | Base Ingredients (XXXS-M) | Max Ingredients | Size Range | Avg Raw Resources per Ingredient |\n`;
            report += `|---|---|---|---|---|\n`;

            const componentsInType = componentsByOutputType[outputType];
            const sortedComponentTypes = Object.keys(componentsInType).sort();

            sortedComponentTypes.forEach(componentType => {
                const componentData = componentsInType[componentType].sizes;
                const baseIngredients = new Set();

                focusSizes.forEach(size => {
                    if (componentData[size]) {
                        componentData[size].ingredients.forEach(ing => {
                            baseIngredients.add(ing.name);
                        });
                    }
                });

                const allSizesWithData = focusSizes.filter(size => componentData[size]);
                const maxIngredients = allSizesWithData.length > 0 ?
                    Math.max(...allSizesWithData.map(size => componentData[size].ingredients.length)) : 0;
                const sizeRange = allSizesWithData.length > 0 ?
                    `${allSizesWithData[0]} - ${allSizesWithData[allSizesWithData.length - 1]}` : 'None';

                // Calculate average raw resources per ingredient
                let totalRawResources = 0;
                let ingredientCount = 0;
                Array.from(baseIngredients).forEach(ingredientName => {
                    const analysis = analyzeIngredientDetails(ingredientName, recipeMap);
                    totalRawResources += analysis.rawResourceCount;
                    ingredientCount++;
                });

                const avgRawResources = ingredientCount > 0 ? (totalRawResources / ingredientCount).toFixed(1) : '0';

                report += `| ${componentType} | ${baseIngredients.size} | ${maxIngredients} | ${sizeRange} | ${avgRawResources} |\n`;
            });

            report += `\n`;
        });

        report += `---\n\n`;
        report += `**Report Generated:** ${new Date().toISOString()}\n`;
        report += `**Data Source:** finalComponentList.csv\n`;
        report += `**Analysis Focus:** Raw resource planning for balanced game progression\n`;
        report += `**Enhancement:** Includes detailed production chain analysis for each ingredient\n`;
        report += `**Coverage:** All final component types (excludes ${excludedOutputTypes.join(', ')})\n`;

        return report;

    } catch (error) {
        console.error('Error generating report:', error);
        return `Error generating report: ${error.message}`;
    }
}

// Generate and save the report
const report = generateComponentIngredientsReport();
const outputPath = path.join(__dirname, 'component-ingredients-analysis-report.md');

fs.writeFileSync(outputPath, report, 'utf8');
console.log(`Enhanced report generated successfully!`);
console.log(`Output file: ${outputPath}`);
console.log(`\nReport preview (first 500 characters):`);
console.log(report.substring(0, 500) + '...'); 