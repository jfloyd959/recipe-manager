import React, { useState, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import QuickActions from '../QuickActions/QuickActions';
import './Dashboard.css';

const Dashboard = () => {
    const { state } = useRecipes();
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSubtype, setFilterSubtype] = useState('all');

    // Get the appropriate data based on active tab
    const getActiveData = () => {
        switch (activeTab) {
            case 'finals': return state.finals || [];
            case 'ingredients': return state.ingredients || [];
            case 'components': return state.components || [];
            case 'resources': return state.rawResources || [];
            case 'potential': return state.potentialComponents || [];
            default: return [];
        }
    };

    const activeData = getActiveData();

    // Get all unique categories for the current tab
    const categories = useMemo(() => {
        const cats = new Set();
        activeData.forEach(item => {
            const category = item.category || item.type || 'Unknown';
            cats.add(category);
        });
        return Array.from(cats).sort();
    }, [activeData]);

    // Get all unique subtypes for the selected category
    const subtypes = useMemo(() => {
        const subs = new Set();
        activeData.forEach(item => {
            if (filterCategory === 'all' || (item.category || item.type) === filterCategory) {
                if (item.subtype) {
                    subs.add(item.subtype);
                }
            }
        });
        return Array.from(subs).sort();
    }, [activeData, filterCategory]);

    // Enhanced filtering
    const filteredData = useMemo(() => {
        return activeData.filter(item => {
            // Search filter
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // Tier filter
            if (filterTier !== 'all' && item.tier !== parseInt(filterTier)) {
                return false;
            }

            // Status filter
            if (filterStatus !== 'all') {
                if (filterStatus === 'complete' && !item.isFinalized) return false;
                if (filterStatus === 'incomplete' && item.isFinalized) return false;
                if (filterStatus === 'potential' && !item.isPotential) return false;
            }

            // Category filter
            if (filterCategory !== 'all' && (item.category || item.type) !== filterCategory) {
                return false;
            }

            // Subtype filter
            if (filterSubtype !== 'all' && item.subtype !== filterSubtype) {
                return false;
            }

            return true;
        });
    }, [activeData, searchTerm, filterTier, filterStatus, filterCategory, filterSubtype]);

    // Get comprehensive stats
    const getStats = () => {
        const stats = {
            totalFinals: state.finals?.length || 0,
            totalIngredients: state.ingredients?.length || 0,
            totalComponents: state.components?.length || 0,
            totalRawResources: state.rawResources?.length || 0,
            totalPotentialComponents: state.potentialComponents?.length || 0,
            completedComponents: state.potentialComponents?.filter(c => c.isFinalized).length || 0,
            incompleteComponents: state.potentialComponents?.filter(c => !c.isFinalized).length || 0,
            componentsByTier: {},
            componentsByCategory: {},
            componentsBySubtype: {},
            completionPercentage: 0
        };

        // Calculate completion percentage (for potential components)
        if (stats.totalPotentialComponents > 0) {
            stats.completionPercentage = Math.round((stats.completedComponents / stats.totalPotentialComponents) * 100);
        }

        // Count all items by tier
        [...(state.finals || []), ...(state.ingredients || []), ...(state.components || []), ...(state.rawResources || [])].forEach(item => {
            const tier = item.tier || 1;
            stats.componentsByTier[tier] = (stats.componentsByTier[tier] || 0) + 1;
        });

        // Count finals by category
        state.finals?.forEach(item => {
            const category = item.category || item.type || 'Unknown';
            stats.componentsByCategory[category] = (stats.componentsByCategory[category] || 0) + 1;
        });

        // Count finals by subtype (top 10)
        state.finals?.forEach(item => {
            if (item.subtype) {
                stats.componentsBySubtype[item.subtype] = (stats.componentsBySubtype[item.subtype] || 0) + 1;
            }
        });

        return stats;
    };

    const stats = getStats();

    const renderOverview = () => (
        <div className="overview-section">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Production Chain</h3>
                    <div className="stat-value">{stats.totalFinals}</div>
                    <p>Final Products</p>
                </div>
                <div className="stat-card">
                    <h3>Ingredients</h3>
                    <div className="stat-value">{stats.totalIngredients}</div>
                    <p>Intermediate Products</p>
                </div>
                <div className="stat-card">
                    <h3>Components</h3>
                    <div className="stat-value">{stats.totalComponents}</div>
                    <p>Basic Components</p>
                </div>
                <div className="stat-card">
                    <h3>Raw Resources</h3>
                    <div className="stat-value">{stats.totalRawResources}</div>
                    <p>Base Materials</p>
                </div>
                <div className="stat-card">
                    <h3>Potential Components</h3>
                    <div className="stat-value">{stats.totalPotentialComponents}</div>
                    <p>In Development</p>
                    {stats.totalPotentialComponents > 0 && (
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${stats.completionPercentage}%` }}
                            ></div>
                            <span className="progress-text">{stats.completionPercentage}% Complete</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="detail-stats">
                <div className="stats-section">
                    <h3>Items by Tier</h3>
                    <div className="tier-breakdown">
                        {Object.entries(stats.componentsByTier)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([tier, count]) => (
                                <div key={tier} className="tier-stat">
                                    <span className="tier-label">Tier {tier}:</span>
                                    <span className="tier-count">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="stats-section">
                    <h3>Final Product Categories</h3>
                    <div className="category-breakdown">
                        {Object.entries(stats.componentsByCategory)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 8)
                            .map(([category, count]) => (
                                <div key={category} className="category-stat">
                                    <span className="category-label">{category}:</span>
                                    <span className="category-count">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="stats-section">
                    <h3>Top Component Types</h3>
                    <div className="subtype-breakdown">
                        {Object.entries(stats.componentsBySubtype)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                            .map(([subtype, count]) => (
                                <div key={subtype} className="subtype-stat">
                                    <span className="subtype-label">{subtype}:</span>
                                    <span className="subtype-count">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDataList = (data, title) => (
        <div className="data-list">
            <h2>{title} ({data.length})</h2>
            <div className="components-grid">
                {data.slice(0, 50).map(item => (
                    <div key={item.id} className={`component-card ${item.isFinalized ? 'completed' : 'incomplete'} ${item.isPotential ? 'potential' : ''}`}>
                        <h4>{item.name}</h4>
                        <div className="component-details">
                            <p><span className="label">Tier:</span> {item.tier}</p>
                            <p><span className="label">Type:</span> {item.type}</p>
                            {item.category && <p><span className="label">Category:</span> {item.category}</p>}
                            {item.subtype && <p><span className="label">Subtype:</span> {item.subtype}</p>}
                            {item.constructionTime > 0 && (
                                <p><span className="label">Time:</span> {item.constructionTime}s</p>
                            )}
                            {item.extractionRate > 0 && (
                                <p><span className="label">Extraction:</span> {item.extractionRate}/h</p>
                            )}
                            {item.ingredients?.length > 0 && (
                                <p><span className="label">Ingredients:</span> {item.ingredients.length}</p>
                            )}
                            <div className="status-badge">
                                {item.isPotential ? 'Potential' : item.isFinalized ? 'Complete' : 'In Progress'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {data.length > 50 && (
                <p className="more-items">...and {data.length - 50} more items</p>
            )}
        </div>
    );

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Production Chain Dashboard</h1>
                <QuickActions />
            </div>

            <div className="dashboard-tabs">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={activeTab === 'finals' ? 'active' : ''}
                    onClick={() => setActiveTab('finals')}
                >
                    Finals ({state.finals?.length || 0})
                </button>
                <button
                    className={activeTab === 'ingredients' ? 'active' : ''}
                    onClick={() => setActiveTab('ingredients')}
                >
                    Ingredients ({state.ingredients?.length || 0})
                </button>
                <button
                    className={activeTab === 'components' ? 'active' : ''}
                    onClick={() => setActiveTab('components')}
                >
                    Components ({state.components?.length || 0})
                </button>
                <button
                    className={activeTab === 'resources' ? 'active' : ''}
                    onClick={() => setActiveTab('resources')}
                >
                    Raw Resources ({state.rawResources?.length || 0})
                </button>
                <button
                    className={activeTab === 'potential' ? 'active' : ''}
                    onClick={() => setActiveTab('potential')}
                >
                    Potential ({state.potentialComponents?.length || 0})
                </button>
            </div>

            {activeTab !== 'overview' && (
                <div className="dashboard-filters">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />

                    <select
                        value={filterTier}
                        onChange={(e) => setFilterTier(e.target.value)}
                        className="tier-filter"
                    >
                        <option value="all">All Tiers</option>
                        {[1, 2, 3, 4, 5].map(tier => (
                            <option key={tier} value={tier}>Tier {tier}</option>
                        ))}
                    </select>

                    {activeTab === 'potential' && (
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="status-filter"
                        >
                            <option value="all">All Status</option>
                            <option value="complete">Complete</option>
                            <option value="incomplete">Incomplete</option>
                        </select>
                    )}

                    {categories.length > 1 && (
                        <>
                            <select
                                value={filterCategory}
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setFilterSubtype('all'); // Reset subtype when category changes
                                }}
                                className="category-filter"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>

                            {subtypes.length > 0 && (
                                <select
                                    value={filterSubtype}
                                    onChange={(e) => setFilterSubtype(e.target.value)}
                                    className="subtype-filter"
                                >
                                    <option value="all">All Subtypes</option>
                                    {subtypes.map(subtype => (
                                        <option key={subtype} value={subtype}>{subtype}</option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="dashboard-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'finals' && renderDataList(filteredData, 'Final Products')}
                {activeTab === 'ingredients' && renderDataList(filteredData, 'Ingredients')}
                {activeTab === 'components' && renderDataList(filteredData, 'Components')}
                {activeTab === 'resources' && renderDataList(filteredData, 'Raw Resources')}
                {activeTab === 'potential' && renderDataList(filteredData, 'Potential Components')}
            </div>

            {state.isLoading && (
                <div className="loading-overlay">
                    <p>Loading data...</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard; 