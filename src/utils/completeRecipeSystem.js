// Complete Recipe System - Generates EVERY recipe with full traceability to raw resources
// Ensures 100% utilization of all components in the CSV data

export class CompleteRecipeSystem {
    constructor() {
        this.components = new Map(); // All components indexed by name
        this.rawResources = new Map(); // All raw resources
        this.completeRecipes = new Map(); // All generated recipes with full chains
        this.missileRecipes = new Map(); // Generated missile recipes
        this.weaponRecipes = new Map(); // Generated weapon recipes
        this.countermeasureRecipes = new Map(); // Generated countermeasure recipes
        this.shipSystemRecipes = new Map(); // Generated ship system recipes

        // Track analysis data
        this.missingComponents = new Set();
        this.circularDependencies = new Set();
        this.unusedComponents = new Set();
        this.componentUsage = new Map();

        // Component categorization
        this.categories = {
            RAW_RESOURCES: new Set(),
            ELECTRONIC_COMPONENT: new Set(),
            ENERGY_MATERIAL: new Set(),
            STRUCTURAL_ALLOY: new Set(),
            REFINED_METAL: new Set(),
            BIO_MATTER: new Set(),
            CRYSTAL_PROCESSED: new Set(),
            QUANTUM_MATERIAL: new Set(),
            EXOTIC_ELEMENT: new Set(),
            AMMUNITION_MATERIAL: new Set(),
            SYNTHETIC_POLYMER: new Set(),
            SURVIVAL_COMPONENT: new Set(),
            HABITAT_COMPONENT: new Set()
        };

        // Size and tier configurations
        this.sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        this.tiers = [1, 2, 3, 4, 5];

        // Product types for generation
        this.missileTypes = ['PHOTON', 'KINETIC', 'ENERGY', 'EMP', 'EXPLOSIVE', 'GRAY_GOO', 'HEAT', 'SHOCKWAVE', 'SUPERCHILL'];
        this.weaponTypes = ['KINETIC', 'ENERGY', 'EMP', 'SUPERCHILL'];
        this.countermeasureTypes = ['PHOTON', 'KINETIC', 'ENERGY', 'EMP', 'EXPLOSIVE', 'GRAY_GOO', 'HEAT', 'SHOCKWAVE', 'SUPERCHILL'];
        this.shipSystemTypes = ['PROPULSION', 'POWER', 'DEFENSE', 'SENSORS', 'UTILITY', 'MODULES'];
    }

    // Load and process all CSV data
    loadCompleteDataset(csvData) {
        console.log('Loading complete dataset for recipe generation...');

        const lines = csvData.split('\n');
        const headers = this.parseCSVHeaders(lines[0]);

        let processedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const component = this.parseComponentFromCSV(line, headers);
            if (component) {
                this.components.set(component.name, component);

                // Categorize component
                this.categorizeComponent(component);
                processedCount++;
            }
        }

