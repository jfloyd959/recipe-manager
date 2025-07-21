import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import ProgressiveComplexityValidator from '../ProgressiveComplexityValidator/ProgressiveComplexityValidator';
import IngredientTierOptimizer from '../IngredientTierOptimizer/IngredientTierOptimizer';
import MigrationAssistant from '../MigrationAssistant/MigrationAssistant';
import './ProgressiveComplexityDashboard.css';

const ProgressiveComplexityDashboard = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [activeTab, setActiveTab] = useState('overview');
    const [systemMetrics, setSystemMetrics] = useState(null);
    const [loading, setLoading] = useState(false);

    // Progressive complexity system overview
    const progressiveSystemFeatures = [
        {
            id: 'tier-flexibility',
            title: 'Flexible Tier Mixing',
            description: 'T5 ingredients can use T1-T5 resources for creative complexity',
            icon: '🔄',
            status: 'active'
        },
        {
            id: 'progressive-scaling',
            title: 'Progressive Scaling',
            description: 'Ingredient count scales from 2 (XXXS) to 5 (TTN) ingredients',
            icon: '📈',
            status: 'active'
        },
        {
            id: 'category-alignment',
            title: 'Category Consistency',
            description: 'ComponentCategory ensures thematic consistency throughout chains',
            icon: '🏷️',
            status: 'active'
        },
        {
            id: 'resource-targets',
            title: 'Raw Resource Targets',
            description: 'Progressive raw resource counts: 4-8 (XXXS) to 30-45 (TTN)',
            icon: '🎯',
            status: 'active'
        }
    ];

    // System tabs
    const systemTabs = [
        {
            id: 'overview',
            title: 'System Overview',
            icon: '📊',
            description: 'Progressive complexity system overview and metrics'
        },
        {
            id: 'validator',
            title: 'Recipe Validator',
            icon: '✅',
            description: 'Validate recipes against progressive complexity rules'
        },
        {
            id: 'optimizer',
            title: 'Ingredient Optimizer',
            icon: '🎯',
            description: 'Find optimal ingredient combinations for targets'
        },
        {
            id: 'migration',
            title: 'Migration Assistant',
            icon: '🔄',
            description: 'Migrate from linear to progressive complexity system'
        }
    ];

    // Calculate system health metrics
    const calculateSystemMetrics = () => {
        setLoading(true);

        setTimeout(() => {
            const metrics = {
                totalRecipes: recipes.length,
                finalComponents: recipes.filter(r =>
                    !['BASIC RESOURCE', 'INGREDIENT', 'COMPONENT'].includes(r.outputType)
                ).length,
                ingredients: recipes.filter(r => r.outputType === 'INGREDIENT').length,
                components: recipes.filter(r => r.outputType === 'COMPONENT').length,
                rawResources: recipes.filter(r => r.outputType === 'BASIC RESOURCE').length,
                sizeDistribution: {},
                tierDistribution: {},
                categoryDistribution: {},
                systemReadiness: {
                    hasComponentCategory: 0,
                    hasSize: 0,
                    progressiveCompliant: 0
                }
            };

            // Analyze recipes for progressive system readiness
            recipes.forEach(recipe => {
                if (!recipe.outputName || recipe.outputType === 'BASIC RESOURCE') return;

                // Size distribution
                const size = extractComponentSize(recipe.outputName);
                if (size) {
                    metrics.sizeDistribution[size] = (metrics.sizeDistribution[size] || 0) + 1;
                    metrics.systemReadiness.hasSize++;
                }

                // Tier distribution
                const tier = recipe.outputTier || 1;
                metrics.tierDistribution[`T${tier}`] = (metrics.tierDistribution[`T${tier}`] || 0) + 1;

                // Category distribution
                const category = extractComponentCategory(recipe);
                metrics.categoryDistribution[category] = (metrics.categoryDistribution[category] || 0) + 1;

                // System readiness checks
                if (recipe.componentCategory || recipe.ComponentCategory) {
                    metrics.systemReadiness.hasComponentCategory++;
                }

                // Basic progressive compliance (simplified check)
                if (size && recipe.ingredients && recipe.ingredients.length > 0) {
                    const targetRange = getIngredientRange(size);
                    if (targetRange && recipe.ingredients.length >= targetRange.min && recipe.ingredients.length <= targetRange.max) {
                        metrics.systemReadiness.progressiveCompliant++;
                    }
                }
            });

            metrics.systemReadiness.readinessScore = Math.round(
                ((metrics.systemReadiness.hasSize + metrics.systemReadiness.hasComponentCategory + metrics.systemReadiness.progressiveCompliant) /
                    (metrics.totalRecipes * 3)) * 100
            );

            setSystemMetrics(metrics);
            setLoading(false);
        }, 100);
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

        if (name.includes('heat') || name.includes('thermal') || name.includes('warming')) return 'THERMAL';
        if (name.includes('kinetic') || name.includes('projectile')) return 'KINETIC';
        if (name.includes('emp') || name.includes('energy') || name.includes('electromagnetic')) return 'ELECTROMAGNETIC';
        if (name.includes('shield') || name.includes('armor') || name.includes('defensive')) return 'DEFENSIVE';
        if (name.includes('engine') || name.includes('thruster') || name.includes('propulsion')) return 'PROPULSION';
        if (name.includes('hab') || name.includes('life') || name.includes('habitat')) return 'HABITAT';
        if (name.includes('power') || name.includes('generator') || name.includes('battery')) return 'ENERGY';

        return 'UTILITY';
    };

    // Get ingredient range for size
    const getIngredientRange = (size) => {
        const ranges = {
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
        };
        return ranges[size];
    };

    useEffect(() => {
        if (recipes && recipes.length > 0) {
            calculateSystemMetrics();
        }
    }, [recipes]);

    const renderOverview = () => (
        <div className="overview-content">
            {/* System Introduction */}
            <div className="system-intro">
                <h3>🚀 Progressive Tier-Locked Continuous Progression System</h3>
                <p>
                    The Progressive Complexity System addresses economic balance by implementing tier-locked
                    ingredients with flexible resource mixing and progressive scaling targets. This system
                    enables creative recipe design while maintaining economic accessibility for new players.
                </p>
            </div>

            {/* System Features */}
            <div className="system-features">
                <h4>🌟 Key Features</h4>
                <div className="features-grid">
                    {progressiveSystemFeatures.map(feature => (
                        <div key={feature.id} className={`feature-card ${feature.status}`}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h5>{feature.title}</h5>
                            <p>{feature.description}</p>
                            <span className={`status-badge ${feature.status}`}>
                                {feature.status === 'active' ? 'Implemented' : 'Pending'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* System Metrics */}
            {systemMetrics && (
                <div className="system-metrics">
                    <h4>📈 System Metrics</h4>

                    <div className="metrics-summary">
                        <div className="metric-cards">
                            <div className="metric-card">
                                <div className="metric-value">{systemMetrics.totalRecipes}</div>
                                <div className="metric-label">Total Recipes</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{systemMetrics.finalComponents}</div>
                                <div className="metric-label">Final Components</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{systemMetrics.ingredients}</div>
                                <div className="metric-label">Ingredients</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{systemMetrics.rawResources}</div>
                                <div className="metric-label">Raw Resources</div>
                            </div>
                        </div>
                    </div>

                    <div className="readiness-section">
                        <h5>🎯 Progressive System Readiness</h5>
                        <div className="readiness-metrics">
                            <div className="readiness-score">
                                <div className={`score-circle ${systemMetrics.systemReadiness.readinessScore >= 80 ? 'excellent' :
                                    systemMetrics.systemReadiness.readinessScore >= 60 ? 'good' : 'needs-work'}`}>
                                    <span className="score-value">{systemMetrics.systemReadiness.readinessScore}%</span>
                                    <span className="score-label">Ready</span>
                                </div>
                            </div>
                            <div className="readiness-details">
                                <div className="readiness-item">
                                    <span className="label">Has Size Info:</span>
                                    <span className="value">{systemMetrics.systemReadiness.hasSize}/{systemMetrics.totalRecipes}</span>
                                </div>
                                <div className="readiness-item">
                                    <span className="label">Has Category:</span>
                                    <span className="value">{systemMetrics.systemReadiness.hasComponentCategory}/{systemMetrics.totalRecipes}</span>
                                </div>
                                <div className="readiness-item">
                                    <span className="label">Progressive Compliant:</span>
                                    <span className="value">{systemMetrics.systemReadiness.progressiveCompliant}/{systemMetrics.totalRecipes}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distribution Charts */}
                    <div className="distribution-charts">
                        <div className="distribution-chart">
                            <h5>📏 Size Distribution</h5>
                            <div className="chart-bars">
                                {Object.entries(systemMetrics.sizeDistribution)
                                    .sort(([a], [b]) => {
                                        const order = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'CLASS8', 'TTN'];
                                        return order.indexOf(a) - order.indexOf(b);
                                    })
                                    .map(([size, count]) => (
                                        <div key={size} className="chart-bar">
                                            <div className="bar-label">{size}</div>
                                            <div className="bar-container">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${(count / Math.max(...Object.values(systemMetrics.sizeDistribution))) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="bar-value">{count}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="distribution-chart">
                            <h5>🏷️ Category Distribution</h5>
                            <div className="chart-bars">
                                {Object.entries(systemMetrics.categoryDistribution)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 6)
                                    .map(([category, count]) => (
                                        <div key={category} className="chart-bar">
                                            <div className="bar-label">{category}</div>
                                            <div className="bar-container">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${(count / Math.max(...Object.values(systemMetrics.categoryDistribution))) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="bar-value">{count}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
                <h4>⚡ Quick Actions</h4>
                <div className="action-buttons">
                    <button
                        className="action-button validator"
                        onClick={() => setActiveTab('validator')}
                    >
                        <span className="action-icon">✅</span>
                        <span className="action-text">Validate Recipes</span>
                        <span className="action-desc">Check progressive compliance</span>
                    </button>
                    <button
                        className="action-button optimizer"
                        onClick={() => setActiveTab('optimizer')}
                    >
                        <span className="action-icon">🎯</span>
                        <span className="action-text">Optimize Ingredients</span>
                        <span className="action-desc">Find optimal combinations</span>
                    </button>
                    <button
                        className="action-button migration"
                        onClick={() => setActiveTab('migration')}
                    >
                        <span className="action-icon">🔄</span>
                        <span className="action-text">Migration Assistant</span>
                        <span className="action-desc">Plan system migration</span>
                    </button>
                </div>
            </div>

            {/* Implementation Guide */}
            <div className="implementation-guide">
                <h4>📋 Implementation Guide</h4>
                <div className="guide-steps">
                    <div className="guide-step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h5>Add New CSV Headers</h5>
                            <p>Add ComponentCategory and Size fields to your CSV structure</p>
                        </div>
                    </div>
                    <div className="guide-step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h5>Run Migration Analysis</h5>
                            <p>Use the Migration Assistant to identify recipes needing updates</p>
                        </div>
                    </div>
                    <div className="guide-step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h5>Update Validation Logic</h5>
                            <p>Implement progressive tier requirements and flexible mixing</p>
                        </div>
                    </div>
                    <div className="guide-step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h5>Optimize Recipes</h5>
                            <p>Use the Ingredient Optimizer to achieve progressive targets</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="progressive-dashboard">
            <div className="dashboard-header">
                <h2>Progressive Complexity System</h2>
                <p>Tier-Locked Continuous Progression for Balanced Economic Complexity</p>
            </div>

            {/* Navigation Tabs */}
            <div className="dashboard-tabs">
                {systemTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-title">{tab.title}</span>
                        <span className="tab-description">{tab.description}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {loading && activeTab === 'overview' && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading system metrics...</p>
                    </div>
                )}

                {activeTab === 'overview' && !loading && renderOverview()}
                {activeTab === 'validator' && <ProgressiveComplexityValidator />}
                {activeTab === 'optimizer' && <IngredientTierOptimizer />}
                {activeTab === 'migration' && <MigrationAssistant />}
            </div>
        </div>
    );
};

export default ProgressiveComplexityDashboard; 