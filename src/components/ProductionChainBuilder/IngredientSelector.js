import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const IngredientSelector = ({
    availableResources,
    onAddIngredient,
    onCreateNewComponent,
    placeholder = "Search ingredients...",
    compact = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
    const [functionalPurposeFilter, setFunctionalPurposeFilter] = useState('all');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Get unique resource types and functional purposes for filters
    const resourceTypes = [...new Set(availableResources.map(r => r.type || r.category))].sort();
    const functionalPurposes = [...new Set(availableResources.map(r => r.functionalPurpose || 'Unknown'))].sort();

    // Filter resources based on search term and filters
    const filteredResources = availableResources.filter(resource => {
        const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = resourceTypeFilter === 'all' ||
            resource.type === resourceTypeFilter ||
            resource.category === resourceTypeFilter;
        const matchesPurpose = functionalPurposeFilter === 'all' ||
            resource.functionalPurpose === functionalPurposeFilter;

        return matchesSearch && matchesType && matchesPurpose;
    }).slice(0, 15); // Increased limit for better filtering

    // Check if we should show "Create new component" option
    const showCreateOption = searchTerm.length > 2 &&
        filteredResources.length === 0 &&
        onCreateNewComponent &&
        !availableResources.some(r => r.name.toLowerCase() === searchTerm.toLowerCase());

    // Calculate dropdown position
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 2,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Handle ingredient selection
    const handleSelect = (resourceName) => {
        console.log('IngredientSelector: handleSelect called with:', resourceName);

        onAddIngredient(resourceName);
        setSearchTerm('');
        setShowDropdown(false);
        setSelectedIndex(-1);

        if (inputRef.current) {
            inputRef.current.blur();
        }

        console.log('IngredientSelector: selection completed');
    };

    // Handle creating a new component
    const handleCreateNew = (componentName) => {
        console.log('IngredientSelector: handleCreateNew called with:', componentName);

        if (onCreateNewComponent) {
            // Create the new component
            const newComponent = onCreateNewComponent(componentName, 'COMPONENT', 1);

            // Add it to the current recipe
            onAddIngredient(componentName);
        }

        setSearchTerm('');
        setShowDropdown(false);
        setSelectedIndex(-1);

        if (inputRef.current) {
            inputRef.current.blur();
        }

        console.log('IngredientSelector: new component creation completed');
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        const totalItems = filteredResources.length + (showCreateOption ? 1 : 0);
        if (!showDropdown || totalItems === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < totalItems - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    if (selectedIndex < filteredResources.length) {
                        // Select existing resource
                        handleSelect(filteredResources[selectedIndex].name);
                    } else if (showCreateOption) {
                        // Create new component
                        handleCreateNew(searchTerm);
                    }
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is within the container
            const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);

            // Check if click is within the dropdown portal
            const isInsideDropdown = event.target.closest('.ingredients-dropdown-portal');

            // Only close if click is truly outside both elements
            if (!isInsideContainer && !isInsideDropdown) {
                setShowDropdown(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update position when dropdown opens
    useEffect(() => {
        if (showDropdown) {
            updateDropdownPosition();
            const handleResize = () => updateDropdownPosition();
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleResize);
            };
        }
    }, [showDropdown]);

    // Dropdown component that will be portaled
    const DropdownPortal = () => {
        if (!showDropdown || !searchTerm || (filteredResources.length === 0 && !showCreateOption)) return null;

        return createPortal(
            <div
                className="ingredients-dropdown-portal"
                style={{
                    position: 'absolute',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: Math.max(dropdownPosition.width, 300),
                    zIndex: 999999
                }}
            >
                <div className="dropdown-header">
                    <span className="results-count">
                        {filteredResources.length} results {showCreateOption ? '+ 1 new' : ''}
                    </span>
                    <div className="dropdown-filters">
                        <select
                            value={resourceTypeFilter}
                            onChange={(e) => setResourceTypeFilter(e.target.value)}
                            className="filter-select small"
                        >
                            <option value="all">All Types</option>
                            {resourceTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <select
                            value={functionalPurposeFilter}
                            onChange={(e) => setFunctionalPurposeFilter(e.target.value)}
                            className="filter-select small"
                        >
                            <option value="all">All Purposes</option>
                            {functionalPurposes.map(purpose => (
                                <option key={purpose} value={purpose}>{purpose}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="dropdown-results">
                    {filteredResources.map((resource, index) => (
                        <div
                            key={resource.name}
                            className={`dropdown-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSelect(resource.name);
                            }}
                        >
                            <div className="item-main">
                                <span className="item-name">{resource.name}</span>
                                <div className="item-badges">
                                    <span className={`tier-badge tier-${resource.tier}`}>
                                        T{resource.tier}
                                    </span>
                                    {resource.type === 'raw' && (
                                        <span className="raw-indicator">RAW</span>
                                    )}
                                </div>
                            </div>
                            <div className="item-meta">
                                <span className="item-type">{resource.category}</span>
                                <span className="item-purpose">{resource.functionalPurpose || 'Unknown'}</span>
                            </div>
                        </div>
                    ))}

                    {/* Create new component option */}
                    {showCreateOption && (
                        <div
                            className={`dropdown-item create-new-item ${filteredResources.length === selectedIndex ? 'selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleCreateNew(searchTerm);
                            }}
                        >
                            <div className="item-main">
                                <span className="item-name">
                                    ✨ Create new component: "{searchTerm}"
                                </span>
                                <div className="item-badges">
                                    <span className="new-indicator">NEW</span>
                                </div>
                            </div>
                            <div className="item-meta">
                                <span className="item-type">COMPONENT</span>
                                <span className="item-purpose">Will be added to system</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>,
            document.body
        );
    };

    return (
        <div className={`ingredient-selector ${compact ? 'compact' : ''}`} ref={containerRef}>
            <div className="selector-inputs">
                <div className="search-input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(true);
                            setSelectedIndex(-1);
                        }}
                        onFocus={() => {
                            setShowDropdown(true);
                            updateDropdownPosition();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="ingredient-search enhanced"
                    />
                </div>
            </div>

            <DropdownPortal />
        </div>
    );
};

export default IngredientSelector; 