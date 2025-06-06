import React, { useState, useEffect } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import DependencyGraph from './DependencyGraph';
import DependencyTree from './DependencyTree';
import { buildDependencyGraph } from '../../utils/dependencies';
import './DependencyViewer.css';

const DependencyViewer = () => {
    const { state } = useRecipes();
    const { recipes } = state;
    const [selectedItem, setSelectedItem] = useState('');
    const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'tree'
    const [dependencyData, setDependencyData] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);

    useEffect(() => {
        if (selectedItem && recipes.length > 0) {
            const data = buildDependencyGraph(selectedItem, recipes);
            setDependencyData(data);

            // Analyze the dependency chain
            const analysis = analyzeDependencies(data);
            setAnalysisResults(analysis);
        }
    }, [selectedItem, recipes]);

    const analyzeDependencies = (data) => {
        if (!data) return null;

        const totalTime = calculateTotalProductionTime(data);
        const bottlenecks = findBottlenecks(data);
        const missingRecipes = findMissingRecipes(data);
        const resourceRequirements = calculateResourceRequirements(data);

        return {
            totalTime,
            bottlenecks,
            missingRecipes,
            resourceRequirements,
            complexity: data.depth || 0
        };
    };

    const calculateTotalProductionTime = (data) => {
        // Simplified calculation - in reality this would need to account for parallel production
        let totalTime = 0;
        const visited = new Set();

        const traverse = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);

            totalTime += node.constructionTime || 0;

            if (node.dependencies) {
                node.dependencies.forEach(dep => traverse(dep));
            }
        };

        traverse(data);
        return totalTime;
    };

    const findBottlenecks = (data) => {
        const bottlenecks = [];

        const traverse = (node) => {
            if (node.constructionTime > 3600) { // More than 1 hour
                bottlenecks.push({
                    name: node.name,
                    time: node.constructionTime,
                    reason: 'Long construction time'
                });
            }

            if (node.dependencies && node.dependencies.length > 5) {
                bottlenecks.push({
                    name: node.name,
                    dependencies: node.dependencies.length,
                    reason: 'Complex dependency chain'
                });
            }

            if (node.dependencies) {
                node.dependencies.forEach(dep => traverse(dep));
            }
        };

        traverse(data);
        return bottlenecks;
    };

    const findMissingRecipes = (data) => {
        const missing = [];

        const traverse = (node) => {
            if (!node.recipeExists) {
                missing.push(node.name);
            }

            if (node.dependencies) {
                node.dependencies.forEach(dep => traverse(dep));
            }
        };

        traverse(data);
        return [...new Set(missing)];
    };

    const calculateResourceRequirements = (data) => {
        const resources = {};

        const traverse = (node, multiplier = 1) => {
            if (!node.dependencies || node.dependencies.length === 0) {
                // This is a raw resource
                resources[node.name] = (resources[node.name] || 0) + multiplier;
            } else {
                node.dependencies.forEach(dep => {
                    traverse(dep, multiplier * (dep.quantity || 1));
                });
            }
        };

        traverse(data);
        return resources;
    };

    const availableItems = recipes.map(recipe => recipe.outputName).sort();

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    return (
        <div className="dependency-viewer">
            <div className="viewer-header">
                <h1>Dependency Analysis</h1>

                <div className="viewer-controls">
                    <select
                        value={selectedItem}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        className="item-selector"
                    >
                        <option value="">Select an item to analyze...</option>
                        {availableItems.map(item => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>

                    <div className="view-mode-toggle">
                        <button
                            onClick={() => setViewMode('graph')}
                            className={viewMode === 'graph' ? 'active' : ''}
                        >
                            Graph View
                        </button>
                        <button
                            onClick={() => setViewMode('tree')}
                            className={viewMode === 'tree' ? 'active' : ''}
                        >
                            Tree View
                        </button>
                    </div>
                </div>
            </div>

            {selectedItem && (
                <div className="viewer-content">
                    <div className="analysis-panel">
                        {analysisResults && (
                            <div className="card analysis-summary">
                                <h3>📊 Production Analysis</h3>
                                <div className="analysis-stats">
                                    <div className="stat">
                                        <label>Total Production Time:</label>
                                        <span>{formatTime(analysisResults.totalTime)}</span>
                                    </div>
                                    <div className="stat">
                                        <label>Complexity Level:</label>
                                        <span>{analysisResults.complexity} levels deep</span>
                                    </div>
                                    <div className="stat">
                                        <label>Bottlenecks Found:</label>
                                        <span className={analysisResults.bottlenecks.length > 0 ? 'warning' : 'good'}>
                                            {analysisResults.bottlenecks.length}
                                        </span>
                                    </div>
                                    <div className="stat">
                                        <label>Missing Recipes:</label>
                                        <span className={analysisResults.missingRecipes.length > 0 ? 'error' : 'good'}>
                                            {analysisResults.missingRecipes.length}
                                        </span>
                                    </div>
                                </div>

                                {analysisResults.bottlenecks.length > 0 && (
                                    <div className="bottlenecks">
                                        <h4>⚠️ Potential Bottlenecks</h4>
                                        {analysisResults.bottlenecks.map((bottleneck, index) => (
                                            <div key={index} className="bottleneck-item">
                                                <strong>{bottleneck.name}</strong>: {bottleneck.reason}
                                                {bottleneck.time && ` (${formatTime(bottleneck.time)})`}
                                                {bottleneck.dependencies && ` (${bottleneck.dependencies} dependencies)`}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {analysisResults.missingRecipes.length > 0 && (
                                    <div className="missing-recipes">
                                        <h4>❌ Missing Recipes</h4>
                                        <div className="missing-list">
                                            {analysisResults.missingRecipes.map((missing, index) => (
                                                <span key={index} className="missing-tag">{missing}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="visualization-panel">
                        {dependencyData && (
                            <>
                                {viewMode === 'graph' ? (
                                    <DependencyGraph data={dependencyData} />
                                ) : (
                                    <DependencyTree data={dependencyData} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DependencyViewer; 