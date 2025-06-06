import React, { useState } from 'react';
import './DependencyTree.css';

const DependencyTree = ({ data }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set([data?.id]));

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const TreeNode = ({ node, level = 0 }) => {
        const hasChildren = node.dependencies && node.dependencies.length > 0;
        const isExpanded = expandedNodes.has(node.id || node.name);
        const indent = level * 20;

        return (
            <div className="tree-node">
                <div
                    className={`node-content ${node.missing ? 'missing' : ''} tier-${node.tier || 1}`}
                    style={{ paddingLeft: `${indent}px` }}
                >
                    {hasChildren && (
                        <button
                            className="expand-toggle"
                            onClick={() => toggleNode(node.id || node.name)}
                        >
                            {isExpanded ? '▼' : '▶'}
                        </button>
                    )}

                    <div className="node-info">
                        <div className="node-header">
                            <span className="node-name">{node.name}</span>
                            {node.quantity && (
                                <span className="node-quantity">×{node.quantity}</span>
                            )}
                            {node.tier && (
                                <span className={`tier-badge tier-${node.tier}`}>T{node.tier}</span>
                            )}
                        </div>

                        <div className="node-details">
                            {node.constructionTime && (
                                <span className="construction-time">
                                    🕒 {formatTime(node.constructionTime)}
                                </span>
                            )}
                            {node.functionalPurpose && (
                                <span className="functional-purpose">
                                    🔧 {node.functionalPurpose}
                                </span>
                            )}
                            {node.missing && (
                                <span className="missing-indicator">❌ Missing Recipe</span>
                            )}
                            {node.type === 'raw_resource' && (
                                <span className="resource-indicator">🧱 Raw Resource</span>
                            )}
                        </div>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="node-children">
                        {node.dependencies.map((child, index) => (
                            <TreeNode
                                key={`${child.id || child.name}-${index}`}
                                node={child}
                                level={level + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (!data) {
        return (
            <div className="dependency-tree">
                <p>No dependency data available</p>
            </div>
        );
    }

    return (
        <div className="dependency-tree">
            <div className="tree-controls">
                <button
                    onClick={() => setExpandedNodes(new Set())}
                    className="collapse-all"
                >
                    Collapse All
                </button>
                <button
                    onClick={() => {
                        const allIds = new Set();
                        const collectIds = (node) => {
                            allIds.add(node.id || node.name);
                            if (node.dependencies) {
                                node.dependencies.forEach(collectIds);
                            }
                        };
                        collectIds(data);
                        setExpandedNodes(allIds);
                    }}
                    className="expand-all"
                >
                    Expand All
                </button>
            </div>

            <div className="tree-content">
                <TreeNode node={data} />
            </div>
        </div>
    );
};

export default DependencyTree; 