#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recipe System Transformation Script
 * 
 * This script transforms the existing tier-based recipe system to a size-based
 * system with new ingredients based on ALLCOMPONENTS.md and NEWINGREDIENTS.md
 */

// Component categories mapping
const COMPONENT_CATEGORIES = {
    'ENERGY': 'ENERGY',
    'ELECTROMAGNETIC': 'ELECTROMAGNETIC',
    'THERMAL': 'THERMAL',
    'KINETIC': 'KINETIC',
    'DEFENSIVE': 'DEFENSIVE',
    'WEAPONS': 'WEAPONS',
    'PROPULSION': 'PROPULSION',
    'UTILITY': 'UTILITY',
    'HABITAT': 'HABITAT'
};

// Ship sizes in order
const SHIP_SIZES = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];

// Base construction times by size
const BASE_CONSTRUCTION_TIMES = {
    'XXXS': 60,
    'XXS': 120,
    'XS': 180,
    'S': 240,
    'M': 300,
    'L': 360,
    'CAP': 420,
    'CMD': 480,
    'CLASS8': 540,
    'TTN': 600
};

// Tier mappings for ingredients
const TIER_MAPPINGS = {
    'T1': 1,
    'T2': 2,
    'T3': 3,
    'T4': 4,
    'T5': 5
};

class RecipeTransformer {
    constructor() {
        this.allComponents = new Map();
        this.newIngredients = new Map();
        this.oldIngredients = new Set();
        this.ingredientUsage = new Map();
        this.categoryMapping = new Map();
    }

    // Parse ALLCOMPONENTS.md to extract recipes
    parseAllComponents() {
        console.log('📖 Parsing ALLCOMPONENTS.md...');

        const content = fs.readFileSync('data/ALLCOMPONENTS.md', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        console.log(`File content length: ${content.length}`);
        console.log(`Number of lines: ${lines.length}`);
        console.log(`First line: ${lines[0]?.substring(0, 100)}...`);

        for (const line of lines) {
            if (line.includes(' - ')) {
                // Component definition line - split on dash and parse category/recipes
                const dashIndex = line.indexOf(' - ');
                if (dashIndex !== -1) {
                    const componentName = line.substring(0, dashIndex).trim();
                    const afterDash = line.substring(dashIndex + 3).trim(); // Skip ' - '

                    // Find where category ends and recipes begin
                    // Category is word characters, then immediately followed by size (XXXS, XXS, etc.)
                    const categoryMatch = afterDash.match(/^(\w+)(.*)/);
                    if (categoryMatch) {
                        const category = categoryMatch[1].trim();
                        const recipesText = categoryMatch[2].trim();

                        console.log(`Processing: ${componentName} - ${category}`);
                        console.log(`Recipes text: ${recipesText.substring(0, 100)}...`);

                        this.categoryMapping.set(componentName, category);

                        // Parse recipes for each size
                        const recipes = this.parseRecipeString(recipesText);
                        console.log(`Parsed ${recipes.size} recipes for ${componentName}`);

                        if (recipes.size > 0) {
                            this.allComponents.set(componentName, recipes);
                        }
                    } else {
                        console.log(`Could not parse category from: ${afterDash.substring(0, 100)}...`);
                    }
                } else {
                    console.log(`No dash found in line: ${line.substring(0, 100)}...`);
                }
            }
        }

        console.log(`✅ Parsed ${this.allComponents.size} components`);
    }

    // Parse recipe string to extract size-based recipes
    parseRecipeString(recipesText) {
        const recipes = new Map();

        // Split by size patterns and parse each section
        const sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];

        // Find all size positions in the text
        const sizePositions = [];
        for (const size of sizes) {
            const pattern = new RegExp(`\\b${size}:`, 'g');
            let match;
            while ((match = pattern.exec(recipesText)) !== null) {
                sizePositions.push({
                    size: size,
                    position: match.index,
                    fullMatch: match[0]
                });
            }
        }

        // Sort by position
        sizePositions.sort((a, b) => a.position - b.position);

        console.log(`    Found ${sizePositions.length} size positions`);

        // Extract ingredients for each size
        for (let i = 0; i < sizePositions.length; i++) {
            const current = sizePositions[i];
            const next = sizePositions[i + 1];

            // Get the text between this size and the next (or end of string)
            const startPos = current.position + current.fullMatch.length;
            const endPos = next ? next.position : recipesText.length;
            const ingredientsText = recipesText.substring(startPos, endPos).trim();

            console.log(`    Processing size ${current.size}: ${ingredientsText.substring(0, 50)}...`);

            if (ingredientsText) {
                // Extract ingredients (split by + and clean)
                const ingredients = ingredientsText
                    .split(/\s*\+\s*/)
                    .map(ing => ing.trim())
                    .filter(ing => ing && !ing.includes('→') && !ing.includes('raw resources'))
                    .map(ing => ing.replace(/\s*→.*$/, '').trim())
                    .filter(ing => ing.length > 0);

                console.log(`    Found ${ingredients.length} ingredients for ${current.size}: ${ingredients.join(', ')}`);

                if (ingredients.length > 0) {
                    recipes.set(current.size, ingredients);

                    // Track ingredient usage
                    ingredients.forEach(ingredient => {
                        if (!this.ingredientUsage.has(ingredient)) {
                            this.ingredientUsage.set(ingredient, new Set());
                        }
                        this.ingredientUsage.get(ingredient).add(current.size);
                    });
                }
            }
        }

        return recipes;
    }

