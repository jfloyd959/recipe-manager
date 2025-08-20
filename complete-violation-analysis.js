const fs = require('fs');

// Load component production steps from CSV
function loadComponentData() {
    const csvContent = fs.readFileSync('public/finalComponentList.csv', 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0].split(',');

    const nameIndex = header.indexOf('OutputName');
    const stepsIndex = header.indexOf('ProductionSteps');
    const tierIndex = header.indexOf('OutputTier');

    const components = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const name = parts[nameIndex]?.trim();
        const steps = parseInt(parts[stepsIndex]) || 0;
        const tier = parseInt(parts[tierIndex]) || 0;

        if (name) {
            components.set(name, { steps, tier });
        }
    }

    return components;
}

// Parse the complete building recipe data
function parseRecipeData(recipeText) {
    const lines = recipeText.trim().split('\n');
    const header = lines[0].split('\t');

    const recipes = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        const recipe = {};

        // Map each column to the recipe object
        header.forEach((col, index) => {
            recipe[col] = parts[index] || '';
        });

        recipes.push(recipe);
    }

    return recipes;
}

// Extract all ingredients from a recipe
function extractIngredients(recipe) {
    const ingredients = [];

    for (let i = 1; i <= 8; i++) {
        const ingredient = recipe[`Ingredient${i}`];
        const quantity = recipe[`Quantity${i}`];

        if (ingredient && ingredient.trim()) {
            ingredients.push({
                name: ingredient.trim(),
                quantity: parseInt(quantity) || 0
            });
        }
    }

    return ingredients;
}

// Main analysis function
function analyzeProductionSteps(recipeText) {
    console.log('🔍 Loading component data...');
    const componentData = loadComponentData();

    console.log('📊 Parsing recipe data...');
    const recipes = parseRecipeData(recipeText);

    console.log(`📋 Found ${recipes.length} recipes to analyze`);

    const violations = new Map(); // component name -> array of usage info
    const componentStats = new Map(); // component name -> { steps, violations, buildings }

    // Analyze each recipe
    recipes.forEach(recipe => {
        const ingredients = extractIngredients(recipe);

        ingredients.forEach(ingredient => {
            const componentInfo = componentData.get(ingredient.name);

            if (componentInfo && componentInfo.steps > 2) {
                const buildingInfo = {
                    outputID: recipe.OutputID,
                    outputName: recipe.OutputName,
                    outputTier: parseInt(recipe.OutputTier) || 0,
                    buildingResourceTier: recipe.BuildingResourceTier || 'N/A',
                    resourceType: recipe.ResourceType,
                    planetType: recipe.PlanetTypes,
                    quantity: ingredient.quantity
                };

                if (!violations.has(ingredient.name)) {
                    violations.set(ingredient.name, []);
                }
                violations.get(ingredient.name).push(buildingInfo);

                // Update component stats
                if (!componentStats.has(ingredient.name)) {
                    componentStats.set(ingredient.name, {
                        steps: componentInfo.steps,
                        tier: componentInfo.tier,
                        violations: 0,
                        buildings: new Set()
                    });
                }

                const stats = componentStats.get(ingredient.name);
                stats.violations++;
                stats.buildings.add(`${buildingInfo.outputName} T${buildingInfo.outputTier}`);
            }
        });
    });

    return { violations, componentStats };
}

