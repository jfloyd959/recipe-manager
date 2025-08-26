import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './NewComponentTracker.css';

const NewComponentTracker = () => {
    const { recipes } = useRecipes();
    const [newComponents, setNewComponents] = useState([]);
    const [selectedComponents, setSelectedComponents] = useState([]);
    const [filterPlanet, setFilterPlanet] = useState('');
    const [filterTier, setFilterTier] = useState('');
    const [showRecipeDetails, setShowRecipeDetails] = useState({});

    // Load new components from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('newComponentsTracking');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNewComponents(parsed);
            } catch (e) {
                console.error('Failed to load new components:', e);
            }
        }
    }, []);

    // Save new components to localStorage whenever they change
    useEffect(() => {
        if (newComponents.length > 0) {
            localStorage.setItem('newComponentsTracking', JSON.stringify(newComponents));
        }
    }, [newComponents]);

    // Add a new component
    const addNewComponent = (component) => {
        // Check if component already exists
        const exists = newComponents.some(c =>
            c.OutputID === component.OutputID ||
            (c.OutputName === component.OutputName && c.PlanetTypes === component.PlanetTypes)
        );

        if (!exists) {
            const newComp = {
                ...component,
                id: Date.now() + Math.random(), // Unique ID for tracking
                dateAdded: new Date().toISOString(),
                status: 'proposed', // proposed, approved, implemented
                notes: ''
            };
            setNewComponents(prev => [...prev, newComp]);
        }
    };

    // Add multiple components from building generation
    const importNewComponents = (componentsText) => {
        try {
            const components = JSON.parse(componentsText);
            const added = [];

            components.forEach(comp => {
                if (!newComponents.some(c => c.OutputID === comp.OutputID)) {
                    const newComp = {
                        ...comp,
                        id: Date.now() + Math.random(),
                        dateAdded: new Date().toISOString(),
                        status: 'proposed',
                        notes: ''
                    };
                    added.push(newComp);
                }
            });

            if (added.length > 0) {
                setNewComponents(prev => [...prev, ...added]);
                alert(`Added ${added.length} new components`);
            } else {
                alert('No new components to add (all already exist)');
            }
        } catch (e) {
            alert('Invalid JSON format. Please paste valid component data.');
        }
    };

    // Update component status
    const updateComponentStatus = (id, status) => {
        setNewComponents(prev => prev.map(comp =>
            comp.id === id ? { ...comp, status } : comp
        ));
    };

    // Update component notes
    const updateComponentNotes = (id, notes) => {
        setNewComponents(prev => prev.map(comp =>
            comp.id === id ? { ...comp, notes } : comp
        ));
    };

    // Delete a component
    const deleteComponent = (id) => {
        if (window.confirm('Are you sure you want to delete this component?')) {
            setNewComponents(prev => prev.filter(comp => comp.id !== id));
        }
    };

    // Toggle component selection
    const toggleComponentSelection = (id) => {
        setSelectedComponents(prev => {
            if (prev.includes(id)) {
                return prev.filter(compId => compId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Select all visible components
    const selectAllVisible = () => {
        const visibleIds = getFilteredComponents().map(c => c.id);
        setSelectedComponents(visibleIds);
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedComponents([]);
    };

    // Delete selected components
    const deleteSelected = () => {
        if (selectedComponents.length === 0) return;

        if (window.confirm(`Delete ${selectedComponents.length} selected components?`)) {
            setNewComponents(prev => prev.filter(comp => !selectedComponents.includes(comp.id)));
            setSelectedComponents([]);
        }
    };

    // Update status for selected components
    const updateSelectedStatus = (status) => {
        if (selectedComponents.length === 0) return;

        setNewComponents(prev => prev.map(comp =>
            selectedComponents.includes(comp.id) ? { ...comp, status } : comp
        ));
    };

    // Get filtered components
    const getFilteredComponents = () => {
        let filtered = [...newComponents];

        if (filterPlanet) {
            filtered = filtered.filter(c => c.PlanetTypes && c.PlanetTypes.includes(filterPlanet));
        }

        if (filterTier) {
            filtered = filtered.filter(c => c.OutputTier === filterTier);
        }

        // Sort by date added (newest first)
        filtered.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

        return filtered;
    };

    // Export selected components as TSV (for adding to finalComponentList)
    const exportSelectedAsTSV = () => {
        const selected = newComponents.filter(c => selectedComponents.includes(c.id));
        if (selected.length === 0) {
            alert('No components selected');
            return;
        }

        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ProductionSteps',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2',
            'Ingredient3', 'Quantity3', 'Ingredient4', 'Quantity4',
            'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8'
        ];

        const rows = [headers.join('\t')];

        selected.forEach(comp => {
            const row = headers.map(header => comp[header] || '');
            rows.push(row.join('\t'));
        });

        const tsvContent = rows.join('\n');
        const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `new-components-${new Date().toISOString().split('T')[0]}.tsv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export selected components as JSON
    const exportSelectedAsJSON = () => {
        const selected = newComponents.filter(c => selectedComponents.includes(c.id));
        if (selected.length === 0) {
            alert('No components selected');
            return;
        }

        const exportData = selected.map(({ id, dateAdded, status, notes, ...comp }) => comp);
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `new-components-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export full tracking data (with metadata)
    const exportFullTracking = () => {
        const jsonContent = JSON.stringify(newComponents, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `component-tracking-full-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import tracking data
    const importTrackingData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    setNewComponents(imported);
                    alert(`Imported ${imported.length} components`);
                } else {
                    alert('Invalid tracking data format');
                }
            } catch (err) {
                alert('Failed to import tracking data: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    // Toggle recipe details
    const toggleRecipeDetails = (id) => {
        setShowRecipeDetails(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'proposed': return '#ff8800';
            case 'approved': return '#4488ff';
            case 'implemented': return '#00ff88';
            default: return '#666';
        }
    };

    // Get planet types list
    const planetTypes = [
        'Oceanic Planet',
        'Volcanic Planet',
        'Terrestrial Planet',
        'Barren Planet',
        'Dark Planet',
        'Ice Giant',
        'Gas Giant',
        'System Asteroid Belt'
    ];

    const filteredComponents = getFilteredComponents();
    const stats = {
        total: newComponents.length,
        proposed: newComponents.filter(c => c.status === 'proposed').length,
        approved: newComponents.filter(c => c.status === 'approved').length,
        implemented: newComponents.filter(c => c.status === 'implemented').length
    };

    return (
        <div className="new-component-tracker">
            <div className="tracker-header">
                <h2>New Component Tracker</h2>
                <p>Track and manage newly proposed components for building recipes</p>
            </div>

            {/* Statistics */}
            <div className="tracker-stats">
                <div className="stat-card">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-card" style={{ borderColor: '#ff8800' }}>
                    <span className="stat-value" style={{ color: '#ff8800' }}>{stats.proposed}</span>
                    <span className="stat-label">Proposed</span>
                </div>
                <div className="stat-card" style={{ borderColor: '#4488ff' }}>
                    <span className="stat-value" style={{ color: '#4488ff' }}>{stats.approved}</span>
                    <span className="stat-label">Approved</span>
                </div>
                <div className="stat-card" style={{ borderColor: '#00ff88' }}>
                    <span className="stat-value" style={{ color: '#00ff88' }}>{stats.implemented}</span>
                    <span className="stat-label">Implemented</span>
                </div>
            </div>

            {/* Controls */}
            <div className="tracker-controls">
                <div className="control-row">
                    <div className="filter-controls">
                        <select
                            value={filterPlanet}
                            onChange={(e) => setFilterPlanet(e.target.value)}
                        >
                            <option value="">All Planets</option>
                            {planetTypes.map(planet => (
                                <option key={planet} value={planet}>{planet}</option>
                            ))}
                        </select>

                        <select
                            value={filterTier}
                            onChange={(e) => setFilterTier(e.target.value)}
                        >
                            <option value="">All Tiers</option>
                            {[1, 2, 3, 4, 5].map(tier => (
                                <option key={tier} value={tier}>Tier {tier}</option>
                            ))}
                        </select>
                    </div>

                    <div className="action-controls">
                        <button onClick={selectAllVisible} className="btn-select-all">
                            Select All Visible
                        </button>
                        <button onClick={clearSelection} className="btn-clear">
                            Clear Selection
                        </button>
                        <span className="selection-count">
                            {selectedComponents.length} selected
                        </span>
                    </div>
                </div>

                <div className="control-row">
                    <div className="bulk-actions">
                        <label>Bulk Actions:</label>
                        <button
                            onClick={() => updateSelectedStatus('proposed')}
                            disabled={selectedComponents.length === 0}
                            className="btn-status-proposed"
                        >
                            Mark Proposed
                        </button>
                        <button
                            onClick={() => updateSelectedStatus('approved')}
                            disabled={selectedComponents.length === 0}
                            className="btn-status-approved"
                        >
                            Mark Approved
                        </button>
                        <button
                            onClick={() => updateSelectedStatus('implemented')}
                            disabled={selectedComponents.length === 0}
                            className="btn-status-implemented"
                        >
                            Mark Implemented
                        </button>
                        <button
                            onClick={deleteSelected}
                            disabled={selectedComponents.length === 0}
                            className="btn-delete"
                        >
                            Delete Selected
                        </button>
                    </div>

                    <div className="export-actions">
                        <label>Export:</label>
                        <button onClick={exportSelectedAsTSV} disabled={selectedComponents.length === 0}>
                            Export TSV
                        </button>
                        <button onClick={exportSelectedAsJSON} disabled={selectedComponents.length === 0}>
                            Export JSON
                        </button>
                        <button onClick={exportFullTracking}>
                            Export Full Tracking
                        </button>
                    </div>
                </div>

                <div className="control-row">
                    <div className="import-section">
                        <label>Import:</label>
                        <input
                            type="file"
                            accept=".json"
                            onChange={importTrackingData}
                            id="import-tracking"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="import-tracking" className="btn-import">
                            Import Tracking Data
                        </label>

                        <button
                            onClick={() => {
                                const text = prompt('Paste JSON array of new components:');
                                if (text) importNewComponents(text);
                            }}
                            className="btn-import-json"
                        >
                            Import from JSON
                        </button>
                    </div>
                </div>
            </div>

            {/* Component List */}
            <div className="component-list">
                {filteredComponents.length === 0 ? (
                    <div className="empty-state">
                        <p>No new components tracked yet</p>
                        <p className="hint">Add components from the building recipe generator or import existing data</p>
                    </div>
                ) : (
                    filteredComponents.map(component => (
                        <div key={component.id} className={`component-card ${selectedComponents.includes(component.id) ? 'selected' : ''}`}>
                            <div className="component-header">
                                <input
                                    type="checkbox"
                                    checked={selectedComponents.includes(component.id)}
                                    onChange={() => toggleComponentSelection(component.id)}
                                />
                                <div className="component-title">
                                    <h3>{component.OutputName}</h3>
                                    <span className="component-id">{component.OutputID}</span>
                                </div>
                                <div className="component-meta">
                                    <span className="tier-badge">T{component.OutputTier}</span>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(component.status) }}
                                    >
                                        {component.status}
                                    </span>
                                </div>
                            </div>

                            <div className="component-info">
                                <div className="info-row">
                                    <span className="info-label">Planet:</span>
                                    <span className="info-value">{component.PlanetTypes || 'All'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Type:</span>
                                    <span className="info-value">{component.OutputType}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Added:</span>
                                    <span className="info-value">
                                        {new Date(component.dateAdded).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="component-recipe">
                                <button
                                    onClick={() => toggleRecipeDetails(component.id)}
                                    className="recipe-toggle"
                                >
                                    {showRecipeDetails[component.id] ? '▼' : '▶'} Recipe Details
                                </button>

                                {showRecipeDetails[component.id] && (
                                    <div className="recipe-details">
                                        <div className="recipe-ingredients">
                                            <strong>Ingredients:</strong>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                                const ingredient = component[`Ingredient${i}`];
                                                const quantity = component[`Quantity${i}`];
                                                if (!ingredient) return null;
                                                return (
                                                    <div key={i} className="ingredient-item">
                                                        {ingredient} × {quantity}
                                                    </div>
                                                );
                                            }).filter(Boolean)}
                                        </div>
                                        <div className="recipe-stats">
                                            <span>Construction Time: {component.ConstructionTime || 'N/A'}</span>
                                            <span>Production Steps: {component.ProductionSteps || '1'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="component-notes">
                                <input
                                    type="text"
                                    placeholder="Add notes..."
                                    value={component.notes || ''}
                                    onChange={(e) => updateComponentNotes(component.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            <div className="component-actions">
                                <select
                                    value={component.status}
                                    onChange={(e) => updateComponentStatus(component.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="proposed">Proposed</option>
                                    <option value="approved">Approved</option>
                                    <option value="implemented">Implemented</option>
                                </select>
                                <button
                                    onClick={() => deleteComponent(component.id)}
                                    className="btn-delete-single"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NewComponentTracker; 