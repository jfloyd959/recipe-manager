import { useRecipes } from '../../context/RecipeContext';

/**
 * Comprehensive Building Recipe Generation System
 * Follows the Complete Building Recipe Generation Process Guide
 * Maximizes existing component reuse and tracks new components needed
 */

export class BuildingRecipeGenerator {
    constructor(recipes = [], config = {}) {
        // Validate recipes is an array
        if (!Array.isArray(recipes)) {
            console.error('Invalid recipes data provided to BuildingRecipeGenerator');
            recipes = [];
        }

        this.recipes = recipes;
        this.config = {
            nativeTierMax: 3,
            minimizeNewComponents: true,
            ...config
        };

        // Track all new components created GLOBALLY
        this.globalNewComponents = new Map(); // Use Map for deduplication by ID
        this.existingComponentsReused = 0;

        // Track components available for reuse (includes both existing and newly created)
        this.availableComponents = new Map();

        // Initialize available components with existing ones
        this.recipes.forEach(recipe => {
            const outputType = this.getRecipeOutputType(recipe);
            const outputID = this.getRecipeOutputID(recipe);
            if (outputType === 'COMPONENT' && outputID) {
                this.availableComponents.set(outputID, recipe);
            }
        });

        // Component name generators for unique naming
        this.componentNameGenerators = {
            'Infrastructure': ['Framework', 'Core', 'Module', 'System', 'Matrix', 'Assembly'],
            'Processing': ['Processor', 'Converter', 'Refiner', 'Catalyst', 'Matrix', 'Unit'],
            'Extraction': ['Drill', 'Extractor', 'Harvester', 'Collector', 'Miner', 'Pump'],
            'Farm': ['Growth Matrix', 'Bio Processor', 'Cultivator', 'Hydroponics', 'Bio Chamber', 'Growth Module']
        };

        // Theme filters for components
        this.unsuitableThemes = [
            'weapon', 'shield', 'amplifier', 'flare', 'decoy', 'mine',
            'missile', 'bomb', 'countermeasure', 'defense', 'attack'
        ];

        this.suitableThemes = [
            'framework', 'composite', 'module', 'core', 'plating', 'structure',
            'matrix', 'processor', 'converter', 'drill', 'extractor', 'panel',
            'bracket', 'sheet', 'fiber', 'block', 'control', 'system'
        ];

        // Explicit list of components that should NEVER be used in buildings
        this.bannedBuildingComponents = new Set([
            // Weapon/Ammo components
            'Blast Charges',
            'Ammo Control Core',
            'Beam Interface Core',
            'Beam Emitter',
            'Field Harmonizer',
            'Signal Booster',
            'Emergency Suppressant',
            'Interference Shield',
            'Thrust Modulator',

            // Ship control systems
            'Control System Core',
            'Coordination Matrix',
            'Emergency Matrix Core',
            'Crystal Lattice MUD',
            'Crystal Lattice ONI',
            'Crystal Lattice Ustur',
            'Drive Assembly Core',
            'Launch Platform Core',
            'Jasphorus Propulsion Core',
            'Kinetic Opal Core',

            // Ship cooling/power systems
            'Coolant Circulator',
            'Cooling Network Hub',
            'Cryogenic Core',
            'Neural Networks',

            // Defense systems
            'Shield Generator',
            'Defense Matrix',
            'Countermeasure System'
        ]);

        // Preferred components for buildings
        this.preferredBuildingComponents = new Set([
            // Structural
            'Aerogel',
            'Alloy Frame',
            'Base Structure',
            'Barrier Material',
            'Bio Framework',
            'Bio Stabilizer',

            // Basic processed materials
            'Aluminum',
            'Boron',
            'Chromite Ingot',
            'Cobalt',
            'Copper',
            'Copper Wire',
            'Iron',
            'Lithium',
            'Manganese',
            'Tin',
            'Zinc',

            // Building systems
            'Utility Core',
            'Adaptive Utility Core',
            'Assembly Control Matrix',
            'Climate Controller',
            'Command Module',
            'Coupling Interface',
            'Boron Composite',

            // Power/Energy (non-weapon)
            'Capacitor Matrix Core',
            'Capacity Control Core',
            'Beryllium Matrix',
            'Advanced Sensor Grid',
            'Chisenic Processor',
            'Coupling Control Core',
            'Fuel Primer'
        ]);

        // Validate recipes array
        if (!Array.isArray(this.recipes)) {
            console.error('BuildingRecipeGenerator: recipes must be an array');
            this.recipes = [];
        }

        // Log recipe statistics
        const componentCount = this.recipes.filter(r => r && (r.OutputType === 'COMPONENT' || r.outputType === 'COMPONENT')).length;
        const resourceCount = this.recipes.filter(r => r &&
            (r.OutputType === 'BASIC RESOURCE' || r.outputType === 'BASIC RESOURCE' ||
                r.OutputType === 'BASIC ORGANIC RESOURCE' || r.outputType === 'BASIC ORGANIC RESOURCE')).length;
        console.log(`📦 BuildingRecipeGenerator initialized with ${this.recipes.length} total recipes`);
        console.log(`  - ${componentCount} components`);
        console.log(`  - ${resourceCount} basic resources`);

        // Log a few example components
        const exampleComponents = this.recipes
            .filter(r => r && (r.OutputType === 'COMPONENT' || r.outputType === 'COMPONENT'))
            .slice(0, 5)
            .map(c => c.OutputName || c.outputName || c.OutputID || c.id);
        if (exampleComponents.length > 0) {
            console.log(`  - Example components:`, exampleComponents);
        } else {
            console.warn(`  ⚠️ No components found in recipes!`);
        }

        // Native resources by planet (from documentation)
        this.planetNativeResources = this.initializePlanetResources();

        // Building categories and their bootstrap rules
        this.buildingCategories = {
            'Infrastructure': {
                'Central Hub': { bootstrap: false, t1AutoBuilt: true },
                'Cultivation Hub': { bootstrap: false, t1AutoBuilt: true }, // Also auto-built with claim stake
                'Processing Hub': { bootstrap: true },
                'Extraction Hub': { bootstrap: true },
                'Storage Hub': { bootstrap: true },
                'Farm Hub': { bootstrap: true },
                'Power Plant': { bootstrap: true },
                'Crew Quarters': { bootstrap: true }
            },
            'Processing': {
                basic: { bootstrap: true }, // Basic component processors
                advanced: { bootstrap: false }
            },
            'Extraction': {
                resource: { bootstrap: false },
                farm: { bootstrap: false }
            }
        };

        // Component categories suitable for building construction
        this.buildingSuitableComponentTypes = [
            // Structural components
            'frame', 'framework', 'structure', 'beam', 'brace', 'anchor', 'joint',
            'plate', 'plating', 'panel', 'sheet', 'hull', 'shell', 'housing',

            // Materials
            'alloy', 'composite', 'material', 'ingot', 'bar', 'rod', 'wire',
            'fiber', 'fabric', 'mesh', 'lattice', 'matrix',

            // Systems
            'system', 'core', 'module', 'unit', 'assembly', 'circuit', 'processor',
            'controller', 'interface', 'network', 'grid', 'hub',

            // Power/Energy
            'power', 'energy', 'cell', 'battery', 'generator', 'reactor', 'capacitor',

            // Environmental
            'thermal', 'cooling', 'heating', 'insulation', 'seal', 'coating',
            'climate', 'atmospheric', 'pressure', 'temperature',

            // Utility
            'utility', 'conduit', 'pipe', 'cable', 'connector', 'coupling',
            'valve', 'pump', 'filter', 'regulator', 'stabilizer'
        ];

        // Components to avoid for buildings (more suitable for weapons/ships)
        this.nonBuildingComponentTypes = [
            'weapon', 'missile', 'bomb', 'projectile', 'ammo', 'warhead',
            'harmonizer', 'amplifier', 'emitter', 'beam', 'laser', 'photon',
            'shield', 'defense', 'countermeasure', 'decoy', 'flare',
            'propulsion', 'thrust', 'engine', 'drive', 'warp', 'jump'
        ];
    }