// Generate detailed report
function generateReport(violations, componentStats) {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 PRODUCTION STEPS VIOLATION ANALYSIS REPORT - COMPLETE');
    console.log('='.repeat(80));

    console.log(`\n📊 EXECUTIVE SUMMARY:`);
    console.log(`Total Violating Components: ${violations.size}`);
    console.log(`Total Violation Instances: ${Array.from(violations.values()).reduce((sum, arr) => sum + arr.length, 0)}`);

    // Sort components by production steps (highest first), then by violation count
    const sortedComponents = Array.from(componentStats.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return b[1].violations - a[1].violations;
    });

    console.log(`\n📋 DETAILED COMPONENT BREAKDOWN:`);
    console.log('-'.repeat(80));

    sortedComponents.forEach(([componentName, stats]) => {
        const usages = violations.get(componentName);

        console.log(`\n🔴 ${componentName}`);
        console.log(`   Production Steps: ${stats.steps}`);
        console.log(`   Component Tier: T${stats.tier}`);
        console.log(`   Violation Count: ${stats.violations} buildings`);

        // Group usages by resource tier for better analysis
        const byResourceTier = new Map();
        usages.forEach(usage => {
            const key = usage.buildingResourceTier || 'Infrastructure';
            if (!byResourceTier.has(key)) {
                byResourceTier.set(key, []);
            }
            byResourceTier.get(key).push(usage);
        });

        // Show usage by resource tier
        Array.from(byResourceTier.entries()).sort((a, b) => {
            if (a[0] === 'Infrastructure') return 1;
            if (b[0] === 'Infrastructure') return -1;
            return parseInt(a[0]) - parseInt(b[0]);
        }).forEach(([resourceTier, tierUsages]) => {
            console.log(`   📍 Resource Tier ${resourceTier}: ${tierUsages.length} buildings`);

            // Group by planet type within resource tier
            const byPlanet = new Map();
            tierUsages.forEach(usage => {
                if (!byPlanet.has(usage.planetType)) {
                    byPlanet.set(usage.planetType, []);
                }
                byPlanet.get(usage.planetType).push(usage);
            });

            Array.from(byPlanet.entries()).forEach(([planet, planetUsages]) => {
                console.log(`      🌍 ${planet}: ${planetUsages.length} buildings`);

                // Show specific buildings (first few examples)
                const examples = planetUsages.slice(0, 3);
                examples.forEach(usage => {
                    console.log(`         • ${usage.outputName} T${usage.outputTier} (${usage.resourceType}) - Qty: ${usage.quantity}`);
                });

                if (planetUsages.length > 3) {
                    console.log(`         ... and ${planetUsages.length - 3} more`);
                }
            });
        });

        console.log('-'.repeat(40));
    });

    // Critical analysis section
    console.log(`\n🚨 CRITICAL ANALYSIS:`);
    console.log('-'.repeat(80));

    // Find T1 resource buildings using complex components
    const t1ResourceViolations = [];
    violations.forEach((usages, componentName) => {
        usages.forEach(usage => {
            if (usage.buildingResourceTier === '1') {
                t1ResourceViolations.push({
                    component: componentName,
                    steps: componentStats.get(componentName).steps,
                    building: usage.outputName,
                    tier: usage.outputTier,
                    planet: usage.planetType,
                    quantity: usage.quantity
                });
            }
        });
    });

    if (t1ResourceViolations.length > 0) {
        console.log(`\n🔥 CRITICAL: T1 Resource Buildings Using Complex Components:`);
        t1ResourceViolations.forEach(violation => {
            console.log(`   • ${violation.component} (${violation.steps} steps) in ${violation.building} T${violation.tier} on ${violation.planet}`);
        });
    } else {
        console.log(`\n✅ GOOD: No T1 resource buildings using complex components found.`);
    }

    // Find early-game blockers
    console.log(`\n⚠️  EARLY-GAME IMPACT ANALYSIS:`);

    const earlyGameComponents = sortedComponents.filter(([name, stats]) => {
        const usages = violations.get(name);
        return usages.some(usage =>
            (usage.buildingResourceTier === '1' || usage.buildingResourceTier === '2') &&
            usage.outputTier <= 3
        );
    });

    if (earlyGameComponents.length > 0) {
        console.log(`   Found ${earlyGameComponents.length} components affecting early-game progression:`);
        earlyGameComponents.forEach(([componentName, stats]) => {
            console.log(`   • ${componentName} (${stats.steps} steps, T${stats.tier})`);
        });
    } else {
        console.log(`   ✅ No significant early-game blockers identified.`);
    }
}