    // Parse NEWINGREDIENTS.md to extract ingredient tiers
    parseNewIngredients() {
        console.log('📖 Parsing NEWINGREDIENTS.md...');

        const content = fs.readFileSync('data/NEWINGREDIENTS.md', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        let currentTier = null;
        let currentCategory = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Check for tier headers
            if (trimmed.match(/^T[1-5]\s+Ingredients/)) {
                currentTier = trimmed.match(/^T([1-5])/)[1];
                currentCategory = null;
                continue;
            }

            // Check for single-size headers
            if (trimmed.includes('Single-Size')) {
                currentTier = '1'; // Default to T1 for single-size
                currentCategory = null;
                continue;
            }

            // Check for category headers
            if (trimmed.match(/^[A-Z]+$/)) {
                currentCategory = trimmed;
                continue;
            }

            // Ingredient line
            if (trimmed && currentTier && currentCategory && !trimmed.includes('raw resources')) {
                this.newIngredients.set(trimmed, {
                    tier: parseInt(currentTier),
                    category: currentCategory,
                    rawResourceCount: this.estimateRawResourceCount(currentTier)
                });
            }
        }

        console.log(`✅ Parsed ${this.newIngredients.size} new ingredients`);
    }

    // Estimate raw resource count based on tier
    estimateRawResourceCount(tier) {
        const ranges = {
            '1': [2, 3],
            '2': [3, 4],
            '3': [4, 5],
            '4': [5, 7],
            '5': [6, 8]
        };

        const range = ranges[tier] || [2, 3];
        return Math.floor((range[0] + range[1]) / 2);
    }

    // Parse existing CSV to identify old ingredients
    parseExistingCSV() {
        console.log('📖 Parsing existing finalComponentList.csv...');

        const content = fs.readFileSync('finalComponentList.csv', 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            if (columns.length > 11) {
                // Extract ingredients from columns 11 onwards (every 2nd column)
                for (let j = 11; j < columns.length; j += 2) {
                    const ingredient = columns[j]?.trim();
                    if (ingredient && ingredient !== '') {
                        this.oldIngredients.add(ingredient);
                    }
                }
            }
        }

        console.log(`✅ Found ${this.oldIngredients.size} existing ingredients`);
    }

    // Parse CSV line handling quoted values
    parseCSVLine(line) {
        const columns = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                inQuotes = false;
            } else if (char === ',' && !inQuotes) {
                columns.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        columns.push(current.trim());
        return columns;
    }

