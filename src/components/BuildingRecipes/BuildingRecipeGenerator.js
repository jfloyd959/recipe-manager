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
            'Countermeasure System',

            // User-requested banned components (production steps violations)
            'Electronics',
            'Dispersal Mechanism',
            'Dispersal Gas Mix',
            'Dimensional Stabilizer',
            'Command Module',
            'Energy Focuser'
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
            'Framework',
            'Structural Shell',
            'Structural Joint',
            'Load Bearing Beams',
            'Foundation Anchor',

            // Basic processed materials (refined versions)
            'Aluminum',
            'Boron',
            'Chromite',
            'Chromite Ingot',
            'Cobalt',
            'Copper',
            'Copper Wire',
            'Iron',
            'Lithium',
            'Manganese',
            'Tin',
            'Zinc',
            'Silver',
            'Gold',
            'Titanium',
            'Germanium Ingot',
            'Platinum',
            'Tungsten',
            'Heavy Alloy',
            'Steel',

            // Building systems
            'Utility Core',
            'Adaptive Utility Core',
            'Assembly Control Matrix',
            'Climate Controller',
            'Command Module',
            'Coupling Interface',
            'Boron Composite',
            'Control Circuit',
            'Sensor Array',
            'Electronics',
            'Processing Core',
            'Monitoring Circuits',

            // Power/Energy (non-weapon)
            'Capacitor Matrix Core',
            'Capacity Control Core',
            'Beryllium Matrix',
            'Advanced Sensor Grid',
            'Chisenic Processor',
            'Coupling Control Core',
            'Fuel Primer',
            'Energy Connector',
            'Field Coils',
            'Generator Coils',

            // Thermal/Environmental
            'Heat Distribution Grid',
            'Heat Exchange Coils',
            'Heat Dissipator',
            'Thermal Catalyst',
            'Heat Sensor',
            'Temperature Sensor',
            'Heat Circulation Pipes',

            // Utility/Support
            'Protective Coating',
            'Reactive Coating',
            'Emergency Suppressant',
            'Emergency Transmitter',
            'Medical Nanites',
            'Repair Kit',
            'Utility Conduit',
            'Processing Matrix',
            'Transfer Lines',
            'Pump Assembly',

            // Advanced components
            'Exotic Matter Core',
            'Crystal Matrix',
            'Current Limiter',
            'Flow Controller',
            'Dimensional Stabilizer',
            'Core Stabilizer',
            'Kinetic Stabilizer',
            'Abyssal Energy Core',
            'Deployment Interface',
            'Electromagnetic Resonator',
            'EM Bio Core',
            'EM Quantum Core'
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

        this.newComponents = [];
        this.buildingRecipes = [];
        this.processedComponentsGlobal = new Set(); // Track which components have processors across all planets
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

                    // Log ingredients
                    const ingredients = [];
                    for (let i = 1; i <= 8; i++) {
                        const ingredient = this.getRecipeIngredient(recipe, i);
                        if (ingredient) {
                            ingredients.push(ingredient);
                        }
                    }

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

                }
                return false;
            }

            // Recursively check if this component can be made with native resources
            if (!this.isComponentNativeBuildable(ingredientComponent, nativeResourceList, checkedComponents, false)) {
                if (doLog) {

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
        const processors = [];

        // Get basic processors (bootstrap, planet-specific)
        const basicProcessors = this.getBasicProcessorsNeeded(planetType, componentAnalysis);
        console.log(`📊 Generating ${basicProcessors.length} basic processors for ${planetType}`);

        basicProcessors.forEach(proc => {
            const family = this.generateProgressiveBuildingFamily(
                proc.name,
                planetType,
                'Processing',
                componentAnalysis,
                {
                    targetResource: proc.resource,
                    bootstrap: proc.bootstrap,
                    planetSpecific: proc.planetSpecific
                }
            );
            processors.push(...family);
        });

        // Get advanced processors (universal)
        const advancedProcessors = this.getAdvancedProcessorsNeeded(planetType, componentAnalysis);
        console.log(`📊 Generating ${advancedProcessors.length} advanced processors for ${planetType}`);

        advancedProcessors.forEach(proc => {
            const family = this.generateProgressiveBuildingFamily(
                proc.name,
                planetType,
                'Processing',
                componentAnalysis,
                {
                    targetResource: proc.resource,
                    bootstrap: proc.bootstrap,
                    planetSpecific: proc.planetSpecific
                }
            );
            processors.push(...family);
        });

        // Check for orphaned processors (only on the last planet when generating all)
        const orphanedProcessors = this.getOrphanedProcessors(planetType);
        if (orphanedProcessors.length > 0) {
            console.log(`📊 Generating ${orphanedProcessors.length} orphaned processors for ${planetType}`);

            orphanedProcessors.forEach(proc => {
                const family = this.generateProgressiveBuildingFamily(
                    proc.name,
                    planetType,
                    'Processing',
                    componentAnalysis,
                    {
                        targetResource: proc.resource,
                        bootstrap: proc.bootstrap,
                        planetSpecific: proc.planetSpecific
                    }
                );
                processors.push(...family);
            });
        }

        return processors;
    }

    /**
     * Generate Extractor Buildings for resources
     */
    generateExtractorBuildings(planetType, componentAnalysis) {
        const recipes = [];

        // Get all basic resources available on this planet
        const eligibleResources = this.recipes.filter(r => {
            if (!r) return false;

            const outputType = this.getRecipeOutputType(r);
            const planetTypes = r.PlanetTypes || r.planetTypes || '';
            const outputName = this.getRecipeOutputName(r) || '';

            // Must be a basic resource and available on this planet
            return (outputType === 'BASIC RESOURCE' ||
                outputType === 'BASIC ORGANIC RESOURCE' ||
                outputType === 'RESOURCE' ||
                outputType === 'Raw Resource') &&
                planetTypes.includes(planetType) &&
                outputName !== '';
        });

        console.log(`⛏️ Found ${eligibleResources.length} eligible resources for extractors on ${planetType}`);

        // Create extractors for each resource
        eligibleResources.forEach(resource => {
            const resourceName = this.getRecipeOutputName(resource);
            const resourceTier = parseInt(this.getRecipeOutputTier(resource) || '1');

            // Determine if this needs planet-specific variants for bootstrap
            // Only T1 resources (BuildingResourceTier 1) can have bootstrap
            const needsBootstrap = resourceTier === 1;

            // Generate extractor name
            const extractorName = resourceName.includes('Extractor') ?
                resourceName : `${resourceName} Extractor`;

            // If bootstrap is needed and resource is on multiple planets, create planet-specific variant
            const planetTypes = (resource.PlanetTypes || resource.planetTypes || '').split(';').map(p => p.trim());
            const isMultiPlanet = planetTypes.length > 1;

            const finalExtractorName = needsBootstrap && isMultiPlanet ?
                `${this.getPlanetPrefix(planetType)}-${this.toKebabCase(extractorName)}` :
                extractorName;

            const extractorRecipes = this.generateProgressiveBuildingFamily(
                finalExtractorName, planetType, 'Extraction', componentAnalysis,
                {
                    targetResource: resource,
                    bootstrap: needsBootstrap,
                    planetSpecific: needsBootstrap && isMultiPlanet
                }
            );
            recipes.push(...extractorRecipes);
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
        let previousTierRecipe = null;

        for (let tier = 1; tier <= 5; tier++) {
            const recipe = this.generateSingleBuildingRecipe(
                buildingName, planetType, category, tier,
                componentAnalysis, config, previousTierRecipe
            );

            if (recipe) {
                recipes.push(recipe);

                // Store the recipe with its tier and ingredients for next iteration
                previousTierRecipe = {
                    tier: tier,
                    ingredients: this.extractIngredientsFromRecipe(recipe),
                    bootstrap: config.bootstrap
                };
            }
        }

        return recipes;
    }

    /**
     * Generate a single building recipe with proper tier progression
     */
    generateSingleBuildingRecipe(buildingName, planetType, category, tier, componentAnalysis, config, previousTierRecipe) {
        const baseName = buildingName.replace(/-t\d+$/, '');
        const planetPrefix = this.getPlanetPrefix(planetType);
        const buildingId = config.planetSpecific ?
            `${planetPrefix}-${this.toKebabCase(baseName)}-t${tier}` :
            `${this.toKebabCase(baseName)}-t${tier}`;

        // Get resource tier from target resource if available
        let resourceTier = 1;
        if (config.targetResource) {
            resourceTier = parseInt(this.getRecipeOutputTier(config.targetResource) || '1');
        } else if (config.resourceTier) {
            resourceTier = config.resourceTier;
        }

        const constructionTime = this.calculateConstructionTime(category, tier, resourceTier);

        // Select appropriate ingredients based on tier and category
        let ingredients = [];
        if (tier === 1 && (category === 'Infrastructure' || config.bootstrap)) {
            // T1 infrastructure and bootstrap buildings use raw materials
            ingredients = this.selectBuildingIngredients(
                planetType, baseName, tier, resourceTier, category, previousTierRecipe
            );
        } else {
            // All other buildings use processed components
            ingredients = this.selectBuildingIngredients(
                planetType, baseName, tier, resourceTier, category, previousTierRecipe
            );
        }

        // Build the recipe object
        const recipe = {
            OutputID: buildingId,
            OutputName: baseName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            OutputType: 'BUILDING',
            OutputTier: tier.toString(),
            BuildingResourceTier: resourceTier.toString(), // Add BuildingResourceTier
            ConstructionTime: tier === 1 && category === 'Infrastructure' &&
                (baseName.includes('central-hub') || baseName.includes('cultivation-hub')) ?
                '' : constructionTime.toString(),
            PlanetTypes: planetType,
            Factions: 'MUD;ONI;USTUR',
            ResourceType: category,
            ProductionSteps: category === 'Processing' ? '1' : ''
        };

        // Add ingredients
        if (tier === 1 && category === 'Infrastructure' &&
            (baseName.includes('central-hub') || baseName.includes('cultivation-hub'))) {
            recipe.Ingredient1 = 'Auto-Built';
        } else {
            ingredients.forEach((ing, idx) => {
                recipe[`Ingredient${idx + 1}`] = ing.name;
                recipe[`Quantity${idx + 1}`] = ing.quantity.toString();
            });
        }

        // Fill remaining ingredient slots with empty strings
        for (let i = ingredients.length + 1; i <= 8; i++) {
            recipe[`Ingredient${i}`] = '';
            recipe[`Quantity${i}`] = '';
        }

        return recipe;
    }

    /**
     * Select bootstrap ingredients (raw materials) for T1 buildings
     */
    selectBootstrapIngredients(planetType, buildingType) {
        const ingredients = [];

        // Get ONLY T1 raw native resources for bootstrap
        const nativeResources = this.recipes.filter(r => {
            const outputType = this.getRecipeOutputType(r);
            const outputTier = this.getRecipeOutputTier(r);
            const planetTypes = r.PlanetTypes || r.planetTypes || '';
            const outputName = this.getRecipeOutputName(r);

            return (outputType === 'BASIC RESOURCE' ||
                outputType === 'BASIC ORGANIC RESOURCE' ||
                outputType === 'RESOURCE') &&
                outputTier <= 1 &&
                planetTypes.includes(planetType) &&
                this.isRawMaterial(outputName); // CRITICAL: Only raw materials
        });

        console.log(`  🔍 Found ${nativeResources.length} raw T1 materials for ${buildingType} on ${planetType}`);

        // Select 2-3 raw materials only
        const selectedResources = nativeResources.slice(0, 3);
        selectedResources.forEach((resource, index) => {
            const resourceName = this.getRecipeOutputName(resource);
            ingredients.push({
                name: resourceName,
                quantity: 25 - (index * 5) // 25, 20, 15
            });
            console.log(`    ✅ Selected raw material: ${resourceName}`);
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
        // Ensure inputs are integers
        resourceTier = parseInt(resourceTier) || 1;
        buildingTier = parseInt(buildingTier) || 1;

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

            return { minTier: minTier, maxTier: maxTier };
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

        return { minTier: minTier, maxTier: maxTier };
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
        // Calculate the allowed tier range for ingredients
        const tierRange = this.calculateIngredientTierRange(resourceTier, buildingTier);

        console.log(`📦 Selecting ingredients for ${buildingType} T${buildingTier} (Resource T${resourceTier})`);
        console.log(`  Allowed ingredient tier range: T${tierRange.minTier}-T${tierRange.maxTier}`);

        // Special handling for infrastructure T1 buildings (bootstrap)
        if (category === 'Infrastructure' && buildingTier === 1) {
            console.log(`  🏗️ T1 Infrastructure ${buildingType} using raw materials (bootstrap)`);
            return this.selectBootstrapIngredients(planetType, buildingType);
        }

        // Processing buildings can use raw materials at T1 ONLY if they're BuildingResourceTier 1
        if (category === 'Processing' && buildingTier === 1 && resourceTier === 1) {
            // Check if this processor has bootstrap enabled (planet-specific variant)
            const hasBootstrap = prevTierRecipe?.bootstrap ||
                buildingType.includes(this.getPlanetPrefix(planetType));

            if (hasBootstrap) {
                console.log(`  🏭 T1 Processor ${buildingType} using raw materials (bootstrap)`);
                return this.selectBootstrapIngredients(planetType, buildingType);
            }
        }

        // Extraction buildings can use raw materials at T1 ONLY if they're BuildingResourceTier 1
        if (category === 'Extraction' && buildingTier === 1 && resourceTier === 1) {
            console.log(`  ⛏️ T1 Extractor ${buildingType} using raw materials (bootstrap)`);
            return this.selectBootstrapIngredients(planetType, buildingType);
        }

        // Farm buildings can use raw materials at T1 ONLY if they're BuildingResourceTier 1 or 2
        if (category === 'Farm' && buildingTier === 1 && resourceTier <= 2) {
            console.log(`  🌱 T1 Farm ${buildingType} using raw materials (bootstrap)`);
            return this.selectBootstrapIngredients(planetType, buildingType);
        }

        const ingredients = [];

        // CRITICAL: If we have a previous tier recipe, carry forward its ingredients with increased quantities
        if (prevTierRecipe && prevTierRecipe.ingredients && prevTierRecipe.ingredients.length > 0) {
            console.log(`  📋 Building upon previous tier recipe with ${prevTierRecipe.ingredients.length} ingredients`);

            // Carry forward all previous ingredients with scaled quantities
            prevTierRecipe.ingredients.forEach((prevIng, index) => {
                // Scale quantity based on tier progression (15-20% increase per tier)
                const scaleFactor = 1 + (0.15 + Math.random() * 0.05) * (buildingTier - (prevTierRecipe.tier || 1));
                const newQuantity = Math.ceil(prevIng.quantity * scaleFactor);

                ingredients.push({
                    name: prevIng.name,
                    quantity: newQuantity
                });
            });

            console.log(`  ✅ Carried forward ${ingredients.length} ingredients with scaled quantities`);
        }

        // Analyze existing components for compatibility
        const componentAnalysis = this.analyzeExistingComponents(planetType);

        // Determine how many new ingredients to add (only add NEW slots, don't replace existing)
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
                const compTier = parseInt(comp.OutputTier || comp.outputTier) || 1;
                const compPlanet = comp.PlanetTypes || comp.planetTypes || '';

                // CRITICAL: STRICT tier enforcement - reject components outside range
                if (compTier < tierRange.minTier || compTier > tierRange.maxTier) {
                    return; // Skip this component - outside allowed tier range
                }



                // Check if it's planet-specific or universal
                if (compPlanet.includes(planetType) || compPlanet === '') {
                    // Check if not already used in current recipe
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
            });

            // Only log component counts for infrastructure to debug violations
            if (category === 'Infrastructure') {
                console.log(`🏗️ ${buildingType} T${buildingTier} - Found ${availableInTierRange.length} components in range T${tierRange.minTier}-T${tierRange.maxTier}`);
            }

            // Sort available components - prefer tier-matched and diverse components
            availableInTierRange.sort((a, b) => {
                const aName = a.component.OutputName || a.component.outputName;
                const bName = b.component.OutputName || b.component.outputName;
                const aTier = parseInt(a.component.OutputTier || a.component.outputTier) || 1;
                const bTier = parseInt(b.component.OutputTier || b.component.outputTier) || 1;

                // Special case: Prioritize Framework for T2+ resource tier buildings (non-bootstrap)
                const isT2Plus = buildingTier >= 2 && resourceTier >= 2;
                const aIsFramework = aName === 'Framework';
                const bIsFramework = bName === 'Framework';

                if (isT2Plus && aIsFramework && !bIsFramework) return -1;
                if (isT2Plus && !aIsFramework && bIsFramework) return 1;

                // Prioritize components that match the building's resource tier
                const tierDiffA = Math.abs(aTier - resourceTier);
                const tierDiffB = Math.abs(bTier - resourceTier);

                if (tierDiffA < tierDiffB) return -1;
                if (tierDiffA > tierDiffB) return 1;

                // Regular preferred component sorting
                if (a.isPreferred && !b.isPreferred) return -1;
                if (!a.isPreferred && b.isPreferred) return 1;

                // Add some randomness for variety
                return Math.random() - 0.5;
            });

            // Select from available components first
            const selectedFromAvailable = availableInTierRange
                .slice(0, newIngredientsNeeded)
                .map(item => {
                    const component = {
                        name: item.component.OutputName || item.component.outputName,
                        tier: parseInt(item.component.OutputTier || item.component.outputTier) || 1,
                        isNew: false
                    };

                    // Log component selections, with special note for Framework
                    if (category === 'Infrastructure' || component.name === 'Framework') {
                        const frameworkNote = component.name === 'Framework' ? ' 🏗️ FRAMEWORK!' : '';
                        console.log(`🏗️ Selected: ${component.name} T${component.tier} for ${buildingType} T${buildingTier}${frameworkNote}`);
                    }

                    return component;
                });

            // Track reuse
            this.existingComponentsReused += selectedFromAvailable.length;

            // If we still need more components, create new ones
            const remainingNeeded = newIngredientsNeeded - selectedFromAvailable.length;

            if (remainingNeeded > 0) {
                console.log(`  🔧 Need to create ${remainingNeeded} new components for ${buildingType} T${buildingTier}`);

                // Determine if native support is required based on new rules
                const requiresNativeSupport = this.shouldRequireNativeSupport(
                    category, buildingTier, resourceTier
                );

                const supportText = requiresNativeSupport ? 'native support required' : 'any resources allowed';
                console.log(`  📋 Requirements: T${tierRange.minTier}-T${tierRange.maxTier}, ${planetType} ${supportText}, ${category} suitable`);

                // Create new planet-specific components
                const newComponents = this.createNewPlanetComponents(
                    planetType,
                    tierRange,
                    category,
                    remainingNeeded,
                    requiresNativeSupport
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
     * Validate and fix infrastructure ingredients to prevent tier violations while maintaining progression
     */
    validateAndFixInfrastructureIngredients(ingredients, tierRange, planetType, buildingType, buildingTier, prevTierRecipe = null) {
        const validatedIngredients = [];
        const prevTierIngredients = new Set();

        // If we have a previous tier recipe, collect its ingredients to maintain
        if (prevTierRecipe) {
            for (let i = 1; i <= 8; i++) {
                const ingredientName = prevTierRecipe[`Ingredient${i}`];
                if (ingredientName && ingredientName !== 'Auto-Built') {
                    prevTierIngredients.add(ingredientName);
                }
            }
        }

        ingredients.forEach((ingredient, index) => {
            // Check if this ingredient is from a previous tier (must be maintained for progression)
            const isFromPreviousTier = prevTierIngredients.has(ingredient.name);

            if (isFromPreviousTier) {
                // Always keep ingredients from previous tiers to maintain build-up progression
                validatedIngredients.push(ingredient);
                return;
            }

            // For new ingredients, check if it's a component and validate tier
            const ingredientComponent = this.recipes.find(r =>
                (this.getRecipeOutputName(r) === ingredient.name || this.getRecipeOutputID(r) === ingredient.name) &&
                this.getRecipeOutputType(r) === 'COMPONENT'
            );

            if (ingredientComponent) {
                const ingredientTier = this.getRecipeOutputTier(ingredientComponent);

                // For new ingredients, only add if they fit the tier range
                if (ingredientTier >= tierRange.minTier && ingredientTier <= tierRange.maxTier) {
                    validatedIngredients.push(ingredient);
                } else {
                    // Find a suitable replacement for new ingredients that don't fit
                    console.log(`🏗️ Replacing new ingredient ${ingredient.name} T${ingredientTier} (outside T${tierRange.minTier}-T${tierRange.maxTier}) for ${buildingType} T${buildingTier}`);

                    const replacement = this.findSuitableReplacement(ingredient, tierRange, planetType);
                    if (replacement) {
                        console.log(`🏗️ Replacement: ${replacement.name} T${replacement.tier}`);
                        validatedIngredients.push({
                            name: replacement.name,
                            quantity: ingredient.quantity
                        });
                    } else {
                        // No suitable replacement found, create a new component
                        console.log(`🏗️ No replacement found, creating new component for ${buildingType} T${buildingTier}`);
                        const requiresNativeSupport = this.shouldRequireNativeSupport('Infrastructure', buildingTier, buildingTier);
                        const newComponent = this.createNewPlanetComponents(planetType, tierRange, 'Infrastructure', 1, requiresNativeSupport)[0];
                        if (newComponent) {
                            validatedIngredients.push({
                                name: newComponent.name,
                                quantity: ingredient.quantity
                            });
                        }
                    }
                }
            } else {
                // Raw material or unknown ingredient - keep it
                validatedIngredients.push(ingredient);
            }
        });

        return validatedIngredients;
    }

    /**
     * Find a suitable replacement component within the tier range
     */
    findSuitableReplacement(originalIngredient, tierRange, planetType) {
        // Look for components in the correct tier range that are suitable for buildings
        const suitableComponents = [];

        this.availableComponents.forEach((comp, id) => {
            const compTier = parseInt(comp.OutputTier || comp.outputTier) || 1;
            const compPlanet = comp.PlanetTypes || comp.planetTypes || '';
            const compName = comp.OutputName || comp.outputName;

            // Check if component is in tier range and planet compatible
            if (compTier >= tierRange.minTier && compTier <= tierRange.maxTier) {
                if (compPlanet.includes(planetType) || compPlanet === '') {
                    if (!this.bannedBuildingComponents.has(compName)) {
                        const nameLower = (compName || '').toLowerCase();
                        const isUnsuitable = this.unsuitableThemes.some(theme =>
                            nameLower.includes(theme)
                        );

                        if (!isUnsuitable) {
                            suitableComponents.push({
                                name: compName,
                                tier: compTier,
                                isPreferred: this.preferredBuildingComponents.has(compName)
                            });
                        }
                    }
                }
            }
        });

        // Sort by preference and tier (prefer lower tiers and preferred components)
        suitableComponents.sort((a, b) => {
            if (a.isPreferred && !b.isPreferred) return -1;
            if (!a.isPreferred && b.isPreferred) return 1;
            return a.tier - b.tier; // Prefer lower tiers
        });

        return suitableComponents[0] || null;
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
        const minTier = tierRange.minTier || tierRange.min || tierRange[0];
        const maxTier = tierRange.maxTier || tierRange.max || tierRange[1];
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
    createComponentRecipe(planetType, componentName, componentTier, requiresNativeSupport = true) {
        const componentId = `${planetType.toLowerCase()}-${this.toKebabCase(componentName)}`;

        // Get appropriate resources based on native support requirement
        let availableResources;
        if (requiresNativeSupport) {
            // Get native resources for this planet
            availableResources = this.recipes.filter(r => {
                const outputType = this.getRecipeOutputType(r);
                const planetTypes = r.PlanetTypes || r.planetTypes || '';
                return outputType === 'RESOURCE' &&
                    planetTypes.includes(planetType);
            });
        } else {
            // Use any available resources (not limited to native)
            availableResources = this.recipes.filter(r => {
                const outputType = this.getRecipeOutputType(r);
                return outputType === 'RESOURCE';
            });
        }

        // Group available resources by tier
        const resourcesByTier = {};
        availableResources.forEach(resource => {
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
            const resourceTypeLabel = requiresNativeSupport ? 'native' : 'available';
            console.warn(`⚠️ No ${resourceTypeLabel} resources found for ${componentName} T${componentTier} on ${planetType}`);
            // Fallback: use any available resources
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
     * Determine if native support is required based on new rules
     */
    shouldRequireNativeSupport(category, buildingTier, resourceTier) {
        // Infrastructure buildings: only T1 requires native support (using raw materials)
        if (category === 'Infrastructure') {
            return buildingTier === 1;
        }

        // Resource-processing buildings: only T1-T2 resources AND T1-T3 building tiers require native support
        return resourceTier <= 2 && buildingTier <= 3;
    }

    /**
     * Create new planet-specific components when needed
     */
    createNewPlanetComponents(planetType, tierRange, category, count = 1, requiresNativeSupport = true) {
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

        console.log(`  Creating ${count} new ${category} components for ${planetType} in tier range ${tierRange.minTier}-${tierRange.maxTier}`);

        for (let i = 0; i < count; i++) {
            // Select tier for this component - prefer lower tiers for better availability
            // For single tier range, use that tier
            let tier = tierRange.minTier;
            if (tierRange.maxTier > tierRange.minTier) {
                // Distribute across available tiers, but bias toward lower tiers
                if (i === 0) {
                    tier = tierRange.minTier; // First component at min tier
                } else if (i === count - 1 && count > 1) {
                    tier = Math.min(tierRange.maxTier, tierRange.minTier + 1); // Last component at min+1 or max
                } else {
                    // Middle components distributed
                    tier = Math.min(tierRange.maxTier, tierRange.minTier + Math.floor(i / 2));
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

            console.log(`  Creating new component: ${componentName} (T${tier}) - Native support required: ${requiresNativeSupport}`);

            const componentRecipe = this.createComponentRecipe(
                planetType,
                componentName,
                tier,
                requiresNativeSupport
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
     * Get basic processors needed for a planet (bootstrap)
     * These are planet-specific versions for T1 components whose raw materials are ALL native
     */
    getBasicProcessorsNeeded(planetType, componentAnalysis) {
        const processors = [];
        const nativeResources = this.planetNativeResources[planetType];

        // Get all native raw resources for this planet
        const allNativeRaw = new Set([
            ...(nativeResources.t1 || []),
            ...(nativeResources.t2 || []),
            ...(nativeResources.t3 || []),
            ...(nativeResources.t4 || []),
            ...(nativeResources.t5 || [])
        ]);

        // Find T1 components with ≤2 production steps that:
        // 1. Are available on this planet
        // 2. Have ALL ingredients as native raw materials
        const eligibleComponents = this.recipes.filter(r => {
            if (!r) return false;

            const outputType = this.getRecipeOutputType(r);
            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || '0');
            const outputTier = parseInt(this.getRecipeOutputTier(r) || '1');
            const planetTypes = (r.PlanetTypes || r.planetTypes || '').split(';').map(p => p.trim());

            // Must be a T1 component with ≤2 production steps available on this planet
            if (outputType !== 'COMPONENT' || productionSteps > 2 || outputTier !== 1) {
                return false;
            }

            // Must be available on this planet
            if (!planetTypes.includes(planetType)) {
                return false;
            }

            // For bootstrap, production steps must be 1 (raw to component directly)
            if (productionSteps !== 1) {
                return false;
            }

            // Check if ALL ingredients are native raw materials
            for (let i = 1; i <= 8; i++) {
                const ingredient = r[`Ingredient${i}`] || r[`ingredient${i}`];
                if (ingredient) {
                    const ingredientLower = ingredient.toLowerCase().replace(/\s+/g, '-');
                    let found = false;

                    // Check if it's a native raw material
                    for (const native of allNativeRaw) {
                        if (native.toLowerCase().replace(/\s+/g, '-') === ingredientLower ||
                            native.toLowerCase() === ingredient.toLowerCase()) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        return false; // Non-native ingredient found
                    }
                }
            }

            return true; // All ingredients are native
        });

        console.log(`🔧 Found ${eligibleComponents.length} T1 components eligible for bootstrap on ${planetType}`);

        // Create planet-specific processor for each eligible component
        eligibleComponents.forEach(component => {
            const componentName = this.getRecipeOutputName(component);
            processors.push({
                name: `${componentName} Processor`,
                resource: component,
                planetSpecific: true,
                bootstrap: true
            });
        });

        return processors;
    }

    /**
     * Get advanced processors needed (components that should be processed on this planet)
     */
    getAdvancedProcessorsNeeded(planetType, componentAnalysis) {
        const processors = [];
        const processedComponents = new Set(); // Track which components we've already created processors for locally
        const bootstrapComponents = new Set(); // Track components that already have bootstrap processors

        // First, get the list of bootstrap components so we don't duplicate them
        const basicProcessors = this.getBasicProcessorsNeeded(planetType, componentAnalysis);
        basicProcessors.forEach(proc => {
            const componentName = this.getRecipeOutputName(proc.resource);
            bootstrapComponents.add(componentName);
            this.processedComponentsGlobal.add(componentName); // Track globally
        });

        // Get components with ≤2 production steps that are available on this planet
        const eligibleComponents = this.recipes.filter(r => {
            if (!r) return false;

            const outputType = this.getRecipeOutputType(r);
            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || '0');
            const outputName = this.getRecipeOutputName(r) || '';
            const planetTypes = (r.PlanetTypes || r.planetTypes || '').split(';').map(p => p.trim());

            // Must be a component with ≤2 production steps
            if (outputType !== 'COMPONENT' || productionSteps > 2 || outputName === '') {
                return false;
            }

            // Skip if already has a bootstrap processor
            if (bootstrapComponents.has(outputName)) {
                return false;
            }

            // Must be available on this planet
            if (!planetTypes.includes(planetType)) {
                return false;
            }

            return true;
        });

        console.log(`🔧 Found ${eligibleComponents.length} components with ≤2 production steps available on ${planetType}`);

        // For each component, determine if this planet should get the processor
        eligibleComponents.forEach(component => {
            const componentName = this.getRecipeOutputName(component);

            // Skip if we've already processed this component locally
            if (processedComponents.has(componentName)) {
                return;
            }

            const planetTypes = (component.PlanetTypes || component.planetTypes || '').split(';').map(p => p.trim());

            // Determine if this planet should get the processor
            // Priority: 1) Only planet, 2) Planet with most native ingredients, 3) First planet alphabetically for consistency
            let shouldGetProcessor = false;

            if (planetTypes.length === 1 && planetTypes[0] === planetType) {
                // This is the only planet that can make this component
                shouldGetProcessor = true;
            } else {
                // Check if this planet has the most native ingredients
                const nativeRes = this.planetNativeResources[planetType];
                if (!nativeRes) {
                    shouldGetProcessor = false;
                } else {
                    // Count native ingredients for this planet
                    let nativeCount = 0;
                    const allNative = [
                        ...(nativeRes.t1 || []),
                        ...(nativeRes.t2 || []),
                        ...(nativeRes.t3 || []),
                        ...(nativeRes.t4 || []),
                        ...(nativeRes.t5 || [])
                    ];

                    // Check each ingredient
                    for (let i = 1; i <= 8; i++) {
                        const ingredient = component[`Ingredient${i}`] || component[`ingredient${i}`];
                        if (ingredient) {
                            if (allNative.some(n => n.toLowerCase() === ingredient.toLowerCase())) {
                                nativeCount++;
                            }
                        }
                    }

                    // Compare with other planets
                    let maxNativeCount = nativeCount;
                    let bestPlanet = planetType;

                    planetTypes.forEach(planet => {
                        if (planet === planetType) return;

                        const otherNativeRes = this.planetNativeResources[planet];
                        if (!otherNativeRes) return;

                        let otherNativeCount = 0;
                        const otherAllNative = [
                            ...(otherNativeRes.t1 || []),
                            ...(otherNativeRes.t2 || []),
                            ...(otherNativeRes.t3 || []),
                            ...(otherNativeRes.t4 || []),
                            ...(otherNativeRes.t5 || [])
                        ];

                        for (let i = 1; i <= 8; i++) {
                            const ingredient = component[`Ingredient${i}`] || component[`ingredient${i}`];
                            if (ingredient) {
                                if (otherAllNative.some(n => n.toLowerCase() === ingredient.toLowerCase())) {
                                    otherNativeCount++;
                                }
                            }
                        }

                        if (otherNativeCount > maxNativeCount) {
                            maxNativeCount = otherNativeCount;
                            bestPlanet = planet;
                        } else if (otherNativeCount === maxNativeCount && planet < bestPlanet) {
                            // Alphabetical tiebreaker for consistency
                            bestPlanet = planet;
                        }
                    });

                    shouldGetProcessor = (bestPlanet === planetType);
                }
            }

            // Add processor if this planet should get it
            if (shouldGetProcessor) {
                processors.push({
                    name: `${componentName} Processor`,
                    resource: component,
                    planetSpecific: false, // Not a bootstrap processor
                    bootstrap: false
                });
                processedComponents.add(componentName);
                this.processedComponentsGlobal.add(componentName); // Track globally
            }
        });

        console.log(`🏭 Assigning ${processors.length} processors to ${planetType}`);
        return processors;
    }

    /**
     * Get orphaned processors (components that haven't been assigned to any planet yet)
     * This is used as a fallback when generating for all planets to ensure complete coverage
     */
    getOrphanedProcessors(planetType) {
        const processors = [];

        // Only run this check for the last planet in alphabetical order to avoid duplication
        const allPlanets = Object.keys(this.planetNativeResources).sort();
        if (planetType !== allPlanets[allPlanets.length - 1]) {
            return processors;
        }

        console.log(`🔍 Checking for orphaned processors on ${planetType} (final planet)`);

        // Find all components with ≤2 production steps that haven't been processed
        const orphanedComponents = this.recipes.filter(r => {
            if (!r) return false;

            const outputType = this.getRecipeOutputType(r);
            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || '0');
            const outputName = this.getRecipeOutputName(r) || '';

            // Must be a component with ≤2 production steps
            if (outputType !== 'COMPONENT' || productionSteps > 2 || outputName === '') {
                return false;
            }

            // Check if it's been processed globally
            if (this.processedComponentsGlobal.has(outputName)) {
                return false;
            }

            return true;
        });

        if (orphanedComponents.length > 0) {
            console.log(`⚠️ Found ${orphanedComponents.length} orphaned components without processors`);

            // Assign orphaned components to the current (last) planet as a fallback
            orphanedComponents.forEach(component => {
                const componentName = this.getRecipeOutputName(component);
                console.log(`  📌 Assigning orphaned processor for ${componentName} to ${planetType}`);

                processors.push({
                    name: `${componentName} Processor`,
                    resource: component,
                    planetSpecific: false,
                    bootstrap: false
                });

                this.processedComponentsGlobal.add(componentName);
            });
        }

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
        console.log(`\n🌍 Generating building recipes for ${planetType}...`);

        // Initialize planet resources if not already done
        if (Object.keys(this.planetNativeResources).length === 0) {
            this.initializePlanetResources();
        }

        // Build native resource list for this planet
        const nativeResourceList = this.buildNativeResourceList(planetType);

        // Analyze existing components for compatibility
        const componentAnalysis = this.analyzeExistingComponents(planetType);

        // Generate different building categories
        const infrastructure = this.generateInfrastructureBuildings(planetType, componentAnalysis);
        const processors = this.generateProcessorBuildings(planetType, componentAnalysis);
        const extractors = this.generateExtractorBuildings(planetType, componentAnalysis);
        const farms = this.generateFarmModuleBuildings(planetType, componentAnalysis);

        // Combine all recipes
        const allRecipes = [
            ...infrastructure,
            ...processors,
            ...extractors,
            ...farms
        ];

        // Store recipes for this planet
        this.buildingRecipes.push(...allRecipes);

        console.log(`✅ Generated ${allRecipes.length} building recipes for ${planetType}`);
        console.log(`  - Infrastructure: ${infrastructure.length}`);
        console.log(`  - Processors: ${processors.length}`);
        console.log(`  - Extractors: ${extractors.length}`);
        console.log(`  - Farms: ${farms.length}`);

        return allRecipes;
    }

    /**
     * Generate recipes for all planets
     */
    generateAllPlanetRecipes() {
        console.log('🌌 Starting generation for ALL planets...');

        // Reset global tracking for fresh generation
        this.resetGlobalTracking();

        // Initialize planet resources if not already done
        if (Object.keys(this.planetNativeResources).length === 0) {
            this.initializePlanetResources();
        }

        const allPlanets = Object.keys(this.planetNativeResources).sort();
        const allRecipes = [];

        allPlanets.forEach(planetType => {
            const planetRecipes = this.generatePlanetBuildingRecipes(planetType);
            allRecipes.push(...planetRecipes);
        });

        // Report on global processor coverage
        const totalComponentsWithProcessors = this.processedComponentsGlobal.size;
        const allEligibleComponents = this.recipes.filter(r => {
            const outputType = this.getRecipeOutputType(r);
            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || '0');
            return outputType === 'COMPONENT' && productionSteps <= 2;
        }).length;

        console.log('\n📊 Global Processor Coverage Report:');
        console.log(`  Total eligible components (≤2 steps): ${allEligibleComponents}`);
        console.log(`  Components with processors: ${totalComponentsWithProcessors}`);
        console.log(`  Coverage: ${((totalComponentsWithProcessors / allEligibleComponents) * 100).toFixed(1)}%`);

        if (totalComponentsWithProcessors < allEligibleComponents) {
            console.log(`  ⚠️ Missing processors for ${allEligibleComponents - totalComponentsWithProcessors} components`);
        } else {
            console.log(`  ✅ All eligible components have processors!`);
        }

        return allRecipes;
    }

    /**
     * Reset global tracking for a new generation session
     */
    resetGlobalTracking() {
        this.processedComponentsGlobal.clear();
        console.log('🔄 Reset global processor tracking');
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
        return parseInt(recipe.OutputTier || recipe.outputTier) || 1;
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

    /**
     * Check if a material is a raw resource (not processed)
     */
    isRawMaterial(materialName) {
        if (!materialName) return false;

        const nameLower = materialName.toLowerCase();

        // Raw materials include ores, gases, crystals, and basic resources
        return nameLower.includes('ore') ||
            nameLower.includes('crystal') ||
            nameLower.includes('gas') ||
            ['biomass', 'hydrogen', 'nitrogen', 'arco', 'germanium', 'carbon',
                'lumanite', 'krypton', 'methane', 'neodymium', 'diamond'].includes(nameLower);
    }

    /**
     * Check if a material is a processed component
     */
    isProcessedComponent(materialName) {
        if (!materialName) return false;
        return !this.isRawMaterial(materialName) &&
            this.availableComponents.has(materialName);
    }

    /**
     * Validate a generated recipe for tier and bootstrap violations
     */
    validateRecipe(recipe, planetType) {
        const violations = [];
        const category = recipe.ResourceType;
        const buildingTier = recipe.OutputTier;

        // Determine resource tier for this building
        let resourceTier = buildingTier; // Default for infrastructure
        if (category === 'Processing' || category === 'Extraction' || category === 'Farm') {
            // For resource-specific buildings, we need to extract the resource tier
            // This is complex to determine from the recipe alone, so we'll use building tier as fallback
            resourceTier = buildingTier;
        }

        // Check tier violations
        for (let i = 1; i <= 8; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            if (!ingredient) continue;

            const ingredientTier = this.getComponentTier(ingredient);
            if (!ingredientTier) continue;

            // Calculate allowed tier range for this building
            const isInfrastructure = category === 'Infrastructure';
            const tierRange = this.calculateIngredientTierRange(resourceTier, buildingTier, isInfrastructure);

            if (ingredientTier < tierRange.minTier || ingredientTier > tierRange.maxTier) {
                violations.push(`Tier violation: ${ingredient} (T${ingredientTier}) outside allowed range T${tierRange.minTier}-T${tierRange.maxTier}`);
            }
        }

        // Check bootstrap violations for T1 infrastructure
        if (category === 'Infrastructure' && buildingTier === 1) {
            const buildingName = recipe.OutputName;
            const buildingConfig = this.buildingCategories.Infrastructure[buildingName];

            // Only check bootstrap buildings (not Central Hub or Cultivation Hub which are auto-built)
            if (buildingConfig?.bootstrap === true) {
                for (let i = 1; i <= 8; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    if (!ingredient) continue;

                    if (!this.isRawMaterial(ingredient)) {
                        violations.push(`Bootstrap violation: T1 ${buildingName} using processed component ${ingredient}`);
                    }
                }
            }
        }

        return violations;
    }

    /**
     * Get component tier from name
     */
    getComponentTier(componentName) {
        if (!componentName) return null;

        // Find component in available components
        const comp = Array.from(this.availableComponents.values()).find(c =>
            (c.OutputName || c.outputName) === componentName
        );

        if (comp) {
            return comp.OutputTier || comp.outputTier;
        }

        // Check if it's a raw material from recipes
        const rawMaterial = this.recipes.find(r =>
            this.getRecipeOutputName(r) === componentName
        );

        if (rawMaterial) {
            return this.getRecipeOutputTier(rawMaterial);
        }

        return null;
    }

    /**
     * Replace raw resources with refined components in T2+ buildings
     * Maintains build-up progression while using refined materials
     */
    replaceRawResourcesWithRefinedComponents(ingredients, buildingTier, planetType) {
        if (buildingTier <= 1) {
            return ingredients; // T1 can use raw materials
        }

        const refinedIngredients = [];

        ingredients.forEach(ingredient => {
            const rawResourceName = ingredient.name;

            // Check if this is a raw resource that should be refined
            const shouldRefine = this.shouldRawResourceBeRefined(rawResourceName);

            if (shouldRefine) {
                // Find the refined component equivalent
                const refinedComponent = this.findRefinedComponentEquivalent(rawResourceName, planetType);

                if (refinedComponent) {
                    console.log(`  🔄 Replacing raw resource "${rawResourceName}" with refined "${refinedComponent}" in T${buildingTier} building`);
                    refinedIngredients.push({
                        name: refinedComponent,
                        quantity: ingredient.quantity
                    });
                } else {
                    // Keep original if no refined equivalent found
                    console.log(`  ⚠️ No refined equivalent found for "${rawResourceName}", keeping original`);
                    refinedIngredients.push(ingredient);
                }
            } else {
                // Keep non-refinable resources (crystals, gases, etc.)
                refinedIngredients.push(ingredient);
            }
        });

        return refinedIngredients;
    }

    /**
     * Determine if a raw resource should be refined (ores should be, crystals/gases may not need to be)
     */
    shouldRawResourceBeRefined(resourceName) {
        const resourceLower = resourceName.toLowerCase();

        // Always refine ores
        if (resourceLower.includes('ore') || resourceLower.includes('chromite')) {
            return true;
        }

        // Don't refine crystals (they're already refined forms)
        if (resourceLower.includes('crystal') || resourceLower.includes('diamond') ||
            resourceLower.includes('ruby') || resourceLower.includes('sapphire') ||
            resourceLower.includes('quartz') || resourceLower.includes('garnet') ||
            resourceLower.includes('topaz') || resourceLower.includes('peridot') ||
            resourceLower.includes('opal')) {
            return false;
        }

        // Don't refine gases (they're already in usable form)
        if (resourceLower.includes('gas') || resourceLower.includes('argon') ||
            resourceLower.includes('hydrogen') || resourceLower.includes('nitrogen') ||
            resourceLower.includes('oxygen') || resourceLower.includes('xenon') ||
            resourceLower.includes('krypton') || resourceLower.includes('neon')) {
            return false;
        }

        // Don't refine special materials that are already in refined form
        if (resourceLower.includes('arco') || resourceLower.includes('lumanite') ||
            resourceLower.includes('germanium') || resourceLower.includes('silicon crystal') ||
            resourceLower.includes('thermal regulator stone')) {
            return false;
        }

        // Don't refine organic materials (they're processed differently)
        if (resourceLower.includes('biomass') || resourceLower.includes('resin') ||
            resourceLower.includes('amber')) {
            return false;
        }

        // Refine everything else (mainly ores and basic metals)
        return true;
    }

    /**
     * Find the refined component equivalent for a raw resource
     */
    findRefinedComponentEquivalent(rawResourceName, planetType) {
        // Common ore to component mappings
        const oreToComponentMap = {
            'Iron Ore': 'Iron',
            'Copper Ore': 'Copper',
            'Silver Ore': 'Silver',
            'Gold Ore': 'Gold',
            'Aluminum Ore': 'Aluminum',
            'Titanium Ore': 'Titanium',
            'Chromium Ore': 'Chromium',
            'Chromite Ore': 'Chromite',
            'Cobalt Ore': 'Cobalt',
            'Manganese Ore': 'Manganese',
            'Zinc Ore': 'Zinc',
            'Tin Ore': 'Tin',
            'Lithium Ore': 'Lithium',
            'Tungsten Ore': 'Tungsten',
            'Vanadium Ore': 'Vanadium',
            'Hafnium Ore': 'Hafnium',
            'Tantalum Ore': 'Tantalum',
            'Rhenium Ore': 'Rhenium',
            'Osmium Ore': 'Osmium',
            'Palladium Ore': 'Palladium',
            'Platinum Ore': 'Platinum',
            'Iridium Ore': 'Iridium',
            'Rhodium Ore': 'Rhodium',
            'Ruthenium Ore': 'Ruthenium',
            'Resonium Ore': 'Resonium',
            'Abyssal Chromite': 'Chromite Ingot',
            // Add germanium refinement
            'Germanium': 'Germanium Ingot'
        };

        // First try direct mapping
        const directMapping = oreToComponentMap[rawResourceName];
        if (directMapping) {
            // Check if this component exists in our recipes
            const component = this.recipes.find(r =>
                (this.getRecipeOutputName(r) === directMapping || this.getRecipeOutputID(r) === directMapping) &&
                this.getRecipeOutputType(r) === 'COMPONENT'
            );
            if (component) {
                return directMapping;
            }
        }

        // Try to find component with similar name
        const baseName = rawResourceName.replace(/ Ore$/, '').replace(/Ore$/, '');
        const componentCandidates = this.recipes.filter(r => {
            const outputType = this.getRecipeOutputType(r);
            const outputName = this.getRecipeOutputName(r);
            return outputType === 'COMPONENT' &&
                (outputName.includes(baseName) || outputName === baseName);
        });

        if (componentCandidates.length > 0) {
            // Prefer components that are native to this planet
            const nativeComponent = componentCandidates.find(r => {
                const planetTypes = r.PlanetTypes || r.planetTypes || '';
                return planetTypes.includes(planetType) || planetTypes === '';
            });

            if (nativeComponent) {
                return this.getRecipeOutputName(nativeComponent);
            }

            // Otherwise use the first candidate
            return this.getRecipeOutputName(componentCandidates[0]);
        }

        return null; // No refined equivalent found
    }
} 