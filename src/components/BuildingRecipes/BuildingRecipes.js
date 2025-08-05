import React, { useState, useContext, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './BuildingRecipes.css';

const BuildingRecipes = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [buildingRecipes, setBuildingRecipes] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    // Helper function to convert name to kebab-case
    const toKebabCase = (str) => {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    // Load buildings and building recipes from localStorage
    useEffect(() => {
        const savedBuildings = localStorage.getItem('generated-buildings');
        if (savedBuildings) {
            try {
                setBuildings(JSON.parse(savedBuildings));
            } catch (error) {
                console.error('Error loading buildings:', error);
                setBuildings([]);
            }
        }

        const savedBuildingRecipes = localStorage.getItem('building-recipes');
        if (savedBuildingRecipes) {
            try {
                const loadedRecipes = JSON.parse(savedBuildingRecipes);
                console.log(`📥 Loaded ${loadedRecipes.length} building recipes from storage`);

                // Check if we have compressed/minimal data that needs full analysis regeneration
                const needsAnalysisRegeneration = loadedRecipes.some(recipe =>
                    !recipe.analysis || typeof recipe.analysis.difficultyScore === 'undefined'
                );

                if (needsAnalysisRegeneration) {
                    console.log('🔄 Detected minimal data, analysis will be regenerated when needed');
                }

                setBuildingRecipes(loadedRecipes);
            } catch (error) {
                console.error('Error loading building recipes:', error);
                setBuildingRecipes([]);
            }
        }
    }, []);

    // Save building recipes to localStorage whenever they change
    useEffect(() => {
        if (buildingRecipes.length > 0) {
            try {
                // Clear existing data first to free up space
                localStorage.removeItem('building-recipes');

                // Create a compressed version with only essential data for storage
                const compressedRecipes = buildingRecipes.map(recipe => ({
                    outputID: recipe.outputID,
                    outputName: recipe.outputName,
                    outputType: recipe.outputType,
                    outputTier: recipe.outputTier,
                    constructionTime: recipe.constructionTime,
                    planetTypes: recipe.planetTypes,
                    factions: recipe.factions,
                    resourceType: recipe.resourceType,
                    functionalPurpose: recipe.functionalPurpose,
                    usageCategory: recipe.usageCategory,
                    completionStatus: recipe.completionStatus,
                    productionSteps: recipe.productionSteps,
                    targetResourceTier: recipe.targetResourceTier,
                    requiresNativeResources: recipe.requiresNativeResources,
                    ingredients: recipe.ingredients,
                    id: recipe.id,
                    // Store only essential analysis data
                    analysis: recipe.analysis ? {
                        difficultyScore: recipe.analysis.difficultyScore,
                        nativeResourceCompliance: recipe.analysis.nativeResourceCompliance,
                        alternateComponentsUsed: recipe.analysis.alternateComponentsUsed,
                        // Include commonly accessed properties to prevent errors
                        planetDependenciesSize: recipe.analysis.planetDependencies?.size || 0,
                        issuesCount: recipe.analysis.issues?.length || 0,
                        nativePlanetMatch: recipe.analysis.nativePlanetMatch || false,
                        tierComplexity: recipe.analysis.tierComplexity || 0,
                        // Store essential issues (not the full array to save space)
                        hasIssues: (recipe.analysis.issues?.length || 0) > 0
                    } : null
                    // Exclude large fields: alternateComponents (can be regenerated)
                }));

                localStorage.setItem('building-recipes', JSON.stringify(compressedRecipes));
                console.log(`💾 Stored ${compressedRecipes.length} building recipes (compressed)`);
            } catch (error) {
                console.error('❌ Failed to save building recipes to localStorage:', error);

                // If storage fails, show user-friendly message and clear data
                if (error.name === 'QuotaExceededError') {
                    alert('Storage quota exceeded! Recipe data is too large for browser storage. Consider reducing the number of building recipes or clearing browser data.');

                    // Try to clear old data and save minimal version
                    try {
                        localStorage.clear(); // Clear all localStorage for this domain
                        const minimalRecipes = buildingRecipes.map(recipe => ({
                            outputID: recipe.outputID,
                            outputName: recipe.outputName,
                            outputTier: recipe.outputTier,
                            ingredients: recipe.ingredients,
                            id: recipe.id
                        }));
                        localStorage.setItem('building-recipes', JSON.stringify(minimalRecipes));
                        console.log('💾 Stored minimal building recipes after clearing storage');
                    } catch (secondError) {
                        console.error('❌ Failed to save even minimal data:', secondError);
                    }
                }
            }
        }
    }, [buildingRecipes]);

    // Get available resources categorized by tier and type from actual CSV data
    const getAvailableResources = () => {
        if (!recipes || recipes.length === 0) return { byTier: {}, byType: {}, byPlanet: {}, buildingResources: [] };

        const resourcesByTier = {};
        const resourcesByType = {};
        const resourcesByPlanet = {};
        const buildingResources = [];

        recipes.forEach(recipe => {
            const tier = recipe.outputTier || 1;
            const outputType = recipe.outputType;
            const planetTypes = recipe.planetTypes ? recipe.planetTypes.split(';') : ['All Types'];

            // Group by tier
            if (!resourcesByTier[tier]) resourcesByTier[tier] = [];
            resourcesByTier[tier].push(recipe);

            // Group by output type
            if (!resourcesByType[outputType]) resourcesByType[outputType] = [];
            resourcesByType[outputType].push(recipe);

            // Group by planet type
            planetTypes.forEach(planet => {
                const cleanPlanet = planet.trim();
                if (!resourcesByPlanet[cleanPlanet]) resourcesByPlanet[cleanPlanet] = [];
                resourcesByPlanet[cleanPlanet].push(recipe);
            });

            // Filter building resources based on BuildingResource column
            const buildingResourceFlag = recipe.BuildingResource || recipe.buildingResource;
            if (buildingResourceFlag === 'TRUE' || buildingResourceFlag === true) {
                buildingResources.push(recipe);
            }
        });

        // BuildingResource property is now correctly parsed from CSV

        console.log(`Found ${buildingResources.length} resources marked for building recipes (BuildingResource=TRUE)`);

        return {
            byTier: resourcesByTier,
            byType: resourcesByType,
            byPlanet: resourcesByPlanet,
            buildingResources: buildingResources
        };
    };

    // Get resources that have buildings (extractors or processors)
    const getResourcesWithBuildings = () => {
        const resourcesWithBuildings = new Set();

        buildings.forEach(building => {
            if (building.type === 'extractor') {
                const resourceName = building.buildingName.replace(/ Extractor T\d+$/, '');
                resourcesWithBuildings.add(resourceName);
            } else if (building.type === 'processor') {
                const resourceName = building.buildingName.replace(/ Processor T\d+$/, '');
                resourcesWithBuildings.add(resourceName);
            }
        });

        return resourcesWithBuildings;
    };

    // Analyze recipe difficulty with NATIVE RESOURCE VALIDATION
    const analyzeRecipeDifficulty = (recipe, targetBuilding) => {
        const analysis = {
            tierComplexity: 0,
            planetDependencies: new Set(),
            difficultyScore: 0,
            tierSpread: 0,
            nativePlanetMatch: false,
            isFullyNative: false,
            nonNativeDependencies: [],
            alternateComponentsUsed: recipe.alternateComponents?.length || 0,
            nativeResourceCompliance: 'unknown',
            issues: []
        };

        const targetPlanets = targetBuilding.planetType ? targetBuilding.planetType.split(';').map(p => p.trim()) : [];
        const targetResourceTier = recipe.targetResourceTier || 1;
        const baseComplexity = Math.max(targetBuilding.tier, targetResourceTier);
        const requiresNativeResources = targetBuilding.tier <= 2;

        // NATIVE RESOURCE ANALYSIS
        if (requiresNativeResources && targetPlanets.length > 0 && targetPlanets[0] !== 'All Types') {
            console.log(`🔍 Analyzing native compliance for ${recipe.outputName} on ${targetPlanets.join(', ')}`);

            let allIngredientsNative = true;
            const nonNativeDeps = [];

            recipe.ingredients.forEach(ingredient => {
                const nativeCheck = isRecipeChainNative(ingredient.name, targetPlanets);
                if (!nativeCheck.isNative) {
                    allIngredientsNative = false;
                    nonNativeDeps.push(...nativeCheck.nonNativeDependencies);
                    analysis.issues.push(`${ingredient.name} requires non-native resources: ${nativeCheck.nonNativeDependencies.join(', ')}`);
                }
            });

            analysis.isFullyNative = allIngredientsNative;
            analysis.nonNativeDependencies = [...new Set(nonNativeDeps)]; // Remove duplicates
            analysis.nativeResourceCompliance = allIngredientsNative ? 'FULLY_NATIVE' :
                (analysis.alternateComponentsUsed > 0 ? 'PARTIALLY_NATIVE' : 'NON_NATIVE');

            console.log(`📊 Native analysis for ${recipe.outputName}: ${analysis.nativeResourceCompliance} (${analysis.nonNativeDependencies.length} non-native deps)`);
        } else {
            analysis.nativeResourceCompliance = 'NOT_REQUIRED';
        }

        // STANDARD DIFFICULTY ANALYSIS
        recipe.ingredients.forEach(ingredient => {
            const ingredientData = recipes.find(r => r.outputName === ingredient.name);
            if (ingredientData) {
                const ingredientTier = ingredientData.outputTier || 1;
                const ingredientPlanets = ingredientData.planetTypes ? ingredientData.planetTypes.split(';').map(p => p.trim()) : [];

                analysis.tierComplexity = Math.max(analysis.tierComplexity, ingredientTier);

                // Add unique planet dependencies, excluding "All Types"
                ingredientPlanets.forEach(planet => {
                    const cleanPlanet = planet.trim();
                    if (cleanPlanet && cleanPlanet !== 'All Types' && cleanPlanet !== '') {
                        analysis.planetDependencies.add(cleanPlanet);
                    }
                });

                if (ingredientTier > baseComplexity) {
                    analysis.issues.push(`${ingredient.name} (T${ingredientTier}) is higher tier than expected (T${baseComplexity})`);
                }

                const hasCommonPlanet = targetPlanets.some(targetPlanet =>
                    ingredientPlanets.some(ingredientPlanet =>
                        ingredientPlanet.trim() === targetPlanet.trim()
                    )
                );
                if (hasCommonPlanet) analysis.nativePlanetMatch = true;
            } else {
                analysis.issues.push(`${ingredient.name} not found in component database`);
            }
        });

        analysis.tierSpread = Math.max(0, analysis.tierComplexity - baseComplexity);

        // ENHANCED DIFFICULTY SCORING with native resource penalties/bonuses
        let score = baseComplexity + // Base difficulty from resource tier
            ((analysis.planetDependencies?.size || analysis.planetDependenciesSize || 0) * 1.5) + // Planet complexity
            (analysis.tierSpread * 2) + // Tier spread penalty
            (recipe.ingredients.length * 0.5) + // Ingredient count
            ((analysis.issues?.length || analysis.issuesCount || 0) * 3); // Issues penalty

        // Native resource bonuses/penalties
        if (requiresNativeResources) {
            if (analysis.isFullyNative) {
                score = Math.max(0, score - 3); // Major bonus for fully native T1-T2 buildings
                analysis.issues.push('✅ FULLY NATIVE: All resources available on target planets');
            } else if (analysis.alternateComponentsUsed > 0) {
                score = Math.max(0, score - 1); // Minor bonus for using alternates
                analysis.issues.push(`🔧 PARTIALLY NATIVE: ${analysis.alternateComponentsUsed} alternate components generated`);
            } else {
                score += 2; // Penalty for non-native T1-T2 building
                analysis.issues.push('⚠️ NON-NATIVE: Requires resources from other planets');
            }
        }

        // Bonus for native planet match (reduces difficulty)
        if (analysis.nativePlanetMatch) {
            score = Math.max(0, score - 1);
        }

        analysis.difficultyScore = Math.round(score * 10) / 10; // Round to 1 decimal

        return analysis;
    };

    // Get base name without tier/number suffix for avoiding duplicates
    const getBaseName = (name) => {
        return name
            .replace(/\s*\d+$/, '') // Remove trailing numbers like "Crystal Lattice 1"
            .replace(/\s+(I{1,3}|IV|V|VI{0,3}|IX|X)$/, '') // Remove Roman numerals
            .replace(/\s+(One|Two|Three|Four|Five)$/i, '') // Remove written numbers
            .replace(/\s+(Mk|Mark)\s*\d+$/i, '') // Remove Mark/Mk numbers
            .replace(/\s+(Type|Model)\s*\d+$/i, '') // Remove Type/Model numbers
            .trim();
    };

    // Get resource tier that the building extracts/processes
    const getTargetResourceTier = (building) => {
        if (!building.buildingName) return 1;

        // Extract resource name from building name (remove extractor/processor and tier info)
        const resourceName = building.buildingName.replace(/(Extractor|Processor)\s+T\d+$/i, '').trim();

        // Find the resource in our recipes data
        const targetResource = recipes.find(r => r.outputName === resourceName);
        return targetResource?.outputTier || 1;
    };

    // NATIVE RESOURCE VALIDATION SYSTEM
    // Check if a component and its entire recipe chain are native to specified planets
    const isRecipeChainNative = (componentName, targetPlanets, checkedComponents = new Set()) => {
        // Prevent infinite recursion
        if (checkedComponents.has(componentName)) {
            return { isNative: true, nonNativeDependencies: [] }; // Already checked, assume OK
        }
        checkedComponents.add(componentName);

        // Find the component recipe
        const componentRecipe = recipes.find(r => r.outputName === componentName);
        if (!componentRecipe) {
            return { isNative: false, nonNativeDependencies: [`${componentName} (not found)`] };
        }

        // If it's a BASIC RESOURCE, check its planet availability
        if (componentRecipe.outputType === 'BASIC RESOURCE') {
            const resourcePlanets = componentRecipe.planetTypes ?
                componentRecipe.planetTypes.split(';').map(p => p.trim()) : [];
            const isNative = targetPlanets.some(targetPlanet =>
                resourcePlanets.includes(targetPlanet)
            );
            return {
                isNative: isNative,
                nonNativeDependencies: isNative ? [] : [`${componentName} (${resourcePlanets.join(', ')})`]
            };
        }

        // For COMPONENT/INGREDIENT, check all ingredients recursively
        const nonNativeDependencies = [];
        let allIngredientsNative = true;

        // Handle both old and new ingredient formats
        const ingredientsToCheck = [];

        if (componentRecipe.ingredients && Array.isArray(componentRecipe.ingredients)) {
            ingredientsToCheck.push(...componentRecipe.ingredients.map(ing => ing.name));
        } else {
            // Check Ingredient1, Ingredient2, etc.
            for (let i = 1; i <= 9; i++) {
                const ingredient = componentRecipe[`Ingredient${i}`];
                if (ingredient && ingredient.trim()) {
                    ingredientsToCheck.push(ingredient.trim());
                }
            }
        }

        for (const ingredientName of ingredientsToCheck) {
            const ingredientCheck = isRecipeChainNative(ingredientName, targetPlanets, new Set(checkedComponents));
            if (!ingredientCheck.isNative) {
                allIngredientsNative = false;
                nonNativeDependencies.push(...ingredientCheck.nonNativeDependencies);
            }
        }

        return {
            isNative: allIngredientsNative,
            nonNativeDependencies: nonNativeDependencies
        };
    };

    // ALTERNATE COMPONENT GENERATOR
    // Generate planet-specific alternate components (like "SAB_Power Router")
    const generateAlternateComponent = (originalComponent, targetPlanets, alternateVersion = '') => {
        const availableResources = getAvailableResources();

        // Create alternate component name
        const planetPrefix = targetPlanets.length === 1 ?
            getPlanetAbbreviation(targetPlanets[0]) : 'MULTI';
        const alternateName = `${planetPrefix}_${originalComponent.outputName}${alternateVersion}`;

        // Find native alternatives for each ingredient in the original recipe
        const alternateIngredients = [];
        const originalIngredients = [];

        // Extract original ingredients
        if (originalComponent.ingredients && Array.isArray(originalComponent.ingredients)) {
            originalIngredients.push(...originalComponent.ingredients);
        } else {
            for (let i = 1; i <= 9; i++) {
                const ingredient = originalComponent[`Ingredient${i}`];
                const quantity = originalComponent[`Quantity${i}`];
                if (ingredient && ingredient.trim()) {
                    originalIngredients.push({ name: ingredient.trim(), quantity: parseInt(quantity) || 1 });
                }
            }
        }

        // For each original ingredient, find native alternatives
        originalIngredients.forEach(ingredient => {
            const nativeCheck = isRecipeChainNative(ingredient.name, targetPlanets);

            if (nativeCheck.isNative) {
                // Original ingredient is already native, keep it
                alternateIngredients.push(ingredient);
            } else {
                // Find native alternative with same ComponentCategory/ResourceType
                const originalIngredientData = recipes.find(r => r.outputName === ingredient.name);
                if (originalIngredientData) {
                    const componentCategory = originalIngredientData.ComponentCategory ||
                        originalIngredientData.componentCategory;
                    const resourceType = originalIngredientData.ResourceType ||
                        originalIngredientData.resourceType;
                    const tier = originalIngredientData.outputTier || originalIngredientData.OutputTier;

                    // Find native alternatives with similar properties
                    const nativeAlternatives = availableResources.buildingResources.filter(candidate => {
                        if (!candidate.planetTypes) return false;

                        const candidatePlanets = candidate.planetTypes.split(';').map(p => p.trim());
                        const isNativeToTarget = targetPlanets.some(targetPlanet =>
                            candidatePlanets.includes(targetPlanet)
                        );

                        if (!isNativeToTarget) return false;

                        // Prefer same category and resource type
                        const candidateCategory = candidate.ComponentCategory || candidate.componentCategory;
                        const candidateResourceType = candidate.ResourceType || candidate.resourceType;
                        const candidateTier = candidate.outputTier || candidate.OutputTier;

                        // Must be same tier or lower, same resource type preferred
                        return candidateTier <= tier &&
                            (candidateResourceType === resourceType ||
                                candidateCategory === componentCategory);
                    });

                    if (nativeAlternatives.length > 0) {
                        // Select best alternative (prefer same tier, then same category)
                        const bestAlternative = nativeAlternatives.sort((a, b) => {
                            const aScore = ((a.outputTier || a.OutputTier) === tier ? 10 : 0) +
                                ((a.ResourceType === resourceType) ? 5 : 0) +
                                ((a.ComponentCategory === componentCategory) ? 3 : 0);
                            const bScore = ((b.outputTier || b.OutputTier) === tier ? 10 : 0) +
                                ((b.ResourceType === resourceType) ? 5 : 0) +
                                ((b.ComponentCategory === componentCategory) ? 3 : 0);
                            return bScore - aScore;
                        })[0];

                        alternateIngredients.push({
                            name: bestAlternative.outputName || bestAlternative.OutputName,
                            quantity: ingredient.quantity
                        });

                        console.log(`✅ Created native alternative: ${ingredient.name} → ${bestAlternative.outputName} for ${targetPlanets.join(', ')}`);
                    } else {
                        // No native alternative found, keep original but log warning
                        alternateIngredients.push(ingredient);
                        console.warn(`⚠️ No native alternative found for ${ingredient.name} on ${targetPlanets.join(', ')}`);
                    }
                } else {
                    // Original ingredient not found, keep as is
                    alternateIngredients.push(ingredient);
                }
            }
        });

        // Create the alternate component
        const alternateComponent = {
            ...originalComponent,
            outputName: alternateName,
            outputID: toKebabCase(alternateName),
            planetTypes: targetPlanets.join(';'),
            ingredients: alternateIngredients,
            isAlternateComponent: true,
            originalComponent: originalComponent.outputName,
            targetPlanets: targetPlanets
        };

        return alternateComponent;
    };

    // Get planet abbreviation for naming
    const getPlanetAbbreviation = (planetType) => {
        const abbreviations = {
            'System Asteroid Belt': 'SAB',
            'Terrestrial Planet': 'TERR',
            'Dark Planet': 'DARK',
            'Gas Giant': 'GAS',
            'Ice Giant': 'ICE',
            'Oceanic Planet': 'OCEAN',
            'Volcanic Planet': 'VOLC',
            'Barren Planet': 'BARREN'
        };
        return abbreviations[planetType] || planetType.substring(0, 4).toUpperCase();
    };

    // Helper function to get resource tier from extracted resource name
    const getExtractedResourceTier = (buildingName) => {
        if (!buildingName) return 1;

        // Extract the resource name from building name (remove extractor and tier info)
        const resourceName = buildingName.replace(/-extractor-t\d+/i, '').replace(/\s+extractor\s+t\d+/i, '');

        // Find the resource in our available resources to get its tier
        const availableResources = getAvailableResources();

        // Collect all resources from different categories
        const allResources = [];

        // Add basic resources
        if (availableResources.byType && availableResources.byType['BASIC RESOURCE']) {
            allResources.push(...availableResources.byType['BASIC RESOURCE']);
        }

        // Add components
        if (availableResources.byType && availableResources.byType['COMPONENT']) {
            allResources.push(...availableResources.byType['COMPONENT']);
        }

        // Add ingredients
        if (availableResources.byType && availableResources.byType['INGREDIENT']) {
            allResources.push(...availableResources.byType['INGREDIENT']);
        }

        // Add building resources
        if (availableResources.buildingResources && Array.isArray(availableResources.buildingResources)) {
            allResources.push(...availableResources.buildingResources);
        }

        const resource = allResources.find(r => {
            const rName = (r.outputName || r.OutputName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const bName = resourceName.toLowerCase().replace(/[^a-z0-9]/g, '');
            return rName === bName || rName.includes(bName) || bName.includes(rName);
        });

        return resource ? (resource.outputTier || resource.OutputTier || 1) : 1;
    };

    // Helper function to get planet-specific component prefixes
    const getPlanetPrefix = (planetType) => {
        const prefixMap = {
            'Terrestrial Planet': 'TERR',
            'System Asteroid Belt': 'SAB',
            'Gas Giant': 'GAS',
            'Oceanic Planet': 'OCEAN',
            'Volcanic Planet': 'VOLCANO',
            'Ice Giant': 'ICE',
            'Dark Planet': 'DARK',
            'Barren Planet': 'BARREN'
        };
        return prefixMap[planetType] || 'MULTI';
    };

    // Helper function to generate planet-specific alternate component
    const generatePlanetSpecificAlternate = (originalComponent, planetType, resourceTier) => {
        const prefix = getPlanetPrefix(planetType);
        const originalName = originalComponent.outputName || originalComponent.OutputName;

        return {
            outputID: `${prefix.toLowerCase()}-${toKebabCase(originalName)}`,
            outputName: `${prefix}_${originalName}`,
            outputType: 'COMPONENT',
            outputTier: originalComponent.outputTier || originalComponent.OutputTier || resourceTier,
            componentCategory: originalComponent.ComponentCategory || originalComponent.componentCategory || '',
            resourceType: originalComponent.ResourceType || originalComponent.resourceType || '',
            planetTypes: planetType,
            constructionTime: Math.max(300, (originalComponent.outputTier || 1) * 300),
            isAlternate: true,
            originalComponent: originalName,
            alternateFor: planetType
        };
    };

    // Helper function to get component tier ranges based on extracted resource tier and building tier
    // CORE RULE: No component can be higher tier than the resource being extracted
    const getComponentTierRange = (extractedResourceTier, buildingTier) => {
        const ranges = {
            1: { // T1 Resource Extractors - Max component tier: T1 (capped at resource tier)
                1: [1, 1],     // T1 Building: T1 components
                2: [1, 1],     // T2 Building: T1 components  
                3: [1, 1],     // T3 Building: T1 components (was T1-T2, now capped)
                4: [1, 1],     // T4 Building: T1 components (was T1-T2, now capped)
                5: [1, 1]      // T5 Building: T1 components (was T1-T2, now capped)
            },
            2: { // T2 Resource Extractors - Max component tier: T2 (capped at resource tier)
                1: [1, 2],     // T1 Building: T1-T2 components
                2: [1, 2],     // T2 Building: T1-T2 components
                3: [2, 2],     // T3 Building: T2 components
                4: [2, 2],     // T4 Building: T2 components (was T2-T3, now capped)
                5: [2, 2]      // T5 Building: T2 components (was T2-T3, now capped)
            },
            3: { // T3 Resource Extractors - Max component tier: T3 (capped at resource tier)
                1: [1, 2],     // T1 Building: T1-T2 components
                2: [2, 2],     // T2 Building: T2 components
                3: [2, 3],     // T3 Building: T2-T3 components
                4: [3, 3],     // T4 Building: T3 components
                5: [3, 3]      // T5 Building: T3 components (was T3-T4, now capped)
            },
            4: { // T4 Resource Extractors - Max component tier: T4 (capped at resource tier)
                1: [2, 2],     // T1 Building: T2 components
                2: [2, 3],     // T2 Building: T2-T3 components
                3: [3, 4],     // T3 Building: T3-T4 components
                4: [4, 4],     // T4 Building: T4 components
                5: [4, 4]      // T5 Building: T4 components (was T4-T5, now CAPPED at T4)
            },
            5: { // T5 Resource Extractors - Max component tier: T5 (already at max)
                1: [2, 3],     // T1 Building: T2-T3 components
                2: [3, 3],     // T2 Building: T3 components
                3: [3, 4],     // T3 Building: T3-T4 components
                4: [4, 5],     // T4 Building: T4-T5 components
                5: [5, 5]      // T5 Building: T5 components
            }
        };

        const range = ranges[extractedResourceTier]?.[buildingTier] || [1, Math.min(buildingTier, extractedResourceTier)];

        // Double-check: ensure max tier never exceeds extracted resource tier
        const [minTier, maxTier] = range;
        const cappedMaxTier = Math.min(maxTier, extractedResourceTier);

        return [minTier, cappedMaxTier];
    };

    // Helper function to generate progressive building recipes that build upon each other
    const generateProgressiveBuildingRecipes = (buildingFamily) => {
        // Group buildings by base name (without tier)
        const baseName = buildingFamily[0].buildingName.replace(/-t\d+/i, '').replace(/\s+t\d+/i, '');
        const buildingPlanets = buildingFamily[0].planetType ? buildingFamily[0].planetType.split(';').map(p => p.trim()) : [];
        const extractedResourceTier = getExtractedResourceTier(buildingFamily[0].buildingName);

        console.log(`🏗️ Generating PROGRESSIVE recipes for ${baseName} family (Resource T${extractedResourceTier}) on planets: ${buildingPlanets.join(', ')}`);

        const availableResources = getAvailableResources();

        // Component count rules: T1=3, T2=4, T3=5, T4=6, T5=7-8
        const componentCounts = { 1: 3, 2: 4, 3: 5, 4: 6, 5: Math.floor(Math.random() * 2) + 7 };

        // Storage for progressive recipe building
        let cumulativeIngredients = [];
        let allGeneratedAlternates = [];
        const tierRecipes = {};

        // Generate recipes for each tier progressively
        for (let tier = 1; tier <= 5; tier++) {
            const building = buildingFamily.find(b => b.tier === tier);
            if (!building) continue;

            const targetComponentCount = componentCounts[tier] || 3;
            const [minTier, maxTier] = getComponentTierRange(extractedResourceTier, tier);

            console.log(`📊 T${tier}: Adding ${targetComponentCount - cumulativeIngredients.length} new components to existing ${cumulativeIngredients.length}`);

            // Get available components within tier range (excluding already used ones)
            const candidateComponents = availableResources.buildingResources.filter(resource => {
                if (!['COMPONENT', 'INGREDIENT'].includes(resource.outputType)) return false;
                const resourceTier = resource.outputTier || resource.OutputTier || 1;
                const componentName = resource.outputName || resource.OutputName;

                // Exclude already selected components
                const alreadyUsed = cumulativeIngredients.some(ing => ing.name === componentName);

                return resourceTier >= minTier && resourceTier <= maxTier && !alreadyUsed;
            });

            // Calculate how many new components to add
            const newComponentsNeeded = targetComponentCount - cumulativeIngredients.length;
            let newIngredients = [];
            let tierGeneratedAlternates = [];

            // NATIVE BUILDING REQUIREMENTS FOR T1-T3
            const requiresNativeCompliance = tier <= 3;
            let nativeCompliance = 'NOT_REQUIRED';

            if (requiresNativeCompliance && buildingPlanets.length > 0 && buildingPlanets[0] !== 'All Types') {
                console.log(`🌍 T${tier} NATIVE COMPLIANCE: Adding ${newComponentsNeeded} native components`);

                // For T1, establish base components; for T2-T3, add complementary components
                if (tier === 1) {
                    // T1: Establish foundation with power and structural components
                    const componentsByFunction = {
                        power: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const name = (r.outputName || r.OutputName || '').toLowerCase();
                            return category.includes('energy') || name.includes('power') || name.includes('energy');
                        }),
                        structural: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const resourceType = (r.ResourceType || r.resourceType || '').toLowerCase();
                            return category.includes('kinetic') || category.includes('habitat') ||
                                resourceType.includes('industrial') || resourceType.includes('structure');
                        }),
                        control: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const name = (r.outputName || r.OutputName || '').toLowerCase();
                            return category.includes('em') || category.includes('utility') ||
                                name.includes('control') || name.includes('processor') || name.includes('circuit');
                        })
                    };

                    const primaryPlanet = buildingPlanets[0];

                    // Add power component
                    let powerComponent = componentsByFunction.power.find(c => {
                        const planetTypes = (c.planetTypes || c.PlanetTypes || '').split(';').map(p => p.trim());
                        return planetTypes.includes(primaryPlanet);
                    });

                    if (!powerComponent && componentsByFunction.power.length > 0) {
                        const originalPower = componentsByFunction.power[0];
                        powerComponent = generatePlanetSpecificAlternate(originalPower, primaryPlanet, extractedResourceTier);
                        tierGeneratedAlternates.push(powerComponent);
                        console.log(`🔋 T${tier}: Generated alternate power component: ${powerComponent.outputName}`);
                    }

                    if (powerComponent) {
                        newIngredients.push(powerComponent.outputName || powerComponent.OutputName);
                    }

                    // Add structural component
                    let structuralComponent = componentsByFunction.structural.find(c => {
                        const name = c.outputName || c.OutputName;
                        if (newIngredients.includes(name)) return false;
                        const planetTypes = (c.planetTypes || c.PlanetTypes || '').split(';').map(p => p.trim());
                        return planetTypes.includes(primaryPlanet);
                    });

                    if (!structuralComponent && componentsByFunction.structural.length > 0) {
                        const availableStructural = componentsByFunction.structural.filter(c =>
                            !newIngredients.includes(c.outputName || c.OutputName));
                        if (availableStructural.length > 0) {
                            const originalStructural = availableStructural[0];
                            structuralComponent = generatePlanetSpecificAlternate(originalStructural, primaryPlanet, extractedResourceTier);
                            tierGeneratedAlternates.push(structuralComponent);
                            console.log(`🏗️ T${tier}: Generated alternate structural component: ${structuralComponent.outputName}`);
                        }
                    }

                    if (structuralComponent) {
                        newIngredients.push(structuralComponent.outputName || structuralComponent.OutputName);
                    }

                    // Fill remaining T1 slots
                    while (newIngredients.length < newComponentsNeeded) {
                        let nextComponent = componentsByFunction.control.find(c => {
                            const name = c.outputName || c.OutputName;
                            if (newIngredients.includes(name)) return false;
                            const planetTypes = (c.planetTypes || c.PlanetTypes || '').split(';').map(p => p.trim());
                            return planetTypes.includes(primaryPlanet);
                        });

                        if (!nextComponent && componentsByFunction.control.length > 0) {
                            const availableControl = componentsByFunction.control.filter(c =>
                                !newIngredients.includes(c.outputName || c.OutputName));
                            if (availableControl.length > 0) {
                                const original = availableControl[0];
                                nextComponent = generatePlanetSpecificAlternate(original, primaryPlanet, extractedResourceTier);
                                tierGeneratedAlternates.push(nextComponent);
                                console.log(`🔧 T${tier}: Generated alternate control component: ${nextComponent.outputName}`);
                            }
                        }

                        if (nextComponent) {
                            newIngredients.push(nextComponent.outputName || nextComponent.OutputName);
                        } else {
                            break;
                        }
                    }
                } else {
                    // T2-T3: Add complementary native components
                    const primaryPlanet = buildingPlanets[0];
                    for (let i = 0; i < newComponentsNeeded; i++) {
                        let nextComponent = candidateComponents.find(c => {
                            const planetTypes = (c.planetTypes || c.PlanetTypes || '').split(';').map(p => p.trim());
                            return planetTypes.includes(primaryPlanet);
                        });

                        if (!nextComponent && candidateComponents.length > 0) {
                            const original = candidateComponents[Math.floor(Math.random() * candidateComponents.length)];
                            nextComponent = generatePlanetSpecificAlternate(original, primaryPlanet, extractedResourceTier);
                            tierGeneratedAlternates.push(nextComponent);
                            console.log(`🔧 T${tier}: Generated alternate component: ${nextComponent.outputName}`);
                        }

                        if (nextComponent) {
                            newIngredients.push(nextComponent.outputName || nextComponent.OutputName);
                            // Remove from candidates to avoid duplicates
                            const componentName = nextComponent.outputName || nextComponent.OutputName;
                            const index = candidateComponents.findIndex(c => (c.outputName || c.OutputName) === componentName);
                            if (index > -1) candidateComponents.splice(index, 1);
                        }
                    }
                }

                nativeCompliance = tierGeneratedAlternates.length > 0 ? 'PARTIALLY_NATIVE' : 'FULLY_NATIVE';
                console.log(`🏠 T${tier} NATIVE: Added ${newIngredients.length} components (${tierGeneratedAlternates.length} alternates)`);

            } else {
                // T4-T5: Add imported/advanced components
                console.log(`🌐 T${tier} FLEXIBLE: Adding ${newComponentsNeeded} advanced components`);

                // Smart selection for higher-tier components
                const categoryPools = [
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('ENERGY')),
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('KINETIC')),
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('EM')),
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('UTILITY')),
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('HABITAT')),
                    candidateComponents.filter(r => (r.ComponentCategory || '').includes('THERMAL'))
                ];

                let poolIndex = 0;
                while (newIngredients.length < newComponentsNeeded && candidateComponents.length > 0) {
                    const currentPool = categoryPools[poolIndex % categoryPools.length];
                    const available = currentPool.filter(c => !newIngredients.includes(c.outputName || c.OutputName));

                    if (available.length > 0) {
                        const selected = available[Math.floor(Math.random() * available.length)];
                        newIngredients.push(selected.outputName || selected.OutputName);
                        // Remove from all pools to avoid duplicates
                        const componentName = selected.outputName || selected.OutputName;
                        categoryPools.forEach(pool => {
                            const index = pool.findIndex(c => (c.outputName || c.OutputName) === componentName);
                            if (index > -1) pool.splice(index, 1);
                        });
                    } else {
                        // Fallback to any available component
                        const fallback = candidateComponents[0];
                        if (fallback) {
                            newIngredients.push(fallback.outputName || fallback.OutputName);
                            candidateComponents.shift();
                        }
                    }
                    poolIndex++;
                }

                nativeCompliance = 'NOT_REQUIRED';
                console.log(`🌐 T${tier} FLEXIBLE: Added ${newIngredients.length} advanced components`);
            }

            // Add new ingredients to cumulative list
            newIngredients.forEach((ingredient, index) => {
                cumulativeIngredients.push({
                    name: ingredient,
                    quantity: 1,
                    slot: cumulativeIngredients.length + index + 1
                });
            });

            // Track generated alternates
            allGeneratedAlternates.push(...tierGeneratedAlternates);

            // Calculate construction time: (Resource Tier × Building Tier × 300) seconds
            const constructionTime = extractedResourceTier * tier * 300;
            const [recipeTierMin, recipeTierMax] = getComponentTierRange(extractedResourceTier, tier);

            // Create the recipe object for this tier
            const buildingKebabName = toKebabCase(building.buildingName);
            tierRecipes[tier] = {
                outputID: buildingKebabName,
                outputName: building.buildingName,
                outputType: 'BUILDING',
                outputTier: tier,
                constructionTime: constructionTime,
                planetTypes: building.planetType || 'All Types',
                factions: building.faction || 'MUD;ONI;USTUR',
                resourceType: 'STRUCTURE',
                functionalPurpose: building.type?.toUpperCase() || 'EXTRACTOR',
                usageCategory: 'BUILDING',
                completionStatus: 'complete',
                productionSteps: tier,
                extractedResourceTier: extractedResourceTier,
                nativeCompliance: nativeCompliance,
                requiresNativeResources: requiresNativeCompliance,
                generatedAlternates: [...tierGeneratedAlternates],
                componentTierRange: `T${recipeTierMin}-T${recipeTierMax}`,
                ingredients: [...cumulativeIngredients], // Copy the cumulative ingredients
                newComponentsThisTier: newIngredients // Track what was added this tier
            };

            console.log(`✅ T${tier} Recipe: ${tierRecipes[tier].outputName} | ${tierRecipes[tier].ingredients.length} total components | ${newIngredients.length} new | ${constructionTime}s | ${nativeCompliance}`);
        }

        return Object.values(tierRecipes);
    };

    // Generate recipe for a building using PROGRESSIVE UPGRADE APPROACH
    const generateBuildingRecipe = (building) => {
        // This function is called for individual buildings, but we'll handle it differently
        // We'll group buildings by family and generate progressive recipes
        return building; // Return the building as-is, will be processed in generateBuildingRecipes
    };

    // Generate comprehensive alternates report
    const generateAlternatesReport = () => {
        console.log('🔍 Generating comprehensive alternates analysis report...');

        if (!buildings || buildings.length === 0) {
            alert('No buildings available. Please load building data first.');
            return;
        }

        const availableResources = getAvailableResources();
        const alternatesNeeded = new Map(); // Key: alternate name, Value: alternate details

        // Group buildings by families
        const buildingFamilies = {};
        buildings.forEach(building => {
            const baseName = building.buildingName.replace(/-t\d+/i, '').replace(/\s+t\d+/i, '');
            if (!buildingFamilies[baseName]) {
                buildingFamilies[baseName] = [];
            }
            buildingFamilies[baseName].push(building);
        });

        // Analyze each building family to identify needed alternates
        Object.entries(buildingFamilies).forEach(([familyName, familyBuildings]) => {
            familyBuildings.sort((a, b) => a.tier - b.tier);

            const extractedResourceTier = getExtractedResourceTier(familyBuildings[0].buildingName);
            const buildingPlanets = familyBuildings[0].planetType ? familyBuildings[0].planetType.split(';').map(p => p.trim()) : [];

            if (buildingPlanets.length === 0 || buildingPlanets[0] === 'All Types') return;

            // Check each tier for needed alternates
            familyBuildings.forEach(building => {
                const tier = building.tier;
                const requiresNativeCompliance = tier <= 3;

                if (!requiresNativeCompliance) return;

                const [minTier, maxTier] = getComponentTierRange(extractedResourceTier, tier);

                // Get candidate components for this building tier
                const candidateComponents = availableResources.buildingResources.filter(resource => {
                    if (!['COMPONENT', 'INGREDIENT'].includes(resource.outputType)) return false;
                    const resourceTier = resource.outputTier || resource.OutputTier || 1;
                    return resourceTier >= minTier && resourceTier <= maxTier;
                });

                // Check each planet for needed alternates
                buildingPlanets.forEach(planetType => {
                    const prefix = getPlanetPrefix(planetType);

                    // Categorize components by function
                    const componentsByFunction = {
                        power: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const name = (r.outputName || r.OutputName || '').toLowerCase();
                            return category.includes('energy') || name.includes('power') || name.includes('energy');
                        }),
                        structural: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const resourceType = (r.ResourceType || r.resourceType || '').toLowerCase();
                            return category.includes('kinetic') || category.includes('habitat') ||
                                resourceType.includes('industrial') || resourceType.includes('structure');
                        }),
                        control: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            const name = (r.outputName || r.OutputName || '').toLowerCase();
                            return category.includes('em') || category.includes('utility') ||
                                name.includes('control') || name.includes('processor') || name.includes('circuit');
                        }),
                        specialized: candidateComponents.filter(r => {
                            const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                            return category.includes('thermal') || category.includes('weapons') ||
                                category.includes('propulsion') || category.includes('defensive');
                        })
                    };

                    // Check which components need alternates for this planet
                    Object.entries(componentsByFunction).forEach(([functionType, components]) => {
                        components.forEach(originalComponent => {
                            const planetTypes = (originalComponent.planetTypes || originalComponent.PlanetTypes || '').split(';').map(p => p.trim());

                            // If component is not natively available on this planet, it needs an alternate
                            if (!planetTypes.includes(planetType)) {
                                const alternateKey = `${prefix}_${originalComponent.outputName || originalComponent.OutputName}`;

                                if (!alternatesNeeded.has(alternateKey)) {
                                    const componentTier = originalComponent.outputTier || originalComponent.OutputTier || 1;

                                    // Get available resources for creating this alternate (equal or lower tier)
                                    const availableForRecipe = {
                                        basicResources: [],
                                        components: []
                                    };

                                    // Add basic resources of equal or lower tier
                                    if (availableResources.byType['BASIC RESOURCE']) {
                                        availableResources.byType['BASIC RESOURCE'].forEach(resource => {
                                            const resourceTier = resource.outputTier || resource.OutputTier || 1;
                                            if (resourceTier <= componentTier) {
                                                availableForRecipe.basicResources.push({
                                                    name: resource.outputName || resource.OutputName,
                                                    tier: resourceTier,
                                                    category: resource.ComponentCategory || resource.componentCategory || '',
                                                    resourceType: resource.ResourceType || resource.resourceType || '',
                                                    planetTypes: resource.planetTypes || resource.PlanetTypes || ''
                                                });
                                            }
                                        });
                                    }

                                    // Add components of equal or lower tier
                                    if (availableResources.byType['COMPONENT']) {
                                        availableResources.byType['COMPONENT'].forEach(resource => {
                                            const resourceTier = resource.outputTier || resource.OutputTier || 1;
                                            if (resourceTier <= componentTier) {
                                                availableForRecipe.components.push({
                                                    name: resource.outputName || resource.OutputName,
                                                    tier: resourceTier,
                                                    category: resource.ComponentCategory || resource.componentCategory || '',
                                                    resourceType: resource.ResourceType || resource.resourceType || '',
                                                    planetTypes: resource.planetTypes || resource.PlanetTypes || ''
                                                });
                                            }
                                        });
                                    }

                                    alternatesNeeded.set(alternateKey, {
                                        alternateName: alternateKey,
                                        planetType: planetType,
                                        planetPrefix: prefix,
                                        originalComponent: {
                                            name: originalComponent.outputName || originalComponent.OutputName,
                                            tier: componentTier,
                                            category: originalComponent.ComponentCategory || originalComponent.componentCategory || '',
                                            resourceType: originalComponent.ResourceType || originalComponent.resourceType || '',
                                            functionType: functionType
                                        },
                                        usedInBuildings: [],
                                        availableResources: availableForRecipe,
                                        suggestedRecipe: []
                                    });
                                }

                                // Track which buildings need this alternate
                                const alternate = alternatesNeeded.get(alternateKey);
                                const buildingInfo = `${building.buildingName} (${familyName} T${tier})`;
                                if (!alternate.usedInBuildings.includes(buildingInfo)) {
                                    alternate.usedInBuildings.push(buildingInfo);
                                }
                            }
                        });
                    });
                });
            });
        });

        // Generate suggested recipes for each alternate
        alternatesNeeded.forEach((alternate, alternateName) => {
            const originalTier = alternate.originalComponent.tier;
            const planetType = alternate.planetType;

            // Find planet-native resources to create suggested recipe
            const nativeBasicResources = alternate.availableResources.basicResources.filter(r => {
                const resourcePlanets = r.planetTypes.split(';').map(p => p.trim());
                return resourcePlanets.includes(planetType);
            });

            const nativeComponents = alternate.availableResources.components.filter(r => {
                const resourcePlanets = r.planetTypes.split(';').map(p => p.trim());
                return resourcePlanets.includes(planetType);
            });

            // Create suggested recipe (2-3 ingredients)
            const suggestedRecipe = [];

            // Prefer basic resources from the same planet
            if (nativeBasicResources.length > 0) {
                // Add 1-2 basic resources
                const primaryResource = nativeBasicResources.find(r => r.tier === originalTier) || nativeBasicResources[0];
                suggestedRecipe.push({
                    name: primaryResource.name,
                    tier: primaryResource.tier,
                    quantity: Math.max(1, originalTier),
                    type: 'BASIC RESOURCE',
                    reason: 'Primary material base'
                });

                if (nativeBasicResources.length > 1 && suggestedRecipe.length < 3) {
                    const secondaryResource = nativeBasicResources.find(r => r.name !== primaryResource.name);
                    if (secondaryResource) {
                        suggestedRecipe.push({
                            name: secondaryResource.name,
                            tier: secondaryResource.tier,
                            quantity: 1,
                            type: 'BASIC RESOURCE',
                            reason: 'Secondary material'
                        });
                    }
                }
            }

            // Add one component if available and needed
            if (nativeComponents.length > 0 && suggestedRecipe.length < 3) {
                const lowerTierComponent = nativeComponents.find(r => r.tier < originalTier);
                if (lowerTierComponent) {
                    suggestedRecipe.push({
                        name: lowerTierComponent.name,
                        tier: lowerTierComponent.tier,
                        quantity: 1,
                        type: 'COMPONENT',
                        reason: 'Processing enhancement'
                    });
                }
            }

            alternate.suggestedRecipe = suggestedRecipe;
        });

        // Generate OPTIMIZED report for AI agent processing
        const optimizedReport = {
            summary: {
                totalAlternates: alternatesNeeded.size,
                buildingFamilies: Object.keys(buildingFamilies).length,
                generatedOn: new Date().toISOString()
            },
            alternates: []
        };

        // Convert to simple array format
        alternatesNeeded.forEach((alternate, name) => {
            const optimizedAlternate = {
                name: alternate.alternateName,
                original: alternate.originalComponent.name,
                tier: alternate.originalComponent.tier,
                planet: alternate.planetType,
                category: alternate.originalComponent.category,
                usageCount: alternate.usedInBuildings.length,
                recipe: alternate.suggestedRecipe.map(ing => ({
                    ingredient: ing.name,
                    tier: ing.tier,
                    quantity: ing.quantity,
                    type: ing.type
                }))
            };
            optimizedReport.alternates.push(optimizedAlternate);
        });

        // Sort by tier then by name for logical ordering
        optimizedReport.alternates.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

        // Create compact text format for AI agent
        const reportLines = [];
        reportLines.push('# ALTERNATES CREATION DATA');
        reportLines.push(`Total: ${optimizedReport.summary.totalAlternates} alternates needed`);
        reportLines.push('');
        reportLines.push('FORMAT: AlternateName | OriginalComponent | Tier | Planet | Category | UsageCount | Recipe');
        reportLines.push('');

        optimizedReport.alternates.forEach(alt => {
            const recipeStr = alt.recipe.map(r => `${r.ingredient}×${r.quantity}`).join('+') || 'NO_RECIPE';
            reportLines.push(`${alt.name} | ${alt.original} | T${alt.tier} | ${alt.planet} | ${alt.category} | ${alt.usageCount}x | ${recipeStr}`);
        });

        // Also create a JSON version for structured processing
        const jsonReport = JSON.stringify(optimizedReport, null, 2);

        // Display both formats
        const reportContent = reportLines.join('\n');
        console.log('📋 OPTIMIZED ALTERNATES REPORT GENERATED');
        console.log('=== TEXT FORMAT ===');
        console.log(reportContent);
        console.log('');
        console.log('=== JSON FORMAT ===');
        console.log(jsonReport);

        // Create downloadable files (both text and JSON formats)
        const dateStr = new Date().toISOString().split('T')[0];

        // Create compact text file
        const textBlob = new Blob([reportContent], { type: 'text/plain' });
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = `alternates-compact-${dateStr}.txt`;
        document.body.appendChild(textLink);
        textLink.click();
        document.body.removeChild(textLink);
        URL.revokeObjectURL(textUrl);

        // Create JSON file for structured processing
        const jsonBlob = new Blob([jsonReport], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `alternates-data-${dateStr}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        URL.revokeObjectURL(jsonUrl);

        alert(`✅ Optimized alternates report generated!\n\n• ${alternatesNeeded.size} alternates needed\n• 2 files downloaded:\n  - Compact text format (.txt)\n  - Structured JSON format (.json)\n\nBoth formats optimized for AI agent processing.`);
    };

    // Clear building recipes from storage and memory
    const clearBuildingRecipes = () => {
        if (window.confirm('Are you sure you want to clear all building recipes? This action cannot be undone.')) {
            setBuildingRecipes([]);
            localStorage.removeItem('building-recipes');
            console.log('🗑️ Building recipes cleared from storage and memory');
            alert('Building recipes cleared successfully!');
        }
    };

    // Generate all building recipes with progressive upgrade analysis
    const generateBuildingRecipes = () => {
        console.log('Generating PROGRESSIVE building recipes for', buildings.length, 'buildings');

        // Group buildings by their base name (building family)
        const buildingFamilies = {};
        buildings.forEach(building => {
            const baseName = building.buildingName.replace(/-t\d+/i, '').replace(/\s+t\d+/i, '');
            if (!buildingFamilies[baseName]) {
                buildingFamilies[baseName] = [];
            }
            buildingFamilies[baseName].push(building);
        });

        console.log(`📊 Found ${Object.keys(buildingFamilies).length} building families to process`);

        // Generate progressive recipes for each family
        const allProgressiveRecipes = [];
        Object.entries(buildingFamilies).forEach(([familyName, familyBuildings]) => {
            // Sort buildings by tier
            familyBuildings.sort((a, b) => a.tier - b.tier);

            console.log(`🏗️ Processing ${familyName} family with ${familyBuildings.length} tiers`);

            // Generate progressive recipes for this family
            const progressiveRecipes = generateProgressiveBuildingRecipes(familyBuildings);

            // Add analysis and IDs to each recipe
            progressiveRecipes.forEach(recipe => {
                const correspondingBuilding = familyBuildings.find(b => b.tier === recipe.outputTier);
                const analysis = analyzeRecipeDifficulty(recipe, correspondingBuilding);

                const enrichedRecipe = {
                    ...recipe,
                    analysis: analysis,
                    id: `${recipe.outputID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    buildingFamily: familyName,
                    isProgressive: true
                };

                allProgressiveRecipes.push(enrichedRecipe);
            });
        });

        setBuildingRecipes(allProgressiveRecipes);
        console.log(`✅ Generated ${allProgressiveRecipes.length} progressive building recipes across ${Object.keys(buildingFamilies).length} families`);

        // Log summary of progressive features
        const nativeRecipes = allProgressiveRecipes.filter(r => r.nativeCompliance !== 'NOT_REQUIRED').length;
        const alternatesGenerated = allProgressiveRecipes.reduce((sum, r) => sum + (r.generatedAlternates?.length || 0), 0);

        console.log(`📈 Progressive Recipe Summary:`);
        console.log(`   • ${nativeRecipes} native-compliant recipes (T1-T3)`);
        console.log(`   • ${alternatesGenerated} planet-specific alternates generated`);
        console.log(`   • Recipes build upon each other within families`);
        console.log(`   • Component count progression: T1=3 → T2=4 → T3=5 → T4=6 → T5=7-8`);
    };

    // Update recipe
    const updateRecipe = (recipeId, field, value) => {
        setBuildingRecipes(prev => prev.map(recipe =>
            recipe.id === recipeId
                ? { ...recipe, [field]: value }
                : recipe
        ));
    };

    // Add ingredient to recipe
    const addIngredientToRecipe = (recipeId, ingredientName) => {
        setBuildingRecipes(prev => prev.map(recipe => {
            if (recipe.id === recipeId) {
                const newIngredients = [...recipe.ingredients];
                const nextSlot = Math.max(...newIngredients.map(ing => ing.slot), 0) + 1;
                newIngredients.push({
                    name: ingredientName,
                    quantity: 1,
                    slot: nextSlot
                });
                const updatedRecipe = { ...recipe, ingredients: newIngredients };

                // Update editingRecipe state if this is the recipe being edited
                if (editingRecipe && editingRecipe.id === recipeId) {
                    setEditingRecipe(updatedRecipe);
                }

                return updatedRecipe;
            }
            return recipe;
        }));
    };

    // Remove ingredient from recipe
    const removeIngredientFromRecipe = (recipeId, slot) => {
        setBuildingRecipes(prev => prev.map(recipe => {
            if (recipe.id === recipeId) {
                const newIngredients = recipe.ingredients.filter(ing => ing.slot !== slot);
                const updatedRecipe = { ...recipe, ingredients: newIngredients };

                // Update editingRecipe state if this is the recipe being edited
                if (editingRecipe && editingRecipe.id === recipeId) {
                    setEditingRecipe(updatedRecipe);
                }

                return updatedRecipe;
            }
            return recipe;
        }));
    };

    // Export building recipes to CSV
    const exportBuildingRecipesToCSV = () => {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'ProductionSteps', 'RequiresNativeResources', 'NativeCompliance', 'AlternateComponentsUsed'
        ];

        const escapeCSVValue = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvContent = [
            headers.join(','),
            ...buildingRecipes.map(recipe => {
                const row = [
                    escapeCSVValue(recipe.outputID),
                    escapeCSVValue(recipe.outputName),
                    escapeCSVValue(recipe.outputType),
                    escapeCSVValue(recipe.outputTier),
                    escapeCSVValue(recipe.constructionTime),
                    escapeCSVValue(recipe.planetTypes),
                    escapeCSVValue(recipe.factions),
                    escapeCSVValue(recipe.resourceType),
                    escapeCSVValue(recipe.functionalPurpose),
                    escapeCSVValue(recipe.usageCategory)
                ];

                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe.ingredients.find(ing => ing.slot === i);
                    row.push(escapeCSVValue(ingredient ? ingredient.name : ''));
                    row.push(escapeCSVValue(ingredient ? ingredient.quantity : ''));
                }

                row.push(escapeCSVValue(recipe.completionStatus));
                row.push(escapeCSVValue(recipe.productionSteps));
                row.push(escapeCSVValue(recipe.requiresNativeResources || false));
                row.push(escapeCSVValue(recipe.analysis?.nativeResourceCompliance || 'UNKNOWN'));
                row.push(escapeCSVValue(recipe.analysis?.alternateComponentsUsed || 0));

                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'building-recipes-with-native-analysis.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // NATIVE RESOURCE ANALYSIS & REPORTING FUNCTIONS

    // Generate native resource compliance report
    const generateNativeResourceReport = () => {
        const availableResources = getAvailableResources();
        const t1t2Buildings = buildingRecipes.filter(recipe => recipe.outputTier <= 2);

        const report = {
            totalBuildings: buildingRecipes.length,
            t1t2Buildings: t1t2Buildings.length,
            buildingResourcesAvailable: availableResources.buildingResources.length,
            complianceStats: {
                fullyNative: 0,
                partiallyNative: 0,
                nonNative: 0,
                notRequired: 0
            },
            planetAnalysis: {},
            alternateComponentsGenerated: 0,
            commonNativeGaps: {}
        };

        // Analyze compliance by planet type
        t1t2Buildings.forEach(recipe => {
            const compliance = recipe.analysis?.nativeResourceCompliance || 'UNKNOWN';
            const planets = recipe.planetTypes ? recipe.planetTypes.split(';').map(p => p.trim()) : ['All Types'];

            // Update compliance stats
            switch (compliance) {
                case 'FULLY_NATIVE': report.complianceStats.fullyNative++; break;
                case 'PARTIALLY_NATIVE': report.complianceStats.partiallyNative++; break;
                case 'NON_NATIVE': report.complianceStats.nonNative++; break;
                default: report.complianceStats.notRequired++;
            }

            // Track alternate components
            report.alternateComponentsGenerated += recipe.analysis?.alternateComponentsUsed || 0;

            // Analyze by planet type
            planets.forEach(planet => {
                if (planet !== 'All Types') {
                    if (!report.planetAnalysis[planet]) {
                        report.planetAnalysis[planet] = {
                            totalBuildings: 0,
                            fullyNative: 0,
                            partiallyNative: 0,
                            nonNative: 0,
                            alternateComponents: 0
                        };
                    }

                    const planetStats = report.planetAnalysis[planet];
                    planetStats.totalBuildings++;

                    switch (compliance) {
                        case 'FULLY_NATIVE': planetStats.fullyNative++; break;
                        case 'PARTIALLY_NATIVE': planetStats.partiallyNative++; break;
                        case 'NON_NATIVE': planetStats.nonNative++; break;
                    }

                    planetStats.alternateComponents += recipe.analysis?.alternateComponentsUsed || 0;
                }
            });

            // Track common gaps
            if (recipe.analysis?.nonNativeDependencies) {
                recipe.analysis.nonNativeDependencies.forEach(dep => {
                    if (!report.commonNativeGaps[dep]) {
                        report.commonNativeGaps[dep] = 0;
                    }
                    report.commonNativeGaps[dep]++;
                });
            }
        });

        // Generate markdown report
        const timestamp = new Date().toISOString().split('T')[0];
        let markdown = `# 🏗️ Native Resource Building Analysis Report\n\n`;
        markdown += `**Generated:** ${timestamp}\n`;
        markdown += `**Analysis Focus:** T1-T2 Buildings (Native Resource Requirements)\n\n`;

        markdown += `## 📊 Overview Statistics\n\n`;
        markdown += `- **Total Buildings:** ${report.totalBuildings}\n`;
        markdown += `- **T1-T2 Buildings:** ${report.t1t2Buildings} (Native resource constraints)\n`;
        markdown += `- **Building Resources Available:** ${report.buildingResourcesAvailable}\n`;
        markdown += `- **Alternate Components Generated:** ${report.alternateComponentsGenerated}\n\n`;

        markdown += `## 🎯 Native Resource Compliance (T1-T2 Buildings)\n\n`;
        markdown += `- **✅ Fully Native:** ${report.complianceStats.fullyNative} (${(report.complianceStats.fullyNative / report.t1t2Buildings * 100).toFixed(1)}%)\n`;
        markdown += `- **🔧 Partially Native:** ${report.complianceStats.partiallyNative} (${(report.complianceStats.partiallyNative / report.t1t2Buildings * 100).toFixed(1)}%)\n`;
        markdown += `- **⚠️ Non-Native:** ${report.complianceStats.nonNative} (${(report.complianceStats.nonNative / report.t1t2Buildings * 100).toFixed(1)}%)\n`;
        markdown += `- **🌐 Not Required:** ${report.complianceStats.notRequired} (${(report.complianceStats.notRequired / report.t1t2Buildings * 100).toFixed(1)}%)\n\n`;

        markdown += `## 🌍 Planet-Specific Analysis\n\n`;
        Object.entries(report.planetAnalysis)
            .sort(([, a], [, b]) => b.totalBuildings - a.totalBuildings)
            .forEach(([planet, stats]) => {
                const nativeRate = ((stats.fullyNative + stats.partiallyNative) / stats.totalBuildings * 100).toFixed(1);
                markdown += `### ${planet}\n`;
                markdown += `- **Buildings:** ${stats.totalBuildings}\n`;
                markdown += `- **Native Rate:** ${nativeRate}% (${stats.fullyNative} fully + ${stats.partiallyNative} partial)\n`;
                markdown += `- **Non-Native:** ${stats.nonNative}\n`;
                markdown += `- **Alternate Components:** ${stats.alternateComponents}\n\n`;
            });

        markdown += `## 🔧 Common Native Resource Gaps\n\n`;
        markdown += `Resources that frequently require non-native dependencies:\n\n`;
        Object.entries(report.commonNativeGaps)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .forEach(([resource, count]) => {
                markdown += `- **${resource}:** ${count} buildings affected\n`;
            });

        markdown += `\n## 💡 Recommendations\n\n`;
        if (report.complianceStats.nonNative > 0) {
            markdown += `1. **Priority:** Address ${report.complianceStats.nonNative} non-native T1-T2 buildings\n`;
        }
        if (report.alternateComponentsGenerated > 0) {
            markdown += `2. **Review:** ${report.alternateComponentsGenerated} alternate components generated - validate functionality\n`;
        }

        const worstPlanet = Object.entries(report.planetAnalysis)
            .sort(([, a], [, b]) => (a.nonNative / a.totalBuildings) - (b.nonNative / b.totalBuildings))[0];
        if (worstPlanet && worstPlanet[1].nonNative > 0) {
            markdown += `3. **Focus Planet:** ${worstPlanet[0]} has the highest non-native rate (${worstPlanet[1].nonNative}/${worstPlanet[1].totalBuildings})\n`;
        }

        markdown += `\n---\n*Generated by Native Resource Building System v1.0*\n`;

        // Export the report
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `native-resource-analysis-${timestamp}.md`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('📋 Native Resource Analysis Report generated:', report);
        return report;
    };

    // Filter and sort recipes
    const filteredRecipes = buildingRecipes.filter(recipe => {
        if (filter === 'all') return true;
        if (filter === 'easy') return recipe.analysis?.difficultyScore <= 2;
        if (filter === 'medium') return recipe.analysis?.difficultyScore > 2 && recipe.analysis?.difficultyScore <= 5;
        if (filter === 'hard') return recipe.analysis?.difficultyScore > 5 && recipe.analysis?.difficultyScore <= 10;
        if (filter === 'extreme') return recipe.analysis?.difficultyScore > 10;
        return true;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.outputName.localeCompare(b.outputName);
            case 'tier':
                return a.outputTier - b.outputTier;
            case 'resourceTier':
                return (a.targetResourceTier || 1) - (b.targetResourceTier || 1);
            case 'difficulty':
                return (a.analysis?.difficultyScore || 0) - (b.analysis?.difficultyScore || 0);
            case 'type':
                return a.functionalPurpose.localeCompare(b.functionalPurpose);
            default:
                return a.outputName.localeCompare(b.outputName);
        }
    });

    return (
        <div className="building-recipes">
            <div className="building-recipes-header">
                <h1>🍳 Building Crafting Recipes</h1>
                <div className="header-controls">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Recipes</option>
                        <option value="easy">Easy (&le;2)</option>
                        <option value="medium">Medium (3-5)</option>
                        <option value="hard">Hard (6-10)</option>
                        <option value="extreme">Extreme (&gt;10)</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="tier">Sort by Building Tier</option>
                        <option value="resourceTier">Sort by Resource Tier</option>
                        <option value="difficulty">Sort by Difficulty</option>
                        <option value="type">Sort by Type</option>
                    </select>

                    <button
                        onClick={generateBuildingRecipes}
                        className="btn-primary"
                        disabled={buildings.length === 0}
                        title="Generate systematic native building recipes with tier-appropriate complexity and planet-specific alternates"
                    >
                        🏗️ Generate Native Building Recipes
                    </button>

                    <button
                        onClick={generateNativeResourceReport}
                        className="btn-secondary"
                        disabled={buildingRecipes.length === 0}
                        title="Generate native resource compliance analysis report"
                    >
                        🌍 Native Analysis
                    </button>

                    <button
                        onClick={generateAlternatesReport}
                        className="btn-secondary"
                        disabled={buildings.length === 0}
                        title="Generate comprehensive report of all alternates that need to be created, their planet types, original references, and available resources for recipes"
                    >
                        📋 Alternates Report
                    </button>

                    <button
                        onClick={exportBuildingRecipesToCSV}
                        className="btn-secondary"
                        disabled={buildingRecipes.length === 0}
                    >
                        📤 Export CSV
                    </button>

                    <button
                        onClick={clearBuildingRecipes}
                        className="btn-danger"
                        disabled={buildingRecipes.length === 0}
                        title="Clear all building recipes from storage (useful if encountering storage quota issues)"
                    >
                        🗑️ Clear Recipes
                    </button>
                </div>
            </div>

            {/* Native Building System Information */}
            <div className="system-info-card" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '8px',
                margin: '16px 0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
                <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌍 Enhanced Native Building System
                    <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        fontWeight: 'normal'
                    }}>
                        SYSTEMATIC APPROACH
                    </span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', fontSize: '0.9em' }}>
                    <div>
                        <strong>🏗️ Resource-Tier-Based Complexity:</strong><br />
                        Component tiers automatically match extracted resource tiers for balanced progression
                    </div>
                    <div>
                        <strong>🌍 Native Building (T1-T3):</strong><br />
                        Lower-tier buildings use only planet-native resources with auto-generated alternates
                    </div>
                    <div>
                        <strong>📊 Systematic Component Counts:</strong><br />
                        T1=3, T2=4, T3=5, T4=6, T5=7-8 components for proper tier progression
                    </div>
                    <div>
                        <strong>⏱️ Smart Construction Times:</strong><br />
                        Formula: (Resource Tier × Building Tier × 300) seconds
                    </div>
                    <div>
                        <strong>🔧 Planet-Specific Alternates:</strong><br />
                        Auto-generates TERR_, SAB_, GAS_, OCEAN_, VOLCANO_, ICE_, DARK_ variants
                    </div>
                    <div>
                        <strong>🎯 Native Compliance Flags:</strong><br />
                        FULLY_NATIVE, PARTIALLY_NATIVE, or NOT_REQUIRED based on imports needed
                    </div>
                </div>
            </div>

            <div className="building-recipes-stats">
                <div className="stat-card">
                    <h3>Total Recipes</h3>
                    <span>{buildingRecipes.length}</span>
                </div>
                <div className="stat-card">
                    <h3>Buildings Available</h3>
                    <span>{buildings.length}</span>
                </div>
                <div className="stat-card">
                    <h3>Filtered Results</h3>
                    <span>{filteredRecipes.length}</span>
                </div>
                <div className="stat-card">
                    <h3>Average Difficulty</h3>
                    <span>{buildingRecipes.length > 0 ?
                        (buildingRecipes.reduce((sum, r) => sum + (r.analysis?.difficultyScore || 0), 0) / buildingRecipes.length).toFixed(1)
                        : '0'}</span>
                </div>
            </div>

            <div className="recipes-content">
                {buildingRecipes.length === 0 ? (
                    <div className="no-recipes">
                        <p>No building recipes generated yet.</p>
                        <p>Click "Generate Recipes" to create crafting recipes for all buildings.</p>
                        {buildings.length === 0 && (
                            <p><strong>Note:</strong> No buildings found. Please generate buildings first in the Building Manager tab.</p>
                        )}
                    </div>
                ) : (
                    <div className="recipes-table-container">
                        <table className="recipes-table">
                            <thead>
                                <tr>
                                    <th>Building Name</th>
                                    <th>Tier</th>
                                    <th>Resource Tier</th>
                                    <th>Type</th>
                                    <th>Native Compliance</th>
                                    <th>Component Range</th>
                                    <th>Construction Time</th>
                                    <th>Difficulty</th>
                                    <th>Ingredients</th>
                                    <th>Planet Dependencies</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecipes.map((recipe, index) => (
                                    <tr key={recipe.id || index} className="recipe-row">
                                        <td className="recipe-name">
                                            <strong>{recipe.outputName}</strong>
                                            <div className="recipe-meta">
                                                {recipe.analysis?.nativePlanetMatch && (
                                                    <span className="native-indicator">🏠 Native</span>
                                                )}
                                                {recipe.analysis?.isFullyNative && (
                                                    <span className="fully-native-indicator">🌍 Fully Native</span>
                                                )}
                                                {recipe.analysis?.alternateComponentsUsed > 0 && (
                                                    <span className="alternate-components-indicator">🔧 {recipe.analysis.alternateComponentsUsed} Alt</span>
                                                )}
                                                {recipe.requiresNativeResources && recipe.analysis?.nativeResourceCompliance === 'NON_NATIVE' && (
                                                    <span className="non-native-warning">⚠️ Non-Native</span>
                                                )}
                                                {(recipe.analysis?.issues?.length > 0 || recipe.analysis?.hasIssues) && (
                                                    <span className="issues-indicator">❌ {recipe.analysis?.issues?.length || recipe.analysis?.issuesCount || 0} issues</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`tier-badge tier-${recipe.outputTier}`}>
                                                T{recipe.outputTier}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`tier-badge tier-${recipe.extractedResourceTier || recipe.targetResourceTier || 1}`}>
                                                T{recipe.extractedResourceTier || recipe.targetResourceTier || 1}
                                            </span>
                                        </td>
                                        <td>{recipe.functionalPurpose}</td>
                                        <td>
                                            <span className={`compliance-badge ${recipe.nativeCompliance === 'FULLY_NATIVE' ? 'fully-native' :
                                                recipe.nativeCompliance === 'PARTIALLY_NATIVE' ? 'partially-native' :
                                                    'not-required'
                                                }`}>
                                                {recipe.nativeCompliance === 'FULLY_NATIVE' ? '🌍 Full' :
                                                    recipe.nativeCompliance === 'PARTIALLY_NATIVE' ? '🔧 Partial' :
                                                        '🌐 Not Required'}
                                            </span>
                                            {recipe.generatedAlternates?.length > 0 && (
                                                <div style={{ fontSize: '0.7em', color: '#666', marginTop: '2px' }}>
                                                    +{recipe.generatedAlternates.length} alt
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="component-range-badge">
                                                {recipe.componentTierRange || `T${Math.min(recipe.extractedResourceTier || 1, recipe.outputTier)}-T${Math.max(recipe.extractedResourceTier || 1, recipe.outputTier)}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="construction-time-badge">
                                                {recipe.constructionTime ? `${Math.floor(recipe.constructionTime / 60)}m` : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`difficulty-badge difficulty-${recipe.analysis?.difficultyScore <= 2 ? 'easy' :
                                                recipe.analysis?.difficultyScore <= 5 ? 'medium' :
                                                    recipe.analysis?.difficultyScore <= 10 ? 'hard' : 'extreme'
                                                }`}>
                                                {recipe.analysis?.difficultyScore || 0}
                                            </span>
                                        </td>
                                        <td className="ingredients-cell">
                                            <div className="recipe-ingredients-display">
                                                <div className="ingredients-header">
                                                    <strong>Recipe ({recipe.ingredients?.length || 0} components):</strong>
                                                </div>
                                                <div className="ingredients-list">
                                                    {recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients.map((ingredient, ingIndex) => {
                                                        const ingredientData = recipes.find(r => r.outputName === ingredient.name);
                                                        const ingredientTier = ingredientData?.outputTier || ingredientData?.OutputTier || 1;

                                                        // Check if this ingredient is a generated alternate
                                                        const isGeneratedAlternate = recipe.generatedAlternates?.some(alt =>
                                                            (alt.outputName || alt.OutputName) === ingredient.name
                                                        );

                                                        return (
                                                            <div key={ingIndex} className="ingredient-row">
                                                                <span className="ingredient-slot">{ingIndex + 1}.</span>
                                                                <span className={`ingredient-chip ${isGeneratedAlternate ? 'generated-alternate' : ''}`}>
                                                                    <span className="ingredient-name" title={ingredient.name}>
                                                                        {ingredient.name}
                                                                        {isGeneratedAlternate && <span className="alternate-indicator">🔧</span>}
                                                                    </span>
                                                                    <span className={`ingredient-tier tier-${ingredientTier}`}>T{ingredientTier}</span>
                                                                    <span className="ingredient-quantity">×{ingredient.quantity}</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="no-ingredients">No ingredients specified</div>
                                                    )}
                                                </div>
                                                {recipe.generatedAlternates?.length > 0 && (
                                                    <div className="alternates-summary">
                                                        <small>🔧 {recipe.generatedAlternates.length} planet-specific alternate(s) generated</small>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="planet-count">
                                                🌍 {recipe.analysis?.planetDependencies?.size || recipe.analysis?.planetDependenciesSize || 0}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                onClick={() => setSelectedRecipe(recipe)}
                                                className="btn-view"
                                                title="View Details"
                                            >
                                                👁️
                                            </button>
                                            <button
                                                onClick={() => setEditingRecipe(recipe)}
                                                className="btn-edit"
                                                title="Edit Recipe"
                                            >
                                                ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recipe Detail Modal */}
            {selectedRecipe && (
                <div className="recipe-modal" onClick={() => setSelectedRecipe(null)}>
                    <div className="recipe-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedRecipe.outputName}</h2>
                            <button onClick={() => setSelectedRecipe(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="recipe-details-grid">
                                <div className="detail-section">
                                    <h3>Basic Information</h3>
                                    <p><strong>Output ID:</strong> {selectedRecipe.outputID}</p>
                                    <p><strong>Building Tier:</strong> {selectedRecipe.outputTier}</p>
                                    <p><strong>Resource Tier:</strong> {selectedRecipe.targetResourceTier || 1}</p>
                                    <p><strong>Type:</strong> {selectedRecipe.functionalPurpose}</p>
                                    <p><strong>Construction Time:</strong> {selectedRecipe.constructionTime}s</p>
                                    <p><strong>Planet Types:</strong> {selectedRecipe.planetTypes}</p>
                                </div>

                                {selectedRecipe.analysis && (
                                    <div className="detail-section">
                                        <h3>Analysis</h3>
                                        <p><strong>Difficulty Score:</strong> {selectedRecipe.analysis.difficultyScore}</p>
                                        <p><strong>Planet Dependencies:</strong> {selectedRecipe.analysis.planetDependencies?.size || selectedRecipe.analysis.planetDependenciesSize || 0}</p>
                                        <p><strong>Native Planet Match:</strong> {selectedRecipe.analysis.nativePlanetMatch ? 'Yes' : 'No'}</p>
                                        <p><strong>Tier Complexity:</strong> {selectedRecipe.analysis.tierComplexity}</p>
                                        <p><strong>Native Resource Compliance:</strong> {selectedRecipe.analysis.nativeResourceCompliance}</p>
                                        <p><strong>Alternate Components Used:</strong> {selectedRecipe.analysis.alternateComponentsUsed}</p>

                                        {selectedRecipe.analysis.issues && selectedRecipe.analysis.issues.length > 0 && (
                                            <div className="issues-section">
                                                <strong>Issues:</strong>
                                                <ul>
                                                    {selectedRecipe.analysis.issues.map((issue, index) => (
                                                        <li key={index}>{issue}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="detail-section">
                                    <h3>Ingredients</h3>
                                    <div className="ingredients-detail">
                                        {selectedRecipe.ingredients.map((ingredient, index) => {
                                            const ingredientData = recipes.find(r => r.outputName === ingredient.name);
                                            return (
                                                <div key={index} className="ingredient-detail-item">
                                                    <span className="ingredient-name">{ingredient.name}</span>
                                                    <span className="ingredient-tier">T{ingredientData?.outputTier || 1}</span>
                                                    <span className="ingredient-quantity">×{ingredient.quantity}</span>
                                                    <span className="ingredient-planets">
                                                        {ingredientData?.planetTypes || 'Unknown'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipe Edit Modal */}
            {editingRecipe && (
                <div className="recipe-modal" onClick={() => setEditingRecipe(null)}>
                    <div className="recipe-modal-content recipe-edit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Recipe: {editingRecipe.outputName}</h2>
                            <button onClick={() => setEditingRecipe(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="edit-form">
                                <div className="form-group">
                                    <label>Building Name:</label>
                                    <input
                                        type="text"
                                        value={editingRecipe.outputName}
                                        onChange={(e) => updateRecipe(editingRecipe.id, 'outputName', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Construction Time (seconds):</label>
                                    <input
                                        type="number"
                                        value={editingRecipe.constructionTime}
                                        onChange={(e) => updateRecipe(editingRecipe.id, 'constructionTime', parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Planet Types:</label>
                                    <input
                                        type="text"
                                        value={editingRecipe.planetTypes}
                                        onChange={(e) => updateRecipe(editingRecipe.id, 'planetTypes', e.target.value)}
                                        placeholder="e.g., Terrestrial Planet;Volcanic Planet"
                                    />
                                </div>

                                <div className="ingredients-edit-section">
                                    <h3>Ingredients</h3>
                                    {editingRecipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className="ingredient-edit-row">
                                            <input
                                                type="text"
                                                value={ingredient.name}
                                                onChange={(e) => {
                                                    const newIngredients = [...editingRecipe.ingredients];
                                                    newIngredients[index] = { ...ingredient, name: e.target.value };
                                                    updateRecipe(editingRecipe.id, 'ingredients', newIngredients);
                                                }}
                                                placeholder="Ingredient name"
                                            />
                                            <input
                                                type="number"
                                                value={ingredient.quantity}
                                                onChange={(e) => {
                                                    const newIngredients = [...editingRecipe.ingredients];
                                                    newIngredients[index] = { ...ingredient, quantity: parseInt(e.target.value) };
                                                    updateRecipe(editingRecipe.id, 'ingredients', newIngredients);
                                                }}
                                                min="1"
                                                style={{ width: '80px' }}
                                            />
                                            <button
                                                onClick={() => removeIngredientFromRecipe(editingRecipe.id, ingredient.slot)}
                                                className="btn-remove"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}

                                    <div className="add-ingredient-section">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addIngredientToRecipe(editingRecipe.id, e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="ingredient-select"
                                        >
                                            <option value="">Add Ingredient...</option>
                                            {recipes
                                                .filter(r => ['COMPONENT', 'INGREDIENT'].includes(r.outputType))
                                                .sort((a, b) => a.outputName.localeCompare(b.outputName))
                                                .map(recipe => (
                                                    <option key={recipe.id} value={recipe.outputName}>
                                                        {recipe.outputName} (T{recipe.outputTier})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div className="edit-actions">
                                    <button onClick={() => setEditingRecipe(null)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button onClick={() => setEditingRecipe(null)} className="btn-primary">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildingRecipes; 