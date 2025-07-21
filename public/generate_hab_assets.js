const fs = require('fs');

// Read the existing CSV
const existingCsv = fs.readFileSync('public/finalComponentList.csv', 'utf8');
const lines = existingCsv.split('\n');
const headers = lines[0].split(',');

console.log('Existing CSV loaded, generating hab assets...');

// Generate hab asset entries
const habAssets = [];

// Hab Cargo Storage T1-T5
const cargoStorageRecipes = [
    { tier: 'T1', ingredients: ['Storage Bay', 'Inventory Controller'] },
    { tier: 'T2', ingredients: ['Storage Bay', 'Inventory Controller'] },
    { tier: 'T3', ingredients: ['Enhanced Storage Core', 'Cargo Manager', 'Inventory Controller'] },
    { tier: 'T4', ingredients: ['Advanced Storage Core', 'Enhanced Storage Core', 'Cargo Manager'] },
    { tier: 'T5', ingredients: ['Quantum Storage System', 'Advanced Storage Core', 'Enhanced Storage Core', 'Cargo Manager'] }
];

cargoStorageRecipes.forEach(recipe => {
    const entry = [
        `hab-cargo-storage-${recipe.tier.toLowerCase()}`,
        `Hab Cargo Storage ${recipe.tier}`,
        'HAB_ASSETS',
        'UTILITY',
        '',
        recipe.tier.replace('T', ''),
        parseInt(recipe.tier.replace('T', '')) * 300,
        'All Types',
        'MUD;ONI;USTUR',
        'HABITAT_MODULE',
        recipe.ingredients.length,
        recipe.ingredients[0] || '',
        recipe.ingredients[0] ? '1' : '',
        recipe.ingredients[1] || '',
        recipe.ingredients[1] ? '1' : '',
        recipe.ingredients[2] || '',
        recipe.ingredients[2] ? '1' : '',
        recipe.ingredients[3] || '',
        recipe.ingredients[3] ? '1' : '',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    habAssets.push(entry);
});

// Hab T1-T5
const habRecipes = [
    { tier: 'T1', ingredients: ['Living Quarters', 'Life Support'] },
    { tier: 'T2', ingredients: ['Living Quarters', 'Life Support'] },
    { tier: 'T3', ingredients: ['Enhanced Habitat Core', 'Comfort Systems', 'Life Support'] },
    { tier: 'T4', ingredients: ['Advanced Habitat Core', 'Enhanced Habitat Core', 'Comfort Systems'] },
    { tier: 'T5', ingredients: ['Quantum Habitat System', 'Advanced Habitat Core', 'Enhanced Habitat Core', 'Comfort Systems'] }
];

habRecipes.forEach(recipe => {
    const entry = [
        `hab-${recipe.tier.toLowerCase()}`,
        `Hab ${recipe.tier}`,
        'HAB_ASSETS',
        'HABITAT',
        '',
        recipe.tier.replace('T', ''),
        parseInt(recipe.tier.replace('T', '')) * 400,
        'All Types',
        'MUD;ONI;USTUR',
        'HABITAT_MODULE',
        recipe.ingredients.length,
        recipe.ingredients[0] || '',
        recipe.ingredients[0] ? '1' : '',
        recipe.ingredients[1] || '',
        recipe.ingredients[1] ? '1' : '',
        recipe.ingredients[2] || '',
        recipe.ingredients[2] ? '1' : '',
        recipe.ingredients[3] || '',
        recipe.ingredients[3] ? '1' : '',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    habAssets.push(entry);
});

// Hab Crafting Station XXS, XS, S, M
const craftingStationRecipes = [
    { size: 'XXS', ingredients: ['Fabrication Unit', 'Control Interface'] },
    { size: 'XS', ingredients: ['Fabrication Unit', 'Control Interface'] },
    { size: 'S', ingredients: ['Enhanced Crafting Core', 'Assembly System', 'Control Interface'] },
    { size: 'M', ingredients: ['Advanced Crafting Core', 'Enhanced Crafting Core', 'Assembly System'] }
];

craftingStationRecipes.forEach(recipe => {
    const entry = [
        `hab-crafting-station-${recipe.size.toLowerCase()}`,
        `Hab Crafting Station ${recipe.size}`,
        'HAB_ASSETS',
        'UTILITY',
        recipe.size,
        '5',
        recipe.size === 'XXS' ? 300 : recipe.size === 'XS' ? 450 : recipe.size === 'S' ? 600 : 900,
        'All Types',
        'MUD;ONI;USTUR',
        'HABITAT_MODULE',
        recipe.ingredients.length,
        recipe.ingredients[0] || '',
        recipe.ingredients[0] ? '1' : '',
        recipe.ingredients[1] || '',
        recipe.ingredients[1] ? '1' : '',
        recipe.ingredients[2] || '',
        recipe.ingredients[2] ? '1' : '',
        recipe.ingredients[3] || '',
        recipe.ingredients[3] ? '1' : '',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    habAssets.push(entry);
});

// Hab Landing Pad XXS, XS, S, M
const landingPadRecipes = [
    { size: 'XXS', ingredients: ['Landing Platform', 'Guidance System'] },
    { size: 'XS', ingredients: ['Landing Platform', 'Guidance System'] },
    { size: 'S', ingredients: ['Enhanced Landing Core', 'Traffic Control', 'Guidance System'] },
    { size: 'M', ingredients: ['Advanced Landing Core', 'Enhanced Landing Core', 'Traffic Control'] }
];

landingPadRecipes.forEach(recipe => {
    const entry = [
        `hab-landing-pad-${recipe.size.toLowerCase()}`,
        `Hab Landing Pad ${recipe.size}`,
        'HAB_ASSETS',
        'PROPULSION',
        recipe.size,
        '5',
        recipe.size === 'XXS' ? 400 : recipe.size === 'XS' ? 600 : recipe.size === 'S' ? 800 : 1200,
        'All Types',
        'MUD;ONI;USTUR',
        'HABITAT_MODULE',
        recipe.ingredients.length,
        recipe.ingredients[0] || '',
        recipe.ingredients[0] ? '1' : '',
        recipe.ingredients[1] || '',
        recipe.ingredients[1] ? '1' : '',
        recipe.ingredients[2] || '',
        recipe.ingredients[2] ? '1' : '',
        recipe.ingredients[3] || '',
        recipe.ingredients[3] ? '1' : '',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    habAssets.push(entry);
});

// Single-size hab assets
const singleSizeHabs = [
    {
        id: 'hab-interior-paint',
        name: 'Hab Interior Paint',
        category: 'HABITAT',
        ingredients: ['Pigment Matrix', 'Application System']
    },
    {
        id: 'hab-exterior-paint',
        name: 'Hab Exterior Paint',
        category: 'HABITAT',
        ingredients: ['Weather Coating', 'Surface Primer']
    },
    {
        id: 'hab-pet-house',
        name: 'Hab Pet House',
        category: 'HABITAT',
        ingredients: ['Animal Shelter', 'Comfort Module']
    }
];

singleSizeHabs.forEach(hab => {
    const entry = [
        hab.id,
        hab.name,
        'HAB_ASSETS',
        hab.category,
        '',
        '5',
        300,
        'All Types',
        'MUD;ONI;USTUR',
        'HABITAT_MODULE',
        hab.ingredients.length,
        hab.ingredients[0] || '',
        hab.ingredients[0] ? '1' : '',
        hab.ingredients[1] || '',
        hab.ingredients[1] ? '1' : '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    habAssets.push(entry);
});

console.log(`Generated ${habAssets.length} hab asset entries`);

// Convert arrays to CSV strings
const habAssetsCsv = habAssets.map(entry => entry.join(',')).join('\n');

// Combine existing CSV with new entries
const newCsv = existingCsv + '\n' + habAssetsCsv;

// Write to new file
fs.writeFileSync('public/finalComponentList.csv', newCsv);

console.log('✅ Successfully added hab assets to finalComponentList.csv');
console.log(`📊 Total entries: ${lines.length - 1 + habAssets.length} (was ${lines.length - 1}, added ${habAssets.length})`);

// Show what was added
console.log('\n🏠 Hab Assets Added:');
habAssets.forEach((asset, index) => {
    console.log(`- ${asset[1]} (${asset[3]})`);
}); 