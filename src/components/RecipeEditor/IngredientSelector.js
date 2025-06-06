import React, { useState } from 'react';
import './IngredientSelector.css';

const IngredientSelector = ({ ingredients, onAddIngredient, onRemoveIngredient, availableComponents, onAddNewComponent, onUpdateIngredients }) => {
    const [newIngredient, setNewIngredient] = useState({ name: '', quantity: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewComponentModal, setShowNewComponentModal] = useState(false);
    const [newComponent, setNewComponent] = useState({
        name: '',
        tier: 1,
        type: 'COMPONENT',
        planetSources: [],
        isRawResource: false
    });

    const planetTypes = [
        'Terrestrial Planet',
        'Barren Planet',
        'Dark Planet',
        'Volcanic Planet',
        'Ice Giant',
        'Gas Giant',
        'System Asteroid Belt',
        'Oceanic Planet'
    ];

    const filteredComponents = availableComponents.filter(component => {
        const componentName = typeof component === 'string' ? component : (component.name || component.outputName);
        return componentName &&
            typeof componentName === 'string' &&
            componentName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleAdd = () => {
        if (newIngredient.name && newIngredient.quantity > 0) {
            onAddIngredient(newIngredient);
            setNewIngredient({ name: '', quantity: 1 });
            setSearchTerm('');
        }
    };

    const handleQuickAdd = (component) => {
        const componentName = typeof component === 'string' ? component : component.name;
        if (componentName && typeof componentName === 'string') {
            onAddIngredient({ name: componentName, quantity: 1 });
            setSearchTerm('');
        }
    };

    const handleCreateNewComponent = () => {
        if (searchTerm && !filteredComponents.some(comp => {
            const compName = typeof comp === 'string' ? comp : (comp.name || comp.outputName);
            return compName && compName.toLowerCase() === searchTerm.toLowerCase();
        })) {
            setNewComponent(prev => ({ ...prev, name: searchTerm }));
            setShowNewComponentModal(true);
        }
    };

    const handleSaveNewComponent = () => {
        if (newComponent.name) {
            // Add to available components list if callback provided
            if (onAddNewComponent) {
                onAddNewComponent(newComponent);
            }

            // Add as ingredient
            onAddIngredient({ name: newComponent.name, quantity: 1 });

            // Reset and close modal
            setNewComponent({
                name: '',
                tier: 1,
                type: 'COMPONENT',
                planetSources: [],
                isRawResource: false
            });
            setShowNewComponentModal(false);
            setSearchTerm('');
        }
    };

    const togglePlanetSource = (planet) => {
        setNewComponent(prev => ({
            ...prev,
            planetSources: prev.planetSources.includes(planet)
                ? prev.planetSources.filter(p => p !== planet)
                : [...prev.planetSources, planet]
        }));
    };

    const handleDragStart = (e, component) => {
        const componentName = typeof component === 'string' ? component : component.name;
        if (componentName && typeof componentName === 'string') {
            e.dataTransfer.setData('text/plain', componentName);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const componentName = e.dataTransfer.getData('text/plain');
        if (componentName) {
            onAddIngredient({ name: componentName, quantity: 1 });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="ingredient-selector">
            <div className="add-ingredient">
                <div className="ingredient-input">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search or create new components..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setNewIngredient(prev => ({ ...prev, name: e.target.value }));
                            }}
                        />
                        {searchTerm && (
                            <div className="search-dropdown">
                                {filteredComponents.slice(0, 10).map((component, index) => {
                                    const componentName = typeof component === 'string' ? component : component.name;
                                    const componentTier = typeof component === 'object' ? component.tier : null;

                                    return (
                                        <div
                                            key={index}
                                            className="search-result"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, component)}
                                            onClick={() => handleQuickAdd(component)}
                                        >
                                            <div className="component-info">
                                                <span className="component-name">{componentName}</span>
                                                {componentTier && (
                                                    <span className={`tier-badge tier-${componentTier}`}>
                                                        T{componentTier}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="drag-hint">🔄</span>
                                        </div>
                                    );
                                })}

                                {/* Show "Create New" option if no exact match found */}
                                {searchTerm && !filteredComponents.some(comp => {
                                    const compName = typeof comp === 'string' ? comp : (comp.name || comp.outputName);
                                    return compName && compName.toLowerCase() === searchTerm.toLowerCase();
                                }) && (
                                        <div
                                            className="search-result create-new"
                                            onClick={handleCreateNewComponent}
                                        >
                                            <div className="component-info">
                                                <span className="component-name">✨ Create "{searchTerm}"</span>
                                                <span className="create-hint">New Component</span>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>

                    <input
                        type="number"
                        min="1"
                        value={newIngredient.quantity}
                        onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                        placeholder="Qty"
                        className="quantity-input"
                    />

                    <button onClick={handleAdd} disabled={!newIngredient.name}>
                        Add
                    </button>
                </div>
            </div>

            {/* New Component Modal */}
            {showNewComponentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Create New Component</h3>

                        <div className="form-group">
                            <label>Name:</label>
                            <input
                                type="text"
                                value={newComponent.name}
                                onChange={(e) => setNewComponent(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Component name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Type:</label>
                            <select
                                value={newComponent.type}
                                onChange={(e) => setNewComponent(prev => ({
                                    ...prev,
                                    type: e.target.value,
                                    isRawResource: e.target.value === 'RAW_RESOURCE'
                                }))}
                            >
                                <option value="COMPONENT">Component</option>
                                <option value="RAW_RESOURCE">Raw Resource</option>
                                <option value="ENERGY_MATERIAL">Energy Material</option>
                                <option value="ELECTRONIC_COMPONENT">Electronic Component</option>
                                <option value="MECHANICAL_COMPONENT">Mechanical Component</option>
                                <option value="CHEMICAL_MATERIAL">Chemical Material</option>
                                <option value="BIO_MATTER">Bio Matter</option>
                                <option value="EXOTIC_MATTER">Exotic Matter</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tier:</label>
                            <select
                                value={newComponent.tier}
                                onChange={(e) => setNewComponent(prev => ({ ...prev, tier: parseInt(e.target.value) }))}
                            >
                                <option value={1}>Tier 1</option>
                                <option value={2}>Tier 2</option>
                                <option value={3}>Tier 3</option>
                                <option value={4}>Tier 4</option>
                                <option value={5}>Tier 5</option>
                            </select>
                        </div>

                        {newComponent.isRawResource && (
                            <div className="form-group">
                                <label>Planet Sources:</label>
                                <div className="planet-selector">
                                    {planetTypes.map(planet => (
                                        <div key={planet} className="planet-option">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={newComponent.planetSources.includes(planet)}
                                                    onChange={() => togglePlanetSource(planet)}
                                                />
                                                {planet}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button onClick={handleSaveNewComponent} disabled={!newComponent.name}>
                                Create Component
                            </button>
                            <button onClick={() => setShowNewComponentModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="ingredient-drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <div className="drop-zone-header">
                    <h4>Recipe Ingredients</h4>
                    <span className="drop-hint">Drop components here or use search above</span>
                </div>

                <div className="ingredient-list">
                    {ingredients.length === 0 && (
                        <div className="empty-ingredients">
                            <p>No ingredients added yet</p>
                            <p className="help-text">Search for components above or drag them here</p>
                        </div>
                    )}

                    {ingredients.map((ingredient, index) => (
                        <div key={index} className="ingredient-item">
                            <div className="ingredient-content">
                                <span className="ingredient-name">{ingredient.name}</span>
                                <div className="ingredient-controls">
                                    <input
                                        type="number"
                                        min="1"
                                        value={ingredient.quantity}
                                        onChange={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 1;
                                            const updatedIngredients = ingredients.map((ing, i) =>
                                                i === index ? { ...ing, quantity: newQuantity } : ing
                                            );
                                            onUpdateIngredients(updatedIngredients);
                                        }}
                                        className="quantity-edit"
                                    />
                                    <span className="quantity-label">×</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onRemoveIngredient(index)}
                                className="remove-btn"
                                title="Remove ingredient"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IngredientSelector; 