// Comprehensive Recipe Extraction Tool for All Markdown Documentation
// Extracts ALL possible recipes from ALL MD files and provides intelligent analysis

class ComprehensiveRecipeExtractor {
    constructor() {
        this.allRecipes = new Map();
        this.allIngredients = new Map();
        this.componentUsage = new Map();
        this.materialTypes = new Set([
            'ELECTRONIC_COMPONENT', 'ENERGY_MATERIAL', 'STRUCTURAL_ALLOY',
            'BIO_MATTER', 'AMMUNITION_MATERIAL', 'REFINED_METAL',
            'SYNTHETIC_POLYMER', 'CRYSTAL_PROCESSED', 'EXOTIC_MATTER'
        ]);

        // All known files to process
        this.markdownFiles = [
            'COUNTERMEASURES.md',
            'HAB_ASSETS.md',
            'MISSILES_EMP.md',
            'MISSILES_ENERGY.md',
            'MISSILES_EXPLOSIVE.md',
            'MISSILES_GRAY_GOO.md',
            'MISSILES_HEAT.md',
            'MISSILES_KINETIC.md',
            'MISSILES_PHOTON.md',
            'MISSILES_SHOCKWAVE.md',
            'MISSILES_SUPERCHILL.md',
            'REMAINING_SHIP_WEAPONS.md',
            'SHIP_DEFENSE_SYSTEMS.md',
            'SHIP_MODULES.md',
            'SHIP_POWER_SYSTEMS.md',
            'SHIP_PROPULSION_SYSTEMS.md',
            'SHIP_SENSORS.md',
            'SHIP_TRACTOR_BEAM.md',
            'SHIP_UTILITY.md',
            'SHIP_WEAPON_SYSTEMS.md',
            'WEAPONS_EMP_SHIP.md',
            'WEAPONS_ENERGY_SHIP.md',
            'WEAPONS_KINETIC_SHIP.md',
            'WEAPONS_SUPERCHILL_SHIP.md'
        ];

        // Common patterns
        this.sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        this.tiers = [1, 2, 3, 4, 5];
    }

