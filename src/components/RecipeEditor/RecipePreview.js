import React from 'react';
import { validateRecipeConsistency } from '../../utils/calculations';
import './RecipePreview.css';

const RecipePreview = ({ recipe }) => {
    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const getValidationIssues = () => {
        if (!recipe.outputName || recipe.ingredients.length === 0) return [];
        return validateRecipeConsistency(recipe, []); // Pass empty array since we don't have access to all recipes here
    };

    const issues = getValidationIssues();

    return (
        <div className="card recipe-preview">
            <h3>📋 Recipe Preview</h3>

            <div className="preview-content">
                <div className="output-info">
                    <h4>{recipe.outputName || 'Unnamed Recipe'}</h4>
                    <div className="output-meta">
                        <span className={`tier-badge tier-${recipe.outputTier}`}>
                            Tier {recipe.outputTier}
                        </span>
                        <span className="output-type">{recipe.outputType}</span>
                    </div>
                </div>

                <div className="recipe-stats">
                    <div className="stat-item">
                        <label>Construction Time:</label>
                        <span>{formatTime(recipe.constructionTime)}</span>
                    </div>
                    <div className="stat-item">
                        <label>Ingredients:</label>
                        <span>{recipe.ingredients.length}</span>
                    </div>
                    <div className="stat-item">
                        <label>Production Steps:</label>
                        <span>{recipe.productionSteps || 1}</span>
                    </div>
                </div>

                {recipe.ingredients.length > 0 && (
                    <div className="ingredients-preview">
                        <h5>Ingredients:</h5>
                        <div className="ingredient-list">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div key={index} className="ingredient-item">
                                    <span className="ingredient-name">{ingredient.name}</span>
                                    <span className="ingredient-quantity">×{ingredient.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {recipe.functionalPurpose && (
                    <div className="functional-info">
                        <label>Purpose:</label>
                        <span>{recipe.functionalPurpose}</span>
                    </div>
                )}

                {recipe.planetTypes && (
                    <div className="planet-info">
                        <label>Planet Types:</label>
                        <span>{recipe.planetTypes}</span>
                    </div>
                )}

                {issues.length > 0 && (
                    <div className="validation-issues">
                        <h5>⚠️ Validation Issues:</h5>
                        {issues.map((issue, index) => (
                            <div key={index} className={`issue ${issue.severity}`}>
                                <span className="issue-type">{issue.type.replace('_', ' ')}</span>
                                <span className="issue-message">{issue.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipePreview; 