    /**
     * Initialize native resources for each planet type
     * These should match the IDs in finalComponentList.csv
     */
    initializePlanetResources() {
        return {
            'Oceanic Planet': {
                t1: ['abyssal-chromite', 'biomass', 'hydrogen', 'nitrogen', 'marine-bio-extract'],
                t2: ['argon', 'cobalt-ore', 'fluorine-gas', 'manganese-ore', 'oxygen',
                    'thermal-bloom-sediment', 'bioluminous-algae'],
                t3: ['bathysphere-pearls', 'neural-coral-compounds', 'phase-shift-crystals'],
                t4: ['abyssal-energy-crystals'],
                t5: ['lunar-echo-crystals']
            },
            'Volcanic Planet': {
                t1: ['arco', 'carbon', 'copper-ore', 'germanium', 'hydrogen', 'lumanite',
                    'osmium-ore', 'quartz-crystals', 'rhenium-ore', 'rochinol', 'silicon-crystal',
                    'sodium-crystals', 'tantalum-ore', 'thermal-regulator-stone', 'tin-ore',
                    'zinc-ore', 'magma-heart-bryophyte', 'obsidian-shell-tuber', 'pyroclast-energen'],
                t2: ['diamond', 'fluorine-gas', 'garnet-crystals', 'hafnium-ore', 'xenon',
                    'cinder-crown-blossom'],
                t3: ['cinnabar-crystals', 'glowstone-crystals', 'palladium-ore',
                    'plasma-containment-minerals', 'platinum-ore', 'sapphire-crystals',
                    'zirconium'],
                t4: ['dodiline-crystals', 'iridium-ore', 'rhodium-ore'],
                t5: []
            },
            'Terrestrial Planet': {
                t1: ['arco', 'biomass', 'carbon', 'hydrogen', 'iron-ore', 'krypton',
                    'neodymium', 'nitrogen', 'silica', 'thermoplastic-resin'],
                t2: ['aluminum-ore', 'amber-resin', 'argon', 'oxygen', 'thermal-bloom-sediment'],
                t3: ['gold-ore'],
                t4: ['dysprosium', 'ochre-ore'],
                t5: []
            },
            'Barren Planet': {
                t1: ['arco', 'copper-ore', 'krypton', 'tin-ore', 'zinc-ore'],
                t2: ['lithium-ore', 'manganese-ore', 'rochinol'],
                t3: ['tungsten-ore', 'vanadium-ore'],
                t4: [],
                t5: ['black-opal', 'jasphorus-crystals', 'resonium-ore']
            },
            'Dark Planet': {
                t1: ['neodymium', 'germanium', 'shadow-sight-fronds'],
                t2: ['diamond', 'methane', 'umbral-rush-tendril'],
                t3: ['emerald-crystals', 'neon', 'temporal-flux-orchid', 'spectral-shade-moss'],
                t4: [],
                t5: ['beryllium-crystals', 'fusion-catalyst-deposits', 'living-metal-symbionts',
                    'opal-fragments']
            },
            'Ice Giant': {
                t1: ['germanium', 'krypton'],
                t2: ['cobalt-ore', 'diamond', 'garnet-crystals'],
                t3: ['cryo-formation-crystals'],
                t4: ['hicenium-crystals'],
                t5: ['beryllium-crystals', 'biolumite']
            },
            'Gas Giant': {
                t1: ['carbon', 'hydrogen', 'krypton', 'nitrogen'],
                t2: ['argon', 'fluorine-gas'],
                t3: ['neon'],
                t4: [],
                t5: []
            },
            'System Asteroid Belt': {
                t1: ['copper-ore'],
                t2: ['aluminum-ore', 'boron-ore', 'lithium-ore', 'methane'],
                t3: ['plasma-burn-lichen'],
                t4: [],
                t5: []
            }
        };
    }

    /**
     * Build a comprehensive list of native resource names and IDs
     */
    buildNativeResourceList(planetType) {
        const nativeResources = this.planetNativeResources[planetType];
        if (!nativeResources) return [];

        const resourceSet = new Set();

        // Add all resource IDs from our definition
        Object.values(nativeResources).forEach(tierResources => {
            if (Array.isArray(tierResources)) {
                tierResources.forEach(resourceId => {
                    if (resourceId) {
                        resourceSet.add(resourceId);
                    }
                });
            }
        });

        // Now find these resources in the recipes and add their names too
        const resourceList = Array.from(resourceSet);
        resourceList.forEach(resourceId => {
            const resource = this.recipes.find(r => {
                if (!r) return false;
                const outputId = this.getRecipeOutputID(r);
                const outputName = this.getRecipeOutputName(r);
                return (this.toKebabCase(outputId) === resourceId ||
                    this.toKebabCase(outputName) === resourceId);
            });

            if (resource) {
                // Add the OutputName if it exists
                const outputName = this.getRecipeOutputName(resource);
                const outputId = this.getRecipeOutputID(resource);
                if (outputName) {
                    resourceSet.add(outputName);
                    resourceSet.add(this.toKebabCase(outputName));
                }
                // Add the OutputID if it exists
                if (outputId) {
                    resourceSet.add(outputId);
                    resourceSet.add(this.toKebabCase(outputId));
                }
            }
        });

        return Array.from(resourceSet);
    }

    /**
     * Check if an ingredient is available natively
     */
    isIngredientNative(ingredient, nativeResourceList) {
        if (!ingredient) return false;

        // Check exact match
        if (nativeResourceList.includes(ingredient)) return true;

        // Check kebab-case version
        const kebabIngredient = this.toKebabCase(ingredient);
        if (nativeResourceList.includes(kebabIngredient)) return true;

        // Check if any native resource matches when kebab-cased
        return nativeResourceList.some(native =>
            this.toKebabCase(native) === kebabIngredient
        );
    }

    /**
     * Check if a component is thematically suitable for building construction
     */
    isComponentSuitableForBuildings(component) {
        const name = this.getRecipeOutputName(component) || '';
        const nameLower = name.toLowerCase();
        const id = (this.getRecipeOutputID(component) || '').toLowerCase();

        // First check explicit banned list
        if (this.bannedBuildingComponents.has(name)) {
            return false;
        }

        // Check if it's in the preferred list
        if (this.preferredBuildingComponents.has(name)) {
            return true;
        }

        // Check if it contains non-building keywords
        for (const keyword of this.nonBuildingComponentTypes) {
            if (nameLower.includes(keyword) || id.includes(keyword)) {
                return false;
            }
        }

        // Check if it contains building-suitable keywords
        for (const keyword of this.buildingSuitableComponentTypes) {
            if (nameLower.includes(keyword) || id.includes(keyword)) {
                return true;
            }
        }

        // Default to false for unknown components (be conservative)
        return false;
    }

    /**
     * Analyze existing components for compatibility with planet resources
     */
    analyzeExistingComponents(planetType) {
        const nativeResources = this.planetNativeResources[planetType];
        if (!nativeResources) {
            console.error(`No native resources defined for planet: ${planetType}`);
            return {
                compatible: [],
                incompatible: [],
                unsuitable: [],
                byTier: { 1: [], 2: [], 3: [], 4: [], 5: [] }
            };
        }

        // Build comprehensive list of native resource names and IDs
        const nativeResourceList = this.buildNativeResourceList(planetType);

        const analysis = {
            compatible: [],
            incompatible: [],
            unsuitable: [], // Components that are native-buildable but not suitable for buildings
            byTier: { 1: [], 2: [], 3: [], 4: [], 5: [] }
        };

        console.log(`📊 Analyzing components for ${planetType} with ${nativeResourceList.length} native resource variations`);
        console.log(`  Sample native resources:`, nativeResourceList.slice(0, 10));

        // Check each existing component for native buildability
        let checkedCount = 0;
        let compatibleExamples = [];
        let unsuitableExamples = [];

        this.recipes.forEach(recipe => {
            const outputType = this.getRecipeOutputType(recipe);
            if (recipe && outputType === 'COMPONENT') {
                checkedCount++;

                // Only do detailed logging for first few components
                const doDetailedLog = checkedCount <= 5;

                if (doDetailedLog) {
                    const outputName = this.getRecipeOutputName(recipe);
                    const outputId = this.getRecipeOutputID(recipe);
                    console.log(`  Checking component: ${outputName || outputId}`);
                    // Log ingredients
                    const ingredients = [];
                    for (let i = 1; i <= 8; i++) {
                        const ingredient = this.getRecipeIngredient(recipe, i);
                        if (ingredient) {
                            ingredients.push(ingredient);
                        }
                    }
                    console.log(`    Ingredients:`, ingredients);
                }

                const isNative = this.isComponentNativeBuildable(recipe, nativeResourceList, new Set(), doDetailedLog);
                const isSuitable = this.isComponentSuitableForBuildings(recipe);

                if (isNative) {
                    if (isSuitable) {
                        analysis.compatible.push(recipe);
                        const tier = parseInt(this.getRecipeOutputTier(recipe)) || 1;
                        if (analysis.byTier[tier]) {
                            analysis.byTier[tier].push(recipe);
                        }
                        if (compatibleExamples.length < 5) {
                            const name = this.getRecipeOutputName(recipe) || this.getRecipeOutputID(recipe);
                            compatibleExamples.push(name);
                        }
                    } else {
                        analysis.unsuitable.push(recipe);
                        if (unsuitableExamples.length < 5) {
                            const name = this.getRecipeOutputName(recipe) || this.getRecipeOutputID(recipe);
                            unsuitableExamples.push(name);
                        }
                    }
                } else {
                    analysis.incompatible.push(recipe);
                }
            }
        });

        console.log(`  Checked ${checkedCount} components`);
        console.log(`  ✅ Compatible & Suitable: ${analysis.compatible.length}`);
        console.log(`  ⚠️ Native but Unsuitable: ${analysis.unsuitable.length}`);
        console.log(`  ❌ Incompatible: ${analysis.incompatible.length}`);

        if (compatibleExamples.length > 0) {
            console.log(`  First suitable components:`, compatibleExamples);
        }

        if (unsuitableExamples.length > 0) {
            console.log(`  Examples of unsuitable (weapon/ship) components:`, unsuitableExamples);
        }

        // Log breakdown by tier
        Object.entries(analysis.byTier).forEach(([tier, components]) => {
            if (components.length > 0) {
                console.log(`    T${tier}: ${components.length} suitable components`);
                if (components.length <= 5) {
                    console.log(`      Examples:`, components.map(c => this.getRecipeOutputName(c) || this.getRecipeOutputID(c)));
                } else {
                    console.log(`      Examples:`, components.slice(0, 5).map(c => this.getRecipeOutputName(c) || this.getRecipeOutputID(c)));
                }
            }
        });

        return analysis;
    }

