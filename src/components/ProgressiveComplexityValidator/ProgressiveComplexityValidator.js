import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './ProgressiveComplexityValidator.css';

const ProgressiveComplexityValidator = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [validationResults, setValidationResults] = useState(null);
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all'); // all, violations, compliant
    const [filterSize, setFilterSize] = useState('all');
    const [loading, setLoading] = useState(false);

    // Progressive complexity rules
    const progressiveRules = {
        // Progressive ingredient count by size
        ingredientRange: {
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
        // Progressive raw resource targets
        rawResourceRange: {
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
        },
        // Component categories
        componentCategories: [
            'THERMAL', 'KINETIC', 'ELECTROMAGNETIC', 'DEFENSIVE',
            'PROPULSION', 'UTILITY', 'ENERGY', 'HABITAT'
        ]
    };

    // Extract component size from recipe name
    const extractComponentSize = (recipeName) => {
        const sizePatterns = ['CLASS8', 'XXXS', 'XXS', 'CMD', 'CAP', 'TTN', 'XS', 'S', 'M', 'L'];
        for (const size of sizePatterns) {
            if (recipeName.includes(size)) {
                return size;
            }
        }
        return null;
    };

    // Extract component category from recipe type and name
    const extractComponentCategory = (recipe) => {
        const name = recipe.outputName?.toLowerCase() || '';
        const type = recipe.outputType?.toLowerCase() || '';

        if (name.includes('heat') || name.includes('thermal') || name.includes('warming')) return 'THERMAL';
        if (name.includes('kinetic') || name.includes('projectile')) return 'KINETIC';
        if (name.includes('emp') || name.includes('energy') || name.includes('electromagnetic')) return 'ELECTROMAGNETIC';
        if (name.includes('shield') || name.includes('armor') || name.includes('defensive')) return 'DEFENSIVE';
        if (name.includes('engine') || name.includes('thruster') || name.includes('propulsion')) return 'PROPULSION';
        if (name.includes('hab') || name.includes('life') || name.includes('habitat')) return 'HABITAT';
        if (name.includes('power') || name.includes('generator') || name.includes('battery')) return 'ENERGY';

        return 'UTILITY'; // Default category
    };

    // Validate progressive tier requirements (relaxed)
    const validateTierRequirements = (recipe) => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return { passes: true, violations: [] };
        }

        const outputTier = recipe.outputTier || 1;
        const violations = [];
        let passes = true;

        // For ingredients of tier X: MUST include at least one resource of tier X,
        // CAN include any lower tier resources, CANNOT include higher tier resources
        const ingredientTiers = recipe.ingredients
            .map(ing => {
                const ingredientRecipe = recipes.find(r => r.outputName === ing.name);
                return ingredientRecipe ? (ingredientRecipe.outputTier || 1) : 1;
            });

        const maxIngredientTier = Math.max(...ingredientTiers, 0);
        const hasRequiredTier = ingredientTiers.some(tier => tier === outputTier);

        if (maxIngredientTier > outputTier) {
            violations.push(`Contains T${maxIngredientTier} ingredients but output is only T${outputTier}`);
            passes = false;
        }

        if (outputTier > 1 && !hasRequiredTier) {
            violations.push(`T${outputTier} component should include at least one T${outputTier} ingredient`);
            passes = false;
        }

        return { passes, violations };
    };

    // Validate component category consistency
    const validateCategoryConsistency = (recipe) => {
        const componentCategory = extractComponentCategory(recipe);
        const violations = [];
        let passes = true;

        // For now, we'll implement basic category validation
        // In a full implementation, we'd check all raw resources in the production chain
        if (!componentCategory) {
            violations.push('Could not determine component category');
            passes = false;
        }

        return { passes, violations, category: componentCategory };
    };

    // Validate progressive ingredient scaling
    const validateIngredientScaling = (recipe) => {
        const size = extractComponentSize(recipe.outputName);
        if (!size || !progressiveRules.ingredientRange[size]) {
            return { passes: true, violations: [], size: null };
        }

        const range = progressiveRules.ingredientRange[size];
        const ingredientCount = recipe.ingredients?.length || 0;
        const violations = [];
        let passes = true;

        if (ingredientCount < range.min || ingredientCount > range.max) {
            violations.push(`${size} components should have ${range.min}-${range.max} ingredients, found ${ingredientCount}`);
            passes = false;
        }

        return { passes, violations, size, range, actual: ingredientCount };
    };

    // Calculate raw resource count (simplified - would need full production chain analysis)
    const calculateRawResourceCount = (recipe) => {
        // This is a simplified calculation - in practice you'd trace the full production chain
        const estimatedRawResources = (recipe.ingredients?.length || 0) * 3; // Rough estimate
        return estimatedRawResources;
    };

    // Validate progressive raw resource targets
    const validateRawResourceTargets = (recipe) => {
        const size = extractComponentSize(recipe.outputName);
        if (!size || !progressiveRules.rawResourceRange[size]) {
            return { passes: true, violations: [], size: null };
        }

        const range = progressiveRules.rawResourceRange[size];
        const rawResourceCount = calculateRawResourceCount(recipe);
        const violations = [];
        let passes = true;

        if (rawResourceCount < range.min || rawResourceCount > range.max) {
            violations.push(`${size} components should use ${range.min}-${range.max} raw resources, estimated ${rawResourceCount}`);
            passes = false;
        }

        return { passes, violations, size, range, actual: rawResourceCount };
    };

    // Run progressive validation on all recipes
    const runProgressiveValidation = () => {
        setLoading(true);

        setTimeout(() => {
            const results = {
                summary: {
                    totalRecipes: 0,
                    compliantRecipes: 0,
                    violationCount: 0,
                    byCategory: {},
                    bySize: {}
                },
                recipeResults: []
            };

            recipes.forEach(recipe => {
                if (!recipe.outputName || recipe.outputType === 'BASIC RESOURCE') return;

                const tierValidation = validateTierRequirements(recipe);
                const categoryValidation = validateCategoryConsistency(recipe);
                const ingredientValidation = validateIngredientScaling(recipe);
                const resourceValidation = validateRawResourceTargets(recipe);

                const allViolations = [
                    ...tierValidation.violations,
                    ...categoryValidation.violations,
                    ...ingredientValidation.violations,
                    ...resourceValidation.violations
                ];

                const recipeResult = {
                    recipe,
                    size: ingredientValidation.size || resourceValidation.size,
                    category: categoryValidation.category,
                    violations: allViolations,
                    passes: allViolations.length === 0,
                    validations: {
                        tier: tierValidation,
                        category: categoryValidation,
                        ingredients: ingredientValidation,
                        resources: resourceValidation
                    }
                };

                results.recipeResults.push(recipeResult);
                results.summary.totalRecipes++;

                if (recipeResult.passes) {
                    results.summary.compliantRecipes++;
                } else {
                    results.summary.violationCount++;
                }

                // Track by category
                const category = recipeResult.category || 'UNKNOWN';
                if (!results.summary.byCategory[category]) {
                    results.summary.byCategory[category] = { total: 0, violations: 0 };
                }
                results.summary.byCategory[category].total++;
                if (!recipeResult.passes) {
                    results.summary.byCategory[category].violations++;
                }

                // Track by size
                const size = recipeResult.size || 'UNKNOWN';
                if (!results.summary.bySize[size]) {
                    results.summary.bySize[size] = { total: 0, violations: 0 };
                }
                results.summary.bySize[size].total++;
                if (!recipeResult.passes) {
                    results.summary.bySize[size].violations++;
                }
            });

            setValidationResults(results);
            setLoading(false);
        }, 100);
    };

    // Filter results based on current filters
    const filteredResults = useMemo(() => {
        if (!validationResults) return [];

        return validationResults.recipeResults.filter(result => {
            if (filterStatus === 'violations' && result.passes) return false;
            if (filterStatus === 'compliant' && !result.passes) return false;
            if (filterSize !== 'all' && result.size !== filterSize) return false;
            return true;
        });
    }, [validationResults, filterStatus, filterSize]);

    useEffect(() => {
        if (recipes && recipes.length > 0) {
            runProgressiveValidation();
        }
    }, [recipes]);

    if (loading) {
        return (
            <div className="progressive-validator">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Running progressive complexity validation...</p>
                </div>
            </div>
        );
    }

    if (!validationResults) {
        return (
            <div className="progressive-validator">
                <div className="no-data">
                    <h3>No Validation Results</h3>
                    <p>Please ensure recipe data is loaded.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="progressive-validator">
            <div className="validator-header">
                <h2>Progressive Complexity Validator</h2>
                <p>Validates recipes against progressive tier-locked continuous progression rules</p>
            </div>

            {/* Summary Dashboard */}
            <div className="summary-dashboard">
                <div className="summary-cards">
                    <div className={`summary-card ${validationResults.summary.violationCount === 0 ? 'success' : 'warning'}`}>
                        <h4>Total Recipes</h4>
                        <div className="value">{validationResults.summary.totalRecipes}</div>
                        <div className="label">Analyzed</div>
                    </div>
                    <div className={`summary-card ${validationResults.summary.violationCount === 0 ? 'success' : 'error'}`}>
                        <h4>Violations</h4>
                        <div className="value">{validationResults.summary.violationCount}</div>
                        <div className="label">Need Updates</div>
                    </div>
                    <div className={`summary-card ${validationResults.summary.compliantRecipes > validationResults.summary.violationCount ? 'success' : 'warning'}`}>
                        <h4>Compliant</h4>
                        <div className="value">{validationResults.summary.compliantRecipes}</div>
                        <div className="label">
                            {((validationResults.summary.compliantRecipes / validationResults.summary.totalRecipes) * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="validation-filters">
                <div className="filter-group">
                    <label>Status Filter:</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Recipes</option>
                        <option value="violations">Only Violations</option>
                        <option value="compliant">Only Compliant</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Size Filter:</label>
                    <select value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
                        <option value="all">All Sizes</option>
                        {Object.keys(progressiveRules.ingredientRange).map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="analysis-section">
                <h3>🏷️ Analysis by Component Category</h3>
                <div className="category-grid">
                    {Object.entries(validationResults.summary.byCategory).map(([category, data]) => (
                        <div key={category} className="category-card">
                            <h4>{category}</h4>
                            <div className="category-stats">
                                <div className="stat">
                                    <div className="value">{data.total}</div>
                                    <div className="label">Total</div>
                                </div>
                                <div className="stat">
                                    <div className="value">{data.violations}</div>
                                    <div className="label">Violations</div>
                                </div>
                                <div className="stat">
                                    <div className="value">{((data.violations / data.total) * 100).toFixed(1)}%</div>
                                    <div className="label">Violation Rate</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Size Breakdown */}
            <div className="analysis-section">
                <h3>📏 Analysis by Component Size</h3>
                <div className="size-grid">
                    {Object.entries(validationResults.summary.bySize)
                        .sort(([a], [b]) => {
                            const sizeOrder = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
                            return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
                        })
                        .map(([size, data]) => (
                            <div key={size} className="size-card">
                                <h4>{size}</h4>
                                <div className="size-stats">
                                    <div className="stat">
                                        <div className="value">{data.total}</div>
                                        <div className="label">Total</div>
                                    </div>
                                    <div className="stat">
                                        <div className="value">{data.violations}</div>
                                        <div className="label">Violations</div>
                                    </div>
                                    <div className="stat">
                                        <div className="value">{((data.violations / data.total) * 100).toFixed(1)}%</div>
                                        <div className="label">Violation Rate</div>
                                    </div>
                                </div>
                                {progressiveRules.ingredientRange[size] && (
                                    <div className="size-targets">
                                        <div>Ingredients: {progressiveRules.ingredientRange[size].min}-{progressiveRules.ingredientRange[size].max}</div>
                                        <div>Raw Resources: {progressiveRules.rawResourceRange[size].min}-{progressiveRules.rawResourceRange[size].max}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            {/* Detailed Results */}
            <div className="validation-results">
                <h3>
                    🔍 Detailed Validation Results
                    <span className="result-count">({filteredResults.length} recipes)</span>
                </h3>

                <div className="results-list">
                    {filteredResults.slice(0, 50).map((result, index) => (
                        <div key={index} className={`result-item ${result.passes ? 'compliant' : 'violation'}`}>
                            <div className="result-header">
                                <h5>{result.recipe.outputName}</h5>
                                <div className="result-badges">
                                    {result.size && <span className="badge size-badge">{result.size}</span>}
                                    {result.category && <span className="badge category-badge">{result.category}</span>}
                                    <span className={`badge status-badge ${result.passes ? 'success' : 'error'}`}>
                                        {result.passes ? 'Compliant' : 'Violations'}
                                    </span>
                                </div>
                            </div>

                            {result.violations.length > 0 && (
                                <div className="violations-list">
                                    <strong>Violations:</strong>
                                    <ul>
                                        {result.violations.map((violation, idx) => (
                                            <li key={idx}>{violation}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="validation-details">
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="label">Tier:</span>
                                        <span className={`value ${result.validations.tier.passes ? 'success' : 'error'}`}>
                                            T{result.recipe.outputTier || 1} {result.validations.tier.passes ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Ingredients:</span>
                                        <span className={`value ${result.validations.ingredients.passes ? 'success' : 'error'}`}>
                                            {result.validations.ingredients.actual || 0} {result.validations.ingredients.passes ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Category:</span>
                                        <span className={`value ${result.validations.category.passes ? 'success' : 'error'}`}>
                                            {result.category} {result.validations.category.passes ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Raw Resources:</span>
                                        <span className={`value ${result.validations.resources.passes ? 'success' : 'error'}`}>
                                            ~{result.validations.resources.actual || 0} {result.validations.resources.passes ? '✓' : '✗'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {result.passes && (
                                <div className="compliance-note">
                                    ✅ This recipe meets all progressive complexity requirements
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressiveComplexityValidator; 