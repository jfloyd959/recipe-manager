// Recipe Chain Generator - Complete Production Chain System
// This system generates every recipe and traces all components back to raw resources

export class RecipeChainGenerator {
    constructor() {
        this.components = new Map(); // All components indexed by name
        this.rawResources = new Map(); // All raw resources
        this.recipes = new Map(); // All recipes
        this.productionChains = new Map(); // Complete production chains
        this.missingComponents = new Set(); // Track missing components
        this.circularDependencies = new Set(); // Track circular dependencies

        // Component categories from the documentation analysis
        this.componentCategories = {
            'RAW_RESOURCES': new Set(),
            'ELECTRONIC_COMPONENT': new Set(),
            'ENERGY_MATERIAL': new Set(),
            'STRUCTURAL_ALLOY': new Set(),
            'REFINED_METAL': new Set(),
            'BIO_MATTER': new Set(),
            'CRYSTAL_PROCESSED': new Set(),
            'QUANTUM_MATERIAL': new Set(),
            'EXOTIC_ELEMENT': new Set(),
            'AMMUNITION_MATERIAL': new Set(),
            'SYNTHETIC_POLYMER': new Set()
        };
    }

    // Load and parse the CSV data
    loadComponentData(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');

        // Parse each component entry
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const data = this.parseCSVLine(line);
            if (!data) continue;

            const component = this.createComponentEntry(data, headers);
            if (component) {
                this.components.set(component.name, component);

                // Categorize component
                if (component.resourceType) {
                    if (component.functionalPurpose === 'RAW_EXTRACTION') {
                        this.componentCategories.RAW_RESOURCES.add(component.name);
                        this.rawResources.set(component.name, component);
                    } else {
                        this.componentCategories[component.resourceType]?.add(component.name);
                    }
                }
            }
        }