    /**
     * Check if a component can be built with only native resources
     * This needs to recursively check component dependencies
     */
    isComponentNativeBuildable(component, nativeResourceList, checkedComponents = new Set(), doLog = false) {
        // Avoid infinite recursion
        const componentName = this.getRecipeOutputName(component);
        const componentId = this.toKebabCase(componentName || this.getRecipeOutputID(component));
        if (checkedComponents.has(componentId)) {
            return true; // Assume true to avoid infinite loops
        }
        checkedComponents.add(componentId);

        // Check all ingredients
        for (let i = 1; i <= 8; i++) {
            const ingredient = this.getRecipeIngredient(component, i);
            if (!ingredient || ingredient === '') continue;

            // Check if this ingredient is a native resource
            const isNative = this.isIngredientNative(ingredient, nativeResourceList);

            if (doLog) {
                console.log(`      Ingredient "${ingredient}" native? ${isNative}`);
            }

            if (isNative) {
                continue; // This ingredient is OK
            }

            // Not a native resource - check if it's a component that can be made
            const ingredientId = this.toKebabCase(ingredient);
            const ingredientComponent = this.recipes.find(r => {
                if (!r) return false;
                const outputType = this.getRecipeOutputType(r);
                if (outputType !== 'COMPONENT') return false;

                const outputName = this.getRecipeOutputName(r);
                const outputId = this.getRecipeOutputID(r);

                return (this.toKebabCase(outputName) === ingredientId ||
                    this.toKebabCase(outputId) === ingredientId ||
                    outputName === ingredient ||
                    outputId === ingredient);
            });

            if (!ingredientComponent) {
                // Can't find this ingredient as a component either - can't make it
                if (doLog) {
                    console.log(`      ❌ Ingredient "${ingredient}" not found as component or native resource`);
                }
                return false;
            }

            // Recursively check if this component can be made with native resources
            if (!this.isComponentNativeBuildable(ingredientComponent, nativeResourceList, checkedComponents, false)) {
                if (doLog) {
                    console.log(`      ❌ Component "${ingredient}" cannot be made with native resources`);
                }
                return false;
            }
        }

        return true; // All ingredients can be sourced natively
    }

    /**
     * Generate Infrastructure Buildings with bootstrap logic
     */
    generateInfrastructureBuildings(planetType, componentAnalysis) {
        const recipes = [];
        const hubs = [
            'Central Hub', 'Cultivation Hub', 'Processing Hub', 'Extraction Hub',
            'Storage Hub', 'Farm Hub', 'Power Plant', 'Crew Quarters'
        ];

        hubs.forEach(hubName => {
            const hubConfig = this.buildingCategories.Infrastructure[hubName];
            const hubRecipes = this.generateProgressiveBuildingFamily(
                hubName, planetType, 'Infrastructure', componentAnalysis, hubConfig
            );
            recipes.push(...hubRecipes);
        });

        return recipes;
    }

    /**
     * Generate Processor Buildings for components
     */
    generateProcessorBuildings(planetType, componentAnalysis) {
        const recipes = [];
        const nativeResources = this.planetNativeResources[planetType];

        // Basic processors for T1 components (bootstrap exception)
        const basicProcessors = this.getBasicProcessorsNeeded(planetType, componentAnalysis);
        basicProcessors.forEach(processor => {
            const processorRecipes = this.generateProgressiveBuildingFamily(
                processor.name, planetType, 'Processing', componentAnalysis,
                { bootstrap: true, targetResource: processor.resource }
            );
            recipes.push(...processorRecipes);
        });

        // Advanced processors for higher tier components
        const advancedProcessors = this.getAdvancedProcessorsNeeded(planetType, componentAnalysis);
        advancedProcessors.forEach(processor => {
            const processorRecipes = this.generateProgressiveBuildingFamily(
                processor.name, planetType, 'Processing', componentAnalysis,
                { bootstrap: false, targetResource: processor.resource }
            );
            recipes.push(...processorRecipes);
        });

        return recipes;
    }

    /**
     * Generate Extractor Buildings for resources
     */
    generateExtractorBuildings(planetType, componentAnalysis) {
        const recipes = [];
        const nativeResources = this.planetNativeResources[planetType];

        if (!nativeResources) {
            console.warn(`No native resources defined for ${planetType}`);
            return recipes;
        }

        // Generate extractors for each native resource
        Object.entries(nativeResources).forEach(([tierKey, resources]) => {
            if (!resources || !Array.isArray(resources) || resources.length === 0) {
                return; // Skip empty or invalid resource arrays
            }

            const tier = parseInt(tierKey.substring(1));
            resources.forEach(resourceId => {
                if (!resourceId) return; // Skip undefined/null resources

                const resource = this.recipes.find(r => {
                    if (!r) return false;
                    const outputName = this.getRecipeOutputName(r);
                    const outputId = this.getRecipeOutputID(r);
                    const outputType = this.getRecipeOutputType(r);

                    return (this.toKebabCase(outputName) === resourceId ||
                        this.toKebabCase(outputId) === resourceId) &&
                        outputType === 'BASIC RESOURCE';
                });

                if (resource) {
                    const resourceName = this.getRecipeOutputName(resource);
                    const extractorName = `${resourceName} Extractor`;
                    const extractorRecipes = this.generateProgressiveBuildingFamily(
                        extractorName, planetType, 'Extraction', componentAnalysis,
                        { targetResource: resource, resourceTier: tier }
                    );
                    recipes.push(...extractorRecipes);
                }
            });
        });

        return recipes;
    }

    /**
     * Generate Farm Module Buildings for BASIC ORGANIC RESOURCES
     */
    generateFarmModuleBuildings(planetType, componentAnalysis) {
        const recipes = [];

        // Find all BASIC ORGANIC RESOURCES for this planet
        const organicResources = this.recipes.filter(r => {
            if (!r) return false;
            const outputType = this.getRecipeOutputType(r);
            const planetTypes = r.PlanetTypes || r.planetTypes || '';
            return outputType === 'BASIC ORGANIC RESOURCE' &&
                planetTypes.includes(planetType);
        });

        organicResources.forEach(resource => {
            const resourceName = this.getRecipeOutputName(resource);
            const farmName = `${resourceName} Farm`;
            const resourceTier = parseInt(this.getRecipeOutputTier(resource)) || 1;
            const farmRecipes = this.generateProgressiveBuildingFamily(
                farmName, planetType, 'Farm', componentAnalysis,
                { targetResource: resource, resourceTier }
            );
            recipes.push(...farmRecipes);
        });

        return recipes;
    }

    /**
     * Generate a progressive building family (T1-T5) following build-up rules
     */
    generateProgressiveBuildingFamily(buildingName, planetType, category, componentAnalysis, config = {}) {
        const recipes = [];
        const planetPrefix = this.getPlanetPrefix(planetType);
        const baseName = this.toKebabCase(buildingName);

        // Recipe accumulator for build-up progression
        let cumulativeIngredients = [];

        for (let tier = 1; tier <= 5; tier++) {
            const recipe = this.generateSingleBuildingRecipe(
                buildingName, planetType, category, tier,
                componentAnalysis, config, cumulativeIngredients
            );

            if (recipe) {
                recipes.push(recipe);

                // Update cumulative ingredients for next tier
                cumulativeIngredients = this.extractIngredientsFromRecipe(recipe);
            }
        }

        return recipes;
    }