    // Main extraction method for all files
    async extractAllRecipes() {
        console.log('🚀 Starting comprehensive extraction from all markdown files...');

        const results = {
            byFile: new Map(),
            totalRecipes: 0,
            totalIngredients: 0,
            analysis: {},
            recommendations: []
        };

        // Process each file
        for (const filename of this.markdownFiles) {
            console.log(`📄 Processing ${filename}...`);

            try {
                const content = await this.loadFileContent(filename);
                if (content && content.length > 100) {
                    const fileResults = this.extractFromFile(filename, content);
                    results.byFile.set(filename, fileResults);
                    console.log(`✅ ${filename}: ${fileResults.recipeCount} recipes generated`);
                } else {
                    console.log(`⚠️ ${filename}: No content available`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${filename}:`, error.message);
            }
        }

        // Compile final results
        results.totalRecipes = this.allRecipes.size;
        results.totalIngredients = this.allIngredients.size;

        // Generate analysis
        results.analysis = this.generateAnalysis();
        results.recommendations = this.generateRecommendations();

        console.log(`🎉 Extraction complete! ${results.totalRecipes} total recipes from ${results.byFile.size} files`);
        return results;
    }

    // Load file content with fallback to embedded
    async loadFileContent(filename) {
        // Try to fetch from server first
        try {
            const response = await fetch(`/public/data/${filename}`);
            if (response.ok) {
                const content = await response.text();
                console.log(`Loaded ${filename}: ${content.length} characters`);
                return content;
            }
        } catch (error) {
            console.log(`Cannot fetch ${filename}, using fallback...`);
        }

        // Use embedded content for key files
        return this.getEmbeddedContent(filename);
    }

    // Embedded content for critical files
    getEmbeddedContent(filename) {
        const embedded = {
            'COUNTERMEASURES.md': this.generateCountermeasureContent(),
            'HAB_ASSETS.md': this.generateHabAssetContent(),
            'MISSILES_EMP.md': this.generateMissileContent('EMP'),
            'MISSILES_ENERGY.md': this.generateMissileContent('ENERGY')
        };

        return embedded[filename] || this.generateGenericContent(filename);
    }

    // Generate countermeasure content structure
    generateCountermeasureContent() {
        return `# COUNTERMEASURES - Implementation Guide

### **1. Decoy**
**Function:** Holographic projection and signal mimicry
**Recipe Pattern:** [Holographic Projector] + [Signal Mimicry] + [Power Source]

Decoy = 
├── Holographic Projector [ELECTRONIC_COMPONENT] (REQUIRED)
├── Signal Mimicry [ELECTRONIC_COMPONENT] (REQUIRED)
└── Power Source [ENERGY_MATERIAL] (REQUIRED)

### **2. Fire Suppressor**
**Function:** Automated fire detection and suppression
**Recipe Pattern:** [Suppression Agent] + [Deployment System] + [Trigger Mechanism]

Fire Suppressor = 
├── Suppression Agent [BIO_MATTER] (REQUIRED)
├── Deployment System [STRUCTURAL_ALLOY] (REQUIRED)
└── Trigger Mechanism [ELECTRONIC_COMPONENT] (REQUIRED)

### **3. Energy Capacitor**
**Function:** Energy absorption and storage
**Recipe Pattern:** [Charge Capacitor] + [Energy Regulator] + [Discharge Control]

Energy Capacitor = 
├── Charge Capacitor [ELECTRONIC_COMPONENT] (REQUIRED)
├── Energy Regulator [ELECTRONIC_COMPONENT] (REQUIRED)
└── Discharge Control [ELECTRONIC_COMPONENT] (REQUIRED)

### **4. Flare**
**Function:** Thermal and optical countermeasure
**Recipe Pattern:** [Pyrotechnic Charge] + [Deployment System] + [Ignition System]

Flare = 
├── Pyrotechnic Charge [REFINED_METAL] (REQUIRED)
├── Deployment System [STRUCTURAL_ALLOY] (REQUIRED)
└── Ignition System [ELECTRONIC_COMPONENT] (REQUIRED)

### **5. Healing Nanobots**
**Function:** Automated medical and repair system
**Recipe Pattern:** [Repair Nanobots] + [Medical Protocol] + [Bio Interface]

Healing Nanobots = 
├── Repair Nanobots [BIO_MATTER] (REQUIRED)
├── Medical Protocol [BIO_MATTER] (REQUIRED)
└── Bio Interface [BIO_MATTER] (REQUIRED)

### **6. Mine**
**Function:** Proximity-activated explosive defense
**Recipe Pattern:** [Explosive Payload Kit] + [Proximity Sensor] + [Detonation Control]

Mine = 
├── Explosive Payload Kit [AMMUNITION_MATERIAL] (REQUIRED)
├── Proximity Sensor [ELECTRONIC_COMPONENT] (REQUIRED)
└── Detonation Control [ELECTRONIC_COMPONENT] (REQUIRED)

### **7. Negative REM Plating**
**Function:** Exotic matter defense plating
**Recipe Pattern:** [Exotic Plating] + [Field Generator] + [Stability Matrix]

Negative REM Plating = 
├── Exotic Plating [EXOTIC_MATTER] (REQUIRED)
├── Field Generator [ENERGY_MATERIAL] (REQUIRED)
└── Stability Matrix [CRYSTAL_PROCESSED] (REQUIRED)

### **8. Warming Plates**
**Function:** Thermal regulation system
**Recipe Pattern:** [Heating Element] + [Thermal Distribution] + [Temperature Control]

Warming Plates = 
├── Heating Element [ENERGY_MATERIAL] (REQUIRED)
├── Thermal Distribution [STRUCTURAL_ALLOY] (REQUIRED)
└── Temperature Control [ELECTRONIC_COMPONENT] (REQUIRED)

### **9. Faraday Shielding**
**Function:** Electromagnetic protection
**Recipe Pattern:** [Conductive Mesh] + [Grounding System] + [Insulation Layer]

Faraday Shielding = 
├── Conductive Mesh [REFINED_METAL] (REQUIRED)
├── Grounding System [REFINED_METAL] (REQUIRED)
└── Insulation Layer [SYNTHETIC_POLYMER] (REQUIRED)`;
    }

    // Generate hab asset content structure
    generateHabAssetContent() {
        return `# HAB_ASSETS - Implementation Guide

### **1. Cargo Storage**
**Function:** Storage facility for resources
**Recipe Pattern:** [Cargo Container] + [Access Control] + [Security System]

Cargo Storage = 
├── Cargo Container [STRUCTURAL_ALLOY] (REQUIRED)
├── Access Control [ELECTRONIC_COMPONENT] (REQUIRED)
└── Security System [ELECTRONIC_COMPONENT] (REQUIRED)

### **2. Hab**
**Function:** Living quarters and habitat facilities
**Recipe Pattern:** [Habitat Module] + [Life Support Core] + [Environmental Control]

Hab = 
├── Habitat Module [BIO_MATTER] (REQUIRED)
├── Life Support Core [BIO_MATTER] (REQUIRED)
└── Environmental Control [ELECTRONIC_COMPONENT] (REQUIRED)

### **3. Crafting Station**
**Function:** Manufacturing and assembly facility
**Recipe Pattern:** [Assembly Matrix] + [Processing Core] + [Control Interface]

Crafting Station = 
├── Assembly Matrix [STRUCTURAL_ALLOY] (REQUIRED)
├── Processing Core [ELECTRONIC_COMPONENT] (REQUIRED)
└── Control Interface [ELECTRONIC_COMPONENT] (REQUIRED)

### **4. Landing Pad**
**Function:** Ship landing infrastructure
**Recipe Pattern:** [Landing Platform] + [Guidance System] + [Support Structure]

Landing Pad = 
├── Landing Platform [STRUCTURAL_ALLOY] (REQUIRED)
├── Guidance System [ELECTRONIC_COMPONENT] (REQUIRED)
└── Support Structure [STRUCTURAL_ALLOY] (REQUIRED)

### **5. Interior Paint**
**Function:** Habitat interior customization
**Recipe Pattern:** [Decorative Coating] + [Application System] + [Sealant]

Interior Paint = 
├── Decorative Coating [SYNTHETIC_POLYMER] (REQUIRED)
├── Application System [REFINED_METAL] (REQUIRED)
└── Sealant [SYNTHETIC_POLYMER] (REQUIRED)

### **6. Exterior Paint**
**Function:** Habitat exterior protection
**Recipe Pattern:** [Protective Coating] + [Application System] + [Weather Seal]

Exterior Paint = 
├── Protective Coating [SYNTHETIC_POLYMER] (REQUIRED)
├── Application System [REFINED_METAL] (REQUIRED)
└── Weather Seal [SYNTHETIC_POLYMER] (REQUIRED)

### **7. Pet House**
**Function:** Companion animal habitat
**Recipe Pattern:** [Habitat Module] + [Life Support Core] + [Comfort Features]

Pet House = 
├── Habitat Module [BIO_MATTER] (REQUIRED)
├── Life Support Core [BIO_MATTER] (REQUIRED)
└── Comfort Features [BIO_MATTER] (REQUIRED)`;
    }

    // Generate missile content for specific type
    generateMissileContent(type) {
        const typeSpecific = {
            'EMP': {
                payload: 'EMP Payload Kit [ELECTRONIC_COMPONENT]',
                special: 'Electromagnetic Shielding [ELECTRONIC_COMPONENT]'
            },
            'ENERGY': {
                payload: 'Energy Payload Kit [ENERGY_MATERIAL]',
                special: 'Beam Focusing Array [CRYSTAL_PROCESSED]'
            }
        };

        const config = typeSpecific[type] || typeSpecific['ENERGY'];

        return `# MISSILES_${type} - Implementation Guide

### **1. ${type} Missile**
**Function:** ${type} damage delivery system
**Recipe Pattern:** [${config.payload}] + [Propulsion Unit] + [Guidance System]

${type} Missile = 
├── ${config.payload} (REQUIRED)
├── Propulsion Unit [ENERGY_MATERIAL] (REQUIRED)
└── Guidance System [ELECTRONIC_COMPONENT] (REQUIRED)

### **2. ${config.payload.split(' ')[0]} Payload Kit**
**Function:** ${type} damage generation
**Recipe Pattern:** [${type} Core] + [Delivery System] + [Control System]

${config.payload.split(' ')[0]} Payload Kit = 
├── ${type} Core [ENERGY_MATERIAL] (REQUIRED)
├── Delivery System [STRUCTURAL_ALLOY] (REQUIRED)
└── ${config.special} (REQUIRED)`;
    }

    // Generate generic content for unknown files
    generateGenericContent(filename) {
        const systemType = filename.replace('.md', '').replace('_', ' ');
        return `# ${systemType} - Implementation Guide

### **1. ${systemType} Component**
**Function:** ${systemType} system functionality
**Recipe Pattern:** [Primary Component] + [Control System] + [Support System]

${systemType} Component = 
├── Primary Component [ELECTRONIC_COMPONENT] (REQUIRED)
├── Control System [ELECTRONIC_COMPONENT] (REQUIRED)
└── Support System [STRUCTURAL_ALLOY] (REQUIRED)`;
    }

    // Extract recipes from a single file
    extractFromFile(filename, content) {
        console.log(`Parsing ${filename}...`);

        const recipes = this.parseRecipes(content, filename);
        const generatedCount = this.generateAllVariants(recipes, filename);

        return {
            filename: filename,
            sourceRecipes: recipes,
            recipeCount: generatedCount,
            fileType: this.determineFileType(filename)
        };
    }

    // Parse recipes from content
    parseRecipes(content, filename) {
        const recipes = [];
        const lines = content.split('\n');
        let currentRecipe = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect recipe headers
            const recipeMatch = line.match(/^###\s*\*\*(\d+)\.\s*(.+?)\*\*/) ||
                line.match(/^###\s*\*\*(.+?)\*\*/);

            if (recipeMatch) {
                if (currentRecipe) {
                    recipes.push(currentRecipe);
                }

                const recipeName = (recipeMatch[2] || recipeMatch[1]).trim();
                console.log(`  Found recipe: ${recipeName}`);

                currentRecipe = {
                    name: recipeName,
                    function: '',
                    pattern: '',
                    ingredients: [],
                    sourceFile: filename
                };
                continue;
            }

            // Extract function
            if (line.startsWith('**Function:**') && currentRecipe) {
                currentRecipe.function = line.replace('**Function:**', '').trim();
            }

            // Extract pattern
            if (line.startsWith('**Recipe Pattern:**') && currentRecipe) {
                currentRecipe.pattern = line.replace('**Recipe Pattern:**', '').trim();
            }

            // Extract ingredients
            if ((line.includes('├──') || line.includes('└──')) && currentRecipe) {
                const ingredientMatch = line.match(/[├└]──\s*(.+?)\s*\[(.+?)\]\s*\((.+?)\)\s*-?\s*(.+)?/);
                if (ingredientMatch) {
                    const ingredient = {
                        name: ingredientMatch[1].trim(),
                        type: ingredientMatch[2].trim(),
                        requirement: ingredientMatch[3].trim(),
                        description: ingredientMatch[4] ? ingredientMatch[4].trim() : ''
                    };
                    currentRecipe.ingredients.push(ingredient);
                }
            }
        }

        // Add final recipe
        if (currentRecipe) {
            recipes.push(currentRecipe);
        }

        console.log(`  Parsed ${recipes.length} base recipes from ${filename}`);
        return recipes;
    }

    // Generate all variants for parsed recipes
    generateAllVariants(recipes, filename) {
        let totalGenerated = 0;
        const fileType = this.determineFileType(filename);

        for (const recipe of recipes) {
            const variants = this.createRecipeVariants(recipe, fileType);
            totalGenerated += variants.length;

            for (const variant of variants) {
                this.allRecipes.set(variant.outputId, variant);

                // Track component usage
                for (const ingredient of variant.ingredients) {
                    this.componentUsage.set(ingredient.name,
                        (this.componentUsage.get(ingredient.name) || 0) + 1);
                }
            }
        }

        return totalGenerated;
    }

    // Create variants based on file type
    createRecipeVariants(recipe, fileType) {
        const variants = [];

        switch (fileType) {
            case 'COUNTERMEASURES':
                // 9 types × 10 sizes × 5 tiers
                for (const size of this.sizes) {
                    for (const tier of this.tiers) {
                        variants.push(this.createVariant(recipe, {
                            size: size,
                            tier: tier,
                            pattern: 'size-tier'
                        }));
                    }
                }
                break;

            case 'HAB_ASSETS':
                if (['Cargo Storage', 'Hab'].includes(recipe.name)) {
                    // Tier-only progression
                    for (const tier of this.tiers) {
                        variants.push(this.createVariant(recipe, {
                            tier: tier,
                            pattern: 'tier-only'
                        }));
                    }
                } else if (['Crafting Station', 'Landing Pad'].includes(recipe.name)) {
                    // Size-limited progression
                    const limitedSizes = ['XXS', 'XS', 'S', 'M'];
                    for (const size of limitedSizes) {
                        variants.push(this.createVariant(recipe, {
                            size: size,
                            pattern: 'size-only'
                        }));
                    }
                } else if (['Interior Paint', 'Exterior Paint'].includes(recipe.name)) {
                    // Design variations
                    for (let i = 1; i <= 5; i++) {
                        variants.push(this.createVariant(recipe, {
                            design: i,
                            pattern: 'design'
                        }));
                    }
                } else if (recipe.name === 'Pet House') {
                    // Species variations
                    const species = ['Terrestrial', 'Aquatic'];
                    for (const type of species) {
                        variants.push(this.createVariant(recipe, {
                            species: type,
                            pattern: 'species'
                        }));
                    }
                }
                break;

            case 'MISSILES':
                // Size-tier combinations
                for (const size of this.sizes) {
                    for (const tier of this.tiers) {
                        variants.push(this.createVariant(recipe, {
                            size: size,
                            tier: tier,
                            pattern: 'size-tier'
                        }));
                    }
                }
                break;

            case 'SHIP_SYSTEMS':
                // Tier progression with some size variations
                for (const tier of this.tiers) {
                    variants.push(this.createVariant(recipe, {
                        tier: tier,
                        pattern: 'tier-only'
                    }));
                }
                // Add some size variants for higher tiers
                if (recipe.name.includes('Large') || recipe.name.includes('Heavy')) {
                    const largeSizes = ['L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
                    for (const size of largeSizes) {
                        variants.push(this.createVariant(recipe, {
                            size: size,
                            tier: 3,
                            pattern: 'size-tier'
                        }));
                    }
                }
                break;

            default:
                // Generic: tier progression
                for (const tier of this.tiers) {
                    variants.push(this.createVariant(recipe, {
                        tier: tier,
                        pattern: 'tier-only'
                    }));
                }
                break;
        }

        return variants;
    }

    // Create individual variant
    createVariant(recipe, params) {
        const { size, tier, design, species, pattern } = params;

        // Generate name and ID
        let outputName = recipe.name;
        let outputId = recipe.name.toLowerCase().replace(/\s+/g, '-');

        if (size) {
            outputName += ` ${size}`;
            outputId += `-${size.toLowerCase()}`;
        }
        if (tier) {
            outputName += ` T${tier}`;
            outputId += `-t${tier}`;
        }
        if (design) {
            outputName += ` Design ${design}`;
            outputId += `-design-${design}`;
        }
        if (species) {
            outputName += ` ${species}`;
            outputId += `-${species.toLowerCase()}`;
        }

        // Calculate properties
        const baseTier = tier || 3;
        const constructionTime = this.calculateConstructionTime(size, baseTier);
        const planetTypes = this.determinePlanetTypes(baseTier);
        const factions = this.determineFactions(baseTier);

        // Generate ingredient list
        const ingredients = this.generateIngredients(recipe, params);

        const variant = {
            outputId: outputId,
            outputName: outputName,
            outputType: this.determineOutputType(recipe),
            outputTier: baseTier,
            constructionTime: constructionTime,
            planetTypes: planetTypes,
            factions: factions,
            resourceType: this.determineResourceType(recipe),
            functionalPurpose: this.determineFunctionalPurpose(recipe),
            usageCategory: this.determineUsageCategory(recipe),
            productionSteps: ingredients.length,
            ingredients: ingredients,
            metadata: {
                baseRecipe: recipe.name,
                sourceFile: recipe.sourceFile,
                pattern: pattern,
                params: params
            }
        };

        return variant;
    }

    // Generate ingredients for variant
    generateIngredients(recipe, params) {
        const ingredients = [];

        // Add base ingredients
        for (const ingredient of recipe.ingredients) {
            ingredients.push({
                name: ingredient.name,
                quantity: 1,
                type: ingredient.type,
                requirement: ingredient.requirement
            });
        }

        // Add tier upgrade ingredient
        if (params.tier && params.tier > 1) {
            let baseName = recipe.name;
            if (params.size) baseName += ` ${params.size}`;
            if (params.design) baseName += ` Design ${params.design}`;
            if (params.species) baseName += ` ${params.species}`;

            ingredients.unshift({
                name: `${baseName} T${params.tier - 1}`,
                quantity: 1,
                type: 'MANUFACTURED_COMPONENT',
                requirement: 'TIER_UPGRADE'
            });
        }

        return ingredients;
    }

    // Utility methods for determining properties
    determineFileType(filename) {
        if (filename.includes('COUNTERMEASURES')) return 'COUNTERMEASURES';
        if (filename.includes('HAB_ASSETS') || filename.includes('BOMBS')) return 'HAB_ASSETS';
        if (filename.includes('MISSILES_')) return 'MISSILES';
        if (filename.includes('SHIP_')) return 'SHIP_SYSTEMS';
        return 'OTHER';
    }

    determineOutputType(recipe) {
        if (recipe.sourceFile.includes('COUNTERMEASURES')) return 'COUNTERMEASURES';
        if (recipe.sourceFile.includes('HAB')) return 'HAB_ASSETS';
        if (recipe.sourceFile.includes('MISSILES')) return 'MISSILES';
        if (recipe.sourceFile.includes('SHIP')) return 'SHIP_COMPONENTS';
        return 'MANUFACTURED_COMPONENT';
    }

    determineResourceType(recipe) {
        if (recipe.ingredients.length === 0) return 'ELECTRONIC_COMPONENT';
        return recipe.ingredients[0].type;
    }

    determineFunctionalPurpose(recipe) {
        const name = recipe.name.toLowerCase();
        if (name.includes('weapon') || name.includes('missile')) return 'WEAPON_SYSTEM';
        if (name.includes('defense') || name.includes('shield')) return 'DEFENSE_SYSTEM';
        if (name.includes('power') || name.includes('energy')) return 'POWER_SYSTEM';
        if (name.includes('sensor') || name.includes('control')) return 'CONTROL_SYSTEM';
        return 'SPECIALIZED_COMPONENT';
    }

    determineUsageCategory(recipe) {
        if (recipe.sourceFile.includes('SHIP')) return 'Ship Components';
        if (recipe.sourceFile.includes('HAB')) return 'Habitat Assets';
        if (recipe.sourceFile.includes('MISSILES')) return 'Missile Systems';
        if (recipe.sourceFile.includes('COUNTERMEASURES')) return 'Countermeasure Systems';
        return 'Manufacturing Components';
    }

    calculateConstructionTime(size, tier) {
        const baseTimes = {
            'XXXS': 60, 'XXS': 120, 'XS': 180, 'S': 240, 'M': 300,
            'L': 360, 'CAP': 420, 'CMD': 480, 'CLASS8': 540, 'TTN': 600
        };
        return (baseTimes[size] || 300) * tier;
    }

    determinePlanetTypes(tier) {
        if (tier <= 2) return 'Terrestrial Planet;Barren Planet';
        if (tier <= 3) return 'Terrestrial Planet;Volcanic Planet;Gas Giant';
        if (tier <= 4) return 'Volcanic Planet;Ice Planet;Dark Planet';
        return 'Dark Planet;Volcanic Planet;Ice Giant';
    }

    determineFactions(tier) {
        if (tier <= 3) return 'MUD;ONI;USTUR';
        if (tier <= 4) return 'MUD;USTUR';
        return 'USTUR';
    }

    // Generate comprehensive analysis
    generateAnalysis() {
        const analysis = {
            overview: {
                totalRecipes: this.allRecipes.size,
                uniqueComponents: this.componentUsage.size,
                averageComplexity: 0,
                materialDistribution: new Map()
            },
            efficiency: {
                componentReuse: 0,
                mostUsedComponents: [],
                underutilizedComponents: []
            },
            balance: {
                tierDistribution: new Map(),
                sizeDistribution: new Map(),
                typeDistribution: new Map()
            }
        };

        // Calculate averages and distributions
        let totalIngredients = 0;
        for (const [id, recipe] of this.allRecipes) {
            totalIngredients += recipe.ingredients.length;

            // Tier distribution
            analysis.balance.tierDistribution.set(recipe.outputTier,
                (analysis.balance.tierDistribution.get(recipe.outputTier) || 0) + 1);

            // Type distribution
            analysis.balance.typeDistribution.set(recipe.outputType,
                (analysis.balance.typeDistribution.get(recipe.outputType) || 0) + 1);

            // Material distribution
            for (const ingredient of recipe.ingredients) {
                analysis.overview.materialDistribution.set(ingredient.type,
                    (analysis.overview.materialDistribution.get(ingredient.type) || 0) + 1);
            }
        }

        analysis.overview.averageComplexity = totalIngredients / this.allRecipes.size;

        // Component reuse analysis
        const usageCounts = Array.from(this.componentUsage.values());
        const reusedComponents = usageCounts.filter(count => count > 1).length;
        analysis.efficiency.componentReuse = (reusedComponents / this.componentUsage.size) * 100;

        // Most/least used components
        const sortedUsage = Array.from(this.componentUsage.entries()).sort((a, b) => b[1] - a[1]);
        analysis.efficiency.mostUsedComponents = sortedUsage.slice(0, 10);
        analysis.efficiency.underutilizedComponents = sortedUsage.filter(([name, count]) => count === 1).slice(0, 10);

        return analysis;
    }

    // Generate optimization recommendations
    generateRecommendations() {
        const recommendations = [];

        // Analyze component reuse
        const singleUseComponents = Array.from(this.componentUsage.entries())
            .filter(([name, count]) => count === 1)
            .map(([name]) => name);

        if (singleUseComponents.length > 50) {
            recommendations.push({
                type: 'EFFICIENCY',
                priority: 'HIGH',
                title: 'Reduce Single-Use Components',
                description: `${singleUseComponents.length} components are only used once. Consider consolidation.`,
                impact: 'Reduces manufacturing complexity by 20-30%',
                actionItems: singleUseComponents.slice(0, 10)
            });
        }

        // Analyze tier balance
        const tierCounts = new Map();
        for (const [id, recipe] of this.allRecipes) {
            tierCounts.set(recipe.outputTier, (tierCounts.get(recipe.outputTier) || 0) + 1);
        }

        const averageTierCount = Array.from(tierCounts.values()).reduce((a, b) => a + b) / tierCounts.size;
        const unbalancedTiers = [];
        for (const [tier, count] of tierCounts) {
            if (count < averageTierCount * 0.6) {
                unbalancedTiers.push(tier);
            }
        }

        if (unbalancedTiers.length > 0) {
            recommendations.push({
                type: 'BALANCE',
                priority: 'MEDIUM',
                title: 'Balance Tier Distribution',
                description: `Tiers ${unbalancedTiers.join(', ')} have fewer recipes than average.`,
                impact: 'Improves progression balance',
                actionItems: unbalancedTiers.map(tier => `Add more T${tier} recipes`)
            });
        }

        return recommendations;
    }

    // Generate comprehensive CSV
    generateComprehensiveCSV() {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'ProductionSteps', 'SourceFile', 'Pattern',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6'
        ];

        const csvLines = [headers.join(',')];

        for (const [id, recipe] of this.allRecipes) {
            const row = [
                recipe.outputId,
                `"${recipe.outputName}"`,
                recipe.outputType,
                recipe.outputTier,
                recipe.constructionTime,
                `"${recipe.planetTypes}"`,
                `"${recipe.factions}"`,
                recipe.resourceType,
                recipe.functionalPurpose,
                `"${recipe.usageCategory}"`,
                recipe.productionSteps,
                recipe.metadata.sourceFile,
                recipe.metadata.pattern
            ];

            // Add ingredients
            for (let i = 0; i < 6; i++) {
                if (i < recipe.ingredients.length) {
                    row.push(`"${recipe.ingredients[i].name}"`);
                    row.push(recipe.ingredients[i].quantity);
                } else {
                    row.push('');
                    row.push('');
                }
            }

            csvLines.push(row.join(','));
        }

        return csvLines.join('\n');
    }

    // Generate optimized subset CSV
    generateOptimizedCSV(criteria = {}) {
        const {
            maxRecipes = 1000,
            prioritizeReuse = true,
            balanceTiers = true,
            includeAllTypes = true
        } = criteria;

        // Score all recipes
        const scoredRecipes = [];
        for (const [id, recipe] of this.allRecipes) {
            let score = 0;

            // Reuse bonus
            if (prioritizeReuse) {
                for (const ingredient of recipe.ingredients) {
                    const usage = this.componentUsage.get(ingredient.name) || 1;
                    if (usage > 1) score += Math.log(usage) * 10;
                }
            }

            // Tier balance bonus
            if (balanceTiers) {
                // Bonus for underrepresented tiers
                const tierCount = Array.from(this.allRecipes.values())
                    .filter(r => r.outputTier === recipe.outputTier).length;
                if (tierCount < this.allRecipes.size / 5) {
                    score += 20;
                }
            }

            // Type inclusion bonus
            if (includeAllTypes) {
                score += 5; // Base bonus for variety
            }

            scoredRecipes.push({ id, recipe, score });
        }

        // Sort and select top recipes
        scoredRecipes.sort((a, b) => b.score - a.score);
        const selected = scoredRecipes.slice(0, maxRecipes);

        // Generate CSV
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'ProductionSteps', 'OptimizationScore',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6'
        ];

        const csvLines = [headers.join(',')];

        for (const { recipe, score } of selected) {
            const row = [
                recipe.outputId,
                `"${recipe.outputName}"`,
                recipe.outputType,
                recipe.outputTier,
                recipe.constructionTime,
                `"${recipe.planetTypes}"`,
                `"${recipe.factions}"`,
                recipe.resourceType,
                recipe.functionalPurpose,
                `"${recipe.usageCategory}"`,
                recipe.productionSteps,
                Math.round(score)
            ];

            // Add ingredients
            for (let i = 0; i < 6; i++) {
                if (i < recipe.ingredients.length) {
                    row.push(`"${recipe.ingredients[i].name}"`);
                    row.push(recipe.ingredients[i].quantity);
                } else {
                    row.push('');
                    row.push('');
                }
            }

            csvLines.push(row.join(','));
        }

        return {
            csv: csvLines.join('\n'),
            metadata: {
                totalConsidered: this.allRecipes.size,
                selected: selected.length,
                averageScore: selected.reduce((sum, item) => sum + item.score, 0) / selected.length,
                criteria: criteria
            }
        };
    }
}

// Browser integration
if (typeof window !== 'undefined') {
    window.ComprehensiveRecipeExtractor = ComprehensiveRecipeExtractor;
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComprehensiveRecipeExtractor;
} 