        console.log(`Loaded ${processedCount} components`);
        console.log(`Found ${this.rawResources.size} raw resources`);
        console.log(`Categories populated:`, Object.fromEntries(
            Object.entries(this.categories).map(([key, set]) => [key, set.size])
        ));
    }

    // Parse CSV headers properly
    parseCSVHeaders(headerLine) {
        const headers = this.parseCSVLine(headerLine);
        return headers.map(h => h.replace(/"/g, '').trim());
    }

    // Parse CSV line handling quotes and commas
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

    // Parse component from CSV row
    parseComponentFromCSV(line, headers) {
        const values = this.parseCSVLine(line);
        if (values.length < 10) return null;

        const component = {
            id: values[0] || '',
            name: values[1] || '',
            outputType: values[2] || '',
            tier: parseInt(values[3]) || 1,
            constructionTime: parseInt(values[4]) || 0,
            planetTypes: values[5] ? values[5].split(';').map(p => p.trim()) : [],
            factions: values[6] ? values[6].split(';').map(f => f.trim()) : [],
            resourceType: values[7] || '',
            functionalPurpose: values[8] || '',
            usageCategory: values[9] || '',
            ingredients: []
        };

        // Parse ingredients (pairs starting from column 10)
        for (let i = 10; i < values.length - 1; i += 2) {
            const ingredientName = values[i]?.trim();
            const quantity = parseInt(values[i + 1]) || 0;

            if (ingredientName && quantity > 0) {
                component.ingredients.push({
                    name: ingredientName,
                    quantity: quantity
                });
            }
        }

        return component;
    }

    // Categorize component into appropriate category
    categorizeComponent(component) {
        const resourceType = component.resourceType;
        const functionalPurpose = component.functionalPurpose;

        // Check if it's a raw resource
        if (functionalPurpose === 'RAW_EXTRACTION' || component.outputType === 'BASIC RESOURCE') {
            this.categories.RAW_RESOURCES.add(component.name);
            this.rawResources.set(component.name, component);
            return;
        }

        // Categorize by resource type
        if (resourceType && this.categories[resourceType]) {
            this.categories[resourceType].add(component.name);
        } else {
            // Default categorization based on output type
            switch (component.outputType) {
                case 'R4':
                    this.categories.SURVIVAL_COMPONENT.add(component.name);
                    break;
                case 'HAB_ASSETS':
                    this.categories.HABITAT_COMPONENT.add(component.name);
                    break;
                default:
                    console.warn(`Unknown categorization for component: ${component.name}`);
            }
        }
    }

    // Generate complete recipe for any component with full traceability
    generateCompleteRecipe(componentName, visitedComponents = new Set()) {
        // Prevent circular dependencies
        if (visitedComponents.has(componentName)) {
            this.circularDependencies.add(componentName);
            return { error: 'CIRCULAR_DEPENDENCY', component: componentName };
        }

        const component = this.components.get(componentName);
        if (!component) {
            this.missingComponents.add(componentName);
            return { error: 'MISSING_COMPONENT', component: componentName };
        }

        // Track component usage
        this.componentUsage.set(componentName, (this.componentUsage.get(componentName) || 0) + 1);

        // If it's a raw resource, return base recipe
        if (this.rawResources.has(componentName)) {
            return {
                name: componentName,
                type: 'RAW_RESOURCE',
                tier: component.tier,
                extractionMethod: component.functionalPurpose,
                planetTypes: component.planetTypes,
                factions: component.factions,
                ingredients: [],
                rawResourcesRequired: new Map([[componentName, 1]]),
                totalProductionSteps: 0,
                complexity: 1
            };
        }

        // Create visited set for this path
        const currentVisited = new Set(visitedComponents);
        currentVisited.add(componentName);

        // Generate recipes for all ingredients
        const ingredientRecipes = [];
        const totalRawResources = new Map();
        let totalSteps = 1;

        for (const ingredient of component.ingredients) {
            const ingredientRecipe = this.generateCompleteRecipe(ingredient.name, currentVisited);

            if (ingredientRecipe.error) {
                return ingredientRecipe; // Propagate errors
            }

            ingredientRecipes.push({
                ...ingredientRecipe,
                requiredQuantity: ingredient.quantity
            });

            // Accumulate raw resources
            if (ingredientRecipe.rawResourcesRequired) {
                for (const [resource, quantity] of ingredientRecipe.rawResourcesRequired) {
                    const current = totalRawResources.get(resource) || 0;
                    totalRawResources.set(resource, current + (quantity * ingredient.quantity));
                }
            }

            // Accumulate production steps
            totalSteps += ingredientRecipe.totalProductionSteps * ingredient.quantity;
        }

        const completeRecipe = {
            name: componentName,
            type: 'MANUFACTURED',
            tier: component.tier,
            outputType: component.outputType,
            constructionTime: component.constructionTime,
            planetTypes: component.planetTypes,
            factions: component.factions,
            resourceType: component.resourceType,
            functionalPurpose: component.functionalPurpose,
            usageCategory: component.usageCategory,
            ingredients: ingredientRecipes,
            rawResourcesRequired: totalRawResources,
            totalProductionSteps: totalSteps,
            complexity: this.calculateComplexity(ingredientRecipes, totalRawResources, totalSteps)
        };

        this.completeRecipes.set(componentName, completeRecipe);
        return completeRecipe;
    }

    // Calculate recipe complexity
    calculateComplexity(ingredients, rawResources, totalSteps) {
        let complexity = totalSteps;
        complexity += rawResources.size * 2; // Raw resource diversity factor
        complexity += ingredients.length; // Ingredient count factor
        return complexity;
    }

    // Generate all possible missile recipes
    generateAllMissileRecipes() {
        console.log('Generating complete missile recipe set...');

        for (const type of this.missileTypes) {
            for (const size of this.sizes) {
                for (const tier of this.tiers) {
                    const missileName = `Missile ${type} ${size} T${tier}`;
                    const recipe = this.generateMissileRecipe(type, size, tier);
                    this.missileRecipes.set(missileName, recipe);
                }
            }
        }

        console.log(`Generated ${this.missileRecipes.size} missile recipes`);
        return this.missileRecipes;
    }

    // Generate specific missile recipe
    generateMissileRecipe(type, size, tier) {
        const baseComponents = [
            { name: 'Missile Guidance Core', quantity: 1 },
            { name: 'Propulsion Unit', quantity: 1 },
            { name: 'Missile Housing', quantity: 1 }
        ];

        // Add type-specific warhead
        const warhead = this.getMissileWarhead(type, tier);
        baseComponents.push(warhead);

        // Add size-specific scaling components
        const scalingComponents = this.getSizeScalingComponents(size, tier);
        baseComponents.push(...scalingComponents);

        // Calculate total raw resources and complexity
        const totalRawResources = new Map();
        const ingredientRecipes = [];
        let totalSteps = 1;

        for (const component of baseComponents) {
            const recipe = this.generateCompleteRecipe(component.name);
            if (!recipe.error) {
                ingredientRecipes.push({
                    ...recipe,
                    requiredQuantity: component.quantity
                });

                // Accumulate raw resources
                if (recipe.rawResourcesRequired) {
                    for (const [resource, quantity] of recipe.rawResourcesRequired) {
                        const current = totalRawResources.get(resource) || 0;
                        totalRawResources.set(resource, current + (quantity * component.quantity));
                    }
                }

                totalSteps += recipe.totalProductionSteps * component.quantity;
            }
        }

        return {
            name: `Missile ${type} ${size} T${tier}`,
            type: 'MISSILE',
            missileType: type,
            size: size,
            tier: tier,
            constructionTime: this.calculateMissileConstructionTime(size, tier),
            ingredients: ingredientRecipes,
            rawResourcesRequired: totalRawResources,
            totalProductionSteps: totalSteps,
            complexity: this.calculateComplexity(ingredientRecipes, totalRawResources, totalSteps)
        };
    }

    // Get warhead for missile type
    getMissileWarhead(type, tier) {
        const warheadMap = {
            'PHOTON': `Photon Warhead T${tier}`,
            'KINETIC': `Kinetic Warhead T${tier}`,
            'ENERGY': `Energy Warhead T${tier}`,
            'EMP': `EMP Warhead T${tier}`,
            'EXPLOSIVE': `Explosive Warhead T${tier}`,
            'GRAY_GOO': `Gray Goo Warhead T${tier}`,
            'HEAT': `Heat Warhead T${tier}`,
            'SHOCKWAVE': `Shockwave Warhead T${tier}`,
            'SUPERCHILL': `Superchill Warhead T${tier}`
        };

        return {
            name: warheadMap[type] || `Generic Warhead T${tier}`,
            quantity: 1
        };
    }

    // Get size scaling components
    getSizeScalingComponents(size, tier) {
        const sizeIndex = this.sizes.indexOf(size);
        const components = [];

        if (sizeIndex >= 3) { // M and larger
            components.push({ name: 'Structural Reinforcement Grid', quantity: 1 });
        }
        if (sizeIndex >= 5) { // L and larger
            components.push({ name: 'Architectural Framework', quantity: Math.ceil(sizeIndex / 2) });
        }
        if (sizeIndex >= 7) { // CMD and larger
            components.push({ name: 'Megastructure Support System', quantity: sizeIndex - 5 });
        }
        if (sizeIndex >= 8) { // CLASS8 and larger
            components.push({ name: 'Gigascale Architecture', quantity: sizeIndex - 6 });
        }
        if (sizeIndex >= 9) { // TTN
            components.push({ name: 'Titan Structural Matrix', quantity: tier });
        }

        return components;
    }

    // Calculate missile construction time
    calculateMissileConstructionTime(size, tier) {
        const sizeMultiplier = Math.pow(2, this.sizes.indexOf(size));
        const tierMultiplier = Math.pow(1.5, tier - 1);
        return Math.round(60 * sizeMultiplier * tierMultiplier); // Base 60 seconds
    }

    // Generate all weapon system recipes
    generateAllWeaponRecipes() {
        console.log('Generating complete weapon system recipe set...');

        for (const type of this.weaponTypes) {
            for (const size of this.sizes) {
                for (const tier of this.tiers) {
                    const weaponName = `Weapon ${type} ${size} T${tier}`;
                    const recipe = this.generateWeaponRecipe(type, size, tier);
                    this.weaponRecipes.set(weaponName, recipe);
                }
            }
        }

        console.log(`Generated ${this.weaponRecipes.size} weapon recipes`);
        return this.weaponRecipes;
    }

    // Generate specific weapon recipe
    generateWeaponRecipe(type, size, tier) {
        const baseComponents = [
            { name: 'Weapon Control System', quantity: 1 },
            { name: 'Targeting Computer', quantity: 1 },
            { name: 'Power Coupling', quantity: 1 },
            { name: 'Weapon Mount', quantity: 1 }
        ];

        // Add type-specific components
        const typeComponents = this.getWeaponTypeComponents(type, tier);
        baseComponents.push(...typeComponents);

        // Add size scaling
        const scalingComponents = this.getSizeScalingComponents(size, tier);
        baseComponents.push(...scalingComponents);

        return this.createRecipeFromComponents(`Weapon ${type} ${size} T${tier}`, 'WEAPON', baseComponents, { weaponType: type, size, tier });
    }

    // Get weapon type specific components
    getWeaponTypeComponents(type, tier) {
        const components = [];

        switch (type) {
            case 'KINETIC':
                components.push(
                    { name: `Railgun Assembly T${tier}`, quantity: 1 },
                    { name: `Kinetic Accelerator T${tier}`, quantity: 1 },
                    { name: `Projectile Feeder T${tier}`, quantity: 1 }
                );
                break;
            case 'ENERGY':
                components.push(
                    { name: `Laser Array T${tier}`, quantity: 1 },
                    { name: `Energy Focusing Lens T${tier}`, quantity: 1 },
                    { name: `Heat Dissipator T${tier}`, quantity: 1 }
                );
                break;
            case 'EMP':
                components.push(
                    { name: `EMP Generator T${tier}`, quantity: 1 },
                    { name: `Electromagnetic Coil T${tier}`, quantity: 2 },
                    { name: `Pulse Shaper T${tier}`, quantity: 1 }
                );
                break;
            case 'SUPERCHILL':
                components.push(
                    { name: `Cryogenic Projector T${tier}`, quantity: 1 },
                    { name: `Supercooling Unit T${tier}`, quantity: 1 },
                    { name: `Thermal Inverter T${tier}`, quantity: 1 }
                );
                break;
        }

        return components;
    }

    // Generate all countermeasure recipes
    generateAllCountermeasureRecipes() {
        console.log('Generating complete countermeasure recipe set...');

        for (const type of this.countermeasureTypes) {
            for (const size of this.sizes) {
                for (const tier of this.tiers) {
                    const countermeasureName = `Countermeasure ${type} ${size} T${tier}`;
                    const recipe = this.generateCountermeasureRecipe(type, size, tier);
                    this.countermeasureRecipes.set(countermeasureName, recipe);
                }
            }
        }

        console.log(`Generated ${this.countermeasureRecipes.size} countermeasure recipes`);
        return this.countermeasureRecipes;
    }

    // Generate specific countermeasure recipe
    generateCountermeasureRecipe(type, size, tier) {
        const baseComponents = [
            { name: 'Defense Controller', quantity: 1 },
            { name: 'Threat Detector', quantity: 1 },
            { name: 'Response System', quantity: 1 }
        ];

        // Add type-specific countermeasure components
        const typeComponents = this.getCountermeasureComponents(type, tier);
        baseComponents.push(...typeComponents);

        // Add size scaling
        const scalingComponents = this.getSizeScalingComponents(size, tier);
        baseComponents.push(...scalingComponents);

        return this.createRecipeFromComponents(`Countermeasure ${type} ${size} T${tier}`, 'COUNTERMEASURE', baseComponents, { countermeasureType: type, size, tier });
    }

    // Get countermeasure type components
    getCountermeasureComponents(type, tier) {
        const components = [];

        switch (type) {
            case 'KINETIC':
                components.push({ name: `Point Defense System T${tier}`, quantity: 1 });
                break;
            case 'ENERGY':
                components.push({ name: `Energy Shield Generator T${tier}`, quantity: 1 });
                break;
            case 'EMP':
                components.push({ name: `EMP Hardening Suite T${tier}`, quantity: 1 });
                break;
            default:
                components.push({ name: `Generic Defense Module T${tier}`, quantity: 1 });
        }

        return components;
    }

    // Create recipe from component list
    createRecipeFromComponents(name, type, components, metadata = {}) {
        const totalRawResources = new Map();
        const ingredientRecipes = [];
        let totalSteps = 1;

        for (const component of components) {
            const recipe = this.generateCompleteRecipe(component.name);
            if (!recipe.error) {
                ingredientRecipes.push({
                    ...recipe,
                    requiredQuantity: component.quantity
                });

                // Accumulate raw resources
                if (recipe.rawResourcesRequired) {
                    for (const [resource, quantity] of recipe.rawResourcesRequired) {
                        const current = totalRawResources.get(resource) || 0;
                        totalRawResources.set(resource, current + (quantity * component.quantity));
                    }
                }

                totalSteps += recipe.totalProductionSteps * component.quantity;
            }
        }

        return {
            name,
            type,
            ...metadata,
            constructionTime: this.calculateConstructionTime(type, metadata.size, metadata.tier),
            ingredients: ingredientRecipes,
            rawResourcesRequired: totalRawResources,
            totalProductionSteps: totalSteps,
            complexity: this.calculateComplexity(ingredientRecipes, totalRawResources, totalSteps)
        };
    }

    // Calculate construction time based on type and properties
    calculateConstructionTime(type, size, tier) {
        let baseTime = 100;

        switch (type) {
            case 'MISSILE': baseTime = 60; break;
            case 'WEAPON': baseTime = 300; break;
            case 'COUNTERMEASURE': baseTime = 180; break;
            default: baseTime = 100;
        }

        if (size && tier) {
            const sizeMultiplier = Math.pow(2, this.sizes.indexOf(size));
            const tierMultiplier = Math.pow(1.5, tier - 1);
            return Math.round(baseTime * sizeMultiplier * tierMultiplier);
        }

        return baseTime;
    }

    // Generate recipes for ALL components to ensure 100% utilization
    generateRecipesForAllComponents() {
        console.log('Generating recipes for ALL components to ensure 100% utilization...');

        let generatedCount = 0;

        for (const [name, component] of this.components) {
            if (!this.rawResources.has(name) && !this.completeRecipes.has(name)) {
                const recipe = this.generateCompleteRecipe(name);
                if (!recipe.error) {
                    generatedCount++;
                }
            }
        }

        console.log(`Generated ${generatedCount} individual component recipes`);

        // Mark unused components
        for (const [name] of this.components) {
            if (!this.componentUsage.has(name) && !this.rawResources.has(name)) {
                this.unusedComponents.add(name);
            }
        }

        console.log(`Found ${this.unusedComponents.size} unused components`);
    }

    // Generate complete analysis and validation
    generateCompleteAnalysis() {
        const analysis = {
            overview: {
                totalComponents: this.components.size,
                totalRawResources: this.rawResources.size,
                totalRecipes: this.completeRecipes.size,
                totalMissileRecipes: this.missileRecipes.size,
                totalWeaponRecipes: this.weaponRecipes.size,
                totalCountermeasureRecipes: this.countermeasureRecipes.size,
                totalGeneratedProducts: this.missileRecipes.size + this.weaponRecipes.size + this.countermeasureRecipes.size
            },
            utilization: {
                usedComponents: this.componentUsage.size,
                unusedComponents: this.unusedComponents.size,
                utilizationPercentage: Math.round((this.componentUsage.size / this.components.size) * 100)
            },
            validation: {
                missingComponents: Array.from(this.missingComponents),
                circularDependencies: Array.from(this.circularDependencies),
                missingCount: this.missingComponents.size,
                circularCount: this.circularDependencies.size
            },
            categories: Object.fromEntries(
                Object.entries(this.categories).map(([key, set]) => [key, set.size])
            ),
            rawResourceAnalysis: this.analyzeRawResources(),
            complexityAnalysis: this.analyzeComplexity(),
            productionChainDepth: this.analyzeProductionChainDepth()
        };

        return analysis;
    }

    // Analyze raw resource usage and distribution
    analyzeRawResources() {
        const analysis = {
            byPlanetType: new Map(),
            byTier: new Map(),
            byUsage: new Map(),
            unused: []
        };

        for (const [name, resource] of this.rawResources) {
            // Group by planet types
            for (const planet of resource.planetTypes) {
                if (!analysis.byPlanetType.has(planet)) {
                    analysis.byPlanetType.set(planet, []);
                }
                analysis.byPlanetType.get(planet).push(name);
            }

            // Group by tier
            if (!analysis.byTier.has(resource.tier)) {
                analysis.byTier.set(resource.tier, []);
            }
            analysis.byTier.get(resource.tier).push(name);

            // Track usage
            const usage = this.componentUsage.get(name) || 0;
            analysis.byUsage.set(name, usage);

            if (usage === 0) {
                analysis.unused.push(name);
            }
        }

        return {
            byPlanetType: Object.fromEntries(analysis.byPlanetType),
            byTier: Object.fromEntries(analysis.byTier),
            mostUsed: Array.from(analysis.byUsage.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10),
            unused: analysis.unused
        };
    }

    // Analyze recipe complexity distribution
    analyzeComplexity() {
        const complexities = [];

        for (const [name, recipe] of this.completeRecipes) {
            complexities.push({
                name,
                complexity: recipe.complexity,
                steps: recipe.totalProductionSteps,
                rawResourceCount: recipe.rawResourcesRequired.size
            });
        }

        complexities.sort((a, b) => b.complexity - a.complexity);

        return {
            mostComplex: complexities.slice(0, 10),
            averageComplexity: complexities.reduce((sum, r) => sum + r.complexity, 0) / complexities.length,
            complexityDistribution: this.getComplexityDistribution(complexities)
        };
    }

    // Get complexity distribution
    getComplexityDistribution(complexities) {
        const distribution = { low: 0, medium: 0, high: 0, extreme: 0 };

        for (const item of complexities) {
            if (item.complexity < 10) distribution.low++;
            else if (item.complexity < 50) distribution.medium++;
            else if (item.complexity < 100) distribution.high++;
            else distribution.extreme++;
        }

        return distribution;
    }

    // Analyze production chain depth
    analyzeProductionChainDepth() {
        const depths = [];

        for (const [name, recipe] of this.completeRecipes) {
            depths.push({
                name,
                depth: this.calculateRecipeDepth(recipe),
                steps: recipe.totalProductionSteps
            });
        }

        depths.sort((a, b) => b.depth - a.depth);

        return {
            deepest: depths.slice(0, 10),
            averageDepth: depths.reduce((sum, r) => sum + r.depth, 0) / depths.length,
            maxDepth: depths[0]?.depth || 0
        };
    }

    // Calculate recipe depth (how many layers deep the recipe goes)
    calculateRecipeDepth(recipe, depth = 0) {
        if (recipe.type === 'RAW_RESOURCE' || !recipe.ingredients || recipe.ingredients.length === 0) {
            return depth;
        }

        let maxDepth = depth;
        for (const ingredient of recipe.ingredients) {
            const ingredientDepth = this.calculateRecipeDepth(ingredient, depth + 1);
            maxDepth = Math.max(maxDepth, ingredientDepth);
        }

        return maxDepth;
    }

    // Generate the complete system with all recipes and analysis
    generateCompleteSystem() {
        console.log('=== GENERATING COMPLETE RECIPE SYSTEM ===');
        console.log('This system generates EVERY SINGLE RECIPE for ALL ingredients');
        console.log('Ensuring complete traceability back to raw resources');

        // Step 1: Generate recipes for all individual components
        this.generateRecipesForAllComponents();

        // Step 2: Generate all missile recipes (9 types × 10 sizes × 5 tiers = 450)
        this.generateAllMissileRecipes();

        // Step 3: Generate all weapon recipes (4 types × 10 sizes × 5 tiers = 200)
        this.generateAllWeaponRecipes();

        // Step 4: Generate all countermeasure recipes (9 types × 10 sizes × 5 tiers = 450)
        this.generateAllCountermeasureRecipes();

        // Step 5: Generate complete analysis
        const analysis = this.generateCompleteAnalysis();

        console.log('=== COMPLETE SYSTEM GENERATED ===');
        console.log(`Total components: ${this.components.size}`);
        console.log(`Total recipes generated: ${this.completeRecipes.size}`);
        console.log(`Total missile variants: ${this.missileRecipes.size}`);
        console.log(`Total weapon variants: ${this.weaponRecipes.size}`);
        console.log(`Total countermeasure variants: ${this.countermeasureRecipes.size}`);
        console.log(`Component utilization: ${analysis.utilization.utilizationPercentage}%`);
        console.log(`Missing components: ${analysis.validation.missingCount}`);
        console.log(`Circular dependencies: ${analysis.validation.circularCount}`);

        return {
            // Core data
            components: this.components,
            rawResources: this.rawResources,

            // All generated recipes
            recipes: this.completeRecipes,
            missileRecipes: this.missileRecipes,
            weaponRecipes: this.weaponRecipes,
            countermeasureRecipes: this.countermeasureRecipes,

            // Analysis and validation
            analysis,

            // Categories and usage
            categories: Object.fromEntries(
                Object.entries(this.categories).map(([key, set]) => [key, Array.from(set)])
            ),
            componentUsage: Object.fromEntries(this.componentUsage),
            unusedComponents: Array.from(this.unusedComponents),

            // Issues
            missingComponents: Array.from(this.missingComponents),
            circularDependencies: Array.from(this.circularDependencies)
        };
    }
}

// Export utility function to generate complete system from CSV
export const generateCompleteRecipeSystem = async (csvData) => {
    const system = new CompleteRecipeSystem();
    system.loadCompleteDataset(csvData);
    return system.generateCompleteSystem();
};

// Export validation function
export const validateCompleteSystem = (completeSystem) => {
    const validation = {
        isComplete: true,
        issues: [],
        summary: {}
    };

    // Check if all components are used
    if (completeSystem.unusedComponents.length > 0) {
        validation.issues.push(`${completeSystem.unusedComponents.length} components are unused`);
        validation.isComplete = false;
    }

    // Check for missing components
    if (completeSystem.missingComponents.length > 0) {
        validation.issues.push(`${completeSystem.missingComponents.length} components are missing`);
        validation.isComplete = false;
    }

    // Check for circular dependencies
    if (completeSystem.circularDependencies.length > 0) {
        validation.issues.push(`${completeSystem.circularDependencies.length} circular dependencies found`);
        validation.isComplete = false;
    }

    validation.summary = {
        totalComponents: completeSystem.components.size,
        totalRecipes: completeSystem.recipes.size + completeSystem.missileRecipes.size + completeSystem.weaponRecipes.size + completeSystem.countermeasureRecipes.size,
        utilizationPercentage: completeSystem.analysis.utilization.utilizationPercentage,
        isComplete: validation.isComplete
    };

    return validation;
}; 