    /**
     * Generate a single building recipe for a specific tier
     */
    generateSingleBuildingRecipe(buildingName, planetType, category, tier, componentAnalysis, config, previousIngredients) {
        const planetPrefix = this.getPlanetPrefix(planetType);
        const buildingId = `${planetPrefix}-${this.toKebabCase(buildingName)}-t${tier}`;

        // Special case: Central Hub and Cultivation Hub T1 are auto-built (come with claim stake)
        if ((buildingName === 'Central Hub' || buildingName === 'Cultivation Hub') && tier === 1) {
            return {
                OutputID: buildingId,
                OutputName: buildingName,
                OutputType: 'BUILDING',
                OutputTier: tier,
                ConstructionTime: 0,
                PlanetTypes: planetType,
                Factions: 'MUD;ONI;USTUR',
                ResourceType: category,
                ProductionSteps: 0,
                Ingredient1: 'Auto-Built',
                Quantity1: 0
            };
        }

        // For infrastructure buildings, the resource tier should match the building tier
        // since they don't target a specific resource
        // For processing buildings, get the tier from the target resource
        let resourceTier = config.resourceTier || tier;

        // If this is a processing building with a target resource, use that resource's tier
        if (category === 'Processing' && config.targetResource) {
            const targetResourceTier = this.getRecipeOutputTier(config.targetResource);
            resourceTier = parseInt(targetResourceTier) || 1;
            console.log(`  📊 Processing ${this.getRecipeOutputName(config.targetResource)} (T${resourceTier}) with building T${tier}`);
        }

        // Get previous tier recipe for build-up progression
        const prevRecipe = previousIngredients.length > 0 ? {
            // Convert ingredient array back to recipe format
            Ingredient1: previousIngredients[0]?.name,
            Quantity1: previousIngredients[0]?.quantity,
            Ingredient2: previousIngredients[1]?.name,
            Quantity2: previousIngredients[1]?.quantity,
            Ingredient3: previousIngredients[2]?.name,
            Quantity3: previousIngredients[2]?.quantity,
            Ingredient4: previousIngredients[3]?.name,
            Quantity4: previousIngredients[3]?.quantity,
            Ingredient5: previousIngredients[4]?.name,
            Quantity5: previousIngredients[4]?.quantity,
            Ingredient6: previousIngredients[5]?.name,
            Quantity6: previousIngredients[5]?.quantity,
            Ingredient7: previousIngredients[6]?.name,
            Quantity7: previousIngredients[6]?.quantity
        } : null;

        // Select ingredients based on tier and rules
        const ingredients = this.selectBuildingIngredients(
            planetType,
            buildingName,
            tier,
            resourceTier,
            category,
            prevRecipe
        );

        // Calculate construction time
        const constructionTime = this.calculateConstructionTime(category, tier, resourceTier);

        const recipe = {
            OutputID: buildingId,
            OutputName: buildingName,
            OutputType: 'BUILDING',
            OutputTier: tier,
            ConstructionTime: constructionTime,
            PlanetTypes: planetType,
            Factions: 'MUD;ONI;USTUR',
            ResourceType: category,
            ProductionSteps: category === 'Extraction' || category === 'Farm' ? 0 : 1
        };

        // Add ingredients to recipe
        ingredients.forEach((ing, index) => {
            recipe[`Ingredient${index + 1}`] = ing.name;
            recipe[`Quantity${index + 1}`] = ing.quantity;
        });

        return recipe;
    }

    /**
     * Select bootstrap ingredients (raw materials) for T1 buildings
     */
    selectBootstrapIngredients(planetType, buildingType) {
        const ingredients = [];

        // Get native T1 resources (raw materials only)
        const nativeResources = this.recipes.filter(r => {
            const outputType = this.getRecipeOutputType(r);
            const outputTier = this.getRecipeOutputTier(r);
            const planetTypes = r.PlanetTypes || r.planetTypes || '';
            return (outputType === 'BASIC RESOURCE' ||
                outputType === 'BASIC ORGANIC RESOURCE' ||
                outputType === 'RESOURCE') &&
                outputTier <= 1 &&
                planetTypes.includes(planetType);
        });

        // Select 2-3 raw materials
        const selectedResources = nativeResources.slice(0, 3);
        selectedResources.forEach((resource, index) => {
            ingredients.push({
                name: this.getRecipeOutputName(resource),
                quantity: 25 - (index * 5) // 25, 20, 15
            });
        });

        // If we don't have enough raw materials, log a warning
        if (ingredients.length === 0) {
            console.warn(`⚠️ No T1 raw materials found for ${buildingType} on ${planetType}`);
        }

        return ingredients;
    }

    /**
     * Select T2 infrastructure ingredients (replace raw with processed)
     */
    selectT2InfrastructureIngredients(planetType, buildingType) {
        const ingredients = [];

        // Get T1-T2 components available for this planet
        const availableComponents = [];
        this.availableComponents.forEach((comp, id) => {
            const compTier = comp.OutputTier || comp.outputTier;
            const compPlanet = comp.PlanetTypes || comp.planetTypes || '';
            const compName = comp.OutputName || comp.outputName;

            // Check tier and planet compatibility
            if (compTier <= 2 && (compPlanet.includes(planetType) || compPlanet === '')) {
                // Filter out banned components
                if (!this.bannedBuildingComponents.has(compName)) {
                    const isPreferred = this.preferredBuildingComponents.has(compName);
                    availableComponents.push({
                        component: comp,
                        isPreferred: isPreferred
                    });
                }
            }
        });

        // Sort by preference
        availableComponents.sort((a, b) => {
            if (a.isPreferred && !b.isPreferred) return -1;
            if (!a.isPreferred && b.isPreferred) return 1;
            return 0;
        });

        // Select 3-4 components
        const selectedComponents = availableComponents.slice(0, 4);
        selectedComponents.forEach((item, index) => {
            ingredients.push({
                name: item.component.OutputName || item.component.outputName,
                quantity: 24 - (index * 3) // 24, 21, 18, 15
            });
        });

        // Track reuse
        this.existingComponentsReused += selectedComponents.length;

        return ingredients;
    }

    /**
 * Calculate appropriate tier range for ingredients
 */
    calculateIngredientTierRange(resourceTier, buildingTier, isInfrastructure = false) {
        let minTier = 1;
        let maxTier = 1;

        // Infrastructure buildings scale with building tier, not resource tier
        if (isInfrastructure) {
            // Infrastructure buildings can use components up to their building tier
            // They ramp up quickly since they don't have a resource tier
            minTier = Math.max(1, buildingTier - 1);
            maxTier = buildingTier;

            // T4-T5 infrastructure can use slightly higher tier components
            if (buildingTier >= 4) {
                maxTier = Math.min(5, buildingTier + 1);
            }

            return { min: minTier, max: maxTier };
        }

        // CRITICAL RULE: For T1-T3 resources, ingredients CANNOT exceed resource tier
        if (resourceTier <= 3) {
            // For T1-T3 resources: ingredients must be at or below resource tier
            minTier = 1;
            maxTier = resourceTier;

            // However, for T4-T5 buildings extracting T1-T3 resources, allow higher tier ingredients
            if (buildingTier >= 4) {
                maxTier = Math.min(5, resourceTier + 2);
                minTier = Math.max(1, resourceTier - 1);
            }
        }
        // For T4-T5 resources: more flexible tier ranges
        else if (resourceTier >= 4) {
            // T4 resources (tier 4)
            if (resourceTier === 4) {
                // T1-T3 buildings can use T2-T4 (resource tier minus 2 to resource tier)
                if (buildingTier <= 3) {
                    minTier = 2; // T4 - 2 = T2
                    maxTier = 4; // T4
                }
                // T4 building should primarily use T4
                else if (buildingTier === 4) {
                    minTier = 3; // Allow some T3
                    maxTier = 4; // Focus on T4
                }
                // T5 building can use T4-T5
                else if (buildingTier === 5) {
                    minTier = 4;
                    maxTier = 5;
                }
            }
            // T5 resources (tier 5)
            else if (resourceTier === 5) {
                // T1-T3 buildings can use T3-T5 (resource tier minus 2 to resource tier)
                if (buildingTier <= 3) {
                    minTier = 3; // T5 - 2 = T3
                    maxTier = 5; // T5
                }
                // T4 building should use T4-T5
                else if (buildingTier === 4) {
                    minTier = 4;
                    maxTier = 5;
                }
                // T5 building should primarily use T5
                else if (buildingTier === 5) {
                    minTier = 4; // Allow some T4
                    maxTier = 5; // Focus on T5
                }
            }
        }

        return { min: minTier, max: maxTier };
    }

    /**
     * Calculate ingredient quantity based on tier and position
     */
    calculateIngredientQuantity(ingredientTier, buildingTier, position) {
        // Base quantity scales with building tier
        const baseQuantity = 20 + (buildingTier * 5);

        // Reduce quantity for each subsequent ingredient
        const positionReduction = position * 3;

        // Higher tier ingredients used in smaller quantities
        const tierReduction = (ingredientTier - 1) * 2;

        return Math.max(5, baseQuantity - positionReduction - tierReduction);
    }

