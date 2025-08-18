const fs = require('fs');
const path = require('path');

// Load and parse CSV data
function loadCSV(filename) {
    const data = fs.readFileSync(path.join(__dirname, '../../public', filename), 'utf8');
    const lines = data.trim().split('\n');
    const headers = lines[0].split('\t');

    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const row = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || '';
        });
        return row;
    });
}

// Components that are weapon/ship themed and should NOT be used in buildings
const OFF_THEME_COMPONENTS = [
    // Weapon systems
    'Blast Charges',
    'Ammo Control Core',
    'Beam Interface Core',
    'Beam Emitter',
    'Emergency Matrix Core',
    'Interference Shield',
    'Thrust Modulator',
    'Field Harmonizer',
    'Signal Booster',
    'Emergency Suppressant',

    // Ship control systems
    'Control System Core',
    'Coordination Matrix',
    'Crystal Lattice MUD',
    'Crystal Lattice ONI',
    'Crystal Lattice Ustur',
    'Drive Assembly Core',
    'Launch Platform Core',
    'Jasphorus Propulsion Core',
    'Kinetic Opal Core',

    // Other ship systems
    'Coolant Circulator',
    'Cooling Network Hub',
    'Cryogenic Core',
    'Neural Networks'
];

// Components that ARE appropriate for buildings
const BUILDING_APPROPRIATE = [
    'Aerogel',
    'Alloy Frame',
    'Aluminum',
    'Barrier Material',
    'Base Structure',
    'Bio Framework',
    'Bio Stabilizer',
    'Boron',
    'Boron Composite',
    'Chromite Ingot',
    'Climate Controller',
    'Cobalt',
    'Command Module',
    'Copper',
    'Copper Wire',
    'Coupling Interface',
    'Fuel Primer',
    'Lithium',
    'Manganese',
    'Utility Core',
    'Adaptive Utility Core',
    'Advanced Sensor Grid',
    'Assembly Control Matrix',
    'Beryllium Matrix',
    'Capacitor Matrix Core',
    'Capacity Control Core',
    'Chisenic Processor',
    'Coupling Control Core'
];

