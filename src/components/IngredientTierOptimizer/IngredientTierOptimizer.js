import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './IngredientTierOptimizer.css';

const IngredientTierOptimizer = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [selectedComponent, setSelectedComponent] = useState('');
    const [targetSize, setTargetSize] = useState('XXXS');
    const [targetCategory, setTargetCategory] = useState('UTILITY');
    const [targetResourceCount, setTargetResourceCount] = useState(6);
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [loading, setLoading] = useState(false);

    // Progressive complexity targets
    const progressiveTargets = {
        ingredientCount: {
            'XXXS': { min: 2, max: 2 },
            'XXS': { min: 2, max: 2 },
            'XS': { min: 2, max: 3 },
            'S': { min: 2, max: 3 },
            'M': { min: 3, max: 3 },
            'L': { min: 3, max: 4 },
            'CAP': { min: 3, max: 4 },
            'CMD': { min: 4, max: 4 },
            'CLASS8': { min: 4, max: 5 },
            'TTN': { min: 4, max: 5 }
        },
        rawResourceCount: {
            'XXXS': { min: 4, max: 8 },
            'XXS': { min: 4, max: 8 },
            'XS': { min: 6, max: 12 },
            'S': { min: 8, max: 15 },
            'M': { min: 12, max: 18 },
            'L': { min: 15, max: 24 },
            'CAP': { min: 18, max: 28 },
            'CMD': { min: 20, max: 32 },
            'CLASS8': { min: 25, max: 40 },
            'TTN': { min: 30, max: 45 }
        }
    };

    // Component categories
    const componentCategories = [
        'THERMAL', 'KINETIC', 'ELECTROMAGNETIC', 'DEFENSIVE',
        'PROPULSION', 'UTILITY', 'ENERGY', 'HABITAT'
    ];

    // Get available ingredients by category and tier
    const getAvailableIngredients = () => {
        return recipes.filter(recipe => {
            return recipe.outputType === 'INGREDIENT' ||
                recipe.outputType === 'COMPONENT';
        }).map(recipe => ({
            name: recipe.outputName,
            tier: recipe.outputTier || 1,
            category: extractComponentCategory(recipe),
            estimatedRawResources: estimateRawResourceCount(recipe),
            resourceType: recipe.resourceType,
            functionalPurpose: recipe.functionalPurpose
        }));
    };

    // Extract component category from recipe
    const extractComponentCategory = (recipe) => {
        const name = recipe.outputName?.toLowerCase() || '';
        const type = recipe.outputType?.toLowerCase() || '';
        const resourceType = recipe.resourceType?.toLowerCase() || '';

        if (name.includes('heat') || name.includes('thermal') || name.includes('warming')) return 'THERMAL';
        if (name.includes('kinetic') || name.includes('projectile')) return 'KINETIC';
        if (name.includes('emp') || name.includes('energy') || name.includes('electromagnetic')) return 'ELECTROMAGNETIC';
        if (name.includes('shield') || name.includes('armor') || name.includes('defensive')) return 'DEFENSIVE';
        if (name.includes('engine') || name.includes('thruster') || name.includes('propulsion')) return 'PROPULSION';
        if (name.includes('hab') || name.includes('life') || name.includes('habitat')) return 'HABITAT';
        if (name.includes('power') || name.includes('generator') || name.includes('battery')) return 'ENERGY';

        // Check resource type for additional categorization
        if (resourceType.includes('energy')) return 'ENERGY';
        if (resourceType.includes('structural')) return 'DEFENSIVE';
        if (resourceType.includes('electronic')) return 'ELECTROMAGNETIC';

        return 'UTILITY'; // Default category
    };

    // Estimate raw resource count for an ingredient
    const estimateRawResourceCount = (recipe) => {
        // Simplified estimation - in practice, you'd trace the full production chain
        const baseCount = recipe.ingredients?.length || 1;
        const tierMultiplier = (recipe.outputTier || 1) * 1.5;
        return Math.round(baseCount * tierMultiplier);
    };

    // Generate all possible ingredient combinations
    const generateCombinations = (ingredients, targetCount) => {
        if (targetCount === 1) {
            return ingredients.map(ing => [ing]);
        }

        const combinations = [];
        for (let i = 0; i < ingredients.length; i++) {
            const remaining = ingredients.slice(i + 1);
            const subCombinations = generateCombinations(remaining, targetCount - 1);

            subCombinations.forEach(subCombo => {
                combinations.push([ingredients[i], ...subCombo]);
            });
        }

        return combinations;
    };

    // Validate tier requirements for a combination
    const validateTierRequirements = (combination, targetTier) => {
        const tiers = combination.map(ing => ing.tier);
        const maxTier = Math.max(...tiers);
        const hasRequiredTier = tiers.some(tier => tier === targetTier);

        return {
            passes: maxTier <= targetTier && (targetTier === 1 || hasRequiredTier),
            maxTier,
            hasRequiredTier
        };
    };

    // Score a combination based on multiple factors
    const scoreCombination = (combination, targetResourceCount, targetTier) => {
        const totalRawResources = combination.reduce((sum, ing) => sum + ing.estimatedRawResources, 0);
        const tierValidation = validateTierRequirements(combination, targetTier);

        let score = 100;

        // Resource count proximity (higher score for closer to target)
        const resourceDifference = Math.abs(totalRawResources - targetResourceCount);
        score -= resourceDifference * 2;

        // Tier compliance
        if (!tierValidation.passes) {
            score -= 50;
        }

        // Category consistency (bonus for matching category)
        const categoryMatches = combination.filter(ing =>
            ing.category === targetCategory || ing.category === 'UTILITY'
        ).length;
        score += categoryMatches * 10;

        // Tier diversity (small bonus for mixed tiers within acceptable range)
        const uniqueTiers = new Set(combination.map(ing => ing.tier)).size;
        if (uniqueTiers > 1 && tierValidation.passes) {
            score += 5;
        }

        // Avoid overly simple combinations (all T1)
        if (combination.every(ing => ing.tier === 1) && targetTier > 1) {
            score -= 10;
        }

        return Math.max(0, score);
    };

    // Find optimal ingredient combinations
    const optimizeIngredientCombination = () => {
        setLoading(true);

        setTimeout(() => {
            const availableIngredients = getAvailableIngredients();
            const targetIngredientRange = progressiveTargets.ingredientCount[targetSize];
            const targetTier = selectedComponent ?
                (recipes.find(r => r.outputName === selectedComponent)?.outputTier || 1) : 1;

            const results = {
                targetSize,
                targetCategory,
                targetResourceCount,
                targetTier,
                suggestions: []
            };

            // Try different ingredient counts within the range
            for (let ingredientCount = targetIngredientRange.min; ingredientCount <= targetIngredientRange.max; ingredientCount++) {
                // Filter ingredients by category compatibility and tier appropriateness
                const suitableIngredients = availableIngredients.filter(ing => {
                    return ing.tier <= targetTier &&
                        (ing.category === targetCategory ||
                            ing.category === 'UTILITY' ||
                            targetCategory === 'UTILITY');
                });

                // Generate combinations
                const combinations = generateCombinations(suitableIngredients, ingredientCount);

                // Score and sort combinations
                const scoredCombinations = combinations
                    .map(combo => ({
                        ingredients: combo,
                        totalRawResources: combo.reduce((sum, ing) => sum + ing.estimatedRawResources, 0),
                        tierValidation: validateTierRequirements(combo, targetTier),
                        score: scoreCombination(combo, targetResourceCount, targetTier)
                    }))
                    .filter(combo => combo.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5); // Top 5 for each ingredient count

                results.suggestions.push({
                    ingredientCount,
                    combinations: scoredCombinations
                });
            }

            setOptimizationResults(results);
            setLoading(false);
        }, 100);
    };

    // Get list of final components for selection
    const finalComponents = useMemo(() => {
        return recipes
            .filter(recipe =>
                recipe.outputType !== 'BASIC RESOURCE' &&
                recipe.outputType !== 'INGREDIENT' &&
                recipe.outputType !== 'COMPONENT'
            )
            .sort((a, b) => (a.outputName || '').localeCompare(b.outputName || ''));
    }, [recipes]);

    // Update target resource count when size changes
    useEffect(() => {
        const targets = progressiveTargets.rawResourceCount[targetSize];
        if (targets) {
            setTargetResourceCount(Math.round((targets.min + targets.max) / 2));
        }
    }, [targetSize]);

    // Run optimization when component is selected
    useEffect(() => {
        if (selectedComponent) {
            const component = recipes.find(r => r.outputName === selectedComponent);
            if (component) {
                const extractedCategory = extractComponentCategory(component);
                setTargetCategory(extractedCategory);

                // Extract size from component name
                const sizePatterns = ['CLASS8', 'XXXS', 'XXS', 'CMD', 'CAP', 'TTN', 'XS', 'S', 'M', 'L'];
                const foundSize = sizePatterns.find(size => component.outputName.includes(size));
                if (foundSize) {
                    setTargetSize(foundSize);
                }
            }
        }
    }, [selectedComponent, recipes]);

    return (
        <div className="ingredient-optimizer">
            <div className="optimizer-header">
                <h2>Ingredient Tier Optimizer</h2>
                <p>Find optimal ingredient combinations for progressive complexity targets</p>
            </div>

            {/* Configuration Panel */}
            <div className="configuration-panel">
                <h3>🎯 Optimization Targets</h3>

                <div className="config-grid">
                    <div className="config-group">
                        <label>Select Component (Optional):</label>
                        <select
                            value={selectedComponent}
                            onChange={(e) => setSelectedComponent(e.target.value)}
                        >
                            <option value="">Manual Configuration</option>
                            {finalComponents.map(component => (
                                <option key={component.outputName} value={component.outputName}>
                                    {component.outputName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="config-group">
                        <label>Component Size:</label>
                        <select value={targetSize} onChange={(e) => setTargetSize(e.target.value)}>
                            {Object.keys(progressiveTargets.ingredientCount).map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    <div className="config-group">
                        <label>Component Category:</label>
                        <select value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)}>
                            {componentCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div className="config-group">
                        <label>Target Raw Resources:</label>
                        <input
                            type="number"
                            value={targetResourceCount}
                            onChange={(e) => setTargetResourceCount(parseInt(e.target.value) || 6)}
                            min="1"
                            max="50"
                        />
                        <small>
                            Range for {targetSize}: {progressiveTargets.rawResourceCount[targetSize]?.min}-{progressiveTargets.rawResourceCount[targetSize]?.max}
                        </small>
                    </div>
                </div>

                <button
                    className="optimize-button"
                    onClick={optimizeIngredientCombination}
                    disabled={loading}
                >
                    {loading ? '🔄 Optimizing...' : '🚀 Generate Suggestions'}
                </button>
            </div>

            {/* Target Summary */}
            <div className="target-summary">
                <h3>📊 Progressive Complexity Targets</h3>
                <div className="target-grid">
                    <div className="target-item">
                        <span className="label">Size:</span>
                        <span className="value">{targetSize}</span>
                    </div>
                    <div className="target-item">
                        <span className="label">Category:</span>
                        <span className="value">{targetCategory}</span>
                    </div>
                    <div className="target-item">
                        <span className="label">Ingredient Count:</span>
                        <span className="value">
                            {progressiveTargets.ingredientCount[targetSize]?.min}-{progressiveTargets.ingredientCount[targetSize]?.max}
                        </span>
                    </div>
                    <div className="target-item">
                        <span className="label">Raw Resource Target:</span>
                        <span className="value">{targetResourceCount}</span>
                    </div>
                </div>
            </div>

            {/* Optimization Results */}
            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Analyzing ingredient combinations...</p>
                </div>
            )}

            {optimizationResults && !loading && (
                <div className="optimization-results">
                    <h3>🎯 Optimization Results</h3>

                    {optimizationResults.suggestions.map((suggestionGroup, groupIndex) => (
                        <div key={groupIndex} className="suggestion-group">
                            <h4>{suggestionGroup.ingredientCount} Ingredient Combinations</h4>

                            {suggestionGroup.combinations.length === 0 ? (
                                <div className="no-suggestions">
                                    <p>No suitable combinations found for {suggestionGroup.ingredientCount} ingredients</p>
                                </div>
                            ) : (
                                <div className="combinations-list">
                                    {suggestionGroup.combinations.map((combination, combIndex) => (
                                        <div key={combIndex} className="combination-card">
                                            <div className="combination-header">
                                                <h5>Option {combIndex + 1}</h5>
                                                <div className="combination-badges">
                                                    <span className={`badge score-badge ${combination.score >= 80 ? 'excellent' : combination.score >= 60 ? 'good' : 'fair'}`}>
                                                        Score: {combination.score.toFixed(0)}
                                                    </span>
                                                    <span className="badge resource-badge">
                                                        {combination.totalRawResources} Raw Resources
                                                    </span>
                                                    <span className={`badge tier-badge ${combination.tierValidation.passes ? 'valid' : 'invalid'}`}>
                                                        {combination.tierValidation.passes ? 'Valid Tiers' : 'Tier Issues'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="ingredients-list">
                                                <strong>Ingredients:</strong>
                                                <div className="ingredient-tags">
                                                    {combination.ingredients.map((ingredient, ingIndex) => (
                                                        <div key={ingIndex} className="ingredient-tag">
                                                            <span className="ingredient-name">{ingredient.name}</span>
                                                            <span className="ingredient-details">
                                                                T{ingredient.tier} • {ingredient.category} • ~{ingredient.estimatedRawResources} resources
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="combination-analysis">
                                                <div className="analysis-grid">
                                                    <div className="analysis-item">
                                                        <span className="label">Resource Efficiency:</span>
                                                        <span className={`value ${Math.abs(combination.totalRawResources - targetResourceCount) <= 2 ? 'excellent' : 'good'}`}>
                                                            {Math.abs(combination.totalRawResources - targetResourceCount) <= 2 ? '🎯 On Target' :
                                                                Math.abs(combination.totalRawResources - targetResourceCount) <= 5 ? '✅ Close' : '⚠️ Off Target'}
                                                        </span>
                                                    </div>
                                                    <div className="analysis-item">
                                                        <span className="label">Tier Compliance:</span>
                                                        <span className={`value ${combination.tierValidation.passes ? 'excellent' : 'poor'}`}>
                                                            {combination.tierValidation.passes ? '✅ Compliant' : '❌ Violations'}
                                                        </span>
                                                    </div>
                                                    <div className="analysis-item">
                                                        <span className="label">Category Match:</span>
                                                        <span className="value">
                                                            {combination.ingredients.filter(ing => ing.category === targetCategory).length}/{combination.ingredients.length} ingredients
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!combination.tierValidation.passes && (
                                                <div className="validation-issues">
                                                    <strong>Tier Issues:</strong>
                                                    <ul>
                                                        {combination.tierValidation.maxTier > optimizationResults.targetTier && (
                                                            <li>Contains T{combination.tierValidation.maxTier} ingredients for T{optimizationResults.targetTier} component</li>
                                                        )}
                                                        {!combination.tierValidation.hasRequiredTier && optimizationResults.targetTier > 1 && (
                                                            <li>Missing required T{optimizationResults.targetTier} ingredient</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {optimizationResults.suggestions.every(group => group.combinations.length === 0) && (
                        <div className="no-results">
                            <h4>⚠️ No Suitable Combinations Found</h4>
                            <p>Try adjusting your targets:</p>
                            <ul>
                                <li>Increase raw resource target</li>
                                <li>Choose a more flexible category (UTILITY)</li>
                                <li>Consider different ingredient tiers</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IngredientTierOptimizer; 