    /**
     * Select appropriate building ingredients
     */
    selectBuildingIngredients(planetType, buildingType, buildingTier, resourceTier, category, prevTierRecipe = null) {
        const ingredients = [];

        // Infrastructure buildings have special rules
        if (category === 'Infrastructure') {
            // Check if this building has bootstrap enabled (all except Central Hub and Cultivation Hub)
            const buildingConfig = this.buildingCategories.Infrastructure[buildingType];

            if (buildingTier === 1 && buildingConfig?.bootstrap === true) {
                // T1 infrastructure with bootstrap uses raw materials
                // This includes: Processing Hub, Extraction Hub, Storage Hub, Farm Hub, Power Plant, Crew Quarters
                return this.selectBootstrapIngredients(planetType, buildingType);
            } else if (buildingTier === 2 && prevTierRecipe && buildingConfig?.bootstrap === true) {
                // T2 infrastructure with bootstrap REPLACES raw materials with processed components
                return this.selectT2InfrastructureIngredients(planetType, buildingType);
            }
        }

        // Processing buildings can use raw materials at T1
        if (category === 'Processing' && buildingTier === 1) {
            return this.selectBootstrapIngredients(planetType, buildingType);
        }

        // Determine ingredient tier range
        const isInfrastructure = category === 'Infrastructure';
        const tierRange = this.calculateIngredientTierRange(resourceTier, buildingTier, isInfrastructure);

        // Build on previous tier recipe if available
        if (prevTierRecipe) {
            // Maintain and scale existing ingredients
            for (let i = 1; i <= 8; i++) {
                const ingredientName = prevTierRecipe[`Ingredient${i}`];
                const prevQuantity = prevTierRecipe[`Quantity${i}`];

                if (ingredientName && prevQuantity) {
                    ingredients.push({
                        name: ingredientName,
                        quantity: Math.ceil(prevQuantity * 1.2) // 20% increase
                    });
                }
            }
        }

        // Analyze existing components for compatibility
        const componentAnalysis = this.analyzeExistingComponents(planetType);

        // Determine how many new ingredients to add
        const currentIngredientCount = ingredients.length;
        const targetIngredientCount = Math.min(
            2 + buildingTier,
            7 // Max 7 ingredients
        );
        const newIngredientsNeeded = targetIngredientCount - currentIngredientCount;

        if (newIngredientsNeeded > 0) {
            // First check available components (includes both existing and newly created)
            const availableInTierRange = [];

            this.availableComponents.forEach((comp, id) => {
                const compTier = comp.OutputTier || comp.outputTier;
                const compPlanet = comp.PlanetTypes || comp.planetTypes || '';

                // Check if component is in tier range and compatible with planet
                if (compTier >= tierRange.min && compTier <= tierRange.max) {
                    // Check if it's planet-specific or universal
                    if (compPlanet.includes(planetType) || compPlanet === '') {
                        // Check if not already used
                        const compName = comp.OutputName || comp.outputName;
                        if (!ingredients.some(ing => ing.name === compName)) {
                            // Check if banned for buildings - skip if banned
                            if (!this.bannedBuildingComponents.has(compName)) {
                                // Check theme suitability
                                const nameLower = (compName || '').toLowerCase();
                                const isUnsuitable = this.unsuitableThemes.some(theme =>
                                    nameLower.includes(theme)
                                );

                                if (!isUnsuitable) {
                                    // Prefer components from the preferred list
                                    const isPreferred = this.preferredBuildingComponents.has(compName);
                                    availableInTierRange.push({
                                        component: comp,
                                        isPreferred: isPreferred
                                    });
                                }
                            }
                        }
                    }
                }
            });

            // Sort available components - prefer the preferred list
            availableInTierRange.sort((a, b) => {
                if (a.isPreferred && !b.isPreferred) return -1;
                if (!a.isPreferred && b.isPreferred) return 1;
                return 0;
            });

            // Select from available components first
            const selectedFromAvailable = availableInTierRange
                .slice(0, newIngredientsNeeded)
                .map(item => ({
                    name: item.component.OutputName || item.component.outputName,
                    tier: item.component.OutputTier || item.component.outputTier,
                    isNew: false
                }));

            // Track reuse
            this.existingComponentsReused += selectedFromAvailable.length;

            // If we still need more components, create new ones
            const remainingNeeded = newIngredientsNeeded - selectedFromAvailable.length;

            if (remainingNeeded > 0) {
                console.log(`  Need to create ${remainingNeeded} new components for ${buildingType} T${buildingTier}`);

                // Create new planet-specific components
                const newComponents = this.createNewPlanetComponents(
                    planetType,
                    tierRange,
                    category,
                    remainingNeeded
                );

                // Add new components as ingredients
                newComponents.forEach(comp => {
                    if (!ingredients.some(ing => ing.name === comp.name)) {
                        const baseQuantity = this.calculateIngredientQuantity(
                            comp.tier,
                            buildingTier,
                            ingredients.length
                        );

                        ingredients.push({
                            name: comp.name,
                            quantity: baseQuantity
                        });
                    }
                });
            } else {
                // Add selected existing components as ingredients
                selectedFromAvailable.forEach(comp => {
                    const baseQuantity = this.calculateIngredientQuantity(
                        comp.tier,
                        buildingTier,
                        ingredients.length
                    );

                    ingredients.push({
                        name: comp.name,
                        quantity: baseQuantity
                    });
                });
            }
        }

        return ingredients;
    }

    /**
     * Analyze why we couldn't find enough suitable components
     */
    analyzeComponentShortage(planetType, tierRange, needed, componentAnalysis) {
        const [minTier, maxTier] = tierRange;
        console.log(`⚠️ Component shortage analysis for ${planetType}:`);
        console.log(`  Need ${needed} more components in tier range ${minTier}-${maxTier}`);

        // Check unsuitable components that could have been used
        if (componentAnalysis.unsuitable && componentAnalysis.unsuitable.length > 0) {
            const unsuitableInRange = componentAnalysis.unsuitable.filter(comp => {
                const tier = parseInt(this.getRecipeOutputTier(comp)) || 1;
                return tier >= minTier && tier <= maxTier;
            });

            if (unsuitableInRange.length > 0) {
                console.log(`  Found ${unsuitableInRange.length} native-buildable but thematically unsuitable components:`);
                unsuitableInRange.slice(0, 5).forEach(comp => {
                    const name = this.getRecipeOutputName(comp);
                    console.log(`    - ${name} (weapon/ship component)`);
                });
            }
        }

        // Check what makes other components incompatible
        const sampledIncompatible = componentAnalysis.incompatible
            .filter(comp => {
                const tier = parseInt(this.getRecipeOutputTier(comp)) || 1;
                return tier >= minTier && tier <= maxTier;
            })
            .slice(0, 5);

        if (sampledIncompatible.length > 0) {
            console.log(`  Sample of incompatible components in tier range:`);
            sampledIncompatible.forEach(comp => {
                const name = this.getRecipeOutputName(comp);
                const ingredients = [];
                for (let i = 1; i <= 8; i++) {
                    const ing = this.getRecipeIngredient(comp, i);
                    if (ing) ingredients.push(ing);
                }
                console.log(`    - ${name}: requires [${ingredients.join(', ')}]`);
            });
        }
    }

    /**
     * Select raw materials for bootstrap buildings
     */
    selectRawMaterials(planetType, category, count) {
        const nativeResources = this.planetNativeResources[planetType];
        if (!nativeResources || !nativeResources.t1) {
            console.warn(`No T1 resources defined for ${planetType}`);
            return [];
        }

        const materials = [];

        // Prioritize T1 resources
        const t1Resources = (nativeResources.t1 || []).slice(0, count);

        t1Resources.forEach((resourceId, index) => {
            if (!resourceId) return;

            const resource = this.recipes.find(r => {
                if (!r) return false;
                const outputName = this.getRecipeOutputName(r);
                const outputId = this.getRecipeOutputID(r);
                return this.toKebabCase(outputName) === resourceId ||
                    this.toKebabCase(outputId) === resourceId;
            });

            if (resource) {
                const resourceName = this.getRecipeOutputName(resource);
                materials.push({
                    name: resourceName,
                    quantity: 25 - (index * 5) // Decreasing quantities
                });
            }
        });

        return materials;
    }

    /**
     * Select compatible components from analysis
     */
    selectCompatibleComponents(componentAnalysis, tierRange, count, exclude = []) {
        const [minTier, maxTier] = tierRange;
        const selected = [];
        const excludeNames = new Set(exclude);
        const excludeIds = new Set(exclude.map(name => this.toKebabCase(name)));

        // Track which components we've already selected to avoid duplicates
        const alreadySelected = new Set();

        // Try to select components from each tier in the range
        for (let tier = minTier; tier <= maxTier && selected.length < count; tier++) {
            const tierComponents = componentAnalysis.byTier[tier] || [];

            console.log(`  Looking at T${tier}: ${tierComponents.length} components available`);

            for (const component of tierComponents) {
                if (selected.length >= count) break;

                const name = this.getRecipeOutputName(component);
                const id = this.getRecipeOutputID(component);

                // Skip if already excluded or already selected
                if (excludeNames.has(name) || excludeIds.has(id) || alreadySelected.has(id)) {
                    continue;
                }

                selected.push({
                    name: name,
                    tier: tier,
                    isNew: false
                });

                alreadySelected.add(id);
                this.existingComponentsReused++;
            }
        }

        console.log(`  Selected ${selected.length} components from existing library`);

        return selected;
    }

