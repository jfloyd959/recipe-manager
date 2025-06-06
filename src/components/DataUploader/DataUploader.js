import React, { useState } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './DataUploader.css';

const DataUploader = () => {
    const { state, reloadFromCSV } = useRecipes();
    const [loading, setLoading] = useState(false);

    const handleReloadCSV = async () => {
        setLoading(true);
        try {
            await reloadFromCSV();
            alert('CSV data reloaded successfully!');
        } catch (error) {
            alert('Failed to reload CSV data');
        } finally {
            setLoading(false);
        }
    };

    // Get breakdown by category for finals
    const getFinalsBreakdown = () => {
        const breakdown = {};
        state.finals?.forEach(item => {
            const category = item.category || item.type || 'Unknown';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        return breakdown;
    };

    // Get breakdown by tier for raw resources
    const getRawResourceBreakdown = () => {
        const breakdown = {};
        state.rawResources?.forEach(resource => {
            const tier = `Tier ${resource.tier}`;
            breakdown[tier] = (breakdown[tier] || 0) + 1;
        });
        return breakdown;
    };

    // Get breakdown by category for components
    const getComponentBreakdown = () => {
        const breakdown = {};
        state.components?.forEach(comp => {
            const category = comp.category || comp.type || 'Unknown';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });
        return breakdown;
    };

    const finalsBreakdown = getFinalsBreakdown();
    const rawResourceBreakdown = getRawResourceBreakdown();
    const componentBreakdown = getComponentBreakdown();

    return (
        <div className="data-uploader">
            <h1>Data Management</h1>

            <div className="upload-section">
                <h2>Current Data Status</h2>
                <div className="data-status">
                    <p><strong>Recipes:</strong> {state.recipes?.length || 0}</p>
                    <p><strong>Finals:</strong> {state.finals?.length || 0}</p>
                    <p><strong>Ingredients:</strong> {state.ingredients?.length || 0}</p>
                    <p><strong>Components:</strong> {state.components?.length || 0}</p>
                    <p><strong>Raw Resources:</strong> {state.rawResources?.length || 0}</p>
                    <p><strong>Potential Components:</strong> {state.potentialComponents?.length || 0}</p>
                    {state.isLoading && <p>Loading...</p>}
                    {state.error && <p style={{ color: 'red' }}>Error: {state.error}</p>}
                </div>

                <div className="data-breakdown">
                    <h3>Final Products Breakdown</h3>
                    {Object.entries(finalsBreakdown).map(([category, count]) => (
                        <p key={category}><strong>{category}:</strong> {count}</p>
                    ))}
                </div>

                <div className="data-breakdown">
                    <h3>Component Breakdown</h3>
                    {Object.entries(componentBreakdown).map(([category, count]) => (
                        <p key={category}><strong>{category}:</strong> {count}</p>
                    ))}
                </div>

                <div className="data-breakdown">
                    <h3>Raw Resource Breakdown</h3>
                    {Object.entries(rawResourceBreakdown).map(([tier, count]) => (
                        <p key={tier}><strong>{tier}:</strong> {count}</p>
                    ))}
                </div>
            </div>

            <div className="upload-section">
                <h2>Reload CSV Data</h2>
                <p>Reload data from the finalComponentList.csv file in the public folder.</p>
                <button
                    onClick={handleReloadCSV}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Loading...' : 'Reload CSV Data'}
                </button>
            </div>

            <div className="upload-section">
                <h2>Instructions</h2>
                <p>1. Place your CSV file as "finalComponentList.csv" in the public folder</p>
                <p>2. Place your potential components as "PotentialComponents.md" in the public folder</p>
                <p>3. Click "Reload CSV Data" to import the latest data</p>
                <p>4. The app will automatically save your data to localStorage</p>
            </div>
        </div>
    );
};

export default DataUploader; 