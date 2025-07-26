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

    // Generate recipe for a building using NATIVE RESOURCE CONSTRAINTS
    const generateBuildingRecipe = (building) => {
        const availableResources = getAvailableResources();
        const resourcesWithBuildings = getResourcesWithBuildings();
        const tier = building.tier;
        const buildingPlanets = building.planetType ? building.planetType.split(';').map(p => p.trim()) : [];
        const targetResourceTier = getTargetResourceTier(building);
        const complexityTier = Math.max(tier, targetResourceTier);

        console.log(`🏗️ Generating ${tier <= 2 ? 'NATIVE' : 'FLEXIBLE'} recipe for ${building.buildingName} (T${tier}) on planets: ${buildingPlanets.join(', ')}`);

        // Use BuildingResource=TRUE components only
        const candidateIngredients = availableResources.buildingResources.filter(resource => {
            // Must be COMPONENT or INGREDIENT (no raw resources directly in building recipes)
            if (!['COMPONENT', 'INGREDIENT'].includes(resource.outputType)) return false;

            // Must be at or below complexity tier
            const resourceTier = resource.outputTier || resource.OutputTier || 1;
            if (resourceTier > complexityTier) return false;

            // Must have production buildings available
            if (!resourcesWithBuildings.has(resource.outputName || resource.OutputName)) return false;

            return true;
        });

        console.log(`📦 Found ${candidateIngredients.length} BuildingResource candidates for ${building.buildingName}`);

        // ENFORCE NATIVE RESOURCE CONSTRAINTS FOR T1-T2 BUILDINGS
        const requireNativeResources = tier <= 2;
        let selectedIngredients = [];
        let alternateComponents = []; // Track generated alternates

        if (requireNativeResources && buildingPlanets.length > 0 && buildingPlanets[0] !== 'All Types') {
            console.log(`🌍 NATIVE MODE: Finding native recipes for T${tier} ${building.buildingName} on ${buildingPlanets.join(', ')}`);

            // Strategy 1: Find components that are already fully native
            const fullyNativeComponents = candidateIngredients.filter(component => {
                const nativeCheck = isRecipeChainNative(component.outputName || component.OutputName, buildingPlanets);
                return nativeCheck.isNative;
            });

            console.log(`✅ Found ${fullyNativeComponents.length} fully native components`);

            // Strategy 2: Generate alternate components for non-native essentials
            const essentialComponents = candidateIngredients.filter(component => {
                const name = component.outputName || component.OutputName;
                const componentCategory = component.ComponentCategory || component.componentCategory || '';
                const resourceType = component.ResourceType || component.resourceType || '';

                // Essential structural and electronic components
                return componentCategory.includes('KINETIC') || componentCategory.includes('HABITAT') ||
                    componentCategory.includes('ENERGY') || componentCategory.includes('EM') ||
                    resourceType === 'INDUSTRIAL_CORE' || resourceType === 'ENERGY_MATRIX';
            });

            // For each essential non-native component, try to generate native alternate
            const essentialNonNative = essentialComponents.filter(component => {
                const nativeCheck = isRecipeChainNative(component.outputName || component.OutputName, buildingPlanets);
                return !nativeCheck.isNative;
            });

            console.log(`🔧 Found ${essentialNonNative.length} essential non-native components, generating alternates...`);

            essentialNonNative.forEach(component => {
                try {
                    const alternateComponent = generateAlternateComponent(component, buildingPlanets);
                    alternateComponents.push(alternateComponent);
                    console.log(`🎯 Generated alternate: ${alternateComponent.outputName}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to generate alternate for ${component.outputName}:`, error.message);
                }
            });

            // Combine native components and alternates
            const availableNativeOptions = [...fullyNativeComponents, ...alternateComponents];

            // Categorize native options for smart selection
            const nativeCategories = {
                structural: availableNativeOptions.filter(r => {
                    const category = r.ComponentCategory || r.componentCategory || '';
                    const resourceType = r.ResourceType || r.resourceType || '';
                    return category.includes('KINETIC') || category.includes('HABITAT') ||
                        resourceType === 'INDUSTRIAL_CORE';
                }),
                electronic: availableNativeOptions.filter(r => {
                    const category = r.ComponentCategory || r.componentCategory || '';
                    const resourceType = r.ResourceType || r.resourceType || '';
                    return category.includes('ENERGY') || category.includes('EM') ||
                        resourceType === 'ENERGY_MATRIX' || resourceType === 'DATA_CRYSTAL';
                }),
                specialized: availableNativeOptions.filter(r => {
                    const category = r.ComponentCategory || r.componentCategory || '';
                    return category.includes('UTILITY') || category.includes('THERMAL') ||
                        category.includes('WEAPONS') || category.includes('PROPULSION');
                })
            };

            // Select native ingredients with balanced categories
            const targetIngredientCount = Math.min(3 + Math.floor(tier / 2), 5); // T1-T2: 3-4 ingredients
            const usedComponents = new Set();

            // Add 1 structural component
            if (nativeCategories.structural.length > 0) {
                const structural = nativeCategories.structural.filter(c => !usedComponents.has(c.outputName || c.OutputName))[0];
                if (structural) {
                    selectedIngredients.push(structural.outputName || structural.OutputName);
                    usedComponents.add(structural.outputName || structural.OutputName);
                }
            }

            // Add 1 electronic component
            if (nativeCategories.electronic.length > 0 && selectedIngredients.length < targetIngredientCount) {
                const electronic = nativeCategories.electronic.filter(c => !usedComponents.has(c.outputName || c.OutputName))[0];
                if (electronic) {
                    selectedIngredients.push(electronic.outputName || electronic.OutputName);
                    usedComponents.add(electronic.outputName || electronic.OutputName);
                }
            }

            // Fill remaining with specialized or any available native components
            while (selectedIngredients.length < targetIngredientCount && availableNativeOptions.length > usedComponents.size) {
                const remaining = availableNativeOptions.filter(c => !usedComponents.has(c.outputName || c.OutputName));
                if (remaining.length === 0) break;

                const next = remaining[0];
                selectedIngredients.push(next.outputName || next.OutputName);
                usedComponents.add(next.outputName || next.OutputName);
            }

            console.log(`🏠 NATIVE RECIPE: Selected ${selectedIngredients.length} native ingredients for ${building.buildingName}`);

        } else {
            // T3-T5 buildings: Flexible resource selection (original logic)
            console.log(`🌐 FLEXIBLE MODE: Generating T${tier} recipe for ${building.buildingName}`);

            // Use original flexible selection logic for higher tiers
            const componentsByCategory = {
                structural: candidateIngredients.filter(r => {
                    const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                    const resourceType = (r.ResourceType || r.resourceType || '').toLowerCase();
                    return category.includes('kinetic') || category.includes('habitat') ||
                        resourceType.includes('industrial');
                }),
                electronic: candidateIngredients.filter(r => {
                    const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                    const resourceType = (r.ResourceType || r.resourceType || '').toLowerCase();
                    return category.includes('energy') || category.includes('em') ||
                        resourceType.includes('energy') || resourceType.includes('data');
                }),
                specialized: candidateIngredients.filter(r => {
                    const category = (r.ComponentCategory || r.componentCategory || '').toLowerCase();
                    return category.includes('utility') || category.includes('thermal') ||
                        category.includes('weapons') || category.includes('propulsion');
                }),
                native: candidateIngredients.filter(r => {
                    if (!r.planetTypes) return false;
                    const resourcePlanets = r.planetTypes.split(';').map(p => p.trim());
                    return buildingPlanets.some(bp => resourcePlanets.includes(bp));
                })
            };

            const usedComponents = new Set();
            const targetIngredientCount = Math.min(4 + Math.floor(tier / 2), 7); // T3+: 4-7 ingredients

            // Prefer native components even in flexible mode
            if (componentsByCategory.native.length > 0) {
                const nativeCount = Math.min(2, targetIngredientCount - 2);
                for (let i = 0; i < nativeCount && selectedIngredients.length < targetIngredientCount; i++) {
                    const native = componentsByCategory.native.filter(c => !usedComponents.has(c.outputName || c.OutputName))[i];
                    if (native) {
                        selectedIngredients.push(native.outputName || native.OutputName);
                        usedComponents.add(native.outputName || native.OutputName);
                    }
                }
            }

            // Add structural
            if (selectedIngredients.length < targetIngredientCount) {
                const structural = componentsByCategory.structural.filter(c => !usedComponents.has(c.outputName || c.OutputName))[0];
                if (structural) {
                    selectedIngredients.push(structural.outputName || structural.OutputName);
                    usedComponents.add(structural.outputName || structural.OutputName);
                }
            }

            // Add electronic
            if (selectedIngredients.length < targetIngredientCount) {
                const electronic = componentsByCategory.electronic.filter(c => !usedComponents.has(c.outputName || c.OutputName))[0];
                if (electronic) {
                    selectedIngredients.push(electronic.outputName || electronic.OutputName);
                    usedComponents.add(electronic.outputName || electronic.OutputName);
                }
            }

            // Fill with specialized and remaining components
            while (selectedIngredients.length < targetIngredientCount) {
                const remaining = candidateIngredients.filter(c => !usedComponents.has(c.outputName || c.OutputName));
                if (remaining.length === 0) break;

                const next = remaining[0];
                selectedIngredients.push(next.outputName || next.OutputName);
                usedComponents.add(next.outputName || next.OutputName);
            }

            console.log(`🌐 FLEXIBLE RECIPE: Selected ${selectedIngredients.length} ingredients for ${building.buildingName}`);
        }

        // Fallback if no ingredients found
        if (selectedIngredients.length === 0) {
            console.warn(`⚠️ No suitable ingredients found for ${building.buildingName}, using fallback`);
            const fallback = candidateIngredients.filter(r => (r.outputTier || r.OutputTier || 1) === 1)[0];
            if (fallback) {
                selectedIngredients.push(fallback.outputName || fallback.OutputName);
            }
        }

        // Create the recipe object
        const buildingKebabName = toKebabCase(building.buildingName);
        const recipe = {
            outputID: buildingKebabName,
            outputName: building.buildingName,
            outputType: 'BUILDING',
            outputTier: tier,
            constructionTime: 300 * tier,
            planetTypes: building.planetType || 'All Types',
            factions: building.faction || 'MUD;ONI;USTUR',
            resourceType: 'STRUCTURE',
            functionalPurpose: building.type.toUpperCase(),
            usageCategory: 'BUILDING',
            completionStatus: 'complete',
            productionSteps: tier,
            targetResourceTier: targetResourceTier,
            requiresNativeResources: requireNativeResources,
            alternateComponents: alternateComponents, // Store generated alternates
            ingredients: selectedIngredients.map((ingredient, index) => ({
                name: ingredient,
                quantity: 1,
                slot: index + 1
            }))
        };

        return recipe;
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

    // Generate all building recipes with analysis
    const generateBuildingRecipes = () => {
        console.log('Generating building recipes for', buildings.length, 'buildings');

        const newBuildingRecipes = buildings.map(building => {
            const recipe = generateBuildingRecipe(building);
            const analysis = analyzeRecipeDifficulty(recipe, building);

            return {
                ...recipe,
                analysis: analysis,
                id: `${recipe.outputID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
        });

        setBuildingRecipes(newBuildingRecipes);
        console.log('Generated', newBuildingRecipes.length, 'building recipes');
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
                    >
                        🔄 Generate Recipes
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
                                            <span className={`tier-badge tier-${recipe.targetResourceTier || 1}`}>
                                                T{recipe.targetResourceTier || 1}
                                            </span>
                                        </td>
                                        <td>{recipe.functionalPurpose}</td>
                                        <td>
                                            <span className={`difficulty-badge difficulty-${recipe.analysis?.difficultyScore <= 2 ? 'easy' :
                                                recipe.analysis?.difficultyScore <= 5 ? 'medium' :
                                                    recipe.analysis?.difficultyScore <= 10 ? 'hard' : 'extreme'
                                                }`}>
                                                {recipe.analysis?.difficultyScore || 0}
                                            </span>
                                        </td>
                                        <td className="ingredients-cell">
                                            {recipe.ingredients.map((ingredient, ingIndex) => {
                                                const ingredientData = recipes.find(r => r.outputName === ingredient.name);
                                                const ingredientTier = ingredientData?.outputTier || 1;

                                                return (
                                                    <span key={ingIndex} className="ingredient-chip">
                                                        <span className="ingredient-name">{ingredient.name}</span>
                                                        <span className="ingredient-tier">T{ingredientTier}</span>
                                                        <span className="ingredient-quantity">×{ingredient.quantity}</span>
                                                    </span>
                                                );
                                            })}
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