    /**
     * Create a recipe for a new planet-specific component
     */
    createComponentRecipe(planetType, componentName, componentTier) {
        const componentId = `${planetType.toLowerCase()}-${this.toKebabCase(componentName)}`;

        // Get native resources for this planet
        const nativeResources = this.recipes.filter(r => {
            const outputType = this.getRecipeOutputType(r);
            const planetTypes = r.PlanetTypes || r.planetTypes || '';
            return outputType === 'RESOURCE' &&
                planetTypes.includes(planetType);
        });

        // Group native resources by tier
        const resourcesByTier = {};
        nativeResources.forEach(resource => {
            const tier = this.getRecipeOutputTier(resource);
            if (!resourcesByTier[tier]) {
                resourcesByTier[tier] = [];
            }
            resourcesByTier[tier].push(resource);
        });

        // Select appropriate ingredients based on component tier
        const ingredients = [];
        let ingredientCount = 0;

        // Determine ingredient tier range based on component tier
        let minTier = Math.max(1, componentTier - 1);
        let maxTier = Math.min(5, componentTier);

        // For T4+ components, use higher tier ingredients
        if (componentTier >= 4) {
            minTier = Math.max(1, componentTier - 2);
            maxTier = componentTier;
        }

        // Select primary ingredient (prefer same tier or one below)
        for (let tier = componentTier; tier >= minTier && ingredientCount < 1; tier--) {
            if (resourcesByTier[tier] && resourcesByTier[tier].length > 0) {
                const primaryResource = resourcesByTier[tier][ingredientCount % resourcesByTier[tier].length];
                const name = this.getRecipeOutputName(primaryResource);
                if (name) {
                    ingredients.push({
                        name: name,
                        quantity: 25 + (componentTier * 5) // Scale with tier
                    });
                    ingredientCount++;
                }
            }
        }

        // Add secondary ingredients for higher tier components
        if (componentTier >= 2 && ingredientCount < 3) {
            for (let tier = maxTier; tier >= minTier && ingredientCount < 3; tier--) {
                if (resourcesByTier[tier] && resourcesByTier[tier].length > 0) {
                    const resources = resourcesByTier[tier];
                    for (let i = 0; i < resources.length && ingredientCount < 3; i++) {
                        const resource = resources[i];
                        const name = this.getRecipeOutputName(resource);
                        // Don't duplicate ingredients
                        if (name && !ingredients.some(ing => ing.name === name)) {
                            ingredients.push({
                                name: name,
                                quantity: 20 - (ingredientCount * 3) // Decreasing quantities
                            });
                            ingredientCount++;
                        }
                    }
                }
            }
        }

        // If we still don't have enough ingredients, add from any available tier
        if (ingredients.length === 0) {
            console.warn(`⚠️ No native resources found for ${componentName} T${componentTier} on ${planetType}`);
            // Fallback: use any available native resources
            for (let tier = 1; tier <= 5 && ingredientCount < 2; tier++) {
                if (resourcesByTier[tier] && resourcesByTier[tier].length > 0) {
                    const resource = resourcesByTier[tier][0];
                    const name = this.getRecipeOutputName(resource);
                    if (name && !ingredients.some(ing => ing.name === name)) {
                        ingredients.push({
                            name: name,
                            quantity: 30 - (ingredientCount * 5)
                        });
                        ingredientCount++;
                    }
                }
            }
        }

        // Create the component recipe
        const recipe = {
            OutputID: componentId,
            OutputName: componentName,
            OutputType: 'COMPONENT',
            OutputTier: componentTier,
            ConstructionTime: 30 + (componentTier - 1) * 15, // 30, 45, 60, 75, 90
            PlanetTypes: planetType,
            Factions: 'MUD;ONI;USTUR',
            ProductionSteps: 1
        };

        // Add ingredients to recipe
        ingredients.forEach((ing, index) => {
            recipe[`Ingredient${index + 1}`] = ing.name;
            recipe[`Quantity${index + 1}`] = ing.quantity;
        });

        console.log(`  Created new component: ${componentName} (T${componentTier}) with ${ingredients.length} ingredients`);

        return recipe;
    }

    /**
     * Create new planet-specific components when needed
     */
    createNewPlanetComponents(planetType, tierRange, category, count = 1) {
        const components = [];
        const planetPrefix = planetType.toLowerCase();

        // Define component names based on category and planet
        const categoryNames = {
            'Infrastructure': {
                'oceanic': ['Bio', 'Aqua', 'Marine', 'Hydro', 'Tidal'],
                'volcanic': ['Magma', 'Thermal', 'Pyroclastic', 'Igneous', 'Lava'],
                'terrestrial': ['Terra', 'Geo', 'Land', 'Ground', 'Surface'],
                'barren': ['Desert', 'Arid', 'Dust', 'Sand', 'Rocky'],
                'dark': ['Shadow', 'Umbral', 'Void', 'Eclipse', 'Nocturnal'],
                'frozen': ['Cryo', 'Frost', 'Ice', 'Glacial', 'Arctic'],
                'toxic': ['Acid', 'Corrosive', 'Hazard', 'Toxic', 'Noxious'],
                'gas-giant': ['Gas', 'Atmospheric', 'Storm', 'Pressure', 'Cloud'],
                'ice-giant': ['Frozen', 'Crystal', 'Polar', 'Subzero', 'Permafrost'],
                'asteroid': ['Asteroid', 'Space', 'Void', 'Zero-G', 'Microgravity']
            },
            'Processing': {
                'oceanic': ['Bio', 'Coral', 'Kelp', 'Algae', 'Marine'],
                'volcanic': ['Lava', 'Magma', 'Obsidian', 'Basalt', 'Pyroclastic'],
                'terrestrial': ['Organic', 'Carbon', 'Silicon', 'Mineral', 'Crystal'],
                'barren': ['Metal', 'Ore', 'Mineral', 'Crystal', 'Composite'],
                'dark': ['Shadow', 'Dark', 'Void', 'Null', 'Abyss'],
                'frozen': ['Ice', 'Cryo', 'Frozen', 'Crystal', 'Permafrost'],
                'toxic': ['Chemical', 'Acid', 'Reactive', 'Caustic', 'Volatile'],
                'gas-giant': ['Gas', 'Vapor', 'Condensate', 'Plasma', 'Ion'],
                'ice-giant': ['Methane', 'Ammonia', 'Nitrogen', 'Helium', 'Xenon'],
                'asteroid': ['Regolith', 'Mineral', 'Metal', 'Rare', 'Exotic']
            },
            'Extraction': {
                'oceanic': ['Deep Sea', 'Abyssal', 'Trench', 'Reef', 'Current'],
                'volcanic': ['Core', 'Vent', 'Geyser', 'Fissure', 'Chamber'],
                'terrestrial': ['Surface', 'Underground', 'Cave', 'Mine', 'Quarry'],
                'barren': ['Surface', 'Subsurface', 'Deep', 'Core', 'Crust'],
                'dark': ['Void', 'Null', 'Dark', 'Shadow', 'Abyss'],
                'frozen': ['Ice', 'Glacier', 'Permafrost', 'Tundra', 'Polar'],
                'toxic': ['Hazard', 'Contaminated', 'Polluted', 'Irradiated', 'Toxic'],
                'gas-giant': ['Cloud', 'Storm', 'Vortex', 'Jet', 'Layer'],
                'ice-giant': ['Core', 'Mantle', 'Cloud', 'Storm', 'Pressure'],
                'asteroid': ['Surface', 'Core', 'Pocket', 'Vein', 'Deposit']
            },
            'Farm': {
                'oceanic': ['Kelp', 'Algae', 'Coral', 'Plankton', 'Seaweed'],
                'volcanic': ['Thermophile', 'Extremophile', 'Vent', 'Sulfur', 'Ash'],
                'terrestrial': ['Crop', 'Plant', 'Tree', 'Vine', 'Root'],
                'barren': ['Cactus', 'Succulent', 'Hardy', 'Desert', 'Drought'],
                'dark': ['Fungal', 'Mushroom', 'Mycelium', 'Spore', 'Bioluminescent'],
                'frozen': ['Arctic', 'Tundra', 'Lichen', 'Moss', 'Hardy'],
                'toxic': ['Resistant', 'Adapted', 'Mutant', 'Modified', 'Engineered'],
                'gas-giant': ['Floating', 'Aerial', 'Cloud', 'Atmospheric', 'Suspended'],
                'ice-giant': ['Crystal', 'Frozen', 'Preserved', 'Cryogenic', 'Stasis'],
                'asteroid': ['Hydroponic', 'Artificial', 'Sealed', 'Pressurized', 'Contained']
            }
        };

        const typeNames = this.componentNameGenerators[category] || ['Component'];
        const prefixNames = (categoryNames[category] && categoryNames[category][planetPrefix]) ||
            ['Generic'];

        console.log(`  Creating ${count} new ${category} components for ${planetType} in tier range ${tierRange.min}-${tierRange.max}`);

        for (let i = 0; i < count; i++) {
            // Select tier for this component - prefer lower tiers for better availability
            // For single tier range, use that tier
            let tier = tierRange.min;
            if (tierRange.max > tierRange.min) {
                // Distribute across available tiers, but bias toward lower tiers
                if (i === 0) {
                    tier = tierRange.min; // First component at min tier
                } else if (i === count - 1 && count > 1) {
                    tier = Math.min(tierRange.max, tierRange.min + 1); // Last component at min+1 or max
                } else {
                    // Middle components distributed
                    tier = Math.min(tierRange.max, tierRange.min + Math.floor(i / 2));
                }
            }

            // Check if we already have a component for this planet/tier/category combo
            const existingKey = `${planetPrefix}-${category.toLowerCase()}-t${tier}`;
            let existingComponent = null;

            // Check in global new components first
            this.globalNewComponents.forEach((comp, key) => {
                if (key.startsWith(`${planetType}-${tier}-${category}`)) {
                    existingComponent = comp;
                }
            });

            if (existingComponent) {
                console.log(`  Reusing existing new component: ${existingComponent.OutputName} for ${category} T${tier}`);
                components.push({
                    name: existingComponent.OutputName,
                    tier: existingComponent.OutputTier,
                    isNew: false,
                    existingComponent: existingComponent
                });
                continue;
            }

            // Generate unique component name
            const prefixIndex = i % prefixNames.length;
            const typeIndex = i % typeNames.length;
            const baseName = `${prefixNames[prefixIndex]} ${typeNames[typeIndex]}`;
            const componentName = baseName.trim();
            const componentId = `${planetPrefix}-${this.toKebabCase(componentName)}`;

            console.log(`  Creating new component: ${componentName} (T${tier})`);

            const componentRecipe = this.createComponentRecipe(
                planetType,
                componentName,
                tier
            );

            // Add to global tracking with unique key
            const trackingKey = `${planetType}-${tier}-${category}-${i}`;
            this.globalNewComponents.set(trackingKey, componentRecipe);

            // Add to available components for future reuse
            this.availableComponents.set(componentId, componentRecipe);

            components.push({
                name: componentName,
                tier: tier,
                isNew: true,
                recipe: componentRecipe
            });
        }

        return components;
    }

