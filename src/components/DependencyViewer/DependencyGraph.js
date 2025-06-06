import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './DependencyGraph.css';

const DependencyGraph = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous render

        const width = 800;
        const height = 600;
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        svg.attr('width', width).attr('height', height);

        // Convert tree data to d3 hierarchy
        const root = d3.hierarchy(data);
        const treeLayout = d3.tree().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

        treeLayout(root);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create links
        const link = g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            );

        // Create nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', d => `node ${d.data.missing ? 'missing' : ''} tier-${d.data.tier || 1}`)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Add circles for nodes
        node.append('circle')
            .attr('r', d => {
                if (d.data.type === 'raw_resource') return 4;
                return 6 + (d.data.tier || 1);
            })
            .attr('class', d => d.data.missing ? 'missing-node' : 'recipe-node');

        // Add labels
        node.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children ? -8 : 8)
            .style('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name)
            .style('font-size', '12px')
            .style('fill', '#e0e0e0');

        // Add tooltips
        node.append('title')
            .text(d => {
                let tooltip = `${d.data.name}`;
                if (d.data.tier) tooltip += `\nTier: ${d.data.tier}`;
                if (d.data.constructionTime) tooltip += `\nTime: ${Math.round(d.data.constructionTime / 60)}m`;
                if (d.data.missing) tooltip += `\nStatus: Missing Recipe`;
                if (d.data.quantity) tooltip += `\nQuantity: ${d.data.quantity}`;
                return tooltip;
            });

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

    }, [data]);

    return (
        <div className="dependency-graph">
            <div className="graph-controls">
                <div className="legend">
                    <div className="legend-item">
                        <div className="legend-color recipe-node"></div>
                        <span>Recipe</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color missing-node"></div>
                        <span>Missing</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color raw-resource"></div>
                        <span>Raw Resource</span>
                    </div>
                </div>
            </div>
            <svg ref={svgRef} className="dependency-svg"></svg>
        </div>
    );
};

export default DependencyGraph; 