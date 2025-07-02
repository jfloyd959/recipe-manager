import React, { useState, useEffect } from 'react';
import { generateCompleteRecipeSystem, validateCompleteSystem } from '../../utils/completeRecipeSystem';
// import { DocumentationRecipeParser } from '../../utils/documentationRecipeParser';
import './CompleteRecipeSystem.css';

const CompleteRecipeSystem = () => {
    const [completeSystem, setCompleteSystem] = useState(null);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [documentationRecipes, setDocumentationRecipes] = useState(null);

    // Load CSV and generate complete system on mount
    useEffect(() => {
        loadCompleteSystem();
    }, []);

    const loadCompleteSystem = async () => {
        setLoading(true);
        try {
            // Load CSV from public folder
            const response = await fetch('/finalComponentList.csv');
            const csvData = await response.text();

            console.log('Generating documentation-based recipe system...');

            // Use new documentation parser
            // const docParser = new DocumentationRecipeParser();
            // const docBasedSystem = await docParser.generateAllRecipes(csvData);

            // console.log('Documentation recipes generated:', docBasedSystem);
            // setDocumentationRecipes(docBasedSystem);

            // Also generate the original system for comparison/fallback
            const system = await generateCompleteRecipeSystem(csvData);
            const systemValidation = validateCompleteSystem(system);

            setCompleteSystem(system);
            setValidation(systemValidation);

            console.log('Complete systems generated');
        } catch (error) {
            console.error('Error generating complete system:', error);
        } finally {
            setLoading(false);
        }
    };

    // Export documentation-based recipes to CSV in finalComponentList format
    const exportDocumentationRecipesToCSV = async () => {
        if (!documentationRecipes) return;

        try {
            // First, load the existing CSV data to preserve existing recipes
            const response = await fetch('/finalComponentList.csv');
            const existingCsvData = await response.text();
            const existingLines = existingCsvData.split('\n');
            const headers = existingLines[0];

            // Start with existing data (skip header, we'll add it back)
            const allRecipes = existingLines.slice(1).filter(line => line.trim());

            // Add documentation-based recipes
            for (const [name, recipe] of documentationRecipes.recipes) {
                allRecipes.push(formatDocumentationRecipeForFinalCSV(recipe));
            }

            // Create final CSV content with original headers
            const csvContent = [headers, ...allRecipes].join('\n');

            // Download the CSV
            downloadCSV(csvContent, 'documentation_based_recipes_final_format.csv');

            console.log(`Exported ${allRecipes.length} total recipes including ${documentationRecipes.recipes.size} from documentation`);
        } catch (error) {
            console.error('Error exporting documentation recipes:', error);
            // Fallback to documentation recipes only
            exportDocumentationRecipesOnly();
        }
    };

    // Fallback export for documentation recipes only
    const exportDocumentationRecipesOnly = () => {
        const docRecipes = [];

        // Add documentation-based recipes
        for (const [name, recipe] of documentationRecipes.recipes) {
            docRecipes.push(formatDocumentationRecipeForFinalCSV(recipe));
        }

        // Use the exact headers from finalComponentList.csv
        const headers = 'OutputID\tOutputName\tOutputType\tOutputTier\tConstructionTime\tPlanetTypes\tFactions\tResourceType\tFunctionalPurpose\tUsage Category\tProductionSteps\tIngredient1\tQuantity1\tIngredient2\tQuantity2\tIngredient3\tQuantity3\tIngredient4\tQuantity4\tIngredient5\tQuantity5\tIngredient6\tQuantity6\tIngredient7\tQuantity7\tIngredient8\tQuantity8\tIngredient9\tQuantity9';

        const csvContent = [headers, ...docRecipes].join('\n');
        downloadCSV(csvContent, 'documentation_recipes_only_final_format.csv');
    };

    // Format a documentation recipe for finalComponentList.csv format
    const formatDocumentationRecipeForFinalCSV = (recipe) => {
        // Generate a unique OutputID
        const outputID = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Extract basic recipe information
        const outputName = recipe.name || '';
        const outputType = recipe.type || 'COMPONENT';
        const outputTier = recipe.tier || 1;
        const constructionTime = recipe.constructionTime || 0;

        // Format planet types (semicolon separated)
        const planetTypes = recipe.planetTypes || '';

        // Format factions (semicolon separated)
        const factions = recipe.factions || '';

        const resourceType = recipe.resourceType || '';
        const functionalPurpose = recipe.functionalPurpose || '';
        const usageCategory = recipe.usageCategory || '';
        const productionSteps = recipe.totalProductionSteps || 0;

        // Prepare ingredient columns (up to 9 ingredients with quantities)
        const ingredientColumns = [];
        const maxIngredients = 9;

        // Fill ingredient data - all 9 ingredients have both name and quantity
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            for (let i = 0; i < maxIngredients; i++) {
                if (i < recipe.ingredients.length) {
                    const ingredient = recipe.ingredients[i];
                    const ingredientName = ingredient.name || '';
                    const quantity = ingredient.quantity || 1;

                    // All ingredients have both name and quantity columns
                    ingredientColumns.push(ingredientName, quantity);
                } else {
                    // Empty ingredient name and quantity
                    ingredientColumns.push('', '');
                }
            }
        } else {
            // No ingredients - fill with empty values (18 total: 9 names + 9 quantities)
            for (let i = 0; i < maxIngredients; i++) {
                ingredientColumns.push('', ''); // Empty name and quantity
            }
        }

        // Combine all fields using tab separation to match the original format
        const row = [
            outputID,
            escapeCSVField(outputName),
            outputType,
            outputTier,
            constructionTime,
            escapeCSVField(planetTypes),
            escapeCSVField(factions),
            escapeCSVField(resourceType),
            escapeCSVField(functionalPurpose),
            escapeCSVField(usageCategory),
            productionSteps,
            ...ingredientColumns.map(field => escapeCSVField(field))
        ];

        return row.join('\t'); // Use tab separation to match original format
    };

    // Export all recipes to CSV in finalComponentList format
    const exportToCSV = async () => {
        if (!completeSystem) return;

        try {
            // First, load the existing CSV data to preserve existing recipes
            const response = await fetch('/finalComponentList.csv');
            const existingCsvData = await response.text();
            const existingLines = existingCsvData.split('\n');
            const headers = existingLines[0];

            // Start with existing data (skip header, we'll add it back)
            const allRecipes = existingLines.slice(1).filter(line => line.trim());

            // Add component recipes
            for (const [name, recipe] of completeSystem.recipes) {
                allRecipes.push(formatRecipeForFinalCSV(recipe, 'COMPONENT'));
            }

            // Add missile recipes
            for (const [name, recipe] of completeSystem.missileRecipes) {
                allRecipes.push(formatRecipeForFinalCSV(recipe, 'MISSILE'));
            }

            // Add weapon recipes
            for (const [name, recipe] of completeSystem.weaponRecipes) {
                allRecipes.push(formatRecipeForFinalCSV(recipe, 'WEAPON'));
            }

            // Add countermeasure recipes
            for (const [name, recipe] of completeSystem.countermeasureRecipes) {
                allRecipes.push(formatRecipeForFinalCSV(recipe, 'COUNTERMEASURE'));
            }

            // Create final CSV content with original headers
            const csvContent = [headers, ...allRecipes].join('\n');

            // Download the CSV
            downloadCSV(csvContent, 'complete_recipe_system_final_format.csv');

            console.log(`Exported ${allRecipes.length} total recipes including existing ones`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            // Fallback to new recipes only if we can't load existing data
            exportNewRecipesOnly();
        }
    };

    // Fallback export for new recipes only
    const exportNewRecipesOnly = () => {
        const allRecipes = [];

        // Add component recipes
        for (const [name, recipe] of completeSystem.recipes) {
            allRecipes.push(formatRecipeForFinalCSV(recipe, 'COMPONENT'));
        }

        // Add missile recipes
        for (const [name, recipe] of completeSystem.missileRecipes) {
            allRecipes.push(formatRecipeForFinalCSV(recipe, 'MISSILE'));
        }

        // Add weapon recipes
        for (const [name, recipe] of completeSystem.weaponRecipes) {
            allRecipes.push(formatRecipeForFinalCSV(recipe, 'WEAPON'));
        }

        // Add countermeasure recipes
        for (const [name, recipe] of completeSystem.countermeasureRecipes) {
            allRecipes.push(formatRecipeForFinalCSV(recipe, 'COUNTERMEASURE'));
        }

        // Use the exact headers from finalComponentList.csv
        const headers = 'OutputID\tOutputName\tOutputType\tOutputTier\tConstructionTime\tPlanetTypes\tFactions\tResourceType\tFunctionalPurpose\tUsage Category\tProductionSteps\tIngredient1\tQuantity1\tIngredient2\tQuantity2\tIngredient3\tQuantity3\tIngredient4\tQuantity4\tIngredient5\tQuantity5\tIngredient6\tQuantity6\tIngredient7\tQuantity7\tIngredient8\tQuantity8\tIngredient9\tQuantity9';

        const csvContent = [headers, ...allRecipes].join('\n');
        downloadCSV(csvContent, 'new_recipes_final_format.csv');
    };

    // Format a recipe for finalComponentList.csv format
    const formatRecipeForFinalCSV = (recipe, outputType) => {
        // Generate a unique OutputID
        const outputID = `GEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Extract basic recipe information
        const outputName = recipe.name || '';
        const outputTier = recipe.tier || 1;
        const constructionTime = recipe.constructionTime || 0;

        // Format planet types (semicolon separated)
        const planetTypes = Array.isArray(recipe.planetTypes)
            ? recipe.planetTypes.join(';')
            : (recipe.planetTypes || '');

        // Format factions (semicolon separated)
        const factions = Array.isArray(recipe.factions)
            ? recipe.factions.join(';')
            : (recipe.factions || '');

        const resourceType = recipe.resourceType || '';
        const functionalPurpose = recipe.functionalPurpose || '';
        const usageCategory = recipe.usageCategory || '';
        const productionSteps = recipe.totalProductionSteps || 0;

        // Prepare ingredient columns (up to 9 ingredients with quantities)
        const ingredientColumns = [];
        const maxIngredients = 9;

        // Fill ingredient data - all 9 ingredients have both name and quantity
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            for (let i = 0; i < maxIngredients; i++) {
                if (i < recipe.ingredients.length) {
                    const ingredient = recipe.ingredients[i];
                    const ingredientName = ingredient.name || '';
                    const quantity = ingredient.requiredQuantity || ingredient.quantity || 1;

                    // All ingredients have both name and quantity columns
                    ingredientColumns.push(ingredientName, quantity);
                } else {
                    // Empty ingredient name and quantity
                    ingredientColumns.push('', '');
                }
            }
        } else {
            // No ingredients - fill with empty values (18 total: 9 names + 9 quantities)
            for (let i = 0; i < maxIngredients; i++) {
                ingredientColumns.push('', ''); // Empty name and quantity
            }
        }

        // Combine all fields using tab separation to match the original format
        const row = [
            outputID,
            escapeCSVField(outputName),
            outputType,
            outputTier,
            constructionTime,
            escapeCSVField(planetTypes),
            escapeCSVField(factions),
            escapeCSVField(resourceType),
            escapeCSVField(functionalPurpose),
            escapeCSVField(usageCategory),
            productionSteps,
            ...ingredientColumns.map(field => escapeCSVField(field))
        ];

        return row.join('\t'); // Use tab separation to match original format
    };

    // Export specific recipe category to CSV in final format
    const exportCategoryToCSV = async (category) => {
        if (!completeSystem) return;

        let recipes = [];
        let filename = '';
        let categoryType = '';

        switch (category) {
            case 'components':
                recipes = Array.from(completeSystem.recipes.values());
                filename = 'component_recipes_final_format.csv';
                categoryType = 'COMPONENT';
                break;
            case 'missiles':
                recipes = Array.from(completeSystem.missileRecipes.values());
                filename = 'missile_recipes_final_format.csv';
                categoryType = 'MISSILE';
                break;
            case 'weapons':
                recipes = Array.from(completeSystem.weaponRecipes.values());
                filename = 'weapon_recipes_final_format.csv';
                categoryType = 'WEAPON';
                break;
            case 'countermeasures':
                recipes = Array.from(completeSystem.countermeasureRecipes.values());
                filename = 'countermeasure_recipes_final_format.csv';
                categoryType = 'COUNTERMEASURE';
                break;
            default:
                return;
        }

        // Use the exact headers from finalComponentList.csv
        const headers = 'OutputID\tOutputName\tOutputType\tOutputTier\tConstructionTime\tPlanetTypes\tFactions\tResourceType\tFunctionalPurpose\tUsage Category\tProductionSteps\tIngredient1\tQuantity1\tIngredient2\tQuantity2\tIngredient3\tQuantity3\tIngredient4\tQuantity4\tIngredient5\tQuantity5\tIngredient6\tQuantity6\tIngredient7\tQuantity7\tIngredient8\tQuantity8\tIngredient9\tQuantity9';

        const csvRows = recipes.map(recipe => formatRecipeForFinalCSV(recipe, categoryType));
        const csvContent = [headers, ...csvRows].join('\n');

        downloadCSV(csvContent, filename);
    };

    // Escape CSV fields that contain commas, quotes, or newlines
    const escapeCSVField = (field) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\t')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // Download CSV file
    const downloadCSV = (csvContent, filename) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Render documentation recipes tab
    const renderDocumentationRecipes = () => {
        const recipes = Array.from(documentationRecipes.recipes.entries()).filter(([name, recipe]) => {
            if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            if (filterType !== 'all' && recipe.type !== filterType) {
                return false;
            }
            return true;
        });

        return (
            <div className="recipe-list-section">
                <div className="list-header">
                    <h3>📚 Documentation-Based Recipes ({recipes.length})</h3>
                    <p className="documentation-info">
                        Complete recipes with actual ingredient chains parsed from your documentation files.
                        Each recipe traces back to raw materials as specified in your MD files.
                    </p>
                    <div className="list-controls">
                        <input
                            type="text"
                            placeholder="Search documentation recipes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="MISSILE">Missiles</option>
                            <option value="WEAPON">Weapons</option>
                            <option value="COUNTERMEASURE">Countermeasures</option>
                            <option value="COMPONENT">Components</option>
                        </select>
                    </div>
                </div>

                <div className="recipe-grid">
                    {recipes.slice(0, 100).map(([name, recipe]) => (
                        <div
                            key={name}
                            className="recipe-card documentation-recipe"
                            onClick={() => setSelectedRecipe(recipe)}
                        >
                            <div className="recipe-header">
                                <h4>{name}</h4>
                                <span className={`recipe-type ${recipe.type.toLowerCase()}`}>
                                    {recipe.type}
                                </span>
                            </div>
                            <div className="recipe-details">
                                <p><strong>Tier:</strong> {recipe.tier}</p>
                                <p><strong>Ingredients:</strong> {recipe.ingredients.length}</p>
                                <p><strong>Production Steps:</strong> {recipe.totalProductionSteps}</p>
                                <p><strong>Construction Time:</strong> {recipe.constructionTime}s</p>
                                <p><strong>Category:</strong> {recipe.usageCategory}</p>
                            </div>
                            <div className="ingredient-preview">
                                <strong>Ingredients:</strong>
                                <ul>
                                    {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                                        <li key={idx}>
                                            {ingredient.name}
                                            {ingredient.isRaw ? ' [RAW]' : ` [T${ingredient.tier}]`}
                                            {ingredient.quantity && ` ×${ingredient.quantity}`}
                                        </li>
                                    ))}
                                    {recipe.ingredients.length > 3 && (
                                        <li>... and {recipe.ingredients.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>

                {recipes.length > 100 && (
                    <div className="pagination-info">
                        Showing first 100 of {recipes.length} documentation recipes
                    </div>
                )}
            </div>
        );
    };

    const renderOverview = () => {
        if (!completeSystem) return null;

        const { analysis } = completeSystem;

        return (
            <div className="overview-section">
                <div className="system-header">
                    <h2>Complete Recipe System - 100% Component Utilization</h2>
                    <p>Every single recipe generated with full traceability to raw resources</p>
                </div>

                {/* Export Section */}
                <div className="export-section">
                    <h3>Export Recipes</h3>

                    {/* Documentation-Based Exports */}
                    {documentationRecipes && (
                        <div className="export-group">
                            <h4>📚 Documentation-Based Recipes (With Full Ingredient Chains)</h4>
                            <div className="export-buttons">
                                <button
                                    className="export-button primary"
                                    onClick={exportDocumentationRecipesToCSV}
                                >
                                    📊 Export Documentation Recipes (Complete)
                                </button>
                                <button
                                    className="export-button"
                                    onClick={exportDocumentationRecipesOnly}
                                >
                                    📋 Export Documentation Recipes Only
                                </button>
                            </div>
                            <p className="export-info">
                                <strong>NEW:</strong> Complete recipes with actual ingredient chains from your documentation files!
                                Each recipe includes full production chains tracing back to raw materials.
                            </p>
                        </div>
                    )}

                    {/* Original System Exports */}
                    <div className="export-group">
                        <h4>🔧 Original System Recipes (Component Variants)</h4>
                        <div className="export-buttons">
                            <button
                                className="export-button"
                                onClick={exportToCSV}
                            >
                                📊 Export All Original Recipes
                            </button>
                            <button
                                className="export-button"
                                onClick={() => exportCategoryToCSV('components')}
                            >
                                🔧 Export Components Only
                            </button>
                            <button
                                className="export-button"
                                onClick={() => exportCategoryToCSV('missiles')}
                            >
                                🚀 Export Missiles Only
                            </button>
                            <button
                                className="export-button"
                                onClick={() => exportCategoryToCSV('weapons')}
                            >
                                ⚔️ Export Weapons Only
                            </button>
                            <button
                                className="export-button"
                                onClick={() => exportCategoryToCSV('countermeasures')}
                            >
                                🛡️ Export Countermeasures Only
                            </button>
                        </div>
                        <p className="export-info">
                            Original system with component variants and size/tier scaling.
                        </p>
                    </div>
                </div>

                <div className="stats-grid">
                    {/* Documentation-Based Recipe Stats */}
                    {documentationRecipes && (
                        <>
                            <div className="stat-card highlight">
                                <h3>📚 Documentation Recipes</h3>
                                <div className="stat-value">{documentationRecipes.recipes.size}</div>
                                <p>Complete recipes with ingredient chains</p>
                            </div>

                            <div className="stat-card success">
                                <h3>🧪 Raw Resources Used</h3>
                                <div className="stat-value">{documentationRecipes.rawResources.size}</div>
                                <p>Base materials from documentation</p>
                            </div>

                            <div className="stat-card info">
                                <h3>⚡ Avg Ingredients/Recipe</h3>
                                <div className="stat-value">{documentationRecipes.analysis.averageIngredients.toFixed(1)}</div>
                                <p>Average complexity per recipe</p>
                            </div>
                        </>
                    )}

                    {/* Original System Stats */}
                    <div className="stat-card major">
                        <h3>Total Components (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalComponents}</div>
                        <p>All components from CSV</p>
                    </div>

                    <div className="stat-card major">
                        <h3>Raw Resources (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalRawResources}</div>
                        <p>Base extraction materials</p>
                    </div>

                    <div className="stat-card success">
                        <h3>Component Recipes (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalRecipes}</div>
                        <p>Individual component chains</p>
                    </div>

                    <div className="stat-card info">
                        <h3>Missile Variants (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalMissileRecipes}</div>
                        <p>9 types × 10 sizes × 5 tiers</p>
                    </div>

                    <div className="stat-card info">
                        <h3>Weapon Variants (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalWeaponRecipes}</div>
                        <p>4 types × 10 sizes × 5 tiers</p>
                    </div>

                    <div className="stat-card info">
                        <h3>Countermeasure Variants (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalCountermeasureRecipes}</div>
                        <p>9 types × 10 sizes × 5 tiers</p>
                    </div>

                    <div className="stat-card highlight">
                        <h3>Total Generated Products (Original)</h3>
                        <div className="stat-value">{analysis.overview.totalGeneratedProducts}</div>
                        <p>Complete product catalog</p>
                    </div>

                    <div className="stat-card utilization">
                        <h3>Component Utilization (Original)</h3>
                        <div className="stat-value">{analysis.utilization.utilizationPercentage}%</div>
                        <div className="utilization-bar">
                            <div
                                className="utilization-fill"
                                style={{ width: `${analysis.utilization.utilizationPercentage}%` }}
                            ></div>
                        </div>
                        <p>{analysis.utilization.usedComponents} / {analysis.overview.totalComponents} components used</p>
                    </div>
                </div>

                {/* Documentation Analysis Section */}
                {documentationRecipes && (
                    <div className="documentation-analysis-section">
                        <h3>Documentation-Based Recipe Analysis</h3>
                        <div className="analysis-grid">
                            <div className="analysis-card">
                                <h4>Recipe Type Distribution</h4>
                                <div className="type-stats">
                                    {Object.entries(documentationRecipes.analysis.typeDistribution).map(([type, count]) => (
                                        <div key={type} className="type-item">
                                            <span className="type-name">{type}</span>
                                            <span className="type-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analysis-card">
                                <h4>Tier Distribution</h4>
                                <div className="tier-stats">
                                    {Object.entries(documentationRecipes.analysis.tierDistribution).map(([tier, count]) => (
                                        <div key={tier} className="tier-item">
                                            <span className="tier-name">Tier {tier}</span>
                                            <span className="tier-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analysis-card">
                                <h4>Recipe Complexity Analysis</h4>
                                <div className="complexity-stats">
                                    <p><strong>Min Complexity:</strong> {documentationRecipes.analysis.complexityAnalysis.min}</p>
                                    <p><strong>Max Complexity:</strong> {documentationRecipes.analysis.complexityAnalysis.max}</p>
                                    <p><strong>Average Complexity:</strong> {documentationRecipes.analysis.complexityAnalysis.average.toFixed(1)}</p>
                                    <p><strong>Median Complexity:</strong> {documentationRecipes.analysis.complexityAnalysis.median}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="validation-section">
                    <h3>System Validation</h3>
                    <div className="validation-grid">
                        <div className={`validation-card ${validation?.isComplete ? 'success' : 'warning'}`}>
                            <div className="validation-status">
                                {validation?.isComplete ? '✓ Complete' : '⚠ Issues Found'}
                            </div>
                            <div className="validation-details">
                                {validation?.issues?.length > 0 ? (
                                    <ul>
                                        {validation.issues.map((issue, idx) => (
                                            <li key={idx}>{issue}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>All components properly traced to raw resources</p>
                                )}
                            </div>
                        </div>

                        <div className="category-breakdown">
                            <h4>Component Categories</h4>
                            <div className="category-grid">
                                {Object.entries(analysis.categories).map(([category, count]) => (
                                    <div key={category} className="category-item">
                                        <span className="category-name">{category.replace(/_/g, ' ')}</span>
                                        <span className="category-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="analysis-section">
                    <div className="analysis-grid">
                        <div className="analysis-card">
                            <h4>Raw Resource Analysis</h4>
                            <div className="resource-stats">
                                <p><strong>Most Used Resources:</strong></p>
                                <ul>
                                    {analysis.rawResourceAnalysis.mostUsed.slice(0, 5).map(([name, usage]) => (
                                        <li key={name}>{name}: {usage} uses</li>
                                    ))}
                                </ul>
                                <p><strong>Unused Resources:</strong> {analysis.rawResourceAnalysis.unused.length}</p>
                            </div>
                        </div>

                        <div className="analysis-card">
                            <h4>Complexity Analysis</h4>
                            <div className="complexity-stats">
                                <p><strong>Average Complexity:</strong> {Math.round(analysis.complexityAnalysis.averageComplexity)}</p>
                                <div className="complexity-distribution">
                                    <div>Low: {analysis.complexityAnalysis.complexityDistribution.low}</div>
                                    <div>Medium: {analysis.complexityAnalysis.complexityDistribution.medium}</div>
                                    <div>High: {analysis.complexityAnalysis.complexityDistribution.high}</div>
                                    <div>Extreme: {analysis.complexityAnalysis.complexityDistribution.extreme}</div>
                                </div>
                            </div>
                        </div>

                        <div className="analysis-card">
                            <h4>Production Chain Depth</h4>
                            <div className="depth-stats">
                                <p><strong>Average Depth:</strong> {Math.round(analysis.productionChainDepth.averageDepth)}</p>
                                <p><strong>Maximum Depth:</strong> {analysis.productionChainDepth.maxDepth}</p>
                                <p><strong>Deepest Chains:</strong></p>
                                <ul>
                                    {analysis.productionChainDepth.deepest.slice(0, 3).map((item) => (
                                        <li key={item.name}>{item.name}: {item.depth} levels</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRecipeList = (recipes, title) => {
        const filteredRecipes = Array.from(recipes.entries()).filter(([name, recipe]) => {
            if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            if (filterType !== 'all' && recipe.type !== filterType) {
                return false;
            }
            return true;
        });

        return (
            <div className="recipe-list-section">
                <div className="list-header">
                    <h3>{title} ({filteredRecipes.length})</h3>
                    <div className="list-controls">
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="MISSILE">Missiles</option>
                            <option value="WEAPON">Weapons</option>
                            <option value="COUNTERMEASURE">Countermeasures</option>
                            <option value="MANUFACTURED">Components</option>
                        </select>
                    </div>
                </div>

                <div className="recipe-grid">
                    {filteredRecipes.slice(0, 100).map(([name, recipe]) => (
                        <div
                            key={name}
                            className="recipe-card"
                            onClick={() => setSelectedRecipe(recipe)}
                        >
                            <div className="recipe-header">
                                <h4>{name}</h4>
                                <span className={`recipe-type ${recipe.type.toLowerCase()}`}>
                                    {recipe.type}
                                </span>
                            </div>
                            <div className="recipe-details">
                                <p><strong>Tier:</strong> {recipe.tier}</p>
                                <p><strong>Complexity:</strong> {recipe.complexity}</p>
                                <p><strong>Production Steps:</strong> {recipe.totalProductionSteps}</p>
                                <p><strong>Raw Resources:</strong> {recipe.rawResourcesRequired?.size || 0}</p>
                                {recipe.constructionTime && (
                                    <p><strong>Construction Time:</strong> {recipe.constructionTime}s</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredRecipes.length > 100 && (
                    <div className="pagination-info">
                        Showing first 100 of {filteredRecipes.length} recipes
                    </div>
                )}
            </div>
        );
    };

    const renderRecipeDetails = () => {
        if (!selectedRecipe) return null;

        return (
            <div className="recipe-details-modal" onClick={() => setSelectedRecipe(null)}>
                <div className="recipe-details-content" onClick={(e) => e.stopPropagation()}>
                    <div className="recipe-details-header">
                        <h3>{selectedRecipe.name}</h3>
                        <button
                            className="close-button"
                            onClick={() => setSelectedRecipe(null)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="recipe-details-body">
                        <div className="recipe-meta">
                            <div className="meta-item">
                                <strong>Type:</strong> {selectedRecipe.type}
                            </div>
                            <div className="meta-item">
                                <strong>Tier:</strong> {selectedRecipe.tier}
                            </div>
                            <div className="meta-item">
                                <strong>Complexity:</strong> {selectedRecipe.complexity}
                            </div>
                            <div className="meta-item">
                                <strong>Production Steps:</strong> {selectedRecipe.totalProductionSteps}
                            </div>
                            {selectedRecipe.constructionTime && (
                                <div className="meta-item">
                                    <strong>Construction Time:</strong> {selectedRecipe.constructionTime}s
                                </div>
                            )}
                        </div>

                        {selectedRecipe.rawResourcesRequired && selectedRecipe.rawResourcesRequired.size > 0 && (
                            <div className="raw-resources-section">
                                <h4>Raw Resources Required</h4>
                                <div className="raw-resources-list">
                                    {Array.from(selectedRecipe.rawResourcesRequired.entries()).map(([resource, quantity]) => (
                                        <div key={resource} className="resource-item">
                                            <span className="resource-name">{resource}</span>
                                            <span className="resource-quantity">{quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                            <div className="ingredients-section">
                                <h4>Ingredients</h4>
                                <div className="ingredients-list">
                                    {selectedRecipe.ingredients.map((ingredient, idx) => (
                                        <div key={idx} className="ingredient-item">
                                            <div className="ingredient-header">
                                                <span className="ingredient-name">{ingredient.name}</span>
                                                <span className="ingredient-quantity">×{ingredient.requiredQuantity}</span>
                                            </div>
                                            <div className="ingredient-details">
                                                <span>Type: {ingredient.type}</span>
                                                <span>Tier: {ingredient.tier}</span>
                                                <span>Steps: {ingredient.totalProductionSteps}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="complete-system-loading">
                <div className="loading-spinner"></div>
                <h2>Generating Complete Recipe Systems</h2>
                <p>Processing all 3713 components and parsing detailed documentation files...</p>
                <p>Creating complete ingredient chains from your MD documentation files.</p>
                <p>This includes missiles, weapons, countermeasures, and complete production chains.</p>
            </div>
        );
    }

    if (!completeSystem && !documentationRecipes) {
        return (
            <div className="complete-system-error">
                <h2>Failed to Load Recipe Systems</h2>
                <p>Unable to generate the recipe systems. Please check the console for errors.</p>
                <button onClick={loadCompleteSystem} className="retry-button">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="complete-recipe-system">
            <div className="system-tabs">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    System Overview
                </button>
                {documentationRecipes && (
                    <button
                        className={`tab-button ${activeTab === 'documentation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('documentation')}
                    >
                        📚 Documentation Recipes ({documentationRecipes.recipes.size})
                    </button>
                )}
                {completeSystem && (
                    <>
                        <button
                            className={`tab-button ${activeTab === 'components' ? 'active' : ''}`}
                            onClick={() => setActiveTab('components')}
                        >
                            Component Recipes ({completeSystem.recipes.size})
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'missiles' ? 'active' : ''}`}
                            onClick={() => setActiveTab('missiles')}
                        >
                            Missile Variants ({completeSystem.missileRecipes.size})
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'weapons' ? 'active' : ''}`}
                            onClick={() => setActiveTab('weapons')}
                        >
                            Weapon Variants ({completeSystem.weaponRecipes.size})
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'countermeasures' ? 'active' : ''}`}
                            onClick={() => setActiveTab('countermeasures')}
                        >
                            Countermeasure Variants ({completeSystem.countermeasureRecipes.size})
                        </button>
                    </>
                )}
            </div>

            <div className="system-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'documentation' && documentationRecipes && renderDocumentationRecipes()}
                {activeTab === 'components' && completeSystem && renderRecipeList(completeSystem.recipes, 'Component Recipes')}
                {activeTab === 'missiles' && completeSystem && renderRecipeList(completeSystem.missileRecipes, 'Missile Variants')}
                {activeTab === 'weapons' && completeSystem && renderRecipeList(completeSystem.weaponRecipes, 'Weapon Variants')}
                {activeTab === 'countermeasures' && completeSystem && renderRecipeList(completeSystem.countermeasureRecipes, 'Countermeasure Variants')}
            </div>

            {selectedRecipe && renderRecipeDetails()}
        </div>
    );
};

export default CompleteRecipeSystem; 