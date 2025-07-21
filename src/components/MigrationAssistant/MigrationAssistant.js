import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './MigrationAssistant.css';

const MigrationAssistant = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [migrationAnalysis, setMigrationAnalysis] = useState(null);
    const [selectedMigration, setSelectedMigration] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSize, setFilterSize] = useState('all');
    const [loading, setLoading] = useState(false);

    // Progressive complexity rules
    const newSystemRules = {
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
        }
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

    // Extract component category
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

        return 'UTILITY';
    };

    // Estimate raw resource count
    const estimateRawResourceCount = (recipe) => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;

        // Simplified estimation - in practice, you'd trace the full production chain
        const baseCount = recipe.ingredients.length;
        const tierMultiplier = (recipe.outputTier || 1) * 2;
        return Math.round(baseCount * tierMultiplier);
    };

    // Analyze migration requirements for a recipe
    const analyzeMigrationNeeds = (recipe) => {
        const size = extractComponentSize(recipe.outputName);
        const category = extractComponentCategory(recipe);
        const ingredientCount = recipe.ingredients?.length || 0;
        const estimatedRawResources = estimateRawResourceCount(recipe);

        const issues = [];
        const suggestions = [];
        let migrationPriority = 'low';

        if (!size) {
            issues.push('Component size cannot be determined from name');
            suggestions.push('Add size indicator to component name (XXXS, XXS, XS, S, M, L, CAP, CMD, CLASS8, TTN)');
            migrationPriority = 'high';
        } else {
            const ingredientRange = newSystemRules.ingredientRange[size];
            const resourceRange = newSystemRules.rawResourceRange[size];

            // Check ingredient count compliance
            if (ingredientCount < ingredientRange.min || ingredientCount > ingredientRange.max) {
                issues.push(`Ingredient count (${ingredientCount}) outside progressive range (${ingredientRange.min}-${ingredientRange.max})`);

                if (ingredientCount < ingredientRange.min) {
                    suggestions.push(`Add ${ingredientRange.min - ingredientCount} more ingredient(s)`);
                } else {
                    suggestions.push(`Remove ${ingredientCount - ingredientRange.max} ingredient(s)`);
                }

                migrationPriority = migrationPriority === 'low' ? 'medium' : 'high';
            }

            // Check raw resource count compliance
            if (estimatedRawResources < resourceRange.min || estimatedRawResources > resourceRange.max) {
                issues.push(`Estimated raw resources (${estimatedRawResources}) outside target range (${resourceRange.min}-${resourceRange.max})`);

                if (estimatedRawResources < resourceRange.min) {
                    suggestions.push('Consider more complex ingredients or higher tier materials');
                } else {
                    suggestions.push('Simplify ingredients or use lower tier materials');
                }

                migrationPriority = migrationPriority === 'low' ? 'medium' : 'high';
            }
        }

        // Check tier progression compliance
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            const ingredientTiers = recipe.ingredients.map(ing => {
                const ingredientRecipe = recipes.find(r => r.outputName === ing.name);
                return ingredientRecipe ? (ingredientRecipe.outputTier || 1) : 1;
            });

            const maxIngredientTier = Math.max(...ingredientTiers);
            const outputTier = recipe.outputTier || 1;
            const hasRequiredTier = ingredientTiers.some(tier => tier === outputTier);

            if (maxIngredientTier > outputTier) {
                issues.push(`Contains T${maxIngredientTier} ingredients but output is only T${outputTier}`);
                suggestions.push(`Lower ingredient tiers or increase output tier to T${maxIngredientTier}`);
                migrationPriority = 'high';
            }

            if (outputTier > 1 && !hasRequiredTier) {
                issues.push(`T${outputTier} component should include at least one T${outputTier} ingredient`);
                suggestions.push(`Add a T${outputTier} ingredient to the recipe`);
                migrationPriority = migrationPriority === 'low' ? 'medium' : 'high';
            }
        }

        // Check if ComponentCategory field is missing
        if (!recipe.componentCategory && !recipe.ComponentCategory) {
            issues.push('Missing ComponentCategory field');
            suggestions.push(`Add ComponentCategory: ${category} to recipe data`);
            migrationPriority = migrationPriority === 'low' ? 'medium' : 'high';
        }

        return {
            recipe,
            size,
            category,
            ingredientCount,
            estimatedRawResources,
            issues,
            suggestions,
            migrationPriority,
            needsMigration: issues.length > 0
        };
    };

    // Run complete migration analysis
    const runMigrationAnalysis = () => {
        setLoading(true);

        setTimeout(() => {
            const analysis = {
                summary: {
                    totalRecipes: 0,
                    needsMigration: 0,
                    highPriority: 0,
                    mediumPriority: 0,
                    lowPriority: 0,
                    byCategory: {},
                    bySize: {}
                },
                migrations: []
            };

            recipes.forEach(recipe => {
                if (!recipe.outputName || recipe.outputType === 'BASIC RESOURCE') return;

                const migrationAnalysis = analyzeMigrationNeeds(recipe);
                analysis.migrations.push(migrationAnalysis);
                analysis.summary.totalRecipes++;

                if (migrationAnalysis.needsMigration) {
                    analysis.summary.needsMigration++;

                    switch (migrationAnalysis.migrationPriority) {
                        case 'high':
                            analysis.summary.highPriority++;
                            break;
                        case 'medium':
                            analysis.summary.mediumPriority++;
                            break;
                        case 'low':
                            analysis.summary.lowPriority++;
                            break;
                    }
                }

                // Track by category
                const category = migrationAnalysis.category || 'UNKNOWN';
                if (!analysis.summary.byCategory[category]) {
                    analysis.summary.byCategory[category] = { total: 0, needsMigration: 0 };
                }
                analysis.summary.byCategory[category].total++;
                if (migrationAnalysis.needsMigration) {
                    analysis.summary.byCategory[category].needsMigration++;
                }

                // Track by size
                const size = migrationAnalysis.size || 'UNKNOWN';
                if (!analysis.summary.bySize[size]) {
                    analysis.summary.bySize[size] = { total: 0, needsMigration: 0 };
                }
                analysis.summary.bySize[size].total++;
                if (migrationAnalysis.needsMigration) {
                    analysis.summary.bySize[size].needsMigration++;
                }
            });

            setMigrationAnalysis(analysis);
            setLoading(false);
        }, 100);
    };

    // Filter migrations based on current filters
    const filteredMigrations = useMemo(() => {
        if (!migrationAnalysis) return [];

        return migrationAnalysis.migrations.filter(migration => {
            if (filterCategory !== 'all' && migration.category !== filterCategory) return false;
            if (filterSize !== 'all' && migration.size !== filterSize) return false;
            return migration.needsMigration; // Only show recipes that need migration
        });
    }, [migrationAnalysis, filterCategory, filterSize]);

    // Generate migration strategy recommendations
    const generateMigrationStrategy = () => {
        if (!migrationAnalysis) return null;

        const strategy = {
            phases: [],
            estimatedEffort: 'Medium',
            keyActions: []
        };

        // Phase 1: Critical migrations
        if (migrationAnalysis.summary.highPriority > 0) {
            strategy.phases.push({
                name: 'Phase 1: Critical Migrations',
                priority: 'high',
                count: migrationAnalysis.summary.highPriority,
                description: 'Fix tier violations and add missing component sizes',
                effort: 'High'
            });
        }

        // Phase 2: Progressive scaling adjustments
        if (migrationAnalysis.summary.mediumPriority > 0) {
            strategy.phases.push({
                name: 'Phase 2: Progressive Scaling',
                priority: 'medium',
                count: migrationAnalysis.summary.mediumPriority,
                description: 'Adjust ingredient counts and add ComponentCategory fields',
                effort: 'Medium'
            });
        }

        // Phase 3: Optimization and cleanup
        if (migrationAnalysis.summary.lowPriority > 0) {
            strategy.phases.push({
                name: 'Phase 3: Optimization',
                priority: 'low',
                count: migrationAnalysis.summary.lowPriority,
                description: 'Fine-tune raw resource counts and optimize complexity',
                effort: 'Low'
            });
        }

        // Key actions
        strategy.keyActions = [
            'Add ComponentCategory and Size fields to CSV headers',
            'Update recipe validation logic for progressive tier requirements',
            'Implement flexible tier mixing (T5 can use T1-T5 resources)',
            'Adjust ingredient counts to meet progressive scaling targets',
            'Test recipe chains to ensure raw resource count compliance'
        ];

        return strategy;
    };

    useEffect(() => {
        if (recipes && recipes.length > 0) {
            runMigrationAnalysis();
        }
    }, [recipes]);

    if (loading) {
        return (
            <div className="migration-assistant">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Analyzing migration requirements...</p>
                </div>
            </div>
        );
    }

    if (!migrationAnalysis) {
        return (
            <div className="migration-assistant">
                <div className="no-data">
                    <h3>No Migration Analysis</h3>
                    <p>Please ensure recipe data is loaded.</p>
                </div>
            </div>
        );
    }

    const migrationStrategy = generateMigrationStrategy();

    return (
        <div className="migration-assistant">
            <div className="assistant-header">
                <h2>Progressive System Migration Assistant</h2>
                <p>Analyze and plan migration from linear to progressive complexity system</p>
            </div>

            {/* Migration Summary */}
            <div className="migration-summary">
                <h3>🔄 Migration Overview</h3>
                <div className="summary-cards">
                    <div className="summary-card">
                        <h4>Total Recipes</h4>
                        <div className="value">{migrationAnalysis.summary.totalRecipes}</div>
                        <div className="label">Analyzed</div>
                    </div>
                    <div className={`summary-card ${migrationAnalysis.summary.needsMigration > 0 ? 'warning' : 'success'}`}>
                        <h4>Need Migration</h4>
                        <div className="value">{migrationAnalysis.summary.needsMigration}</div>
                        <div className="label">
                            {((migrationAnalysis.summary.needsMigration / migrationAnalysis.summary.totalRecipes) * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div className={`summary-card ${migrationAnalysis.summary.highPriority > 0 ? 'error' : 'success'}`}>
                        <h4>High Priority</h4>
                        <div className="value">{migrationAnalysis.summary.highPriority}</div>
                        <div className="label">Critical</div>
                    </div>
                    <div className={`summary-card ${migrationAnalysis.summary.mediumPriority > 0 ? 'warning' : 'success'}`}>
                        <h4>Medium Priority</h4>
                        <div className="value">{migrationAnalysis.summary.mediumPriority}</div>
                        <div className="label">Important</div>
                    </div>
                </div>
            </div>

            {/* Migration Strategy */}
            {migrationStrategy && (
                <div className="migration-strategy">
                    <h3>📋 Recommended Migration Strategy</h3>

                    <div className="strategy-phases">
                        {migrationStrategy.phases.map((phase, index) => (
                            <div key={index} className={`phase-card ${phase.priority}`}>
                                <div className="phase-header">
                                    <h4>{phase.name}</h4>
                                    <div className="phase-badges">
                                        <span className={`badge priority-badge ${phase.priority}`}>
                                            {phase.priority.toUpperCase()}
                                        </span>
                                        <span className="badge count-badge">
                                            {phase.count} recipes
                                        </span>
                                        <span className="badge effort-badge">
                                            {phase.effort} effort
                                        </span>
                                    </div>
                                </div>
                                <p>{phase.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="key-actions">
                        <h4>🔑 Key Implementation Actions</h4>
                        <ul>
                            {migrationStrategy.keyActions.map((action, index) => (
                                <li key={index}>{action}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Category and Size Breakdown */}
            <div className="breakdown-section">
                <div className="category-breakdown">
                    <h3>🏷️ Migration by Category</h3>
                    <div className="breakdown-grid">
                        {Object.entries(migrationAnalysis.summary.byCategory).map(([category, data]) => (
                            <div key={category} className="breakdown-card">
                                <h4>{category}</h4>
                                <div className="breakdown-stats">
                                    <div className="stat">
                                        <span className="value">{data.needsMigration}</span>
                                        <span className="label">Need Migration</span>
                                    </div>
                                    <div className="stat">
                                        <span className="value">{data.total}</span>
                                        <span className="label">Total</span>
                                    </div>
                                    <div className="stat">
                                        <span className="value">{((data.needsMigration / data.total) * 100).toFixed(0)}%</span>
                                        <span className="label">Migration Rate</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="size-breakdown">
                    <h3>📏 Migration by Size</h3>
                    <div className="breakdown-grid">
                        {Object.entries(migrationAnalysis.summary.bySize)
                            .sort(([a], [b]) => {
                                const sizeOrder = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
                                return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
                            })
                            .map(([size, data]) => (
                                <div key={size} className="breakdown-card">
                                    <h4>{size}</h4>
                                    <div className="breakdown-stats">
                                        <div className="stat">
                                            <span className="value">{data.needsMigration}</span>
                                            <span className="label">Need Migration</span>
                                        </div>
                                        <div className="stat">
                                            <span className="value">{data.total}</span>
                                            <span className="label">Total</span>
                                        </div>
                                        <div className="stat">
                                            <span className="value">{((data.needsMigration / data.total) * 100).toFixed(0)}%</span>
                                            <span className="label">Migration Rate</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Migration Filters */}
            <div className="migration-filters">
                <div className="filter-group">
                    <label>Category Filter:</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {Object.keys(migrationAnalysis.summary.byCategory).map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Size Filter:</label>
                    <select value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
                        <option value="all">All Sizes</option>
                        {Object.keys(migrationAnalysis.summary.bySize).map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Migration Details */}
            <div className="migration-details">
                <h3>
                    🔧 Migration Requirements
                    <span className="detail-count">({filteredMigrations.length} recipes)</span>
                </h3>

                <div className="migrations-list">
                    {filteredMigrations.slice(0, 50).map((migration, index) => (
                        <div key={index} className={`migration-item ${migration.migrationPriority}`}>
                            <div className="migration-header">
                                <h5>{migration.recipe.outputName}</h5>
                                <div className="migration-badges">
                                    {migration.size && <span className="badge size-badge">{migration.size}</span>}
                                    <span className="badge category-badge">{migration.category}</span>
                                    <span className={`badge priority-badge ${migration.migrationPriority}`}>
                                        {migration.migrationPriority.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="migration-issues">
                                <strong>Issues:</strong>
                                <ul>
                                    {migration.issues.map((issue, idx) => (
                                        <li key={idx}>{issue}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="migration-suggestions">
                                <strong>Suggested Actions:</strong>
                                <ul>
                                    {migration.suggestions.map((suggestion, idx) => (
                                        <li key={idx}>{suggestion}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="migration-metrics">
                                <div className="metric-grid">
                                    <div className="metric-item">
                                        <span className="label">Current Ingredients:</span>
                                        <span className="value">{migration.ingredientCount}</span>
                                    </div>
                                    <div className="metric-item">
                                        <span className="label">Estimated Raw Resources:</span>
                                        <span className="value">{migration.estimatedRawResources}</span>
                                    </div>
                                    <div className="metric-item">
                                        <span className="label">Tier:</span>
                                        <span className="value">T{migration.recipe.outputTier || 1}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MigrationAssistant; 