import React from 'react';

const ResourceTooltip = ({ resourceName, resource, recipe }) => {
    if (!resourceName || !resource) return null;

    return (
        <div className="resource-tooltip">
            <div className="tooltip-content">
                <div className="tooltip-header">
                    <h4>{resourceName}</h4>
                    <span className={`tier-badge tier-${resource.tier}`}>
                        T{resource.tier}
                    </span>
                </div>

                <div className="tooltip-details">
                    <div className="detail-row">
                        <span className="label">Type:</span>
                        <span className="value">{resource.category || 'Unknown'}</span>
                    </div>

                    {resource.type === 'raw' && (
                        <div className="detail-row">
                            <span className="label">Source:</span>
                            <span className="value raw-indicator">🪨 Raw Material</span>
                        </div>
                    )}

                    {resource.planetSources && (
                        <div className="detail-row">
                            <span className="label">Planets:</span>
                            <div className="planet-sources">
                                {resource.planetSources.map(planet => (
                                    <span key={planet} className="planet-tag">{planet}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {recipe && recipe.ingredients && (
                    <div className="tooltip-recipe">
                        <h5>Recipe Ingredients:</h5>
                        <div className="recipe-ingredients-list">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div key={index} className="tooltip-ingredient">
                                    <span className="ingredient-name">{ingredient.name}</span>
                                    <span className="ingredient-quantity">({ingredient.quantity})</span>
                                </div>
                            ))}
                        </div>

                        {recipe.constructionTime && (
                            <div className="construction-info">
                                <span className="construction-time">
                                    ⏱️ {recipe.constructionTime}s
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {!recipe && resource.type !== 'raw' && (
                    <div className="tooltip-warning">
                        <span className="missing-recipe">❌ No recipe available</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceTooltip; 