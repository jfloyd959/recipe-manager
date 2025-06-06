#!/usr/bin/env node

// Command-line Recipe Extractor
// Usage: node extract-recipes-cli.js

const fs = require('fs');
const path = require('path');

class RecipeExtractorCLI {
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

    // Extract countermeasure recipes from content
    extractCountermeasureRecipes(content) {
        console.log('📋 Extracting countermeasure recipes...');
        const lines = content.split('\n');
        let currentType = null;
        let inRecipeSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect countermeasure type headers
            const typeMatch = line.match(/^### \*\*(\d+)\.\s*(.+?)\*\*/);
            if (typeMatch) {
                const typeName = typeMatch[2].trim();
                console.log(`  Found: ${typeName}`);

                currentType = {
                    name: typeName,
                    function: '',
                    pattern: '',
                    baseIngredients: [],
                    scalingIngredients: []
                };
                inRecipeSection = true;
                continue;
            }

            // Extract function and pattern
            if (line.startsWith('**Function:**') && currentType) {
                currentType.function = line.replace('**Function:**', '').trim();
            }
            if (line.startsWith('**Recipe Pattern:**') && currentType) {
                currentType.pattern = line.replace('**Recipe Pattern:**', '').trim();
            }

            // Extract base recipe ingredients
            if (line.includes('├──') || line.includes('└──')) {
                const ingredientMatch = line.match(/[├└]──\s*(.+?)\s*\[(.+?)\]\s*\((.+?)\)\s*-\s*(.+)/);
                if (ingredientMatch && currentType) {
                    const ingredient = {
                        name: ingredientMatch[1].trim(),
                        type: ingredientMatch[2].trim(),
                        requirement: ingredientMatch[3].trim(),
                        description: ingredientMatch[4].trim()
                    };
                    currentType.baseIngredients.push(ingredient);
                }
            }

            // Extract scaling ingredients
            if (line.includes('Base Recipe +') && currentType) {
                const scalingMatch = line.match(/Base Recipe \+\s*(.+?)\s*\[(.+?)\]/);
                if (scalingMatch) {
                    const scalingIngredient = {
                        name: scalingMatch[1].trim(),
                        type: scalingMatch[2].trim(),
                        forSizes: ['L', 'CAP', 'CMD', 'CLASS8', 'TTN']
                    };
                    currentType.scalingIngredients.push(scalingIngredient);
                }
            }

            // Save completed type
            if ((line.startsWith('---') || (line.startsWith('### **') && typeMatch)) && currentType && inRecipeSection) {
                this.generateCountermeasureVariants(currentType);
                currentType = null;
                inRecipeSection = false;
            }
        }

        // Save final type
        if (currentType && inRecipeSection) {
            this.generateCountermeasureVariants(currentType);
        }
    }