    /**
     * Generate a contextual component name for buildings
     */
    generateComponentName(planetType, category, tier, index) {
        // Use more building-appropriate names
        const buildingComponents = {
            'Infrastructure': {
                'Oceanic Planet': ['Bio Framework', 'Hydro Module', 'Marine Composite', 'Aquatic Core'],
                'Volcanic Planet': ['Thermal Framework', 'Magma Composite', 'Heat-Resistant Module', 'Igneous Core'],
                'Terrestrial Planet': ['Terra Framework', 'Bio Composite', 'Carbon Module', 'Organic Core'],
                'Barren Planet': ['Metal Framework', 'Mineral Composite', 'Crystal Module', 'Alloy Core'],
                'Dark Planet': ['Shadow Framework', 'Umbral Composite', 'Void Module', 'Dark Core'],
                'Ice Giant': ['Cryo Framework', 'Frozen Composite', 'Glacial Module', 'Arctic Core'],
                'Gas Giant': ['Gas Composite', 'Atmospheric Module', 'Pressure Core', 'Vapor Framework'],
                'System Asteroid Belt': ['Asteroid Framework', 'Space Composite', 'Zero-G Module', 'Orbital Core']
            },
            'Processing': {
                'Oceanic Planet': ['Bio Processor', 'Hydro Matrix', 'Marine Assembly', 'Aquatic Unit'],
                'Volcanic Planet': ['Thermal Processor', 'Magma Matrix', 'Heat Assembly', 'Igneous Unit'],
                'Terrestrial Planet': ['Terra Processor', 'Bio Matrix', 'Carbon Assembly', 'Organic Unit'],
                'Barren Planet': ['Metal Processor', 'Mineral Matrix', 'Crystal Assembly', 'Alloy Unit'],
                'Dark Planet': ['Shadow Processor', 'Umbral Matrix', 'Void Assembly', 'Dark Unit'],
                'Ice Giant': ['Cryo Processor', 'Frozen Matrix', 'Glacial Assembly', 'Arctic Unit'],
                'Gas Giant': ['Gas Processor', 'Atmospheric Matrix', 'Pressure Assembly', 'Vapor Unit'],
                'System Asteroid Belt': ['Asteroid Processor', 'Space Matrix', 'Zero-G Assembly', 'Orbital Unit']
            },
            'Extraction': {
                'Oceanic Planet': ['Bio Drill', 'Hydro Extractor', 'Marine Harvester', 'Aquatic Collector'],
                'Volcanic Planet': ['Thermal Drill', 'Magma Extractor', 'Heat Harvester', 'Igneous Collector'],
                'Terrestrial Planet': ['Terra Drill', 'Bio Extractor', 'Carbon Harvester', 'Organic Collector'],
                'Barren Planet': ['Metal Drill', 'Mineral Extractor', 'Crystal Harvester', 'Alloy Collector'],
                'Dark Planet': ['Shadow Drill', 'Umbral Extractor', 'Void Harvester', 'Dark Collector'],
                'Ice Giant': ['Cryo Drill', 'Frozen Extractor', 'Glacial Harvester', 'Arctic Collector'],
                'Gas Giant': ['Gas Drill', 'Atmospheric Extractor', 'Pressure Harvester', 'Vapor Collector'],
                'System Asteroid Belt': ['Asteroid Drill', 'Space Extractor', 'Zero-G Harvester', 'Orbital Collector']
            },
            'Farm': {
                'Oceanic Planet': ['Bio Growth Matrix', 'Marine Cultivator', 'Aquatic Hydroponics', 'Ocean Chamber'],
                'Volcanic Planet': ['Thermal Growth Matrix', 'Magma Cultivator', 'Heat Hydroponics', 'Lava Chamber'],
                'Terrestrial Planet': ['Terra Growth Matrix', 'Bio Cultivator', 'Organic Hydroponics', 'Earth Chamber'],
                'Barren Planet': ['Desert Growth Matrix', 'Arid Cultivator', 'Dry Hydroponics', 'Sand Chamber'],
                'Dark Planet': ['Shadow Growth Matrix', 'Umbral Cultivator', 'Void Hydroponics', 'Dark Chamber'],
                'Ice Giant': ['Cryo Growth Matrix', 'Frozen Cultivator', 'Ice Hydroponics', 'Frost Chamber'],
                'Gas Giant': ['Gas Growth Matrix', 'Cloud Cultivator', 'Vapor Hydroponics', 'Mist Chamber'],
                'System Asteroid Belt': ['Space Growth Matrix', 'Zero-G Cultivator', 'Orbital Hydroponics', 'Vacuum Chamber']
            }
        };

        const categoryNames = buildingComponents[category] || buildingComponents['Infrastructure'];
        const planetNames = categoryNames[planetType] || categoryNames['Terrestrial Planet'];

        return planetNames[index % planetNames.length];
    }

    /**
     * Get component tier range based on resource tier and building tier
     */
    getComponentTierRange(resourceTier, buildingTier) {
        // Implement the ±2 tier range rule with minimum tier constraints
        let minTier = Math.max(1, resourceTier - 2);
        let maxTier = Math.min(5, resourceTier + 2);

        // Apply minimum tier rules for high-tier resources
        if (resourceTier >= 4) minTier = Math.max(2, minTier);
        if (resourceTier >= 5) minTier = Math.max(3, minTier);

        // Adjust range based on building tier
        if (buildingTier >= 3 && resourceTier >= 4) {
            minTier = Math.max(resourceTier - 1, minTier);
        }

        return [minTier, maxTier];
    }

    /**
     * Calculate construction time based on category and tier
     */
    calculateConstructionTime(category, tier, resourceTier = 1) {
        const patterns = {
            'Infrastructure': [90, 135, 180, 270, 360],
            'Processing': [60, 45, 30, 25, 20],
            'Extraction': {
                1: [90, 75, 60, 50, 40],
                2: [90, 75, 60, 50, 40],
                3: [180, 150, 120, 100, 80],
                4: [300, 250, 200, 160, 120],
                5: [480, 400, 320, 250, 200]
            },
            'Farm': [90, 75, 60, 50, 40]
        };

        if (category === 'Extraction') {
            const tierPattern = patterns[category][resourceTier] || patterns[category][1];
            return tierPattern[tier - 1];
        }

        const pattern = patterns[category] || patterns['Infrastructure'];
        return pattern[tier - 1];
    }

