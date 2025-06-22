import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './BuildingManager.css';

// Utility function to convert string to kebab-case
const toKebabCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const BuildingManager = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [buildings, setBuildings] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [editingBuilding, setEditingBuilding] = useState(null);
    const [buildingType, setBuildingType] = useState('all');
    const [showProcessingHubVariants, setShowProcessingHubVariants] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [buildingRecipes, setBuildingRecipes] = useState([]);




    // Hub types
    const hubTypes = [
        { id: 'central-hub', name: 'Central Hub', description: 'Main command center for claims' },
        { id: 'farm-hub', name: 'Farm Hub', description: 'Agricultural processing center' },
        { id: 'storage-hub', name: 'Storage Hub', description: 'Resource storage facility' },
        { id: 'extraction-hub', name: 'Extraction Hub', description: 'Raw resource extraction coordination' },
        { id: 'processing-hub', name: 'Processing Hub', description: 'Component manufacturing center' }
    ];

    // Generate buildings based on recipes
    const generateBuildings = () => {
        if (!recipes || recipes.length === 0) return;

        const generatedBuildings = [];
        const basicResources = recipes.filter(recipe =>
            recipe.outputType === 'BASIC RESOURCE' &&
            !recipe.ingredient1 // No ingredients means it's a raw resource
        );

        // Generate extractors for basic resources
        basicResources.forEach(resource => {
            for (let tier = 1; tier <= 5; tier++) {
                generatedBuildings.push(createExtractorBuilding(resource, tier));
            }
        });

        // Generate processors for components with 2 or fewer production steps
        console.log('=== PROCESSOR GENERATION DEBUG ===');
        console.log('Total recipes:', recipes.length);

        // Show first few recipes to check data structure
        console.log('First 3 recipes:', recipes.slice(0, 3));

        // Let's see what OutputType values we have
        const outputTypes = [...new Set(recipes.map(r => r.outputType))];
        console.log('All OutputType values:', outputTypes);

        // Filter step by step with logging
        const step1 = recipes.filter(recipe => recipe.outputType);
        console.log('Step 1 - Has outputType:', step1.length);

        const step2 = step1.filter(recipe => recipe.outputType !== 'BASIC RESOURCE');
        console.log('Step 2 - Not BASIC RESOURCE:', step2.length);

        const step3 = step2.filter(recipe => recipe.outputType === 'COMPONENT');
        console.log('Step 3 - Exactly COMPONENT:', step3.length);

        const step4 = step3.filter(recipe =>
            recipe.ingredients && recipe.ingredients.length > 0
        );
        console.log('Step 4 - Has ingredients:', step4.length);

        // Check production steps for first few
        console.log('Checking production steps for first 5 recipes with ingredients:');
        step4.slice(0, 5).forEach(recipe => {
            const steps = calculateProductionSteps(recipe, recipes);
            console.log(`${recipe.outputName}: ${steps} steps (${recipe.outputType})`);
        });

        const components = step4.filter(recipe => calculateProductionSteps(recipe, recipes) <= 2);
        console.log('Step 5 - 2 steps or less:', components.length);

        if (components.length > 0) {
            console.log('First few components that will get processors:',
                components.slice(0, 5).map(r => ({ name: r.outputName, type: r.outputType, steps: calculateProductionSteps(r, recipes) })));
        }
        console.log('=== END DEBUG ===');

        components.forEach(component => {
            for (let tier = 1; tier <= 5; tier++) {
                generatedBuildings.push(createProcessorBuilding(component, tier));
            }
        });

        // Add default hubs
        hubTypes.forEach(hubType => {
            for (let tier = 1; tier <= 5; tier++) {
                generatedBuildings.push(createHubBuilding(hubType, tier));
            }
        });

        setBuildings(generatedBuildings);
        // Save to localStorage for BuildingRecipes component
        localStorage.setItem('generated-buildings', JSON.stringify(generatedBuildings));
    };

    // Calculate production steps for a recipe
    const calculateProductionSteps = (recipe, allRecipes, visited = new Set()) => {
        if (visited.has(recipe.id)) return 0; // Prevent infinite loops
        visited.add(recipe.id);

        let maxSteps = 0;

        // Check all ingredients using the ingredients array
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                const ingredientName = ingredient.name;
                if (!ingredientName) return;

                const ingredientRecipe = allRecipes.find(r => r.outputName === ingredientName);
                if (ingredientRecipe && ingredientRecipe.outputType === 'BASIC RESOURCE') {
                    maxSteps = Math.max(maxSteps, 1);
                } else if (ingredientRecipe) {
                    maxSteps = Math.max(maxSteps, 1 + calculateProductionSteps(ingredientRecipe, allRecipes, new Set(visited)));
                }
            });
        }

        return maxSteps;
    };

    // Get planet types and factions from raw resources used in recipe
    const getInheritedProperties = (recipe, allRecipes) => {
        const planetTypes = new Set();
        const factions = new Set();

        const collectFromIngredients = (currentRecipe, visited = new Set()) => {
            if (visited.has(currentRecipe.id)) return;
            visited.add(currentRecipe.id);

            if (currentRecipe.ingredients && Array.isArray(currentRecipe.ingredients)) {
                currentRecipe.ingredients.forEach(ingredient => {
                    const ingredientName = ingredient.name;
                    if (!ingredientName) return;

                    const ingredientRecipe = allRecipes.find(r => r.outputName === ingredientName);
                    if (ingredientRecipe) {
                        if (ingredientRecipe.outputType === 'BASIC RESOURCE') {
                            // Add planet types and factions from basic resource
                            if (ingredientRecipe.planetTypes) {
                                ingredientRecipe.planetTypes.split(';').forEach(pt => planetTypes.add(pt.trim()));
                            }
                            if (ingredientRecipe.factions) {
                                ingredientRecipe.factions.split(';').forEach(f => factions.add(f.trim()));
                            }
                        } else {
                            collectFromIngredients(ingredientRecipe, new Set(visited));
                        }
                    }
                });
            }
        };

        collectFromIngredients(recipe);
        return {
            planetTypes: Array.from(planetTypes).join(';'),
            factions: Array.from(factions).join(';')
        };
    };

    // Create extractor building
    const createExtractorBuilding = (resource, tier) => {
        const resourceKebabName = toKebabCase(resource.outputName);
        return {
            buildingID: `${resourceKebabName}-extractor-t${tier}`,
            buildingName: `${resource.outputName} Extractor T${tier}`,
            tier: tier,
            planetType: resource.planetTypes || '',
            faction: resource.factions || '',
            slotsRequired: 2,
            crewSlots: 2,
            powerGeneration: 0,
            powerConsumption: 50 * tier,
            storageProvided: 1000,
            hubValue: 0,
            requiredTags: `tag-extraction-hub-t${tier}`,
            addedTags: '',
            inputResources: '',
            outputResources: '',
            extractedResources: JSON.stringify({ [`cargo-${resourceKebabName}`]: 1 }),
            type: 'extractor'
        };
    };

    // Create processor building
    const createProcessorBuilding = (component, tier) => {
        const inherited = getInheritedProperties(component, recipes);
        const inputResources = {};
        const componentKebabName = toKebabCase(component.outputName);
        const outputResources = { [`cargo-${componentKebabName}`]: 1 };

        // Build input resources from recipe using ingredients array
        if (component.ingredients && Array.isArray(component.ingredients)) {
            component.ingredients.forEach(ingredient => {
                if (ingredient.name && ingredient.quantity) {
                    const ingredientKebabName = toKebabCase(ingredient.name);
                    inputResources[`cargo-${ingredientKebabName}`] = -parseInt(ingredient.quantity);
                }
            });
        }

        return {
            buildingID: `${componentKebabName}-processor-t${tier}`,
            buildingName: `${component.outputName} Processor T${tier}`,
            tier: tier,
            planetType: inherited.planetTypes,
            faction: inherited.factions,
            slotsRequired: 2,
            crewSlots: 2,
            powerGeneration: 0,
            powerConsumption: 50 * tier,
            storageProvided: 1000,
            hubValue: 0,
            requiredTags: `tag-processing-hub-t${tier}`,
            addedTags: '',
            inputResources: JSON.stringify(inputResources),
            outputResources: JSON.stringify(outputResources),
            extractedResources: '',
            type: 'processor'
        };
    };

    // Create hub building
    const createHubBuilding = (hubType, tier) => {
        return {
            buildingID: `${hubType.id}-t${tier}`,
            buildingName: `${hubType.name} T${tier}`,
            tier: tier,
            planetType: 'All Types',
            faction: 'MUD;ONI;USTUR',
            slotsRequired: 2,
            crewSlots: 2,
            powerGeneration: 0,
            powerConsumption: 50 * tier,
            storageProvided: 1000,
            hubValue: 0,
            requiredTags: '',
            addedTags: `tag-${hubType.id}-t${tier}`,
            inputResources: '',
            outputResources: '',
            extractedResources: '',
            type: 'hub'
        };
    };

    // Create processing hub variant for specific recipe
    const createProcessingHubVariant = (recipe, tier) => {
        const inherited = getInheritedProperties(recipe, recipes);
        const inputResources = {};
        const recipeKebabName = toKebabCase(recipe.outputName);
        const outputResources = { [`cargo-${recipeKebabName}`]: 1 };

        // Build input resources from recipe using ingredients array
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                if (ingredient.name && ingredient.quantity) {
                    const ingredientKebabName = toKebabCase(ingredient.name);
                    inputResources[`cargo-${ingredientKebabName}`] = -parseInt(ingredient.quantity);
                }
            });
        }

        return {
            buildingID: `processing-hub-${recipeKebabName}-t${tier}`,
            buildingName: `Processing Hub (${recipe.outputName}) T${tier}`,
            tier: tier,
            planetType: inherited.planetTypes,
            faction: inherited.factions,
            slotsRequired: 2,
            crewSlots: 2,
            powerGeneration: 0,
            powerConsumption: 50 * tier,
            storageProvided: 1000,
            hubValue: 0,
            requiredTags: '',
            addedTags: `tag-processing-hub-t${tier}`,
            inputResources: JSON.stringify(inputResources),
            outputResources: JSON.stringify(outputResources),
            extractedResources: '',
            type: 'processing-hub-variant'
        };
    };

    // Add processing hub variants
    const addProcessingHubVariants = () => {
        const newBuildings = [...buildings];

        selectedRecipes.forEach(recipe => {
            for (let tier = 1; tier <= 5; tier++) {
                newBuildings.push(createProcessingHubVariant(recipe, tier));
            }
        });

        setBuildings(newBuildings);
        localStorage.setItem('generated-buildings', JSON.stringify(newBuildings));
        setShowProcessingHubVariants(false);
        setSelectedRecipes([]);
    };

    // Update building (for hub editing)
    const updateBuilding = (updatedBuilding) => {
        const updatedBuildings = buildings.map(building =>
            building.buildingID === updatedBuilding.buildingID ? updatedBuilding : building
        );
        setBuildings(updatedBuildings);
        localStorage.setItem('generated-buildings', JSON.stringify(updatedBuildings));
        setEditingBuilding(null);
        setSelectedBuilding(null);
    };

    // Get available recipes for processing hub variants
    const getAvailableRecipes = () => {
        if (!recipes) return [];

        return recipes.filter(recipe =>
            recipe.outputType === 'COMPONENT' &&
            recipe.ingredients && recipe.ingredients.length > 0 && // Has ingredients
            calculateProductionSteps(recipe, recipes) <= 2
        ).sort((a, b) => a.outputName.localeCompare(b.outputName));
    };

    // Toggle recipe selection for processing hub variants
    const toggleRecipeSelection = (recipe) => {
        setSelectedRecipes(prev => {
            const isSelected = prev.some(r => r.outputID === recipe.outputID);
            if (isSelected) {
                return prev.filter(r => r.outputID !== recipe.outputID);
            } else {
                return [...prev, recipe];
            }
        });
    };

    // Add new hub manually
    const addNewHub = () => {
        const newHub = {
            buildingID: `custom-hub-${Date.now()}`,
            buildingName: 'New Custom Hub',
            tier: 1,
            planetType: 'All Types',
            faction: 'MUD;ONI;USTUR',
            slotsRequired: 2,
            crewSlots: 2,
            powerGeneration: 0,
            powerConsumption: 50,
            storageProvided: 1000,
            hubValue: 0,
            requiredTags: '',
            addedTags: '',
            inputResources: '',
            outputResources: '',
            extractedResources: '',
            type: 'hub'
        };
        const newBuildings = [...buildings, newHub];
        setBuildings(newBuildings);
        localStorage.setItem('generated-buildings', JSON.stringify(newBuildings));
        setEditingBuilding(newHub);
    };

    // Clear all buildings
    const clearAllBuildings = () => {
        if (window.confirm('Are you sure you want to clear all buildings? This cannot be undone.')) {
            setBuildings([]);
            localStorage.setItem('generated-buildings', JSON.stringify([]));
        }
    };

    // Export buildings to CSV
    const exportToCSV = () => {
        const headers = [
            'Building ID', 'Building Name', 'Tier', 'Planet Type', 'Faction',
            'Slots Required', 'Crew Slots', 'Power Generation', 'Power Consumption',
            'Storage Provided', 'Hub Value', 'Required Tags', 'Added Tags',
            'Input Resources', 'Output Resources', 'Extracted Resources'
        ];

        // Helper function to properly escape CSV values
        const escapeCSVValue = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // If the value contains commas, quotes, or newlines, wrap it in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvContent = [
            headers.join(','),
            ...buildings.map(building => [
                escapeCSVValue(building.buildingID),
                escapeCSVValue(building.buildingName),
                escapeCSVValue(building.tier),
                escapeCSVValue(building.planetType),
                escapeCSVValue(building.faction),
                escapeCSVValue(building.slotsRequired),
                escapeCSVValue(building.crewSlots),
                escapeCSVValue(building.powerGeneration),
                escapeCSVValue(building.powerConsumption),
                escapeCSVValue(building.storageProvided),
                escapeCSVValue(building.hubValue),
                escapeCSVValue(building.requiredTags),
                escapeCSVValue(building.addedTags),
                escapeCSVValue(building.inputResources),
                escapeCSVValue(building.outputResources),
                escapeCSVValue(building.extractedResources)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'buildings.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Building Recipe Generation System using REAL resources from CSV

    // Get available resources categorized by tier and type from actual CSV data
    const getAvailableResources = () => {
        if (!recipes || recipes.length === 0) return { byTier: {}, byType: {}, byPlanet: {} };

        const resourcesByTier = {};
        const resourcesByType = {};
        const resourcesByPlanet = {};

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
        });

        return {
            byTier: resourcesByTier,
            byType: resourcesByType,
            byPlanet: resourcesByPlanet
        };
    };

    // Get resources that have buildings (extractors or processors)
    const getResourcesWithBuildings = () => {
        const resourcesWithBuildings = new Set();

        buildings.forEach(building => {
            if (building.type === 'extractor') {
                // Extract resource name from "Resource Name Extractor T1"
                const resourceName = building.buildingName.replace(/ Extractor T\d+$/, '');
                resourcesWithBuildings.add(resourceName);
            } else if (building.type === 'processor') {
                // Extract resource name from "Resource Name Processor T1"
                const resourceName = building.buildingName.replace(/ Processor T\d+$/, '');
                resourcesWithBuildings.add(resourceName);
            }
        });

        return resourcesWithBuildings;
    };

    // Analyze recipe difficulty
    const analyzeRecipeDifficulty = (recipe, targetBuilding) => {
        const analysis = {
            tierComplexity: 0,
            planetDependencies: new Set(),
            difficultyScore: 0,
            tierSpread: 0,
            nativePlanetMatch: false,
            issues: []
        };

        const targetPlanets = targetBuilding.planetType ? targetBuilding.planetType.split(';') : [];

        recipe.ingredients.forEach(ingredient => {
            const ingredientData = recipes.find(r => r.outputName === ingredient.name);
            if (ingredientData) {
                const ingredientTier = ingredientData.outputTier || 1;
                const ingredientPlanets = ingredientData.planetTypes ? ingredientData.planetTypes.split(';') : [];

                // Track tier complexity
                analysis.tierComplexity = Math.max(analysis.tierComplexity, ingredientTier);

                // Track planet dependencies
                ingredientPlanets.forEach(planet => analysis.planetDependencies.add(planet.trim()));

                // Check if ingredient tier is too high for building tier
                if (ingredientTier > targetBuilding.tier) {
                    analysis.issues.push(`${ingredient.name} (T${ingredientTier}) is higher tier than building (T${targetBuilding.tier})`);
                }

                // Check for native planet matches
                const hasCommonPlanet = targetPlanets.some(targetPlanet =>
                    ingredientPlanets.some(ingredientPlanet =>
                        ingredientPlanet.trim() === targetPlanet.trim()
                    )
                );
                if (hasCommonPlanet) analysis.nativePlanetMatch = true;
            }
        });

        // Calculate difficulty score
        analysis.tierSpread = analysis.tierComplexity - targetBuilding.tier;
        analysis.difficultyScore =
            (analysis.planetDependencies.size * 2) + // Planet complexity
            (analysis.tierSpread * 3) + // Tier complexity
            (analysis.nativePlanetMatch ? -2 : 0) + // Native bonus
            (analysis.issues.length * 5); // Penalty for issues

        return analysis;
    };

    // Generate recipe for a building using REAL CSV data
    const generateBuildingRecipe = (building) => {
        const availableResources = getAvailableResources();
        const resourcesWithBuildings = getResourcesWithBuildings();
        const tier = building.tier;
        const buildingPlanets = building.planetType ? building.planetType.split(';').map(p => p.trim()) : [];

        console.log(`Generating recipe for ${building.buildingName} (T${tier})`);

        // Get candidate ingredients - only use resources at or below building tier
        const candidateIngredients = [];

        // Collect all resources from tier 1 up to building tier
        for (let t = 1; t <= tier; t++) {
            const tierResources = availableResources.byTier[t] || [];
            candidateIngredients.push(...tierResources);
        }

        // Filter candidates based on our rules
        const filteredCandidates = candidateIngredients.filter(resource => {
            // Exclude BASIC RESOURCE (we want refined materials)
            if (resource.outputType === 'BASIC RESOURCE') return false;

            // Prefer COMPONENT and INGREDIENT types
            if (!['COMPONENT', 'INGREDIENT'].includes(resource.outputType)) return false;

            // Only use resources that have buildings (can be produced)
            if (!resourcesWithBuildings.has(resource.outputName)) return false;

            return true;
        });

        console.log(`Found ${filteredCandidates.length} candidate ingredients for ${building.buildingName}`);

        // Separate by categories for smart selection
        const componentsByCategory = {
            structural: filteredCandidates.filter(r =>
                ['Steel', 'Aluminum', 'Framework', 'Structure', 'Hull', 'Alloy', 'Composite'].some(keyword =>
                    r.outputName.includes(keyword)
                )
            ),
            electronic: filteredCandidates.filter(r =>
                ['Circuit', 'Electronic', 'Wire', 'Processor', 'Core', 'Interface', 'Neural', 'Quantum'].some(keyword =>
                    r.outputName.includes(keyword)
                )
            ),
            native: filteredCandidates.filter(r => {
                if (!r.planetTypes) return false;
                const resourcePlanets = r.planetTypes.split(';').map(p => p.trim());
                return buildingPlanets.some(buildingPlanet => resourcePlanets.includes(buildingPlanet));
            }),
            lowTier: filteredCandidates.filter(r => (r.outputTier || 1) <= Math.max(1, tier - 1)),
            sameTier: filteredCandidates.filter(r => (r.outputTier || 1) === tier)
        };

        const selectedIngredients = [];
        const targetIngredientCount = Math.min(3 + Math.floor(tier / 2), 6); // 3-6 ingredients

        // Strategy: Always include basic structural and electronic components, then add native/appropriate resources

        // 1. Add a structural component (prefer lower tier)
        const structuralOptions = componentsByCategory.structural.filter(r => (r.outputTier || 1) <= tier);
        if (structuralOptions.length > 0) {
            const structuralComponent = structuralOptions.sort((a, b) => (a.outputTier || 1) - (b.outputTier || 1))[0];
            selectedIngredients.push(structuralComponent.outputName);
        }

        // 2. Add an electronic component
        const electronicOptions = componentsByCategory.electronic.filter(r => (r.outputTier || 1) <= tier);
        if (electronicOptions.length > 0 && selectedIngredients.length < targetIngredientCount) {
            const electronicComponent = electronicOptions.sort((a, b) => (a.outputTier || 1) - (b.outputTier || 1))[0];
            selectedIngredients.push(electronicComponent.outputName);
        }

        // 3. Add native planet resources when possible (easier to construct locally)
        const nativeOptions = componentsByCategory.native.filter(r =>
            !selectedIngredients.includes(r.outputName) && (r.outputTier || 1) <= tier
        );
        while (nativeOptions.length > 0 && selectedIngredients.length < targetIngredientCount) {
            const nativeComponent = nativeOptions.shift();
            selectedIngredients.push(nativeComponent.outputName);
        }

        // 4. Fill remaining slots with appropriate tier components
        const remainingOptions = filteredCandidates.filter(r =>
            !selectedIngredients.includes(r.outputName) && (r.outputTier || 1) <= tier
        ).sort((a, b) => (a.outputTier || 1) - (b.outputTier || 1));

        while (remainingOptions.length > 0 && selectedIngredients.length < targetIngredientCount) {
            const component = remainingOptions.shift();
            selectedIngredients.push(component.outputName);
        }

        // Fallback if we don't have enough ingredients
        if (selectedIngredients.length === 0) {
            console.warn(`No suitable ingredients found for ${building.buildingName}`);
            // Use basic tier 1 components as fallback
            const fallbackOptions = candidateIngredients.filter(r => (r.outputTier || 1) === 1);
            if (fallbackOptions.length > 0) {
                selectedIngredients.push(fallbackOptions[0].outputName);
            }
        }

        console.log(`Selected ${selectedIngredients.length} ingredients for ${building.buildingName}:`, selectedIngredients);

        // Create the recipe object
        const buildingKebabName = toKebabCase(building.buildingName);
        const recipe = {
            outputID: buildingKebabName,
            outputName: building.buildingName,
            outputType: 'BUILDING',
            outputTier: tier,
            constructionTime: 300 * tier, // 5 minutes base, scales with tier
            planetTypes: building.planetType || 'All Types',
            factions: building.faction || 'MUD;ONI;USTUR',
            resourceType: 'STRUCTURE',
            functionalPurpose: building.type.toUpperCase(),
            usageCategory: 'BUILDING',
            completionStatus: 'complete',
            productionSteps: tier,
            ingredients: selectedIngredients.map((ingredient, index) => ({
                name: ingredient,
                quantity: 1,
                slot: index + 1
            }))
        };

        return recipe;
    };

    // Generate all building recipes with analysis
    const generateBuildingRecipes = () => {
        console.log('Generating building recipes for', buildings.length, 'buildings');

        const newBuildingRecipes = buildings.map(building => {
            const recipe = generateBuildingRecipe(building);
            const analysis = analyzeRecipeDifficulty(recipe, building);

            return {
                ...recipe,
                analysis: analysis
            };
        });

        setBuildingRecipes(newBuildingRecipes);

        console.log('Generated', newBuildingRecipes.length, 'building recipes');

        // Generate analysis report
        generateAnalysisReport(newBuildingRecipes);
    };

    // Generate comprehensive analysis report
    const generateAnalysisReport = (recipes) => {
        const analysis = {
            totalRecipes: recipes.length,
            difficultyDistribution: { easy: 0, medium: 0, hard: 0, extreme: 0 },
            issuesByType: {},
            tierAnalysis: {},
            planetDependencyAnalysis: {},
            averageDifficulty: 0,
            problematicRecipes: []
        };

        recipes.forEach(recipe => {
            const recipeAnalysis = recipe.analysis;

            // Difficulty distribution
            const difficulty = recipeAnalysis.difficultyScore;
            if (difficulty <= 2) analysis.difficultyDistribution.easy++;
            else if (difficulty <= 5) analysis.difficultyDistribution.medium++;
            else if (difficulty <= 10) analysis.difficultyDistribution.hard++;
            else analysis.difficultyDistribution.extreme++;

            // Track issues
            recipeAnalysis.issues.forEach(issue => {
                const issueType = issue.split(' ')[0]; // First word
                analysis.issuesByType[issueType] = (analysis.issuesByType[issueType] || 0) + 1;
            });

            // Tier analysis
            const tier = recipe.outputTier;
            if (!analysis.tierAnalysis[tier]) {
                analysis.tierAnalysis[tier] = {
                    count: 0,
                    avgDifficulty: 0,
                    avgPlanetDeps: 0,
                    issues: 0
                };
            }
            analysis.tierAnalysis[tier].count++;
            analysis.tierAnalysis[tier].avgDifficulty += difficulty;
            analysis.tierAnalysis[tier].avgPlanetDeps += recipeAnalysis.planetDependencies.size;
            analysis.tierAnalysis[tier].issues += recipeAnalysis.issues.length;

            // Planet dependency analysis
            recipeAnalysis.planetDependencies.forEach(planet => {
                analysis.planetDependencyAnalysis[planet] = (analysis.planetDependencyAnalysis[planet] || 0) + 1;
            });

            // Flag problematic recipes
            if (difficulty > 8 || recipeAnalysis.issues.length > 2) {
                analysis.problematicRecipes.push({
                    name: recipe.outputName,
                    difficulty: difficulty,
                    issues: recipeAnalysis.issues,
                    planetDeps: recipeAnalysis.planetDependencies.size
                });
            }
        });

        // Calculate averages
        Object.keys(analysis.tierAnalysis).forEach(tier => {
            const tierData = analysis.tierAnalysis[tier];
            tierData.avgDifficulty = (tierData.avgDifficulty / tierData.count).toFixed(2);
            tierData.avgPlanetDeps = (tierData.avgPlanetDeps / tierData.count).toFixed(2);
        });

        analysis.averageDifficulty = recipes.reduce((sum, r) => sum + r.analysis.difficultyScore, 0) / recipes.length;

        console.log('=== BUILDING RECIPE ANALYSIS REPORT ===');
        console.log('Total Recipes:', analysis.totalRecipes);
        console.log('Difficulty Distribution:', analysis.difficultyDistribution);
        console.log('Average Difficulty:', analysis.averageDifficulty.toFixed(2));
        console.log('Issues by Type:', analysis.issuesByType);
        console.log('Tier Analysis:', analysis.tierAnalysis);
        console.log('Planet Dependencies:', analysis.planetDependencyAnalysis);
        console.log('Problematic Recipes:', analysis.problematicRecipes);
        console.log('=== END ANALYSIS REPORT ===');

        return analysis;
    };

    // Export building recipes to CSV (using recipe format)
    const exportBuildingRecipesToCSV = () => {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'ProductionSteps'
        ];

        // Helper function to properly escape CSV values
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

                // Add ingredients (up to 9)
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe.ingredients.find(ing => ing.slot === i);
                    row.push(escapeCSVValue(ingredient ? ingredient.name : ''));
                    row.push(escapeCSVValue(ingredient ? ingredient.quantity : ''));
                }

                row.push(escapeCSVValue(recipe.completionStatus));
                row.push(escapeCSVValue(recipe.productionSteps));

                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'building-recipes.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Filter buildings
    const filteredBuildings = buildings.filter(building => {
        if (buildingType === 'all') return true;
        return building.type === buildingType;
    });

    useEffect(() => {
        if (recipes && recipes.length > 0) {
            generateBuildings();
        }
    }, [recipes]);

    return (
        <div className="building-manager">
            <div className="building-manager-header">
                <h1>🏗️ Building Manager</h1>
                <div className="header-controls">
                    <select
                        value={buildingType}
                        onChange={(e) => setBuildingType(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Buildings</option>
                        <option value="hub">Hubs</option>
                        <option value="processing-hub-variant">Processing Hub Variants</option>
                        <option value="extractor">Extractors</option>
                        <option value="processor">Processors</option>
                    </select>
                    <button onClick={generateBuildings} className="btn-primary">
                        Regenerate Buildings
                    </button>
                    <button onClick={exportToCSV} className="btn-secondary">
                        Export CSV
                    </button>
                    <button
                        onClick={() => setShowProcessingHubVariants(true)}
                        className="btn-primary"
                    >
                        Add Processing Hub Variants
                    </button>
                    <button onClick={addNewHub} className="btn-primary">
                        Add Custom Hub
                    </button>
                    <button onClick={clearAllBuildings} className="btn-secondary">
                        Clear All
                    </button>
                </div>
            </div>

            <div className="building-stats">
                <div className="stat-card">
                    <h3>Total Buildings</h3>
                    <span>{buildings.length}</span>
                </div>
                <div className="stat-card">
                    <h3>Hubs</h3>
                    <span>{buildings.filter(b => b.type === 'hub').length}</span>
                </div>
                <div className="stat-card">
                    <h3>Processing Hub Variants</h3>
                    <span>{buildings.filter(b => b.type === 'processing-hub-variant').length}</span>
                </div>
                <div className="stat-card">
                    <h3>Extractors</h3>
                    <span>{buildings.filter(b => b.type === 'extractor').length}</span>
                </div>
                <div className="stat-card">
                    <h3>Processors</h3>
                    <span>{buildings.filter(b => b.type === 'processor').length}</span>
                </div>
            </div>

            <div className="building-grid">
                {filteredBuildings.map((building, index) => (
                    <div
                        key={index}
                        className={`building-card ${building.type}`}
                        onClick={() => setSelectedBuilding(building)}
                    >
                        <div className="building-header">
                            <h3>{building.buildingName}</h3>
                            <span className="building-tier">T{building.tier}</span>
                        </div>
                        <div className="building-info">
                            <p><strong>Type:</strong> {building.type}</p>
                            <p><strong>Planet Types:</strong> {building.planetType || 'N/A'}</p>
                            <p><strong>Power:</strong> {building.powerConsumption}W</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedBuilding && (
                <div className="building-modal" onClick={() => setSelectedBuilding(null)}>
                    <div className="building-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedBuilding.buildingName}</h2>
                            <button onClick={() => setSelectedBuilding(null)}>×</button>
                        </div>
                        <div className="building-details">
                            <div className="detail-group">
                                <h3>Basic Information</h3>
                                <p><strong>Building ID:</strong> {selectedBuilding.buildingID}</p>
                                <p><strong>Tier:</strong> {selectedBuilding.tier}</p>
                                <p><strong>Type:</strong> {selectedBuilding.type}</p>
                            </div>
                            <div className="detail-group">
                                <h3>Location & Access</h3>
                                <p><strong>Planet Types:</strong> {selectedBuilding.planetType}</p>
                                <p><strong>Factions:</strong> {selectedBuilding.faction}</p>
                            </div>
                            <div className="detail-group">
                                <h3>Requirements</h3>
                                <p><strong>Slots Required:</strong> {selectedBuilding.slotsRequired}</p>
                                <p><strong>Crew Slots:</strong> {selectedBuilding.crewSlots}</p>
                                <p><strong>Power Consumption:</strong> {selectedBuilding.powerConsumption}W</p>
                                <p><strong>Required Tags:</strong> {selectedBuilding.requiredTags || 'None'}</p>
                            </div>
                            <div className="detail-group">
                                <h3>Resources</h3>
                                {selectedBuilding.inputResources && (
                                    <p><strong>Input:</strong> {selectedBuilding.inputResources}</p>
                                )}
                                {selectedBuilding.outputResources && (
                                    <p><strong>Output:</strong> {selectedBuilding.outputResources}</p>
                                )}
                                {selectedBuilding.extractedResources && (
                                    <p><strong>Extracted:</strong> {selectedBuilding.extractedResources}</p>
                                )}
                            </div>
                            {(selectedBuilding.type === 'hub' || selectedBuilding.type === 'processing-hub-variant') && (
                                <div className="detail-group">
                                    <button
                                        onClick={() => setEditingBuilding(selectedBuilding)}
                                        className="btn-primary"
                                    >
                                        Edit Building Configuration
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hub Editor Modal */}
            {editingBuilding && (
                <div className="building-modal" onClick={() => setEditingBuilding(null)}>
                    <div className="building-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit {editingBuilding.buildingName}</h2>
                            <button onClick={() => setEditingBuilding(null)}>×</button>
                        </div>
                        <HubEditor
                            building={editingBuilding}
                            onSave={updateBuilding}
                            onCancel={() => setEditingBuilding(null)}
                        />
                    </div>
                </div>
            )}

            {/* Processing Hub Variants Modal */}
            {showProcessingHubVariants && (
                <div className="building-modal" onClick={() => setShowProcessingHubVariants(false)}>
                    <div className="building-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Select Recipes for Processing Hub Variants</h2>
                            <button onClick={() => setShowProcessingHubVariants(false)}>×</button>
                        </div>
                        <div className="building-details">
                            <div className="detail-group">
                                <h3>Available Recipes (2 steps or less)</h3>
                                <p>Select which recipes you want to create processing hub variants for:</p>
                                <div className="variant-selector">
                                    {getAvailableRecipes().map((recipe, index) => (
                                        <div
                                            key={index}
                                            className={`variant-card ${selectedRecipes.some(r => r.outputID === recipe.outputID) ? 'selected' : ''}`}
                                            onClick={() => toggleRecipeSelection(recipe)}
                                        >
                                            <h4>{recipe.outputName}</h4>
                                            <p>Steps: {calculateProductionSteps(recipe, recipes)}</p>
                                            <p>Planet Types: {getInheritedProperties(recipe, recipes).planetTypes || 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="form-actions">
                                    <button
                                        onClick={() => setShowProcessingHubVariants(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addProcessingHubVariants}
                                        className="btn-primary"
                                        disabled={selectedRecipes.length === 0}
                                    >
                                        Add {selectedRecipes.length} Processing Hub Variants
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

// Hub Editor Component
const HubEditor = ({ building, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        buildingName: building.buildingName,
        planetType: building.planetType,
        faction: building.faction,
        slotsRequired: building.slotsRequired,
        crewSlots: building.crewSlots,
        powerGeneration: building.powerGeneration,
        powerConsumption: building.powerConsumption,
        storageProvided: building.storageProvided,
        hubValue: building.hubValue,
        requiredTags: building.requiredTags,
        addedTags: building.addedTags,
        inputResources: building.inputResources,
        outputResources: building.outputResources,
        extractedResources: building.extractedResources
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave({
            ...building,
            ...formData,
            slotsRequired: parseInt(formData.slotsRequired),
            crewSlots: parseInt(formData.crewSlots),
            powerGeneration: parseInt(formData.powerGeneration),
            powerConsumption: parseInt(formData.powerConsumption),
            storageProvided: parseInt(formData.storageProvided),
            hubValue: parseInt(formData.hubValue)
        });
    };

    return (
        <div className="hub-editor">
            <div className="form-group">
                <label>Building Name:</label>
                <input
                    type="text"
                    value={formData.buildingName}
                    onChange={(e) => handleChange('buildingName', e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>Planet Types:</label>
                <input
                    type="text"
                    value={formData.planetType}
                    onChange={(e) => handleChange('planetType', e.target.value)}
                    placeholder="e.g., Terrestrial Planet;Volcanic Planet"
                />
            </div>

            <div className="form-group">
                <label>Factions:</label>
                <input
                    type="text"
                    value={formData.faction}
                    onChange={(e) => handleChange('faction', e.target.value)}
                    placeholder="e.g., MUD;ONI;USTUR"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                    <label>Slots Required:</label>
                    <input
                        type="number"
                        value={formData.slotsRequired}
                        onChange={(e) => handleChange('slotsRequired', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Crew Slots:</label>
                    <input
                        type="number"
                        value={formData.crewSlots}
                        onChange={(e) => handleChange('crewSlots', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Power Generation:</label>
                    <input
                        type="number"
                        value={formData.powerGeneration}
                        onChange={(e) => handleChange('powerGeneration', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Power Consumption:</label>
                    <input
                        type="number"
                        value={formData.powerConsumption}
                        onChange={(e) => handleChange('powerConsumption', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Storage Provided:</label>
                    <input
                        type="number"
                        value={formData.storageProvided}
                        onChange={(e) => handleChange('storageProvided', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Hub Value:</label>
                    <input
                        type="number"
                        value={formData.hubValue}
                        onChange={(e) => handleChange('hubValue', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Required Tags:</label>
                <input
                    type="text"
                    value={formData.requiredTags}
                    onChange={(e) => handleChange('requiredTags', e.target.value)}
                    placeholder="e.g., tag-processing-hub-t1"
                />
            </div>

            <div className="form-group">
                <label>Added Tags:</label>
                <input
                    type="text"
                    value={formData.addedTags}
                    onChange={(e) => handleChange('addedTags', e.target.value)}
                    placeholder="e.g., tag-central-hub-t1"
                />
            </div>

            <div className="form-group">
                <label>Input Resources (JSON):</label>
                <textarea
                    value={formData.inputResources}
                    onChange={(e) => handleChange('inputResources', e.target.value)}
                    placeholder='{"cargo-copper-ore": -1}'
                />
            </div>

            <div className="form-group">
                <label>Output Resources (JSON):</label>
                <textarea
                    value={formData.outputResources}
                    onChange={(e) => handleChange('outputResources', e.target.value)}
                    placeholder='{"cargo-copper": 1}'
                />
            </div>

            <div className="form-group">
                <label>Extracted Resources (JSON):</label>
                <textarea
                    value={formData.extractedResources}
                    onChange={(e) => handleChange('extractedResources', e.target.value)}
                    placeholder='{"cargo-iron-ore": 1}'
                />
            </div>

            <div className="form-actions">
                <button onClick={onCancel} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} className="btn-primary">Save Changes</button>
            </div>
        </div>
    );
};

export default BuildingManager; 