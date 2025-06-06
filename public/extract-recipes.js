// Recipe Extraction Tool for Markdown Documentation
// Extracts detailed recipe information from MD files to populate CSV with missing recipes

class RecipeExtractor {
    constructor() {
        this.extractedRecipes = new Map();
        this.ingredientComponents = new Map();
        this.newIngredients = new Set();
        this.countermeasureTypes = [
            'Decoy', 'Energy Capacitor', 'Fire Suppressor', 'Flare',
            'Healing Nanobots', 'Mine', 'Negative REM Plating',
            'Warming Plates', 'Faraday Shielding'
        ];
        this.sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
        this.tiers = [1, 2, 3, 4, 5];
    }

    // Extract countermeasure recipes from COUNTERMEASURES.md
    extractCountermeasureRecipes(content) {
        console.log('Extracting countermeasure ingredient recipes...');
        console.log('Content length:', content.length, 'characters');

        const lines = content.split('\n');
        const recipes = [];

        // Look for ingredient recipe sections like "### **10. Holographic Projector [ELECTRONIC_COMPONENT]**"
        const ingredientHeaderRegex = /^### \*\*(\d+)\.\s*([^[]+)\s*\[([^\]]+)\]\*\*/;

        console.log('Testing ingredient regex pattern:');
        lines.forEach((line, index) => {
            const match = line.match(ingredientHeaderRegex);
            if (match) {
                console.log(`  "${line}" -> Match: ${match[2].trim()} [${match[3]}]`);
            }
        });

        console.log('Processing', lines.length, 'lines');

        let currentIngredient = null;
        let currentSection = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Debug every processed line
            if (line.length > 0) {
                console.log(`Line ${i}: "${line}"`);
            }

            // Check for ingredient headers
            const ingredientMatch = line.match(ingredientHeaderRegex);
            if (ingredientMatch) {
                // First, process the previous ingredient if it exists
                if (currentIngredient && Object.keys(currentIngredient.sections).length > 0) {
                    console.log(`Processing previous ingredient: ${currentIngredient.name}`);
                    const ingredientRecipes = this.generateIngredientRecipes(currentIngredient);
                    recipes.push(...ingredientRecipes);
                    console.log(`Generated ${ingredientRecipes.length} recipes for ${currentIngredient.name}`);
                }

                // Start processing new ingredient
                const ingredientName = ingredientMatch[2].trim();
                const resourceType = ingredientMatch[3];

                console.log(`Found ingredient: ${ingredientName} [${resourceType}]`);

                currentIngredient = {
                    name: ingredientName,
                    resourceType: resourceType,
                    sections: {}
                };
                currentSection = null;
                continue;
            }

            // Check for recipe section headers like "#### **Projection Core (REQUIRED - Choose 1 from HOLOGRAPHIC Components.csv):**"
            const sectionMatch = line.match(/^#### \*\*([^(]+)\s*\(([^)]+)\):\*\*/);
            if (sectionMatch && currentIngredient) {
                const sectionName = sectionMatch[1].trim();
                const requirements = sectionMatch[2].trim();

                console.log(`  Found section: ${sectionName} (${requirements})`);

                currentSection = {
                    name: sectionName,
                    requirements: requirements,
                    components: []
                };
                currentIngredient.sections[sectionName] = currentSection;
                continue;
            }

            // Extract components from bullet points like "• Laser Array [T3] - Laser-based projection [ELECTRONIC_COMPONENT] (From Components.csv)"
            if (currentSection && line.startsWith('•')) {
                const componentMatch = line.match(/^• ([^[]+)\s*\[([^\]]+)\]\s*-\s*([^[]+)(?:\s*\[([^\]]+)\])?\s*(?:\(([^)]+)\))?/);
                if (componentMatch) {
                    const componentName = componentMatch[1].trim();
                    const tier = componentMatch[2].trim();
                    const description = componentMatch[3].trim();
                    const materialType = componentMatch[4] || currentIngredient.resourceType;
                    const source = componentMatch[5] || 'Unknown';

                    console.log(`    Added component: ${componentName} [${tier}] - ${description}`);

                    currentSection.components.push({
                        name: componentName,
                        tier: tier,
                        description: description,
                        materialType: materialType,
                        source: source
                    });
                }
            }
        }

