import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import { BuildingRecipeGenerator } from './BuildingRecipeGenerator';
import PreferredResourceSelector from '../PreferredResourceSelector/PreferredResourceSelector';
import NewComponentTracker from '../NewComponentTracker/NewComponentTracker';
import './BuildingRecipes.css';

const BuildingRecipes = () => {
    const { state } = useRecipes();
    const { recipes } = state;

    const [activeTab, setActiveTab] = useState('generator');
    const [generatedRecipes, setGeneratedRecipes] = useState([]);
    const [newComponents, setNewComponents] = useState([]);
    const [analysisReport, setAnalysisReport] = useState(null);
    const [selectedPlanet, setSelectedPlanet] = useState('');
    const [generatorConfig, setGeneratorConfig] = useState({
        nativeTierMax: 3,
        minimizeNewComponents: true
    });

    // Available planets
    const planets = [
        'Oceanic Planet',
        'Volcanic Planet',
        'Terrestrial Planet',
        'Barren Planet',
        'Dark Planet',
        'Ice Giant',
        'Gas Giant',
        'System Asteroid Belt'
    ];

    // Building categories for filtering/display
    const buildingCategories = {
        'Hubs': ['Central Hub', 'Cultivation Hub', 'Processing Hub', 'Extraction Hub', 'Storage Hub', 'Farm Hub'],
        'Infrastructure': ['Power Plant', 'Crew Quarters', 'Storage Module'],
        'Processing': ['Processor'],
        'Extraction': ['Extractor', 'Extraction']
    };

    const toKebabCase = (str) => {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .trim()
            .replace(/[\s_]+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    /**
     * Generate building recipes for selected planet(s)
     */
    const generateBuildingRecipes = () => {
        if (!selectedPlanet) {
            alert('Please select a planet type.');
            return;
        }

        console.clear();
        console.log(`🚀 Starting building recipe generation for: ${selectedPlanet}`);

        if (selectedPlanet === 'All Planets') {
            generateAllPlanetRecipes();
        } else {
            const generator = new BuildingRecipeGenerator(recipes, generatorConfig);
            const planetRecipes = generator.generatePlanetBuildingRecipes(selectedPlanet);

            setGeneratedRecipes(planetRecipes);
            // Convert Map to array for display
            const newComponentsArray = Array.from(generator.globalNewComponents.values());
            setNewComponents(newComponentsArray);

            // Generate analysis report
            const report = {
                planetType: selectedPlanet,
                totalBuildings: planetRecipes.length,
                totalNewComponents: generator.globalNewComponents.size,
                existingComponentsReused: generator.existingComponentsReused,
                overallReuseRate: generator.existingComponentsReused > 0
                    ? `${Math.round((generator.existingComponentsReused / (generator.existingComponentsReused + generator.globalNewComponents.size)) * 100)}%`
                    : '0%'
            };
            setAnalysisReport(report);
        }
    };

    /**
     * Generate recipes for all planets
     */
    const generateAllPlanetRecipes = () => {
        console.log('🌍 Generating recipes for all planets...\n');

        const generator = new BuildingRecipeGenerator(recipes, generatorConfig);
        const allRecipes = [];
        const planetReports = {};
        let totalBuildings = 0;

        planets.forEach(planet => {
            console.log(`\n📍 Processing ${planet}...`);

            try {
                // Track stats before this planet
                const beforeNewComponents = generator.globalNewComponents.size;
                const beforeReused = generator.existingComponentsReused;

                const planetRecipes = generator.generatePlanetBuildingRecipes(planet);

                // Calculate stats for this planet
                const newComponentsForPlanet = generator.globalNewComponents.size - beforeNewComponents;
                const reusedForPlanet = generator.existingComponentsReused - beforeReused;

                allRecipes.push(...planetRecipes);
                totalBuildings += planetRecipes.length;

                planetReports[planet] = {
                    buildingCount: planetRecipes.length,
                    newComponents: newComponentsForPlanet,
                    reusedComponents: reusedForPlanet
                };

                console.log(`✅ ${planet} complete: ${planetRecipes.length} buildings`);
            } catch (error) {
                console.error(`❌ Error generating recipes for ${planet}:`, error);
                planetReports[planet] = {
                    buildingCount: 0,
                    newComponents: 0,
                    reusedComponents: 0,
                    error: error.message
                };
            }
        });

        setGeneratedRecipes(allRecipes);
        // Convert Map to array for display
        const newComponentsArray = Array.from(generator.globalNewComponents.values());
        setNewComponents(newComponentsArray);

        // Calculate overall statistics
        const overallReuseRate = calculateOverallReuseRate(generator.globalNewComponents.size, generator.existingComponentsReused);

        // Generate comprehensive report
        const report = {
            totalBuildings: totalBuildings,
            totalNewComponents: generator.globalNewComponents.size,
            existingComponentsReused: generator.existingComponentsReused,
            overallReuseRate: overallReuseRate,
            byPlanet: planetReports
        };

        setAnalysisReport(report);

        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL SUMMARY:');
        console.log(`  Total buildings generated: ${totalBuildings}`);
        console.log(`  Total new components created: ${generator.globalNewComponents.size}`);
        console.log(`  Total existing components reused: ${generator.existingComponentsReused}`);
        console.log(`  Overall component reuse rate: ${overallReuseRate}`);
        console.log('='.repeat(60));
    };

    /**
     * Calculate overall component reuse rate
     */
    const calculateOverallReuseRate = (newComponents, totalReused) => {
        const total = newComponents + totalReused;
        return total > 0 ? `${Math.round((totalReused / total) * 100)}%` : '0%';
    };

    /**
     * Export generated building recipes to CSV/TSV
     */
    const exportBuildingRecipesToCSV = () => {
        if (generatedRecipes.length === 0) {
            alert('No recipes to export. Generate recipes first.');
            return;
        }

        const escapeCSVValue = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = value.toString();
            if (stringValue.includes('\t') || stringValue.includes('\n') || stringValue.includes('\r')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        // Headers
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'BuildingResourceTier',
            'ConstructionTime', 'PlanetTypes', 'Factions', 'ResourceType', 'ProductionSteps'
        ];

        // Add ingredient headers
        for (let i = 1; i <= 8; i++) {
            headers.push(`Ingredient${i}`, `Quantity${i}`);
        }

        // Build CSV content
        const rows = [headers.join('\t')];

        generatedRecipes.forEach(recipe => {
            const row = [];
            headers.forEach(header => {
                row.push(escapeCSVValue(recipe[header] || ''));
            });
            rows.push(row.join('\t'));
        });

        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `building_recipes_${selectedPlanet ? toKebabCase(selectedPlanet) : 'all'}.tsv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Export new components to CSV/TSV
     */
    const exportNewComponentsToCSV = () => {
        if (newComponents.length === 0) {
            alert('No new components to export.');
            return;
        }

        const generator = new BuildingRecipeGenerator(recipes, generatorConfig);
        // Populate the generator's globalNewComponents Map with our components
        newComponents.forEach((comp, index) => {
            generator.globalNewComponents.set(`component-${index}`, comp);
        });
        const csvContent = generator.exportNewComponentsToCSV();

        const blob = new Blob([csvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'new_components_created.tsv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Send new components to the tracker
     */
    const sendToTracker = () => {
        if (newComponents.length === 0) {
            alert('No new components to track');
            return;
        }

        // Get existing tracked components
        const existing = localStorage.getItem('newComponentsTracking');
        const trackedComponents = existing ? JSON.parse(existing) : [];

        // Add new components with tracking metadata
        const toAdd = newComponents.map(comp => ({
            ...comp,
            id: Date.now() + Math.random(),
            dateAdded: new Date().toISOString(),
            status: 'proposed',
            notes: `Generated for ${selectedPlanet || 'All Planets'} building recipes`
        }));

        // Merge with existing, avoiding duplicates
        const merged = [...trackedComponents];
        let addedCount = 0;
        toAdd.forEach(newComp => {
            if (!merged.some(c => c.OutputID === newComp.OutputID)) {
                merged.push(newComp);
                addedCount++;
            }
        });

        // Save back to localStorage
        localStorage.setItem('newComponentsTracking', JSON.stringify(merged));

        if (addedCount > 0) {
            alert(`Added ${addedCount} new components to tracker. Switch to "New Component Tracker" tab to view.`);
        } else {
            alert('All components are already being tracked.');
        }
    };

    /**
     * Clear all generated data
     */
    const clearBuildingRecipes = () => {
        setGeneratedRecipes([]);
        setNewComponents([]);
        setAnalysisReport(null);
        console.log('🧹 Cleared all generated recipes and components');
    };

    /**
     * Update configuration
     */
    const updateConfig = (key, value) => {
        setGeneratorConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div className="building-recipes-container">
            <div className="building-recipes-header">
                <h2>Comprehensive Building Recipe Generator</h2>
                <p>Automated generation following tier rules and bootstrap logic</p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`}
                    onClick={() => setActiveTab('generator')}
                >
                    Recipe Generator
                </button>
                <button
                    className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preferences')}
                >
                    Preferred Resources
                </button>
                <button
                    className={`tab-button ${activeTab === 'tracker' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tracker')}
                >
                    New Component Tracker
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'generator' ? (
                <>
                    {/* Configuration Panel */}
                    <div className="config-panel">
                        <h3>Generation Configuration</h3>
                        <div className="config-controls">
                            <div className="config-item">
                                <label>
                                    Planet Type:
                                    <select
                                        value={selectedPlanet}
                                        onChange={(e) => setSelectedPlanet(e.target.value)}
                                    >
                                        <option value="">Select Planet</option>
                                        <option value="All Planets">All Planets</option>
                                        {planets.map(planet => (
                                            <option key={planet} value={planet}>{planet}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="config-item">
                                <label>
                                    Native Tier Maximum:
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={generatorConfig.nativeTierMax}
                                        onChange={(e) => updateConfig('nativeTierMax', parseInt(e.target.value))}
                                    />
                                </label>
                                <small>Buildings up to this tier must be buildable with native resources</small>
                            </div>

                            <div className="config-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={generatorConfig.minimizeNewComponents}
                                        onChange={(e) => updateConfig('minimizeNewComponents', e.target.checked)}
                                    />
                                    Minimize New Components
                                </label>
                                <small>Prioritize reusing existing components</small>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button
                            onClick={generateBuildingRecipes}
                            disabled={!selectedPlanet}
                            className="primary-button"
                        >
                            Generate for {selectedPlanet || 'Selected Planet'}
                        </button>
                        <button
                            onClick={clearBuildingRecipes}
                            className="secondary-button"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Analysis Report */}
                    {analysisReport && (
                        <div className="analysis-report">
                            <h3>Generation Analysis Report</h3>
                            <div className="report-stats">
                                {analysisReport.planetType && (
                                    <div className="stat-item">
                                        <span className="stat-label">Planet:</span>
                                        <span className="stat-value">{analysisReport.planetType}</span>
                                    </div>
                                )}
                                <div className="stat-item">
                                    <span className="stat-label">Total Buildings:</span>
                                    <span className="stat-value">{analysisReport.totalBuildings}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">New Components Created:</span>
                                    <span className="stat-value">{analysisReport.totalNewComponents || newComponents.length}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Existing Components Reused:</span>
                                    <span className="stat-value">{analysisReport.existingComponentsReused || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Component Reuse Rate:</span>
                                    <span className="stat-value highlight">{analysisReport.overallReuseRate || analysisReport.reuseRate || '0%'}</span>
                                </div>
                            </div>

                            {analysisReport.byPlanet && (
                                <div className="planet-breakdown">
                                    <h4>Breakdown by Planet</h4>
                                    <table className="breakdown-table">
                                        <thead>
                                            <tr>
                                                <th>Planet</th>
                                                <th>Buildings</th>
                                                <th>New Components</th>
                                                <th>Reused Components</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(analysisReport.byPlanet).map(([planet, stats]) => (
                                                <tr key={planet}>
                                                    <td>{planet}</td>
                                                    <td>{stats.buildingCount}</td>
                                                    <td>{stats.newComponents}</td>
                                                    <td>{stats.reusedComponents}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Export Options */}
                    {(generatedRecipes.length > 0 || newComponents.length > 0) && (
                        <div className="export-section">
                            <h3>Export Options</h3>
                            <div className="export-buttons">
                                <button
                                    onClick={exportBuildingRecipesToCSV}
                                    disabled={generatedRecipes.length === 0}
                                >
                                    Export Building Recipes (.tsv)
                                </button>
                                <button
                                    onClick={exportNewComponentsToCSV}
                                    disabled={newComponents.length === 0}
                                >
                                    Export New Components (.tsv)
                                </button>
                                <button
                                    onClick={sendToTracker}
                                    disabled={newComponents.length === 0}
                                    className="send-to-tracker-btn"
                                >
                                    Send to Component Tracker
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Generated Recipes Display */}
                    {generatedRecipes.length > 0 && (
                        <div className="generated-recipes">
                            <h3>Generated Building Recipes ({generatedRecipes.length})</h3>
                            <div className="recipe-list">
                                <table className="recipe-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Tier</th>
                                            <th>Resource Tier</th>
                                            <th>Planet</th>
                                            <th>Time</th>
                                            <th>Ingredients</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedRecipes.slice(0, 50).map((recipe, index) => (
                                            <tr key={index}>
                                                <td>{recipe.OutputID}</td>
                                                <td>{recipe.OutputName}</td>
                                                <td>{recipe.ResourceType}</td>
                                                <td>T{recipe.OutputTier}</td>
                                                <td>{recipe.BuildingResourceTier ? `T${recipe.BuildingResourceTier}` : '-'}</td>
                                                <td>{recipe.PlanetTypes}</td>
                                                <td>{recipe.ConstructionTime}m</td>
                                                <td className="ingredients-cell">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i =>
                                                        recipe[`Ingredient${i}`] ?
                                                            `${recipe[`Ingredient${i}`]} (${recipe[`Quantity${i}`]})` :
                                                            null
                                                    ).filter(Boolean).join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {generatedRecipes.length > 50 && (
                                    <p className="more-recipes">...and {generatedRecipes.length - 50} more recipes</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* New Components Display */}
                    {newComponents.length > 0 && (
                        <div className="new-components">
                            <h3>New Components Created ({newComponents.length})</h3>
                            <div className="component-list">
                                <table className="component-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Tier</th>
                                            <th>Planet</th>
                                            <th>Recipe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newComponents.map((comp, index) => (
                                            <tr key={index}>
                                                <td>{comp.OutputID}</td>
                                                <td>{comp.OutputName}</td>
                                                <td>T{comp.OutputTier}</td>
                                                <td>{comp.PlanetTypes}</td>
                                                <td className="ingredients-cell">
                                                    {[1, 2, 3, 4].map(i =>
                                                        comp[`Ingredient${i}`] ?
                                                            `${comp[`Ingredient${i}`]} (${comp[`Quantity${i}`]})` :
                                                            null
                                                    ).filter(Boolean).join(' + ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : activeTab === 'preferences' ? (
                <PreferredResourceSelector />
            ) : (
                <NewComponentTracker />
            )}
        </div>
    );
};

export default BuildingRecipes; 