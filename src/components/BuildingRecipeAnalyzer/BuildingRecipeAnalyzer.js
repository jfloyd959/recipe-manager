import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './BuildingRecipeAnalyzer.css';

const BuildingRecipeAnalyzer = () => {
    const { recipes: masterRecipes, reloadFromCSV } = useRecipes();
    const [inputData, setInputData] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReloading, setIsReloading] = useState(false);

    // Debug: Log when master recipes change
    useEffect(() => {
        console.log('RecipeAnalyzer: Master recipes updated:', {
            count: masterRecipes?.length || 0,
            isArray: Array.isArray(masterRecipes),
            sample: masterRecipes?.slice(0, 3)?.map(r => r.OutputName || r.outputName)
        });
    }, [masterRecipes]);

    // Banned components that should never appear in building recipes
    const BANNED_COMPONENTS = new Set([
        // Weapon/Ammo components
        'Blast Charges',
        'Ammo Control Core',
        'Beam Interface Core',
        'Beam Emitter',
        'Field Harmonizer',
        'Signal Booster',
        'Emergency Suppressant',
        'Interference Shield',
        'Thrust Modulator',

        // Ship control systems
        'Control System Core',
        'Coordination Matrix',
        'Emergency Matrix Core',
        'Crystal Lattice MUD',
        'Crystal Lattice ONI',
        'Crystal Lattice Ustur',
        'Drive Assembly Core',
        'Launch Platform Core',
        'Jasphorus Propulsion Core',
        'Kinetic Opal Core',

        // Ship cooling/power systems
        'Coolant Circulator',
        'Cooling Network Hub',
        'Cryogenic Core',
        'Neural Networks',

        // Defense systems
        'Shield Generator',
        'Defense Matrix',
        'Countermeasure System'
    ]);

    // Infrastructure building types
    const INFRASTRUCTURE_TYPES = new Set([
        'Central Hub',
        'Cultivation Hub',
        'Processing Hub',
        'Extraction Hub',
        'Storage Hub',
        'Farm Hub',
        'Power Plant',
        'Crew Quarters'
    ]);

    // Parse TSV data into recipe objects
    const parseTSVData = (tsvData) => {
        const lines = tsvData.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split('\t');
        const recipes = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const recipe = {};
            headers.forEach((header, index) => {
                recipe[header] = values[index] || '';
            });
            recipes.push(recipe);
        }

        return recipes;
    };

    // Get component tier from master recipes
    const getComponentTier = (componentName) => {
        if (!masterRecipes || !Array.isArray(masterRecipes)) {
            return null;
        }
        const component = masterRecipes.find(r =>
            (r.OutputName === componentName || r.outputName === componentName) &&
            (r.OutputType === 'COMPONENT' || r.outputType === 'COMPONENT')
        );
        return component ? parseInt(component.OutputTier || component.outputTier || 1) : null;
    };

    // Get resource tier (for extractors/processors)
    const getResourceTier = (buildingName) => {
        // Extract resource name from building name
        const extractorMatch = buildingName.match(/^(.+?)\s+Extractor$/);
        const processorMatch = buildingName.match(/^(.+?)\s+Processor$/);

        if (extractorMatch || processorMatch) {
            let resourceName = extractorMatch ? extractorMatch[1] : processorMatch[1];

            // Remove planet prefix (e.g., "oceanic-cobalt" → "cobalt")
            resourceName = resourceName.replace(/^[a-z]+-/, '');

            // Convert kebab-case to proper case and add common suffixes
            resourceName = resourceName.split('-').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            // Try common resource name patterns
            const resourcePatterns = [
                resourceName + ' Ore',      // "Cobalt" → "Cobalt Ore"
                resourceName,               // "Biomass" → "Biomass"
                resourceName + ' Gas',      // "Fluorine" → "Fluorine Gas"
                resourceName + ' Crystals', // "Abyssal Energy" → "Abyssal Energy Crystals"
                'Abyssal ' + resourceName,  // "Chromite" → "Abyssal Chromite"
            ];

            // Find the resource in master recipes
            if (!masterRecipes || !Array.isArray(masterRecipes)) {
                return null;
            }

            for (const pattern of resourcePatterns) {
                const resource = masterRecipes.find(r => {
                    const name = r.OutputName || r.outputName || '';
                    const type = r.OutputType || r.outputType || '';
                    return name === pattern &&
                        (type === 'RESOURCE' || type === 'BASIC RESOURCE' ||
                            type === 'BASIC ORGANIC RESOURCE');
                });

                if (resource) {
                    console.log(`Found resource: ${pattern} (T${resource.OutputTier || resource.outputTier})`);
                    return parseInt(resource.OutputTier || resource.outputTier || 1);
                }
            }

            // Default tiers for common resources if not found
            if (resourceName.includes('Ore') || resourceName.includes('Gas')) return 1;
            if (resourceName.includes('Crystal')) return 2;
            if (resourceName.includes('Energy')) return 3;
            return 1;
        }

        return null;
    };

    // Check if a component is native to a planet
    const isComponentNativeToPlanet = (componentName, planetType) => {
        // If masterRecipes is not loaded yet, return true to avoid false violations
        if (!masterRecipes || !Array.isArray(masterRecipes)) {
            console.warn('Master recipes not loaded, skipping native check for:', componentName);
            return true;
        }

        // First check if it's a basic resource
        const resource = masterRecipes.find(r => {
            const name = r.OutputName || r.outputName || '';
            const type = r.OutputType || r.outputType || '';
            const planets = r.PlanetTypes || r.planetTypes || '';
            return name === componentName &&
                (type === 'RESOURCE' || type === 'BASIC RESOURCE' ||
                    type === 'BASIC ORGANIC RESOURCE') &&
                planets.includes(planetType);
        });

        if (resource) return true;

        // Check if it's a component that can be made from native resources
        const component = masterRecipes.find(r => {
            const name = r.OutputName || r.outputName || '';
            const type = r.OutputType || r.outputType || '';
            return name === componentName && type === 'COMPONENT';
        });

        if (!component) return false;

        // Check component's ingredients recursively
        const checkIngredients = (comp, visited = new Set()) => {
            if (!comp) return false;

            const compId = comp.OutputID || comp.outputID || comp.OutputName || comp.outputName;
            if (visited.has(compId)) return false;
            visited.add(compId);

            // Check all ingredients
            for (let i = 1; i <= 8; i++) {
                const ingredient = comp[`Ingredient${i}`] || comp[`ingredient${i}`];
                if (!ingredient || ingredient === 'Auto-Built') continue;

                // Check if ingredient is native resource
                const isNativeResource = masterRecipes && masterRecipes.some(r => {
                    const name = r.OutputName || r.outputName || '';
                    const type = r.OutputType || r.outputType || '';
                    const planets = r.PlanetTypes || r.planetTypes || '';
                    return name === ingredient &&
                        (type === 'RESOURCE' || type === 'BASIC RESOURCE') &&
                        planets.includes(planetType);
                });

                if (!isNativeResource) {
                    // Check if it's a component that can be made natively
                    const subComponent = masterRecipes && masterRecipes.find(r => {
                        const name = r.OutputName || r.outputName || '';
                        return name === ingredient;
                    });

                    if (!subComponent || !checkIngredients(subComponent, visited)) {
                        return false;
                    }
                }
            }

            return true;
        };

        return checkIngredients(component);
    };

    // Analyze recipes for rule violations
    const analyzeRecipes = () => {
        setIsAnalyzing(true);

        try {
            // Check if master recipes are loaded
            if (!masterRecipes || !Array.isArray(masterRecipes) || masterRecipes.length === 0) {
                alert('Master recipe data not loaded. Please ensure the component data is loaded first.');
                setIsAnalyzing(false);
                return;
            }

            const recipes = parseTSVData(inputData);
            if (recipes.length === 0) {
                alert('No valid recipe data found. Please paste TSV data with headers.');
                setIsAnalyzing(false);
                return;
            }

            const violations = {
                bannedComponents: [],
                tierViolations: [],
                nativeViolations: [],
                infrastructureViolations: [],
                progressionViolations: []
            };

            const statistics = {
                totalRecipes: recipes.length,
                byPlanet: {},
                byType: {},
                byTier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                componentUsage: {}
            };

            // Group recipes by building family for progression checks
            const buildingFamilies = {};

            recipes.forEach(recipe => {
                const buildingTier = parseInt(recipe.OutputTier) || 1;
                const planetType = recipe.PlanetTypes || '';
                const buildingType = recipe.ResourceType || '';
                const buildingName = recipe.OutputName || '';

                // Update statistics
                statistics.byTier[buildingTier] = (statistics.byTier[buildingTier] || 0) + 1;
                statistics.byType[buildingType] = (statistics.byType[buildingType] || 0) + 1;
                statistics.byPlanet[planetType] = (statistics.byPlanet[planetType] || 0) + 1;

                // Group by building family
                const familyKey = `${planetType}-${buildingName}`;
                if (!buildingFamilies[familyKey]) {
                    buildingFamilies[familyKey] = {};
                }
                buildingFamilies[familyKey][buildingTier] = recipe;

                // Collect all ingredients
                const ingredients = [];
                for (let i = 1; i <= 8; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    const quantity = recipe[`Quantity${i}`];
                    if (ingredient && ingredient !== 'Auto-Built') {
                        ingredients.push({ name: ingredient, quantity: parseInt(quantity) || 0 });

                        // Track component usage
                        statistics.componentUsage[ingredient] =
                            (statistics.componentUsage[ingredient] || 0) + 1;
                    }
                }

                // Check for banned components
                ingredients.forEach(ing => {
                    if (BANNED_COMPONENTS.has(ing.name)) {
                        violations.bannedComponents.push({
                            building: recipe.OutputID,
                            tier: buildingTier,
                            component: ing.name,
                            quantity: ing.quantity
                        });
                    }
                });

                // Check native building requirements (T1-T3)
                if (buildingTier <= 3 && planetType) {
                    ingredients.forEach(ing => {
                        if (!isComponentNativeToPlanet(ing.name, planetType)) {
                            violations.nativeViolations.push({
                                building: recipe.OutputID,
                                tier: buildingTier,
                                planet: planetType,
                                component: ing.name,
                                reason: 'Not native to planet'
                            });
                        }
                    });
                }

                // Check tier restrictions
                const isInfrastructure = INFRASTRUCTURE_TYPES.has(buildingName);
                const buildingResourceTier = recipe.BuildingResourceTier ? parseInt(recipe.BuildingResourceTier) : null;

                if (isInfrastructure) {
                    // Infrastructure buildings should use components matching building tier
                    ingredients.forEach(ing => {
                        const componentTier = getComponentTier(ing.name);
                        if (componentTier && componentTier > buildingTier) {
                            violations.infrastructureViolations.push({
                                building: recipe.OutputID,
                                buildingTier,
                                component: ing.name,
                                componentTier,
                                reason: 'Component tier exceeds building tier'
                            });
                        }
                    });
                } else if (buildingType === 'Extraction' || buildingType === 'Processing') {
                    // Resource extractors/processors have different rules
                    const resourceTier = getResourceTier(buildingName);

                    if (resourceTier) {
                        // T1-T3: ingredients should not exceed resource tier
                        // T4-T5: can use higher tier ingredients
                        if (buildingTier <= 3) {
                            ingredients.forEach(ing => {
                                const componentTier = getComponentTier(ing.name);
                                if (componentTier && componentTier > resourceTier) {
                                    violations.tierViolations.push({
                                        building: recipe.OutputID,
                                        buildingTier,
                                        resourceTier,
                                        component: ing.name,
                                        componentTier,
                                        reason: `T${buildingTier} building using T${componentTier} component (resource is T${resourceTier})`
                                    });
                                }
                            });
                        }
                    }
                }

                // ENHANCED: Check that component tiers don't exceed building resource tier for ALL buildings
                if (buildingResourceTier) {
                    ingredients.forEach(ing => {
                        const componentTier = getComponentTier(ing.name);
                        if (componentTier && componentTier > buildingResourceTier) {
                            violations.tierViolations.push({
                                building: recipe.OutputID,
                                buildingTier,
                                buildingResourceTier,
                                component: ing.name,
                                componentTier,
                                reason: `Component T${componentTier} exceeds building resource tier T${buildingResourceTier}`
                            });
                        }
                    });
                }
            });

            // Check progression violations (ingredients should build up, not be replaced)
            Object.entries(buildingFamilies).forEach(([family, tiers]) => {
                const tierNumbers = Object.keys(tiers).map(Number).sort();

                for (let i = 1; i < tierNumbers.length; i++) {
                    const prevTier = tiers[tierNumbers[i - 1]];
                    const currTier = tiers[tierNumbers[i]];

                    // Get ingredients from previous tier
                    const prevIngredients = new Set();
                    for (let j = 1; j <= 8; j++) {
                        const ing = prevTier[`Ingredient${j}`];
                        if (ing && ing !== 'Auto-Built') {
                            prevIngredients.add(ing);
                        }
                    }

                    // Check if current tier maintains previous ingredients
                    const currIngredients = new Set();
                    for (let j = 1; j <= 8; j++) {
                        const ing = currTier[`Ingredient${j}`];
                        if (ing && ing !== 'Auto-Built') {
                            currIngredients.add(ing);
                        }
                    }

                    // Special case: T1->T2 infrastructure can replace raw materials
                    const isInfrastructure = INFRASTRUCTURE_TYPES.has(prevTier.OutputName);
                    const isT1toT2 = tierNumbers[i - 1] === 1 && tierNumbers[i] === 2;

                    if (!isInfrastructure || !isT1toT2) {
                        // Check for missing ingredients (should build up, not replace)
                        prevIngredients.forEach(ing => {
                            if (!currIngredients.has(ing)) {
                                violations.progressionViolations.push({
                                    building: currTier.OutputID,
                                    previousTier: tierNumbers[i - 1],
                                    currentTier: tierNumbers[i],
                                    missingIngredient: ing,
                                    reason: 'Ingredient removed in tier progression'
                                });
                            }
                        });
                    }
                }
            });

            // Calculate summary statistics
            const totalViolations =
                violations.bannedComponents.length +
                violations.tierViolations.length +
                violations.nativeViolations.length +
                violations.infrastructureViolations.length +
                violations.progressionViolations.length;

            const results = {
                valid: totalViolations === 0,
                violations,
                statistics,
                summary: {
                    totalViolations,
                    bannedComponentsCount: violations.bannedComponents.length,
                    tierViolationsCount: violations.tierViolations.length,
                    nativeViolationsCount: violations.nativeViolations.length,
                    infrastructureViolationsCount: violations.infrastructureViolations.length,
                    progressionViolationsCount: violations.progressionViolations.length,
                    uniqueBannedComponents: [...new Set(violations.bannedComponents.map(v => v.component))],
                    recipesWithViolations: new Set([
                        ...violations.bannedComponents.map(v => v.building),
                        ...violations.tierViolations.map(v => v.building),
                        ...violations.nativeViolations.map(v => v.building),
                        ...violations.infrastructureViolations.map(v => v.building),
                        ...violations.progressionViolations.map(v => v.building)
                    ]).size
                }
            };

            setAnalysisResults(results);
        } catch (error) {
            console.error('Error analyzing recipes:', error);
            alert('Error analyzing recipes. Please check the format and try again.');
        }

        setIsAnalyzing(false);
    };

    // Export detailed report
    const exportReport = () => {
        if (!analysisResults) return;

        let report = '=== BUILDING RECIPE ANALYSIS REPORT ===\n\n';

        // Summary
        report += `Status: ${analysisResults.valid ? '✅ PASSED' : '❌ FAILED'}\n`;
        report += `Total Violations: ${analysisResults.summary.totalViolations}\n\n`;

        // Violation breakdown
        report += '=== VIOLATION SUMMARY ===\n';
        report += `Banned Components: ${analysisResults.summary.bannedComponentsCount}\n`;
        report += `Tier Violations: ${analysisResults.summary.tierViolationsCount}\n`;
        report += `Native Building Violations: ${analysisResults.summary.nativeViolationsCount}\n`;
        report += `Infrastructure Violations: ${analysisResults.summary.infrastructureViolationsCount}\n`;
        report += `Progression Violations: ${analysisResults.summary.progressionViolationsCount}\n\n`;

        // Detailed violations
        if (analysisResults.violations.bannedComponents.length > 0) {
            report += '=== BANNED COMPONENTS ===\n';
            analysisResults.violations.bannedComponents.forEach(v => {
                report += `  ${v.building} (T${v.tier}): Uses ${v.component} x${v.quantity}\n`;
            });
            report += '\n';
        }

        if (analysisResults.violations.tierViolations.length > 0) {
            report += '=== TIER VIOLATIONS ===\n';
            analysisResults.violations.tierViolations.forEach(v => {
                const resourceTierInfo = v.buildingResourceTier ? ` (Building Resource T${v.buildingResourceTier})` : '';
                const buildingTierInfo = v.buildingTier ? ` [Building T${v.buildingTier}]` : '';
                const componentInfo = v.componentTier ? ` - Component: ${v.component} T${v.componentTier}` : '';
                report += `  ${v.building}${buildingTierInfo}${resourceTierInfo}: ${v.reason}${componentInfo}\n`;
            });
            report += '\n';
        }

        if (analysisResults.violations.nativeViolations.length > 0) {
            report += '=== NATIVE BUILDING VIOLATIONS ===\n';
            analysisResults.violations.nativeViolations.forEach(v => {
                report += `  ${v.building} (T${v.tier} on ${v.planet}): ${v.component} - ${v.reason}\n`;
            });
            report += '\n';
        }

        // Download report
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'recipe_analysis_report.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="recipe-analyzer-container">
            <div className="analyzer-header">
                <h2>Building Recipe Analyzer</h2>
                <p>Validate generated recipes against all construction rules</p>
            </div>

            {/* Status indicator for master recipe data */}
            <div className={`data-status ${masterRecipes && masterRecipes.length > 0 ? 'loaded' : 'not-loaded'}`}>
                <span className="status-icon">
                    {masterRecipes && masterRecipes.length > 0 ? '✅' : '⚠️'}
                </span>
                <span className="status-text">
                    {masterRecipes && masterRecipes.length > 0
                        ? `Master recipe data loaded (${masterRecipes.length} recipes)`
                        : 'Master recipe data not loaded - analysis may be limited'}
                </span>
                {(!masterRecipes || masterRecipes.length === 0) && (
                    <button
                        onClick={async () => {
                            setIsReloading(true);
                            try {
                                console.log('RecipeAnalyzer: Manually reloading CSV data...');
                                await reloadFromCSV();
                                console.log('RecipeAnalyzer: CSV reload completed');
                            } catch (error) {
                                console.error('RecipeAnalyzer: Failed to reload CSV:', error);
                            } finally {
                                setIsReloading(false);
                            }
                        }}
                        disabled={isReloading}
                        className="reload-button"
                    >
                        {isReloading ? 'Loading...' : 'Load Master Data'}
                    </button>
                )}
            </div>

            <div className="input-section">
                <h3>Paste Building Recipe Data (TSV Format)</h3>
                <textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder="Paste your TSV data here (including headers)..."
                    rows={10}
                />
                <button
                    onClick={analyzeRecipes}
                    disabled={!inputData || isAnalyzing}
                    className="analyze-button"
                >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Recipes'}
                </button>
            </div>

            {analysisResults && (
                <div className="results-section">
                    <div className={`validation-status ${analysisResults.valid ? 'valid' : 'invalid'}`}>
                        <h3>{analysisResults.valid ? '✅ Validation Passed' : '❌ Validation Failed'}</h3>
                        <p>
                            {analysisResults.valid
                                ? 'All recipes comply with building construction rules!'
                                : `Found ${analysisResults.summary.totalViolations} violations in ${analysisResults.summary.recipesWithViolations} recipes`
                            }
                        </p>
                    </div>

                    {!analysisResults.valid && (
                        <div className="violations-summary">
                            <h3>Violation Summary</h3>
                            <div className="violation-stats">
                                {analysisResults.summary.bannedComponentsCount > 0 && (
                                    <div className="violation-stat">
                                        <span className="violation-count">{analysisResults.summary.bannedComponentsCount}</span>
                                        <span className="violation-label">Banned Components</span>
                                    </div>
                                )}
                                {analysisResults.summary.tierViolationsCount > 0 && (
                                    <div className="violation-stat">
                                        <span className="violation-count">{analysisResults.summary.tierViolationsCount}</span>
                                        <span className="violation-label">Tier Violations</span>
                                    </div>
                                )}
                                {analysisResults.summary.nativeViolationsCount > 0 && (
                                    <div className="violation-stat">
                                        <span className="violation-count">{analysisResults.summary.nativeViolationsCount}</span>
                                        <span className="violation-label">Native Building Violations</span>
                                    </div>
                                )}
                                {analysisResults.summary.infrastructureViolationsCount > 0 && (
                                    <div className="violation-stat">
                                        <span className="violation-count">{analysisResults.summary.infrastructureViolationsCount}</span>
                                        <span className="violation-label">Infrastructure Violations</span>
                                    </div>
                                )}
                                {analysisResults.summary.progressionViolationsCount > 0 && (
                                    <div className="violation-stat">
                                        <span className="violation-count">{analysisResults.summary.progressionViolationsCount}</span>
                                        <span className="violation-label">Progression Violations</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {analysisResults.summary.uniqueBannedComponents.length > 0 && (
                        <div className="banned-components-list">
                            <h4>Banned Components Found:</h4>
                            <ul>
                                {analysisResults.summary.uniqueBannedComponents.map(comp => (
                                    <li key={comp}>{comp}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="statistics-section">
                        <h3>Recipe Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Total Recipes:</span>
                                <span className="stat-value">{analysisResults.statistics.totalRecipes}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Unique Components:</span>
                                <span className="stat-value">{Object.keys(analysisResults.statistics.componentUsage).length}</span>
                            </div>
                        </div>

                        <div className="tier-distribution">
                            <h4>Tier Distribution</h4>
                            <div className="tier-bars">
                                {[1, 2, 3, 4, 5].map(tier => (
                                    <div key={tier} className="tier-bar">
                                        <div className="tier-label">T{tier}</div>
                                        <div className="tier-count">{analysisResults.statistics.byTier[tier] || 0}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="export-section">
                        <button onClick={exportReport} className="export-button">
                            Export Detailed Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildingRecipeAnalyzer; 