    // Extract new ingredient recipes
    extractNewIngredients(content) {
        console.log('🧱 Extracting new ingredient recipes...');
        const lines = content.split('\n');
        let currentIngredient = null;
        let currentSection = null;
        let inIngredientSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect new ingredient headers
            const ingredientMatch = line.match(/^### \*\*(\d+)\.\s*(.+?)\s*\[(.+?)\]\*\*/);
            if (ingredientMatch) {
                const ingredientName = ingredientMatch[2].trim();
                const materialType = ingredientMatch[3].trim();

                console.log(`  Found: ${ingredientName} [${materialType}]`);

                currentIngredient = {
                    name: ingredientName,
                    materialType: materialType,
                    function: '',
                    pattern: '',
                    sections: []
                };
                inIngredientSection = true;
                continue;
            }

            // Extract details
            if (line.startsWith('**Function:**') && currentIngredient) {
                currentIngredient.function = line.replace('**Function:**', '').trim();
            }
            if (line.startsWith('**Recipe Pattern:**') && currentIngredient) {
                currentIngredient.pattern = line.replace('**Recipe Pattern:**', '').trim();
            }

            // Extract ingredient sections
            const sectionMatch = line.match(/^#### \*\*(.+?)\s*\((.+?)\):\*\*/);
            if (sectionMatch && currentIngredient) {
                if (currentSection) {
                    currentIngredient.sections.push(currentSection);
                }

                currentSection = {
                    name: sectionMatch[1].trim(),
                    requirement: sectionMatch[2].trim(),
                    options: []
                };
                continue;
            }

            // Extract ingredient options
            if (line.startsWith('• ') && currentSection) {
                const optionMatch = line.match(/^•\s*(.+?)\s*\[(.+?)\]\s*-\s*(.+?)(?:\s*\((.+?)\))?$/);
                if (optionMatch) {
                    const option = {
                        name: optionMatch[1].trim(),
                        type: optionMatch[2].trim(),
                        description: optionMatch[3].trim(),
                        source: optionMatch[4] ? optionMatch[4].trim() : ''
                    };
                    currentSection.options.push(option);
                }
            }

            // Save completed ingredient
            if ((line.startsWith('---') || (line.startsWith('### **') && ingredientMatch)) && currentIngredient && inIngredientSection) {
                if (currentSection) {
                    currentIngredient.sections.push(currentSection);
                    currentSection = null;
                }
                this.ingredientComponents.set(currentIngredient.name, currentIngredient);
                this.newIngredients.add(currentIngredient.name);
                currentIngredient = null;
                inIngredientSection = false;
            }
        }

        // Save final ingredient
        if (currentIngredient && inIngredientSection) {
            if (currentSection) {
                currentIngredient.sections.push(currentSection);
            }
            this.ingredientComponents.set(currentIngredient.name, currentIngredient);
            this.newIngredients.add(currentIngredient.name);
        }
    }

    // Generate countermeasure variants
    generateCountermeasureVariants(typeData) {
        console.log(`  📦 Generating ${this.sizes.length * this.tiers.length} variants for ${typeData.name}...`);

        for (const size of this.sizes) {
            for (const tier of this.tiers) {
                const variant = this.createCountermeasureVariant(typeData, size, tier);
                const key = `countermeasure-${typeData.name.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}-t${tier}`;
                this.extractedRecipes.set(key, variant);
            }
        }
    }

    // Create individual countermeasure variant
    createCountermeasureVariant(typeData, size, tier) {
        const outputName = `${typeData.name} ${size} T${tier}`;
        const outputId = `countermeasure-${typeData.name.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}-t${tier}`;

        // Calculate construction time
        const baseTimes = {
            'XXXS': 60, 'XXS': 120, 'XS': 180, 'S': 240, 'M': 300,
            'L': 360, 'CAP': 420, 'CMD': 480, 'CLASS8': 540, 'TTN': 600
        };
        const constructionTime = (baseTimes[size] || 300) * tier;

        // Determine planet types
        let planetTypes = 'Terrestrial Planet';
        if (tier >= 3) planetTypes += ';Volcanic Planet;Gas Giant';
        if (tier >= 4) planetTypes = 'Volcanic Planet;Ice Planet';

        // Determine factions
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

    // Generate CSV data
    generateCSVData() {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'Usage Category',
            'ProductionSteps', 'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2',
            'Ingredient3', 'Quantity3', 'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5',
            'Ingredient6', 'Quantity6', 'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8',
            'Ingredient9', 'Quantity9'
        ];

        const csvLines = [headers.join(',')];

        for (const [id, recipe] of this.extractedRecipes) {
            const csvRow = [
                recipe.outputId,
                recipe.outputName,
                recipe.outputType,
                recipe.outputTier,
                recipe.constructionTime,
                recipe.planetTypes,
                recipe.factions,
                recipe.resourceType,
                recipe.functionalPurpose,
                recipe.usageCategory,
                recipe.productionSteps
            ];

            // Add ingredients (up to 9)
            for (let i = 0; i < 9; i++) {
                if (i < recipe.ingredients.length) {
                    csvRow.push(recipe.ingredients[i].name);
                    csvRow.push(recipe.ingredients[i].quantity);
                } else {
                    csvRow.push('');
                    csvRow.push('');
                }
            }

            csvLines.push(csvRow.join(','));
        }

        return csvLines.join('\n');
    }

    // Generate ingredient CSV
    generateIngredientCSV() {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'Usage Category',
            'ProductionSteps', 'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2',
            'Ingredient3', 'Quantity3', 'Ingredient4', 'Quantity4'
        ];

        const csvLines = [headers.join(',')];

        for (const [name, ingredient] of this.ingredientComponents) {
            const outputId = name.toLowerCase().replace(/\s+/g, '-');

            const csvRow = [
                outputId,
                name,
                'MANUFACTURED_COMPONENT',
                3,
                1800,
                'Terrestrial Planet;Volcanic Planet',
                'MUD;ONI;USTUR',
                ingredient.materialType,
                'SPECIALIZED_COMPONENT',
                'Countermeasure Components',
                3
            ];

            // Add ingredients from first section
            if (ingredient.sections.length > 0) {
                const firstSection = ingredient.sections[0];
                const selectedOptions = firstSection.options.slice(0, 2);

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
                for (let i = 0; i < 8; i++) {
                    csvRow.push('');
                }
            }

            csvLines.push(csvRow.join(','));
        }

        return csvLines.join('\n');
    }