    // Generate new CSV data
    generateNewCSV() {
        console.log('🔄 Generating new CSV data...');

        const csvLines = [];

        // Header
        const header = 'OutputID,OutputName,OutputType,ComponentCategory,Size,OutputTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2,Ingredient3,Quantity3,Ingredient4,Quantity4,Ingredient5,Quantity5,Ingredient6,Quantity6,Ingredient7,Quantity7,Ingredient8,Quantity8,Ingredient9,Quantity9,Column 28,Column 29,Column 30,Column 31';
        csvLines.push(header);

        // Generate final components
        this.allComponents.forEach((recipes, componentName) => {
            const category = this.categoryMapping.get(componentName);

            if (!category) {
                console.log(`Warning: No category found for ${componentName}`);
                return;
            }

            recipes.forEach((ingredients, size) => {
                // For each tier (1-5)
                for (let tier = 1; tier <= 5; tier++) {
                    const outputId = this.generateOutputId(componentName, size, tier);
                    const outputName = `${componentName} ${size} T${tier}`;
                    const outputType = this.getOutputType(componentName, category);
                    const constructionTime = this.calculateConstructionTime(size, tier);
                    const planetTypes = this.getPlanetTypes(tier);
                    const factions = this.getFactions(tier);
                    const resourceType = this.getResourceType(outputType);
                    const productionSteps = ingredients.length + 1;

                    // Build ingredient columns
                    const ingredientColumns = [];

                    // First ingredient is previous tier (except T1)
                    if (tier > 1) {
                        const prevTierName = `${componentName} ${size} T${tier - 1}`;
                        ingredientColumns.push(prevTierName, '1');
                    }

                    // Add base ingredients
                    ingredients.forEach(ingredient => {
                        ingredientColumns.push(ingredient, '1');
                    });

                    // Pad to 18 ingredient columns (9 ingredients × 2 columns each)
                    while (ingredientColumns.length < 18) {
                        ingredientColumns.push('', '');
                    }

                    // Build full row
                    const row = [
                        outputId,
                        outputName,
                        outputType,
                        category,
                        size,
                        tier,
                        constructionTime,
                        planetTypes,
                        factions,
                        resourceType,
                        productionSteps,
                        ...ingredientColumns,
                        '', '', '', '' // Column 28-31
                    ];

                    csvLines.push(row.join(','));
                }
            });
        });

        // Generate ingredient entries
        this.newIngredients.forEach((ingredientData, ingredientName) => {
            const { tier, category, rawResourceCount } = ingredientData;

            const outputId = this.generateIngredientId(ingredientName);
            const outputName = ingredientName;
            const outputType = 'INGREDIENT';
            const constructionTime = tier * 30; // Base time based on tier
            const planetTypes = this.getPlanetTypes(tier);
            const factions = this.getFactions(tier);
            const resourceType = 'ELECTRONIC_COMPONENT';
            const productionSteps = rawResourceCount;

            // For ingredients, we'll add placeholder raw resources
            const ingredientColumns = [];
            for (let i = 0; i < Math.min(rawResourceCount, 9); i++) {
                ingredientColumns.push(`${category}_Raw_${i + 1}`, '1');
            }

            // Pad to 18 columns
            while (ingredientColumns.length < 18) {
                ingredientColumns.push('', '');
            }

            const row = [
                outputId,
                outputName,
                outputType,
                category,
                '', // Size (empty for ingredients)
                tier,
                constructionTime,
                planetTypes,
                factions,
                resourceType,
                productionSteps,
                ...ingredientColumns,
                '', '', '', '' // Column 28-31
            ];

            csvLines.push(row.join(','));
        });

        console.log(`✅ Generated ${csvLines.length - 1} CSV entries`);
        return csvLines.join('\n');
    }

    // Helper methods
    generateOutputId(componentName, size, tier) {
        const cleanName = componentName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `${cleanName}-${size.toLowerCase()}-t${tier}`;
    }