        console.log(`Loaded ${this.components.size} components`);
        console.log(`Found ${this.rawResources.size} raw resources`);
    }

    // Parse CSV line handling quotes and commas properly
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // Create component entry from CSV data
    createComponentEntry(data, headers) {
        if (data.length < 10) return null;

        const component = {
            id: data[0] || '',
            name: data[1] || '',
            type: data[2] || '',
            tier: parseInt(data[3]) || 1,
            constructionTime: parseInt(data[4]) || 0,
            planetTypes: data[5] || '',
            factions: data[6] || '',
            resourceType: data[7] || '',
            functionalPurpose: data[8] || '',
            usageCategory: data[9] || '',
            productionSteps: parseInt(data[10]) || 0,
            ingredients: []
        };

        // Parse ingredients from columns 11+ (pairs of ingredient name + quantity)
        for (let i = 11; i < data.length - 1; i += 2) {
            const ingredientName = data[i]?.trim();
            const quantity = parseInt(data[i + 1]) || 0;

            if (ingredientName && quantity > 0) {
                component.ingredients.push({
                    name: ingredientName,
                    quantity: quantity
                });
            }
        }

        return component;
    }

    // Generate complete recipe for a component
    generateRecipe(componentName, visitedComponents = new Set()) {
        // Check for circular dependency
        if (visitedComponents.has(componentName)) {
            this.circularDependencies.add(componentName);
            return { isCircular: true, component: componentName };
        }

        const component = this.components.get(componentName);
        if (!component) {
            this.missingComponents.add(componentName);
            return { isMissing: true, component: componentName };
        }

        // If it's a raw resource, return immediately
        if (this.rawResources.has(componentName)) {
            return {
                name: componentName,
                type: 'RAW_RESOURCE',
                tier: component.tier,
                planetTypes: component.planetTypes,
                resourceType: component.resourceType,
                extractionMethod: component.functionalPurpose,
                ingredients: []
            };
        }

        // Mark as visited to detect circular dependencies
        const newVisited = new Set(visitedComponents);
        newVisited.add(componentName);

        // Generate recipes for all ingredients
        const ingredientRecipes = [];
        for (const ingredient of component.ingredients) {
            const ingredientRecipe = this.generateRecipe(ingredient.name, newVisited);
            ingredientRecipes.push({
                ...ingredientRecipe,
                quantity: ingredient.quantity
            });
        }

        const recipe = {
            name: componentName,
            type: 'MANUFACTURED',
            tier: component.tier,
            constructionTime: component.constructionTime,
            planetTypes: component.planetTypes,
            resourceType: component.resourceType,
            functionalPurpose: component.functionalPurpose,
            usageCategory: component.usageCategory,
            ingredients: ingredientRecipes,
            rawResourcesRequired: this.calculateRawResources(ingredientRecipes),
            totalProductionSteps: this.calculateTotalProductionSteps(ingredientRecipes)
        };

        this.recipes.set(componentName, recipe);
        return recipe;
    }

    // Calculate total raw resources needed for a recipe
    calculateRawResources(ingredientRecipes) {
        const rawResources = new Map();

        for (const ingredient of ingredientRecipes) {
            if (ingredient.type === 'RAW_RESOURCE') {
                const current = rawResources.get(ingredient.name) || 0;
                rawResources.set(ingredient.name, current + ingredient.quantity);
            } else if (ingredient.rawResourcesRequired) {
                for (const [resource, quantity] of ingredient.rawResourcesRequired) {
                    const current = rawResources.get(resource) || 0;
                    rawResources.set(resource, current + (quantity * ingredient.quantity));
                }
            }
        }

        return rawResources;
    }

    // Calculate total production steps
    calculateTotalProductionSteps(ingredientRecipes) {
        let totalSteps = 1; // This component's production step

        for (const ingredient of ingredientRecipes) {
            if (ingredient.type !== 'RAW_RESOURCE') {
                totalSteps += ingredient.totalProductionSteps * ingredient.quantity;
            }
        }

        return totalSteps;
    }

    // Generate recipes for all missile types based on documentation
    generateMissileRecipes() {
        const missileTypes = [
            'PHOTON', 'KINETIC', 'ENERGY', 'EMP', 'EXPLOSIVE',
            'GRAY_GOO', 'HEAT', 'SHOCKWAVE', 'SUPERCHILL'
        ];

        const sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        const tiers = [1, 2, 3, 4, 5];

        const missileRecipes = new Map();

        for (const type of missileTypes) {
            for (const size of sizes) {
                for (const tier of tiers) {
                    const missileName = `Missile ${type} ${size} T${tier}`;
                    const recipe = this.generateMissileRecipe(type, size, tier);
                    missileRecipes.set(missileName, recipe);
                }
            }
        }

        return missileRecipes;
    }

    // Generate specific missile recipe based on type, size, and tier
    generateMissileRecipe(type, size, tier) {
        const baseIngredients = [
            { name: 'Missile Guidance Core', quantity: 1 },
            { name: 'Propulsion Unit', quantity: 1 },
            { name: 'Weapon Housing', quantity: 1 }
        ];

        // Add type-specific payload
        const payload = this.getPayloadForType(type, tier);
        baseIngredients.push(payload);

        // Add size-specific scaling components
        const scalingComponents = this.getScalingComponents(size, tier);
        baseIngredients.push(...scalingComponents);

        return {
            name: `Missile ${type} ${size} T${tier}`,
            type: 'MANUFACTURED',
            tier: tier,
            constructionTime: this.calculateMissileConstructionTime(size, tier),
            weaponType: type,
            size: size,
            ingredients: baseIngredients,
            functionalPurpose: 'DAMAGE_DELIVERY',
            usageCategory: 'Weapon Systems'
        };
    }

    // Get payload component based on missile type
    getPayloadForType(type, tier) {
        const payloads = {
            'PHOTON': { name: 'Photon Payload Kit', quantity: 1 },
            'KINETIC': { name: 'Kinetic Payload Kit', quantity: 1 },
            'ENERGY': { name: 'Energy Payload Kit', quantity: 1 },
            'EMP': { name: 'EMP Payload Kit', quantity: 1 },
            'EXPLOSIVE': { name: 'Explosive Payload Kit', quantity: 1 },
            'GRAY_GOO': { name: 'Gray Goo Payload Kit', quantity: 1 },
            'HEAT': { name: 'Heat Payload Kit', quantity: 1 },
            'SHOCKWAVE': { name: 'Shockwave Payload Kit', quantity: 1 },
            'SUPERCHILL': { name: 'Superchill Payload Kit', quantity: 1 }
        };

        return payloads[type] || { name: 'Basic Payload Kit', quantity: 1 };
    }

    // Get scaling components based on size
    getScalingComponents(size, tier) {
        const sizeToComponents = {
            'XXXS': [],
            'XXS': [],
            'XS': [],
            'S': [],
            'M': [],
            'L': [{ name: 'Structural Reinforcement Grid', quantity: 1 }],
            'CAP': [
                { name: 'Structural Reinforcement Grid', quantity: 1 },
                { name: 'Architectural Framework', quantity: 1 }
            ],
            'CMD': [
                { name: 'Structural Reinforcement Grid', quantity: 1 },
                { name: 'Architectural Framework', quantity: 1 },
                { name: 'Megastructure Support System', quantity: 1 }
            ],
            'CLASS8': [
                { name: 'Structural Reinforcement Grid', quantity: 1 },
                { name: 'Architectural Framework', quantity: 1 },
                { name: 'Megastructure Support System', quantity: 1 },
                { name: 'Gigascale Architecture', quantity: 1 }
            ],
            'TTN': [
                { name: 'Structural Reinforcement Grid', quantity: 1 },
                { name: 'Architectural Framework', quantity: 1 },
                { name: 'Megastructure Support System', quantity: 1 },
                { name: 'Gigascale Architecture', quantity: 1 },
                { name: 'Titan Structural Matrix', quantity: 1 }
            ]
        };

        return sizeToComponents[size] || [];
    }

    // Calculate construction time based on size and tier
    calculateMissileConstructionTime(size, tier) {
        const baseTimes = {
            'XXXS': 120, 'XXS': 180, 'XS': 240, 'S': 300, 'M': 360,
            'L': 420, 'CAP': 480, 'CMD': 540, 'CLASS8': 600, 'TTN': 660
        };

        const tierMultiplier = Math.pow(2, tier - 1);
        return (baseTimes[size] || 300) * tierMultiplier;
    }

    // Generate ship weapon recipes
    generateShipWeaponRecipes() {
        const weaponTypes = ['KINETIC', 'ENERGY', 'EMP', 'SUPERCHILL'];
        const sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        const tiers = [1, 2, 3, 4, 5];

        const weaponRecipes = new Map();

        for (const type of weaponTypes) {
            for (const size of sizes) {
                for (const tier of tiers) {
                    const weaponName = `Ship Weapon ${type} ${size} T${tier}`;
                    const recipe = this.generateShipWeaponRecipe(type, size, tier);
                    weaponRecipes.set(weaponName, recipe);
                }
            }
        }

        return weaponRecipes;
    }

    // Generate ship weapon recipe
    generateShipWeaponRecipe(type, size, tier) {
        const baseIngredients = [
            { name: 'Weapon Core', quantity: 1 },
            { name: 'Targeting System', quantity: 1 },
            { name: 'Power Interface', quantity: 1 },
            { name: 'Weapon Housing', quantity: 1 }
        ];

        // Add type-specific components
        const typeComponents = this.getWeaponTypeComponents(type, tier);
        baseIngredients.push(...typeComponents);

        // Add size-specific scaling
        const scalingComponents = this.getScalingComponents(size, tier);
        baseIngredients.push(...scalingComponents);

        return {
            name: `Ship Weapon ${type} ${size} T${tier}`,
            type: 'MANUFACTURED',
            tier: tier,
            constructionTime: this.calculateWeaponConstructionTime(size, tier),
            weaponType: type,
            size: size,
            ingredients: baseIngredients,
            functionalPurpose: 'DAMAGE_DELIVERY',
            usageCategory: 'Ship Weapons'
        };
    }

    // Get weapon type-specific components
    getWeaponTypeComponents(type, tier) {
        const typeComponents = {
            'KINETIC': [
                { name: 'Kinetic Accelerator', quantity: 1 },
                { name: 'Ballistic Chamber', quantity: 1 }
            ],
            'ENERGY': [
                { name: 'Energy Beam Emitter', quantity: 1 },
                { name: 'Beam Focusing Array', quantity: 1 }
            ],
            'EMP': [
                { name: 'EMP Generator Core', quantity: 1 },
                { name: 'Electromagnetic Coil', quantity: 1 }
            ],
            'SUPERCHILL': [
                { name: 'Cryogenic Generator', quantity: 1 },
                { name: 'Crystallization Controller', quantity: 1 }
            ]
        };

        return typeComponents[type] || [];
    }

    // Calculate weapon construction time
    calculateWeaponConstructionTime(size, tier) {
        const baseTimes = {
            'XXXS': 300, 'XXS': 450, 'XS': 600, 'S': 750, 'M': 900,
            'L': 1200, 'CAP': 1500, 'CMD': 1800, 'CLASS8': 2400, 'TTN': 3000
        };

        const tierMultiplier = Math.pow(2, tier - 1);
        return (baseTimes[size] || 900) * tierMultiplier;
    }

    // Generate countermeasure recipes
    generateCountermeasureRecipes() {
        const countermeasureTypes = [
            'Decoy', 'Energy Capacitor', 'Fire Suppressor', 'Flare',
            'Healing Nanobots', 'Mine', 'Negative REM Plating',
            'Warming Plates', 'Faraday Shielding'
        ];

        const sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        const tiers = [1, 2, 3, 4, 5];

        const countermeasureRecipes = new Map();

        for (const type of countermeasureTypes) {
            for (const size of sizes) {
                for (const tier of tiers) {
                    const name = `${type} ${size} T${tier}`;
                    const recipe = this.generateCountermeasureRecipe(type, size, tier);
                    countermeasureRecipes.set(name, recipe);
                }
            }
        }

        return countermeasureRecipes;
    }

    // Generate specific countermeasure recipe
    generateCountermeasureRecipe(type, size, tier) {
        const baseIngredients = this.getCountermeasureBaseIngredients(type);
        const scalingComponents = this.getScalingComponents(size, tier);

        return {
            name: `${type} ${size} T${tier}`,
            type: 'MANUFACTURED',
            tier: tier,
            constructionTime: this.calculateCountermeasureConstructionTime(size, tier),
            countermeasureType: type,
            size: size,
            ingredients: [...baseIngredients, ...scalingComponents],
            functionalPurpose: 'DEFENSIVE_COUNTERMEASURE',
            usageCategory: 'Defense Systems'
        };
    }

    // Get base ingredients for countermeasure types
    getCountermeasureBaseIngredients(type) {
        const ingredients = {
            'Decoy': [
                { name: 'Holographic Projector', quantity: 1 },
                { name: 'Signal Mimicry', quantity: 1 },
                { name: 'Power Source', quantity: 1 }
            ],
            'Fire Suppressor': [
                { name: 'Suppression Agent', quantity: 1 },
                { name: 'Deployment System', quantity: 1 },
                { name: 'Trigger Mechanism', quantity: 1 }
            ],
            'Healing Nanobots': [
                { name: 'Repair Nanobots', quantity: 1 },
                { name: 'Medical Protocol', quantity: 1 },
                { name: 'Bio Interface', quantity: 1 }
            ],
            'Faraday Shielding': [
                { name: 'Conductive Mesh', quantity: 1 },
                { name: 'Grounding System', quantity: 1 },
                { name: 'Insulation Layer', quantity: 1 }
            ]
            // Add more countermeasure types...
        };

        return ingredients[type] || [{ name: 'Basic Component', quantity: 1 }];
    }

    // Calculate countermeasure construction time
    calculateCountermeasureConstructionTime(size, tier) {
        const baseTimes = {
            'XXXS': 60, 'XXS': 90, 'XS': 120, 'S': 150, 'M': 180,
            'L': 240, 'CAP': 300, 'CMD': 360, 'CLASS8': 480, 'TTN': 600
        };

        const tierMultiplier = Math.pow(1.5, tier - 1);
        return Math.round((baseTimes[size] || 180) * tierMultiplier);
    }

    // Analyze component usage and find unused resources
    analyzeComponentUsage() {
        const usedComponents = new Set();
        const unusedComponents = new Set();

        // Track which components are used in recipes
        for (const [name, recipe] of this.recipes) {
            this.trackUsedComponents(recipe, usedComponents);
        }

        // Find unused components
        for (const [name, component] of this.components) {
            if (!usedComponents.has(name)) {
                unusedComponents.add(name);
            }
        }

        return {
            totalComponents: this.components.size,
            usedComponents: usedComponents.size,
            unusedComponents: unusedComponents.size,
            unusedList: Array.from(unusedComponents),
            missingComponents: Array.from(this.missingComponents),
            circularDependencies: Array.from(this.circularDependencies)
        };
    }

    // Track components used in a recipe recursively
    trackUsedComponents(recipe, usedComponents) {
        if (recipe.ingredients) {
            for (const ingredient of recipe.ingredients) {
                usedComponents.add(ingredient.name);
                const subRecipe = this.recipes.get(ingredient.name);
                if (subRecipe) {
                    this.trackUsedComponents(subRecipe, usedComponents);
                }
            }
        }
    }

    // Generate complete production chain documentation
    generateProductionChainDocumentation() {
        const documentation = {
            overview: {
                totalComponents: this.components.size,
                totalRawResources: this.rawResources.size,
                totalRecipes: this.recipes.size,
                componentCategories: Object.fromEntries(
                    Object.entries(this.componentCategories).map(([key, set]) => [key, set.size])
                )
            },
            rawResources: this.generateRawResourceDocumentation(),
            componentTiers: this.generateComponentTierDocumentation(),
            productionChains: this.generateProductionChainSummary(),
            missingComponents: Array.from(this.missingComponents),
            circularDependencies: Array.from(this.circularDependencies)
        };

        return documentation;
    }

    // Generate raw resource documentation
    generateRawResourceDocumentation() {
        const byPlanet = new Map();
        const byTier = new Map();

        for (const [name, resource] of this.rawResources) {
            // Group by planet type
            const planets = resource.planetTypes.split(';').map(p => p.trim());
            for (const planet of planets) {
                if (!byPlanet.has(planet)) byPlanet.set(planet, []);
                byPlanet.get(planet).push(name);
            }

            // Group by tier
            if (!byTier.has(resource.tier)) byTier.set(resource.tier, []);
            byTier.get(resource.tier).push(name);
        }

        return {
            byPlanet: Object.fromEntries(byPlanet),
            byTier: Object.fromEntries(byTier),
            total: this.rawResources.size
        };
    }

    // Generate component tier documentation
    generateComponentTierDocumentation() {
        const tierCounts = new Map();

        for (const [name, component] of this.components) {
            if (!tierCounts.has(component.tier)) {
                tierCounts.set(component.tier, { total: 0, byType: new Map() });
            }

            tierCounts.get(component.tier).total++;

            const type = component.resourceType || 'UNKNOWN';
            const tierData = tierCounts.get(component.tier);
            if (!tierData.byType.has(type)) {
                tierData.byType.set(type, 0);
            }
            tierData.byType.set(type, tierData.byType.get(type) + 1);
        }

        return Object.fromEntries(
            Array.from(tierCounts.entries()).map(([tier, data]) => [
                tier,
                {
                    total: data.total,
                    byType: Object.fromEntries(data.byType)
                }
            ])
        );
    }

    // Generate production chain summary
    generateProductionChainSummary() {
        const chains = [];

        for (const [name, recipe] of this.recipes) {
            if (recipe.rawResourcesRequired) {
                chains.push({
                    component: name,
                    tier: recipe.tier,
                    totalSteps: recipe.totalProductionSteps,
                    rawResourceCount: recipe.rawResourcesRequired.size,
                    complexity: this.calculateComplexity(recipe)
                });
            }
        }

        return chains.sort((a, b) => b.complexity - a.complexity);
    }

    // Calculate recipe complexity
    calculateComplexity(recipe) {
        let complexity = recipe.totalProductionSteps;
        if (recipe.rawResourcesRequired) {
            complexity += recipe.rawResourcesRequired.size;
        }
        complexity += recipe.ingredients.length * 2;
        return complexity;
    }

    // Generate all recipes and return complete system
    generateCompleteRecipeSystem() {
        console.log('Generating complete recipe system...');

        // Generate all component recipes
        const allRecipes = new Map();

        for (const [name, component] of this.components) {
            if (!this.rawResources.has(name)) {
                const recipe = this.generateRecipe(name);
                allRecipes.set(name, recipe);
            }
        }

        // Generate missile recipes
        const missileRecipes = this.generateMissileRecipes();
        for (const [name, recipe] of missileRecipes) {
            allRecipes.set(name, recipe);
        }

        // Generate ship weapon recipes
        const weaponRecipes = this.generateShipWeaponRecipes();
        for (const [name, recipe] of weaponRecipes) {
            allRecipes.set(name, recipe);
        }

        // Generate countermeasure recipes
        const countermeasureRecipes = this.generateCountermeasureRecipes();
        for (const [name, recipe] of countermeasureRecipes) {
            allRecipes.set(name, recipe);
        }

        console.log(`Generated ${allRecipes.size} complete recipes`);

        return {
            recipes: allRecipes,
            components: this.components,
            rawResources: this.rawResources,
            analysis: this.analyzeComponentUsage(),
            documentation: this.generateProductionChainDocumentation()
        };
    }
}

