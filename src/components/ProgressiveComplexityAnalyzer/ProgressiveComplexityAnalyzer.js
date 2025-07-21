import React, { useState, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './ProgressiveComplexityAnalyzer.css';

const ProgressiveComplexityAnalyzer = () => {
    const { state } = useRecipes();
    const [selectedComponent, setSelectedComponent] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Progressive Complexity System Configuration
    const PROGRESSIVE_SYSTEM = {
        XXXS: { ingredients: 2, tiers: ['T1'], maxRawResources: 10, meanRawResources: 6.5 },
        XXS: { ingredients: 2, tiers: ['T1'], maxRawResources: 10, meanRawResources: 6.5 },
        XS: { ingredients: 3, tiers: ['T1', 'T2'], maxRawResources: 15, meanRawResources: 10 },
        S: { ingredients: 3, tiers: ['T1', 'T2'], maxRawResources: 20, meanRawResources: 15 },
        M: { ingredients: 4, tiers: ['T1', 'T2', 'T3'], maxRawResources: 25, meanRawResources: 20 },
        L: { ingredients: 4, tiers: ['T1', 'T2', 'T3'], maxRawResources: 30, meanRawResources: 25 },
        CAP: { ingredients: 5, tiers: ['T1', 'T2', 'T3', 'T4'], maxRawResources: 35, meanRawResources: 30 },
        CMD: { ingredients: 5, tiers: ['T1', 'T2', 'T3', 'T4'], maxRawResources: 35, meanRawResources: 30 },
        CLASS8: { ingredients: 6, tiers: ['T1', 'T2', 'T3', 'T4', 'T5'], maxRawResources: 40, meanRawResources: 35 },
        TTN: { ingredients: [6, 7], tiers: ['T1', 'T2', 'T3', 'T4', 'T5'], maxRawResources: 45, meanRawResources: 40 }
    };

    // Combine all recipe data
    const allRecipes = useMemo(() => {
        return [
            ...state.recipes,
            ...state.components,
            ...state.ingredients,
            ...state.finals,
            ...state.rawResources
        ];
    }, [state.recipes, state.components, state.ingredients, state.finals, state.rawResources]);

    // Component types that can be analyzed
    const componentTypes = [
        'MISSILES', 'SHIP_WEAPONS', 'SHIP_COMPONENTS', 'COUNTERMEASURES',
        'SHIP_MODULES', 'HAB_ASSETS'
    ];

    // Function to extract size from ID
    const extractSize = (id) => {
        const sizeMatch = id.match(/-(xxxs|xxs|xs|s|m|l|cap|cmd|class8|ttn)-/i);
        return sizeMatch ? sizeMatch[1].toUpperCase() : null;
    };

    // Function to extract tier from ID
    const extractTier = (id) => {
        const tierMatch = id.match(/-t(\d+)$/i);
        return tierMatch ? `T${tierMatch[1]}` : null;
    };

    // Function to get base component name
    const getBaseComponentName = (id) => {
        // Remove size and tier from ID
        return id.replace(/-(xxxs|xxs|xs|s|m|l|cap|cmd|class8|ttn)-t\d+$/i, '');
    };

    // Function to simulate raw resource calculation
    const calculateRawResources = (recipe) => {
        // This is a simplified calculation - in real implementation, 
        // you would traverse the production chain
        const ingredients = [];
        for (let i = 1; i <= 10; i++) {
            const ingredient = recipe[`ingredient${i}`];
            if (ingredient && ingredient.trim()) {
                ingredients.push(ingredient.trim());
            }
        }

        // Simulate based on complexity - more ingredients = more raw resources
        const baseComplexity = ingredients.length * 5;
        const sizeMultiplier = getSizeMultiplier(extractSize(recipe.id));
        const tierMultiplier = getTierMultiplier(extractTier(recipe.id));

        return Math.floor(baseComplexity * sizeMultiplier * tierMultiplier);
    };

    const getSizeMultiplier = (size) => {
        const multipliers = {
            'XXXS': 1, 'XXS': 1, 'XS': 1.2, 'S': 1.5, 'M': 2,
            'L': 2.5, 'CAP': 3, 'CMD': 3, 'CLASS8': 4, 'TTN': 5
        };
        return multipliers[size] || 1;
    };

    const getTierMultiplier = (tier) => {
        const multipliers = {
            'T1': 1, 'T2': 1.3, 'T3': 1.7, 'T4': 2.2, 'T5': 3
        };
        return multipliers[tier] || 1;
    };

    // Main analysis function
    const analyzeComponentType = async (componentType) => {
        setIsAnalyzing(true);

        try {
            // Filter recipes for the selected component type
            const componentRecipes = allRecipes.filter(recipe =>
                recipe.outputType === componentType &&
                recipe.id.includes('-t1') // Focus on T1 variants for base analysis
            );

            if (componentRecipes.length === 0) {
                return null;
            }

            // Group by base component name
            const componentGroups = {};
            componentRecipes.forEach(recipe => {
                const baseName = getBaseComponentName(recipe.id);
                if (!componentGroups[baseName]) {
                    componentGroups[baseName] = [];
                }
                componentGroups[baseName].push(recipe);
            });

            const analysisResults = {};

            Object.entries(componentGroups).forEach(([baseName, recipes]) => {
                const sizeAnalysis = {};

                recipes.forEach(recipe => {
                    const size = extractSize(recipe.id);
                    const expectedConfig = PROGRESSIVE_SYSTEM[size];

                    if (!expectedConfig) return;

                    // Get current ingredients
                    const currentIngredients = [];
                    for (let i = 1; i <= 10; i++) {
                        const ingredient = recipe[`ingredient${i}`];
                        if (ingredient && ingredient.trim()) {
                            currentIngredients.push(ingredient.trim());
                        }
                    }

                    // Calculate raw resources
                    const rawResourceCount = calculateRawResources(recipe);

                    const expectedIngredients = Array.isArray(expectedConfig.ingredients)
                        ? expectedConfig.ingredients[Math.floor(Math.random() * expectedConfig.ingredients.length)]
                        : expectedConfig.ingredients;

                    sizeAnalysis[size] = {
                        recipe: recipe,
                        current: {
                            ingredients: currentIngredients.length,
                            ingredientList: currentIngredients,
                            rawResources: rawResourceCount
                        },
                        expected: {
                            ingredients: expectedIngredients,
                            maxRawResources: expectedConfig.maxRawResources,
                            meanRawResources: expectedConfig.meanRawResources,
                            allowedTiers: expectedConfig.tiers
                        },
                        compliance: {
                            ingredientCount: currentIngredients.length <= expectedIngredients,
                            rawResourceCount: rawResourceCount <= expectedConfig.maxRawResources,
                            needsReduction: currentIngredients.length > expectedIngredients,
                            excessIngredients: Math.max(0, currentIngredients.length - expectedIngredients),
                            excessRawResources: Math.max(0, rawResourceCount - expectedConfig.maxRawResources)
                        }
                    };
                });

                analysisResults[baseName] = sizeAnalysis;
            });

            return analysisResults;
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Generate recommendations
    const generateRecommendations = (componentName, sizeData) => {
        const recommendations = [];

        Object.entries(sizeData).forEach(([size, data]) => {
            if (data.compliance.needsReduction) {
                const suggestions = generateIngredientReductionSuggestions(data.current.ingredientList, data.compliance.excessIngredients);

                recommendations.push({
                    size: size,
                    type: 'REDUCE_INGREDIENTS',
                    message: `Reduce from ${data.current.ingredients} to ${data.expected.ingredients} ingredients`,
                    priority: 'HIGH',
                    ingredientsToRemove: data.compliance.excessIngredients,
                    currentIngredients: data.current.ingredientList,
                    suggestions: suggestions
                });
            }

            if (data.compliance.excessRawResources > 0) {
                recommendations.push({
                    size: size,
                    type: 'SIMPLIFY_PRODUCTION',
                    message: `Reduce raw resources from ${data.current.rawResources} to max ${data.expected.maxRawResources}`,
                    priority: 'MEDIUM',
                    target: data.expected.maxRawResources,
                    current: data.current.rawResources,
                    excess: data.compliance.excessRawResources
                });
            }
        });

        return recommendations;
    };

    const generateIngredientReductionSuggestions = (currentIngredients, excessCount) => {
        const suggestions = [];

        // Find similar ingredients that could be combined
        const similarGroups = findSimilarIngredients(currentIngredients);
        if (similarGroups.length > 0) {
            suggestions.push({
                type: 'COMBINE_SIMILAR',
                message: `Combine similar ingredients: ${similarGroups.map(group => group.join(' + ')).join(', ')}`,
                impact: `Could reduce by ${similarGroups.length} ingredients`,
                ingredients: similarGroups.flat()
            });
        }

        // Suggest removing most complex ingredients
        const complexIngredients = identifyComplexIngredients(currentIngredients);
        if (complexIngredients.length > 0) {
            suggestions.push({
                type: 'REMOVE_COMPLEX',
                message: `Remove most complex ingredients: ${complexIngredients.slice(0, excessCount).join(', ')}`,
                impact: `Target removal of ${excessCount} ingredients`,
                ingredients: complexIngredients.slice(0, excessCount)
            });
        }

        return suggestions;
    };

    const findSimilarIngredients = (ingredients) => {
        const groups = [];
        const keywords = ['Core', 'System', 'Module', 'Controller', 'Generator', 'Assembly', 'Matrix', 'Unit'];

        keywords.forEach(keyword => {
            const matches = ingredients.filter(ing => ing.includes(keyword));
            if (matches.length > 1) {
                groups.push(matches);
            }
        });

        return groups;
    };

    const identifyComplexIngredients = (ingredients) => {
        // Sort by complexity (longer names, more complex words)
        const complexityWords = ['Quantum', 'Advanced', 'Enhanced', 'Ultra', 'Mega', 'Super', 'Hyper'];

        return ingredients.sort((a, b) => {
            const aComplexity = complexityWords.reduce((acc, word) => acc + (a.includes(word) ? 1 : 0), 0) + a.length;
            const bComplexity = complexityWords.reduce((acc, word) => acc + (b.includes(word) ? 1 : 0), 0) + b.length;
            return bComplexity - aComplexity;
        });
    };

    const handleAnalyze = async () => {
        if (!selectedComponent) return;

        const results = await analyzeComponentType(selectedComponent);
        setAnalysisResults(results);
    };

    const renderSystemConfiguration = () => (
        <div className="system-configuration">
            <h3>Progressive Complexity System Configuration</h3>
            <div className="config-grid">
                {Object.entries(PROGRESSIVE_SYSTEM).map(([size, config]) => (
                    <div key={size} className="config-card">
                        <h4>{size}</h4>
                        <div className="config-details">
                            <p><strong>Ingredients:</strong> {Array.isArray(config.ingredients) ? config.ingredients.join(' or ') : config.ingredients}</p>
                            <p><strong>Tiers:</strong> {config.tiers.join(', ')}</p>
                            <p><strong>Max Raw Resources:</strong> {config.maxRawResources}</p>
                            <p><strong>Mean Raw Resources:</strong> {config.meanRawResources}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAnalysisResults = () => {
        if (!analysisResults) return null;

        return (
            <div className="analysis-results">
                <h3>Analysis Results - {selectedComponent}</h3>

                {Object.entries(analysisResults).map(([componentName, sizeData]) => {
                    const recommendations = generateRecommendations(componentName, sizeData);
                    const hasIssues = recommendations.some(r => r.priority === 'HIGH');

                    return (
                        <div key={componentName} className={`component-analysis ${hasIssues ? 'has-issues' : 'compliant'}`}>
                            <h4>{componentName.replace(/-/g, ' ').toUpperCase()}</h4>

                            <div className="size-analysis-grid">
                                {Object.entries(sizeData).map(([size, data]) => (
                                    <div key={size} className={`size-card ${data.compliance.needsReduction ? 'needs-attention' : 'compliant'}`}>
                                        <h5>{size}</h5>
                                        <div className="metrics">
                                            <div className={`metric ${data.compliance.ingredientCount ? 'good' : 'bad'}`}>
                                                <span className="label">Ingredients:</span>
                                                <span className="value">{data.current.ingredients}/{data.expected.ingredients}</span>
                                            </div>
                                            <div className={`metric ${data.compliance.rawResourceCount ? 'good' : 'bad'}`}>
                                                <span className="label">Raw Resources:</span>
                                                <span className="value">{data.current.rawResources}/{data.expected.maxRawResources}</span>
                                            </div>
                                        </div>

                                        {data.compliance.needsReduction && (
                                            <div className="compliance-issues">
                                                <p className="warning">⚠️ Needs {data.compliance.excessIngredients} ingredient reduction</p>
                                                <details>
                                                    <summary>Current Ingredients ({data.current.ingredients})</summary>
                                                    <ul className="ingredient-list">
                                                        {data.current.ingredientList.map((ingredient, idx) => (
                                                            <li key={idx}>{ingredient}</li>
                                                        ))}
                                                    </ul>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {recommendations.length > 0 && (
                                <div className="recommendations">
                                    <h5>Recommendations</h5>
                                    {recommendations.map((rec, idx) => (
                                        <div key={idx} className={`recommendation ${rec.priority.toLowerCase()}`}>
                                            <div className="rec-header">
                                                <h6>{rec.size} - {rec.type.replace(/_/g, ' ')}</h6>
                                                <span className={`priority ${rec.priority.toLowerCase()}`}>{rec.priority}</span>
                                            </div>
                                            <p>{rec.message}</p>

                                            {rec.suggestions && (
                                                <div className="suggestions">
                                                    <h6>Suggestions:</h6>
                                                    {rec.suggestions.map((sug, sidx) => (
                                                        <div key={sidx} className="suggestion">
                                                            <strong>{sug.type.replace(/_/g, ' ')}:</strong> {sug.message}
                                                            <div className="impact">Impact: {sug.impact}</div>
                                                            {sug.ingredients && (
                                                                <div className="affected-ingredients">
                                                                    <strong>Affected:</strong> {sug.ingredients.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="progressive-complexity-analyzer">
            <div className="header">
                <h2>Progressive Complexity Analyzer</h2>
                <p>Analyze component types and identify changes needed for the progressive complexity system</p>
            </div>

            {renderSystemConfiguration()}

            <div className="analysis-controls">
                <h3>Component Analysis</h3>
                <div className="control-group">
                    <label htmlFor="componentType">Select Component Type:</label>
                    <select
                        id="componentType"
                        value={selectedComponent}
                        onChange={(e) => setSelectedComponent(e.target.value)}
                        disabled={isAnalyzing}
                    >
                        <option value="">Select a component type...</option>
                        {componentTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedComponent || isAnalyzing}
                        className="analyze-button"
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Component Type'}
                    </button>
                </div>
            </div>

            {renderAnalysisResults()}
        </div>
    );
};

export default ProgressiveComplexityAnalyzer; 