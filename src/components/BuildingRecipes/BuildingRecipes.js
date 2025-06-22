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
                setBuildingRecipes(JSON.parse(savedBuildingRecipes));
            } catch (error) {
                console.error('Error loading building recipes:', error);
                setBuildingRecipes([]);
            }
        }
    }, []);

    // Save building recipes to localStorage whenever they change
    useEffect(() => {
        if (buildingRecipes.length > 0) {
            localStorage.setItem('building-recipes', JSON.stringify(buildingRecipes));
        }
    }, [buildingRecipes]);

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
                const resourceName = building.buildingName.replace(/ Extractor T\d+$/, '');
                resourcesWithBuildings.add(resourceName);
            } else if (building.type === 'processor') {
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

        const targetPlanets = targetBuilding.planetType ? targetBuilding.planetType.split(';').map(p => p.trim()) : [];
        const targetResourceTier = recipe.targetResourceTier || 1;
        const baseComplexity = Math.max(targetBuilding.tier, targetResourceTier);

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

        // Calculate difficulty score (ensure it's never negative)
        let score = baseComplexity + // Base difficulty from resource tier
            (analysis.planetDependencies.size * 1.5) + // Planet complexity
            (analysis.tierSpread * 2) + // Tier spread penalty
            (recipe.ingredients.length * 0.5) + // Ingredient count
            (analysis.issues.length * 3); // Issues penalty

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

    // Generate recipe for a building using REAL CSV data
    const generateBuildingRecipe = (building) => {
        const availableResources = getAvailableResources();
        const resourcesWithBuildings = getResourcesWithBuildings();
        const tier = building.tier;
        const buildingPlanets = building.planetType ? building.planetType.split(';').map(p => p.trim()) : [];

        // Get the tier of the resource this building extracts/processes
        const targetResourceTier = getTargetResourceTier(building);

        // Use the higher of building tier or resource tier for complexity
        const complexityTier = Math.max(tier, targetResourceTier);

        const candidateIngredients = [];

        // Allow ingredients up to the complexity tier
        for (let t = 1; t <= complexityTier; t++) {
            const tierResources = availableResources.byTier[t] || [];
            candidateIngredients.push(...tierResources);
        }

        // Approved building materials list
        const approvedBuildingMaterials = new Set([
            // Core Structural Materials
            'Steel', 'Iron', 'Titanium', 'Aluminum', 'Titanium Alloy', 'Steel Alloy',
            'Carbon Fiber', 'Framework 1', 'Framework 3', 'Silica',

            // Electronic & Control Systems
            'Circuit Board', 'Copper Wire', 'Fiber Optic Bundle', 'Sensor Chip',
            'Control Circuit', 'Power Junction Hub', 'Quantum Data Processor', 'Neural Processing Core',

            // Mechanical Components
            'Drive Motor', 'Servo Motor', 'Magnet', 'Mounting Hardware', 'Transport Belt',
            'Flow Regulator', 'Sealing Ring', 'Lock Mechanism',

            // Specialized Processing Equipment
            'Thermal Distribution System', 'Cooling System', 'Energy Capacitor',
            'Pressure Vessel Steel', 'Pressure Vessel Titanium', 'Quantum Energy Conduits', 'Superconductor Grid',

            // Quality & Safety Systems
            'Scanner Module', 'Thermal Sensor', 'Performance Monitor',
            'Circuit Breaker Assembly', 'Surge Absorber', 'Repair Kit 1', 'Repair Kit 3',

            // Advanced/Specialized Materials
            'Quantum Shield Core', 'Osmium Plating', 'Platinum Alloy', 'Tungsten Composite',
            'Polymer', 'Graphene'
        ]);

        const filteredCandidates = candidateIngredients.filter(resource => {
            if (resource.outputType === 'BASIC RESOURCE') return false;
            if (!approvedBuildingMaterials.has(resource.outputName)) return false;
            if (!resourcesWithBuildings.has(resource.outputName)) return false;
            return true;
        });

        // Categorize by building type and purpose
        const buildingType = building.type.toLowerCase();
        const buildingName = building.buildingName.toLowerCase();

        const componentsByCategory = {
            structural: filteredCandidates.filter(r => {
                const structuralMaterials = ['Steel', 'Iron', 'Titanium', 'Aluminum', 'Titanium Alloy', 'Steel Alloy',
                    'Carbon Fiber', 'Framework 1', 'Framework 3', 'Silica'];
                return structuralMaterials.includes(r.outputName);
            }),
            electronic: filteredCandidates.filter(r => {
                const electronicMaterials = ['Circuit Board', 'Copper Wire', 'Fiber Optic Bundle', 'Sensor Chip',
                    'Control Circuit', 'Power Junction Hub', 'Quantum Data Processor', 'Neural Processing Core', 'Graphene'];
                return electronicMaterials.includes(r.outputName);
            }),
            mechanical: filteredCandidates.filter(r => {
                const mechanicalMaterials = ['Drive Motor', 'Servo Motor', 'Magnet', 'Mounting Hardware',
                    'Transport Belt', 'Flow Regulator', 'Sealing Ring', 'Lock Mechanism'];
                return mechanicalMaterials.includes(r.outputName);
            }),
            processing: filteredCandidates.filter(r => {
                const processingMaterials = ['Thermal Distribution System', 'Cooling System', 'Energy Capacitor',
                    'Pressure Vessel Steel', 'Pressure Vessel Titanium', 'Quantum Energy Conduits', 'Superconductor Grid'];
                return processingMaterials.includes(r.outputName);
            }),
            safety: filteredCandidates.filter(r => {
                const safetyMaterials = ['Scanner Module', 'Thermal Sensor', 'Performance Monitor',
                    'Circuit Breaker Assembly', 'Surge Absorber', 'Repair Kit 1', 'Repair Kit 3'];
                return safetyMaterials.includes(r.outputName);
            }),
            advanced: filteredCandidates.filter(r => {
                const advancedMaterials = ['Quantum Shield Core', 'Osmium Plating', 'Platinum Alloy',
                    'Tungsten Composite', 'Polymer'];
                return advancedMaterials.includes(r.outputName);
            }),
            thematic: filteredCandidates.filter(r => {
                if (buildingType === 'extractor') {
                    return ['Drive Motor', 'Servo Motor', 'Flow Regulator', 'Thermal Distribution System',
                        'Scanner Module', 'Sealing Ring'].includes(r.outputName);
                } else if (buildingType === 'processor') {
                    return ['Thermal Distribution System', 'Cooling System', 'Flow Regulator', 'Energy Capacitor',
                        'Pressure Vessel Steel', 'Pressure Vessel Titanium', 'Performance Monitor'].includes(r.outputName);
                } else if (buildingType === 'hub') {
                    return ['Control Circuit', 'Power Junction Hub', 'Quantum Data Processor', 'Neural Processing Core',
                        'Fiber Optic Bundle', 'Circuit Breaker Assembly'].includes(r.outputName);
                }
                return false;
            }),
            native: filteredCandidates.filter(r => {
                if (!r.planetTypes) return false;
                const resourcePlanets = r.planetTypes.split(';').map(p => p.trim());
                const hasMatchingPlanet = buildingPlanets.some(buildingPlanet =>
                    resourcePlanets.includes(buildingPlanet) && buildingPlanet !== 'All Types'
                );
                return hasMatchingPlanet;
            })
        };

        const selectedIngredients = [];
        const usedBaseNames = new Set();

        // Adjust ingredient count - fewer total ingredients for lower tiers to encourage native use
        const baseIngredientCount = complexityTier <= 2 ? 3 : // T1-T2: 3 ingredients (mostly native)
            complexityTier <= 3 ? 4 : // T3: 4 ingredients 
                5 + Math.floor(complexityTier / 2); // T4+: 5-7 ingredients
        const targetIngredientCount = Math.min(baseIngredientCount, 7);

        // Helper function to add ingredient avoiding duplicates
        const addIngredient = (candidates, maxCount = 1, preferHigherTier = false) => {
            const availableCandidates = candidates.filter(r => {
                const baseName = getBaseName(r.outputName);
                const isAlreadyUsed = usedBaseNames.has(baseName) || selectedIngredients.includes(r.outputName);

                // Extra check for Crystal Lattice variants specifically
                const isCrystalLattice = r.outputName.toLowerCase().includes('crystal lattice');
                const hasCrystalLatticeVariant = isCrystalLattice && selectedIngredients.some(existing =>
                    existing.toLowerCase().includes('crystal lattice')
                );

                return !isAlreadyUsed &&
                    !hasCrystalLatticeVariant &&
                    (r.outputTier || 1) <= complexityTier;
            }).sort((a, b) => {
                if (preferHigherTier) {
                    return (b.outputTier || 1) - (a.outputTier || 1); // Higher tier first
                }
                return (a.outputTier || 1) - (b.outputTier || 1); // Lower tier first
            });

            let added = 0;
            for (const candidate of availableCandidates) {
                if (added >= maxCount || selectedIngredients.length >= targetIngredientCount) break;
                selectedIngredients.push(candidate.outputName);
                usedBaseNames.add(getBaseName(candidate.outputName));
                added++;
            }
            return added;
        };

        // For higher complexity, prefer higher tier components
        const preferHigherTier = complexityTier >= 3;

        // PRIORITIZE NATIVE PLANET COMPONENTS FIRST - especially for lower tiers
        if (componentsByCategory.native.length > 0) {
            // For lower tiers, use MORE native components to reduce planet dependencies
            const nativeCount = complexityTier <= 2 ? Math.min(3, targetIngredientCount - 1) : // T1-T2: up to 3 native
                complexityTier <= 3 ? Math.min(2, targetIngredientCount - 2) : // T3: up to 2 native  
                    Math.min(1, targetIngredientCount - 3); // T4+: up to 1 native

            addIngredient(componentsByCategory.native, nativeCount, preferHigherTier);
        }

        // Add structural components (essential for all buildings)
        if (selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.structural, 1, preferHigherTier);
        }

        // Add electronic components (essential for all buildings)  
        if (selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.electronic, 1, preferHigherTier);
        }

        // Add thematic components based on building type
        if (selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.thematic, 1, preferHigherTier);
        }

        // Add mechanical components for extractors and processors
        if ((buildingType === 'extractor' || buildingType === 'processor') && selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.mechanical, 1, preferHigherTier);
        }

        // Add processing equipment for higher complexity
        if (complexityTier >= 2 && selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.processing, 1, preferHigherTier);
        }

        // Add safety systems for higher tiers
        if (complexityTier >= 3 && selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.safety, 1, preferHigherTier);
        }

        // Add advanced materials for highest tiers
        if (complexityTier >= 4 && selectedIngredients.length < targetIngredientCount) {
            addIngredient(componentsByCategory.advanced, 1, preferHigherTier);
        }

        // Fill remaining slots with diverse components
        if (selectedIngredients.length < targetIngredientCount) {
            const remainingOptions = filteredCandidates.filter(r => {
                const baseName = getBaseName(r.outputName);
                return !usedBaseNames.has(baseName) &&
                    !selectedIngredients.includes(r.outputName) &&
                    (r.outputTier || 1) <= complexityTier;
            }).sort((a, b) => {
                if (preferHigherTier) {
                    return (b.outputTier || 1) - (a.outputTier || 1);
                }
                return (a.outputTier || 1) - (b.outputTier || 1);
            });

            addIngredient(remainingOptions, targetIngredientCount - selectedIngredients.length, preferHigherTier);
        }

        // Fallback if no ingredients found
        if (selectedIngredients.length === 0) {
            const fallbackOptions = candidateIngredients.filter(r => (r.outputTier || 1) === 1);
            if (fallbackOptions.length > 0) {
                selectedIngredients.push(fallbackOptions[0].outputName);
            }
        }

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
            targetResourceTier: targetResourceTier, // Store for analysis
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
            'CompletionStatus', 'ProductionSteps'
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
                        onClick={exportBuildingRecipesToCSV}
                        className="btn-secondary"
                        disabled={buildingRecipes.length === 0}
                    >
                        📤 Export CSV
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
                                                {recipe.analysis?.issues.length > 0 && (
                                                    <span className="issues-indicator">⚠️ {recipe.analysis.issues.length} issues</span>
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
                                                🌍 {recipe.analysis?.planetDependencies.size || 0}
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
                                        <p><strong>Planet Dependencies:</strong> {selectedRecipe.analysis.planetDependencies.size}</p>
                                        <p><strong>Native Planet Match:</strong> {selectedRecipe.analysis.nativePlanetMatch ? 'Yes' : 'No'}</p>
                                        <p><strong>Tier Complexity:</strong> {selectedRecipe.analysis.tierComplexity}</p>

                                        {selectedRecipe.analysis.issues.length > 0 && (
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