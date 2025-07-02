import React, { useState } from 'react';

const ProductionChainTree = ({ chain, onResourceClick, onResourceHover, level = 0 }) => {
    const [collapsed, setCollapsed] = useState(level > 2); // Auto-collapse deep levels

    // Debug logging for the chain data
    if (level === 0) {
        console.log('=== ProductionChainTree Debug ===');
        console.log('Full chain object:', chain);
        console.log('Chain name:', chain?.name);
        console.log('Chain ingredients:', chain?.ingredients);
        console.log('Chain recipe:', chain?.recipe);
        console.log('Chain recipe ingredients:', chain?.recipe?.ingredients);
        console.log('Has ingredients?', chain.ingredients && chain.ingredients.length > 0);
        console.log('=== End ProductionChainTree Debug ===');
    }

    if (!chain) {
        return (
            <div className="chain-node missing">
                <div className="node-content">
                    <span className="missing-indicator">❓ Unknown Resource</span>
                </div>
            </div>
        );
    }

    if (chain.circular) {
        return (
            <div className="chain-node circular">
                <div className="node-content">
                    <span className="circular-indicator">🔄 Circular Dependency</span>
                </div>
            </div>
        );
    }

    const hasIngredients = chain.ingredients && chain.ingredients.length > 0;
    const canCollapse = hasIngredients && level > 0;

    const getStatusIcon = () => {
        if (chain.type === 'raw') return '🪨';
        if (chain.missing) return '❌';
        if (!chain.isComplete) return '⚠️';
        if (!chain.tierValid) return '🔺';
        return '✅';
    };

    const getStatusClass = () => {
        if (chain.type === 'raw') return 'raw-resource';
        if (chain.missing) return 'missing-recipe';
        if (!chain.isComplete) return 'incomplete-chain';
        if (!chain.tierValid) return 'tier-invalid';
        return 'complete-chain';
    };

    const handleNodeClick = (e) => {
        e.stopPropagation();
        if (canCollapse) {
            setCollapsed(!collapsed);
        }
        if (onResourceClick) {
            onResourceClick(chain.name);
        }
    };

    const handleNodeHover = () => {
        if (onResourceHover) {
            onResourceHover(chain.name);
        }
    };

    const renderPlanetDependencies = () => {
        if (!chain.planetDependencies || chain.planetDependencies.length === 0) return null;

        return (
            <div className="planet-dependencies">
                {chain.planetDependencies.map(planet => (
                    <span key={planet} className="planet-tag">{planet}</span>
                ))}
            </div>
        );
    };

    return (
        <div className={`chain-node level-${level}`}>
            <div
                className={`node-content ${getStatusClass()}`}
                onClick={handleNodeClick}
                onMouseEnter={handleNodeHover}
                onMouseLeave={() => onResourceHover && onResourceHover(null)}
            >
                <div className="node-header">
                    <div className="node-info">
                        {canCollapse && (
                            <button className="collapse-btn">
                                {collapsed ? '▶️' : '🔽'}
                            </button>
                        )}

                        <span className="status-icon">{getStatusIcon()}</span>

                        <span className="resource-name" title={chain.name}>
                            {chain.name}
                        </span>

                        <span className={`tier-badge tier-${chain.tier}`}>
                            T{chain.tier}
                        </span>

                        <span className="resource-category">{chain.category}</span>
                    </div>

                    {chain.constructionTime && (
                        <span className="construction-time">
                            ⏱️ {chain.constructionTime}s
                        </span>
                    )}
                </div>

                {chain.recipe && (
                    <div className="recipe-summary">
                        <span className="ingredient-count">
                            📋 {chain.recipe.ingredients?.length || 0} ingredients
                        </span>
                        {!chain.tierValid && (
                            <span className="tier-warning">
                                ⚠️ Tier validation failed
                            </span>
                        )}
                    </div>
                )}

                {renderPlanetDependencies()}

                {/* Status indicators */}
                <div className="status-indicators">
                    {chain.type === 'raw' && <span className="indicator raw">Raw Material</span>}
                    {chain.missing && <span className="indicator missing">Missing Recipe</span>}
                    {!chain.missing && !chain.isComplete && <span className="indicator incomplete">Incomplete Chain</span>}
                    {chain.isComplete && <span className="indicator complete">Complete</span>}
                </div>
            </div>

            {/* Render ingredients tree */}
            {hasIngredients && !collapsed && (
                <div className="ingredients-tree">
                    <div className="tree-connector"></div>
                    {chain.ingredients.map((ingredient, index) => (
                        <div key={`${ingredient.name || 'unknown'}-${index}`} className="ingredient-branch">
                            <div className="branch-connector">
                                <div className="branch-line"></div>
                                <div className="branch-node"></div>
                            </div>
                            <ProductionChainTree
                                chain={ingredient}
                                onResourceClick={onResourceClick}
                                onResourceHover={onResourceHover}
                                level={level + 1}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Show collapsed count */}
            {hasIngredients && collapsed && (
                <div className="collapsed-indicator">
                    <span className="collapsed-count">
                        📦 {chain.ingredients.length} ingredients (collapsed)
                    </span>
                </div>
            )}
        </div>
    );
};

export default ProductionChainTree; 