    generateIngredientId(ingredientName) {
        return 'ingredient-' + ingredientName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    getOutputType(componentName, category) {
        // Map component types based on name patterns
        if (componentName.includes('Missile')) return 'MISSILES';
        if (componentName.includes('Mine') || componentName.includes('Flare') ||
            componentName.includes('Decoy') || componentName.includes('Healing')) return 'COUNTERMEASURES';
        if (componentName.includes('Module')) return 'SHIP_MODULES';
        if (componentName.includes('Hab')) return 'HAB_ASSETS';
        if (componentName.includes('Beam') || componentName.includes('Cannon') ||
            componentName.includes('Burst') || componentName.includes('Rapidfire') ||
            componentName.includes('Scatterfire')) return 'SHIP_WEAPONS';

        return 'SHIP_COMPONENTS';
    }

    calculateConstructionTime(size, tier) {
        const baseTime = BASE_CONSTRUCTION_TIMES[size] || 120;
        return baseTime * tier;
    }

    getPlanetTypes(tier) {
        const types = {
            1: 'Terrestrial Planet',
            2: 'Terrestrial Planet',
            3: 'Terrestrial Planet;Volcanic Planet;Gas Giant',
            4: 'Volcanic Planet;Ice Planet',
            5: 'Volcanic Planet;Ice Planet'
        };
        return types[tier] || 'Terrestrial Planet';
    }

    getFactions(tier) {
        const factions = {
            1: 'MUD;ONI;USTUR',
            2: 'MUD;ONI;USTUR',
            3: 'MUD;ONI;USTUR',
            4: 'MUD;USTUR',
            5: 'USTUR'
        };
        return factions[tier] || 'MUD;ONI;USTUR';
    }

    getResourceType(outputType) {
        return 'ELECTRONIC_COMPONENT';
    }

    // Analyze ingredient reusability
    analyzeIngredientReusability() {
        console.log('\n📊 Analyzing ingredient reusability...');

        const analysis = {
            totalIngredients: this.newIngredients.size,
            byCategory: {},
            byTier: {},
            byUsage: {
                high: [], // Used in 10+ recipes
                medium: [], // Used in 5-9 recipes
                low: [], // Used in 1-4 recipes
                unused: []
            },
            mostUsed: [],
            categoryDistribution: {},
            tierDistribution: {}
        };

        // Analyze by category and tier
        this.newIngredients.forEach((data, ingredient) => {
            const { category, tier } = data;

            if (!analysis.byCategory[category]) {
                analysis.byCategory[category] = 0;
            }
            analysis.byCategory[category]++;

            if (!analysis.byTier[tier]) {
                analysis.byTier[tier] = 0;
            }
            analysis.byTier[tier]++;
        });

        // Analyze usage patterns
        this.ingredientUsage.forEach((usageSet, ingredient) => {
            const usageCount = usageSet.size;

            if (usageCount >= 10) {
                analysis.byUsage.high.push({ ingredient, count: usageCount });
            } else if (usageCount >= 5) {
                analysis.byUsage.medium.push({ ingredient, count: usageCount });
            } else if (usageCount >= 1) {
                analysis.byUsage.low.push({ ingredient, count: usageCount });
            }
        });

        // Find unused ingredients
        this.newIngredients.forEach((data, ingredient) => {
            if (!this.ingredientUsage.has(ingredient)) {
                analysis.byUsage.unused.push(ingredient);
            }
        });

        // Sort most used
        analysis.mostUsed = [...this.ingredientUsage.entries()]
            .sort((a, b) => b[1].size - a[1].size)
            .slice(0, 20)
            .map(([ingredient, usageSet]) => ({
                ingredient,
                count: usageSet.size,
                sizes: Array.from(usageSet).sort()
            }));

        return analysis;
    }

    // Generate analysis report
    generateAnalysisReport(analysis) {
        console.log('\n📋 INGREDIENT REUSABILITY ANALYSIS');
        console.log('='.repeat(50));

        console.log(`\nTotal new ingredients: ${analysis.totalIngredients}`);

        console.log('\n📊 By Category:');
        Object.entries(analysis.byCategory)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                console.log(`  ${category}: ${count} ingredients`);
            });

