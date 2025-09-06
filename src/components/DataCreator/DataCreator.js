import React, { useState, useEffect } from 'react';
import './DataCreator.css';

const DataCreator = () => {
    const [status, setStatus] = useState('');
    const [generatedData, setGeneratedData] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedPreview, setSelectedPreview] = useState('');

    // Planet archetypes configuration
    const planetArchetypes = [
        { id: 'terrestrial', name: 'Terrestrial Planet' },
        { id: 'volcanic', name: 'Volcanic Planet' },
        { id: 'oceanic', name: 'Oceanic Planet' },
        { id: 'barren', name: 'Barren Planet' },
        { id: 'ice-giant', name: 'Ice Giant' },
        { id: 'gas-giant', name: 'Gas Giant' },
        { id: 'dark', name: 'Dark Planet' },
        { id: 'system-asteroid-belt', name: 'System Asteroid Belt' }
    ];

    const factions = ['MUD', 'ONI', 'USTUR'];
    const tiers = [1, 2, 3, 4, 5];

    const loadCSVFile = async (filename) => {
        try {
            const response = await fetch(`/${filename}`);
            const text = await response.text();
            return parseCSV(text);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return [];
        }
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        const data = [];

        // Special handling for claimStakeBuildingValues.csv with two sections
        if (text.includes('# CLAIM STAKE DEFINITIONS')) {
            // Parse building section
            const buildingEndIndex = lines.findIndex(line => line.startsWith('# CLAIM STAKE DEFINITIONS'));
            const buildingHeaders = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

            for (let i = 1; i < buildingEndIndex; i++) {
                const line = lines[i];
                if (!line || line.startsWith('#')) continue;

                // Handle quoted values with commas
                const values = [];
                let current = '';
                let inQuotes = false;

                for (let char of line) {
                    if (char === '"' && (current === '' || current[current.length - 1] !== '\\')) {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim());

                const row = {};
                buildingHeaders.forEach((header, index) => {
                    row[header] = values[index] ? values[index].replace(/"/g, '') : '';
                });
                data.push(row);
            }

            // Parse stake definition section
            const stakeStartIndex = buildingEndIndex + 1;
            const stakeHeaders = lines[stakeStartIndex].split(',').map(h => h.replace(/"/g, '').trim());

            for (let i = stakeStartIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line || line.startsWith('#')) continue;

                // Handle quoted values with commas
                const values = [];
                let current = '';
                let inQuotes = false;

                for (let char of line) {
                    if (char === '"' && (current === '' || current[current.length - 1] !== '\\')) {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim());

                const row = {};
                stakeHeaders.forEach((header, index) => {
                    row[header] = values[index] ? values[index].replace(/"/g, '') : '';
                });
                data.push(row);
            }
        } else {
            // Normal CSV parsing for other files
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line || line.startsWith('#')) continue;

                // Handle quoted values with commas
                const values = [];
                let current = '';
                let inQuotes = false;

                for (let char of line) {
                    if (char === '"' && (current === '' || current[current.length - 1] !== '\\')) {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim());

                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].replace(/"/g, '') : '';
                });
                data.push(row);
            }
        }

        return data;
    };

    const generateData = async () => {
        setLoading(true);
        setStatus('Loading CSV files...');

        try {
            // Load all CSV files
            const buildingsData = await loadCSVFile('finalBuildingList.csv');
            const componentsData = await loadCSVFile('finalComponentList.csv');
            const habAssetsData = await loadCSVFile('finalHabAssets.csv');
            const buildingValuesData = await loadCSVFile('claimStakeBuildingValues.csv');

            setStatus('Processing data...');

            // Generate resources.json
            const resources = generateResources(buildingsData, componentsData, habAssetsData);

            // Generate claim stake buildings
            const claimStakeBuildings = generateClaimStakeBuildings(buildingsData, buildingValuesData, componentsData);

            // Generate crafting hab buildings
            const craftingHabBuildings = generateCraftingHabBuildings(habAssetsData);

            // Generate recipes
            const recipes = generateRecipes(buildingsData, componentsData, habAssetsData);

            // Generate planet archetypes
            const archetypes = generatePlanetArchetypes(componentsData);

            // Generate planets
            const planets = generatePlanets(archetypes);

            // Generate starbases
            const starbases = generateStarbases();

            const generatedFiles = {
                resources,
                claimStakeBuildings,
                craftingHabBuildings,
                recipes,
                planetArchetypes: archetypes,
                planets,
                starbases
            };

            setGeneratedData(generatedFiles);
            setStatus('Data generation complete!');
            setLoading(false);

        } catch (error) {
            console.error('Error generating data:', error);
            setStatus(`Error: ${error.message}`);
            setLoading(false);
        }
    };

    const generateResources = (buildings, components, habAssets) => {
        const resourceMap = new Map();
        const resourceNameToId = new Map(); // Track name to ID mapping to prevent duplicates

        // Helper to add resource - now properly handles duplicates
        const addResource = (name, type = 'component', tier = 1) => {
            if (!name || name === '') return null;

            // Clean the name
            const cleanName = name.trim();

            // Check if we already have this resource by name
            if (resourceNameToId.has(cleanName)) {
                return resourceNameToId.get(cleanName);
            }

            // Generate ID from name
            const id = cleanName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            // Determine category based on type
            let category;
            if (type.toLowerCase().includes('basic resource')) {
                category = 'raw';
            } else if (type.toLowerCase().includes('basic organic')) {
                category = 'raw';
            } else if (tier >= 4) {
                category = 'advanced';
            } else if (tier >= 2) {
                category = 'component';
            } else {
                category = 'processed';
            }

            resourceMap.set(id, {
                id,
                name: cleanName,
                category,
                tier: parseInt(tier) || 1,
                description: `${cleanName} - Tier ${tier} ${category}`,
                stackSize: 100,
                baseValue: tier * 10
            });

            resourceNameToId.set(cleanName, id);
            return id;
        };

        // Add fuel as a universal basic resource
        addResource('Fuel', 'BASIC RESOURCE', 1);

        // Process components first (they define basic resources)
        components.forEach(comp => {
            if (comp.OutputName && comp.OutputType) {
                const tier = parseInt(comp.OutputTier) || 1;
                addResource(comp.OutputName, comp.OutputType, tier);
            }

            // Also add ingredients from components
            for (let i = 1; i <= 9; i++) {
                const ingredient = comp[`Ingredient${i}`];
                if (ingredient) {
                    // Try to find the tier from components data
                    const ingredientComp = components.find(c => c.OutputName === ingredient);
                    const ingredientTier = ingredientComp ? parseInt(ingredientComp.OutputTier) || 1 : 1;
                    const ingredientType = ingredientComp ? ingredientComp.OutputType : 'component';
                    addResource(ingredient, ingredientType, ingredientTier);
                }
            }
        });

        // Process building ingredients
        buildings.forEach(building => {
            // Add the building itself if it's a component
            if (building.OutputName && building.OutputType !== 'BUILDING') {
                const tier = parseInt(building.OutputTier) || 1;
                addResource(building.OutputName, building.OutputType, tier);
            }

            for (let i = 1; i <= 7; i++) {
                const ingredient = building[`Ingredient${i}`];
                if (ingredient) {
                    // Try to find the tier from components data
                    const ingredientComp = components.find(c => c.OutputName === ingredient);
                    const ingredientTier = ingredientComp ? parseInt(ingredientComp.OutputTier) || 1 : 1;
                    const ingredientType = ingredientComp ? ingredientComp.OutputType : 'component';
                    addResource(ingredient, ingredientType, ingredientTier);
                }
            }
        });

        // Process hab asset ingredients
        habAssets.forEach(hab => {
            for (let i = 1; i <= 9; i++) {
                const ingredient = hab[`Ingredient${i}`];
                if (ingredient) {
                    const ingredientComp = components.find(c => c.OutputName === ingredient);
                    const ingredientTier = ingredientComp ? parseInt(ingredientComp.OutputTier) || 1 : 1;
                    const ingredientType = ingredientComp ? ingredientComp.OutputType : 'component';
                    addResource(ingredient, ingredientType, ingredientTier);
                }
            }
        });

        return {
            resources: Array.from(resourceMap.values()),
            categories: {
                raw: { name: 'Raw Materials', color: '#8B4513', icon: '⛏️' },
                processed: { name: 'Processed Materials', color: '#4682B4', icon: '🏭' },
                component: { name: 'Components', color: '#32CD32', icon: '⚙️' },
                advanced: { name: 'Advanced Components', color: '#9370DB', icon: '💎' },
                consumable: { name: 'Consumables', color: '#FF6347', icon: '🍽️' }
            }
        };
    };

    const determineCategory = (type, tier) => {
        if (type === 'raw' || type.includes('basic')) return 'raw';
        if (tier >= 4) return 'advanced';
        if (tier >= 2) return 'component';
        return 'processed';
    };

    const generateClaimStakeBuildings = (buildingsList, buildingValues, componentsData) => {
        const buildings = [];
        const stakeDefinitions = [];

        // Create a lookup map for building values
        const buildingValuesMap = {};
        buildingValues.forEach(row => {
            if (row.building_id && !row.stake_id) {
                buildingValuesMap[row.building_id] = row;
            }
        });

        // Note: Buildings no longer add planet or faction tags - those come from claim stakes only

        // Process buildings from finalBuildingsList.csv
        console.log(`Processing ${buildingsList.length} buildings from finalBuildingsList.csv`);

        buildingsList.forEach(building => {
            if (building.OutputType === 'BUILDING') {
                const buildingName = building.OutputName;
                const buildingId = building.OutputID;
                const tier = parseInt(building.OutputTier) || 1;

                console.log(`Processing building: ${buildingId} (${buildingName})`);  // Debug log

                // Get reference values from buildingValues if available
                const valueRef = buildingValuesMap[buildingId];

                // Extract planet type from building name if present
                let planetType = null;
                let resourceName = null;

                // Determine building type and extract planet/resource info
                let category = 'infrastructure';
                let power = 0;
                let crewSlots = 0;
                let neededCrew = 0;
                let storage = 0;
                let requiredTags = [];
                let addedTags = [];
                let resourceExtractionRate = {};
                let resourceRate = {};

                // Check for planet-specific variants in name
                const planetTypes = ['terrestrial', 'volcanic', 'oceanic', 'barren', 'ice-giant', 'gas-giant', 'dark', 'system-asteroid-belt'];

                // Special handling for asteroid buildings
                if (buildingId.includes('asteroid') || buildingName.toLowerCase().includes('asteroid')) {
                    planetType = 'system-asteroid-belt';
                } else {
                    planetTypes.forEach(planet => {
                        // Check both the name and ID for planet type
                        if (buildingName.toLowerCase().includes(planet.replace('-', ' ')) ||
                            buildingId.includes(planet)) {
                            planetType = planet;
                        }
                    });
                }

                // Central Hub variants (including Cultivation Hub)
                if (buildingId.includes('central-hub') || buildingId.includes('cultivation-hub')) {
                    category = 'hub';
                    power = 100 * tier;
                    crewSlots = 4 * tier;
                    neededCrew = tier;
                    storage = 1000 * tier;

                    // Get the planet type from the building
                    const planetTypesForHub = building.PlanetTypes ? building.PlanetTypes.split(';').map(p => p.trim()) : [];
                    const planetTypeForHub = planetTypesForHub[0] || '';

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    // Find all raw resources (BASIC RESOURCE and BASIC ORGANIC RESOURCE) for this planet
                    const rawResourcesForPlanet = {};
                    componentsData.forEach(comp => {
                        const outputType = comp.OutputType ? comp.OutputType.toUpperCase() : '';
                        const resourceTier = parseInt(comp.OutputTier) || 1;

                        // Only include raw resources
                        if ((outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE') &&
                            comp.PlanetTypes && comp.PlanetTypes.includes(planetTypeForHub) && comp.OutputName) {
                            const resourceId = comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                            // Central hub tier X extracts tier X and lower resources at low rates
                            // Base rates decrease with resource tier: T1=0.002, T2=0.001, T3=0.0007, T4=0.0005, T5=0.0004
                            const baseRates = [0.002, 0.001, 0.0007, 0.0005, 0.0004];
                            if (resourceTier <= tier) {
                                rawResourcesForPlanet[resourceId] = baseRates[resourceTier - 1] || 0.0004;
                            }
                        }
                    });

                    resourceExtractionRate = rawResourcesForPlanet;

                    // Add fuel consumption for central hub (negative value)
                    // Fuel consumption increases with tier
                    const fuelConsumptionRates = [0.01, 0.025, 0.05, 0.1, 0.2]; // T1-T5
                    resourceRate = {
                        'fuel': -(fuelConsumptionRates[tier - 1] || 0.01)
                    };

                    if (buildingId.includes('cultivation-hub')) {
                        addedTags = ['cultivation-hub', 'cultivation-stake-only', 'organic-focused'];
                        // Cultivation hub ALSO enables the four main hubs (same as central hub)
                        if (tier === 1) {
                            addedTags.push('enables-processing-hub', 'enables-storage-hub',
                                'enables-extraction-hub', 'enables-farm-hub');
                        }
                        // Cultivation hub extracts organic materials at 2x rate
                        componentsData.forEach(comp => {
                            const outputType = comp.OutputType ? comp.OutputType.toUpperCase() : '';
                            if (outputType === 'BASIC ORGANIC RESOURCE' && comp.OutputName &&
                                comp.PlanetTypes && comp.PlanetTypes.includes(planetTypeForHub)) {
                                const resourceId = comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                // Double the rate for organic resources in cultivation hub
                                if (resourceExtractionRate[resourceId]) {
                                    resourceExtractionRate[resourceId] *= 2;
                                }
                            }
                        });
                    } else {
                        addedTags = ['central-hub', 'standard-stake-only'];
                        // Central hub enables the four main hubs
                        if (tier === 1) {
                            addedTags.push('enables-processing-hub', 'enables-storage-hub',
                                'enables-extraction-hub', 'enables-farm-hub');
                        }
                    }

                    // Add tier progression tags
                    if (tier > 1) {
                        if (buildingId.includes('cultivation-hub')) {
                            requiredTags.push(`cultivation-hub-t${tier - 1}`);
                        } else {
                            requiredTags.push(`central-hub-t${tier - 1}`);
                        }
                    }
                    addedTags.push(buildingId.includes('cultivation-hub') ? `cultivation-hub-t${tier}` : `central-hub-t${tier}`);

                } else if (buildingId.includes('processing-hub')) {
                    category = 'hub';
                    power = 50 * tier;
                    crewSlots = 2 * tier;
                    neededCrew = tier;
                    requiredTags = ['enables-processing-hub'];  // Changed from 'central-hub' to work with both

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    // Processing hub consumes a small amount of fuel for operations
                    resourceRate = {
                        'fuel': -(0.005 * tier)  // Small fuel consumption that scales with tier
                    };

                    addedTags = ['processing-hub', 'enables-processors'];
                    if (tier > 1) requiredTags.push(`processing-hub-t${tier - 1}`);
                    addedTags.push(`processing-hub-t${tier}`);

                } else if (buildingId.includes('storage-hub') && !buildingId.includes('processor')) {
                    // Check that it's not a "Storage Hub Core Processor"
                    category = 'hub';
                    power = -5 * Math.pow(2, tier - 1);
                    neededCrew = tier;
                    storage = 2500 * Math.pow(3, tier - 1);
                    requiredTags = ['enables-storage-hub'];  // Works with both central and cultivation

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    addedTags = ['storage-hub', 'enables-storage-modules'];
                    if (tier > 1) requiredTags.push(`storage-hub-t${tier - 1}`);
                    addedTags.push(`storage-hub-t${tier}`);

                } else if (buildingId.includes('extraction-hub')) {
                    category = 'hub';
                    power = 50 * tier;
                    crewSlots = 2 * tier;
                    neededCrew = tier;
                    requiredTags = ['enables-extraction-hub'];  // Works with both central and cultivation

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    addedTags = ['extraction-hub', 'enables-extractors'];
                    if (tier > 1) requiredTags.push(`extraction-hub-t${tier - 1}`);
                    addedTags.push(`extraction-hub-t${tier}`);

                } else if (buildingId.includes('farm-hub')) {
                    category = 'hub';
                    power = 50 * tier;
                    crewSlots = 2 * tier;
                    neededCrew = tier;
                    requiredTags = ['enables-farm-hub'];  // Works with both central and cultivation

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    addedTags = ['farm-hub', 'enables-organic-extractors', 'enables-biomass-extractor',
                        'enables-food-processor', 'enables-plant-extractors'];
                    if (tier > 1) requiredTags.push(`farm-hub-t${tier - 1}`);
                    addedTags.push(`farm-hub-t${tier}`);

                } else if (buildingId.includes('extractor') || buildingName.toLowerCase().includes('extractor')) {
                    category = 'extractor';
                    power = -25 * Math.pow(2, tier - 1);
                    neededCrew = Math.ceil(Math.pow(tier, 3) / 8);

                    // Extract resource name from building name (e.g., "Iron Ore Extractor" -> "iron-ore")
                    const extractorMatch = buildingName.match(/(.+?)\s+(?:Extractor|Extraction)/i);
                    if (extractorMatch) {
                        resourceName = extractorMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    }

                    // Check if the extracted resource is organic
                    const isOrganicExtractor = componentsData.some(comp => {
                        const compName = comp.OutputName ? comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                        const outputType = comp.OutputType ? comp.OutputType.toUpperCase() : '';
                        return compName === resourceName && outputType === 'BASIC ORGANIC RESOURCE';
                    });

                    // Check if it's organic/biomass
                    if (isOrganicExtractor ||
                        buildingName.toLowerCase().includes('biomass') ||
                        buildingName.toLowerCase().includes('plant') ||
                        buildingName.toLowerCase().includes('organic')) {
                        // Organic extractors require farm hub from either stake type
                        requiredTags = ['enables-organic-extractors'];

                        // But certain exotic/rare organic plants require cultivation stakes
                        if (buildingName.toLowerCase().includes('exotic') ||
                            buildingName.toLowerCase().includes('rare') ||
                            buildingName.toLowerCase().includes('umbral') ||
                            buildingName.toLowerCase().includes('special')) {
                            requiredTags.push('cultivation-stake-only');
                        }

                        addedTags = ['extractor', 'organic-extractor'];
                    } else {
                        requiredTags = ['enables-extractors'];
                        addedTags = ['extractor'];
                    }

                    // Add resource extraction rate
                    if (resourceName) {
                        const baseRate = valueRef && valueRef.special_data ?
                            parseFloat(valueRef.special_data.split(',')[0].split(':')[1]) : 0.02;
                        resourceExtractionRate[resourceName] = baseRate * Math.pow(1.5, tier - 1);

                        // Require a tag that the claim stake will provide if this resource is available
                        // The tag indicates this specific resource can be extracted at this tier
                        requiredTags.push(`enables-${resourceName}-extraction`);
                    }

                    // Add tier progression (preserving tags already set above)
                    if (tier > 1) requiredTags.push(`${buildingId.replace(`-t${tier}`, `-t${tier - 1}`)}`);
                    addedTags.push(buildingId);

                } else if (buildingId.includes('processor') || buildingName.toLowerCase().includes('processor')) {
                    category = 'processor';
                    power = -30 * Math.pow(2, tier - 1);
                    neededCrew = Math.ceil(Math.pow(tier, 3) / 8);

                    // Extract what this processor makes
                    const processorMatch = buildingName.match(/(.+?)\s+Processor/i);
                    if (processorMatch) {
                        resourceName = processorMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    }

                    // Special case for Storage Hub Core Processor - it processes Storage Hub Core
                    if (buildingName.toLowerCase().includes('storage hub core')) {
                        requiredTags = ['enables-processors'];
                        // It processes a specific component
                        resourceName = 'storage-hub-core';
                    } else if (buildingName.toLowerCase().includes('food')) {
                        // Food processor requires farm hub
                        requiredTags = ['enables-food-processor'];
                    } else {
                        requiredTags = ['enables-processors'];
                    }

                    // Find the recipe that this processor handles
                    // Look for a component recipe that outputs the resource this processor makes
                    if (resourceName) {
                        // Find the component that matches what this processor produces
                        const matchingComponent = componentsData.find(comp => {
                            const compName = comp.OutputName ?
                                comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                            return compName === resourceName;
                        });

                        if (matchingComponent) {
                            // Build the resourceRate with negative inputs and positive output
                            resourceRate = {};

                            // Add all ingredients as negative values (consumed)
                            for (let i = 1; i <= 9; i++) {
                                const ingredient = matchingComponent[`Ingredient${i}`];
                                const quantity = matchingComponent[`Quantity${i}`];
                                if (ingredient && quantity) {
                                    const ingredientId = ingredient.toLowerCase()
                                        .replace(/\s+/g, '-')
                                        .replace(/[^a-z0-9-]/g, '');
                                    // Negative value for consumed resources
                                    resourceRate[ingredientId] = -(parseInt(quantity) || 1);
                                }
                            }

                            // Add the output as a positive value (produced)
                            // The output quantity is typically 1 unless specified
                            resourceRate[resourceName] = 1;

                            // Scale rates based on tier and processing speed from special_data
                            const baseJobsPerSecond = valueRef && valueRef.special_data ?
                                parseFloat(valueRef.special_data.split(',')[0].split(':')[1]) : 1;
                            const jobsPerSecond = baseJobsPerSecond * Math.pow(2, tier - 1);

                            // Apply the jobs per second rate to all resource rates
                            Object.keys(resourceRate).forEach(key => {
                                resourceRate[key] = resourceRate[key] * jobsPerSecond;
                            });
                        } else {
                            // Fallback for processors without matching recipes
                            // This might be a special processor like food processor
                            const baseRate = valueRef && valueRef.special_data ?
                                parseFloat(valueRef.special_data.split(',')[0].split(':')[1]) : 1;
                            resourceRate = { [resourceName]: baseRate * Math.pow(2, tier - 1) };
                        }

                        // Require a tag that the claim stake will provide if this resource can be processed
                        requiredTags.push(`enables-${resourceName}-processing`);
                    }

                    addedTags = ['processor'];
                    if (tier > 1) requiredTags.push(`${buildingId.replace(`-t${tier}`, `-t${tier - 1}`)}`);
                    addedTags.push(buildingId);

                } else if (buildingId.includes('storage-module') || buildingName.toLowerCase().includes('storage module')) {
                    category = 'storage';
                    power = -5 * Math.pow(2, tier - 1);
                    neededCrew = Math.ceil(tier / 2);
                    storage = 5000 * Math.pow(2, tier - 1);
                    requiredTags = ['storage-hub'];

                    // Add planet-specific required tag for storage modules
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    addedTags = ['storage-module'];
                    if (tier > 1) requiredTags.push(`${buildingId.replace(`-t${tier}`, `-t${tier - 1}`)}`);
                    addedTags.push(buildingId);

                } else if (buildingId.includes('crew-quarters')) {
                    category = 'crew';
                    power = -10 * Math.pow(2, tier - 1);
                    crewSlots = 5 * Math.pow(2, tier - 1);
                    requiredTags = ['planetary'];  // Works on any planetary claim stake

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    addedTags = ['crew-housing'];
                    if (tier > 1) requiredTags.push(`crew-quarters-t${tier - 1}`);
                    addedTags.push(`crew-quarters-t${tier}`);

                } else if (buildingId.includes('power-plant')) {
                    category = 'power';
                    power = Math.round(250 * Math.pow(2.6, tier - 1));
                    neededCrew = tier;
                    requiredTags = ['planetary'];  // Works on any planetary claim stake

                    // Add planet-specific required tag
                    if (planetType) {
                        requiredTags.push(`${planetType}-planet`);
                    }

                    // Add fuel consumption for power plants (negative value)
                    // Power plants consume fuel proportional to their power generation
                    // Roughly 1 fuel per 100 power units
                    const fuelConsumption = power / 100;
                    resourceRate = {
                        'fuel': -fuelConsumption
                    };

                    addedTags = ['power-generation'];
                    if (tier > 1) requiredTags.push(`power-plant-t${tier - 1}`);
                    addedTags.push(`power-plant-t${tier}`);

                } else if (buildingId.includes('farm') || buildingName.toLowerCase().includes('farm')) {
                    // Farm buildings for BASIC ORGANIC RESOURCES
                    category = 'farm';
                    power = valueRef && valueRef.power ? parseInt(valueRef.power) : -20 * Math.pow(2, tier - 1);
                    neededCrew = valueRef && valueRef.crew_required ? parseInt(valueRef.crew_required) : Math.ceil(Math.pow(tier, 2) / 4);

                    // Extract resource name from building name (e.g., "Umbral Rush Tendril Farm" -> "umbral-rush-tendril")
                    const farmMatch = buildingName.match(/(.+?)\s+Farm/i);
                    if (farmMatch) {
                        resourceName = farmMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    }

                    // Check if this resource is an organic resource from components
                    const isOrganicResource = componentsData.some(comp => {
                        const compName = comp.OutputName ? comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                        const outputType = comp.OutputType ? comp.OutputType.toUpperCase() : '';
                        return compName === resourceName && outputType === 'BASIC ORGANIC RESOURCE';
                    });

                    if (isOrganicResource) {
                        // All organic farms require cultivation stake
                        requiredTags = ['enables-plant-extractors', 'cultivation-stake-only'];

                        // Exotic/rare organics may have additional requirements
                        if (buildingName.toLowerCase().includes('exotic') ||
                            buildingName.toLowerCase().includes('rare') ||
                            buildingName.toLowerCase().includes('umbral') ||
                            buildingName.toLowerCase().includes('special')) {
                            addedTags = ['farm', 'exotic-organic-extraction'];
                        } else {
                            addedTags = ['farm', 'organic-extraction'];
                        }
                    } else {
                        // Non-organic farms (if any) just need farm hub
                        requiredTags = ['enables-plant-extractors'];
                        addedTags = ['farm'];
                    }

                    // Add resource extraction rate
                    if (resourceName) {
                        const baseRate = valueRef && valueRef.special_data ?
                            parseFloat(valueRef.special_data.split(',')[0].split(':')[1]) : 0.015;
                        resourceExtractionRate[resourceName] = baseRate * Math.pow(1.3, tier - 1);

                        // Require a tag that the claim stake will provide if this resource can be farmed
                        requiredTags.push(`enables-${resourceName}-farming`);
                    }

                    // Add tier progression
                    if (tier > 1) requiredTags.push(`${buildingId.replace(`-t${tier}`, `-t${tier - 1}`)}`);
                    addedTags.push(buildingId);

                }

                // Calculate slots based on category and tier
                let calculatedSlots = 0;
                if (valueRef && valueRef.slots !== undefined) {
                    calculatedSlots = parseInt(valueRef.slots) || 0;
                } else {
                    // Default slot calculations by category (based on claimStakeBuildingValues.csv patterns)
                    const slotsByTier = {
                        'extractor': [8, 64, 216, 512, 1000],
                        'processor': [8, 64, 216, 512, 1000],
                        'farm': [8, 64, 216, 512, 1000],
                        'crew': [4, 32, 108, 256, 500],
                        'power': [4, 32, 108, 256, 500],
                        'storage': [4, 32, 108, 256, 500],
                        'infrastructure': [4, 32, 108, 256, 500],  // For buildable hubs
                        'hub-buildable': [4, 32, 108, 256, 500]  // Alternative category for buildable hubs
                    };

                    if (category === 'hub') {
                        // Only central-hub and cultivation-hub come with stakes and use 0 slots
                        if (buildingId.includes('central-hub') || buildingId.includes('cultivation-hub')) {
                            calculatedSlots = 0;  // These come with stakes, don't consume slots
                        } else {
                            // Other hubs (processing, extraction, storage, farm) do consume slots
                            calculatedSlots = slotsByTier['infrastructure'][tier - 1] || 0;
                        }
                    } else if (slotsByTier[category]) {
                        calculatedSlots = slotsByTier[category][tier - 1] || 0;
                    } else {
                        calculatedSlots = Math.pow(4, tier - 1) * 4;  // Default fallback
                    }
                }

                const buildingDef = {
                    id: buildingId,
                    name: building.OutputName,
                    description: `${building.OutputName} - ${category} building`,
                    tier,
                    minimumTier: tier,
                    slots: calculatedSlots,
                    power,
                    crewSlots,
                    neededCrew,
                    storage,
                    comesWithStake: buildingId.includes('central-hub') || buildingId.includes('cultivation-hub'),
                    cannotRemove: buildingId.includes('central-hub') || buildingId.includes('cultivation-hub'),
                    requiredTags,
                    addedTags,
                    constructionTime: parseInt(building.ConstructionTime) || 60,
                    constructionCost: extractIngredients(building)
                };

                // Add resourceExtractionRate if defined
                if (Object.keys(resourceExtractionRate).length > 0) {
                    buildingDef.resourceExtractionRate = resourceExtractionRate;
                }

                // Add resourceRate if defined (for consumption/production)
                if (Object.keys(resourceRate).length > 0) {
                    buildingDef.resourceRate = resourceRate;
                }

                // Add special data for extractors and processors from value reference
                if (category === 'extractor' && valueRef && valueRef.special_data && !buildingDef.resourceExtractionRate) {
                    const specialData = {};
                    valueRef.special_data.split(',').forEach(item => {
                        const [key, value] = item.split(':');
                        if (key && value) {
                            specialData[key] = parseFloat(value);
                        }
                    });
                    buildingDef.resourceExtractionRate = {
                        'tier-1': specialData.tier_1_rate || 0.02,
                        'tier-2': specialData.tier_2_rate || 0.01,
                        'tier-3': specialData.tier_3_rate || 0.007,
                        'tier-4': specialData.tier_4_rate || 0.005,
                        'tier-5': specialData.tier_5_rate || 0.004
                    };
                } else if (category === 'processor' && valueRef && valueRef.special_data) {
                    const specialData = {};
                    valueRef.special_data.split(',').forEach(item => {
                        const [key, value] = item.split(':');
                        if (key && value) {
                            specialData[key] = parseFloat(value);
                        }
                    });
                    buildingDef.processingRate = specialData.jobs_per_second || 1;
                }

                buildings.push(buildingDef);
            }
        });

        // Generate stake definitions for each archetype, tier, and faction
        planetArchetypes.forEach(archetype => {
            factions.forEach(faction => {
                tiers.forEach(tier => {
                    const stakeRow = buildingValues.find(r => r.stake_id === `claim-stake-t${tier}`);
                    const slots = stakeRow && stakeRow.total_slots ? parseInt(stakeRow.total_slots) :
                        tier === 1 ? 32 :
                            tier === 2 ? 243 :
                                tier === 3 ? 1024 :
                                    tier === 4 ? 3125 :
                                        tier === 5 ? 7776 : 32;

                    // Get the base planet type (without faction)
                    const basePlanetType = archetype.id.replace(/-mud$|-oni$|-ustur$/, '');

                    // Map planet type to building prefix (handle special case for asteroid)
                    const buildingPlanetPrefix = basePlanetType === 'system-asteroid-belt' ? 'asteroid' : basePlanetType;

                    // Determine which resources are available on this planet/faction/tier
                    const availableResources = [];
                    componentsData.forEach(component => {
                        const compTier = parseInt(component.OutputTier) || 1;
                        const compName = component.OutputName ?
                            component.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                        const planetTypes = component.PlanetTypes ? component.PlanetTypes.split(';').map(p => p.trim()) : [];
                        const factions = component.Factions ? component.Factions.split(';').map(f => f.trim()) : [];
                        const outputType = component.OutputType ? component.OutputType.toUpperCase() : '';

                        // Check if this resource is available on this planet type
                        const planetMatch = planetTypes.some(p => {
                            const pLower = p.toLowerCase().trim();
                            const pNormalized = pLower.replace(/\s+/g, '-');

                            // Direct matches
                            if (pNormalized === basePlanetType) return true;
                            if (pLower === basePlanetType) return true;

                            // Handle variations with/without "planet" suffix
                            if (pLower === `${basePlanetType} planet`) return true;
                            if (pNormalized === `${basePlanetType}-planet`) return true;

                            // Special cases
                            if (pLower === 'barren planet' && basePlanetType === 'barren') return true;
                            if (pLower === 'ice giant' && basePlanetType === 'ice-giant') return true;
                            if (pLower === 'gas giant' && basePlanetType === 'gas-giant') return true;
                            if (pLower === 'system asteroid belt' && basePlanetType === 'system-asteroid-belt') return true;

                            return false;
                        });

                        // Check if this resource is available to this faction
                        const factionMatch = factions.includes('All') ||
                            factions.includes(faction) ||
                            factions.includes(faction.toUpperCase());

                        // Check if tier matches (resource tier <= stake tier)
                        const tierMatch = compTier <= tier;

                        // Only include raw resources that can be directly extracted
                        // Do NOT include components - they need to be processed, not extracted
                        if (planetMatch && factionMatch && tierMatch &&
                            (outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE')) {
                            availableResources.push(compName);
                        }
                    });


                    // Create tags for available resources
                    const resourceTags = [];

                    // Add tags for raw resources that can be extracted
                    availableResources.forEach(resource => {
                        // Add extraction tag for all raw resources
                        resourceTags.push(`enables-${resource}-extraction`);

                        // Add farming tag for organic resources that can be farmed
                        const resourceComp = componentsData.find(c =>
                            c.OutputName && c.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === resource
                        );
                        if (resourceComp && resourceComp.OutputType === 'BASIC ORGANIC RESOURCE') {
                            resourceTags.push(`enables-${resource}-farming`);
                        }
                    });

                    // Add processing tags for components that can be made from available raw resources
                    // This allows processors to be built if their input materials are available
                    componentsData.forEach(component => {
                        const compTier = parseInt(component.OutputTier) || 1;
                        const compName = component.OutputName ?
                            component.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                        const outputType = component.OutputType ? component.OutputType.toUpperCase() : '';
                        const prodSteps = parseInt(component.ProductionSteps) || 0;
                        const compFactions = component.Factions ? component.Factions.split(';').map(f => f.trim()) : [];

                        // Check faction match for this component
                        const compFactionMatch = compFactions.includes('All') ||
                            compFactions.includes(faction) ||
                            compFactions.includes(faction.toUpperCase());

                        // Only add processing tags for components with 1 production step
                        // that can be made from available raw resources and match faction
                        if (compTier <= tier && outputType === 'COMPONENT' && prodSteps === 1 && compFactionMatch) {
                            // Check if all ingredients are available
                            let canProcess = false;
                            for (let i = 1; i <= 9; i++) {
                                const ingredient = component[`Ingredient${i}`];
                                if (ingredient) {
                                    const ingredientName = ingredient.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                    if (availableResources.includes(ingredientName)) {
                                        canProcess = true;
                                        break;
                                    }
                                }
                            }

                            if (canProcess) {
                                resourceTags.push(`enables-${compName}-processing`);
                            }
                        }
                    });

                    // Regular claim stakes with central hub
                    stakeDefinitions.push({
                        id: `claim-stake-${archetype.id}-${faction.toLowerCase()}-t${tier}`,
                        name: `${faction} ${archetype.name} T${tier} Claim Stake`,
                        tier,
                        slots,
                        rentMultiplier: 1.0 + (tier - 1) * 0.25,
                        placementFeeMultiplier: 1.0 + (tier - 1) * 0.5,
                        requiredTags: [`${archetype.id}-planet`, faction.toLowerCase()],
                        addedTags: ['planetary', 'claim-stake', 'standard-stake-only', `tier-${tier}`,
                            `${basePlanetType}-planet`, ...resourceTags],  // Add planet type and resource tags
                        defaultBuilding: stakeRow?.default_building || `${buildingPlanetPrefix}-central-hub-t${tier}`
                    });

                    // Cultivation claim stakes with cultivation hub (for organic-rich planets)
                    if (archetype.name.toLowerCase().includes('terrestrial') ||
                        archetype.name.toLowerCase().includes('oceanic')) {
                        stakeDefinitions.push({
                            id: `cultivation-stake-${archetype.id}-${faction.toLowerCase()}-t${tier}`,
                            name: `${faction} ${archetype.name} T${tier} Cultivation Stake`,
                            tier,
                            slots,
                            rentMultiplier: 1.0 + (tier - 1) * 0.3, // Slightly higher for cultivation
                            placementFeeMultiplier: 1.0 + (tier - 1) * 0.6,
                            requiredTags: [`${archetype.id}-planet`, faction.toLowerCase(), 'organic-suitable'],
                            addedTags: ['planetary', 'cultivation-stake', 'cultivation-stake-only',
                                'organic-focused', `tier-${tier}`, `${basePlanetType}-planet`, ...resourceTags],  // Add planet type and resource tags
                            defaultBuilding: `${buildingPlanetPrefix}-cultivation-hub-t${tier}`
                        });
                    }
                });
            });
        });

        return {
            buildings,
            claimStakeDefinitions: stakeDefinitions
        };
    };

    const generateCraftingHabBuildings = (habAssets) => {
        const habs = [];
        const craftingStations = [];
        const cargoStorage = [];

        // Proper construction time progression (matches claim stake pattern)
        const constructionTimeByTier = {
            1: 1800,   // 30 min
            2: 3600,   // 1 hour
            3: 7200,   // 2 hours
            4: 14400,  // 4 hours
            5: 28800   // 8 hours
        };

        // Process exactly what's in the CSV - no more, no less
        habAssets.forEach(hab => {
            const tier = parseInt(hab.OutputTier) || 1;
            const name = hab.OutputName;
            const id = hab.OutputID;

            // Parse based on the exact hab assets in finalHabAssets.csv
            if (id.startsWith('hab-cargo-storage-t')) {
                // Cargo Storage T1-T5
                const storageProgression = [500, 1500, 3000, 6000, 12000];
                const jobSlotProgression = [0, 1, 1, 2, 3];

                cargoStorage.push({
                    id: hab.OutputID,
                    name: hab.OutputName,
                    tier,
                    storageBonus: storageProgression[tier - 1] || 500,
                    jobSlotBonus: jobSlotProgression[tier - 1] || 0,
                    constructionTime: constructionTimeByTier[tier] || 1800,
                    constructionCost: extractIngredients(hab)
                });
            } else if (id.startsWith('hab-crafting-station-')) {
                // Only XXS, XS, S, M exist in the CSV
                const sizeMap = {
                    'xxs': { speedBonus: 1.0, jobSlots: 1, constructionTime: 900 },
                    'xs': { speedBonus: 1.25, jobSlots: 2, constructionTime: 1800 },
                    's': { speedBonus: 1.5, jobSlots: 3, constructionTime: 3600 },
                    'm': { speedBonus: 2.0, jobSlots: 5, constructionTime: 7200 }
                };

                // Extract size from ID (more reliable than name)
                const sizePart = id.replace('hab-crafting-station-', '').toLowerCase();
                const stats = sizeMap[sizePart] || sizeMap['xxs'];

                craftingStations.push({
                    id: hab.OutputID,
                    name: hab.OutputName,
                    size: sizePart.toUpperCase(),
                    speedBonus: stats.speedBonus,
                    jobSlots: stats.jobSlots,
                    constructionTime: stats.constructionTime,
                    constructionCost: extractIngredients(hab)
                });
            } else if (id.startsWith('hab-landing-pad-')) {
                // Landing pads: XXS, XS, S, M
                const landingPadStats = {
                    'xxs': { slots: 5, constructionTime: 900 },
                    'xs': { slots: 10, constructionTime: 1800 },
                    's': { slots: 20, constructionTime: 3600 },
                    'm': { slots: 40, constructionTime: 7200 }
                };

                const sizePart = id.replace('hab-landing-pad-', '').toLowerCase();
                const stats = landingPadStats[sizePart] || landingPadStats['xxs'];

                habs.push({
                    id: hab.OutputID,
                    name: hab.OutputName,
                    tier,
                    slots: stats.slots,
                    description: `Landing pad for ships`,
                    constructionTime: stats.constructionTime,
                    constructionCost: extractIngredients(hab)
                });
            } else if (id === 'hab-interior-paint' ||
                id === 'hab-exterior-paint' ||
                id === 'hab-pet-house') {
                // Decorative items - minimal slots and faster construction
                habs.push({
                    id: hab.OutputID,
                    name: hab.OutputName,
                    tier,
                    slots: 2,  // Minimal job slots for decorative items
                    description: `Decorative habitat enhancement`,
                    constructionTime: 300,  // 5 minutes for cosmetic items
                    constructionCost: extractIngredients(hab)
                });
            } else if (id.startsWith('hab-t')) {
                // Main habitat modules T1-T5
                const jobSlotProgression = [3, 8, 15, 25, 40];  // Exponential growth for job slots

                habs.push({
                    id: hab.OutputID,
                    name: hab.OutputName,
                    tier,
                    slots: jobSlotProgression[tier - 1] || 3,  // Job slots for crafting orders
                    description: `Tier ${tier} habitat module`,
                    constructionTime: constructionTimeByTier[tier] || 1800,
                    constructionCost: extractIngredients(hab)
                });
            }
        });

        // No fallback items - only what's in the CSV
        return {
            habs,
            craftingStations,
            cargoStorage
        };
    };

    const extractIngredients = (recipe) => {
        const cost = {};
        for (let i = 1; i <= 9; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            const quantity = recipe[`Quantity${i}`];
            if (ingredient && quantity) {
                const resourceId = ingredient.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                cost[resourceId] = parseInt(quantity) || 1;
            }
        }
        return cost;
    };

    const generateRecipes = (buildings, components, habAssets) => {
        const recipes = [];

        // Convert building recipes
        buildings.forEach(building => {
            const recipe = {
                outputId: building.OutputID,
                outputName: building.OutputName,
                outputType: building.OutputType,
                outputTier: parseInt(building.OutputTier) || 1,
                buildingResourceTier: parseInt(building.BuildingResourceTier) || 1,
                constructionTime: parseInt(building.ConstructionTime) || 60,
                planetTypes: building.PlanetTypes ? building.PlanetTypes.split(';').map(p => p.trim()) : [],
                factions: building.Factions ? building.Factions.split(';').map(f => f.trim()) : [],
                resourceType: building.ResourceType || 'Building',
                productionSteps: parseInt(building.ProductionSteps) || 1,
                ingredients: []
            };

            for (let i = 1; i <= 7; i++) {
                const ingredient = building[`Ingredient${i}`];
                const quantity = building[`Quantity${i}`];
                if (ingredient && quantity) {
                    recipe.ingredients.push({
                        name: ingredient,
                        quantity: parseInt(quantity) || 1
                    });
                }
            }

            recipes.push(recipe);
        });

        // Convert component recipes
        components.forEach(component => {
            const recipe = {
                outputId: component.OutputID,
                outputName: component.OutputName,
                outputType: component.OutputType,
                outputTier: parseInt(component.OutputTier) || 1,
                constructionTime: parseInt(component.ConstructionTime) || 30,
                planetTypes: component.PlanetTypes ? component.PlanetTypes.split(';').map(p => p.trim()) : [],
                factions: component.Factions ? component.Factions.split(';').map(f => f.trim()) : [],
                resourceType: component.ResourceType || 'Component',
                functionalPurpose: component.FunctionalPurpose,
                usageCategory: component.UsageCategory,
                productionSteps: parseInt(component.ProductionSteps) || 1,
                ingredients: []
            };

            for (let i = 1; i <= 9; i++) {
                const ingredient = component[`Ingredient${i}`];
                const quantity = component[`Quantity${i}`];
                if (ingredient && quantity) {
                    recipe.ingredients.push({
                        name: ingredient,
                        quantity: parseInt(quantity) || 1
                    });
                }
            }

            if (recipe.ingredients.length > 0 || component.OutputType === 'BASIC RESOURCE') {
                recipes.push(recipe);
            }
        });

        // Convert hab asset recipes
        habAssets.forEach(hab => {
            const recipe = {
                outputId: hab.OutputID,
                outputName: hab.OutputName,
                outputType: hab.OutputType,
                outputTier: parseInt(hab.OutputTier) || 1,
                constructionTime: parseInt(hab.ConstructionTime) || 60,
                planetTypes: hab.PlanetTypes ? hab.PlanetTypes.split(';').map(p => p.trim()) : [],
                factions: hab.Factions ? hab.Factions.split(';').map(f => f.trim()) : [],
                productionSteps: parseInt(hab.ProductionSteps) || 1,
                ingredients: []
            };

            for (let i = 1; i <= 9; i++) {
                const ingredient = hab[`Ingredient${i}`];
                const quantity = hab[`Quantity${i}`];
                if (ingredient && quantity) {
                    recipe.ingredients.push({
                        name: ingredient,
                        quantity: parseInt(quantity) || 1
                    });
                }
            }

            recipes.push(recipe);
        });

        return { recipes };
    };

    const generatePlanetArchetypes = (componentsData) => {
        const archetypes = [];

        // Extract extractable resources by planet type AND faction
        // Only include BASIC RESOURCE, BASIC ORGANIC RESOURCE, and COMPONENT types with low production steps
        const planetFactionResources = {};
        let extractableCount = 0;
        let totalCount = 0;

        componentsData.forEach(comp => {
            totalCount++;
            const outputType = comp.OutputType ? comp.OutputType.toUpperCase() : '';
            const productionSteps = parseInt(comp.ProductionSteps) || 0;

            // Include both raw resources and low-tier components
            // Raw resources can be extracted directly (and have richness values)
            // Components can be processed on the planet (but don't have richness)
            const isExtractable = outputType === 'BASIC RESOURCE' ||
                outputType === 'BASIC ORGANIC RESOURCE' ||
                (outputType === 'COMPONENT' && productionSteps < 3);

            if (isExtractable && comp.PlanetTypes && comp.OutputName) {
                extractableCount++;
                const planets = comp.PlanetTypes.split(';').map(p => p.trim());
                const factionList = comp.Factions ? comp.Factions.split(';').map(f => f.trim()) : ['All'];
                const resourceId = comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                // Check if all three factions are listed (equivalent to "All")
                const hasAllFactions = factionList.includes('MUD') &&
                    factionList.includes('ONI') &&
                    factionList.includes('USTUR');
                const effectiveFactions = hasAllFactions || factionList.includes('All') ?
                    ['All'] : factionList;



                planets.forEach(planet => {
                    effectiveFactions.forEach(faction => {
                        // Handle "All" faction - add to all three factions
                        if (faction === 'All') {
                            ['MUD', 'ONI', 'USTUR'].forEach(f => {
                                const key = `${planet}-${f}`;
                                if (!planetFactionResources[key]) {
                                    planetFactionResources[key] = new Set();
                                }
                                planetFactionResources[key].add(resourceId);
                            });
                        } else {
                            const key = `${planet}-${faction}`;
                            if (!planetFactionResources[key]) {
                                planetFactionResources[key] = new Set();
                            }
                            planetFactionResources[key].add(resourceId);
                        }
                    });
                });
            }
        });



        planetArchetypes.forEach(archetype => {
            // Generate plot and rent data by starbase level
            const plots = {};
            const rent = {};

            for (let level = 0; level <= 6; level++) {
                plots[level] = {};
                rent[level] = {};

                tiers.forEach(tier => {
                    // More plots at lower tiers
                    plots[level][tier] = Math.max(1, Math.floor((10 + level * 2) * Math.pow(0.7, tier - 1)));
                    // Higher rent at higher tiers
                    rent[level][tier] = (0.5 + level * 0.1) * tier;
                });
            }

            factions.forEach(faction => {
                // Get resources for this specific planet-faction combination
                const key = `${archetype.name}-${faction}`;
                const resources = planetFactionResources[key] || new Set();



                // Create richness map with randomized values between 1-7
                // Only for raw resources, not components
                const richnessMap = {};
                resources.forEach(resourceId => {
                    // Find the resource in componentsData to check its type
                    const resourceData = componentsData.find(comp => {
                        const compId = comp.OutputName ?
                            comp.OutputName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
                        return compId === resourceId;
                    });

                    if (resourceData) {
                        const outputType = resourceData.OutputType ? resourceData.OutputType.toUpperCase() : '';
                        // Only add richness for raw extractable resources
                        if (outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE') {
                            richnessMap[resourceId] = 1 + Math.random() * 6;  // Random richness between 1-7
                        }
                    }
                });

                archetypes.push({
                    id: `${archetype.id}-${faction.toLowerCase()}`,
                    name: `${archetype.name}`,
                    description: `${faction} controlled ${archetype.name.toLowerCase()}`,
                    faction,
                    richness: richnessMap,
                    resources: Array.from(resources),  // Include the actual resource list
                    plots,
                    rent,
                    tags: [`${archetype.id}-planet`, faction.toLowerCase()]
                });
            });
        });

        return { archetypes };
    };

    const generatePlanets = (archetypesData) => {
        const planets = [];
        let planetId = 1;

        archetypesData.archetypes.forEach(archetype => {
            // Generate 2-3 planets per archetype
            const numPlanets = 2 + Math.floor(Math.random() * 2);

            for (let i = 0; i < numPlanets; i++) {
                // Use all resources from the archetype (no richness filtering)
                const resources = archetype.resources || Object.keys(archetype.richness || {});

                planets.push({
                    id: `planet-${planetId.toString().padStart(3, '0')}`,
                    name: generatePlanetName(archetype.name.split(' ')[0], i),
                    archetype: archetype.id,
                    faction: archetype.faction,
                    starbaseLevel: Math.floor(Math.random() * 7),
                    resources,  // All resources that match planet type and faction
                    coordinates: {
                        x: Math.floor(Math.random() * 1000),
                        y: Math.floor(Math.random() * 1000)
                    },
                    description: `${archetype.faction} controlled planet in the ${archetype.name.split(' ')[0]} system`
                });
                planetId++;
            }
        });

        return { planets };
    };

    const generatePlanetName = (archetypeName, index) => {
        const prefixes = ['New', 'Nova', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Sigma'];
        const suffixes = ['Prime', 'Major', 'Minor', 'Alpha', 'Beta', 'III', 'IV', 'V'];

        return `${prefixes[index % prefixes.length]} ${archetypeName.split(' ')[0]} ${suffixes[index % suffixes.length]}`;
    };

    const generateStarbases = () => {
        const starbases = [
            {
                id: 'starbase-mud-alpha',
                name: 'MUD Central Command',
                faction: 'MUD',
                level: 5,
                coordinates: { x: 500, y: 500 },
                habPlots: 10,
                services: ['crafting', 'trading', 'repair', 'insurance'],
                description: 'Main MUD faction starbase with full services'
            },
            {
                id: 'starbase-oni-prime',
                name: 'ONI Strategic Hub',
                faction: 'ONI',
                level: 5,
                coordinates: { x: 300, y: 700 },
                habPlots: 10,
                services: ['crafting', 'trading', 'repair', 'research'],
                description: 'Primary ONI faction starbase'
            },
            {
                id: 'starbase-ustur-nexus',
                name: 'USTUR Trade Nexus',
                faction: 'USTUR',
                level: 5,
                coordinates: { x: 700, y: 300 },
                habPlots: 10,
                services: ['crafting', 'trading', 'repair', 'marketplace'],
                description: 'Central USTUR trading and crafting hub'
            }
        ];

        return { starbases };
    };

    const downloadJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadAllFiles = () => {
        Object.entries(generatedData).forEach(([key, data]) => {
            downloadJSON(data, `${key}.json`);
        });
    };

    return (
        <div className="data-creator">
            <h2>🏗️ SAGE C4 Data Creator</h2>

            <div className="creator-info">
                <h3>What This Tool Does:</h3>
                <ul>
                    <li>Reads your CSV files (buildings, components, hab assets)</li>
                    <li>Generates all required JSON files according to DATA-STRUCTURE-GUIDE</li>
                    <li>Creates {planetArchetypes.length * factions.length} planet archetypes (8 types × 3 factions)</li>
                    <li>Generates {planetArchetypes.length * factions.length * tiers.length} unique claim stake definitions</li>
                    <li>Converts all recipes to proper format</li>
                    <li>Creates planets, starbases, and all building configurations</li>
                </ul>
            </div>

            <div className="creator-controls">
                <button
                    onClick={generateData}
                    disabled={loading}
                    className="generate-btn"
                >
                    {loading ? 'Generating...' : '🚀 Generate All Data Files'}
                </button>

                {status && (
                    <div className={`status ${status.includes('Error') ? 'error' : 'success'}`}>
                        {status}
                    </div>
                )}
            </div>

            {Object.keys(generatedData).length > 0 && (
                <div className="generated-files">
                    <h3>Generated Files:</h3>
                    <div className="file-list">
                        {Object.entries(generatedData).map(([key, data]) => (
                            <div key={key} className="file-item">
                                <div className="file-info">
                                    <span className="file-name">{key}.json</span>
                                    <span className="file-stats">
                                        {Array.isArray(data) ? `${data.length} items` :
                                            data.resources ? `${data.resources.length} resources` :
                                                data.buildings ? `${data.buildings.length} buildings` :
                                                    data.recipes ? `${data.recipes.length} recipes` :
                                                        data.planets ? `${data.planets.length} planets` :
                                                            data.archetypes ? `${data.archetypes.length} archetypes` :
                                                                data.starbases ? `${data.starbases.length} starbases` :
                                                                    'Ready'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => downloadJSON(data, `${key}.json`)}
                                    className="download-file-btn"
                                >
                                    📥 Download
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="download-all">
                        <button onClick={downloadAllFiles} className="download-all-btn">
                            📦 Download All Files
                        </button>
                    </div>

                    <div className="preview-section">
                        <h3>Data Preview:</h3>
                        <div className="preview-tabs">
                            {Object.keys(generatedData).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedPreview(key)}
                                    className={`preview-tab ${selectedPreview === key ? 'active' : ''}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        {selectedPreview && (
                            <pre className="json-preview">
                                {JSON.stringify(generatedData[selectedPreview], null, 2).slice(0, 2000)}...
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataCreator;