    /**
     * Get base quantity for an ingredient based on tiers
     */
    getBaseQuantity(componentTier, buildingTier) {
        const base = 20 - (componentTier - 1) * 3;
        const multiplier = 1 + (buildingTier - 1) * 0.2;
        return Math.ceil(base * multiplier);
    }

    /**
     * Extract ingredients from a recipe for build-up progression
     */
    extractIngredientsFromRecipe(recipe) {
        const ingredients = [];

        for (let i = 1; i <= 8; i++) {
            if (recipe[`Ingredient${i}`] && recipe[`Ingredient${i}`] !== 'Auto-Built') {
                ingredients.push({
                    name: recipe[`Ingredient${i}`],
                    quantity: recipe[`Quantity${i}`]
                });
            }
        }

        return ingredients;
    }

    /**
     * Get basic processors needed for a planet
     */
    getBasicProcessorsNeeded(planetType, componentAnalysis) {
        const processors = [];
        const nativeResources = this.planetNativeResources[planetType];

        // Identify ores and basic resources that need processing
        const ores = [...(nativeResources.t1 || []), ...(nativeResources.t2 || [])]
            .filter(r => r && (r.includes('-ore') || r.includes('chromite')));

        ores.forEach(ore => {
            const resource = this.recipes.find(r => {
                if (!r) return false;
                const outputName = this.getRecipeOutputName(r);
                const outputId = this.getRecipeOutputID(r);
                return this.toKebabCase(outputName) === ore ||
                    this.toKebabCase(outputId) === ore;
            });

            if (resource) {
                const resourceName = this.getRecipeOutputName(resource);
                const processorName = resourceName.replace(' Ore', '').replace('Abyssal ', '') + ' Processor';
                processors.push({
                    name: processorName,
                    resource: resource
                });
            }
        });

        return processors;
    }

    /**
     * Get advanced processors needed for a planet
     */
    getAdvancedProcessorsNeeded(planetType, componentAnalysis) {
        const processors = [];

        // Add processors for each new component created
        this.globalNewComponents.forEach(comp => {
            if (comp.PlanetTypes === planetType) {
                processors.push({
                    name: `${comp.OutputName} Processor`,
                    resource: comp
                });
            }
        });

        return processors;
    }

    /**
     * Get planet prefix for IDs
     */
    getPlanetPrefix(planetType) {
        return {
            'Oceanic Planet': 'oceanic',
            'Volcanic Planet': 'volcanic',
            'Terrestrial Planet': 'terrestrial',
            'Barren Planet': 'barren',
            'Dark Planet': 'dark',
            'Ice Giant': 'ice-giant',
            'Gas Giant': 'gas-giant',
            'System Asteroid Belt': 'asteroid'
        }[planetType] || 'unknown';
    }

    /**
     * Convert string to kebab case
     */
    toKebabCase(str) {
        if (!str) return '';
        return str
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Generate analysis report
     */
    generateAnalysisReport() {
        const report = {
            totalBuildingsGenerated: 0,
            newComponentsCreated: this.globalNewComponents.size,
            existingComponentsReused: this.existingComponentsReused,
            reuseRate: 0,
            componentsByPlanet: {},
            buildingsByCategory: {}
        };

        // Calculate reuse rate
        const totalComponents = report.newComponentsCreated + report.existingComponentsReused;
        if (totalComponents > 0) {
            report.reuseRate = (report.existingComponentsReused / totalComponents * 100).toFixed(1) + '%';
        }

        return report;
    }

    /**
     * Export new components to CSV format
     */
    exportNewComponentsToCSV() {
        // Deduplicate the new components list
        const uniqueComponents = [];
        const seen = new Set();

        this.globalNewComponents.forEach(comp => {
            // Create a unique key for this component
            const key = `${comp.OutputID}-${comp.OutputTier}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueComponents.push(comp);
            }
        });

        // Sort by planet and tier for better organization
        uniqueComponents.sort((a, b) => {
            if (a.PlanetTypes !== b.PlanetTypes) {
                return a.PlanetTypes.localeCompare(b.PlanetTypes);
            }
            return (a.OutputTier || 0) - (b.OutputTier || 0);
        });

        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ProductionSteps',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2',
            'Ingredient3', 'Quantity3', 'Ingredient4', 'Quantity4',
            'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8'
        ];

        const rows = [headers.join('\t')];

        uniqueComponents.forEach(component => {
            const row = headers.map(header => {
                const value = component[header];
                return value !== undefined && value !== null ? value : '';
            });
            rows.push(row.join('\t'));
        });

        return rows.join('\n');
    }

    /**
     * Main generation method - generates all building recipes for a planet
     */
    generatePlanetBuildingRecipes(planetType) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🌍 Generating recipes for ${planetType}`);
        console.log(`${'='.repeat(60)}`);

        // Track stats BEFORE processing this planet (for delta calculation)
        const planetStats = {
            newComponentsCreatedCount: this.globalNewComponents.size,
            existingComponentsReusedCount: this.existingComponentsReused
        };

        const buildingRecipes = [];
        const nativeResources = this.planetNativeResources[planetType];

        if (!nativeResources) {
            console.error(`Unknown planet type: ${planetType}`);
            return { recipes: [], newComponents: [] };
        }

        // Phase 1: Analyze existing components for reuse
        const componentAnalysis = this.analyzeExistingComponents(planetType);

        // Phase 2: Generate Infrastructure Buildings
        const infrastructureRecipes = this.generateInfrastructureBuildings(
            planetType, componentAnalysis
        );
        buildingRecipes.push(...infrastructureRecipes);

        // Phase 3: Generate Processor Buildings
        const processorRecipes = this.generateProcessorBuildings(
            planetType, componentAnalysis
        );
        buildingRecipes.push(...processorRecipes);

        // Phase 4: Generate Extractor Buildings
        const extractorRecipes = this.generateExtractorBuildings(
            planetType, componentAnalysis
        );
        buildingRecipes.push(...extractorRecipes);

        // Phase 5: Generate Farm Module Buildings for BASIC ORGANIC RESOURCES
        const farmRecipes = this.generateFarmModuleBuildings(
            planetType, componentAnalysis
        );
        buildingRecipes.push(...farmRecipes);

        console.log(`✨ Generated ${buildingRecipes.length} building recipes for ${planetType}`);
        console.log(`  Reused ${this.existingComponentsReused} existing components`);
        console.log(`  Created ${this.globalNewComponents.size} new components`);

        // Calculate stats for this planet
        const newComponentsForPlanet = this.globalNewComponents.size - planetStats.newComponentsCreatedCount;
        const reusedForPlanet = this.existingComponentsReused - planetStats.existingComponentsReusedCount;

        console.log(`\n📊 ${planetType} Generation Complete:`);
        console.log(`  Buildings created: ${buildingRecipes.length}`);
        console.log(`  New components created: ${newComponentsForPlanet}`);
        console.log(`  Existing components reused: ${reusedForPlanet}`);

        const totalComponents = newComponentsForPlanet + reusedForPlanet;
        const reuseRate = totalComponents > 0
            ? Math.round((reusedForPlanet / totalComponents) * 100)
            : 0;
        console.log(`  Component reuse rate: ${reuseRate}%`);

        return buildingRecipes;
    }

    /**
     * Get the output type of a recipe, handling both formats
     */
    getRecipeOutputType(recipe) {
        return recipe.OutputType || recipe.outputType || '';
    }

    /**
     * Get the output name of a recipe, handling both formats
     */
    getRecipeOutputName(recipe) {
        return recipe.OutputName || recipe.outputName || '';
    }

    /**
     * Get the output ID of a recipe, handling both formats
     */
    getRecipeOutputID(recipe) {
        return recipe.OutputID || recipe.id || '';
    }

    /**
     * Get the output tier of a recipe, handling both formats
     */
    getRecipeOutputTier(recipe) {
        return recipe.OutputTier || recipe.outputTier || 1;
    }

    /**
     * Get an ingredient from a recipe, handling both formats
     */
    getRecipeIngredient(recipe, index) {
        // First try the uppercase format
        if (recipe[`Ingredient${index}`]) {
            return recipe[`Ingredient${index}`];
        }
        // Then try the ingredients array format
        if (recipe.ingredients && recipe.ingredients[index - 1]) {
            return recipe.ingredients[index - 1].name;
        }
        return null;
    }

    /**
     * Get an ingredient quantity from a recipe, handling both formats
     */
    getRecipeIngredientQuantity(recipe, index) {
        // First try the uppercase format
        if (recipe[`Quantity${index}`]) {
            return parseInt(recipe[`Quantity${index}`]) || 0;
        }
        // Then try the ingredients array format
        if (recipe.ingredients && recipe.ingredients[index - 1]) {
            return recipe.ingredients[index - 1].quantity || 0;
        }
        return 0;
    }
} 