        // Process the final ingredient if it exists
        if (currentIngredient && Object.keys(currentIngredient.sections).length > 0) {
            console.log(`Processing final ingredient: ${currentIngredient.name}`);
            const ingredientRecipes = this.generateIngredientRecipes(currentIngredient);
            recipes.push(...ingredientRecipes);
            console.log(`Generated ${ingredientRecipes.length} recipes for ${currentIngredient.name}`);
        }

        console.log(`Finished extracting ingredient recipes. Total recipes generated: ${recipes.length}`);
        return recipes;
    }

    generateIngredientRecipes(ingredient) {
        const recipes = [];
        const sections = Object.values(ingredient.sections);

        if (sections.length === 0) return recipes;

        // Generate basic combinations - for now, take first component from each required section
        const requiredSections = sections.filter(s => s.requirements.toLowerCase().includes('required'));
        const optionalSections = sections.filter(s => s.requirements.toLowerCase().includes('optional'));
        const substituteSections = sections.filter(s => s.requirements.toLowerCase().includes('substitute'));

        // For each required section, we need at least one component
        // For substitute sections, we can choose 1-2 components as specified
        // For optional sections, we can choose 0-1 components

        // Generate basic recipe with minimal components
        if (requiredSections.length > 0) {
            const basicIngredients = [];

            // Add one component from each required section
            requiredSections.forEach(section => {
                if (section.components.length > 0) {
                    basicIngredients.push({
                        name: section.components[0].name,
                        resourceType: section.components[0].materialType,
                        tier: section.components[0].tier,
                        quantity: 1
                    });
                }
            });

            // Add one component from each substitute section
            substituteSections.forEach(section => {
                if (section.components.length > 0) {
                    basicIngredients.push({
                        name: section.components[0].name,
                        resourceType: section.components[0].materialType,
                        tier: section.components[0].tier,
                        quantity: 1
                    });
                }
            });

            // Create the basic recipe
            recipes.push({
                outputName: ingredient.name,
                outputType: ingredient.resourceType,
                outputTier: 'T2', // Default tier for ingredients
                constructionTime: 60,
                planetTypes: 'Terrestrial Planet',
                factions: 'OMI',
                resourceType: ingredient.resourceType,
                functionalPurpose: this.determineFunctionalPurpose(ingredient.name),
                usageCategory: 'Ship Components',
                ingredients: basicIngredients
            });
        }

        return recipes;
    }

    // Extract new ingredient recipes from markdown
    extractNewIngredients(content) {
        console.log('Extracting new ingredient definitions...');
        const ingredients = new Map();

        // Simple extraction - just look for ingredient headers we found
        const ingredientPattern = /^### \*\*(\d+)\.\s*([^[]+)\s*\[([^\]]+)\]\*\*/gm;
        let match;

        while ((match = ingredientPattern.exec(content)) !== null) {
            const ingredientName = match[2].trim();
            const materialType = match[3];

            console.log(`Found new ingredient: ${ingredientName} [${materialType}]`);

            ingredients.set(ingredientName, {
                name: ingredientName,
                materialType: materialType,
                function: `${ingredientName} - ${materialType} component`,
                description: `${ingredientName} - ${materialType} component`
            });
        }

        return ingredients;
    }

    // Generate countermeasure variants for all sizes and tiers
    generateCountermeasureVariants(typeData) {
        console.log(`Generating variants for ${typeData.name}...`);
        console.log(`  Base ingredients: ${typeData.baseIngredients.length}`);
        console.log(`  Scaling ingredients: ${typeData.scalingIngredients.length}`);

        let variantCount = 0;
        for (const size of this.sizes) {
            for (const tier of this.tiers) {
                const variant = this.createCountermeasureVariant(typeData, size, tier);
                const key = `countermeasure-${typeData.name.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}-t${tier}`;
                this.extractedRecipes.set(key, variant);
                variantCount++;
            }
        }
        console.log(`  Generated ${variantCount} variants for ${typeData.name}`);
    }

    // Create individual countermeasure variant
    createCountermeasureVariant(typeData, size, tier) {
        const outputName = `${typeData.name} ${size} T${tier}`;
        const outputId = `countermeasure-${typeData.name.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}-t${tier}`;

        // Calculate construction time based on size and tier
        const baseTimes = {
            'XXXS': 60, 'XXS': 120, 'XS': 180, 'S': 240, 'M': 300,
            'L': 360, 'CAP': 420, 'CMD': 480, 'CLASS8': 540, 'TTN': 600
        };
        const constructionTime = (baseTimes[size] || 300) * tier;

        // Determine planet types based on tier
        let planetTypes = 'Terrestrial Planet';
        if (tier >= 3) planetTypes += ';Volcanic Planet;Gas Giant';
        if (tier >= 4) planetTypes = 'Volcanic Planet;Ice Planet';

        // Determine factions based on tier
        let factions = 'MUD;ONI;USTUR';
        if (tier >= 4) factions = 'MUD;USTUR';
        if (tier >= 5) factions = 'USTUR';

        // Build ingredients list
        const ingredients = [];

        // Add base ingredients
        for (const ingredient of typeData.baseIngredients) {
            ingredients.push({
                name: ingredient.name,
                quantity: 1
            });
        }

        // Add scaling ingredients for larger sizes
        if (['L', 'CAP', 'CMD', 'CLASS8', 'TTN'].includes(size)) {
            for (const scalingIngredient of typeData.scalingIngredients) {
                if (scalingIngredient.forSizes.includes(size)) {
                    ingredients.push({
                        name: scalingIngredient.name,
                        quantity: 1
                    });
                }
            }
        }

        // Add tier-scaling ingredient for higher tiers
        if (tier > 1) {
            ingredients.unshift({
                name: `${typeData.name} ${size} T${tier - 1}`,
                quantity: 1
            });
        }

        return {
            outputId: outputId,
            outputName: outputName,
            outputType: 'COUNTERMEASURES',
            outputTier: tier,
            constructionTime: constructionTime,
            planetTypes: planetTypes,
            factions: factions,
            resourceType: 'ELECTRONIC_COMPONENT',
            functionalPurpose: 'CONTROL_SYSTEM',
            usageCategory: 'Ship Components',
            productionSteps: ingredients.length > 0 ? ingredients.length + 1 : 2,
            ingredients: ingredients
        };
    }

    // Generate CSV format output
    generateCSVData() {
        const csvRows = [];

        // CSV header to match your existing format
        csvRows.push('OutputID,OutputName,OutputType,OutputTier,ConstructionTime,PlanetTypes,Factions,ResourceType,FunctionalPurpose,UsageCategory,Ingredient1,Quantity1,Ingredient2,Quantity2,Ingredient3,Quantity3,Ingredient4,Quantity4,Ingredient5,Quantity5,Ingredient6,Quantity6,Ingredient7,Quantity7');

        let outputId = 1;

        for (const recipe of this.extractedRecipes.values()) {
            const row = [
                outputId++,
                `"${recipe.outputName}"`, // Quote name to handle commas
                recipe.outputType,
                recipe.outputTier || 'T2',
                recipe.constructionTime || 60,
                `"${recipe.planetTypes || 'Terrestrial Planet'}"`,
                recipe.factions || 'OMI',
                recipe.resourceType,
                `"${recipe.functionalPurpose}"`,
                `"${recipe.usageCategory || 'Ship Components'}"`
            ];

            // Add ingredients (up to 7 pairs)
            for (let i = 0; i < 7; i++) {
                if (i < recipe.ingredients.length) {
                    row.push(`"${recipe.ingredients[i].name}"`);
                    row.push(recipe.ingredients[i].quantity || 1);
                } else {
                    row.push('');
                    row.push('');
                }
            }

            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }

    // Generate ingredient recipes CSV
    generateIngredientCSV() {
        const csvLines = [];
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'Usage Category',
            'ProductionSteps', 'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2',
            'Ingredient3', 'Quantity3', 'Ingredient4', 'Quantity4'
        ];

        csvLines.push(headers.join(','));

        for (const [name, ingredient] of this.ingredientComponents) {
            const outputId = name.toLowerCase().replace(/\s+/g, '-');

            // Generate a basic recipe for the ingredient
            const csvRow = [
                outputId,
                name,
                'MANUFACTURED_COMPONENT',
                3, // Default tier 3 for new ingredients
                1800, // 30 minutes default
                'Terrestrial Planet;Volcanic Planet',
                'MUD;ONI;USTUR',
                ingredient.materialType,
                'SPECIALIZED_COMPONENT',
                'Countermeasure Components',
                3
            ];

            // Add some basic ingredients based on the first section
            if (ingredient.sections.length > 0) {
                const firstSection = ingredient.sections[0];
                const selectedOptions = firstSection.options.slice(0, 2); // Take first 2 options

                for (let i = 0; i < 4; i++) {
                    if (i < selectedOptions.length) {
                        csvRow.push(selectedOptions[i].name);
                        csvRow.push(1);
                    } else {
                        csvRow.push('');
                        csvRow.push('');
                    }
                }
            } else {
                // No ingredients specified
                for (let i = 0; i < 8; i++) {
                    csvRow.push('');
                }
            }

            csvLines.push(csvRow.join(','));
        }

        return csvLines.join('\n');
    }

    // Main extraction method
    async extractRecipes() {
        try {
            console.log('Starting recipe extraction...');

            // Load COUNTERMEASURES content
            const result = await this.loadCountermeasuresContent();
            if (!result.success) {
                throw new Error(result.error);
            }

            // Extract ingredient recipes (not final products)
            const ingredientRecipes = this.extractCountermeasureRecipes(result.content);
            console.log(`Extracted ${ingredientRecipes.length} ingredient recipes`);

            // Extract new ingredient definitions (for reference)
            const newIngredients = this.extractNewIngredients(result.content);
            console.log(`Extracted ${newIngredients.length} new ingredient definitions`);

            // Store recipes for CSV generation
            this.extractedRecipes = new Map();
            ingredientRecipes.forEach((recipe, index) => {
                this.extractedRecipes.set(`recipe_${index}`, recipe);
            });

            // Generate CSV data
            const csvData = this.generateCSVData();
            const ingredientCSV = this.generateIngredientCSV();
            const analysis = this.generateAnalysis();

            return {
                success: true,
                csvData: csvData,
                ingredientCSV: ingredientCSV,
                analysis: analysis,
                newIngredients: newIngredients,
                summary: {
                    totalRecipes: ingredientRecipes.length,
                    newIngredients: newIngredients.size,
                    recipesGenerated: this.extractedRecipes.size
                }
            };
        } catch (error) {
            console.error('Error during extraction:', error);
            return {
                success: false,
                error: error.message,
                csvData: '',
                ingredientCSV: '',
                analysis: ''
            };
        }
    }

    // Generate analysis report
    generateAnalysis() {
        const analysis = {
            overview: {
                totalCountermeasureRecipes: this.extractedRecipes.size,
                totalNewIngredients: this.ingredientComponents.size,
                averageIngredientsPerRecipe: 0
            },
            byType: {},
            byTier: {},
            bySize: {}
        };

        let totalIngredients = 0;

        for (const [id, recipe] of this.extractedRecipes) {
            totalIngredients += recipe.ingredients.length;

            // Extract type from ID
            const typePart = id.split('-')[1];
            if (!analysis.byType[typePart]) {
                analysis.byType[typePart] = 0;
            }
            analysis.byType[typePart]++;

            // By tier
            const tier = recipe.outputTier;
            if (!analysis.byTier[`T${tier}`]) {
                analysis.byTier[`T${tier}`] = 0;
            }
            analysis.byTier[`T${tier}`]++;

            // By size
            const sizePart = id.split('-')[2];
            if (!analysis.bySize[sizePart]) {
                analysis.bySize[sizePart] = 0;
            }
            analysis.bySize[sizePart]++;
        }

        analysis.overview.averageIngredientsPerRecipe = this.extractedRecipes.size > 0
            ? totalIngredients / this.extractedRecipes.size
            : 0;

        return analysis;
    }

    async loadCountermeasuresContent() {
        try {
            // First try embedded content
            const embeddedContent = this.getEmbeddedCountermeasures();
            if (embeddedContent) {
                console.log('Loading COUNTERMEASURES data from embedded content...');
                console.log(`Content loaded successfully: ${embeddedContent.length} characters`);
                return {
                    success: true,
                    content: embeddedContent
                };
            }

            // Fall back to fetching from file
            console.log('Loading COUNTERMEASURES data from file...');
            const response = await fetch('/public/data/COUNTERMEASURES.md');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            console.log(`Content loaded successfully: ${content.length} characters`);

            return {
                success: true,
                content: content
            };
        } catch (error) {
            console.error('Error loading COUNTERMEASURES content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getEmbeddedCountermeasures() {
        // Return the embedded COUNTERMEASURES content
        const embeddedContent = `# COUNTERMEASURES - Detailed Implementation Guide

## **REUSED FROM PREVIOUS BUNDLES (95% REUSE TARGET)**
✅ **All Defense Systems:** Electromagnetic shielding, Energy shields, Armor plating, Safety systems
✅ **All Electronic Systems:** Control modules, Signal processing, Communication systems
✅ **All Energy Systems:** Power generation, Energy storage, Thermal management
✅ **All Bio Systems:** Life support, Medical systems, Bio-processing, Emergency systems
✅ **Electronics Components (42):** Complete electronics infrastructure for countermeasure control
✅ **Power Components (15):** Energy systems for active countermeasure operations
✅ **Structural Components (52):** Deployment systems, Protective casings, Support frameworks
✅ **Bio Components (18):** Medical and emergency response systems for countermeasures
✅ **Raw Resources (125):** Complete raw resource base - 100% utilization maintained

## **NEW COUNTERMEASURE INGREDIENT RECIPES (12 NEW - EXPANDING COMPONENT VARIETY)**

### **10. Holographic Projector [ELECTRONIC_COMPONENT]** *(NEW - Deception Technology)*
**Function:** Advanced holographic image generation for target deception
**Recipe Pattern:** [Projection Core] + [Image Processing] + [Beam Control] + [Optional Enhancement]

#### **Projection Core (REQUIRED - Choose 1 from HOLOGRAPHIC Components.csv):**
\`\`\`
• Laser Array [T3] - Laser-based projection [ELECTRONIC_COMPONENT] (From Components.csv)
• LED Matrix [T2] - LED-based projection [ELECTRONIC_COMPONENT] (From Components.csv)
• Plasma Display [T3] - Plasma-based projection [ELECTRONIC_COMPONENT] (From Components.csv)
• Crystal Display [T3] - Crystal-based projection [ELECTRONIC_COMPONENT] (From Components.csv)
• Quantum Projector [T4] - Quantum projection system [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Image Processing (SUBSTITUTE - Choose 1-2 from IMAGE Components.csv):**
\`\`\`
• Circuit Board [T3] - Advanced image processing [ELECTRONIC_COMPONENT] (REUSED)
• Data Processor [T2] - Image data processing [ELECTRONIC_COMPONENT] (REUSED)
• Graphics Processor [T3] - Graphics processing unit [ELECTRONIC_COMPONENT] (From Components.csv)
• Image Buffer [T2] - Image storage buffer [ELECTRONIC_COMPONENT] (From Components.csv)
• Rendering Engine [T3] - Real-time rendering [ELECTRONIC_COMPONENT] (From Components.csv)
• Pattern Generator [T2] - Pattern generation system [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Beam Control (SUBSTITUTE - Choose 1 from Beam Systems):**
\`\`\`
• Beam Focusing Array [From Energy weapons] - Projection beam control (REUSED)
• Focusing Crystal [T2] - Beam focusing [CRYSTAL_PROCESSED] (REUSED)
• Amplification Crystal [T3] - Beam amplification [CRYSTAL_PROCESSED] (REUSED)
• Signal Amplifier [T2] - Signal amplification [ELECTRONIC_COMPONENT] (REUSED)
• Light Control [T2] - Light beam control [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Optional Enhancement (OPTIONAL - Choose 0-1):**
\`\`\`
• 3D Enhancement [T3] - Three-dimensional projection [ELECTRONIC_COMPONENT] (From Components.csv)
• Color Enhancement [T2] - Color projection enhancement [ELECTRONIC_COMPONENT] (From Components.csv)
• Motion Tracking [T3] - Dynamic projection tracking [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

---

### **11. Signal Mimicry [ELECTRONIC_COMPONENT]** *(NEW - Signal Deception)*
**Function:** Electronic signal duplication and deception system
**Recipe Pattern:** [Signal Analysis] + [Pattern Replication] + [Transmission Control] + [Optional Enhancement]

#### **Signal Analysis (REQUIRED - Choose 1 from SIGNAL Components.csv):**
\`\`\`
• Signal Analyzer [T3] - Signal analysis system [ELECTRONIC_COMPONENT] (From Components.csv)
• Spectrum Analyzer [T3] - Frequency spectrum analysis [ELECTRONIC_COMPONENT] (From Components.csv)
• Pattern Detector [T2] - Signal pattern detection [ELECTRONIC_COMPONENT] (From Components.csv)
• Frequency Scanner [T2] - Frequency scanning system [ELECTRONIC_COMPONENT] (From Components.csv)
• Waveform Analyzer [T3] - Waveform analysis system [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Pattern Replication (SUBSTITUTE - Choose 1-2 from REPLICATION Components.csv):**
\`\`\`
• Memory Core [T2] - Signal pattern memory [ELECTRONIC_COMPONENT] (REUSED)
• Pattern Buffer [T2] - Pattern storage buffer [ELECTRONIC_COMPONENT] (From Components.csv)
• Signal Generator [T2] - Signal generation system [ELECTRONIC_COMPONENT] (From Components.csv)
• Waveform Generator [T3] - Waveform generation [ELECTRONIC_COMPONENT] (From Components.csv)
• Modulator [T2] - Signal modulation system [ELECTRONIC_COMPONENT] (From Components.csv)
• Synthesizer [T3] - Signal synthesis system [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Transmission Control (SUBSTITUTE - Choose 1 from Transmission Systems):**
\`\`\`
• Signal Amplifier [T2] - Signal transmission amplification [ELECTRONIC_COMPONENT] (REUSED)
• Transmitter [T2] - Signal transmission system [ELECTRONIC_COMPONENT] (From Components.csv)
• Antenna Array [T2] - Signal transmission antenna [ELECTRONIC_COMPONENT] (From Components.csv)
• Broadcast System [T2] - Signal broadcast system [ELECTRONIC_COMPONENT] (From Components.csv)
• Communication Link [T2] - Communication transmission [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

#### **Optional Enhancement (OPTIONAL - Choose 0-1):**
\`\`\`
• Encryption Mimicry [T3] - Encrypted signal mimicry [ELECTRONIC_COMPONENT] (From Components.csv)
• Multi-Band Support [T3] - Multi-frequency mimicry [ELECTRONIC_COMPONENT] (From Components.csv)
• Adaptive Mimicry [T4] - AI-driven signal adaptation [ELECTRONIC_COMPONENT] (From Components.csv)
\`\`\`

---

### **12. Suppression Agent [BIO_MATTER]** *(NEW - Fire Suppression)*
**Function:** Biological fire suppression and extinguishing agent
**Recipe Pattern:** [Suppression Base] + [Fire Retardant] + [Delivery Enhancement] + [Optional Additive]

#### **Suppression Base (REQUIRED - Choose 1 from SUPPRESSION Components.csv):**
\`\`\`
• Fire Suppressant [T2] - Chemical fire suppressant [BIO_MATTER] (From Components.csv)
• Foam Agent [T1] - Fire suppression foam [BIO_MATTER] (From Components.csv)
• Inert Gas [T1] - Fire suppression gas [BIO_MATTER] (From Components.csv)
• Powder Agent [T1] - Fire suppression powder [BIO_MATTER] (From Components.csv)
• Liquid Agent [T2] - Liquid fire suppressant [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Fire Retardant (SUBSTITUTE - Choose 1-2 from RETARDANT Components.csv):**
\`\`\`
• Marine Bio Filter [T1] - Bio-based fire retardant [BIO_MATTER] (REUSED)
• Algae Cultivation Chamber [T1] - Algae-based suppressant [BIO_MATTER] (REUSED)
• Chemical Retardant [T2] - Chemical fire retardant [BIO_MATTER] (From Components.csv)
• Natural Suppressant [T1] - Natural fire suppressant [BIO_MATTER] (From Components.csv)
• Bio-Suppressant [T2] - Biological suppressant [BIO_MATTER] (From Components.csv)
• Eco-Friendly Agent [T2] - Environmental suppressant [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Delivery Enhancement (SUBSTITUTE - Choose 1 from Delivery Systems):**
\`\`\`
• Deployment System [From countermeasures] - Agent deployment (REUSED)
• Spray System [T1] - Agent spray delivery [BIO_MATTER] (From Components.csv)
• Mist System [T2] - Agent mist delivery [BIO_MATTER] (From Components.csv)
• Injection System [T2] - Agent injection delivery [BIO_MATTER] (From Components.csv)
• Distribution Network [T2] - Agent distribution [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Optional Additive (OPTIONAL - Choose 0-1):**
\`\`\`
• Penetration Enhancer [From penetration systems] - Enhanced penetration (REUSED)
• Cooling Additive [T1] - Additional cooling effect [BIO_MATTER] (From Components.csv)
• Adhesion Enhancer [T1] - Surface adhesion improvement [BIO_MATTER] (From Components.csv)
\`\`\`

---

### **13. Medical Protocol [BIO_MATTER]** *(NEW - Medical Treatment)*
**Function:** Automated medical treatment and healing protocol system
**Recipe Pattern:** [Treatment Database] + [Diagnostic System] + [Therapy Control] + [Optional Enhancement]

#### **Treatment Database (REQUIRED - Choose 1 from MEDICAL Components.csv):**
\`\`\`
• Medical Database [T3] - Medical treatment database [BIO_MATTER] (From Components.csv)
• Treatment Library [T2] - Treatment protocol library [BIO_MATTER] (From Components.csv)
• Healing Protocols [T2] - Healing procedure protocols [BIO_MATTER] (From Components.csv)
• Emergency Procedures [T2] - Emergency medical procedures [BIO_MATTER] (From Components.csv)
• Diagnostic Protocols [T3] - Diagnostic procedure protocols [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Diagnostic System (SUBSTITUTE - Choose 1-2 from DIAGNOSTIC Components.csv):**
\`\`\`
• Life Support Core [From utility systems] - Life support diagnostics (REUSED)
• Health Scanner [T2] - Health diagnostic scanner [BIO_MATTER] (From Components.csv)
• Vital Monitor [T2] - Vital signs monitoring [BIO_MATTER] (From Components.csv)
• Symptom Analyzer [T3] - Medical symptom analysis [BIO_MATTER] (From Components.csv)
• Bio Scanner [T3] - Biological system scanner [BIO_MATTER] (From Components.csv)
• Medical Sensor [T2] - Medical sensor array [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Therapy Control (SUBSTITUTE - Choose 1 from Therapy Systems):**
\`\`\`
• Treatment Controller [T3] - Medical treatment control [BIO_MATTER] (From Components.csv)
• Therapy System [T2] - Therapeutic treatment system [BIO_MATTER] (From Components.csv)
• Drug Delivery [T2] - Medication delivery system [BIO_MATTER] (From Components.csv)
• Surgical Assistant [T3] - Automated surgical assistance [BIO_MATTER] (From Components.csv)
• Recovery System [T2] - Patient recovery system [BIO_MATTER] (From Components.csv)
\`\`\`

#### **Optional Enhancement (OPTIONAL - Choose 0-1):**
\`\`\`
• AI Diagnosis [T4] - AI-assisted medical diagnosis [BIO_MATTER] (From Components.csv)
• Remote Monitoring [T3] - Remote medical monitoring [BIO_MATTER] (From Components.csv)
• Precision Medicine [T4] - Personalized medical treatment [BIO_MATTER] (From Components.csv)
\`\`\``;

        return embeddedContent;
    }

    determineFunctionalPurpose(name) {
        const nameUpper = name.toUpperCase();

        // Determine functional purpose based on ingredient name
        if (nameUpper.includes('HOLOGRAPHIC') || nameUpper.includes('PROJECTOR')) {
            return 'DECEPTION_SYSTEM';
        } else if (nameUpper.includes('SIGNAL') || nameUpper.includes('MIMICRY')) {
            return 'COMMUNICATION_SYSTEM';
        } else if (nameUpper.includes('SUPPRESSION') || nameUpper.includes('FIRE')) {
            return 'SAFETY_SYSTEM';
        } else if (nameUpper.includes('MEDICAL') || nameUpper.includes('PROTOCOL') || nameUpper.includes('HEALING')) {
            return 'MEDICAL_SYSTEM';
        } else if (nameUpper.includes('SECURITY') || nameUpper.includes('CONTROL')) {
            return 'SECURITY_SYSTEM';
        } else if (nameUpper.includes('ENVIRONMENTAL') || nameUpper.includes('CLIMATE')) {
            return 'ENVIRONMENTAL_SYSTEM';
        } else if (nameUpper.includes('ASSEMBLY') || nameUpper.includes('MANUFACTURING')) {
            return 'MANUFACTURING_SYSTEM';
        } else if (nameUpper.includes('PROCESSING') || nameUpper.includes('CORE')) {
            return 'PROCESSING_SYSTEM';
        } else if (nameUpper.includes('LANDING') || nameUpper.includes('PLATFORM')) {
            return 'INFRASTRUCTURE_SYSTEM';
        } else if (nameUpper.includes('COATING') || nameUpper.includes('PAINT')) {
            return 'CUSTOMIZATION_SYSTEM';
        } else if (nameUpper.includes('COMFORT') || nameUpper.includes('PET')) {
            return 'LIFE_SUPPORT_SYSTEM';
        } else {
            return 'SPECIALIZED_COMPONENT';
        }
    }
}

// Usage example and export
if (typeof window !== 'undefined') {
    window.RecipeExtractor = RecipeExtractor;

    // Add convenience function to download CSV
    window.downloadRecipeCSV = async function () {
        const extractor = new RecipeExtractor();
        const result = await extractor.extractRecipes();

        // Download main recipes CSV
        const blob = new Blob([result.csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted_countermeasure_recipes.csv';
        a.click();
        URL.revokeObjectURL(url);

        // Download ingredients CSV
        const ingredientBlob = new Blob([result.ingredientCSV], { type: 'text/csv' });
        const ingredientUrl = URL.createObjectURL(ingredientBlob);
        const a2 = document.createElement('a');
        a2.href = ingredientUrl;
        a2.download = 'extracted_ingredient_recipes.csv';
        a2.click();
        URL.revokeObjectURL(ingredientUrl);

        console.log('Download complete!', result.summary);
        return result;
    };
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeExtractor;
} 