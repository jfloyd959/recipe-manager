const fs = require('fs');

// Read the current CSV files
const componentListPath = './finalComponentList.csv';
const recipeListPath = './finalComponentRecipes.csv';

// Create backup
const backupPath = './finalComponentList_before_countermeasures_fix.csv';
fs.copyFileSync(componentListPath, backupPath);
console.log(`Created backup: ${backupPath}`);

// Define size categories and their ingredient counts
const sizeIngredientCounts = {
    'XXXS': 2,
    'XXS': 2,
    'XS': 3,
    'S': 3,
    'M': 4,
    'L': 5,
    'CAP': 5,
    'CMD': 5,
    'CLASS8': 6,
    'TTN': 6
};

// Load recipes
const recipeData = fs.readFileSync(recipeListPath, 'utf-8');
const recipeLines = recipeData.split('\n').filter(line => line.trim());

// Build recipe lookup
const recipes = {};
for (let i = 1; i < recipeLines.length; i++) {
    const values = recipeLines[i].split(',');
    if (values.length < 4) continue;

    const system = values[0];
    const componentName = values[1];
    const position = parseInt(values[2]);
    const ingredientName = values[3];
    const tier = values[4];
    const category = values[5];

    const key = `${system}_${componentName}`;
    if (!recipes[key]) {
        recipes[key] = [];
    }

    recipes[key].push({
        position,
        ingredientName,
        tier,
        category
    });
}

// Sort recipes by position
Object.keys(recipes).forEach(key => {
    recipes[key].sort((a, b) => a.position - b.position);
});

console.log(`Loaded ${Object.keys(recipes).length} recipes`);

// Load component list
const componentData = fs.readFileSync(componentListPath, 'utf-8');
const componentLines = componentData.split('\n');
const headers = componentLines[0].split(',');

console.log(`CSV has ${headers.length} columns`);

let updatedCount = 0;
let countermeasureCount = 0;

// Process each component
for (let i = 1; i < componentLines.length; i++) {
    if (!componentLines[i].trim()) continue;

    const values = componentLines[i].split(',');
    if (values.length < 15) continue; // Need at least the basic columns

    const outputName = values[1]; // OutputName column
    const outputType = values[2]; // OutputType column
    const componentCategory = values[3]; // ComponentCategory column

    if (!outputName) continue;

    // Only process COUNTERMEASURES
    if (outputType !== 'COUNTERMEASURES') continue;

    // Extract component name and size from OutputName
    const nameMatch = outputName.match(/^(.+?)\s+(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)\s+T\d+$/);
    if (!nameMatch) continue;

    const componentName = nameMatch[1];
    const size = nameMatch[2];

    // Convert component name to match recipe format (spaces to underscores)
    const recipeComponentName = componentName.replace(/\s+/g, '_');
    const recipeKey = `Countermeasures_${recipeComponentName}`;
    const recipe = recipes[recipeKey];

    if (!recipe) {
        console.log(`No recipe found for: ${recipeKey}`);
        continue;
    }

    // Get the number of ingredients this size should have
    const targetIngredientCount = sizeIngredientCounts[size];
    if (!targetIngredientCount) continue;

    // Extend values array if needed
    while (values.length < 32) {
        values.push('');
    }

    // Set ProductionSteps (column 10) to the number of ingredients
    values[10] = targetIngredientCount.toString();

    // Clear all ingredient columns (starting from column 11)
    for (let j = 11; j < 30; j++) {
        values[j] = '';
    }

    // Apply the correct number of ingredients based on size
    for (let j = 0; j < Math.min(targetIngredientCount, recipe.length); j++) {
        const ingredient = recipe[j];
        const ingredientCol = 11 + (j * 2); // Column 11, 13, 15, 17, 19, 21
        const quantityCol = ingredientCol + 1;   // Column 12, 14, 16, 18, 20, 22

        if (ingredientCol < values.length) {
            values[ingredientCol] = ingredient.ingredientName;
            values[quantityCol] = '1';
        }
    }

    componentLines[i] = values.join(',');
    updatedCount++;

    // Log progress for countermeasures
    if (outputType === 'COUNTERMEASURES') {
        countermeasureCount++;
        if (countermeasureCount <= 5) {
            console.log(`Updated ${outputName}: ${targetIngredientCount} ingredients (${recipe.slice(0, targetIngredientCount).map(r => r.ingredientName).join(', ')})`);
        }
    }
}

// Write the updated file
const updatedData = componentLines.join('\n');
fs.writeFileSync(componentListPath, updatedData);

console.log(`\nFixed progressive complexity for ${updatedCount} components`);
console.log(`Updated ${countermeasureCount} countermeasure components`);
console.log('Countermeasures progressive complexity now correctly applied based on size!'); 