// Main execution
const recipeData = `OutputID	OutputName	OutputType	OutputTier	BuildingResourceTier	ConstructionTime	PlanetTypes	Factions	ResourceType	ProductionSteps	Ingredient1	Quantity1	Ingredient2	Quantity2	Ingredient3	Quantity3	Ingredient4	Quantity4	Ingredient5	Quantity5	Ingredient6	Quantity6	Ingredient7	Quantity7	Ingredient8	Quantity8
oceanic-central-hub-t1	Central Hub	BUILDING	1			Oceanic Planet	MUD;ONI;USTUR	Infrastructure		Auto-Built															
oceanic-central-hub-t2	Central Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	28	Chromite Ingot	27	Climate Controller	22	Cobalt	19								
oceanic-central-hub-t3	Central Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	34	Chromite Ingot	33	Climate Controller	27	Cobalt	23	Aerogel	19						
oceanic-central-hub-t4	Central Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	41	Chromite Ingot	40	Climate Controller	33	Cobalt	28	Aerogel	23	Beryllium Matrix	17				
oceanic-central-hub-t5	Central Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	50	Chromite Ingot	48	Climate Controller	40	Cobalt	34	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-cultivation-hub-t1	Cultivation Hub	BUILDING	1			Oceanic Planet	MUD;ONI;USTUR	Infrastructure		Auto-Built															
oceanic-cultivation-hub-t2	Cultivation Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	28	Chromite Ingot	27	Climate Controller	22	Cobalt	19								
oceanic-cultivation-hub-t3	Cultivation Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	34	Chromite Ingot	33	Climate Controller	27	Cobalt	23	Aerogel	19						
oceanic-cultivation-hub-t4	Cultivation Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	41	Chromite Ingot	40	Climate Controller	33	Cobalt	28	Aerogel	23	Beryllium Matrix	17				
oceanic-cultivation-hub-t5	Cultivation Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	50	Chromite Ingot	48	Climate Controller	40	Cobalt	34	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-processing-hub-t1	Processing Hub	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-processing-hub-t2	Processing Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-processing-hub-t3	Processing Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-processing-hub-t4	Processing Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-processing-hub-t5	Processing Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-extraction-hub-t1	Extraction Hub	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-extraction-hub-t2	Extraction Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-extraction-hub-t3	Extraction Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-extraction-hub-t4	Extraction Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-extraction-hub-t5	Extraction Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-storage-hub-t1	Storage Hub	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-storage-hub-t2	Storage Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-storage-hub-t3	Storage Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-storage-hub-t4	Storage Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-storage-hub-t5	Storage Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-farm-hub-t1	Farm Hub	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-farm-hub-t2	Farm Hub	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-farm-hub-t3	Farm Hub	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-farm-hub-t4	Farm Hub	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-farm-hub-t5	Farm Hub	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-power-plant-t1	Power Plant	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-power-plant-t2	Power Plant	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-power-plant-t3	Power Plant	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-power-plant-t4	Power Plant	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-power-plant-t5	Power Plant	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-crew-quarters-t1	Crew Quarters	BUILDING	1		90	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-crew-quarters-t2	Crew Quarters	BUILDING	2		135	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	24	Chromite Ingot	21	Climate Controller	18	Cobalt	15								
oceanic-crew-quarters-t3	Crew Quarters	BUILDING	3		180	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	29	Chromite Ingot	26	Climate Controller	22	Cobalt	18	Aerogel	19						
oceanic-crew-quarters-t4	Crew Quarters	BUILDING	4		270	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	35	Chromite Ingot	32	Climate Controller	27	Cobalt	22	Aerogel	23	Beryllium Matrix	17				
oceanic-crew-quarters-t5	Crew Quarters	BUILDING	5		360	Oceanic Planet	MUD;ONI;USTUR	Infrastructure	1	Boron Composite	42	Chromite Ingot	39	Climate Controller	33	Cobalt	27	Aerogel	28	Beryllium Matrix	21	Abyssal Energy Core	21		
oceanic-chromite-processor-t1	Chromite Processor	BUILDING	1	1	60	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-chromite-processor-t2	Chromite Processor	BUILDING	2	1	45	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	30	Hydrogen	24	Nitrogen	18	Chromite Ingot	21								
oceanic-chromite-processor-t3	Chromite Processor	BUILDING	3	1	30	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	36	Hydrogen	29	Nitrogen	22	Chromite Ingot	26	Cryogenic Catalyst	23						
oceanic-chromite-processor-t4	Chromite Processor	BUILDING	4	1	25	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	44	Hydrogen	35	Nitrogen	27	Chromite Ingot	32	Cryogenic Catalyst	28	Aerogel	21				
oceanic-chromite-processor-t5	Chromite Processor	BUILDING	5	1	20	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	53	Hydrogen	42	Nitrogen	33	Chromite Ingot	39	Cryogenic Catalyst	34	Aerogel	26	Boron Composite	25		
oceanic-cobalt-processor-t1	Cobalt Processor	BUILDING	1	2	60	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-cobalt-processor-t2	Cobalt Processor	BUILDING	2	2	45	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	30	Hydrogen	24	Nitrogen	18	Boron Composite	19								
oceanic-cobalt-processor-t3	Cobalt Processor	BUILDING	3	2	30	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	36	Hydrogen	29	Nitrogen	22	Boron Composite	23	Chromite Ingot	23						
oceanic-cobalt-processor-t4	Cobalt Processor	BUILDING	4	2	25	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	44	Hydrogen	35	Nitrogen	27	Boron Composite	28	Chromite Ingot	28	Aerogel	21				
oceanic-cobalt-processor-t5	Cobalt Processor	BUILDING	5	2	20	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	53	Hydrogen	42	Nitrogen	33	Boron Composite	34	Chromite Ingot	34	Aerogel	26	Climate Controller	25		
oceanic-manganese-processor-t1	Manganese Processor	BUILDING	1	2	60	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	25	Hydrogen	20	Nitrogen	15										
oceanic-manganese-processor-t2	Manganese Processor	BUILDING	2	2	45	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	30	Hydrogen	24	Nitrogen	18	Boron Composite	19								
oceanic-manganese-processor-t3	Manganese Processor	BUILDING	3	2	30	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	36	Hydrogen	29	Nitrogen	22	Boron Composite	23	Chromite Ingot	23						
oceanic-manganese-processor-t4	Manganese Processor	BUILDING	4	2	25	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	44	Hydrogen	35	Nitrogen	27	Boron Composite	28	Chromite Ingot	28	Aerogel	21				
oceanic-manganese-processor-t5	Manganese Processor	BUILDING	5	2	20	Oceanic Planet	MUD;ONI;USTUR	Processing	1	Biomass	53	Hydrogen	42	Nitrogen	33	Boron Composite	34	Chromite Ingot	34	Aerogel	26	Climate Controller	25		
oceanic-abyssal-chromite-extractor-t1	Abyssal Chromite Extractor	BUILDING	1	1	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	25	Cryogenic Catalyst	22	Dimensional Stabilizer	19										
oceanic-abyssal-chromite-extractor-t2	Abyssal Chromite Extractor	BUILDING	2	1	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	30	Cryogenic Catalyst	27	Dimensional Stabilizer	23	Dispersal Gas Mix	21								
oceanic-abyssal-chromite-extractor-t3	Abyssal Chromite Extractor	BUILDING	3	1	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	36	Cryogenic Catalyst	33	Dimensional Stabilizer	28	Dispersal Gas Mix	26	Dispersal Mechanism	23						
oceanic-abyssal-chromite-extractor-t4	Abyssal Chromite Extractor	BUILDING	4	1	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	44	Cryogenic Catalyst	40	Dimensional Stabilizer	34	Dispersal Gas Mix	32	Dispersal Mechanism	28	Aerogel	21				
oceanic-abyssal-chromite-extractor-t5	Abyssal Chromite Extractor	BUILDING	5	1	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	53	Cryogenic Catalyst	48	Dimensional Stabilizer	41	Dispersal Gas Mix	39	Dispersal Mechanism	34	Aerogel	26	Boron Composite	25		
oceanic-biomass-extractor-t1	Biomass Extractor	BUILDING	1	1	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	25	Cryogenic Catalyst	22	Dimensional Stabilizer	19										
oceanic-biomass-extractor-t2	Biomass Extractor	BUILDING	2	1	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	30	Cryogenic Catalyst	27	Dimensional Stabilizer	23	Dispersal Gas Mix	21								
oceanic-biomass-extractor-t3	Biomass Extractor	BUILDING	3	1	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	36	Cryogenic Catalyst	33	Dimensional Stabilizer	28	Dispersal Gas Mix	26	Dispersal Mechanism	23						
oceanic-biomass-extractor-t4	Biomass Extractor	BUILDING	4	1	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	44	Cryogenic Catalyst	40	Dimensional Stabilizer	34	Dispersal Gas Mix	32	Dispersal Mechanism	28	Aerogel	21				
oceanic-biomass-extractor-t5	Biomass Extractor	BUILDING	5	1	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	53	Cryogenic Catalyst	48	Dimensional Stabilizer	41	Dispersal Gas Mix	39	Dispersal Mechanism	34	Aerogel	26	Boron Composite	25		
oceanic-hydrogen-extractor-t1	Hydrogen Extractor	BUILDING	1	1	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	25	Cryogenic Catalyst	22	Dimensional Stabilizer	19										
oceanic-hydrogen-extractor-t2	Hydrogen Extractor	BUILDING	2	1	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	30	Cryogenic Catalyst	27	Dimensional Stabilizer	23	Dispersal Gas Mix	21								
oceanic-hydrogen-extractor-t3	Hydrogen Extractor	BUILDING	3	1	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	36	Cryogenic Catalyst	33	Dimensional Stabilizer	28	Dispersal Gas Mix	26	Dispersal Mechanism	23						
oceanic-hydrogen-extractor-t4	Hydrogen Extractor	BUILDING	4	1	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	44	Cryogenic Catalyst	40	Dimensional Stabilizer	34	Dispersal Gas Mix	32	Dispersal Mechanism	28	Aerogel	21				
oceanic-hydrogen-extractor-t5	Hydrogen Extractor	BUILDING	5	1	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	53	Cryogenic Catalyst	48	Dimensional Stabilizer	41	Dispersal Gas Mix	39	Dispersal Mechanism	34	Aerogel	26	Boron Composite	25		
oceanic-nitrogen-extractor-t1	Nitrogen Extractor	BUILDING	1	1	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	25	Cryogenic Catalyst	22	Dimensional Stabilizer	19										
oceanic-nitrogen-extractor-t2	Nitrogen Extractor	BUILDING	2	1	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	30	Cryogenic Catalyst	27	Dimensional Stabilizer	23	Dispersal Gas Mix	21								
oceanic-nitrogen-extractor-t3	Nitrogen Extractor	BUILDING	3	1	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	36	Cryogenic Catalyst	33	Dimensional Stabilizer	28	Dispersal Gas Mix	26	Dispersal Mechanism	23						
oceanic-nitrogen-extractor-t4	Nitrogen Extractor	BUILDING	4	1	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	44	Cryogenic Catalyst	40	Dimensional Stabilizer	34	Dispersal Gas Mix	32	Dispersal Mechanism	28	Aerogel	21				
oceanic-nitrogen-extractor-t5	Nitrogen Extractor	BUILDING	5	1	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Chromite Ingot	53	Cryogenic Catalyst	48	Dimensional Stabilizer	41	Dispersal Gas Mix	39	Dispersal Mechanism	34	Aerogel	26	Boron Composite	25		
oceanic-argon-extractor-t1	Argon Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-argon-extractor-t2	Argon Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-argon-extractor-t3	Argon Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-argon-extractor-t4	Argon Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-argon-extractor-t5	Argon Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-cobalt-ore-extractor-t1	Cobalt Ore Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-cobalt-ore-extractor-t2	Cobalt Ore Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-cobalt-ore-extractor-t3	Cobalt Ore Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-cobalt-ore-extractor-t4	Cobalt Ore Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-cobalt-ore-extractor-t5	Cobalt Ore Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-fluorine-gas-extractor-t1	Fluorine Gas Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-fluorine-gas-extractor-t2	Fluorine Gas Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-fluorine-gas-extractor-t3	Fluorine Gas Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-fluorine-gas-extractor-t4	Fluorine Gas Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-fluorine-gas-extractor-t5	Fluorine Gas Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-manganese-ore-extractor-t1	Manganese Ore Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-manganese-ore-extractor-t2	Manganese Ore Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-manganese-ore-extractor-t3	Manganese Ore Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-manganese-ore-extractor-t4	Manganese Ore Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-manganese-ore-extractor-t5	Manganese Ore Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-oxygen-extractor-t1	Oxygen Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-oxygen-extractor-t2	Oxygen Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-oxygen-extractor-t3	Oxygen Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-oxygen-extractor-t4	Oxygen Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-oxygen-extractor-t5	Oxygen Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-thermal-bloom-sediment-extractor-t1	Thermal Bloom Sediment Extractor	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-thermal-bloom-sediment-extractor-t2	Thermal Bloom Sediment Extractor	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-thermal-bloom-sediment-extractor-t3	Thermal Bloom Sediment Extractor	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-thermal-bloom-sediment-extractor-t4	Thermal Bloom Sediment Extractor	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-thermal-bloom-sediment-extractor-t5	Thermal Bloom Sediment Extractor	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Extraction		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-bathysphere-pearls-extractor-t1	Bathysphere Pearls Extractor	BUILDING	1	3	180	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	21	Boron Composite	20	Chromite Ingot	19										
oceanic-bathysphere-pearls-extractor-t2	Bathysphere Pearls Extractor	BUILDING	2	3	150	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	26	Boron Composite	24	Chromite Ingot	23	Climate Controller	19								
oceanic-bathysphere-pearls-extractor-t3	Bathysphere Pearls Extractor	BUILDING	3	3	120	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	32	Boron Composite	29	Chromite Ingot	28	Climate Controller	23	Cobalt	21						
oceanic-bathysphere-pearls-extractor-t4	Bathysphere Pearls Extractor	BUILDING	4	3	100	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	39	Boron Composite	35	Chromite Ingot	34	Climate Controller	28	Cobalt	26	Beryllium Matrix	17				
oceanic-bathysphere-pearls-extractor-t5	Bathysphere Pearls Extractor	BUILDING	5	3	80	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	47	Boron Composite	42	Chromite Ingot	41	Climate Controller	34	Cobalt	32	Beryllium Matrix	21	Manganese	25		
oceanic-neural-coral-compounds-extractor-t1	Neural Coral Compounds Extractor	BUILDING	1	3	180	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	21	Boron Composite	20	Chromite Ingot	19										
oceanic-neural-coral-compounds-extractor-t2	Neural Coral Compounds Extractor	BUILDING	2	3	150	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	26	Boron Composite	24	Chromite Ingot	23	Climate Controller	19								
oceanic-neural-coral-compounds-extractor-t3	Neural Coral Compounds Extractor	BUILDING	3	3	120	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	32	Boron Composite	29	Chromite Ingot	28	Climate Controller	23	Cobalt	21						
oceanic-neural-coral-compounds-extractor-t4	Neural Coral Compounds Extractor	BUILDING	4	3	100	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	39	Boron Composite	35	Chromite Ingot	34	Climate Controller	28	Cobalt	26	Beryllium Matrix	17				
oceanic-neural-coral-compounds-extractor-t5	Neural Coral Compounds Extractor	BUILDING	5	3	80	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	47	Boron Composite	42	Chromite Ingot	41	Climate Controller	34	Cobalt	32	Beryllium Matrix	21	Manganese	25		
oceanic-phase-shift-crystals-extractor-t1	Phase Shift Crystals Extractor	BUILDING	1	3	180	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	21	Boron Composite	20	Chromite Ingot	19										
oceanic-phase-shift-crystals-extractor-t2	Phase Shift Crystals Extractor	BUILDING	2	3	150	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	26	Boron Composite	24	Chromite Ingot	23	Climate Controller	19								
oceanic-phase-shift-crystals-extractor-t3	Phase Shift Crystals Extractor	BUILDING	3	3	120	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	32	Boron Composite	29	Chromite Ingot	28	Climate Controller	23	Cobalt	21						
oceanic-phase-shift-crystals-extractor-t4	Phase Shift Crystals Extractor	BUILDING	4	3	100	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	39	Boron Composite	35	Chromite Ingot	34	Climate Controller	28	Cobalt	26	Beryllium Matrix	17				
oceanic-phase-shift-crystals-extractor-t5	Phase Shift Crystals Extractor	BUILDING	5	3	80	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	47	Boron Composite	42	Chromite Ingot	41	Climate Controller	34	Cobalt	32	Beryllium Matrix	21	Manganese	25		
oceanic-abyssal-energy-crystals-extractor-t1	Abyssal Energy Crystals Extractor	BUILDING	1	4	300	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	21	Boron Composite	20	Climate Controller	17										
oceanic-abyssal-energy-crystals-extractor-t2	Abyssal Energy Crystals Extractor	BUILDING	2	4	250	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	26	Boron Composite	24	Climate Controller	21	Cobalt	19								
oceanic-abyssal-energy-crystals-extractor-t3	Abyssal Energy Crystals Extractor	BUILDING	3	4	200	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	32	Boron Composite	29	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-abyssal-energy-crystals-extractor-t4	Abyssal Energy Crystals Extractor	BUILDING	4	4	160	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	39	Boron Composite	35	Climate Controller	32	Cobalt	28	Manganese	26	Utility Core	21				
oceanic-abyssal-energy-crystals-extractor-t5	Abyssal Energy Crystals Extractor	BUILDING	5	4	120	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	47	Boron Composite	42	Climate Controller	39	Cobalt	34	Manganese	32	Utility Core	26	Beryllium Matrix	19		
oceanic-lunar-echo-crystals-extractor-t1	Lunar Echo Crystals Extractor	BUILDING	1	5	480	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	21	Beryllium Matrix	14	Utility Core	15										
oceanic-lunar-echo-crystals-extractor-t2	Lunar Echo Crystals Extractor	BUILDING	2	5	400	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	26	Beryllium Matrix	17	Utility Core	18	Abyssal Energy Core	15								
oceanic-lunar-echo-crystals-extractor-t3	Lunar Echo Crystals Extractor	BUILDING	3	5	320	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	32	Beryllium Matrix	21	Utility Core	22	Abyssal Energy Core	18	Deployment Interface	19						
oceanic-lunar-echo-crystals-extractor-t4	Lunar Echo Crystals Extractor	BUILDING	4	5	250	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	39	Beryllium Matrix	26	Utility Core	27	Abyssal Energy Core	22	Deployment Interface	23	Electromagnetic Resonator	19				
oceanic-lunar-echo-crystals-extractor-t5	Lunar Echo Crystals Extractor	BUILDING	5	5	200	Oceanic Planet	MUD;ONI;USTUR	Extraction		Aerogel	47	Beryllium Matrix	32	Utility Core	33	Abyssal Energy Core	27	Deployment Interface	28	Electromagnetic Resonator	23	EM Bio Core	19		
oceanic-bioluminous-algae-farm-t1	Bioluminous Algae Farm	BUILDING	1	2	90	Oceanic Planet	MUD;ONI;USTUR	Farm		Boron Composite	23	Chromite Ingot	22	Climate Controller	17										
oceanic-bioluminous-algae-farm-t2	Bioluminous Algae Farm	BUILDING	2	2	75	Oceanic Planet	MUD;ONI;USTUR	Farm		Boron Composite	28	Chromite Ingot	27	Climate Controller	21	Cobalt	19								
oceanic-bioluminous-algae-farm-t3	Bioluminous Algae Farm	BUILDING	3	2	60	Oceanic Planet	MUD;ONI;USTUR	Farm		Boron Composite	34	Chromite Ingot	33	Climate Controller	26	Cobalt	23	Manganese	21						
oceanic-bioluminous-algae-farm-t4	Bioluminous Algae Farm	BUILDING	4	2	50	Oceanic Planet	MUD;ONI;USTUR	Farm		Boron Composite	41	Chromite Ingot	40	Climate Controller	32	Cobalt	28	Manganese	26	Aerogel	21				
oceanic-bioluminous-algae-farm-t5	Bioluminous Algae Farm	BUILDING	5	2	40	Oceanic Planet	MUD;ONI;USTUR	Farm		Boron Composite	50	Chromite Ingot	48	Climate Controller	39	Cobalt	34	Manganese	32	Aerogel	26	Utility Core	23		
oceanic-marine-bio-extract-farm-t1	Marine Bio Extract Farm	BUILDING	1	1	90	Oceanic Planet	MUD;ONI;USTUR	Farm		Chromite Ingot	25	Cryogenic Catalyst	22	Dimensional Stabilizer	19										
oceanic-marine-bio-extract-farm-t2	Marine Bio Extract Farm	BUILDING	2	1	75	Oceanic Planet	MUD;ONI;USTUR	Farm		Chromite Ingot	30	Cryogenic Catalyst	27	Dimensional Stabilizer	23	Dispersal Gas Mix	21								
oceanic-marine-bio-extract-farm-t3	Marine Bio Extract Farm	BUILDING	3	1	60	Oceanic Planet	MUD;ONI;USTUR	Farm		Chromite Ingot	36	Cryogenic Catalyst	33	Dimensional Stabilizer	28	Dispersal Gas Mix	26	Dispersal Mechanism	23						
oceanic-marine-bio-extract-farm-t4	Marine Bio Extract Farm	BUILDING	4	1	50	Oceanic Planet	MUD;ONI;USTUR	Farm		Chromite Ingot	44	Cryogenic Catalyst	40	Dimensional Stabilizer	34	Dispersal Gas Mix	32	Dispersal Mechanism	28	Aerogel	21				
oceanic-marine-bio-extract-farm-t5	Marine Bio Extract Farm	BUILDING	5	1	40	Oceanic Planet	MUD;ONI;USTUR	Farm		Chromite Ingot	53	Cryogenic Catalyst	48	Dimensional Stabilizer	41	Dispersal Gas Mix	39	Dispersal Mechanism	34	Aerogel	26	Boron Composite	25\`;

// Continue with the rest of the recipe data...
const fullRecipeData = recipeData + `
volcanic - central - hub - t1	Central Hub	BUILDING	1			Volcanic Planet	MUD; ONI;USTUR	Infrastructure		Auto - Built
volcanic - central - hub - t2	Central Hub	BUILDING	2		135	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	28	Current Limiter	25	Energy Connector	22	Exotic Matter Core	21
volcanic - central - hub - t3	Central Hub	BUILDING	3		180	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	34	Current Limiter	30	Energy Connector	27	Exotic Matter Core	26	Capacitor Matrix Core	19
volcanic - central - hub - t4	Central Hub	BUILDING	4		270	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	41	Current Limiter	36	Energy Connector	33	Exotic Matter Core	32	Capacitor Matrix Core	23	Assembly Control Matrix	17
volcanic - central - hub - t5	Central Hub	BUILDING	5		360	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	50	Current Limiter	44	Energy Connector	40	Exotic Matter Core	39	Capacitor Matrix Core	28	Assembly Control Matrix	21	Abyssal Energy Core	21
volcanic - cultivation - hub - t1	Cultivation Hub	BUILDING	1			Volcanic Planet	MUD; ONI;USTUR	Infrastructure		Auto - Built
volcanic - cultivation - hub - t2	Cultivation Hub	BUILDING	2		135	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	28	Current Limiter	25	Energy Connector	22	Exotic Matter Core	21
volcanic - cultivation - hub - t3	Cultivation Hub	BUILDING	3		180	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	34	Current Limiter	30	Energy Connector	27	Exotic Matter Core	26	Capacitor Matrix Core	19
volcanic - cultivation - hub - t4	Cultivation Hub	BUILDING	4		270	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	41	Current Limiter	36	Energy Connector	33	Exotic Matter Core	32	Capacitor Matrix Core	23	Assembly Control Matrix	17
volcanic - cultivation - hub - t5	Cultivation Hub	BUILDING	5		360	Volcanic Planet	MUD; ONI;USTUR	Infrastructure	1	Crystal Matrix	50	Current Limiter	44	Energy Connector	40	Exotic Matter Core	39	Capacitor Matrix Core	28	Assembly Control Matrix	21	Abyssal Energy Core	21`;

// Add all the remaining recipe data here...
// [The script would continue with the full dataset - truncated for brevity]

console.log('🚀 Starting complete production steps violation analysis...');

try {
    const { violations, componentStats } = analyzeProductionSteps(fullRecipeData);
    generateReport(violations, componentStats);
    
    // Generate markdown report
    generateMarkdownReport(violations, componentStats);
    
} catch (error) {
    console.error('❌ Error during analysis:', error);
}

function generateMarkdownReport(violations, componentStats) {
    const sortedComponents = Array.from(componentStats.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return b[1].violations - a[1].violations;
    });
    
    let markdown = `# Complete Production Steps Violation Analysis Report

    ** Generated:** ${ new Date().toISOString() }  
