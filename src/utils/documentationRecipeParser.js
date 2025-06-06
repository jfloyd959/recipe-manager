// Documentation-based Recipe Parser
// Parses MD documentation files to generate complete recipes with ingredient chains

class DocumentationRecipeParser {
    constructor() {
        this.recipes = new Map();
        this.rawResources = new Set();
        this.componentsByTier = new Map();
        this.recipePatterns = new Map();
        this.existingComponents = new Set();
        this.ingredientComponents = new Map(); // Store ingredient components for reuse
    }

    // Parse existing CSV to avoid duplicates
    parseExistingCSV(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split('\t');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const fields = this.parseCSVLine(line);
            if (fields.length >= 2 && fields[1]) {
                this.existingComponents.add(fields[1].trim());
            }
        }

        console.log(`Loaded ${this.existingComponents.size} existing components to avoid duplicates`);
    }

    // Parse documentation files and extract recipe patterns
    async parseDocumentationFiles() {
        const docFiles = [
            'MISSILES_PHOTON.md',
            'MISSILES_KINETIC.md',
            'MISSILES_ENERGY.md',
            'MISSILES_EMP.md',
            'MISSILES_EXPLOSIVE.md',
            'MISSILES_GRAY_GOO.md',
            'MISSILES_HEAT.md',
            'MISSILES_SHOCKWAVE.md',
            'MISSILES_SUPERCHILL.md',
            'COUNTERMEASURES.md',
            'SHIP_DEFENSE_SYSTEMS.md',
            'SHIP_MODULES.md',
            'SHIP_POWER_SYSTEMS.md',
            'SHIP_PROPULSION_SYSTEMS.md',
            'SHIP_SENSORS.md',
            'SHIP_UTILITY.md',
            'SHIP_WEAPON_SYSTEMS.md',
            'WEAPONS_EMP_SHIP.md',
            'WEAPONS_ENERGY_SHIP.md',
            'WEAPONS_KINETIC_SHIP.md',
            'WEAPONS_SUPERCHILL_SHIP.md'
        ];

        for (const fileName of docFiles) {
            try {
                // Fixed file path - load from public folder
                const response = await fetch(`/data/${fileName}`);
                if (response.ok) {
                    const content = await response.text();
                    console.log(`Parsing ${fileName}...`);
                    this.parseDocumentationContent(content, fileName);
                } else {
                    console.warn(`Could not load ${fileName}: ${response.status}`);
                }
            } catch (error) {
                console.warn(`Could not load ${fileName}:`, error);
            }
        }
    }

    // Parse individual documentation content
    parseDocumentationContent(content, fileName) {
        const lines = content.split('\n');
        let currentRecipe = null;
        let currentIngredientSection = null;
        let inRecipeSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect main recipe sections (like "1. Photon Payload Kit", "2. Energy Payload Kit", etc.)
            const mainRecipeMatch = line.match(/^### \*\*(\d+)\.\s*(.+?)\*\*/);
            if (mainRecipeMatch) {
                // Save previous recipe
                if (currentRecipe) {
                    this.saveRecipe(currentRecipe);
                }

                const recipeName = mainRecipeMatch[2].trim();
                currentRecipe = {
                    name: recipeName,
                    fileName: fileName,
                    tier: this.inferTierFromName(recipeName),
                    type: this.inferTypeFromFileName(fileName),
                    ingredients: [],
                    pattern: ''
                };
                inRecipeSection = true;
                console.log(`Found recipe: ${recipeName}`);
            }

            // Detect component recipes (like "3. Photon Generator Core [T3]")
            const componentRecipeMatch = line.match(/^### \*\*(\d+)\.\s*(.+?)\s*\[T(\d+)\]\*\*/);
            if (componentRecipeMatch) {
                // Save previous recipe
                if (currentRecipe) {
                    this.saveRecipe(currentRecipe);
                }

                const componentName = componentRecipeMatch[2].trim();
                const tier = parseInt(componentRecipeMatch[3]);
                currentRecipe = {
                    name: componentName,
                    fileName: fileName,
                    tier: tier,
                    type: 'COMPONENT',
                    ingredients: [],
                    pattern: ''
                };
                inRecipeSection = true;
                console.log(`Found component: ${componentName} [T${tier}]`);
            }

            // Detect recipe patterns
            if (line.includes('**Recipe Pattern:**') && currentRecipe) {
                const patternMatch = line.match(/\*\*Recipe Pattern:\*\*\s*(.+)/);
                if (patternMatch) {
                    currentRecipe.pattern = patternMatch[1].trim();
                }
            }

            // Detect ingredient requirement sections
            const ingredientSectionMatch = line.match(/^#### \*\*(.+?)\s*\((.+?)\):\*\*/);
            if (ingredientSectionMatch && currentRecipe) {
                // Save previous ingredient section
                if (currentIngredientSection) {
                    currentRecipe.ingredients.push(currentIngredientSection);
                }

                currentIngredientSection = {
                    name: ingredientSectionMatch[1].trim(),
                    requirement: ingredientSectionMatch[2].trim(),
                    options: []
                };
                console.log(`  Found ingredient section: ${currentIngredientSection.name} (${currentIngredientSection.requirement})`);
            }

            // Collect ingredient options (lines starting with •)
            if (line.startsWith('• ') && currentIngredientSection) {
                const ingredient = this.parseIngredientOption(line);
                if (ingredient) {
                    currentIngredientSection.options.push(ingredient);
                    console.log(`    Added ingredient option: ${ingredient.name}`);
                }
            }

            // Detect raw resources
            if (line.includes('[RAW]')) {
                const rawMatches = line.matchAll(/(\w[\w\s]+?)\s*\[RAW\]/g);
                for (const match of rawMatches) {
                    const rawName = match[1].trim();
                    this.rawResources.add(rawName);
                }
            }

            // End of recipe section
            if (line.startsWith('---') || line.startsWith('## ')) {
                // Save current ingredient section
                if (currentIngredientSection && currentRecipe) {
                    currentRecipe.ingredients.push(currentIngredientSection);
                    currentIngredientSection = null;
                }

                // Save current recipe if we're ending the section
                if (currentRecipe && inRecipeSection) {
                    this.saveRecipe(currentRecipe);
                    currentRecipe = null;
                }
                inRecipeSection = false;
            }
        }

        // Save final recipe and ingredient section
        if (currentIngredientSection && currentRecipe) {
            currentRecipe.ingredients.push(currentIngredientSection);
        }
        if (currentRecipe) {
            this.saveRecipe(currentRecipe);
        }
    }

    // Parse individual ingredient option line
    parseIngredientOption(line) {
        // Examples:
        // • Lumanite [RAW] - Primary exotic energy material (Volcanic Planet)
        // • Energy Core [T3] - Advanced energy storage and management
        // • Photon Generator Core [T3] - Photon beam generation system

        const match = line.match(/^•\s*(.+?)\s*\[(.+?)\]\s*-\s*(.+?)(?:\s*\(([^)]+)\))?$/);
        if (!match) {
            // Try simpler pattern
            const simpleMatch = line.match(/^•\s*(.+?)\s*\[(.+?)\]/);
            if (simpleMatch) {
                return {
                    name: simpleMatch[1].trim(),
                    type: simpleMatch[2].trim(),
                    tier: this.parseTier(simpleMatch[2].trim()),
                    isRaw: simpleMatch[2].trim() === 'RAW',
                    description: '',
                    planets: [],
                    quantity: this.inferQuantityFromType(simpleMatch[2].trim())
                };
            }
            return null;
        }

        const name = match[1].trim();
        const type = match[2].trim();
        const description = match[3].trim();
        const planets = match[4] ? match[4].split(/[,;]/).map(p => p.trim()) : [];

        const tier = this.parseTier(type);
        const isRaw = type === 'RAW';

        if (isRaw) {
            this.rawResources.add(name);
        }

        return {
            name,
            type,
            tier,
            isRaw,
            description,
            planets,
            quantity: this.inferQuantityFromType(type)
        };
    }

    // Parse tier from type string
    parseTier(typeStr) {
        if (typeStr === 'RAW') return 0;
        const tierMatch = typeStr.match(/T(\d+)/);
        return tierMatch ? parseInt(tierMatch[1]) : 1;
    }

    // Infer quantity based on type and tier
    inferQuantityFromType(type) {
        if (type === 'RAW') {
            return Math.floor(Math.random() * 3) + 2; // 2-4 for raw materials
        }

        const tier = this.parseTier(type);
        if (tier >= 4) return 1;
        if (tier >= 2) return Math.floor(Math.random() * 2) + 1; // 1-2
        return Math.floor(Math.random() * 3) + 1; // 1-3
    }

    // Infer tier from recipe name
    inferTierFromName(name) {
        if (name.includes('Core') || name.includes('Advanced')) return 3;
        if (name.includes('Enhanced') || name.includes('Generator')) return 2;
        if (name.includes('Basic') || name.includes('Simple')) return 1;
        return 2; // Default
    }

    // Infer type from filename
    inferTypeFromFileName(fileName) {
        if (fileName.includes('MISSILE')) return 'MISSILE';
        if (fileName.includes('WEAPON')) return 'WEAPON';
        if (fileName.includes('COUNTERMEASURE')) return 'COUNTERMEASURE';
        return 'COMPONENT';
    }

    // Save recipe to the collection
    saveRecipe(recipe) {
        if (!recipe.name || this.existingComponents.has(recipe.name)) {
            return;
        }

        // Generate actual recipe by selecting specific ingredients
        const finalRecipe = this.generateFinalRecipe(recipe);
        if (finalRecipe) {
            this.recipes.set(recipe.name, finalRecipe);

            // Store by tier for scaling
            if (!this.componentsByTier.has(recipe.tier)) {
                this.componentsByTier.set(recipe.tier, []);
            }
            this.componentsByTier.get(recipe.tier).push(recipe.name);

            console.log(`Saved recipe: ${recipe.name} with ${finalRecipe.ingredients.length} ingredients`);
        }
    }

    // Generate final recipe by selecting specific ingredients
    generateFinalRecipe(recipe) {
        const selectedIngredients = [];

        for (const ingredientSection of recipe.ingredients) {
            const requirement = ingredientSection.requirement.toLowerCase();
            const options = ingredientSection.options;

            if (!options || options.length === 0) continue;

            if (requirement.includes('required')) {
                // Required ingredient - choose 1
                const selected = this.selectBestIngredient(options);
                if (selected) selectedIngredients.push(selected);
            } else if (requirement.includes('substitute')) {
                // Substitute ingredients - choose 1-2
                const count = requirement.includes('1-2') ? (Math.random() > 0.6 ? 2 : 1) : 1;
                const selected = this.selectMultipleIngredients(options, count);
                selectedIngredients.push(...selected);
            } else if (requirement.includes('optional')) {
                // Optional ingredient - 50% chance
                if (Math.random() > 0.5) {
                    const selected = this.selectBestIngredient(options);
                    if (selected) selectedIngredients.push(selected);
                }
            }
        }

        // Limit to 9 ingredients maximum
        const finalIngredients = selectedIngredients.slice(0, 9);

        if (finalIngredients.length === 0) {
            return null;
        }

        return {
            name: recipe.name,
            tier: recipe.tier,
            type: recipe.type,
            ingredients: finalIngredients,
            constructionTime: this.calculateConstructionTime(recipe.tier, finalIngredients.length),
            planetTypes: this.determinePlanetTypes(finalIngredients),
            factions: this.determineFactions(recipe),
            resourceType: this.determineResourceType(recipe),
            functionalPurpose: this.determineFunctionalPurpose(recipe),
            usageCategory: this.determineUsageCategory(recipe),
            totalProductionSteps: this.calculateProductionSteps(finalIngredients)
        };
    }

    // Select best ingredient from options (prefer raw materials for base components)
    selectBestIngredient(options) {
        if (!options || options.length === 0) return null;

        // Prefer raw materials if available
        const rawOptions = options.filter(opt => opt.isRaw);
        if (rawOptions.length > 0 && Math.random() > 0.3) {
            return rawOptions[Math.floor(Math.random() * rawOptions.length)];
        }

        return options[Math.floor(Math.random() * options.length)];
    }

    // Select multiple ingredients
    selectMultipleIngredients(options, count) {
        if (!options || options.length === 0) return [];

        const shuffled = [...options].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, options.length));
    }

    // Calculate construction time based on tier and complexity
    calculateConstructionTime(tier, ingredientCount) {
        const baseTimes = { 0: 30, 1: 60, 2: 120, 3: 300, 4: 600, 5: 1200 };
        const baseTime = baseTimes[tier] || 120;
        const complexityMultiplier = 1 + (ingredientCount * 0.2);
        return Math.floor(baseTime * complexityMultiplier);
    }

    // Determine planet types from ingredients
    determinePlanetTypes(ingredients) {
        const planets = new Set();

        for (const ingredient of ingredients) {
            if (ingredient.planets && ingredient.planets.length > 0) {
                ingredient.planets.forEach(planet => planets.add(planet));
            }
        }

        if (planets.size === 0) {
            planets.add('Terrestrial Planet');
        }

        return Array.from(planets).join(';');
    }

    // Determine factions based on tier
    determineFactions(recipe) {
        const allFactions = ['MUD', 'ONI', 'USTUR'];

        if (recipe.tier >= 4) return 'USTUR';
        if (recipe.tier >= 3) return 'MUD;USTUR';

        return allFactions.join(';');
    }

    // Determine resource type
    determineResourceType(recipe) {
        const name = recipe.name.toLowerCase();

        if (name.includes('electronic') || name.includes('circuit') || name.includes('processor')) {
            return 'ELECTRONIC_COMPONENT';
        }
        if (name.includes('energy') || name.includes('power') || name.includes('core')) {
            return 'ENERGY_MATERIAL';
        }
        if (name.includes('alloy') || name.includes('housing') || name.includes('structure')) {
            return 'STRUCTURAL_ALLOY';
        }
        if (name.includes('payload') || name.includes('warhead') || name.includes('explosive')) {
            return 'AMMUNITION_MATERIAL';
        }

        return 'MANUFACTURED_COMPONENT';
    }

    // Determine functional purpose
    determineFunctionalPurpose(recipe) {
        const name = recipe.name.toLowerCase();

        if (name.includes('guidance') || name.includes('targeting')) return 'GUIDANCE_SYSTEM';
        if (name.includes('propulsion') || name.includes('engine')) return 'PROPULSION_SYSTEM';
        if (name.includes('payload') || name.includes('warhead')) return 'WEAPON_SYSTEM';
        if (name.includes('power') || name.includes('energy')) return 'POWER_SYSTEM';
        if (name.includes('defense') || name.includes('shield')) return 'DEFENSE_SYSTEM';

        return 'CONTROL_SYSTEM';
    }

    // Determine usage category
    determineUsageCategory(recipe) {
        const fileName = recipe.fileName.toLowerCase();

        if (fileName.includes('ship')) return 'Ship Components';
        if (fileName.includes('missile')) return 'Missile Components';
        if (fileName.includes('weapon')) return 'Weapon Components';
        if (fileName.includes('countermeasure')) return 'Countermeasure Components';

        return 'General Components';
    }

    // Calculate production steps
    calculateProductionSteps(ingredients) {
        let maxSteps = 1;

        for (const ingredient of ingredients) {
            if (!ingredient.isRaw) {
                maxSteps = Math.max(maxSteps, ingredient.tier + 1);
            }
        }

        return maxSteps;
    }

    // Parse CSV line handling quotes and tabs
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === '\t' && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        fields.push(current);
        return fields;
    }

    // Generate all recipes
    async generateAllRecipes(csvData) {
        console.log('Starting documentation-based recipe generation...');

        console.log('Parsing existing CSV data...');
        this.parseExistingCSV(csvData);

        console.log('Parsing documentation files...');
        await this.parseDocumentationFiles();

        console.log(`Generated ${this.recipes.size} recipes from documentation`);
        console.log(`Found ${this.rawResources.size} raw resources`);

        return {
            recipes: this.recipes,
            rawResources: this.rawResources,
            componentsByTier: this.componentsByTier,
            analysis: this.generateAnalysis()
        };
    }

    // Generate analysis of the recipe system
    generateAnalysis() {
        const totalRecipes = this.recipes.size;
        const tierDistribution = {};
        const typeDistribution = {};

        for (const [name, recipe] of this.recipes) {
            tierDistribution[recipe.tier] = (tierDistribution[recipe.tier] || 0) + 1;
            typeDistribution[recipe.type] = (typeDistribution[recipe.type] || 0) + 1;
        }

        return {
            totalRecipes,
            totalRawResources: this.rawResources.size,
            tierDistribution,
            typeDistribution,
            averageIngredients: this.calculateAverageIngredients(),
            complexityAnalysis: this.analyzeComplexity()
        };
    }

    // Calculate average ingredients per recipe
    calculateAverageIngredients() {
        let totalIngredients = 0;
        let recipeCount = 0;

        for (const [name, recipe] of this.recipes) {
            totalIngredients += recipe.ingredients.length;
            recipeCount++;
        }

        return recipeCount > 0 ? totalIngredients / recipeCount : 0;
    }

    // Analyze recipe complexity
    analyzeComplexity() {
        const complexities = [];

        for (const [name, recipe] of this.recipes) {
            const complexity = recipe.totalProductionSteps * recipe.ingredients.length;
            complexities.push(complexity);
        }

        complexities.sort((a, b) => a - b);

        return {
            min: complexities[0] || 0,
            max: complexities[complexities.length - 1] || 0,
            median: complexities[Math.floor(complexities.length / 2)] || 0,
            average: complexities.reduce((sum, c) => sum + c, 0) / complexities.length || 0
        };
    }
}

export { DocumentationRecipeParser }; 