function analyzeRecipes() {
    // Load all data
    const components = loadCSV('finalComponentList.csv');
    const buildingData = fs.readFileSync(path.join(__dirname, '../documentation/buildingRecipes.tsv'), 'utf8');
    const buildingLines = buildingData.trim().split('\n');
    const buildingHeaders = buildingLines[0].split('\t');

    const buildings = buildingLines.slice(1).map(line => {
        const values = line.split('\t');
        const row = {};
        buildingHeaders.forEach((header, i) => {
            row[header] = values[i] || '';
        });
        return row;
    });

    // Create component tier map
    const componentTiers = {};
    components.forEach(comp => {
        if (comp.OutputName) {
            componentTiers[comp.OutputName] = parseInt(comp.OutputTier) || 1;
        }
    });

    console.log('\n=== BUILDING RECIPE ANALYSIS ===\n');

    // Track violations
    const tierViolations = [];
    const offThemeUsage = {};
    const appropriateUsage = {};

    buildings.forEach(building => {
        if (!building.OutputID) return;

        const buildingTier = parseInt(building.OutputTier) || 1;
        const buildingType = building.ResourceType;
        const ingredients = [];

        // Collect all ingredients
        for (let i = 1; i <= 8; i++) {
            const ingredient = building[`Ingredient${i}`];
            if (ingredient && ingredient !== 'Auto-Built') {
                ingredients.push(ingredient);
            }
        }

        // Determine resource tier for extractors/processors
        let resourceTier = buildingTier; // Default for infrastructure

        if (buildingType === 'Extraction' || buildingType === 'Processing') {
            // Extract resource name from building name
            const match = building.OutputName.match(/^(.+?)\s+(Extractor|Processor)/);
            if (match) {
                const resourceName = match[1];
                // Most basic resources are T1-T2
                resourceTier = resourceName.includes('Ore') ? 1 :
                    resourceName.includes('Gas') ? 1 :
                        resourceName.includes('Crystal') ? 2 : 1;
            }
        }

        // Check each ingredient
        ingredients.forEach(ingredient => {
            const ingredientTier = componentTiers[ingredient] || 1;

            // Check for off-theme components
            if (OFF_THEME_COMPONENTS.includes(ingredient)) {
                if (!offThemeUsage[ingredient]) {
                    offThemeUsage[ingredient] = [];
                }
                offThemeUsage[ingredient].push(`${building.OutputID} (T${buildingTier})`);
            }

            // Track appropriate components
            if (BUILDING_APPROPRIATE.includes(ingredient)) {
                if (!appropriateUsage[ingredient]) {
                    appropriateUsage[ingredient] = 0;
                }
                appropriateUsage[ingredient]++;
            }

            // Check tier violations
            if (buildingType === 'Infrastructure') {
                // Infrastructure should use components matching building tier
                if (ingredientTier > buildingTier) {
                    tierViolations.push({
                        building: building.OutputID,
                        buildingTier,
                        ingredient,
                        ingredientTier,
                        type: 'Infrastructure tier mismatch'
                    });
                }
            } else if (buildingType === 'Extraction' || buildingType === 'Processing') {
                // T1-T3: ingredients should not exceed resource tier
                // T4-T5: can use higher tier ingredients
                if (buildingTier <= 3 && ingredientTier > resourceTier) {
                    tierViolations.push({
                        building: building.OutputID,
                        buildingTier,
                        resourceTier,
                        ingredient,
                        ingredientTier,
                        type: 'Resource tier exceeded'
                    });
                }
            }
        });
    });

    // Report findings
    console.log('📊 OFF-THEME COMPONENTS BEING USED:');
    console.log('=====================================\n');

    Object.keys(offThemeUsage).sort().forEach(component => {
        const count = offThemeUsage[component].length;
        console.log(`❌ ${component}: Used in ${count} buildings`);
        if (count <= 5) {
            console.log(`   Examples: ${offThemeUsage[component].slice(0, 5).join(', ')}`);
        }
    });

    console.log('\n📊 APPROPRIATE COMPONENTS BEING USED:');
    console.log('======================================\n');

    Object.keys(appropriateUsage).sort((a, b) => appropriateUsage[b] - appropriateUsage[a])
        .slice(0, 10)
        .forEach(component => {
            console.log(`✅ ${component}: Used ${appropriateUsage[component]} times`);
        });

    console.log('\n📊 TIER VIOLATIONS:');
    console.log('===================\n');

    if (tierViolations.length > 0) {
        // Group by type
        const byType = {};
        tierViolations.forEach(v => {
            if (!byType[v.type]) byType[v.type] = [];
            byType[v.type].push(v);
        });

        Object.keys(byType).forEach(type => {
            console.log(`\n${type}: ${byType[type].length} violations`);
            byType[type].slice(0, 5).forEach(v => {
                if (v.type === 'Infrastructure tier mismatch') {
                    console.log(`  - ${v.building} (T${v.buildingTier}) uses ${v.ingredient} (T${v.ingredientTier})`);
                } else {
                    console.log(`  - ${v.building} (Building T${v.buildingTier}, Resource T${v.resourceTier}) uses ${v.ingredient} (T${v.ingredientTier})`);
                }
            });
            if (byType[type].length > 5) {
                console.log(`  ... and ${byType[type].length - 5} more`);
            }
        });
    } else {
        console.log('✅ No tier violations found!');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('===========\n');
    console.log(`Total buildings analyzed: ${buildings.length}`);
    console.log(`Off-theme components found: ${Object.keys(offThemeUsage).length}`);
    console.log(`Tier violations found: ${tierViolations.length}`);
    console.log(`\n🎯 RECOMMENDATION: Remove all off-theme components and fix tier violations!`);
}

analyzeRecipes(); 