import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './ComponentMetricsAnalyzer.css';

const ComponentMetricsAnalyzer = ({
    selectedComponents = [],
    planetType = '',
    buildingResourceTier = 1,
    buildingTier = 1,
    onMetricsUpdate = () => { }
}) => {
    const { recipes } = useRecipes();
    const [expandedComponents, setExpandedComponents] = useState({});
    const [sortBy, setSortBy] = useState('difficulty');
    const [showDetails, setShowDetails] = useState(true);

    // Calculate recipe chain depth and complexity
    const calculateRecipeChain = useCallback((componentId, visited = new Set(), depth = 0) => {
        if (visited.has(componentId) || depth > 10) {
            return {
                depth: 0,
                planets: new Set(),
                components: [],
                totalSteps: 0,
                circular: visited.has(componentId)
            };
        }

        visited.add(componentId);

        // Try multiple ways to find the component
        const component = recipes.find(r => {
            const rId = r.OutputID || r.outputID || r.id;
            const rName = r.OutputName || r.outputName || r.name;

            // Try exact matches first
            if (rId === componentId || rName === componentId) {
                return true;
            }

            // Try case-insensitive match
            if (rId && componentId && rId.toLowerCase() === componentId.toLowerCase()) {
                return true;
            }
            if (rName && componentId && rName.toLowerCase() === componentId.toLowerCase()) {
                return true;
            }

            // Try converting spaces to hyphens and vice versa
            if (rId && componentId) {
                const normalizedId = rId.replace(/[\s-]/g, '').toLowerCase();
                const normalizedComponentId = componentId.replace(/[\s-]/g, '').toLowerCase();
                if (normalizedId === normalizedComponentId) {
                    return true;
                }
            }

            return false;
        });

        if (!component) {
            console.log('ComponentMetricsAnalyzer: Could not find recipe for:', componentId);
            return {
                depth: 0,
                planets: new Set(),
                components: [],
                totalSteps: 0,
                circular: false
            };
        }

        let maxDepth = 0;
        const allPlanets = new Set();
        const allComponents = [];
        let totalSteps = parseInt(component.ProductionSteps || component.productionSteps || 0);

        console.log(`ComponentMetricsAnalyzer: Analyzing ${component.OutputName || component.outputName || component.name}, ProductionSteps: ${totalSteps}`);

        // Add this component's planet
        const planetTypes = component.PlanetTypes || component.planetTypes || '';
        if (planetTypes) {
            planetTypes.split(';').forEach(p => allPlanets.add(p.trim()));
        }

        // Process each ingredient
        for (let i = 1; i <= 8; i++) {
            const ingredient = component[`Ingredient${i}`] || component[`ingredient${i}`];
            if (!ingredient) continue;

            // Find the ingredient in recipes with flexible matching
            const ingredientRecipe = recipes.find(r => {
                const rName = r.OutputName || r.outputName || r.name;
                const rId = r.OutputID || r.outputID || r.id;

                // Try exact name match first
                if (rName === ingredient) {
                    return true;
                }

                // Try case-insensitive match
                if (rName && rName.toLowerCase() === ingredient.toLowerCase()) {
                    return true;
                }

                // Try ID match (convert name to ID format)
                const ingredientAsId = ingredient.toLowerCase().replace(/\s+/g, '-');
                if (rId && rId.toLowerCase() === ingredientAsId) {
                    return true;
                }

                // Try normalized match (remove spaces and hyphens)
                if (rName) {
                    const normalizedName = rName.replace(/[\s-]/g, '').toLowerCase();
                    const normalizedIngredient = ingredient.replace(/[\s-]/g, '').toLowerCase();
                    if (normalizedName === normalizedIngredient) {
                        return true;
                    }
                }

                return false;
            });

            if (ingredientRecipe) {
                const outputType = ingredientRecipe.OutputType || ingredientRecipe.outputType || ingredientRecipe.type;
                console.log(`  Found ingredient: ${ingredient} -> Type: ${outputType}, ID: ${ingredientRecipe.OutputID || ingredientRecipe.outputID || ingredientRecipe.id}`);

                // Only recurse for components, not basic resources
                if (outputType === 'COMPONENT' || outputType === 'Component') {
                    const subChain = calculateRecipeChain(
                        ingredientRecipe.OutputID || ingredientRecipe.outputID || ingredient,
                        new Set(visited),
                        depth + 1
                    );

                    maxDepth = Math.max(maxDepth, subChain.depth + 1);
                    subChain.planets.forEach(p => allPlanets.add(p));
                    allComponents.push(...subChain.components);
                    totalSteps += subChain.totalSteps;
                }

                allComponents.push({
                    name: ingredient,
                    type: outputType || 'UNKNOWN',
                    tier: parseInt(ingredientRecipe.OutputTier || ingredientRecipe.outputTier || ingredientRecipe.tier || 1)
                });
            } else {
                // Ingredient not found in recipes - might be a raw resource
                console.log(`  Ingredient not found in recipes: ${ingredient} - treating as raw resource`);
                allComponents.push({
                    name: ingredient,
                    type: 'BASIC RESOURCE',
                    tier: 1
                });
            }
        }

        return {
            depth: maxDepth,
            planets: allPlanets,
            components: allComponents,
            totalSteps: totalSteps,
            circular: false
        };
    }, [recipes]);

    // Calculate component utilization across all recipes
    const calculateUtilization = useCallback((componentName) => {
        let usageCount = 0;
        const usedIn = [];

        recipes.forEach(recipe => {
            for (let i = 1; i <= 8; i++) {
                const ingredient = recipe[`Ingredient${i}`] || recipe[`ingredient${i}`];
                if (ingredient === componentName) {
                    usageCount++;
                    usedIn.push({
                        name: recipe.OutputName || recipe.outputName,
                        type: recipe.OutputType || recipe.outputType
                    });
                    break;
                }
            }
        });

        return {
            count: usageCount,
            usedIn: usedIn,
            utilizationScore: usageCount > 10 ? 'high' : usageCount > 5 ? 'medium' : 'low'
        };
    }, [recipes]);

    // Calculate difficulty score for a component
    const calculateDifficultyScore = useCallback((component) => {
        const componentId = component.OutputID || component.outputID || component.id || component.OutputName || component.outputName || component.name;
        const componentName = component.OutputName || component.outputName || component.name;

        const chain = calculateRecipeChain(componentId);
        const utilization = calculateUtilization(componentName);

        // Base difficulty factors
        let difficulty = 0;

        // Recipe chain depth (0-30 points)
        difficulty += chain.depth * 10;

        // Number of planets involved (0-20 points)
        difficulty += chain.planets.size * 5;

        // Total production steps (0-20 points)
        difficulty += Math.min(chain.totalSteps * 2, 20);

        // Component tier (0-10 points)
        const tier = parseInt(component.OutputTier || component.outputTier || 1);
        difficulty += tier * 2;

        // Utilization penalty (0-10 points) - highly used components are easier to obtain
        if (utilization.utilizationScore === 'high') {
            difficulty -= 10;
        } else if (utilization.utilizationScore === 'low') {
            difficulty += 5;
        }

        // Planet compatibility bonus
        const componentPlanets = (component.PlanetTypes || component.planetTypes || '').split(';');
        if (planetType && componentPlanets.includes(planetType)) {
            difficulty -= 15; // Native to current planet
        } else if (componentPlanets.length === 0 || componentPlanets[0] === '') {
            difficulty -= 5; // Universal component
        }

        // Tier compatibility
        const componentTier = parseInt(component.OutputTier || component.outputTier || 1);
        if (componentTier > buildingResourceTier) {
            difficulty += 20; // Over-tier penalty
        }

        return {
            score: Math.max(0, Math.min(100, difficulty)),
            factors: {
                chainDepth: chain.depth,
                planetsInvolved: chain.planets.size,
                totalSteps: chain.totalSteps,
                componentTier: tier,
                utilization: utilization.utilizationScore,
                nativeToPlanet: planetType && componentPlanets.includes(planetType)
            },
            chain,
            utilization
        };
    }, [calculateRecipeChain, calculateUtilization, planetType, buildingResourceTier]);

    // Calculate metrics for all selected components
    const componentMetrics = useMemo(() => {
        const metrics = selectedComponents.map(component => {
            const difficulty = calculateDifficultyScore(component);
            return {
                ...component,
                difficulty,
                expanded: expandedComponents[component.OutputID || component.outputID || component.OutputName || component.outputName]
            };
        });

        // Sort based on selected criteria
        metrics.sort((a, b) => {
            switch (sortBy) {
                case 'difficulty':
                    return a.difficulty.score - b.difficulty.score;
                case 'utilization':
                    return b.difficulty.utilization.count - a.difficulty.utilization.count;
                case 'depth':
                    return a.difficulty.chain.depth - b.difficulty.chain.depth;
                case 'planets':
                    return a.difficulty.chain.planets.size - b.difficulty.chain.planets.size;
                default:
                    return 0;
            }
        });

        return metrics;
    }, [selectedComponents, calculateDifficultyScore, expandedComponents, sortBy]);

    // Update parent with metrics
    useEffect(() => {
        onMetricsUpdate(componentMetrics);
    }, [componentMetrics, onMetricsUpdate]);

    // Toggle component expansion
    const toggleExpanded = (componentId) => {
        setExpandedComponents(prev => ({
            ...prev,
            [componentId]: !prev[componentId]
        }));
    };

    // Get difficulty color
    const getDifficultyColor = (score) => {
        if (score < 20) return '#00ff88';
        if (score < 40) return '#88ff00';
        if (score < 60) return '#ffff00';
        if (score < 80) return '#ff8800';
        return '#ff4444';
    };

    // Get utilization color
    const getUtilizationColor = (score) => {
        switch (score) {
            case 'high': return '#ff4444';
            case 'medium': return '#ffff00';
            case 'low': return '#00ff88';
            default: return '#888';
        }
    };

    // Export metrics as markdown
    const exportMetricsAsMarkdown = () => {
        let markdown = `# Component Metrics Analysis\n\n`;
        markdown += `**Planet Type:** ${planetType || 'Not specified'}\n`;
        markdown += `**Building Resource Tier:** ${buildingResourceTier}\n`;
        markdown += `**Building Tier:** ${buildingTier}\n`;
        markdown += `**Date:** ${new Date().toISOString()}\n\n`;

        markdown += `## Selected Components (${componentMetrics.length})\n\n`;

        // Summary statistics
        const avgDifficulty = componentMetrics.reduce((sum, c) => sum + c.difficulty.score, 0) / componentMetrics.length;
        const totalPlanets = new Set(componentMetrics.flatMap(c => Array.from(c.difficulty.chain.planets))).size;
        const maxDepth = Math.max(...componentMetrics.map(c => c.difficulty.chain.depth));

        markdown += `### Summary Statistics\n\n`;
        markdown += `- **Average Difficulty:** ${avgDifficulty.toFixed(1)}/100\n`;
        markdown += `- **Total Unique Planets Involved:** ${totalPlanets}\n`;
        markdown += `- **Maximum Recipe Chain Depth:** ${maxDepth}\n\n`;

        markdown += `### Component Details\n\n`;

        componentMetrics.forEach((component, index) => {
            const name = component.OutputName || component.outputName;
            const tier = component.OutputTier || component.outputTier;
            const diff = component.difficulty;

            markdown += `#### ${index + 1}. ${name} (T${tier})\n\n`;
            markdown += `- **Difficulty Score:** ${diff.score}/100\n`;
            markdown += `- **Recipe Chain Depth:** ${diff.chain.depth}\n`;
            markdown += `- **Planets Involved:** ${diff.chain.planets.size} (${Array.from(diff.chain.planets).join(', ') || 'None'})\n`;
            markdown += `- **Total Production Steps:** ${diff.chain.totalSteps}\n`;
            markdown += `- **Utilization:** ${diff.utilization.utilizationScore} (used in ${diff.utilization.count} recipes)\n`;
            markdown += `- **Native to Current Planet:** ${diff.factors.nativeToPlanet ? 'Yes' : 'No'}\n`;

            // Recipe breakdown
            if (diff.chain.components.length > 0) {
                markdown += `- **Recipe Chain:**\n`;
                const uniqueComponents = [...new Map(diff.chain.components.map(c => [c.name, c])).values()];
                uniqueComponents.forEach(comp => {
                    markdown += `  - ${comp.name} (T${comp.tier}, ${comp.type})\n`;
                });
            }

            // Usage examples
            if (diff.utilization.usedIn.length > 0) {
                markdown += `- **Used In:**\n`;
                diff.utilization.usedIn.slice(0, 5).forEach(usage => {
                    markdown += `  - ${usage.name} (${usage.type})\n`;
                });
                if (diff.utilization.usedIn.length > 5) {
                    markdown += `  - ...and ${diff.utilization.usedIn.length - 5} more\n`;
                }
            }

            markdown += `\n`;
        });

        markdown += `## Recommendations\n\n`;

        // Generate recommendations based on metrics
        const easyComponents = componentMetrics.filter(c => c.difficulty.score < 30);
        const hardComponents = componentMetrics.filter(c => c.difficulty.score > 70);

        if (easyComponents.length > 0) {
            markdown += `### ✅ Recommended Components (Low Difficulty)\n\n`;
            easyComponents.forEach(c => {
                markdown += `- **${c.OutputName || c.outputName}**: Difficulty ${c.difficulty.score}/100\n`;
            });
            markdown += `\n`;
        }

        if (hardComponents.length > 0) {
            markdown += `### ⚠️ High Difficulty Components\n\n`;
            hardComponents.forEach(c => {
                markdown += `- **${c.OutputName || c.outputName}**: Difficulty ${c.difficulty.score}/100`;
                if (c.difficulty.chain.planets.size > 2) {
                    markdown += ` (requires ${c.difficulty.chain.planets.size} planets)`;
                }
                markdown += `\n`;
            });
            markdown += `\n`;
        }

        // Utilization analysis
        const overutilized = componentMetrics.filter(c => c.difficulty.utilization.utilizationScore === 'high');
        const underutilized = componentMetrics.filter(c => c.difficulty.utilization.utilizationScore === 'low');

        if (overutilized.length > 0) {
            markdown += `### 🔄 Overutilized Components\n\n`;
            markdown += `Consider diversifying with alternatives for:\n\n`;
            overutilized.forEach(c => {
                markdown += `- **${c.OutputName || c.outputName}**: Used in ${c.difficulty.utilization.count} recipes\n`;
            });
            markdown += `\n`;
        }

        if (underutilized.length > 0) {
            markdown += `### 💡 Underutilized Components\n\n`;
            markdown += `Good candidates for unique builds:\n\n`;
            underutilized.forEach(c => {
                markdown += `- **${c.OutputName || c.outputName}**: Used in only ${c.difficulty.utilization.count} recipes\n`;
            });
        }

        // Download the markdown
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `component-metrics-${planetType || 'all'}-rt${buildingResourceTier}-bt${buildingTier}-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Render recipe chain visualization
    const renderRecipeChain = (component) => {
        const chain = component.difficulty.chain;
        if (!chain || chain.components.length === 0) {
            // Check if this is actually a component with production steps
            const prodSteps = parseInt(component.ProductionSteps || component.productionSteps || 0);
            if (prodSteps > 0) {
                return <div className="no-chain">Recipe data not fully loaded (Production Steps: {prodSteps})</div>;
            }
            return <div className="no-chain">No sub-components (basic resource)</div>;
        }

        // Group components by tier
        const tierGroups = {};
        chain.components.forEach(comp => {
            const tier = comp.tier || 1;
            if (!tierGroups[tier]) {
                tierGroups[tier] = [];
            }
            tierGroups[tier].push(comp);
        });

        return (
            <div className="recipe-chain">
                {Object.entries(tierGroups).sort(([a], [b]) => b - a).map(([tier, components]) => (
                    <div key={tier} className="tier-group">
                        <div className="tier-label">Tier {tier}</div>
                        <div className="tier-components">
                            {[...new Map(components.map(c => [c.name, c])).values()].map(comp => (
                                <div key={comp.name} className={`chain-component ${comp.type}`}>
                                    <span className="comp-name">{comp.name}</span>
                                    <span className="comp-type">{comp.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="component-metrics-analyzer">
            <div className="metrics-header">
                <h3>Component Metrics Analysis</h3>
                <div className="metrics-controls">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="difficulty">Sort by Difficulty</option>
                        <option value="utilization">Sort by Utilization</option>
                        <option value="depth">Sort by Chain Depth</option>
                        <option value="planets">Sort by Planets Required</option>
                    </select>
                    <button onClick={() => setShowDetails(!showDetails)}>
                        {showDetails ? 'Hide' : 'Show'} Details
                    </button>
                    <button onClick={exportMetricsAsMarkdown} className="export-btn">
                        Export Analysis (.md)
                    </button>
                </div>
            </div>

            {componentMetrics.length === 0 ? (
                <div className="no-components">
                    Select components to see metrics analysis
                </div>
            ) : (
                <div className="metrics-list">
                    {componentMetrics.map(component => {
                        const id = component.OutputID || component.outputID || component.OutputName || component.outputName;
                        const name = component.OutputName || component.outputName;
                        const tier = component.OutputTier || component.outputTier;
                        const diff = component.difficulty;

                        return (
                            <div key={id} className="metric-card">
                                <div className="metric-header" onClick={() => toggleExpanded(id)}>
                                    <div className="metric-basic">
                                        <h4>{name}</h4>
                                        <span className="tier-badge">T{tier}</span>
                                    </div>

                                    <div className="metric-scores">
                                        <div className="difficulty-score" style={{ backgroundColor: getDifficultyColor(diff.score) }}>
                                            <span className="score-label">Difficulty</span>
                                            <span className="score-value">{diff.score}</span>
                                        </div>

                                        <div className="utilization-score" style={{ backgroundColor: getUtilizationColor(diff.utilization.utilizationScore) }}>
                                            <span className="score-label">Usage</span>
                                            <span className="score-value">{diff.utilization.count}</span>
                                        </div>

                                        <div className="chain-info">
                                            <span className="chain-depth">Depth: {diff.chain.depth}</span>
                                            <span className="chain-planets">Planets: {diff.chain.planets.size}</span>
                                        </div>
                                    </div>

                                    <button className="expand-btn">
                                        {component.expanded ? '▼' : '▶'}
                                    </button>
                                </div>

                                {component.expanded && showDetails && (
                                    <div className="metric-details">
                                        <div className="detail-section">
                                            <h5>Difficulty Factors</h5>
                                            <div className="factors-grid">
                                                <div className="factor">
                                                    <span className="factor-label">Chain Depth:</span>
                                                    <span className="factor-value">{diff.factors.chainDepth}</span>
                                                </div>
                                                <div className="factor">
                                                    <span className="factor-label">Planets:</span>
                                                    <span className="factor-value">{diff.factors.planetsInvolved}</span>
                                                </div>
                                                <div className="factor">
                                                    <span className="factor-label">Total Steps:</span>
                                                    <span className="factor-value">{diff.factors.totalSteps}</span>
                                                </div>
                                                <div className="factor">
                                                    <span className="factor-label">Native:</span>
                                                    <span className="factor-value">{diff.factors.nativeToPlanet ? '✓' : '✗'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h5>Recipe Chain</h5>
                                            {renderRecipeChain(component)}
                                        </div>

                                        {diff.utilization.usedIn.length > 0 && (
                                            <div className="detail-section">
                                                <h5>Used In ({diff.utilization.count} recipes)</h5>
                                                <div className="usage-list">
                                                    {diff.utilization.usedIn.slice(0, 5).map((usage, idx) => (
                                                        <div key={idx} className="usage-item">
                                                            {usage.name} <span className="usage-type">({usage.type})</span>
                                                        </div>
                                                    ))}
                                                    {diff.utilization.usedIn.length > 5 && (
                                                        <div className="usage-more">...and {diff.utilization.usedIn.length - 5} more</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {diff.chain.planets.size > 0 && (
                                            <div className="detail-section">
                                                <h5>Planets Required</h5>
                                                <div className="planets-list">
                                                    {Array.from(diff.chain.planets).map(planet => (
                                                        <span key={planet} className="planet-tag">{planet}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ComponentMetricsAnalyzer; 