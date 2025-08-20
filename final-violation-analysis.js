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

// Load recipe data from TSV file
function loadRecipeData() {
    const tsvContent = fs.readFileSync('recipe_data.tsv', 'utf8');
    const lines = tsvContent.split('\n');
    const header = lines[0].split('\t');

    const recipes = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('\t');
        const recipe = {};

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

        if (ingredient && ingredient.trim() && ingredient !== 'Auto-Built') {
            ingredients.push({
                name: ingredient.trim(),
                quantity: parseInt(quantity) || 0
            });
        }
    }

    return ingredients;
}

// Main analysis function
function analyzeProductionSteps() {
    console.log('🔍 Loading component data...');
    const componentData = loadComponentData();

    console.log('📊 Loading recipe data...');
    const recipes = loadRecipeData();

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
                    buildingResourceTier: recipe.BuildingResourceTier || 'Infrastructure',
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
    console.log('🚨 COMPLETE PRODUCTION STEPS VIOLATION ANALYSIS REPORT');
    console.log('='.repeat(80));

    const totalViolations = Array.from(violations.values()).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`\n📊 EXECUTIVE SUMMARY:`);
    console.log(`Total Violating Components: ${violations.size}`);
    console.log(`Total Violation Instances: ${totalViolations}`);

    // Sort components by production steps (highest first), then by violation count
    const sortedComponents = Array.from(componentStats.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return b[1].violations - a[1].violations;
    });

    console.log(`\n📋 ALL ${violations.size} VIOLATING COMPONENTS:`);
    console.log('-'.repeat(80));

    sortedComponents.forEach(([componentName, stats], index) => {
        const usages = violations.get(componentName);

        console.log(`\n${index + 1}. 🔴 ${componentName}`);
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

                // Show all buildings for complete visibility
                planetUsages.forEach(usage => {
                    console.log(`         • ${usage.outputName} T${usage.outputTier} (${usage.resourceType}) - Qty: ${usage.quantity}`);
                });
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

    // Generate markdown report
    generateMarkdownReport(violations, componentStats);
}

function generateMarkdownReport(violations, componentStats) {
    const sortedComponents = Array.from(componentStats.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return b[1].violations - a[1].violations;
    });

    const totalViolations = Array.from(violations.values()).reduce((sum, arr) => sum + arr.length, 0);

    let markdown = `# Complete Production Steps Violation Analysis Report

**Generated:** ${new Date().toLocaleString()}  
**Analysis Scope:** All Planet Building Recipes (Complete Dataset)  
**Violation Threshold:** Components requiring more than 2 production steps  

---

## 🚨 Executive Summary

**Total Violations Found:** ${totalViolations} instances  
**Unique Components Violating:** ${violations.size} components  
**Production Steps Range:** 3-${Math.max(...Array.from(componentStats.values()).map(s => s.steps))} steps  

---

## 📊 Complete Component Breakdown (All ${violations.size} Components)

`;

    sortedComponents.forEach(([componentName, stats], index) => {
        const usages = violations.get(componentName);

        markdown += `### ${index + 1}. 🔴 **${componentName}**
- **Production Steps:** ${stats.steps}
- **Component Tier:** T${stats.tier}
- **Violation Count:** ${stats.violations} buildings

**Complete Usage Breakdown:**
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
            markdown += `- **Resource Tier ${resourceTier}:** ${tierUsages.length} buildings\n`;

            const byPlanet = new Map();
            tierUsages.forEach(usage => {
                if (!byPlanet.has(usage.planetType)) {
                    byPlanet.set(usage.planetType, []);
                }
                byPlanet.get(usage.planetType).push(usage);
            });

            Array.from(byPlanet.entries()).forEach(([planet, planetUsages]) => {
                markdown += `  - **${planet}:** ${planetUsages.length} buildings\n`;
                planetUsages.forEach(usage => {
                    markdown += `    - ${usage.outputName} T${usage.outputTier} (${usage.resourceType}) - Qty: ${usage.quantity}\n`;
                });
            });
        });

        markdown += `\n---\n\n`;
    });

    // Critical analysis
    const t1ResourceViolations = [];
    violations.forEach((usages, componentName) => {
        usages.forEach(usage => {
            if (usage.buildingResourceTier === '1') {
                t1ResourceViolations.push({
                    component: componentName,
                    steps: componentStats.get(componentName).steps,
                    building: usage.outputName,
                    tier: usage.outputTier,
                    planet: usage.planetType
                });
            }
        });
    });

    markdown += `## 🚨 Critical Analysis

### T1 Resource Buildings Using Complex Components
`;

    if (t1ResourceViolations.length > 0) {
        t1ResourceViolations.forEach(violation => {
            markdown += `- **${violation.component}** (${violation.steps} steps) used in ${violation.building} T${violation.tier} on ${violation.planet}\n`;
        });
    } else {
        markdown += `✅ **No T1 resource buildings using complex components found.**\n`;
    }

    markdown += `\n### Recommendations

1. **Replace complex components** in T1-T2 resource buildings with simpler alternatives
2. **Focus on Infrastructure buildings** - they can handle more complex components
3. **Consider component alternatives** for early-game progression
4. **Review T3+ resource buildings** for optimization opportunities

---

*Report generated by automated analysis tool*`;

    // Write the markdown file
    fs.writeFileSync('production-steps-violation-report.md', markdown);
    console.log('\n📝 Complete markdown report saved to: production-steps-violation-report.md');
}

// Main execution
console.log('🚀 Starting complete production steps violation analysis...');

try {
    const { violations, componentStats } = analyzeProductionSteps();
    generateReport(violations, componentStats);

} catch (error) {
    console.error('❌ Error during analysis:', error);
    console.error(error.stack);
} 