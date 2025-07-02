import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import { RecipeComplexityAnalyzer as Analyzer } from '../../utils/recipeComplexityAnalyzer';
import './RecipeComplexityAnalyzer.css';

const RecipeComplexityAnalyzer = () => {
    const { state } = useRecipes();
    const { recipes: contextRecipes } = state;
    const [localRecipes, setLocalRecipes] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [selectedShipSize, setSelectedShipSize] = useState('ALL');
    const [selectedTier, setSelectedTier] = useState('ALL');
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [includeBuildingCosts, setIncludeBuildingCosts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllRecipes, setShowAllRecipes] = useState(false);
    const [recipeTypeFilter, setRecipeTypeFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('basicResources'); // New sorting state

    // Complexity rules based on economist feedback
    const complexityRules = {
        maxBasicResources: {
            'XXXS': 10, 'XXS': 10, 'XS': 10, 'S': 15, 'M': 20,
            'L': 30, 'CAP': 40, 'CMD': 50, 'CLASS8': 60, 'TTN': 80
        },
        maxProductionSteps: {
            'XXXS': 5, 'XXS': 5, 'XS': 5, 'S': 6, 'M': 6,
            'L': 7, 'CAP': 8, 'CMD': 9, 'CLASS8': 10, 'TTN': 12
        },
        maxIngredientsPerRecipe: {
            'XXXS': 3, 'XXS': 3, 'XS': 3, 'S': 4, 'M': 4,
            'L': 5, 'CAP': 6, 'CMD': 7, 'CLASS8': 8, 'TTN': 10
        }
    };

    // Load data from context and localStorage
    useEffect(() => {
        console.log("Context recipes:", contextRecipes);
        if (contextRecipes && contextRecipes.length > 0) {
            setLocalRecipes(contextRecipes);
        } else {
            const storedRecipes = localStorage.getItem('recipes');
            if (storedRecipes) {
                setLocalRecipes(JSON.parse(storedRecipes));
            }
        }
    }, [contextRecipes]);

    // Run analysis when recipes change OR building costs toggle changes
    useEffect(() => {
        if (localRecipes.length > 0) {
            runAnalysis();
        }
    }, [localRecipes, includeBuildingCosts]);

    // Filter recipes based on selected criteria
    useEffect(() => {
        if (analysis) {
            filterRecipes();
        }
    }, [selectedShipSize, selectedTier, searchTerm, showAllRecipes, recipeTypeFilter, sortBy, analysis]);

    const runAnalysis = () => {
        setLoading(true);
        try {
            console.log("Starting analysis with recipes:", localRecipes.length, "Building costs:", includeBuildingCosts);

            // Debug: Check for buildings in the data
            const buildings = localRecipes.filter(recipe => {
                const outputType = (recipe.OutputType || recipe.outputType || '').toUpperCase();
                return outputType === 'BUILDING';
            });
            console.log(`Found ${buildings.length} buildings in recipe data:`, buildings.slice(0, 5).map(b => b.OutputName || b.outputName));

            // Create analyzer with building costs option
            const analyzer = new Analyzer(localRecipes, null, includeBuildingCosts);
            const result = analyzer.analyzeAllRecipes();
            console.log("Analysis result:", result);
            setAnalysis(result);
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterRecipes = () => {
        if (analysis) {
            // Start with either all analyzed recipes or just problematic ones
            let filtered = showAllRecipes
                ? localRecipes.map(recipe => {
                    const recipeAnalysis = analysis.problematicRecipes.find(p => p.recipeName === (recipe.OutputName || recipe.outputName));
                    return recipeAnalysis || {
                        recipeName: recipe.OutputName || recipe.outputName,
                        shipSize: extractShipSize(recipe.OutputName || recipe.outputName),
                        tier: recipe.OutputTier || recipe.outputTier || 1,
                        basicResourceCount: 0,
                        ingredientCount: 0,
                        productionSteps: recipe.ProductionSteps || recipe.productionSteps || 0,
                        complexityScore: 0,
                        needsTrimming: false,
                        trimmingReasons: [],
                        maxAllowed: { basicResources: 100, productionSteps: 15, ingredients: 10 }
                    };
                })
                : analysis.problematicRecipes;

            // Apply search filter
            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filtered = filtered.filter(recipe =>
                    recipe.recipeName.toLowerCase().includes(searchLower)
                );
            }

            // Apply recipe type filter
            if (recipeTypeFilter !== 'ALL') {
                filtered = filtered.filter(recipe => {
                    const recipeName = recipe.recipeName.toLowerCase();
                    switch (recipeTypeFilter) {
                        case 'MISSILES':
                            return recipeName.includes('missile');
                        case 'WEAPONS':
                            return recipeName.includes('weapon') || recipeName.includes('gun') || recipeName.includes('cannon') || recipeName.includes('laser');
                        case 'ENGINES':
                            return recipeName.includes('engine') || recipeName.includes('thruster');
                        case 'SHIELDS':
                            return recipeName.includes('shield');
                        case 'ARMOR':
                            return recipeName.includes('armor') || recipeName.includes('plating');
                        case 'PROCESSORS':
                            return recipeName.includes('processor');
                        case 'EXTRACTORS':
                            return recipeName.includes('extractor');
                        case 'HEAT_SINKS':
                            return recipeName.includes('heat sink');
                        default:
                            return true;
                    }
                });
            }

            // Apply ship size filter
            if (selectedShipSize !== 'ALL') {
                filtered = filtered.filter(recipe => recipe.shipSize === selectedShipSize);
            }

            // Apply tier filter
            if (selectedTier !== 'ALL') {
                filtered = filtered.filter(recipe => recipe.tier === parseInt(selectedTier));
            }

            // Apply sorting
            filtered.sort((a, b) => {
                switch (sortBy) {
                    case 'basicResources':
                        return (b.basicResourceCount || 0) - (a.basicResourceCount || 0); // Most to least
                    case 'basicResourcesAsc':
                        return (a.basicResourceCount || 0) - (b.basicResourceCount || 0); // Least to most
                    case 'complexity':
                        return (b.complexityScore || 0) - (a.complexityScore || 0); // Highest to lowest complexity
                    case 'ingredients':
                        return (b.ingredientCount || 0) - (a.ingredientCount || 0); // Most to least ingredients
                    case 'productionSteps':
                        return (b.productionSteps || 0) - (a.productionSteps || 0); // Most to least steps
                    case 'alphabetical':
                        return (a.recipeName || '').localeCompare(b.recipeName || ''); // A to Z
                    default:
                        return 0;
                }
            });

            setFilteredRecipes(filtered);
        }
    };

    // Helper function to extract ship size from recipe name
    const extractShipSize = (recipeName) => {
        // Sort patterns by length (longest first) to avoid partial matches
        const sizePatterns = ['CLASS8', 'XXXS', 'XXS', 'CMD', 'CAP', 'TTN', 'XS', 'S', 'M', 'L'];
        for (const size of sizePatterns) {
            if (recipeName.includes(size)) {
                return size;
            }
        }
        return 'UNKNOWN';
    };

    // New function to generate streamlined export for AI agent
    const generateStreamlinedExport = () => {
        if (!analysis || !analysis.problematicRecipes.length) {
            return "No problematic recipes found.";
        }

        // Filter out large ships (L, CAP, CMD, CLASS8, TTN) - focus on Medium and below
        const filteredRecipes = analysis.problematicRecipes.filter(recipe => {
            const shipSize = recipe.shipSize;
            return !['L', 'CAP', 'CMD', 'CLASS8', 'TTN'].includes(shipSize);
        });

        if (filteredRecipes.length === 0) {
            return "No problematic recipes found for Medium ships and below.";
        }

        // Group recipes by component type and ship size
        const groupedRecipes = {};

        filteredRecipes.forEach(recipe => {
            const componentName = extractComponentName(recipe.recipeName);
            const shipSize = recipe.shipSize;
            const tier = recipe.tier;

            if (!groupedRecipes[componentName]) {
                groupedRecipes[componentName] = {};
            }
            if (!groupedRecipes[componentName][shipSize]) {
                groupedRecipes[componentName][shipSize] = {};
            }

            groupedRecipes[componentName][shipSize][tier] = recipe;
        });

        let exportText = "# Recipe Complexity Reduction - AI Agent Analysis\n\n";
        exportText += `**Analysis Mode:** ${includeBuildingCosts ? 'Including Building Costs' : 'Excluding Building Costs'}\n`;
        exportText += `**Ship Size Focus:** Medium and below (XXXS, XXS, XS, S, M)\n\n`;
        exportText += "## Instructions for AI Agent\n";
        exportText += "For each component below, identify the LEAST essential ingredient to remove.\n";
        exportText += "Focus on ingredients that:\n";
        exportText += "- Are not used in higher tiers\n";
        exportText += "- Have the smallest impact on functionality\n";
        exportText += "- Can be replaced by existing ingredients\n";
        exportText += "- Removing them would significantly reduce raw resource complexity\n\n";

        // Process each component type
        Object.keys(groupedRecipes).sort().forEach(componentName => {
            exportText += `## ${componentName}\n\n`;

            Object.keys(groupedRecipes[componentName]).sort().forEach(shipSize => {
                const tiers = groupedRecipes[componentName][shipSize];
                const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);

                if (tierKeys.length > 1) {
                    // Show progression from T1 to T5
                    exportText += `### ${shipSize} Ships (T${tierKeys[0]}-T${tierKeys[tierKeys.length - 1]})\n\n`;

                    // Show T1 recipe as baseline
                    const t1Recipe = tiers[tierKeys[0]];
                    const t1RecipeData = localRecipes.find(r => (r.OutputName || r.outputName) === t1Recipe.recipeName);
                    const t1Ingredients = t1RecipeData ? extractIngredients(t1RecipeData) : [];

                    exportText += `**T${tierKeys[0]} Baseline:** ${t1Recipe.recipeName}\n`;
                    exportText += `- Raw Resources Required: ${t1Recipe.basicResourceCount || 0}\n`;
                    exportText += `- Direct Ingredients: ${t1Ingredients.length}\n`;
                    exportText += `- Production Steps: ${t1Recipe.productionSteps}\n`;
                    if (t1Ingredients.length > 0) {
                        exportText += `- Recipe Ingredients: ${t1Ingredients.map(ing => ing.name).join(', ')}\n`;
                    }
                    exportText += `\n`;

                    // Show what changes in higher tiers
                    if (tierKeys.length > 1) {
                        exportText += `**Tier Progression Changes:**\n`;
                        for (let i = 1; i < tierKeys.length; i++) {
                            const currentTier = tierKeys[i];
                            const currentRecipe = tiers[currentTier];
                            const currentRecipeData = localRecipes.find(r => (r.OutputName || r.outputName) === currentRecipe.recipeName);
                            const currentIngredients = currentRecipeData ? extractIngredients(currentRecipeData) : [];

                            if (currentIngredients.length > 0) {
                                exportText += `- T${currentTier}: ${currentIngredients.map(ing => ing.name).join(', ')}\n`;
                            }
                        }
                        exportText += '\n';
                    }

                    // Show trimming recommendations for highest tier
                    const maxTierRecipe = tiers[tierKeys[tierKeys.length - 1]];
                    const maxTierRecipeData = localRecipes.find(r => (r.OutputName || r.outputName) === maxTierRecipe.recipeName);
                    const maxTierIngredients = maxTierRecipeData ? extractIngredients(maxTierRecipeData) : [];

                    exportText += `**Trimming Target (T${tierKeys[tierKeys.length - 1]}):**\n`;
                    exportText += `- Current Raw Resources: ${maxTierRecipe.basicResourceCount || 0}\n`;
                    exportText += `- Target Raw Resources: ${maxTierRecipe.maxAllowed?.basicResources || 'N/A'}\n`;
                    exportText += `- Need to reduce by: ${(maxTierRecipe.basicResourceCount || 0) - (maxTierRecipe.maxAllowed?.basicResources || 0)} raw resources\n`;
                    exportText += `- Current Recipe Ingredients: ${maxTierIngredients.map(ing => ing.name).join(', ')}\n\n`;

                    if (includeBuildingCosts && maxTierRecipe.buildingsUsed && maxTierRecipe.buildingsUsed.length > 0) {
                        exportText += `**Buildings Analyzed in Production Chain:**\n`;
                        maxTierRecipe.buildingsUsed.forEach(building => {
                            exportText += `- ${building.buildingName} (for ${building.forResource}, ${building.productionSteps} steps)\n`;
                        });
                        exportText += `\n`;
                    }

                    exportText += `**AI Recommendation Needed:** Which ingredient(s) should be removed from the recipe to significantly reduce raw resource complexity?\n\n`;
                } else {
                    // Single tier recipe
                    const recipe = tiers[tierKeys[0]];
                    const recipeData = localRecipes.find(r => (r.OutputName || r.outputName) === recipe.recipeName);
                    const ingredients = recipeData ? extractIngredients(recipeData) : [];

                    exportText += `### ${shipSize} Ships (T${tierKeys[0]} only)\n\n`;
                    exportText += `**Recipe:** ${recipe.recipeName}\n`;
                    exportText += `- Current Raw Resources: ${recipe.basicResourceCount || 0} (target: ${recipe.maxAllowed?.basicResources || 'N/A'})\n`;
                    exportText += `- Current Recipe Ingredients: ${ingredients.map(ing => ing.name).join(', ')}\n\n`;

                    if (includeBuildingCosts && recipe.buildingsUsed && recipe.buildingsUsed.length > 0) {
                        exportText += `**Buildings Analyzed in Production Chain:**\n`;
                        recipe.buildingsUsed.forEach(building => {
                            exportText += `- ${building.buildingName} (for ${building.forResource}, ${building.productionSteps} steps)\n`;
                        });
                        exportText += `\n`;
                    }

                    exportText += `**AI Recommendation Needed:** Which ingredient(s) should be removed to reduce raw resource complexity?\n\n`;
                }
            });
        });

        return exportText;
    };

    // Helper function to extract ingredients from recipe data
    const extractIngredients = (recipe) => {
        const ingredients = [];

        // Handle both new and old recipe formats
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            return recipe.ingredients.filter(ing => ing && ing.name);
        }

        // Handle old format with Ingredient1, Ingredient2, etc.
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            if (ingredient && ingredient.trim()) {
                ingredients.push({ name: ingredient.trim() });
            }
        }

        return ingredients;
    };

    const exportStreamlinedReport = () => {
        const report = generateStreamlinedExport();
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recipe-ingredients-analysis-${includeBuildingCosts ? 'with-buildings' : 'no-buildings'}-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Helper function to extract component name from recipe name
    const extractComponentName = (recipeName) => {
        // Remove ship size and tier information
        const withoutSize = recipeName.replace(/(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)/g, '').trim();
        const withoutTier = withoutSize.replace(/T\d+$/, '').trim();
        return withoutTier;
    };

    if (loading) {
        return (
            <div className="recipe-complexity-analyzer">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Analyzing recipe complexity{includeBuildingCosts ? ' (including building costs)' : ''}...</p>
                </div>
            </div>
        );
    }

    if (!localRecipes || localRecipes.length === 0) {
        return (
            <div className="recipe-complexity-analyzer">
                <div className="no-data">
                    <h3>No Recipe Data Available</h3>
                    <p>Please upload recipe data using the Import Data feature to begin complexity analysis.</p>
                    <p>You only need to upload the finalComponentList.csv file - basic resources will be extracted automatically from production chains.</p>
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="recipe-complexity-analyzer">
                <div className="no-data">
                    <h3>Analysis in Progress</h3>
                    <p>Processing {localRecipes.length} recipes...</p>
                </div>
            </div>
        );
    }

    console.log("Analysis in render:", analysis);
    if (analysis) {
        console.log("Problematic recipes:", analysis.problematicRecipes);
    }

    return (
        <div className="recipe-complexity-analyzer">
            <div className="analyzer-header">
                <h2>Recipe Complexity Analyzer</h2>
                <p>Analyze and trim recipe complexity based on economist feedback</p>
                <p><small>Using {localRecipes.length} recipes with automatic basic resource extraction from production chains</small></p>
            </div>

            {/* NEW: Building Costs Toggle */}
            <div className="building-costs-toggle">
                <label className="toggle-container">
                    <input
                        type="checkbox"
                        checked={includeBuildingCosts}
                        onChange={(e) => setIncludeBuildingCosts(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                        Include Building Construction Costs
                        <small>
                            {includeBuildingCosts
                                ? "Buildings required for production are included in basic resource calculations"
                                : "Only direct production chain resources are counted"
                            }
                        </small>
                        {includeBuildingCosts && (
                            <small style={{ color: '#007bff', marginTop: '4px' }}>
                                Building detection looks for recipes with 0-2 production steps and searches for matching "[Resource Name] Extractor T1" patterns.
                                Check browser console for building detection debug information.
                            </small>
                        )}
                    </span>
                </label>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className={`summary-card ${analysis.summary.recipesNeedingTrimming > 0 ? 'critical' : 'success'}`}>
                    <h4>Total Recipes</h4>
                    <div className="value">{analysis.summary.totalRecipes}</div>
                    <div className="label">Analyzed</div>
                </div>
                <div className={`summary-card ${analysis.summary.recipesNeedingTrimming > 0 ? 'critical' : 'success'}`}>
                    <h4>Need Trimming</h4>
                    <div className="value">{analysis.summary.recipesNeedingTrimming}</div>
                    <div className="label">{((analysis.summary.recipesNeedingTrimming / analysis.summary.totalRecipes) * 100).toFixed(1)}%</div>
                </div>
                <div className={`summary-card ${analysis.summary.averageComplexity > 50 ? 'warning' : 'success'}`}>
                    <h4>Avg Complexity</h4>
                    <div className="value">{analysis.summary.averageComplexity.toFixed(1)}</div>
                    <div className="label">Score</div>
                </div>
            </div>



            {/* Analysis Sections */}
            <div className="analysis-section">
                <h3>🚀 Analysis by Ship Size</h3>
                <div className="ship-size-grid">
                    {Object.entries(analysis.byShipSize)
                        .sort((a, b) => a[1].needsTrimming - b[1].needsTrimming)
                        .map(([shipSize, data]) => {
                            const needsTrimmingPercent = ((data.needsTrimming / data.count) * 100).toFixed(1);
                            return (
                                <div key={shipSize} className="ship-size-card">
                                    <h4>{shipSize} Ships</h4>
                                    <div className="ship-size-stats">
                                        <div className="stat">
                                            <div className="value">{data.count}</div>
                                            <div className="label">Total</div>
                                        </div>
                                        <div className="stat">
                                            <div className="value">{data.needsTrimming}</div>
                                            <div className="label">Need Trimming</div>
                                        </div>
                                        <div className="stat">
                                            <div className="value">{data.avgBasicResources.toFixed(1)}</div>
                                            <div className="label">Avg Basic Resources</div>
                                        </div>
                                        <div className="stat">
                                            <div className="value">{data.avgIngredients.toFixed(1)}</div>
                                            <div className="label">Avg Ingredients</div>
                                        </div>
                                    </div>
                                    <div className="issues-list">
                                        <strong>Issues:</strong>
                                        <ul>
                                            <li>{needsTrimmingPercent}% need trimming</li>
                                            <li>{data.avgProductionSteps.toFixed(1)} avg production steps</li>
                                            <li>{data.avgComplexity.toFixed(1)} avg complexity score</li>
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Problematic Recipes */}
            <div className="analysis-section">
                <h3>
                    {showAllRecipes ? '📋 Recipe Search Results' : '⚠️ Problematic Recipes'}
                    {searchTerm && <span> - "{searchTerm}"</span>}
                    {recipeTypeFilter !== 'ALL' && <span> - {recipeTypeFilter.replace('_', ' ')}</span>}
                    <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: '10px' }}>
                        ({filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'})
                    </span>
                </h3>

                {/* Recipe Search, Filters and Sort Controls */}
                <div className="recipe-controls" style={{
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '20px',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap'
                }}>
                    {/* Search */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>🔍 Search Recipes:</label>
                        <input
                            type="text"
                            placeholder="Search by name (e.g., 'photon missile', 'heat sink')"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                minWidth: '280px',
                                background: 'white'
                            }}
                        />
                    </div>

                    {/* Recipe Type Filter */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>🎯 Recipe Type:</label>
                        <select value={recipeTypeFilter} onChange={(e) => setRecipeTypeFilter(e.target.value)} style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: 'white',
                            minWidth: '150px'
                        }}>
                            <option value="ALL">All Types</option>
                            <option value="MISSILES">Missiles</option>
                            <option value="WEAPONS">Weapons</option>
                            <option value="ENGINES">Engines</option>
                            <option value="SHIELDS">Shields</option>
                            <option value="ARMOR">Armor</option>
                            <option value="PROCESSORS">Processors</option>
                            <option value="EXTRACTORS">Extractors</option>
                            <option value="HEAT_SINKS">Heat Sinks</option>
                        </select>
                    </div>

                    {/* Ship Size Filter */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>🚀 Ship Size:</label>
                        <select value={selectedShipSize} onChange={(e) => setSelectedShipSize(e.target.value)} style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: 'white',
                            minWidth: '120px'
                        }}>
                            <option value="ALL">All Sizes</option>
                            <option value="XXXS">XXXS</option>
                            <option value="XXS">XXS</option>
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="CAP">CAP</option>
                            <option value="CMD">CMD</option>
                            <option value="CLASS8">CLASS8</option>
                            <option value="TTN">TTN</option>
                        </select>
                    </div>

                    {/* Tier Filter */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>⭐ Tier:</label>
                        <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: 'white',
                            minWidth: '100px'
                        }}>
                            <option value="ALL">All Tiers</option>
                            <option value="1">Tier 1</option>
                            <option value="2">Tier 2</option>
                            <option value="3">Tier 3</option>
                            <option value="4">Tier 4</option>
                            <option value="5">Tier 5</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>📊 Sort By:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: 'white',
                            minWidth: '220px'
                        }}>
                            <option value="basicResources">📊 Basic Resources (Most to Least)</option>
                            <option value="basicResourcesAsc">📈 Basic Resources (Least to Most)</option>
                            <option value="complexity">⚡ Complexity Score (High to Low)</option>
                            <option value="ingredients">🧪 Ingredients (Most to Least)</option>
                            <option value="productionSteps">🔧 Production Steps (Most to Least)</option>
                            <option value="alphabetical">🔤 Alphabetical (A to Z)</option>
                        </select>
                    </div>

                    {/* Show All Recipes Checkbox */}
                    <div className="filter-group">
                        <label style={{ color: '#1a252f', fontWeight: '600' }}>📋 Display:</label>
                        <label className="checkbox-label" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: '#1a252f',
                            fontWeight: '500',
                            marginTop: '4px'
                        }}>
                            <input
                                type="checkbox"
                                checked={showAllRecipes}
                                onChange={(e) => setShowAllRecipes(e.target.checked)}
                                style={{ margin: '0' }}
                            />
                            Show All Recipes (not just problematic)
                        </label>
                    </div>
                </div>
                {/* Ship Size Context */}
                {selectedShipSize !== 'ALL' && analysis.byShipSize[selectedShipSize] && (
                    <div className="ship-size-context" style={{
                        background: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #444'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>📊 {selectedShipSize} Ship Size Overview</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div>
                                <strong style={{ color: '#ffffff' }}>Average Basic Resources:</strong> <span style={{ color: '#ffffff' }}>{analysis.byShipSize[selectedShipSize].avgBasicResources.toFixed(1)}</span>
                                <div style={{ fontSize: '0.85em', color: '#d0d0d0' }}>Target: ≤ {complexityRules.maxBasicResources[selectedShipSize] || 'N/A'}</div>
                            </div>
                            <div>
                                <strong style={{ color: '#ffffff' }}>Average Ingredients:</strong> <span style={{ color: '#ffffff' }}>{analysis.byShipSize[selectedShipSize].avgIngredients.toFixed(1)}</span>
                                <div style={{ fontSize: '0.85em', color: '#d0d0d0' }}>Target: ≤ {complexityRules.maxIngredientsPerRecipe[selectedShipSize] || 'N/A'}</div>
                            </div>
                            <div>
                                <strong style={{ color: '#ffffff' }}>Average Production Steps:</strong> <span style={{ color: '#ffffff' }}>{analysis.byShipSize[selectedShipSize].avgProductionSteps.toFixed(1)}</span>
                                <div style={{ fontSize: '0.85em', color: '#d0d0d0' }}>Target: ≤ {complexityRules.maxProductionSteps[selectedShipSize] || 'N/A'}</div>
                            </div>
                            <div>
                                <strong style={{ color: '#ffffff' }}>Recipes Needing Trimming:</strong> <span style={{ color: '#ffffff' }}>{analysis.byShipSize[selectedShipSize].needsTrimming}/{analysis.byShipSize[selectedShipSize].count}</span>
                                <div style={{ fontSize: '0.85em', color: '#d0d0d0' }}>({((analysis.byShipSize[selectedShipSize].needsTrimming / analysis.byShipSize[selectedShipSize].count) * 100).toFixed(1)}%)</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="problematic-recipes">
                    {filteredRecipes.slice(0, 50).map((recipe, index) => (
                        <div key={index} className="recipe-item">
                            <h5>{recipe.recipeName} ({recipe.shipSize} T{recipe.tier})</h5>
                            <div className="recipe-stats">
                                <div className="recipe-stat">
                                    <div className="value">{recipe.complexityScore || 0}</div>
                                    <div className="label">Complexity</div>
                                </div>
                                <div className="recipe-stat">
                                    <div className="value">{recipe.basicResourceCount || 0}</div>
                                    <div className="label">Basic Resources</div>
                                </div>
                                {includeBuildingCosts && recipe.basicResourceCountWithoutBuildings !== undefined && (
                                    <div className="recipe-stat">
                                        <div className="value">{recipe.basicResourceCountWithoutBuildings}</div>
                                        <div className="label">Without Buildings</div>
                                    </div>
                                )}
                                <div className="recipe-stat">
                                    <div className="value">{recipe.ingredientCount || 0}</div>
                                    <div className="label">Ingredients</div>
                                </div>
                                <div className="recipe-stat">
                                    <div className="value">{recipe.productionSteps || 0}</div>
                                    <div className="label">Production Steps</div>
                                </div>
                            </div>

                            {recipe.needsTrimming && recipe.trimmingReasons && recipe.trimmingReasons.length > 0 && (
                                <div className="issues-list">
                                    <strong>Issues:</strong>
                                    <ul>
                                        {recipe.trimmingReasons.map((reason, idx) => (
                                            <li key={idx}>{reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {!recipe.needsTrimming && (
                                <div className="no-issues">
                                    <span style={{ color: '#22c55e' }}>✅ This recipe is within individual limits but may be part of overall ship size balancing</span>
                                </div>
                            )}

                            {recipe.uniqueBasicResources && recipe.uniqueBasicResources.length > 0 && (
                                <div className="suggestions">
                                    <strong>Basic Resources Used:</strong>
                                    <div className="basic-resources-list">
                                        {recipe.uniqueBasicResources.join(', ')}
                                    </div>
                                    {includeBuildingCosts && recipe.basicResourceCountWithoutBuildings !== undefined && (
                                        <div className="building-impact">
                                            <strong>Building Cost Impact:</strong> +{recipe.basicResourceCount - recipe.basicResourceCountWithoutBuildings} resources
                                            {recipe.basicResourceCount - recipe.basicResourceCountWithoutBuildings === 0 && (
                                                <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '4px' }}>
                                                    (No building costs detected - check console for building detection debug info)
                                                </div>
                                            )}
                                            {recipe.buildingOnlyResources && recipe.buildingOnlyResources.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong>Additional Resources from Buildings:</strong>
                                                    <div className="building-resources-list" style={{
                                                        background: '#e8f5e8',
                                                        padding: '8px',
                                                        borderRadius: '4px',
                                                        marginTop: '4px',
                                                        fontFamily: "'Courier New', monospace",
                                                        fontSize: '0.85em',
                                                        lineHeight: '1.4',
                                                        color: '#2e7d32'
                                                    }}>
                                                        {recipe.buildingOnlyResources.join(', ')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Buildings Used Section */}
                                    {includeBuildingCosts && recipe.buildingsUsed && recipe.buildingsUsed.length > 0 && (
                                        <div className="buildings-used-section" style={{ marginTop: '15px' }}>
                                            <strong>Buildings Analyzed in Production Chain:</strong>
                                            <div className="buildings-used-list" style={{
                                                background: '#fff3e0',
                                                border: '1px solid #ffcc02',
                                                borderRadius: '4px',
                                                padding: '10px',
                                                marginTop: '8px',
                                                fontSize: '0.85em'
                                            }}>
                                                {recipe.buildingsUsed.map((building, idx) => (
                                                    <div key={idx} style={{
                                                        padding: '4px 0',
                                                        borderBottom: idx < recipe.buildingsUsed.length - 1 ? '1px solid #ffe082' : 'none'
                                                    }}>
                                                        <strong style={{ color: '#f57c00' }}>{building.buildingName}</strong>
                                                        <div style={{ color: '#6c757d', fontSize: '0.9em', marginLeft: '8px' }}>
                                                            → Required for: {building.forResource} ({building.productionSteps} production steps)
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {recipe.maxAllowed && (
                                        <>
                                            <strong>Complexity Analysis:</strong>
                                            <div style={{
                                                background: recipe.needsTrimming ? '#f8d7da' : '#d4edda',
                                                border: `1px solid ${recipe.needsTrimming ? '#f5c6cb' : '#c3e6cb'}`,
                                                borderRadius: '6px',
                                                padding: '12px',
                                                marginTop: '8px'
                                            }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                                    <div>
                                                        <strong style={{ color: '#212529' }}>Basic Resources:</strong> <span style={{ color: '#212529' }}>{recipe.basicResourceCount}/{recipe.maxAllowed.basicResources}</span>
                                                        <div style={{ fontSize: '0.8em', color: recipe.basicResourceCount > recipe.maxAllowed.basicResources ? '#dc3545' : '#28a745', fontWeight: '500' }}>
                                                            {recipe.basicResourceCount > recipe.maxAllowed.basicResources ? '❌ Over limit' : '✅ Within limit'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#212529' }}>Ingredients:</strong> <span style={{ color: '#212529' }}>{recipe.ingredientCount}/{recipe.maxAllowed.ingredients}</span>
                                                        <div style={{ fontSize: '0.8em', color: recipe.ingredientCount > recipe.maxAllowed.ingredients ? '#dc3545' : '#28a745', fontWeight: '500' }}>
                                                            {recipe.ingredientCount > recipe.maxAllowed.ingredients ? '❌ Over limit' : '✅ Within limit'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#212529' }}>Production Steps:</strong> <span style={{ color: '#212529' }}>{recipe.productionSteps}/{recipe.maxAllowed.productionSteps}</span>
                                                        <div style={{ fontSize: '0.8em', color: recipe.productionSteps > recipe.maxAllowed.productionSteps ? '#dc3545' : '#28a745', fontWeight: '500' }}>
                                                            {recipe.productionSteps > recipe.maxAllowed.productionSteps ? '❌ Over limit' : '✅ Within limit'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {recipe.needsTrimming && (
                                                    <div>
                                                        <strong style={{ color: '#212529' }}>Required Actions:</strong>
                                                        <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#212529' }}>
                                                            {recipe.basicResourceCount > recipe.maxAllowed.basicResources && (
                                                                <li style={{ color: '#dc3545', fontWeight: '500' }}>Remove {recipe.basicResourceCount - recipe.maxAllowed.basicResources} basic resource(s)</li>
                                                            )}
                                                            {recipe.ingredientCount > recipe.maxAllowed.ingredients && (
                                                                <li style={{ color: '#dc3545', fontWeight: '500' }}>Remove {recipe.ingredientCount - recipe.maxAllowed.ingredients} ingredient(s)</li>
                                                            )}
                                                            {recipe.productionSteps > recipe.maxAllowed.productionSteps && (
                                                                <li style={{ color: '#dc3545', fontWeight: '500' }}>Reduce production steps by {recipe.productionSteps - recipe.maxAllowed.productionSteps}</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                                {!recipe.needsTrimming && (
                                                    <div style={{ color: '#28a745', fontSize: '0.9em', fontWeight: '500' }}>
                                                        ✅ This recipe meets individual complexity targets. It may still be part of overall ship size balancing efforts.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {!recipe.uniqueBasicResources && showAllRecipes && (
                                <div style={{ color: '#6c757d', fontStyle: 'italic', marginTop: '10px' }}>
                                    Click "Analyze Recipe" to see full complexity analysis for this recipe.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Export Section */}
            <div className="export-section">
                <h3>📊 Export Analysis</h3>
                <button className="export-btn" onClick={exportStreamlinedReport}>
                    🤖 Export AI Analysis Report {includeBuildingCosts ? '(With Buildings)' : '(No Buildings)'}
                </button>
                <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#6c757d' }}>
                    Generates a streamlined report for AI agent analysis with component groupings and tier progressions.
                    {includeBuildingCosts && <><br />Building costs are included in the analysis.</>}
                </p>
            </div>
        </div>
    );
};

export default RecipeComplexityAnalyzer; 