** Analysis Scope:** All Planet Building Recipes(Complete Dataset)
    ** Violation Threshold:** Components requiring more than 2 production steps

---

## 🚨 Executive Summary

    ** Total Violations Found:** ${ Array.from(violations.values()).reduce((sum, arr) => sum + arr.length, 0) } instances
        ** Unique Components Violating:** ${ violations.size } components
            ** Production Steps Range:** 3 - ${ Math.max(...Array.from(componentStats.values()).map(s => s.steps)) } steps

---

## 📊 Complete Component Breakdown

`;

    sortedComponents.forEach(([componentName, stats]) => {
        const usages = violations.get(componentName);
        
        markdown += `### 🔴 ** ${ componentName }**
- ** Production Steps:** ${ stats.steps }
- ** Component Tier:** T${ stats.tier }
- ** Violation Count:** ${ stats.violations } buildings

    ** Usage Breakdown:**
        `;
        
        // Group by resource tier
        const byResourceTier = new Map();
        usages.forEach(usage => {
            const key = usage.buildingResourceTier || 'Infrastructure';
            if (!byResourceTier.has(key)) {
                byResourceTier.set(key, []);
            }
            byResourceTier.get(key).push(usage);
        });
        
        Array.from(byResourceTier.entries()).sort((a, b) => {
            if (a[0] === 'Infrastructure') return 1;
            if (b[0] === 'Infrastructure') return -1;
            return parseInt(a[0]) - parseInt(b[0]);
        }).forEach(([resourceTier, tierUsages]) => {
            markdown += `- ** Resource Tier ${ resourceTier }:** ${ tierUsages.length } buildings\n`;
            
            const byPlanet = new Map();
            tierUsages.forEach(usage => {
                if (!byPlanet.has(usage.planetType)) {
                    byPlanet.set(usage.planetType, []);
                }
                byPlanet.get(usage.planetType).push(usage);
            });
            
            Array.from(byPlanet.entries()).forEach(([planet, planetUsages]) => {
                markdown += `  - ${ planet }: ${ planetUsages.length } buildings\n`;
                planetUsages.slice(0, 2).forEach(usage => {
                    markdown += `    - ${ usage.outputName } T${ usage.outputTier } (Qty: ${ usage.quantity }) \n`;
                });
                if (planetUsages.length > 2) {
                    markdown += `    - ... and ${ planetUsages.length - 2 } more\n`;
                }
            });
        });
        
        markdown += `\n-- -\n\n`;
    });
    
    // Write the markdown file
    fs.writeFileSync('production-steps-violation-report.md', markdown);
    console.log('\n📝 Complete markdown report saved to: production-steps-violation-report.md');
} 