        console.log('\n📊 By Tier:');
        Object.entries(analysis.byTier)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([tier, count]) => {
                console.log(`  T${tier}: ${count} ingredients`);
            });

        console.log('\n🔥 Most Reused Ingredients (Top 10):');
        analysis.mostUsed.slice(0, 10).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.ingredient} (used in ${item.count} recipes)`);
            console.log(`     Sizes: ${item.sizes.join(', ')}`);
        });

        console.log('\n📈 Usage Distribution:');
        console.log(`  High usage (10+ recipes): ${analysis.byUsage.high.length} ingredients`);
        console.log(`  Medium usage (5-9 recipes): ${analysis.byUsage.medium.length} ingredients`);
        console.log(`  Low usage (1-4 recipes): ${analysis.byUsage.low.length} ingredients`);
        console.log(`  Unused: ${analysis.byUsage.unused.length} ingredients`);

        if (analysis.byUsage.unused.length > 0) {
            console.log('\n⚠️  Unused Ingredients:');
            analysis.byUsage.unused.forEach(ingredient => {
                console.log(`  - ${ingredient}`);
            });
        }

        console.log('\n💡 Key Insights:');
        console.log(`  - Most reusable ingredient: ${analysis.mostUsed[0]?.ingredient} (${analysis.mostUsed[0]?.count} uses)`);
        console.log(`  - Average reuse rate: ${(this.ingredientUsage.size / analysis.totalIngredients * 100).toFixed(1)}%`);
        console.log(`  - Tier 1 ingredients: ${analysis.byTier[1] || 0} (most basic)`);
        console.log(`  - Tier 5 ingredients: ${analysis.byTier[5] || 0} (most complex)`);
    }

    // Main transformation method
    async transform() {
        console.log('🚀 Starting Recipe System Transformation...\n');

        try {
            // Parse input files
            this.parseAllComponents();
            this.parseNewIngredients();
            this.parseExistingCSV();

            // Generate new CSV
            const newCSV = this.generateNewCSV();

            // Write backup of original
            const backupPath = 'finalComponentList_backup.csv';
            fs.copyFileSync('finalComponentList.csv', backupPath);
            console.log(`💾 Backup created: ${backupPath}`);

            // Write new CSV
            fs.writeFileSync('finalComponentList_new.csv', newCSV);
            console.log('✅ New CSV generated: finalComponentList_new.csv');

            // Generate analysis
            const analysis = this.analyzeIngredientReusability();
            this.generateAnalysisReport(analysis);

            // Write analysis report
            const reportPath = 'ingredient_reusability_report.md';
            this.writeAnalysisReport(analysis, reportPath);
            console.log(`📄 Analysis report written: ${reportPath}`);

            console.log('\n✅ Transformation completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Review the new CSV file: finalComponentList_new.csv');
            console.log('2. Check the analysis report: ingredient_reusability_report.md');
            console.log('3. If satisfied, replace the original: mv finalComponentList_new.csv finalComponentList.csv');

        } catch (error) {
            console.error('❌ Error during transformation:', error);
            throw error;
        }
    }

    // Write detailed analysis report to markdown
    writeAnalysisReport(analysis, filePath) {
        const lines = [
            '# Ingredient Reusability Analysis Report',
            '',
            `**Generated on:** ${new Date().toLocaleString()}`,
            `**Total Ingredients:** ${analysis.totalIngredients}`,
            '',
            '## Category Distribution',
            ''
        ];

        Object.entries(analysis.byCategory)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                lines.push(`- **${category}**: ${count} ingredients`);
            });

        lines.push('', '## Tier Distribution', '');
        Object.entries(analysis.byTier)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([tier, count]) => {
                lines.push(`- **Tier ${tier}**: ${count} ingredients`);
            });

        lines.push('', '## Most Reused Ingredients', '');
        analysis.mostUsed.slice(0, 20).forEach((item, index) => {
            lines.push(`${index + 1}. **${item.ingredient}** (${item.count} uses)`);
            lines.push(`   - Used in sizes: ${item.sizes.join(', ')}`);
        });

        lines.push('', '## Usage Statistics', '');
        lines.push(`- **High usage** (10+ recipes): ${analysis.byUsage.high.length} ingredients`);
        lines.push(`- **Medium usage** (5-9 recipes): ${analysis.byUsage.medium.length} ingredients`);
        lines.push(`- **Low usage** (1-4 recipes): ${analysis.byUsage.low.length} ingredients`);
        lines.push(`- **Unused**: ${analysis.byUsage.unused.length} ingredients`);

        if (analysis.byUsage.unused.length > 0) {
            lines.push('', '## Unused Ingredients', '');
            analysis.byUsage.unused.forEach(ingredient => {
                lines.push(`- ${ingredient}`);
            });
        }

        lines.push('', '## Key Insights', '');
        lines.push(`- Most reusable ingredient: **${analysis.mostUsed[0]?.ingredient}** (${analysis.mostUsed[0]?.count} uses)`);
        lines.push(`- Average reuse rate: **${(this.ingredientUsage.size / analysis.totalIngredients * 100).toFixed(1)}%**`);
        lines.push(`- Tier 1 ingredients: **${analysis.byTier[1] || 0}** (most basic)`);
        lines.push(`- Tier 5 ingredients: **${analysis.byTier[5] || 0}** (most complex)`);

        fs.writeFileSync(filePath, lines.join('\n'));
    }
}

// Main execution
if (require.main === module) {
    const transformer = new RecipeTransformer();
    transformer.transform().catch(console.error);
}

module.exports = { RecipeTransformer }; 