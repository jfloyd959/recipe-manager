const fs = require('fs');

// Load recipes
const recipeData = fs.readFileSync('./finalComponentRecipes.csv', 'utf-8');
const recipeLines = recipeData.split('\n').filter(line => line.trim());

console.log('First few recipe lines:');
for (let i = 0; i < Math.min(10, recipeLines.length); i++) {
    console.log(`${i}: ${recipeLines[i]}`);
}

console.log('\nLoaded recipe keys:');
const recipes = {};
for (let i = 1; i < recipeLines.length; i++) {
    const values = recipeLines[i].split(',');
    if (values.length < 4) continue;

    const system = values[0];
    const componentName = values[1];
    const key = `${system}_${componentName}`;

    if (!recipes[key]) {
        recipes[key] = [];
        console.log(`Recipe: ${key}`);
    }
}

console.log('\nChecking component matching:');
const componentData = fs.readFileSync('./finalComponentList.csv', 'utf-8');
const componentLines = componentData.split('\n');

// Check first few Heat Sink components
for (let i = 1; i < componentLines.length; i++) {
    if (!componentLines[i].trim()) continue;

    const values = componentLines[i].split(',');
    if (values.length < 15) continue;

    const outputName = values[1];
    const componentCategory = values[3];

    if (!outputName || !outputName.includes('Heat Sink')) continue;

    const nameMatch = outputName.match(/^(.+?)\s+(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)\s+T\d+$/);
    if (!nameMatch) {
        console.log(`No match for: ${outputName}`);
        continue;
    }

    const componentName = nameMatch[1];
    const size = nameMatch[2];

    // Determine system
    let system = 'Ship_Components';
    if (componentCategory === 'MISSILE') {
        system = 'Missiles';
    } else if (componentCategory === 'SHIP_WEAPON') {
        system = 'Ship_Weapons';
    }

    const recipeKey = `${system}_${componentName}`;
    console.log(`Component: ${outputName}`);
    console.log(`  - Category: ${componentCategory}`);
    console.log(`  - Parsed name: ${componentName}`);
    console.log(`  - Size: ${size}`);
    console.log(`  - System: ${system}`);
    console.log(`  - Recipe key: ${recipeKey}`);
    console.log(`  - Recipe exists: ${!!recipes[recipeKey]}`);

    if (i > 1415) break; // Just check a few
} 