    // Main extraction method
    extractRecipes() {
        console.log('🛡️ Recipe Extractor CLI - Starting extraction...\n');

        try {
            // Look for COUNTERMEASURES.md in common locations
            const possiblePaths = [
                './public/data/COUNTERMEASURES.md',
                './data/COUNTERMEASURES.md',
                './COUNTERMEASURES.md'
            ];

            let content = null;
            let usedPath = null;

            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    content = fs.readFileSync(filePath, 'utf8');
                    usedPath = filePath;
                    break;
                }
            }

            if (!content) {
                throw new Error('COUNTERMEASURES.md not found. Please ensure it exists in ./public/data/, ./data/, or current directory.');
            }

            console.log(`📖 Loading from: ${usedPath}\n`);

            this.extractCountermeasureRecipes(content);
            this.extractNewIngredients(content);

            const summary = {
                totalRecipes: this.extractedRecipes.size,
                totalNewIngredients: this.ingredientComponents.size,
                countermeasureTypes: this.countermeasureTypes.length,
                variantsPerType: this.sizes.length * this.tiers.length
            };

            console.log('\n📊 Extraction Complete!');
            console.log(`   Total Recipes: ${summary.totalRecipes}`);
            console.log(`   New Ingredients: ${summary.totalNewIngredients}`);
            console.log(`   Types: ${summary.countermeasureTypes}`);
            console.log(`   Variants per Type: ${summary.variantsPerType}\n`);

            // Write CSV files
            const csvData = this.generateCSVData();
            const ingredientCSV = this.generateIngredientCSV();

            fs.writeFileSync('extracted_countermeasure_recipes.csv', csvData);
            fs.writeFileSync('extracted_ingredient_recipes.csv', ingredientCSV);

            console.log('💾 Files saved:');
            console.log('   📄 extracted_countermeasure_recipes.csv');
            console.log('   📄 extracted_ingredient_recipes.csv');

            // Generate analysis report
            const analysisText = this.generateAnalysisReport(summary);
            fs.writeFileSync('recipe_extraction_analysis.md', analysisText);
            console.log('   📄 recipe_extraction_analysis.md\n');

            return {
                countermeasureRecipes: this.extractedRecipes,
                newIngredients: this.ingredientComponents,
                csvData: csvData,
                ingredientCSV: ingredientCSV,
                summary: summary
            };

        } catch (error) {
            console.error('❌ Extraction failed:', error.message);
            process.exit(1);
        }
    }

    // Generate analysis report
    generateAnalysisReport(summary) {
        const analysis = {
            byType: {},
            byTier: {},
            bySize: {}
        };

        for (const [id, recipe] of this.extractedRecipes) {
            // By type
            const typePart = id.split('-')[1];
            analysis.byType[typePart] = (analysis.byType[typePart] || 0) + 1;

            // By tier
            const tier = recipe.outputTier;
            analysis.byTier[`T${tier}`] = (analysis.byTier[`T${tier}`] || 0) + 1;

            // By size
            const sizePart = id.split('-')[2];
            analysis.bySize[sizePart] = (analysis.bySize[sizePart] || 0) + 1;
        }

        return `# Recipe Extraction Analysis Report

## Overview
- **Total Countermeasure Recipes:** ${summary.totalRecipes}
- **Total New Ingredients:** ${summary.totalNewIngredients}
- **Countermeasure Types:** ${summary.countermeasureTypes}
- **Variants per Type:** ${summary.variantsPerType}

## Recipes by Type
${Object.entries(analysis.byType).map(([type, count]) => `- **${type}:** ${count} recipes`).join('\n')}

## Recipes by Tier
${Object.entries(analysis.byTier).map(([tier, count]) => `- **${tier}:** ${count} recipes`).join('\n')}

## Recipes by Size
${Object.entries(analysis.bySize).map(([size, count]) => `- **${size}:** ${count} recipes`).join('\n')}

## New Ingredients Extracted
${Array.from(this.ingredientComponents.keys()).map(name => `- ${name}`).join('\n')}

---
*Generated by Recipe Extractor CLI*
`;
    }
}

// Run the CLI
if (require.main === module) {
    const extractor = new RecipeExtractorCLI();
    extractor.extractRecipes();
}

module.exports = RecipeExtractorCLI; 