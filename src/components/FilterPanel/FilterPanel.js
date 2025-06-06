import React from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './FilterPanel.css';

const FilterPanel = () => {
    const { state, setFilters } = useRecipes();
    const { filters, recipes } = state;

    const handleFilterChange = (key, value) => {
        setFilters({ [key]: value });
    };

    const clearFilters = () => {
        setFilters({
            status: 'all',
            tier: 'all',
            type: 'all',
            search: ''
        });
    };

    const getFilterCounts = () => {
        const counts = {
            status: { complete: 0, partial: 0, missing: 0 },
            tier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            type: {}
        };

        recipes.forEach(recipe => {
            counts.status[recipe.completionStatus]++;
            counts.tier[recipe.outputTier]++;
            counts.type[recipe.outputType] = (counts.type[recipe.outputType] || 0) + 1;
        });

        return counts;
    };

    const counts = getFilterCounts();

    return (
        <div className="filter-panel">
            <div className="filter-header">
                <h3>🔍 Filters</h3>
                <button onClick={clearFilters} className="clear-filters">
                    Clear All
                </button>
            </div>

            <div className="filter-group">
                <label>Search</label>
                <input
                    type="text"
                    placeholder="Search recipes..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
            </div>

            <div className="filter-group">
                <label>Status</label>
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <option value="all">All ({recipes.length})</option>
                    <option value="complete">✅ Complete ({counts.status.complete})</option>
                    <option value="partial">⚠️ Partial ({counts.status.partial})</option>
                    <option value="missing">❌ Missing ({counts.status.missing})</option>
                </select>
            </div>

            <div className="filter-group">
                <label>Tier</label>
                <select
                    value={filters.tier}
                    onChange={(e) => handleFilterChange('tier', e.target.value)}
                >
                    <option value="all">All Tiers</option>
                    {[1, 2, 3, 4, 5].map(tier => (
                        <option key={tier} value={tier}>
                            Tier {tier} ({counts.tier[tier]})
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Type</label>
                <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                    <option value="all">All Types</option>
                    {Object.entries(counts.type).map(([type, count]) => (
                        <option key={type} value={type}>
                            {type} ({count})
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-stats">
                <h4>📈 Quick Stats</h4>
                <div className="stat-grid">
                    <div className="stat-item">
                        <span className="stat-label">Total Recipes:</span>
                        <span className="stat-value">{recipes.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Completion Rate:</span>
                        <span className="stat-value">
                            {recipes.length > 0 ? Math.round((counts.status.complete / recipes.length) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel; 