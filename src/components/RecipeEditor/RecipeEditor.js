import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import IngredientSelector from './IngredientSelector';
import SmartSuggestions from './SmartSuggestions';
import RecipePreview from './RecipePreview';
import { calculateProductionSteps } from '../../utils/calculations';
import './RecipeEditor.css';

const RecipeEditor = () => {
    const { state, addRecipe, updateRecipe, selectRecipe, addComponent } = useRecipes();
    const { selectedRecipe, components, rawResources, recipes } = state;

    const [recipe, setRecipe] = useState({
        outputName: '',
        outputType: 'SHIP_COMPONENTS',
        outputTier: 1,
        constructionTime: 60,
        planetTypes: '',
        factions: 'MUD;ONI;USTUR',
        resourceType: 'COMPONENT',
        functionalPurpose: 'STRUCTURAL',
        usageCategory: 'Ship Components',
        ingredients: [],
        isFinalized: false,
        completionStatus: 'missing'
    });

    const [errors, setErrors] = useState({});
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [recipeFilter, setRecipeFilter] = useState('missing');
    const [searchTerm, setSearchTerm] = useState('');

    // Get filtered recipes for selection
    const filteredRecipes = recipes.filter(r => {
        const matchesFilter = recipeFilter === 'all' ||
            recipeFilter === r.completionStatus ||
            (recipeFilter === 'missing-ingredients' && r.completionStatus === 'missing' && r.outputType === 'INGREDIENT') ||
            (recipeFilter === 'missing-components' && r.completionStatus === 'missing' && r.outputType === 'COMPONENT') ||
            (recipeFilter === 'missing-finals' && r.completionStatus === 'missing' && (r.outputType === 'SHIP_COMPONENTS' || r.outputType === 'SHIP_MODULES' || r.outputType === 'SHIP_WEAPONS' || r.outputType === 'COUNTERMEASURES' || r.outputType === 'MISSILES' || r.outputType === 'HAB_ASSETS' || r.outputType === 'BOMBS'));
        const matchesSearch = !searchTerm || r.outputName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const incompleteRecipes = recipes.filter(r => r.completionStatus !== 'complete');
    const currentRecipeIndex = incompleteRecipes.findIndex(r => r.id === recipe.id);

    useEffect(() => {
        if (selectedRecipe) {
            setRecipe({
                ...selectedRecipe,
                completionStatus: selectedRecipe.completionStatus || 'missing'
            });
        }
    }, [selectedRecipe]);

    const handleInputChange = (field, value) => {
        setRecipe(prev => ({
            ...prev,
            [field]: value,
            productionSteps: field === 'ingredients' ? calculateProductionSteps(value) : prev.productionSteps,
            completionStatus: field === 'ingredients' && value.length > 0 ? 'partial' : prev.completionStatus
        }));

        // Clear errors when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleAddIngredient = (ingredient) => {
        const existingIndex = recipe.ingredients.findIndex(ing => ing.name === ingredient.name);

        if (existingIndex >= 0) {
            // Update existing ingredient quantity
            const updated = [...recipe.ingredients];
            updated[existingIndex].quantity += ingredient.quantity;
            handleInputChange('ingredients', updated);
        } else {
            // Add new ingredient
            handleInputChange('ingredients', [...recipe.ingredients, ingredient]);
        }
    };

    const handleUpdateIngredients = (updatedIngredients) => {
        handleInputChange('ingredients', updatedIngredients);
    };

    const handleRemoveIngredient = (index) => {
        setRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const handleAddNewComponent = (newComponent) => {
        // Add the new component to the context
        addComponent({
            id: generateId(),
            name: newComponent.name,
            outputName: newComponent.name,
            outputType: newComponent.type,
            outputTier: newComponent.tier,
            planetSources: newComponent.planetSources,
            isRawResource: newComponent.isRawResource,
            isCustom: true,
            ingredients: [], // New components start with no ingredients
            constructionTime: 60 * newComponent.tier, // Default based on tier
            completionStatus: 'missing'
        });
    };

    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const validateRecipe = () => {
        const newErrors = {};

        if (!recipe.outputName.trim()) {
            newErrors.outputName = 'Output name is required';
        }

        if (recipe.ingredients.length === 0) {
            newErrors.ingredients = 'At least one ingredient is required';
        }

        if (recipe.constructionTime < 1) {
            newErrors.constructionTime = 'Construction time must be positive';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateRecipe()) return;

        const recipeToSave = {
            ...recipe,
            completionStatus: recipe.ingredients.length > 0 ? 'complete' : 'missing',
            id: recipe.id || Date.now()
        };

        if (selectedRecipe) {
            updateRecipe(recipeToSave);
        } else {
            addRecipe(recipeToSave);
        }

        alert('Recipe saved successfully!');
    };

    const handleMarkComplete = () => {
        if (!validateRecipe()) return;

        const completedRecipe = {
            ...recipe,
            completionStatus: 'complete',
            isFinalized: true
        };

        updateRecipe(completedRecipe);

        // Move to next incomplete recipe
        const nextIncomplete = incompleteRecipes.find(r => r.id !== recipe.id);
        if (nextIncomplete) {
            selectRecipe(nextIncomplete);
        }
    };

    const handleSelectRecipe = (selectedRecipeItem) => {
        selectRecipe(selectedRecipeItem);
    };

    const handleNextRecipe = () => {
        if (currentRecipeIndex < incompleteRecipes.length - 1) {
            selectRecipe(incompleteRecipes[currentRecipeIndex + 1]);
        }
    };

    const handlePreviousRecipe = () => {
        if (currentRecipeIndex > 0) {
            selectRecipe(incompleteRecipes[currentRecipeIndex - 1]);
        }
    };

    const getAvailableComponents = () => {
        // Return array of objects with name and tier information
        const componentObjects = components.map(c => ({
            name: c.name || c.outputName || c,
            tier: c.tier || c.outputTier || 1,
            type: c.type || c.outputType || 'COMPONENT',
            id: c.id
        }));

        const rawResourceObjects = rawResources.map(r => ({
            name: r.name || r.outputName || r,
            tier: 0,
            type: 'RAW',
            id: r.id
        }));

        const allComponents = [...componentObjects, ...rawResourceObjects];

        // Debug logging
        console.log('Components count:', components.length);
        console.log('Raw resources count:', rawResources.length);
        console.log('Available components sample:', allComponents.slice(0, 10));

        // Check if Electronics exists
        const electronicsComponent = allComponents.find(c =>
            c.name && c.name.toLowerCase() === 'electronics'
        );
        console.log('Electronics component found:', electronicsComponent);

        return allComponents;
    };

    const completionStats = {
        total: recipes.length,
        complete: recipes.filter(r => r.completionStatus === 'complete').length,
        partial: recipes.filter(r => r.completionStatus === 'partial').length,
        missing: recipes.filter(r => r.completionStatus === 'missing').length,
        missingIngredients: recipes.filter(r => r.completionStatus === 'missing' && r.outputType === 'INGREDIENT').length,
        missingComponents: recipes.filter(r => r.completionStatus === 'missing' && r.outputType === 'COMPONENT').length,
        missingFinals: recipes.filter(r => r.completionStatus === 'missing' && (r.outputType === 'SHIP_COMPONENTS' || r.outputType === 'SHIP_MODULES' || r.outputType === 'SHIP_WEAPONS' || r.outputType === 'COUNTERMEASURES' || r.outputType === 'MISSILES' || r.outputType === 'HAB_ASSETS' || r.outputType === 'BOMBS')).length
    };

    return (
        <div className="recipe-editor">
            <div className="editor-header">
                <div className="editor-title">
                    <h2>🧪 Recipe Editor</h2>
                    <div className="completion-stats">
                        <span className="stat complete">✅ {completionStats.complete}</span>
                        <span className="stat partial">⚠️ {completionStats.partial}</span>
                        <span className="stat missing">❌ {completionStats.missing}</span>
                        <span className="stat total">📊 {completionStats.total} Total</span>
                    </div>
                </div>

                <div className="editor-controls">
                    {currentRecipeIndex >= 0 && (
                        <div className="recipe-navigation">
                            <span className="nav-info">
                                Recipe {currentRecipeIndex + 1} of {incompleteRecipes.length} incomplete
                            </span>
                            <button
                                onClick={handlePreviousRecipe}
                                disabled={currentRecipeIndex <= 0}
                                className="nav-btn"
                            >
                                ⬅️ Previous
                            </button>
                            <button
                                onClick={handleNextRecipe}
                                disabled={currentRecipeIndex >= incompleteRecipes.length - 1}
                                className="nav-btn"
                            >
                                Next ➡️
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="editor-content">
                <div className="editor-main">
                    {/* Recipe Selection Panel */}
                    <div className="card recipe-selector">
                        <h3>📋 Select Recipe to Edit</h3>

                        <div className="recipe-filters">
                            <input
                                type="text"
                                placeholder="Search recipes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />

                            <select
                                value={recipeFilter}
                                onChange={(e) => setRecipeFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Recipes</option>
                                <option value="missing">❌ All Missing ({completionStats.missing})</option>
                                <option value="missing-ingredients">🧪 Missing Ingredients ({completionStats.missingIngredients})</option>
                                <option value="missing-components">🔧 Missing Components ({completionStats.missingComponents})</option>
                                <option value="missing-finals">🚀 Missing Finals ({completionStats.missingFinals})</option>
                                <option value="partial">⚠️ Partial ({completionStats.partial})</option>
                                <option value="complete">✅ Complete ({completionStats.complete})</option>
                            </select>
                        </div>

                        <div className="recipe-list">
                            {filteredRecipes.slice(0, 10).map((recipeItem) => (
                                <div
                                    key={recipeItem.id}
                                    className={`recipe-item ${selectedRecipe?.id === recipeItem.id ? 'selected' : ''}`}
                                    onClick={() => handleSelectRecipe(recipeItem)}
                                >
                                    <div className="recipe-status">
                                        {recipeItem.completionStatus === 'complete' && '✅'}
                                        {recipeItem.completionStatus === 'partial' && '⚠️'}
                                        {recipeItem.completionStatus === 'missing' && '❌'}
                                    </div>
                                    <div className="recipe-info">
                                        <div className="recipe-name">{recipeItem.outputName}</div>
                                        <div className="recipe-meta">
                                            <span className={`tier-badge tier-${recipeItem.outputTier}`}>
                                                T{recipeItem.outputTier}
                                            </span>
                                            <span className="recipe-type">{recipeItem.outputType}</span>
                                            <span className="ingredient-count">
                                                {recipeItem.ingredients?.length || 0} ingredients
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredRecipes.length > 10 && (
                                <div className="recipe-pagination">
                                    Showing 10 of {filteredRecipes.length} recipes
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recipe Details Form */}
                    {selectedRecipe && (
                        <div className="card recipe-form">
                            <div className="form-header">
                                <h3>🛠️ Recipe Details</h3>
                                <div className="form-actions">
                                    <button onClick={handleSave} className="save-btn">
                                        💾 Save
                                    </button>
                                    <button onClick={handleMarkComplete} className="complete-btn">
                                        ✅ Mark Complete & Next
                                    </button>
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Recipe Name</label>
                                    <input
                                        type="text"
                                        value={recipe.outputName}
                                        onChange={(e) => handleInputChange('outputName', e.target.value)}
                                        className={errors.outputName ? 'error' : ''}
                                        readOnly
                                    />
                                    {errors.outputName && <span className="error-text">{errors.outputName}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Tier</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={recipe.outputTier}
                                        onChange={(e) => handleInputChange('outputTier', parseInt(e.target.value))}
                                        readOnly
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Construction Time (seconds)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={recipe.constructionTime}
                                        onChange={(e) => handleInputChange('constructionTime', parseInt(e.target.value))}
                                        className={errors.constructionTime ? 'error' : ''}
                                    />
                                    {errors.constructionTime && <span className="error-text">{errors.constructionTime}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Type</label>
                                    <input
                                        type="text"
                                        value={recipe.outputType}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ingredients Section */}
                    {selectedRecipe && (
                        <div className="card">
                            <h3>🧩 Recipe Ingredients</h3>
                            <IngredientSelector
                                ingredients={recipe.ingredients}
                                onAddIngredient={handleAddIngredient}
                                onUpdateIngredients={handleUpdateIngredients}
                                onRemoveIngredient={handleRemoveIngredient}
                                onAddNewComponent={handleAddNewComponent}
                                availableComponents={getAvailableComponents()}
                            />
                            {errors.ingredients && <span className="error-text">{errors.ingredients}</span>}
                        </div>
                    )}
                </div>

                <div className="editor-sidebar">
                    {selectedRecipe && showSuggestions && (
                        <SmartSuggestions
                            recipe={recipe}
                            components={components}
                            onApplySuggestion={(suggestion) => {
                                setRecipe(prev => ({ ...prev, ...suggestion }));
                            }}
                        />
                    )}

                    {selectedRecipe && <RecipePreview recipe={recipe} />}

                    {!selectedRecipe && (
                        <div className="card help-panel">
                            <h3>💡 Getting Started</h3>
                            <div className="help-content">
                                <p><strong>1. Select a Recipe</strong></p>
                                <p>Choose a recipe from the list above to start editing.</p>

                                <p><strong>2. Add Ingredients</strong></p>
                                <p>Search for components and drag them to the recipe, or use the search dropdown.</p>

                                <p><strong>3. Complete & Move On</strong></p>
                                <p>Click "Mark Complete & Next" to save and move to the next incomplete recipe.</p>

                                <div className="help-shortcuts">
                                    <h4>💨 Quick Actions:</h4>
                                    <ul>
                                        <li>🔍 Use filters to focus on incomplete recipes</li>
                                        <li>🎯 Drag components directly into recipes</li>
                                        <li>⚡ Navigate with Previous/Next buttons</li>
                                        <li>📊 Track progress with completion stats</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeEditor; 