import React, { useState } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './RecipeTable.css';

const RecipeTable = ({ recipes }) => {
    const { selectRecipe, deleteRecipe } = useRecipes();
    const [sortConfig, setSortConfig] = useState({ key: 'outputName', direction: 'asc' });

    const sortedRecipes = React.useMemo(() => {
        if (!sortConfig.key) return recipes;

        return [...recipes].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [recipes, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'complete': return '✅';
            case 'partial': return '⚠️';
            case 'missing': return '❌';
            default: return '❓';
        }
    };

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    return (
        <div className="recipe-table-container">
            <div className="table-header">
                <h2>Recipes ({recipes.length})</h2>
            </div>

            <div className="table-wrapper">
                <table className="recipe-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('completionStatus')} className="sortable">
                                Status {sortConfig.key === 'completionStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('outputName')} className="sortable">
                                Name {sortConfig.key === 'outputName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('outputTier')} className="sortable">
                                Tier {sortConfig.key === 'outputTier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('outputType')} className="sortable">
                                Type {sortConfig.key === 'outputType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('constructionTime')} className="sortable">
                                Time {sortConfig.key === 'constructionTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Ingredients</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRecipes.map((recipe) => (
                            <tr key={recipe.id} className={`tier-${recipe.outputTier}`}>
                                <td>
                                    <span className={`status-${recipe.completionStatus}`}>
                                        {getStatusIcon(recipe.completionStatus)}
                                    </span>
                                </td>
                                <td className="recipe-name">{recipe.outputName}</td>
                                <td>
                                    <span className={`tier-badge tier-${recipe.outputTier}`}>
                                        T{recipe.outputTier}
                                    </span>
                                </td>
                                <td>{recipe.outputType}</td>
                                <td>{formatTime(recipe.constructionTime)}</td>
                                <td>
                                    <div className="ingredients-preview">
                                        {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                                            <span key={idx} className="ingredient-tag">
                                                {ing.name} ×{ing.quantity}
                                            </span>
                                        ))}
                                        {recipe.ingredients.length > 3 && (
                                            <span className="more-ingredients">
                                                +{recipe.ingredients.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="actions">
                                    <button
                                        onClick={() => selectRecipe(recipe)}
                                        className="edit-btn"
                                        title="Edit recipe"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => deleteRecipe(recipe.id)}
                                        className="delete-btn"
                                        title="Delete recipe"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecipeTable; 