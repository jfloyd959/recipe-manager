export class RecipeComplexityAnalyzer {
    constructor(recipes, basicResourceData = null, includeBuildingCosts = false) {
        this.recipes = recipes;
        this.basicResourceData = basicResourceData; // Keep for backward compatibility but make optional
        this.includeBuildingCosts = includeBuildingCosts; // NEW: Toggle for including building costs
        this.recipeMap = new Map();
        this.buildingMap = new Map(); // NEW: Map for building recipes
        this.basicResourceCache = new Map(); // Cache for basic resource calculations

        // Initialize maps for quick lookup
        this.initializeMaps();

        // Complexity rules based on economist feedback
        this.complexityRules = {
            // Maximum unique basic resources by ship size
            maxBasicResources: {
                'XXXS': 10,
                'XXS': 10,
                'XS': 10,
                'S': 15,
                'M': 20,
                'L': 30,
                'CAP': 40,
                'CMD': 50,
                'CLASS8': 60,
                'TTN': 80
            },
            // Maximum production steps by ship size
            maxProductionSteps: {
                'XXXS': 5,
                'XXS': 5,
                'XS': 5,
                'S': 6,
                'M': 6,
                'L': 7,
                'CAP': 8,
                'CMD': 9,
                'CLASS8': 10,
                'TTN': 12
            },
            // Maximum ingredients per recipe
            maxIngredientsPerRecipe: {
                'XXXS': 3,
                'XXS': 3,
                'XS': 3,
                'S': 4,
                'M': 4,
                'L': 5,
                'CAP': 6,
                'CMD': 7,
                'CLASS8': 8,
                'TTN': 10
            }
        };
    }

    initializeMaps() {
        // Create recipe lookup map and building map
        this.recipes.forEach(recipe => {
            const recipeName = recipe.OutputName || recipe.outputName;
            const outputType = (recipe.OutputType || recipe.outputType || '').toUpperCase();

            this.recipeMap.set(recipeName, recipe);

            // NEW: Separate building recipes for building cost analysis
            if (outputType === 'BUILDING') {
                this.buildingMap.set(recipeName, recipe);
            }
        });

        // Debug: Log available buildings
        if (this.buildingMap.size > 0) {
            console.log(`Found ${this.buildingMap.size} buildings in the system:`);
            const buildingNames = Array.from(this.buildingMap.keys()).slice(0, 10); // Show first 10
            console.log('Sample buildings:', buildingNames);
        } else {
            console.log('No buildings found in the system - checking OutputType values...');
            const outputTypes = new Set();
            this.recipes.forEach(recipe => {
                const outputType = recipe.OutputType || recipe.outputType || 'UNKNOWN';
                outputTypes.add(outputType);
            });
            console.log('Available OutputTypes:', Array.from(outputTypes));
        }

        // If we have the old basicResourceData, still create the lookup map for backward compatibility
        if (this.basicResourceData) {
            this.basicResourceMap = new Map();
            this.basicResourceData.forEach(row => {
                this.basicResourceMap.set(row.OutputName, {
                    basicResources: this.parseBasicResourceList(row.basic_resource_list),
                    quantities: this.parseBasicResourceList(row.basic_resource_quantity_list),
                    resourceCount: row.resource_list_length || 0
                });
            });
        }
    }

    parseBasicResourceList(listString) {
        if (!listString || typeof listString !== 'string') return [];
        try {
            // Handle both string format and array format
            if (listString.startsWith('[') && listString.endsWith(']')) {
                return JSON.parse(listString.replace(/'/g, '"'));
            }
            return listString.split(',').map(item => item.trim().replace(/['"]/g, ''));
        } catch (e) {
            console.warn('Failed to parse basic resource list:', listString);
            return [];
        }
    }

    // NEW: Find the building required to produce a specific resource
    findRequiredBuilding(resourceName) {
        const recipe = this.recipeMap.get(resourceName);
        if (!recipe) {
            console.log(`No recipe found for resource: ${resourceName}`);
            return null;
        }

        // Debug: Show the recipe data structure for the RESOURCE (not the building)
        console.log(`Recipe data for ${resourceName}:`, {
            ProductionSteps: recipe.ProductionSteps,
            productionSteps: recipe.productionSteps,
            OutputType: recipe.OutputType,
            outputType: recipe.outputType,
            ResourceType: recipe.ResourceType,
            resourceType: recipe.resourceType
        });

        const productionSteps = recipe.ProductionSteps || recipe.productionSteps || 0;
        console.log(`Resource ${resourceName} has ${productionSteps} production steps`);

        // Resources with 0-2 production steps typically require buildings
        if (productionSteps <= 2) {
            console.log(`Looking for building for ${resourceName} (${productionSteps} steps)...`);

            // Debug: Show all available buildings
            if (this.buildingMap.size === 0) {
                console.log("No buildings available in buildingMap!");
                return null;
            } else {
                console.log(`Searching through ${this.buildingMap.size} buildings...`);
            }

            // NEW: Strip the tier from the resource name and look for T1 building
            // For "Titanium Processor T3", we want to find "Titanium Processor T1"
            const baseResourceName = resourceName.replace(/\s+T\d+$/, ''); // Remove " T1", " T2", etc. from the end
            const targetBuildingName = `${baseResourceName} T1`;

            console.log(`Looking for building: "${targetBuildingName}" (base: "${baseResourceName}")`);

            // First try exact match for the T1 building
            const exactBuilding = this.buildingMap.get(targetBuildingName);
            if (exactBuilding) {
                console.log(`✓ Found exact building for ${resourceName}: ${targetBuildingName}`);
                return exactBuilding;
            }

            // If exact match fails, try partial matching with the base name + T1
            const matchingBuildings = [];
            for (const [buildingName, building] of this.buildingMap) {
                if (buildingName.includes(baseResourceName)) {
                    matchingBuildings.push(buildingName);
                }
                if (buildingName.includes(baseResourceName) && buildingName.includes('T1')) {
                    console.log(`✓ Found partial match building for ${resourceName}: ${buildingName}`);
                    return building;
                }
            }

            if (matchingBuildings.length > 0) {
                console.log(`Buildings containing "${baseResourceName}":`, matchingBuildings);
                console.log(`But none contain "T1"`);
            } else {
                console.log(`No buildings found containing "${baseResourceName}"`);
                // Debug: Show first few building names to see the pattern
                const sampleBuildings = Array.from(this.buildingMap.keys()).slice(0, 10);
                console.log(`Sample building names:`, sampleBuildings);
            }

            console.log(`✗ No building found for ${resourceName} (${productionSteps} production steps)`);
        } else {
            console.log(`Skipping building search for ${resourceName}: ${productionSteps} > 2 production steps`);
        }

        return null;
    }

    // UPDATED: Extract basic resources from production chain with optional building costs
    extractBasicResourcesFromChain(recipeName, visited = new Set(), includeBuildings = null, buildingsUsed = null) {
        // Use instance setting if not explicitly provided
        if (includeBuildings === null) {
            includeBuildings = this.includeBuildingCosts;
        }

        // Initialize buildingsUsed set if not provided (top-level call)
        if (buildingsUsed === null) {
            buildingsUsed = new Set();
        }

        // Create cache key that includes building option
        const cacheKey = `${recipeName}_${includeBuildings}`;

        // Check cache first
        if (this.basicResourceCache.has(cacheKey)) {
            return this.basicResourceCache.get(cacheKey);
        }

        if (visited.has(recipeName)) {
            return []; // Prevent infinite loops
        }
        visited.add(recipeName);

        const recipe = this.recipeMap.get(recipeName);
        if (!recipe) {
            // If no recipe found, assume it's a basic resource
            const result = [recipeName];
            this.basicResourceCache.set(cacheKey, result);
            return result;
        }

        // If this is a basic resource, return it
        const outputType = (recipe.OutputType || recipe.outputType || '').toUpperCase();
        if (outputType === 'BASIC RESOURCE') {
            console.log(`${recipeName} is a BASIC RESOURCE - but checking for building anyway...`);

            // NEW: Even basic resources might need buildings (extractors)
            // Don't return early, continue to check for buildings
        }

        // Otherwise, recursively check all ingredients
        const basicResources = new Set(); // Use Set to avoid duplicates
        const ingredients = this.extractIngredients(recipe);

        // Add this resource itself if it's a basic resource
        if (outputType === 'BASIC RESOURCE') {
            basicResources.add(recipeName);
        }

        ingredients.forEach(ingredient => {
            if (ingredient && ingredient.name) {
                const ingredientBasicResources = this.extractBasicResourcesFromChain(ingredient.name, new Set(visited), includeBuildings, buildingsUsed);
                ingredientBasicResources.forEach(resource => basicResources.add(resource));
            }
        });

        // NEW: If including building costs, add building resources
        if (includeBuildings) {
            const requiredBuilding = this.findRequiredBuilding(recipeName);
            if (requiredBuilding) {
                const buildingName = requiredBuilding.OutputName || requiredBuilding.outputName;
                console.log(`Adding building costs for ${recipeName}: ${buildingName}`);

                // Track this building as being used
                buildingsUsed.add({
                    buildingName: buildingName,
                    forResource: recipeName,
                    productionSteps: recipe.ProductionSteps || recipe.productionSteps || 0,
                    buildingRecipe: requiredBuilding
                });

                // Get the building's basic resources (but don't include buildings for buildings to avoid infinite recursion)
                const buildingBasicResources = this.extractBasicResourcesFromChain(
                    buildingName,
                    new Set(visited),
                    false, // Don't include building costs for the building itself
                    buildingsUsed // Pass along the buildings tracking
                );

                console.log(`Building ${buildingName} requires:`, buildingBasicResources);
                buildingBasicResources.forEach(resource => basicResources.add(resource));
            } else {
                console.log(`No building required for ${recipeName} (${recipe.ProductionSteps || recipe.productionSteps || 0} production steps)`);
            }
        }

        const result = Array.from(basicResources);
        this.basicResourceCache.set(cacheKey, result);

        if (includeBuildings && result.length > 0) {
            console.log(`Total basic resources for ${recipeName} (with buildings): ${result.length}`, result);
        }

        return result;
    }

    // Extract ship size from recipe name
    extractShipSize(recipeName) {
        // Sort patterns by length (longest first) to avoid partial matches
        // e.g., "CMD" should match "CMD" not "M", "TTN" should match "TTN" not "T"
        const sizePatterns = ['CLASS8', 'XXXS', 'XXS', 'CMD', 'CAP', 'TTN', 'XS', 'S', 'M', 'L'];
        for (const size of sizePatterns) {
            if (recipeName.includes(size)) {
                return size;
            }
        }
        return 'UNKNOWN';
    }

    // UPDATED: Analyze complexity for a single recipe with building cost option
    analyzeRecipeComplexity(recipe, includeBuildings = null) {
        if (includeBuildings === null) {
            includeBuildings = this.includeBuildingCosts;
        }

        const shipSize = this.extractShipSize(recipe.OutputName || recipe.outputName);
        const tier = recipe.OutputTier || recipe.outputTier || 1;

        // Get basic resource requirements - try both methods
        let uniqueBasicResources = [];
        let basicResourceCount = 0;
        let uniqueBasicResourcesWithoutBuildings = [];
        let basicResourceCountWithoutBuildings = 0;
        let buildingOnlyResources = []; // Track resources that come only from buildings
        let buildingsUsed = []; // NEW: Track all buildings used in analysis

        // First try the old method if basicResourceData is available
        if (this.basicResourceData && this.basicResourceMap) {
            const basicResourceInfo = this.basicResourceMap.get(recipe.OutputName || recipe.outputName);
            if (basicResourceInfo) {
                uniqueBasicResources = basicResourceInfo.basicResources;
                basicResourceCount = uniqueBasicResources.length;
                uniqueBasicResourcesWithoutBuildings = uniqueBasicResources; // Same for old method
                basicResourceCountWithoutBuildings = basicResourceCount;
            }
        }

        // If no basic resource data or not found, use the new chain extraction method
        if (basicResourceCount === 0) {
            // Get resources without buildings first
            uniqueBasicResourcesWithoutBuildings = this.extractBasicResourcesFromChain(recipe.OutputName || recipe.outputName, new Set(), false);
            basicResourceCountWithoutBuildings = uniqueBasicResourcesWithoutBuildings.length;

            // Get resources with buildings if requested
            if (includeBuildings) {
                const buildingsUsedSet = new Set();
                uniqueBasicResources = this.extractBasicResourcesFromChain(recipe.OutputName || recipe.outputName, new Set(), true, buildingsUsedSet);
                basicResourceCount = uniqueBasicResources.length;

                // Convert buildingsUsed Set to Array for display
                buildingsUsed = Array.from(buildingsUsedSet);

                // Calculate which resources come from buildings only
                const withoutBuildingsSet = new Set(uniqueBasicResourcesWithoutBuildings);
                buildingOnlyResources = uniqueBasicResources.filter(resource => !withoutBuildingsSet.has(resource));
            } else {
                uniqueBasicResources = uniqueBasicResourcesWithoutBuildings;
                basicResourceCount = basicResourceCountWithoutBuildings;
            }
        }

        // Count ingredients
        const ingredients = this.extractIngredients(recipe);
        const ingredientCount = ingredients.length;

        // Count production steps
        const productionSteps = recipe.ProductionSteps || recipe.productionSteps || 1;

        // Get complexity rules for this ship size
        const rules = this.complexityRules;
        const maxBasicResources = rules.maxBasicResources[shipSize] || 100;
        const maxProductionSteps = rules.maxProductionSteps[shipSize] || 15;
        const maxIngredients = rules.maxIngredientsPerRecipe[shipSize] || 10;

        // Calculate complexity score
        const complexityScore = this.calculateComplexityScore({
            basicResourceCount,
            ingredientCount,
            productionSteps,
            tier,
            shipSize
        });

        // Determine if recipe needs trimming
        const needsTrimming = this.determineTrimmingNeeds({
            basicResourceCount,
            ingredientCount,
            productionSteps,
            maxBasicResources,
            maxProductionSteps,
            maxIngredients
        });

        return {
            recipeName: recipe.OutputName || recipe.outputName,
            shipSize,
            tier,
            basicResourceCount,
            uniqueBasicResources,
            basicResourceCountWithoutBuildings, // Count without buildings
            uniqueBasicResourcesWithoutBuildings, // List without buildings
            buildingOnlyResources, // Resources that come only from buildings
            buildingsUsed, // NEW: All buildings used in the analysis
            includingBuildingCosts: includeBuildings, // Flag indicating if buildings were included
            ingredientCount,
            productionSteps,
            complexityScore,
            needsTrimming,
            trimmingReasons: this.getTrimmingReasons({
                basicResourceCount,
                ingredientCount,
                productionSteps,
                maxBasicResources,
                maxProductionSteps,
                maxIngredients
            }),
            maxAllowed: {
                basicResources: maxBasicResources,
                productionSteps: maxProductionSteps,
                ingredients: maxIngredients
            }
        };
    }

    extractIngredients(recipe) {
        const ingredients = [];

        // Handle both new and old recipe formats
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            return recipe.ingredients.filter(ing => ing && ing.name);
        }

        // Handle old format with Ingredient1, Ingredient2, etc.
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            if (ingredient && ingredient.trim()) {
                ingredients.push({ name: ingredient.trim() });
            }
        }

        return ingredients;
    }

    calculateComplexityScore(metrics) {
        const { basicResourceCount, ingredientCount, productionSteps, tier, shipSize } = metrics;

        // Base complexity from ship size
        const sizeMultiplier = {
            'XXXS': 1, 'XXS': 1.2, 'XS': 1.5, 'S': 2, 'M': 3,
            'L': 4, 'CAP': 5, 'CMD': 6, 'CLASS8': 7, 'TTN': 8
        }[shipSize] || 1;

        // Calculate score
        let score = (
            (basicResourceCount * 2) + // Basic resources are most important
            (ingredientCount * 1.5) +  // Ingredient count
            (productionSteps * 1) +    // Production steps
            (tier * 0.5)               // Tier complexity
        ) * sizeMultiplier;

        return Math.round(score * 10) / 10;
    }

    determineTrimmingNeeds(metrics) {
        const { basicResourceCount, ingredientCount, productionSteps, maxBasicResources, maxProductionSteps, maxIngredients } = metrics;

        return basicResourceCount > maxBasicResources ||
            ingredientCount > maxIngredients ||
            productionSteps > maxProductionSteps;
    }

    getTrimmingReasons(metrics) {
        const reasons = [];
        const { basicResourceCount, ingredientCount, productionSteps, maxBasicResources, maxProductionSteps, maxIngredients } = metrics;

        if (basicResourceCount > maxBasicResources) {
            reasons.push(`Too many basic resources: ${basicResourceCount} > ${maxBasicResources}`);
        }
        if (ingredientCount > maxIngredients) {
            reasons.push(`Too many ingredients: ${ingredientCount} > ${maxIngredients}`);
        }
        if (productionSteps > maxProductionSteps) {
            reasons.push(`Too many production steps: ${productionSteps} > ${maxProductionSteps}`);
        }

        return reasons;
    }

    // Analyze all recipes and generate comprehensive report
    analyzeAllRecipes() {
        const analysis = {
            summary: {
                totalRecipes: 0,
                recipesNeedingTrimming: 0,
                averageComplexity: 0,
                complexityDistribution: {},
                includingBuildingCosts: this.includeBuildingCosts // NEW: Track analysis mode
            },
            byShipSize: {},
            byTier: {},
            problematicRecipes: [],
            recommendations: []
        };

        let totalComplexity = 0;
        let recipesNeedingTrimming = 0;

        this.recipes.forEach(recipe => {
            const recipeAnalysis = this.analyzeRecipeComplexity(recipe, this.includeBuildingCosts); // Pass building costs option
            analysis.summary.totalRecipes++;
            totalComplexity += recipeAnalysis.complexityScore;

            if (recipeAnalysis.needsTrimming) {
                recipesNeedingTrimming++;
                analysis.problematicRecipes.push(recipeAnalysis);
            }

            // Group by ship size
            const shipSize = recipeAnalysis.shipSize;
            if (!analysis.byShipSize[shipSize]) {
                analysis.byShipSize[shipSize] = {
                    count: 0,
                    avgComplexity: 0,
                    avgBasicResources: 0,
                    avgIngredients: 0,
                    avgProductionSteps: 0,
                    needsTrimming: 0,
                    totalComplexity: 0,
                    totalBasicResources: 0,
                    totalIngredients: 0,
                    totalProductionSteps: 0
                };
            }

            const shipSizeData = analysis.byShipSize[shipSize];
            shipSizeData.count++;
            shipSizeData.totalComplexity += recipeAnalysis.complexityScore;
            shipSizeData.totalBasicResources += recipeAnalysis.basicResourceCount;
            shipSizeData.totalIngredients += recipeAnalysis.ingredientCount;
            shipSizeData.totalProductionSteps += recipeAnalysis.productionSteps;
            if (recipeAnalysis.needsTrimming) shipSizeData.needsTrimming++;

            // Group by tier
            const tier = recipeAnalysis.tier;
            if (!analysis.byTier[tier]) {
                analysis.byTier[tier] = {
                    count: 0,
                    avgComplexity: 0,
                    needsTrimming: 0,
                    totalComplexity: 0
                };
            }

            const tierData = analysis.byTier[tier];
            tierData.count++;
            tierData.totalComplexity += recipeAnalysis.complexityScore;
            if (recipeAnalysis.needsTrimming) tierData.needsTrimming++;
        });

        // Calculate averages
        analysis.summary.recipesNeedingTrimming = recipesNeedingTrimming;
        analysis.summary.averageComplexity = totalComplexity / analysis.summary.totalRecipes;

        Object.keys(analysis.byShipSize).forEach(shipSize => {
            const data = analysis.byShipSize[shipSize];
            data.avgComplexity = data.totalComplexity / data.count;
            data.avgBasicResources = data.totalBasicResources / data.count;
            data.avgIngredients = data.totalIngredients / data.count;
            data.avgProductionSteps = data.totalProductionSteps / data.count;
        });

        Object.keys(analysis.byTier).forEach(tier => {
            const data = analysis.byTier[tier];
            data.avgComplexity = data.totalComplexity / data.count;
        });

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        // Overall recommendations
        if (analysis.summary.recipesNeedingTrimming > 0) {
            recommendations.push({
                type: 'general',
                priority: 'high',
                message: `${analysis.summary.recipesNeedingTrimming} recipes need complexity reduction`,
                action: 'Review and trim problematic recipes'
            });
        }

        // Ship size specific recommendations
        Object.entries(analysis.byShipSize).forEach(([shipSize, data]) => {
            if (data.needsTrimming > 0) {
                recommendations.push({
                    type: 'ship_size',
                    shipSize,
                    priority: data.needsTrimming > data.count * 0.5 ? 'high' : 'medium',
                    message: `${shipSize} ships: ${data.needsTrimming}/${data.count} recipes need trimming`,
                    action: `Focus on reducing complexity for ${shipSize} ship recipes`
                });
            }

            if (data.avgBasicResources > this.complexityRules.maxBasicResources[shipSize] * 0.8) {
                recommendations.push({
                    type: 'ship_size',
                    shipSize,
                    priority: 'medium',
                    message: `${shipSize} ships: High average basic resources (${data.avgBasicResources.toFixed(1)})`,
                    action: `Consider reducing basic resource requirements for ${shipSize} recipes`
                });
            }
        });

        return recommendations;
    }

    // Generate trimming suggestions for a specific recipe
    generateTrimmingSuggestions(recipeAnalysis) {
        const suggestions = [];
        const { recipeName, shipSize, basicResourceCount, ingredientCount, productionSteps, maxAllowed } = recipeAnalysis;

        if (basicResourceCount > maxAllowed.basicResources) {
            suggestions.push({
                type: 'basic_resources',
                priority: 'high',
                message: `Reduce basic resources from ${basicResourceCount} to ${maxAllowed.basicResources}`,
                action: 'Consolidate similar basic resources or use intermediate products'
            });
        }

        if (ingredientCount > maxAllowed.ingredients) {
            suggestions.push({
                type: 'ingredients',
                priority: 'high',
                message: `Reduce ingredients from ${ingredientCount} to ${maxAllowed.ingredients}`,
                action: 'Combine similar ingredients or remove non-essential components'
            });
        }

        if (productionSteps > maxAllowed.productionSteps) {
            suggestions.push({
                type: 'production_steps',
                priority: 'medium',
                message: `Reduce production steps from ${productionSteps} to ${maxAllowed.productionSteps}`,
                action: 'Simplify production chain by combining intermediate steps'
            });
        }

        return suggestions;
    }

    // Export analysis report
    exportAnalysisReport(analysis) {
        let report = `# Recipe Complexity Analysis Report\n\n`;
        report += `Generated on: ${new Date().toLocaleString()}\n\n`;

        // Executive Summary
        report += `## Executive Summary\n\n`;
        report += `- **Total Recipes Analyzed:** ${analysis.summary.totalRecipes}\n`;
        report += `- **Recipes Needing Trimming:** ${analysis.summary.recipesNeedingTrimming}\n`;
        report += `- **Average Complexity Score:** ${analysis.summary.averageComplexity.toFixed(2)}\n`;
        report += `- **Trimming Required:** ${((analysis.summary.recipesNeedingTrimming / analysis.summary.totalRecipes) * 100).toFixed(1)}%\n\n`;

        // Recommendations
        if (analysis.recommendations.length > 0) {
            report += `## Priority Recommendations\n\n`;
            analysis.recommendations
                .filter(rec => rec.priority === 'high')
                .forEach(rec => {
                    report += `- **${rec.message}**\n`;
                    report += `  - Action: ${rec.action}\n\n`;
                });
        }

        // Analysis by Ship Size
        report += `## Analysis by Ship Size\n\n`;
        Object.entries(analysis.byShipSize)
            .sort((a, b) => a[1].needsTrimming - b[1].needsTrimming)
            .forEach(([shipSize, data]) => {
                report += `### ${shipSize} Ships\n`;
                report += `- **Total Recipes:** ${data.count}\n`;
                report += `- **Need Trimming:** ${data.needsTrimming} (${((data.needsTrimming / data.count) * 100).toFixed(1)}%)\n`;
                report += `- **Avg Basic Resources:** ${data.avgBasicResources.toFixed(1)}\n`;
                report += `- **Avg Ingredients:** ${data.avgIngredients.toFixed(1)}\n`;
                report += `- **Avg Production Steps:** ${data.avgProductionSteps.toFixed(1)}\n`;
                report += `- **Avg Complexity Score:** ${data.avgComplexity.toFixed(2)}\n\n`;
            });

        // Problematic Recipes
        if (analysis.problematicRecipes.length > 0) {
            report += `## Problematic Recipes (Top 20)\n\n`;
            analysis.problematicRecipes
                .slice(0, 20)
                .sort((a, b) => b.complexityScore - a.complexityScore)
                .forEach(recipe => {
                    report += `### ${recipe.recipeName} (${recipe.shipSize} T${recipe.tier})\n`;
                    report += `- **Complexity Score:** ${recipe.complexityScore}\n`;
                    report += `- **Basic Resources:** ${recipe.basicResourceCount}\n`;
                    report += `- **Ingredients:** ${recipe.ingredientCount}\n`;
                    report += `- **Production Steps:** ${recipe.productionSteps}\n`;
                    report += `- **Issues:** ${recipe.trimmingReasons.join(', ')}\n\n`;
                });
        }

        return report;
    }
} 