// Export utility functions
export const generateCompleteRecipeSystem = (csvData) => {
    const generator = new RecipeChainGenerator();
    generator.loadComponentData(csvData);
    return generator.generateCompleteRecipeSystem();
};

export const validateProductionChains = (recipeSystem) => {
    const validation = {
        completeChains: 0,
        incompleteChains: 0,
        missingComponents: new Set(),
        circularDependencies: new Set(),
        unusedRawResources: new Set()
    };

    // Validate each recipe chain
    for (const [name, recipe] of recipeSystem.recipes) {
        if (recipe.isMissing) {
            validation.incompleteChains++;
            validation.missingComponents.add(recipe.component);
        } else if (recipe.isCircular) {
            validation.incompleteChains++;
            validation.circularDependencies.add(recipe.component);
        } else {
            validation.completeChains++;
        }
    }

    // Find unused raw resources
    const usedRawResources = new Set();
    for (const [name, recipe] of recipeSystem.recipes) {
        if (recipe.rawResourcesRequired) {
            for (const resource of recipe.rawResourcesRequired.keys()) {
                usedRawResources.add(resource);
            }
        }
    }

    for (const resource of recipeSystem.rawResources.keys()) {
        if (!usedRawResources.has(resource)) {
            validation.unusedRawResources.add(resource);
        }
    }

    return validation;
}; 