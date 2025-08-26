import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import ComponentMetricsAnalyzer from '../ComponentMetricsAnalyzer/ComponentMetricsAnalyzer';
import './PreferredResourceSelector.css';

const PreferredResourceSelector = () => {
    const { recipes, state } = useRecipes();
    const [selectedPlanet, setSelectedPlanet] = useState('Oceanic Planet'); // Set default planet
    const [buildingResourceTier, setBuildingResourceTier] = useState(1);
    const [buildingTier, setBuildingTier] = useState(1);
    const [selectedResources, setSelectedResources] = useState([]);
    const [filterTheme, setFilterTheme] = useState('all');
    const [showNewComponents, setShowNewComponents] = useState(false);
    const [savedPreferences, setSavedPreferences] = useState([]);
    const [componentMetrics, setComponentMetrics] = useState([]);
    const [showMetrics, setShowMetrics] = useState(true);

    // Planet types from the system
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

    // Components that should NEVER be used in building recipes
    const bannedBuildingComponents = new Set([
        // Weapon/Ammo components
        'Blast Charges',
        'Ammo Control Core',
        'Beam Interface Core',
        'Beam Emitter',
        'Field Harmonizer',
        'Signal Booster',
        'Emergency Suppressant',
        'Interference Shield',
        'Thrust Modulator',
        'Explosive Compound',
        'Explosive Core',
        'Incendiary Mix',
        'Thermal Charges',
        'Precision Detonator',

        // Ship-specific systems
        'Control System Core',
        'Coordination Matrix',
        'Emergency Matrix Core',
        'Crystal Lattice MUD',
        'Crystal Lattice ONI',
        'Crystal Lattice Ustur',
        'Drive Assembly Core',
        'Launch Platform Core',
        'Jasphorus Propulsion Core',
        'Kinetic Opal Core',
        'Phase Drive Core',
        'Warp Coils',
        'Subspace Coils',

        // Ship cooling/power systems
        'Coolant Circulator',
        'Cooling Network Hub',
        'Cryogenic Core',
        'Neural Networks',

        // Defense/Countermeasure systems
        'Shield Generator',
        'Defense Matrix',
        'Countermeasure System',
        'Decoy System',
        'Flare Dispenser',
        'Mine Layer',

        // Weapon-specific components
        'Weapon Catalyst',
        'Weapon Amplifier',
        'Weapon Frame',
        'Advanced Weapon Core',
        'Kinetic Amplifier',
        'Photon Emitters',
        'Scatter Pattern Generator',
        'Pressure Wave Generator',

        // Production steps > 2 (complex components)
        'Electronics',
        'Dispersal Mechanism',
        'Dispersal Gas Mix',
        'Dimensional Stabilizer',
        'Command Module',
        'Energy Focuser'
    ]);

    // Preferred components for buildings (structural, utility, basic materials)
    const preferredBuildingComponents = new Set([
        // Structural
        'Framework',
        'Aerogel',
        'Alloy Frame',
        'Base Structure',
        'Barrier Material',
        'Bio Framework',
        'Bio Stabilizer',
        'Structural Joint',
        'Structural Brace',
        'Structural Anchor',
        'Load Bearing Beams',
        'Heavy Alloy',
        'Reinforcement Lattice',

        // Basic processed materials
        'Aluminum',
        'Boron',
        'Chromite Ingot',
        'Cobalt',
        'Copper',
        'Copper Wire',
        'Iron',
        'Lithium',
        'Manganese',
        'Tin',
        'Zinc',
        'Steel',
        'Gold',
        'Silver',
        'Platinum',
        'Palladium',

        // Building systems
        'Utility Core',
        'Adaptive Utility Core',
        'Assembly Control Matrix',
        'Climate Controller',
        'Coupling Interface',
        'Boron Composite',
        'Insulation Material',
        'Protective Coating',
        'Reactive Coating',

        // Power/Energy (non-weapon)
        'Capacitor Matrix Core',
        'Capacity Control Core',
        'Power Source',
        'Power Distribution Hub',
        'Energy Cells',
        'Storage Matrix',
        'Voltage Regulator',
        'Current Limiter',

        // Environmental/Life Support
        'Thermal Control Unit',
        'Temperature Regulator',
        'Heat Dissipator',
        'Heat Distribution Grid',
        'Heat Exchange Coils',
        'Heat Circulation Pipes',
        'Fire Suppressant',
        'Pressure Relief',
        'Safety Buffer',
        'Safety Shutoff',

        // Utility
        'Utility Interface',
        'Utility Conduit',
        'Transfer Lines',
        'Tank Shell',
        'Sensor Array',
        'Sensor Elements',
        'Repair Kit',
        'Medical Nanites'
    ]);

    // Filter components based on selection criteria
    const filteredComponents = useMemo(() => {
        if (!recipes || !selectedPlanet) {
            console.log('PreferredResourceSelector: No recipes or planet selected', { recipes: recipes?.length, selectedPlanet });
            return [];
        }

        console.log('PreferredResourceSelector: Filtering components', {
            totalRecipes: recipes.length,
            selectedPlanet,
            buildingResourceTier,
            buildingTier,
            sampleRecipes: recipes.slice(0, 3).map(r => ({
                name: r.OutputName || r.outputName,
                type: r.OutputType || r.outputType,
                tier: r.OutputTier || r.outputTier,
                planets: r.PlanetTypes || r.planetTypes
            }))
        });

        // Deduplicate recipes by OutputID first
        const uniqueRecipes = [];
        const seenIds = new Set();

        recipes.forEach(r => {
            const id = r.OutputID || r.outputID || r.id;
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                uniqueRecipes.push(r);
            }
        });

        console.log('PreferredResourceSelector: Unique recipes after dedup', uniqueRecipes.length);

        // Get all components and basic resources
        const availableItems = uniqueRecipes.filter(r => {
            // Handle different field names for raw resources vs components
            const outputType = r.OutputType || r.outputType || r.type;
            const outputName = r.OutputName || r.outputName || r.name;
            const outputTier = parseInt(r.OutputTier || r.outputTier || r.tier || 1);

            // Handle planetTypes which could be string or array
            let planetTypes = r.PlanetTypes || r.planetTypes || '';
            if (Array.isArray(planetTypes)) {
                planetTypes = planetTypes.join(';');
            }

            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || 0);

            // Skip banned components
            if (bannedBuildingComponents.has(outputName)) {
                return false;
            }

            // Include basic resources (raw materials)
            if (outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE' || outputType === 'Raw Resource') {
                // Check if it's available on the selected planet or system-wide
                if (planetTypes.includes(selectedPlanet) || planetTypes === '') {
                    // Apply tier filtering
                    if (outputTier <= buildingResourceTier) {
                        return true;
                    }
                    // T4-T5 buildings can use higher tier materials
                    if (buildingTier >= 4 && outputTier <= buildingResourceTier + 1) {
                        return true;
                    }
                }
                return false;
            }

            // Include components with production steps <= 2
            if ((outputType === 'COMPONENT' || outputType === 'Component') && productionSteps <= 2) {
                // Check planet availability
                if (planetTypes.includes(selectedPlanet) || planetTypes === '') {
                    // Apply tier filtering - components cannot exceed building resource tier (except T4-T5)
                    if (outputTier <= buildingResourceTier) {
                        return true;
                    }
                    // T4-T5 buildings can use slightly higher tier components
                    if (buildingTier >= 4 && outputTier <= buildingResourceTier + 1) {
                        return true;
                    }
                }
            }

            return false;
        });

        console.log('PreferredResourceSelector: Available items before theme filter', availableItems.length);

        // Apply theme filtering
        let filtered = availableItems;
        if (filterTheme === 'preferred') {
            filtered = availableItems.filter(item => {
                const name = item.OutputName || item.outputName;
                return preferredBuildingComponents.has(name);
            });
        } else if (filterTheme === 'structural') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('frame') || name.includes('structure') ||
                    name.includes('beam') || name.includes('brace') ||
                    name.includes('anchor') || name.includes('joint') ||
                    name.includes('plate') || name.includes('plating') ||
                    name.includes('composite') || name.includes('alloy');
            });
        } else if (filterTheme === 'utility') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('utility') || name.includes('power') ||
                    name.includes('energy') || name.includes('control') ||
                    name.includes('system') || name.includes('matrix') ||
                    name.includes('core') || name.includes('module');
            });
        } else if (filterTheme === 'environmental') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('thermal') || name.includes('heat') ||
                    name.includes('cooling') || name.includes('climate') ||
                    name.includes('pressure') || name.includes('insulation') ||
                    name.includes('safety') || name.includes('fire');
            });
        } else if (filterTheme === 'raw') {
            filtered = availableItems.filter(item => {
                const outputType = item.OutputType || item.outputType;
                return outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE';
            });
        }

        // Sort by tier, then by preference, then by name
        return filtered.sort((a, b) => {
            const tierA = parseInt(a.OutputTier || a.outputTier || 1);
            const tierB = parseInt(b.OutputTier || b.outputTier || 1);
            const nameA = a.OutputName || a.outputName;
            const nameB = b.OutputName || b.outputName;
            const isPreferredA = preferredBuildingComponents.has(nameA);
            const isPreferredB = preferredBuildingComponents.has(nameB);

            // Sort by tier first
            if (tierA !== tierB) return tierA - tierB;
            // Then by preference
            if (isPreferredA && !isPreferredB) return -1;
            if (!isPreferredA && isPreferredB) return 1;
            // Finally by name
            return nameA.localeCompare(nameB);
        });
    }, [recipes, selectedPlanet, buildingResourceTier, buildingTier, filterTheme]);

    // Suggested new components (only if needed)
    const suggestedNewComponents = useMemo(() => {
        if (!showNewComponents || !selectedPlanet) return [];

        const suggestions = [];
        const planetPrefix = selectedPlanet.toLowerCase().split(' ')[0];

        // Only suggest if we have very few existing components
        if (filteredComponents.length < 5) {
            // Suggest planet-specific structural components
            if (buildingResourceTier === 1) {
                suggestions.push({
                    name: `${planetPrefix}-framework`,
                    displayName: `${planetPrefix.charAt(0).toUpperCase() + planetPrefix.slice(1)} Framework`,
                    tier: 1,
                    type: 'COMPONENT',
                    isNew: true,
                    reason: 'Basic structural component for T1 buildings'
                });
            }
            if (buildingResourceTier === 2) {
                suggestions.push({
                    name: `${planetPrefix}-composite-plating`,
                    displayName: `${planetPrefix.charAt(0).toUpperCase() + planetPrefix.slice(1)} Composite Plating`,
                    tier: 2,
                    type: 'COMPONENT',
                    isNew: true,
                    reason: 'Advanced structural component for T2 buildings'
                });
            }
        }

        return suggestions;
    }, [showNewComponents, selectedPlanet, buildingResourceTier, filteredComponents]);

    // Handle resource selection
    const toggleResourceSelection = (resource) => {
        const resourceId = resource.OutputID || resource.outputID || resource.OutputName || resource.outputName;
        setSelectedResources(prev => {
            const isSelected = prev.some(r => {
                const id = r.OutputID || r.outputID || r.OutputName || r.outputName;
                return id === resourceId;
            });

            if (isSelected) {
                return prev.filter(r => {
                    const id = r.OutputID || r.outputID || r.OutputName || r.outputName;
                    return id !== resourceId;
                });
            } else {
                return [...prev, resource];
            }
        });
    };

    // Save current preference set
    const savePreferenceSet = () => {
        const preferenceSet = {
            id: Date.now(),
            name: `${selectedPlanet} - Resource T${buildingResourceTier} - Building T${buildingTier}`,
            planet: selectedPlanet,
            resourceTier: buildingResourceTier,
            buildingTier: buildingTier,
            resources: selectedResources,
            timestamp: new Date().toISOString()
        };

        setSavedPreferences(prev => [...prev, preferenceSet]);

        // Also save to localStorage
        const existing = JSON.parse(localStorage.getItem('buildingResourcePreferences') || '[]');
        existing.push(preferenceSet);
        localStorage.setItem('buildingResourcePreferences', JSON.stringify(existing));

        alert('Preference set saved!');
    };

    // Load saved preferences on mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('buildingResourcePreferences') || '[]');
        setSavedPreferences(saved);
    }, []);

    // Load a saved preference set
    const loadPreferenceSet = (set) => {
        setSelectedPlanet(set.planet);
        setBuildingResourceTier(set.resourceTier);
        setBuildingTier(set.buildingTier);
        setSelectedResources(set.resources);
    };

    // Delete a saved preference set
    const deletePreferenceSet = (id) => {
        const updated = savedPreferences.filter(p => p.id !== id);
        setSavedPreferences(updated);
        localStorage.setItem('buildingResourcePreferences', JSON.stringify(updated));
    };

    // Export selected resources as JSON
    const exportSelectedResources = () => {
        const exportData = {
            planet: selectedPlanet,
            buildingResourceTier,
            buildingTier,
            resources: selectedResources.map(r => ({
                id: r.OutputID || r.outputID,
                name: r.OutputName || r.outputName,
                type: r.OutputType || r.outputType,
                tier: r.OutputTier || r.outputTier
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `building-resources-${selectedPlanet.toLowerCase().replace(' ', '-')}-rt${buildingResourceTier}-bt${buildingTier}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Show loading state if data isn't ready
    if (state?.loading) {
        return (
            <div className="preferred-resource-selector">
                <h2>Preferred Building Resources Selector</h2>
                <div className="loading-message" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading resources...
                </div>
            </div>
        );
    }

    // Show error if no recipes loaded
    if (!recipes || recipes.length === 0) {
        return (
            <div className="preferred-resource-selector">
                <h2>Preferred Building Resources Selector</h2>
                <div className="error-message" style={{ textAlign: 'center', padding: '40px', color: '#ff4444' }}>
                    No recipe data loaded. Please check that finalComponentList.csv exists in the public folder.
                </div>
            </div>
        );
    }

    return (
        <div className="preferred-resource-selector">
            <h2>Preferred Building Resources Selector</h2>

            {/* Main Container with Side Panel Layout */}
            <div className="selector-main-container">
                {/* Left Panel - Resource Selection */}
                <div className="resources-panel">
                    {/* Selection Criteria */}
                    <div className="selection-criteria">
                        <div className="criteria-row">
                            <div className="criteria-item">
                                <label>Planet Type:</label>
                                <select
                                    value={selectedPlanet}
                                    onChange={(e) => setSelectedPlanet(e.target.value)}
                                >
                                    <option value="">Select Planet...</option>
                                    {planetTypes.map(planet => (
                                        <option key={planet} value={planet}>{planet}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="criteria-item">
                                <label>Building Resource Tier:</label>
                                <select
                                    value={buildingResourceTier}
                                    onChange={(e) => setBuildingResourceTier(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map(tier => (
                                        <option key={tier} value={tier}>Tier {tier}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="criteria-item">
                                <label>Building Tier:</label>
                                <select
                                    value={buildingTier}
                                    onChange={(e) => setBuildingTier(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map(tier => (
                                        <option key={tier} value={tier}>Tier {tier}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="filter-row">
                            <label>Filter by Type:</label>
                            <div className="filter-buttons">
                                <button
                                    className={filterTheme === 'all' ? 'active' : ''}
                                    onClick={() => setFilterTheme('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={filterTheme === 'preferred' ? 'active' : ''}
                                    onClick={() => setFilterTheme('preferred')}
                                >
                                    Preferred
                                </button>
                                <button
                                    className={filterTheme === 'structural' ? 'active' : ''}
                                    onClick={() => setFilterTheme('structural')}
                                >
                                    Structural
                                </button>
                                <button
                                    className={filterTheme === 'utility' ? 'active' : ''}
                                    onClick={() => setFilterTheme('utility')}
                                >
                                    Utility
                                </button>
                                <button
                                    className={filterTheme === 'environmental' ? 'active' : ''}
                                    onClick={() => setFilterTheme('environmental')}
                                >
                                    Environmental
                                </button>
                                <button
                                    className={filterTheme === 'raw' ? 'active' : ''}
                                    onClick={() => setFilterTheme('raw')}
                                >
                                    Raw Materials
                                </button>
                            </div>
                        </div>

                        <div className="options-row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showNewComponents}
                                    onChange={(e) => setShowNewComponents(e.target.checked)}
                                />
                                Show suggested NEW components (if needed)
                            </label>
                        </div>
                    </div>

                    {/* Available Resources */}
                    {selectedPlanet && (
                        <div className="resources-section">
                            <h3>Available Resources ({filteredComponents.length} found)</h3>

                            {buildingTier === 1 && buildingResourceTier <= 2 && (
                                <div className="info-box">
                                    ℹ️ T1 infrastructure and T1 resource buildings can use raw materials for bootstrap.
                                </div>
                            )}

                            <div className="resources-grid">
                                {filteredComponents.map(resource => {
                                    const resourceId = resource.OutputID || resource.outputID || resource.id || resource.OutputName || resource.outputName || resource.name;
                                    const isSelected = selectedResources.some(r => {
                                        const id = r.OutputID || r.outputID || r.id || r.OutputName || r.outputName || r.name;
                                        return id === resourceId;
                                    });
                                    const isPreferred = preferredBuildingComponents.has(resource.OutputName || resource.outputName || resource.name);

                                    return (
                                        <div
                                            key={resourceId}
                                            className={`resource-card ${isSelected ? 'selected' : ''} ${isPreferred ? 'preferred' : ''}`}
                                            onClick={() => toggleResourceSelection(resource)}
                                        >
                                            <div className="resource-name">
                                                {resource.OutputName || resource.outputName || resource.name}
                                                {isPreferred && <span className="preferred-badge">★</span>}
                                            </div>
                                            <div className="resource-details">
                                                <span className="resource-tier">T{resource.OutputTier || resource.outputTier || resource.tier || 1}</span>
                                                <span className="resource-type">{resource.OutputType || resource.outputType || resource.type}</span>
                                            </div>
                                            {resource.PlanetTypes && resource.PlanetTypes !== selectedPlanet && (
                                                <div className="resource-planet">
                                                    {resource.PlanetTypes}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {showNewComponents && suggestedNewComponents.length > 0 && (
                                <>
                                    <h3>Suggested NEW Components (Only if absolutely needed)</h3>
                                    <div className="new-components-warning">
                                        ⚠️ These are NEW components that don't exist yet. Only select if no existing components can fill the requirement.
                                    </div>
                                    <div className="resources-grid">
                                        {suggestedNewComponents.map(component => (
                                            <div
                                                key={component.name}
                                                className="resource-card new-component"
                                                onClick={() => toggleResourceSelection(component)}
                                            >
                                                <div className="resource-name">
                                                    {component.displayName}
                                                    <span className="new-badge">NEW</span>
                                                </div>
                                                <div className="resource-details">
                                                    <span className="resource-tier">T{component.tier}</span>
                                                    <span className="resource-type">{component.type}</span>
                                                </div>
                                                <div className="new-reason">{component.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Selected Resources and Metrics */}
                <div className="details-panel">
                    {/* Selected Resources */}
                    {selectedResources.length > 0 && (
                        <div className="selected-section">
                            <h3>Selected Resources ({selectedResources.length})</h3>
                            <div className="selected-list">
                                {selectedResources.map(resource => {
                                    const resourceId = resource.OutputID || resource.outputID || resource.id || resource.OutputName || resource.outputName || resource.name;
                                    const resourceName = resource.OutputName || resource.outputName || resource.displayName || resource.name;
                                    return (
                                        <div key={resourceId} className="selected-item">
                                            <span>{resourceName}</span>
                                            <button onClick={() => toggleResourceSelection(resource)}>Remove</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="action-buttons">
                                <button onClick={savePreferenceSet} className="save-btn">
                                    Save Preference Set
                                </button>
                                <button onClick={exportSelectedResources} className="export-btn">
                                    Export as JSON
                                </button>
                                <button onClick={() => setSelectedResources([])} className="clear-btn">
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Component Metrics Analyzer */}
                    {selectedResources.length > 0 && (
                        <div className="metrics-section">
                            <div className="metrics-toggle">
                                <button
                                    onClick={() => setShowMetrics(!showMetrics)}
                                    className="metrics-toggle-btn"
                                >
                                    {showMetrics ? 'Hide' : 'Show'} Component Metrics
                                </button>
                            </div>
                            {showMetrics && (
                                <ComponentMetricsAnalyzer
                                    selectedComponents={selectedResources}
                                    planetType={selectedPlanet}
                                    buildingResourceTier={buildingResourceTier}
                                    buildingTier={buildingTier}
                                    onMetricsUpdate={setComponentMetrics}
                                />
                            )}
                        </div>
                    )}

                    {/* Saved Preferences */}
                    {savedPreferences.length > 0 && (
                        <div className="saved-preferences">
                            <h3>Saved Preference Sets</h3>
                            <div className="preferences-list">
                                {savedPreferences.map(set => (
                                    <div key={set.id} className="preference-item">
                                        <div className="preference-info">
                                            <strong>{set.name}</strong>
                                            <span className="preference-count">{set.resources.length} resources</span>
                                        </div>
                                        <div className="preference-actions">
                                            <button onClick={() => loadPreferenceSet(set)}>Load</button>
                                            <button onClick={() => deletePreferenceSet(set.id)}>Delete</button>
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

export default PreferredResourceSelector; 