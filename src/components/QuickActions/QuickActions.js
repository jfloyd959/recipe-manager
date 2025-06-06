import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../../context/RecipeContext';
import { exportToJSON, exportToCSV } from '../../utils/storage';
import './QuickActions.css';

const QuickActions = () => {
    const navigate = useNavigate();
    const { state } = useRecipes();
    const { recipes, components, rawResources } = state;

    const handleExportJSON = () => {
        exportToJSON({ recipes, components, rawResources });
    };

    const handleExportCSV = () => {
        exportToCSV(recipes);
    };

    const handleNewRecipe = () => {
        navigate('/editor');
    };

    const handleImportData = () => {
        navigate('/upload');
    };

    return (
        <div className="quick-actions">
            <button onClick={handleNewRecipe} className="primary-action">
                ➕ New Recipe
            </button>

            <div className="action-group">
                <button onClick={handleImportData}>
                    📁 Import Data
                </button>

                <div className="dropdown">
                    <button className="dropdown-toggle">
                        📤 Export ▼
                    </button>
                    <div className="dropdown-menu">
                        <button onClick={handleExportJSON}>
                            📄 Export JSON
                        </button>
                        <button onClick={handleExportCSV}>
                            📊 Export CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickActions; 