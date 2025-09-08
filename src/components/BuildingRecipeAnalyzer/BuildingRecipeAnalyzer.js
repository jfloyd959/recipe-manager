import React, { useState, useEffect } from 'react';
import './BuildingRecipeAnalyzer.css';

const BuildingRecipeAnalyzer = () => {
    const [recipeInput, setRecipeInput] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [fixedRecipes, setFixedRecipes] = useState('');
    const [showFixed, setShowFixed] = useState(false);
    const [resourcePreferences, setResourcePreferences] = useState(null);
    const [showRedistribution, setShowRedistribution] = useState(false);
    const [redistributedRecipes, setRedistributedRecipes] = useState('');

    // TIER VALIDATION RULES:
    // 1. Components used in buildings cannot exceed buildingResourceTier
    // 2. Exception: T4/T5 buildings can use components up to buildingResourceTier + 1
    // 3. Raw materials should only be used in T1 buildings (bootstrap)
    // 4. Biomass and other critical resources should never be used in buildings

    // Load resource preferences on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const response = await fetch('/resourcePreferences.json');
                if (response.ok) {
                    const data = await response.json();
                    setResourcePreferences(data.preferences || []);
                }
            } catch (error) {
                console.log('Could not load resourcePreferences.json:', error);
            }
        };
        loadPreferences();
    }, []);

    // Building type patterns - recognize all the new hub types and planet variants
    const buildingTypePatterns = {
        hubs: /\b(Central Hub|Cultivation Hub|Processing Hub|Extraction Hub|Storage Hub|Farm Hub)\b/i,
        infrastructure: /\b(Power Plant|Crew Quarters|Storage Module)\b/i,
        processors: /\bProcessor\b/i,
        extractors: /\b(Extractor|Extraction)\b/i,
        planetPrefixes: /^(Terrestrial|Volcanic|Oceanic|Barren|Dark|Ice-giant|Gas-giant|Asteroid)\s+/i
    };

    // Raw materials that should only be used in T1 buildings
    const rawMaterials = new Set([
        'Chromite Ore', 'Copper Ore', 'Iron Ore', 'Aluminum Ore', 'Biomass',
        'Arco', 'Silicon Crystal', 'Quartz Crystals', 'Sodium Crystals',
        'Tin Ore', 'Zinc Ore', 'Lithium Ore', 'Boron Ore', 'Carbon',
        'Hydrogen', 'Nitrogen', 'Oxygen', 'Krypton', 'Argon', 'Neon',
        'Thermal Regulator Stone', 'Thermoplastic Resin', 'Amber Resin'
    ]);

    // Components made from raw materials (for replacement suggestions)
    const rawToComponent = {
        'Chromite Ore': 'Chromite',
        'Copper Ore': 'Copper',
        'Iron Ore': 'Iron',
        'Aluminum Ore': 'Aluminum',
        'Tin Ore': 'Tin',
        'Zinc Ore': 'Zinc',
        'Lithium Ore': 'Lithium',
        'Boron Ore': 'Boron',
        'Biomass': 'Bio Stabilizer', // Should not be used in buildings at all
        'Carbon': 'Graphene',
        'Hydrogen': 'Hydrocarbon',
        'Silicon Crystal': 'Silicon Wafers',
        'Quartz Crystals': 'Optical Components'
    };

    // Banned materials for buildings
    const bannedForBuildings = new Set([
        'Biomass', 'Food', 'Medical Nanites', 'Repair Kit',
        // Weapon components
        'Blast Charges', 'Ammo Control Core', 'Beam Interface Core', 'Beam Emitter',
        'Explosive Compound', 'Explosive Core', 'Incendiary Mix', 'Thermal Charges',
        'Precision Detonator', 'Kinetic Amplifier', 'Photon Emitters',
        // Ship components
        'Warp Coils', 'Subspace Coils', 'Phase Drive Core', 'Drive Assembly Core',
        'Launch Platform Core', 'Jasphorus Propulsion Core', 'Kinetic Opal Core'
    ]);

    // Component tier mapping (for validation)
    const componentTiers = {
        // T1 Components
        'Framework': 1, 'Alloy Frame': 1, 'Base Structure': 1, 'Copper': 1, 'Iron': 1,
        'Tin': 1, 'Zinc': 1, 'Chromite': 1, 'Energy Cells': 1, 'Power Source': 1,
        'Storage Matrix': 1, 'Thermal Control Unit': 1, 'Heat Exchange Coils': 1,
        'Heavy Alloy': 1, 'Load Bearing Beams': 1, 'Structural Joint': 1, 'Sensor Array': 1,
        'Protective Coating': 1, 'Transfer Lines': 1, 'Utility Interface': 1, 'Copper Wire': 1,
        'Heat Distribution Grid': 1, 'Heat Circulation Pipes': 1, 'Fire Suppressant': 1,
        'Barrier Material': 1, 'Insulation Material': 1, 'Tank Shell': 1, 'Sensor Elements': 1,

        // T2 Components
        'Aluminum': 2, 'Boron': 2, 'Cobalt': 2, 'Lithium': 2, 'Manganese': 2,
        'Climate Controller': 2, 'Heat Dissipator': 2, 'Voltage Regulator': 2,
        'Current Limiter': 2, 'Reactive Coating': 2, 'Bio Stabilizer': 2,
        'Boron Composite': 2, 'Structural Brace': 2, 'Temperature Regulator': 2,
        'Safety Shutoff': 2, 'Coolant Circulator': 2, 'Coupling Interface': 2,
        'Power Distribution Hub': 2, 'Emergency Suppressant': 2, 'Interference Shield': 2,

        // T3 Components
        'Steel': 3, 'Titanium': 3, 'Gold': 3, 'Silver': 3, 'Platinum': 3, 'Palladium': 3,
        'Utility Core': 3, 'Energy Crystal Matrix': 3, 'Capacitor Matrix Core': 3,
        'Processing Control Core': 3, 'Coordination Matrix': 3, 'Gold Contacts': 3,
        'Palladium Conductor': 3, 'Platinum Grid': 3, 'Cryogenic Core': 3,
        'Defense Crystal Array': 3, 'Chisenic Processor': 3, 'Neural Interface': 3,
        'Scaling Interface': 3, 'Storage Control Core': 3, 'EMP Matrix Core': 3,

        // T4 Components
        'Dysprosium': 4, 'Iridium': 4, 'Zirconium': 4, 'Ochre': 4,
        'Capacity Control Core': 4, 'Mega Framework Core': 4, 'Power Management Core': 4,
        'Defense Coordination Core': 4, 'Abyssal Energy Core': 4, 'EM Quantum Core': 4,
        'Quantum Processor': 4, 'Energy Substrate': 4, 'Radiation Absorber': 4,
        'Hicenium Lattice': 4, 'Dodiline Matrix': 4, 'Control System Core': 4,
        'Navigation Control Core': 4, 'Fire Control Core': 4, 'Launch Control Core': 4,

        // T5 Components
        'Adaptive Utility Core': 5, 'Assembly Control Matrix': 5, 'Energy Network Core': 5,
        'Living Metal Network': 5, 'Quantum Interface Core': 5, 'Beryllium Matrix': 5,
        'Bioluminescent Interface': 5, 'Bioluminescent Interface Processor': 5,
        'Fusion Energy Core': 5, 'Quantum Drive Matrix': 5, 'Drive Assembly Core': 5,
        'Launch Platform Core': 5, 'Jasphorus Propulsion Core': 5, 'Kinetic Opal Core': 5,
        'Opal Defense Matrix': 5, 'Lunar Defense Network': 5, 'Advanced Defense Core': 5
    };

    // Preferred building components by tier - suitable for infrastructure
    const preferredComponentsByTier = {
        1: ['Framework', 'Alloy Frame', 'Base Structure', 'Copper', 'Iron', 'Tin', 'Zinc',
            'Energy Cells', 'Power Source', 'Storage Matrix', 'Thermal Control Unit',
            'Heavy Alloy', 'Load Bearing Beams', 'Structural Joint', 'Protective Coating'],
        2: ['Aluminum', 'Boron', 'Cobalt', 'Lithium', 'Manganese', 'Climate Controller',
            'Heat Dissipator', 'Protective Coating', 'Voltage Regulator', 'Current Limiter',
            'Structural Brace', 'Temperature Regulator', 'Power Distribution Hub'],
        3: ['Steel', 'Titanium', 'Utility Core', 'Energy Crystal Matrix',
            'Capacitor Matrix Core', 'Processing Control Core', 'Coordination Matrix',
            'Gold Contacts', 'Platinum Grid', 'Storage Control Core'],
        4: ['Dysprosium', 'Iridium', 'Zirconium', 'Capacity Control Core', 'Mega Framework Core',
            'Power Management Core', 'Energy Substrate', 'Radiation Absorber', 'Hicenium Lattice'],
        5: ['Adaptive Utility Core', 'Assembly Control Matrix', 'Energy Network Core',
            'Living Metal Network', 'Quantum Interface Core', 'Beryllium Matrix',
            'Bioluminescent Interface', 'Fusion Energy Core']
    };

    const parseRecipes = (input) => {
        const lines = input.trim().split('\n');
        const headers = lines[0].split('\t');
        const recipes = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const recipe = {};

            headers.forEach((header, index) => {
                recipe[header] = values[index] || '';
            });

            // Parse ingredients
            recipe.ingredients = [];
            for (let j = 1; j <= 7; j++) {
                const ingredientKey = `Ingredient${j}`;
                const quantityKey = `Quantity${j}`;

                if (recipe[ingredientKey] && recipe[ingredientKey].trim()) {
                    recipe.ingredients.push({
                        name: recipe[ingredientKey],
                        quantity: parseInt(recipe[quantityKey]) || 0
                    });
                }
            }

            recipes.push(recipe);
        }

        return recipes;
    };

    const analyzeRecipes = () => {
        if (!recipeInput.trim()) {
            alert('Please paste building recipe data first');
            return;
        }

        try {
            const recipes = parseRecipes(recipeInput);
            const issues = [];
            const fixes = [];
            const stats = {
                totalRecipes: recipes.length,
                tierDistribution: {},
                planetDistribution: {},
                rawMaterialMisuse: 0,
                bannedMaterials: 0,
                tierMismatch: 0,
                componentTierExceeds: 0,
                bootstrapIssues: 0,
                planetImbalance: false,
                duplicates: [],
                duplicateCount: 0,
                outputIdCollisions: [],
                outputIdCollisionCount: 0
            };

            // First, detect duplicates (considering planet-specific variants)
            const recipeMap = new Map();
            const duplicateGroups = new Map();

            recipes.forEach((recipe, index) => {
                // Create a unique key including planet type for proper duplicate detection
                // Buildings with same name but different planets are NOT duplicates
                const planetType = recipe.PlanetTypes || 'Universal';
                const key = `${recipe.OutputName}_T${recipe.OutputTier}_RT${recipe.BuildingResourceTier}_${planetType}`;

                if (recipeMap.has(key)) {
                    // Found a true duplicate (same name, tier, resource tier, AND planet)
                    if (!duplicateGroups.has(key)) {
                        duplicateGroups.set(key, [recipeMap.get(key)]);
                    }
                    duplicateGroups.get(key).push(index);
                    stats.duplicateCount++;
                } else {
                    recipeMap.set(key, index);
                }
            });

            // Store duplicate information
            duplicateGroups.forEach((indices, key) => {
                stats.duplicates.push({
                    key,
                    count: indices.length,
                    indices,
                    recipe: recipes[indices[0]]
                });
            });

            // Detect OutputID collisions (same ID but different recipes)
            const outputIdMap = new Map();
            const outputIdCollisions = new Map();

            recipes.forEach((recipe, index) => {
                const outputId = recipe.OutputID;
                if (!outputId) return;

                // Create a signature of the recipe (ingredients and planet)
                const recipeSignature = `${recipe.PlanetTypes}_${recipe.OutputName}_${recipe.ingredients.map(i => i.name).sort().join(',')}`;

                if (outputIdMap.has(outputId)) {
                    const existingSignature = outputIdMap.get(outputId).signature;
                    if (existingSignature !== recipeSignature) {
                        // Found a collision - same ID but different recipe
                        if (!outputIdCollisions.has(outputId)) {
                            outputIdCollisions.set(outputId, [outputIdMap.get(outputId)]);
                        }
                        outputIdCollisions.get(outputId).push({ index, signature: recipeSignature, recipe });
                        stats.outputIdCollisionCount++;
                    }
                } else {
                    outputIdMap.set(outputId, { index, signature: recipeSignature, recipe });
                }
            });

            // Store collision information
            outputIdCollisions.forEach((collisions, outputId) => {
                stats.outputIdCollisions.push({
                    outputId,
                    count: collisions.length,
                    recipes: collisions.map(c => ({
                        name: c.recipe.OutputName,
                        planet: c.recipe.PlanetTypes,
                        ingredients: c.recipe.ingredients.map(i => i.name).join(', ')
                    }))
                });
            });

            // Analyze each recipe
            recipes.forEach(recipe => {
                const buildingTier = parseInt(recipe.OutputTier);
                const resourceTier = parseInt(recipe.BuildingResourceTier);
                const buildingName = recipe.OutputName || '';
                const recipeIssues = [];

                // Track tier distribution
                const tierKey = `T${buildingTier}`;
                stats.tierDistribution[tierKey] = (stats.tierDistribution[tierKey] || 0) + 1;

                // Track planet distribution
                // Handle multi-planet buildings (e.g., "Barren Planet;Volcanic Planet")
                const planetString = recipe.PlanetTypes || 'Unknown';
                if (planetString.includes(';')) {
                    // Multi-planet building - count for each planet
                    const planets = planetString.split(';').map(p => p.trim());
                    planets.forEach(planet => {
                        stats.planetDistribution[planet] = (stats.planetDistribution[planet] || 0) + 1;
                    });
                } else {
                    // Single planet building
                    stats.planetDistribution[planetString] = (stats.planetDistribution[planetString] || 0) + 1;
                }

                // Check for proper building type naming
                const isHub = buildingTypePatterns.hubs.test(buildingName);
                const isInfrastructure = buildingTypePatterns.infrastructure.test(buildingName);
                const isProcessor = buildingTypePatterns.processors.test(buildingName);
                const isExtractor = buildingTypePatterns.extractors.test(buildingName);
                const hasPlanetPrefix = buildingTypePatterns.planetPrefixes.test(buildingName);

                // Validate planet-specific naming for hubs and infrastructure
                if ((isHub || isInfrastructure) && !buildingName.includes('Storage Module')) {
                    if (!hasPlanetPrefix) {
                        recipeIssues.push({
                            type: 'NAMING_ISSUE',
                            severity: 'MEDIUM',
                            message: `Hub/Infrastructure building "${buildingName}" should have planet-specific prefix`,
                            suggestion: `Add planet prefix (e.g., "Terrestrial ${buildingName}", "Volcanic ${buildingName}")`
                        });
                    }
                }

                // Validate OutputID for planet-specific buildings
                const outputId = recipe.OutputID || '';
                const planetType = recipe.PlanetTypes || '';

                // Storage Modules and other buildings with same name but different planets
                // should have planet prefix in OutputID for uniqueness
                if (buildingName.includes('Storage Module') ||
                    (isInfrastructure && !hasPlanetPrefix)) {
                    const expectedPlanetPrefix = planetType.toLowerCase()
                        .replace(/\s+planet/gi, '')
                        .replace(/\s+/g, '-')
                        .replace(/system-asteroid-belt/gi, 'asteroid');

                    if (!outputId.includes(expectedPlanetPrefix)) {
                        recipeIssues.push({
                            type: 'OUTPUTID_ISSUE',
                            severity: 'HIGH',
                            message: `Building "${buildingName}" on ${planetType} should have planet-specific OutputID`,
                            suggestion: `OutputID should be "${expectedPlanetPrefix}-${outputId}" to ensure uniqueness across planets`
                        });
                    }
                }

                // Check each ingredient
                recipe.ingredients.forEach((ingredient, index) => {
                    // Check for banned materials
                    if (bannedForBuildings.has(ingredient.name)) {
                        // Get intelligent replacement suggestion
                        const replacementName = getReplacementComponent(recipe, ingredient.name, index);
                        recipeIssues.push({
                            type: 'BANNED_MATERIAL',
                            severity: 'HIGH',
                            message: `${ingredient.name} should not be used in buildings (needed for other systems)`,
                            ingredient: ingredient.name,
                            position: index + 1,
                            suggestion: `Replace with "${replacementName}" (from resource preferences for ${recipe.PlanetTypes || 'planet'} T${resourceTier})`
                        });
                        stats.bannedMaterials++;
                    }

                    // Check for raw material misuse (should only be in T1)
                    if (rawMaterials.has(ingredient.name) && buildingTier > 1) {
                        recipeIssues.push({
                            type: 'RAW_MATERIAL_MISUSE',
                            severity: 'HIGH',
                            message: `Raw material "${ingredient.name}" used in T${buildingTier} building (should only be in T1)`,
                            ingredient: ingredient.name,
                            position: index + 1,
                            suggestion: rawToComponent[ingredient.name] || 'Use processed component'
                        });
                        stats.rawMaterialMisuse++;
                    }

                    // Check for bootstrap issues in T1
                    if (buildingTier === 1 && resourceTier > 1 && rawMaterials.has(ingredient.name)) {
                        recipeIssues.push({
                            type: 'BOOTSTRAP_ISSUE',
                            severity: 'MEDIUM',
                            message: `Bootstrap raw material "${ingredient.name}" in T1 with resource tier ${resourceTier}`,
                            ingredient: ingredient.name,
                            position: index + 1,
                            suggestion: `Consider using ${rawToComponent[ingredient.name] || 'processed component'} for higher resource tiers`
                        });
                        stats.bootstrapIssues++;
                    }

                    // Check component tier vs buildingResourceTier
                    // Skip raw materials as they're handled separately
                    if (!rawMaterials.has(ingredient.name)) {
                        const componentTier = componentTiers[ingredient.name];

                        if (componentTier) {
                            // For T4/T5 buildings, allow components up to buildingResourceTier + 1
                            // For T1-T3 buildings, components must be ≤ buildingResourceTier
                            const maxAllowedTier = (buildingTier >= 4) ? resourceTier + 1 : resourceTier;

                            if (componentTier > maxAllowedTier) {
                                recipeIssues.push({
                                    type: 'COMPONENT_TIER_EXCEEDS_RESOURCE_TIER',
                                    severity: 'HIGH',
                                    message: `Component "${ingredient.name}" (T${componentTier}) exceeds building resource tier ${resourceTier}`,
                                    ingredient: ingredient.name,
                                    position: index + 1,
                                    suggestion: `Components must be ≤ building resource tier${buildingTier >= 4 ? ' (+1 allowed for T4/T5 buildings)' : ''}. Current max: T${maxAllowedTier}`
                                });
                                stats.componentTierExceeds++;
                            }
                        } else {
                            // Unknown component - flag for review
                            console.warn(`Unknown component tier for: ${ingredient.name}`);
                        }
                    }
                });

                // Check ingredient diversity
                const uniqueIngredients = new Set(recipe.ingredients.map(i => i.name));
                if (uniqueIngredients.size < recipe.ingredients.length * 0.7) {
                    recipeIssues.push({
                        type: 'LOW_DIVERSITY',
                        severity: 'LOW',
                        message: 'Low ingredient diversity - consider using more varied components'
                    });
                }

                if (recipeIssues.length > 0) {
                    issues.push({
                        recipe: `${recipe.OutputName} T${buildingTier}`,
                        recipeId: recipe.OutputID,
                        issues: recipeIssues
                    });
                }

                // Generate fixed recipe
                const fixedIngredients = fixRecipeIngredients(recipe);
                fixes.push({
                    ...recipe,
                    fixedIngredients
                });
            });

            // Check for planet distribution imbalance
            const planetCounts = Object.values(stats.planetDistribution);
            if (planetCounts.length > 0) {
                const avgCount = planetCounts.reduce((a, b) => a + b, 0) / planetCounts.length;
                const maxCount = Math.max(...planetCounts);
                const minCount = Math.min(...planetCounts);

                // Flag imbalance if any planet has more than 3x the average or if max is > 5x min
                if (maxCount > avgCount * 3 || (minCount > 0 && maxCount > minCount * 5)) {
                    stats.planetImbalance = true;

                    // Find the planet with excessive buildings
                    const excessivePlanet = Object.entries(stats.planetDistribution)
                        .find(([planet, count]) => count === maxCount)?.[0];

                    // Add a special issue for planet imbalance
                    const imbalanceIssue = {
                        recipe: `SYSTEM ISSUE - Planet Distribution`,
                        recipeId: 'PLANET-IMBALANCE',
                        issues: [{
                            type: 'PLANET_IMBALANCE',
                            severity: 'HIGH',
                            message: `Severe planet distribution imbalance detected! ${excessivePlanet} has ${maxCount} buildings (avg: ${Math.round(avgCount)})`,
                            suggestion: `Review recipe generation logic. Expected even distribution across planets. Possible causes: duplicate recipes, incorrect planet assignment, or generation loop issues.`,
                            details: Object.entries(stats.planetDistribution)
                                .sort(([, a], [, b]) => b - a)
                                .map(([planet, count]) => `${planet}: ${count}`)
                                .join(', ')
                        }]
                    };

                    // Add to beginning of issues list for visibility
                    issues.unshift(imbalanceIssue);
                }
            }

            // Add duplicate detection to issues if found
            if (stats.duplicateCount > 0) {
                const duplicateIssue = {
                    recipe: `DUPLICATES FOUND - ${stats.duplicateCount} duplicate recipes`,
                    recipeId: 'DUPLICATE-RECIPES',
                    issues: [{
                        type: 'DUPLICATE_RECIPES',
                        severity: 'HIGH',
                        message: `Found ${stats.duplicateCount} duplicate recipes across ${stats.duplicates.length} unique buildings`,
                        suggestion: `Remove duplicates or use "Redistribute Recipes" feature to balance across planets evenly.`,
                        details: stats.duplicates.slice(0, 5).map(d =>
                            `${d.recipe.OutputName} T${d.recipe.OutputTier}: ${d.count} copies`
                        ).join(', ') + (stats.duplicates.length > 5 ? '...' : '')
                    }]
                };
                issues.unshift(duplicateIssue);
            }

            // Add OutputID collision detection to issues if found
            if (stats.outputIdCollisionCount > 0) {
                const collisionIssue = {
                    recipe: `OUTPUTID COLLISIONS - ${stats.outputIdCollisionCount} ID conflicts`,
                    recipeId: 'OUTPUTID-COLLISIONS',
                    issues: [{
                        type: 'OUTPUTID_COLLISION',
                        severity: 'CRITICAL',
                        message: `Found ${stats.outputIdCollisionCount} OutputID collisions (same ID for different recipes)`,
                        suggestion: `Each planet-specific building variant needs a unique OutputID. Add planet prefix to IDs.`,
                        details: stats.outputIdCollisions.slice(0, 3).map(c =>
                            `${c.outputId}: ${c.count} different recipes (${c.recipes.map(r => r.planet).join(', ')})`
                        ).join(' | ') + (stats.outputIdCollisions.length > 3 ? '...' : '')
                    }]
                };
                issues.unshift(collisionIssue);
            }

            // Generate analysis results
            const results = {
                stats,
                issues,
                fixes,
                summary: generateSummary(stats, issues)
            };

            setAnalysisResults(results);
            generateFixedRecipesTSV(fixes);

        } catch (error) {
            alert('Error parsing recipes: ' + error.message);
            console.error(error);
        }
    };

    // Find matching resource preferences based on planet and tiers
    const findMatchingPreferences = (planet, resourceTier, buildingTier) => {
        if (!resourcePreferences) return null;

        // Try exact match first
        let match = resourcePreferences.find(pref =>
            pref.planet === planet &&
            pref.buildingResourceTier === resourceTier &&
            pref.buildingTier === buildingTier
        );

        // If no exact match, try same planet and resource tier
        if (!match) {
            match = resourcePreferences.find(pref =>
                pref.planet === planet &&
                pref.buildingResourceTier === resourceTier
            );
        }

        // If still no match, try same resource tier
        if (!match) {
            match = resourcePreferences.find(pref =>
                pref.buildingResourceTier === resourceTier
            );
        }

        return match;
    };

    // Get suitable replacement component from preferences
    const getReplacementComponent = (recipe, bannedComponent, index) => {
        const buildingTier = parseInt(recipe.OutputTier);
        const resourceTier = parseInt(recipe.BuildingResourceTier);
        const planet = recipe.PlanetTypes || 'Terrestrial Planet';

        // Find matching preferences
        const prefs = findMatchingPreferences(planet, resourceTier, buildingTier);

        if (prefs && prefs.resources) {
            // For Biomass, prefer structural components
            if (bannedComponent === 'Biomass') {
                const structuralComponents = prefs.resources.filter(r =>
                    r.tier <= resourceTier &&
                    (r.name.includes('Framework') ||
                        r.name.includes('Frame') ||
                        r.name.includes('Structure') ||
                        r.name.includes('Joint') ||
                        r.name.includes('Beam'))
                );

                if (structuralComponents.length > 0) {
                    return structuralComponents[index % structuralComponents.length].name;
                }
            }

            // For other banned materials, use any suitable component from preferences
            const suitableComponents = prefs.resources.filter(r =>
                r.tier <= resourceTier && !bannedForBuildings.has(r.name)
            );

            if (suitableComponents.length > 0) {
                return suitableComponents[index % suitableComponents.length].name;
            }
        }

        // Fallback to default tier components
        const tierComponents = preferredComponentsByTier[Math.min(resourceTier, 5)];
        if (bannedComponent === 'Biomass') {
            return tierComponents.find(c => c.includes('Frame') || c.includes('Structure')) || tierComponents[0];
        }
        return tierComponents[index % tierComponents.length];
    };

    const fixRecipeIngredients = (recipe) => {
        const buildingTier = parseInt(recipe.OutputTier);
        const resourceTier = parseInt(recipe.BuildingResourceTier);
        const planet = recipe.PlanetTypes || 'Terrestrial Planet';
        const fixedIngredients = [];

        // Get matching preferences for intelligent replacements
        const prefs = findMatchingPreferences(planet, resourceTier, buildingTier);

        recipe.ingredients.forEach((ingredient, index) => {
            let replacement = ingredient;

            // Replace banned materials
            if (bannedForBuildings.has(ingredient.name)) {
                const replacementName = getReplacementComponent(recipe, ingredient.name, index);
                replacement = {
                    name: replacementName,
                    quantity: ingredient.quantity
                };
            }

            // Replace raw materials in T2+ buildings
            if (rawMaterials.has(ingredient.name) && buildingTier > 1) {
                const componentName = rawToComponent[ingredient.name];
                if (componentName) {
                    replacement = { name: componentName, quantity: ingredient.quantity };
                } else if (prefs && prefs.resources) {
                    // Use component from preferences
                    const suitableComponents = prefs.resources.filter(r =>
                        r.tier <= resourceTier && !bannedForBuildings.has(r.name)
                    );
                    if (suitableComponents.length > 0) {
                        replacement = {
                            name: suitableComponents[index % suitableComponents.length].name,
                            quantity: ingredient.quantity
                        };
                    }
                } else {
                    // Fallback to tier components
                    const tierComponents = preferredComponentsByTier[Math.min(resourceTier, 5)];
                    replacement = {
                        name: tierComponents[index % tierComponents.length],
                        quantity: ingredient.quantity
                    };
                }
            }

            // Check if component tier exceeds resource tier and replace if needed
            if (!rawMaterials.has(replacement.name)) {
                const componentTier = componentTiers[replacement.name];
                const maxAllowedTier = (buildingTier >= 4) ? resourceTier + 1 : resourceTier;

                if (componentTier && componentTier > maxAllowedTier) {
                    // Replace with appropriate tier component from preferences
                    if (prefs && prefs.resources) {
                        const allowedComponents = prefs.resources.filter(r =>
                            r.tier <= maxAllowedTier && !bannedForBuildings.has(r.name)
                        );
                        if (allowedComponents.length > 0) {
                            replacement = {
                                name: allowedComponents[index % allowedComponents.length].name,
                                quantity: ingredient.quantity
                            };
                        }
                    } else {
                        // Fallback to tier components
                        const allowedComponents = preferredComponentsByTier[Math.min(maxAllowedTier, 5)];
                        replacement = {
                            name: allowedComponents[index % allowedComponents.length],
                            quantity: ingredient.quantity
                        };
                    }
                }
            }

            fixedIngredients.push(replacement);
        });

        return fixedIngredients;
    };

    const generateFixedRecipesTSV = (fixes) => {
        const headers = ['OutputID', 'OutputName', 'OutputType', 'OutputTier', 'BuildingResourceTier',
            'ConstructionTime', 'PlanetTypes', 'Factions', 'ResourceType', 'ProductionSteps'];

        // Add ingredient headers
        for (let i = 1; i <= 7; i++) {
            headers.push(`Ingredient${i}`, `Quantity${i}`);
        }

        let tsv = headers.join('\t') + '\n';

        fixes.forEach(recipe => {
            const row = [
                recipe.OutputID,
                recipe.OutputName,
                recipe.OutputType,
                recipe.OutputTier,
                recipe.BuildingResourceTier,
                recipe.ConstructionTime,
                recipe.PlanetTypes,
                recipe.Factions,
                recipe.ResourceType,
                recipe.ProductionSteps || ''
            ];

            // Add fixed ingredients
            for (let i = 0; i < 7; i++) {
                if (recipe.fixedIngredients[i]) {
                    row.push(recipe.fixedIngredients[i].name, recipe.fixedIngredients[i].quantity);
                } else {
                    row.push('', '');
                }
            }

            tsv += row.join('\t') + '\n';
        });

        setFixedRecipes(tsv);
    };

    const generateSummary = (stats, issues) => {
        const critical = issues.filter(i => i.issues.some(issue => issue.severity === 'HIGH')).length;
        const medium = issues.filter(i => i.issues.some(issue => issue.severity === 'MEDIUM')).length;
        const low = issues.filter(i => i.issues.some(issue => issue.severity === 'LOW')).length;

        return {
            critical,
            medium,
            low,
            total: issues.length,
            percentProblematic: ((issues.length / stats.totalRecipes) * 100).toFixed(1)
        };
    };

    const downloadFixed = () => {
        const blob = new Blob([fixedRecipes], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fixed-building-recipes.tsv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyFixedToClipboard = async () => {
        if (!fixedRecipes) {
            alert('No fixed recipes to copy. Please analyze recipes first.');
            return;
        }

        try {
            await navigator.clipboard.writeText(fixedRecipes);
            alert('Successfully copied fixed recipes to clipboard as TSV format!');
            console.log('Fixed recipes copied to clipboard successfully');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = fixedRecipes;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('Successfully copied fixed recipes to clipboard as TSV format!');
            } catch (fallbackError) {
                console.error('Fallback copy also failed:', fallbackError);
                alert('Copy failed. Please check browser permissions or try the download option.');
            }
            document.body.removeChild(textarea);
        }
    };

    // Redistribute recipes evenly across planets and remove duplicates
    const redistributeRecipes = () => {
        if (!recipeInput.trim()) {
            alert('Please analyze recipes first');
            return;
        }

        try {
            const recipes = parseRecipes(recipeInput);

            // Remove duplicates - keep only first occurrence
            const uniqueRecipes = [];
            const seen = new Set();

            recipes.forEach(recipe => {
                const key = `${recipe.OutputName}_T${recipe.OutputTier}_RT${recipe.BuildingResourceTier}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueRecipes.push(recipe);
                }
            });

            // Get all unique planets
            const planets = [...new Set(recipes.map(r => r.PlanetTypes).filter(p => p))];
            if (planets.length === 0) {
                alert('No planet data found in recipes');
                return;
            }

            // Redistribute recipes evenly across planets
            // Keep multi-planet assignments for extractors/processors that should be on multiple planets
            const redistributed = uniqueRecipes.map((recipe, index) => {
                // Check if this is an extractor or processor that should keep multi-planet assignment
                const isExtractorOrProcessor = recipe.OutputName &&
                    (recipe.OutputName.includes('Extractor') ||
                        recipe.OutputName.includes('Processor') ||
                        recipe.ResourceType === 'Processing' ||
                        recipe.ResourceType === 'Extraction');

                // If it's an extractor/processor and already has multiple planets, keep them
                if (isExtractorOrProcessor && recipe.PlanetTypes && recipe.PlanetTypes.includes(';')) {
                    return recipe; // Keep original multi-planet assignment
                }

                // Otherwise, redistribute single-planet buildings evenly
                return {
                    ...recipe,
                    PlanetTypes: planets[index % planets.length] // Round-robin distribution
                };
            });

            // Generate TSV output
            const headers = ['OutputID', 'OutputName', 'OutputType', 'OutputTier', 'BuildingResourceTier',
                'ConstructionTime', 'PlanetTypes', 'Factions', 'ResourceType', 'ProductionSteps'];

            // Add ingredient headers
            for (let i = 1; i <= 7; i++) {
                headers.push(`Ingredient${i}`, `Quantity${i}`);
            }

            let tsv = headers.join('\t') + '\n';

            redistributed.forEach(recipe => {
                const row = [
                    recipe.OutputID,
                    recipe.OutputName,
                    recipe.OutputType,
                    recipe.OutputTier,
                    recipe.BuildingResourceTier,
                    recipe.ConstructionTime,
                    recipe.PlanetTypes,
                    recipe.Factions,
                    recipe.ResourceType,
                    recipe.ProductionSteps || ''
                ];

                // Add ingredients
                for (let i = 0; i < 7; i++) {
                    if (recipe.ingredients && recipe.ingredients[i]) {
                        row.push(recipe.ingredients[i].name, recipe.ingredients[i].quantity);
                    } else {
                        row.push('', '');
                    }
                }

                tsv += row.join('\t') + '\n';
            });

            setRedistributedRecipes(tsv);
            setShowRedistribution(true);

            // Show summary
            const originalCount = recipes.length;
            const newCount = redistributed.length;
            const removedDuplicates = originalCount - newCount;

            const newDistribution = {};
            redistributed.forEach(r => {
                newDistribution[r.PlanetTypes] = (newDistribution[r.PlanetTypes] || 0) + 1;
            });

            let summary = `Redistribution Complete!\n\n`;
            summary += `Original recipes: ${originalCount}\n`;
            summary += `After removing duplicates: ${newCount}\n`;
            summary += `Duplicates removed: ${removedDuplicates}\n\n`;
            summary += `New even distribution:\n`;
            Object.entries(newDistribution).forEach(([planet, count]) => {
                summary += `${planet}: ${count} buildings\n`;
            });

            alert(summary);

        } catch (error) {
            alert('Error redistributing recipes: ' + error.message);
            console.error(error);
        }
    };

    const downloadRedistributed = () => {
        const blob = new Blob([redistributedRecipes], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'redistributed_building_recipes.tsv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="building-recipe-analyzer">
            <h2>🔍 Building Recipe Analyzer</h2>

            <div className="input-section">
                <h3>Paste Building Recipe Data (TSV format)</h3>
                <div className="validation-rules">
                    <h4>📋 Validation Rules</h4>
                    <ul>
                        <li>✅ Components must be ≤ buildingResourceTier (not buildingTier)</li>
                        <li>✅ T4/T5 buildings can use components up to buildingResourceTier + 1</li>
                        <li>✅ Raw materials only in T1 buildings for bootstrap</li>
                        <li>❌ No biomass or food resources in buildings</li>
                        <li>❌ No weapon/ship components in buildings</li>
                    </ul>
                    {resourcePreferences && (
                        <p className="preferences-loaded">
                            ✨ Using intelligent replacements from resourcePreferences.json ({resourcePreferences.length} preference sets loaded)
                        </p>
                    )}
                </div>
                <textarea
                    value={recipeInput}
                    onChange={(e) => setRecipeInput(e.target.value)}
                    placeholder="Paste your building recipe TSV data here..."
                    rows={10}
                />
                <button onClick={analyzeRecipes} className="analyze-btn">
                    Analyze Recipes
                </button>
            </div>

            {analysisResults && (
                <div className="analysis-results">
                    <div className="summary-section">
                        <h3>Analysis Summary</h3>
                        <div className="summary-stats">
                            <div className="stat-card">
                                <span className="stat-value">{analysisResults.stats.totalRecipes}</span>
                                <span className="stat-label">Total Recipes</span>
                            </div>
                            <div className="stat-card critical">
                                <span className="stat-value">{analysisResults.summary.critical}</span>
                                <span className="stat-label">Critical Issues</span>
                            </div>
                            <div className="stat-card medium">
                                <span className="stat-value">{analysisResults.summary.medium}</span>
                                <span className="stat-label">Medium Issues</span>
                            </div>
                            <div className="stat-card low">
                                <span className="stat-value">{analysisResults.summary.low}</span>
                                <span className="stat-label">Low Priority</span>
                            </div>
                        </div>

                        <div className="issue-breakdown">
                            <h4>Issue Breakdown</h4>
                            <ul>
                                <li className="issue-stat">
                                    <span>Raw Material Misuse:</span>
                                    <strong>{analysisResults.stats.rawMaterialMisuse}</strong>
                                </li>
                                <li className="issue-stat">
                                    <span>Banned Materials:</span>
                                    <strong>{analysisResults.stats.bannedMaterials}</strong>
                                </li>
                                <li className="issue-stat">
                                    <span>Component Tier Exceeds Resource Tier:</span>
                                    <strong>{analysisResults.stats.componentTierExceeds}</strong>
                                </li>
                                <li className="issue-stat">
                                    <span>Bootstrap Issues:</span>
                                    <strong>{analysisResults.stats.bootstrapIssues}</strong>
                                </li>
                                <li className="issue-stat">
                                    <span>Other Tier Issues:</span>
                                    <strong>{analysisResults.stats.tierMismatch}</strong>
                                </li>
                                {analysisResults.stats.outputIdCollisionCount > 0 && (
                                    <li className="issue-stat critical">
                                        <span>OutputID Collisions:</span>
                                        <strong>{analysisResults.stats.outputIdCollisionCount}</strong>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="planet-distribution">
                            <h4>🌍 Planet Distribution</h4>
                            {analysisResults.stats.planetImbalance && (
                                <div className="imbalance-warning">
                                    ⚠️ SEVERE IMBALANCE DETECTED
                                </div>
                            )}
                            <div className="planet-grid">
                                {Object.entries(analysisResults.stats.planetDistribution)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([planet, count]) => {
                                        const total = analysisResults.stats.totalRecipes;
                                        const percentage = ((count / total) * 100).toFixed(1);
                                        const avgCount = total / Object.keys(analysisResults.stats.planetDistribution).length;
                                        const isExcessive = count > avgCount * 3;

                                        return (
                                            <div
                                                key={planet}
                                                className={`planet-item ${isExcessive ? 'excessive' : ''}`}
                                            >
                                                <div className="planet-name">{planet}</div>
                                                <div className="planet-count">
                                                    {count}
                                                    <span className="planet-percentage">({percentage}%)</span>
                                                </div>
                                                {isExcessive && (
                                                    <div className="excess-indicator">
                                                        {(count / avgCount).toFixed(1)}x avg
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                            {analysisResults.stats.planetImbalance && (
                                <div className="imbalance-explanation">
                                    <h5>Possible Causes of Imbalance:</h5>
                                    <ul>
                                        <li>• Duplicate recipe entries for specific planets</li>
                                        <li>• Incorrect planet assignment logic</li>
                                        <li>• Generation loop running multiple times for one planet</li>
                                        <li>• Missing planet data defaulting to one type</li>
                                        <li>• Copy/paste errors in recipe generation</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="issues-section">
                        <h3>Detailed Issues</h3>
                        <div className="issues-list">
                            {analysisResults.issues.map((recipeIssues, index) => (
                                <div
                                    key={index}
                                    className={`recipe-issues ${recipeIssues.recipeId === 'PLANET-IMBALANCE' ? 'system-issue' : ''}`}
                                >
                                    <h4>{recipeIssues.recipe}</h4>
                                    <div className="issue-cards">
                                        {recipeIssues.issues.map((issue, issueIndex) => (
                                            <div key={issueIndex} className={`issue-card ${issue.severity.toLowerCase()}`}>
                                                <span className="issue-type">{issue.type.replace(/_/g, ' ')}</span>
                                                <p className="issue-message">{issue.message}</p>
                                                {issue.suggestion && (
                                                    <p className="issue-suggestion">
                                                        💡 Suggestion: {issue.suggestion}
                                                    </p>
                                                )}
                                                {issue.details && (
                                                    <div className="issue-details">
                                                        <strong>Planet Distribution:</strong>
                                                        <div className="detail-list">{issue.details}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="actions-section">
                        <button onClick={() => setShowFixed(!showFixed)} className="toggle-fixed-btn">
                            {showFixed ? 'Hide' : 'Show'} Fixed Recipes
                        </button>
                        <button onClick={downloadFixed} className="download-btn">
                            📄 Download Fixed Recipes (TSV)
                        </button>
                        <button onClick={copyFixedToClipboard} className="copy-btn">
                            📋 Copy Fixed Recipes (TSV)
                        </button>
                        {(analysisResults.stats.planetImbalance || analysisResults.stats.duplicateCount > 0) && (
                            <>
                                <button onClick={redistributeRecipes} className="redistribute-btn">
                                    🔄 Redistribute & Remove Duplicates
                                </button>
                                {redistributedRecipes && (
                                    <button onClick={downloadRedistributed} className="download-redistributed-btn">
                                        📥 Download Redistributed (TSV)
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {showFixed && (
                        <div className="fixed-recipes-section">
                            <h3>Fixed Recipes</h3>
                            <textarea
                                value={fixedRecipes}
                                readOnly
                                rows={15}
                            />
                        </div>
                    )}

                    {showRedistribution && (
                        <div className="redistributed-section">
                            <h3>🔄 Redistributed Recipes (Balanced & Deduplicated)</h3>
                            <p className="redistribution-note">
                                This version has removed all duplicates and evenly distributed buildings across planets.
                                Use this to fix the planet imbalance issue at the generation level.
                            </p>
                            <textarea
                                value={redistributedRecipes}
                                readOnly
                                rows={15}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BuildingRecipeAnalyzer; 