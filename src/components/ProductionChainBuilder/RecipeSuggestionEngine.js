import React, { useState, useEffect } from 'react';

const RecipeSuggestionEngine = ({ selectedIngredient, onApplySuggestion, isVisible, onClose }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Countermeasure types mapping from the MD files
    const countermeasureTypes = {
        'Decoy': {
            baseIngredients: [
                { name: 'Holographic Projector', type: 'ELECTRONIC_COMPONENT', tier: 2 },
                { name: 'Signal Mimicry', type: 'ELECTRONIC_COMPONENT', tier: 3 },
                { name: 'Power Source', type: 'ENERGY_MATERIAL', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Defense Layer Integration', type: 'DEFENSIVE_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Defensive Coordination Node', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Defense Matrix', type: 'DEFENSIVE_MATERIAL', tier: 4 }],
                CLASS8: [{ name: 'Planetary Defense Grid', type: 'DEFENSIVE_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Defense Network', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        },
        'Energy Capacitor': {
            baseIngredients: [
                { name: 'Charge Capacitor', type: 'ENERGY_MATERIAL', tier: 3 },
                { name: 'Energy Regulator', type: 'ELECTRONIC_COMPONENT', tier: 2 },
                { name: 'Discharge Control', type: 'ELECTRONIC_COMPONENT', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Power Distribution Network', type: 'ENERGY_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Energy Regulation System', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Power Matrix', type: 'ENERGY_MATERIAL', tier: 5 }],
                CLASS8: [{ name: 'Gigascale Power Grid', type: 'ENERGY_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Energy Core', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        },
        'Fire Suppressor': {
            baseIngredients: [
                { name: 'Suppression Agent', type: 'CHEMICAL_MATERIAL', tier: 2 },
                { name: 'Deployment System', type: 'MECHANICAL_COMPONENT', tier: 2 },
                { name: 'Trigger Mechanism', type: 'ELECTRONIC_COMPONENT', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Defense Layer Integration', type: 'DEFENSIVE_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Defensive Coordination Node', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Defense Matrix', type: 'DEFENSIVE_MATERIAL', tier: 4 }],
                CLASS8: [{ name: 'Planetary Defense Grid', type: 'DEFENSIVE_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Defense Network', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        },
        'Flare': {
            baseIngredients: [
                { name: 'Pyrotechnic Charge', type: 'CHEMICAL_MATERIAL', tier: 2 },
                { name: 'Deployment System', type: 'MECHANICAL_COMPONENT', tier: 2 },
                { name: 'Ignition System', type: 'ELECTRONIC_COMPONENT', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Defense Layer Integration', type: 'DEFENSIVE_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Defensive Coordination Node', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Defense Matrix', type: 'DEFENSIVE_MATERIAL', tier: 4 }],
                CLASS8: [{ name: 'Planetary Defense Grid', type: 'DEFENSIVE_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Defense Network', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        },
        'Healing Nanobots': {
            baseIngredients: [
                { name: 'Repair Nanobots', type: 'NANITE_MATERIAL', tier: 3 },
                { name: 'Medical Protocol', type: 'BIO_MATTER', tier: 3 },
                { name: 'Bio Interface', type: 'BIO_MATTER', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Defense Layer Integration', type: 'DEFENSIVE_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Defensive Coordination Node', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Defense Matrix', type: 'DEFENSIVE_MATERIAL', tier: 4 }],
                CLASS8: [{ name: 'Planetary Defense Grid', type: 'DEFENSIVE_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Defense Network', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        },
        'Faraday Shielding': {
            baseIngredients: [
                { name: 'Conductive Mesh', type: 'ELECTROMAGNETIC_MATERIAL', tier: 2 },
                { name: 'Grounding System', type: 'ELECTRONIC_COMPONENT', tier: 2 },
                { name: 'Insulation Layer', type: 'INSULATION_MATERIAL', tier: 2 }
            ],
            scalingIngredients: {
                L: [{ name: 'Defense Layer Integration', type: 'DEFENSIVE_MATERIAL', tier: 3 }],
                CAP: [{ name: 'Defensive Coordination Node', type: 'ELECTRONIC_COMPONENT', tier: 4 }],
                CMD: [{ name: 'Advanced Defense Matrix', type: 'DEFENSIVE_MATERIAL', tier: 4 }],
                CLASS8: [{ name: 'Planetary Defense Grid', type: 'DEFENSIVE_MATERIAL', tier: 5 }],
                TTN: [{ name: 'Titan Defense Network', type: 'EXOTIC_MATTER', tier: 5 }]
            }
        }
    };

    // Bomb types from BOMBS.md
    const bombTypes = {
        'Fimbul ECOS - Explosive - XS': {
            ingredients: [
                { name: 'High-Explosive Charge', type: 'ENERGY_MATERIAL', tier: 3 },
                { name: 'Precision Detonator', type: 'ELECTRONIC_COMPONENT', tier: 3 },
                { name: 'Lightweight Casing', type: 'STRUCTURAL_ALLOY', tier: 2 },
                { name: 'Basic Guidance Unit', type: 'ELECTRONIC_COMPONENT', tier: 2 }
            ]
        },
        'Fimbul ECOS - Explosive - L': {
            ingredients: [
                { name: 'Massive Explosive Core', type: 'ENERGY_MATERIAL', tier: 4 },
                { name: 'Advanced Detonator', type: 'ELECTRONIC_COMPONENT', tier: 4 },
                { name: 'Reinforced Bomb Casing', type: 'STRUCTURAL_ALLOY', tier: 3 },
                { name: 'Advanced Guidance System', type: 'ELECTRONIC_COMPONENT', tier: 3 }
            ]
        },
        'Fimbul ECOS - Terrabomb - XS': {
            ingredients: [
                { name: 'Terraform Explosive', type: 'EXOTIC_ELEMENT', tier: 4 },
                { name: 'Environmental Controller', type: 'BIO_MATTER', tier: 3 },
                { name: 'Terra-Class Casing', type: 'STRUCTURAL_ALLOY', tier: 3 },
                { name: 'Strategic Targeting', type: 'ELECTRONIC_COMPONENT', tier: 3 }
            ]
        },
        'Fimbul ECOS - Terrabomb - L': {
            ingredients: [
                { name: 'Mega Terraform Core', type: 'EXOTIC_ELEMENT', tier: 5 },
                { name: 'Biosphere Processor', type: 'BIO_MATTER', tier: 4 },
                { name: 'Planetary Casing', type: 'STRUCTURAL_ALLOY', tier: 4 },
                { name: 'Continental Guidance', type: 'ELECTRONIC_COMPONENT', tier: 4 }
            ]
        }
    };

    // Common component patterns
    const componentPatterns = {
        'Electronics': {
            ingredients: [
                { name: 'Silicon Crystal', tier: 0, source: 'Dark Planet' },
                { name: 'Copper Ore', tier: 0, source: 'Barren Planet' },
                { name: 'Assembly Process', tier: 1 }
            ]
        },
        'Circuit Board': {
            ingredients: [
                { name: 'Silicon Crystal', tier: 0, source: 'Dark Planet' },
                { name: 'Copper Ore', tier: 0, source: 'Barren Planet' },
                { name: 'Silver Ore', tier: 0, source: 'Dark Planet' },
                { name: 'Quartz Crystals', tier: 0, source: 'System Asteroid Belt' }
            ]
        },
        'Power Amplifier': {
            ingredients: [
                { name: 'Hafnium Ore', tier: 0, source: 'Volcanic Planet' },
                { name: 'Tantalum Ore', tier: 0, source: 'Volcanic Planet' },
                { name: 'Silicon Crystal', tier: 0, source: 'Dark Planet' }
            ]
        },
        'Energy Core': {
            ingredients: [
                { name: 'Lumanite', tier: 0, source: 'Volcanic Planet' },
                { name: 'Ruby Crystals', tier: 0, source: 'Ice Giant' },
                { name: 'Copper Ore', tier: 0, source: 'Barren Planet' }
            ]
        }
    };

    useEffect(() => {
        if (selectedIngredient && isVisible) {
            generateSuggestions();
        }
    }, [selectedIngredient, isVisible]);

    const generateSuggestions = () => {
        setLoading(true);

        setTimeout(() => {
            const newSuggestions = [];

            // Check if it's a countermeasure
            const countermeasureMatch = checkCountermeasurePattern(selectedIngredient);
            if (countermeasureMatch) {
                newSuggestions.push(countermeasureMatch);
            }

            // Check if it's a bomb
            const bombMatch = checkBombPattern(selectedIngredient);
            if (bombMatch) {
                newSuggestions.push(bombMatch);
            }

            // Check if it's a common component
            const componentMatch = checkComponentPattern(selectedIngredient);
            if (componentMatch) {
                newSuggestions.push(componentMatch);
            }

            // Generate tier-based suggestions
            const tierSuggestions = generateTierBasedSuggestions(selectedIngredient);
            newSuggestions.push(...tierSuggestions);

            setSuggestions(newSuggestions);
            setLoading(false);
        }, 500);
    };

    const checkCountermeasurePattern = (ingredientName) => {
        // Check for countermeasure patterns like "Decoy - XXXS - T1"
        const countermeasureRegex = /^(.*?)\s*-\s*(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)\s*-?\s*T?(\d)?/i;
        const match = ingredientName.match(countermeasureRegex);

        if (match) {
            const [, baseType, size, tier] = match;
            const cleanType = baseType.trim();

            const typeData = countermeasureTypes[cleanType];
            if (typeData) {
                const ingredients = [...typeData.baseIngredients];

                // Add scaling ingredients for larger sizes
                if (['L', 'CAP', 'CMD', 'CLASS8', 'TTN'].includes(size)) {
                    const scalingData = typeData.scalingIngredients[size];
                    if (scalingData) {
                        ingredients.push(...scalingData);
                    }
                }

                // Adjust tiers based on input tier
                const targetTier = tier ? parseInt(tier) : 1;
                const adjustedIngredients = ingredients.map(ing => ({
                    ...ing,
                    quantity: 1,
                    tier: Math.max(1, ing.tier + targetTier - 2)
                }));

                return {
                    type: 'Countermeasure Recipe',
                    confidence: 0.95,
                    source: 'MD File Analysis',
                    recipe: {
                        outputName: ingredientName,
                        outputType: 'COUNTERMEASURES',
                        outputTier: targetTier,
                        constructionTime: calculateConstructionTime(size, targetTier),
                        ingredients: adjustedIngredients
                    },
                    explanation: `Based on ${cleanType} countermeasure pattern with ${size} scaling`
                };
            }
        }

        return null;
    };

    const checkBombPattern = (ingredientName) => {
        const bombData = bombTypes[ingredientName];
        if (bombData) {
            return {
                type: 'Bomb Recipe',
                confidence: 0.9,
                source: 'BOMBS.md',
                recipe: {
                    outputName: ingredientName,
                    outputType: 'BOMBS',
                    outputTier: Math.max(...bombData.ingredients.map(ing => ing.tier)),
                    constructionTime: 300,
                    ingredients: bombData.ingredients.map(ing => ({ ...ing, quantity: 1 }))
                },
                explanation: 'Direct match from BOMBS.md specifications'
            };
        }

        return null;
    };

    const checkComponentPattern = (ingredientName) => {
        const componentData = componentPatterns[ingredientName];
        if (componentData) {
            return {
                type: 'Component Recipe',
                confidence: 0.8,
                source: 'Component Patterns',
                recipe: {
                    outputName: ingredientName,
                    outputType: 'COMPONENT',
                    outputTier: 2,
                    constructionTime: 120,
                    ingredients: componentData.ingredients.map(ing => ({ ...ing, quantity: 1 }))
                },
                explanation: 'Based on common component manufacturing patterns'
            };
        }

        return null;
    };

    const generateTierBasedSuggestions = (ingredientName) => {
        const suggestions = [];

        // Suggest based on naming patterns
        if (ingredientName.includes('Advanced')) {
            suggestions.push({
                type: 'Tier-based Suggestion',
                confidence: 0.6,
                source: 'Naming Pattern',
                recipe: {
                    outputName: ingredientName,
                    outputType: 'COMPONENT',
                    outputTier: 3,
                    constructionTime: 180,
                    ingredients: [
                        { name: 'Electronics', type: 'COMPONENT', tier: 2, quantity: 2 },
                        { name: 'Circuit Board', type: 'COMPONENT', tier: 2, quantity: 1 },
                        { name: 'Advanced Processing', type: 'COMPONENT', tier: 2, quantity: 1 }
                    ]
                },
                explanation: '"Advanced" typically indicates Tier 3 components requiring multiple T2 inputs'
            });
        }

        if (ingredientName.includes('Basic')) {
            suggestions.push({
                type: 'Tier-based Suggestion',
                confidence: 0.7,
                source: 'Naming Pattern',
                recipe: {
                    outputName: ingredientName,
                    outputType: 'COMPONENT',
                    outputTier: 1,
                    constructionTime: 60,
                    ingredients: [
                        { name: 'Iron Ore', tier: 0, source: 'Terrestrial Planet', quantity: 2 },
                        { name: 'Aluminum Ore', tier: 0, source: 'Terrestrial Planet', quantity: 1 }
                    ]
                },
                explanation: '"Basic" typically indicates Tier 1 components using raw materials'
            });
        }

        if (ingredientName.includes('Quantum')) {
            suggestions.push({
                type: 'Tier-based Suggestion',
                confidence: 0.8,
                source: 'Naming Pattern',
                recipe: {
                    outputName: ingredientName,
                    outputType: 'COMPONENT',
                    outputTier: 4,
                    constructionTime: 300,
                    ingredients: [
                        { name: 'Quantum Computational Substrate', tier: 0, source: 'Dark Planet', quantity: 1 },
                        { name: 'Viscovite Crystals', tier: 0, source: 'Dark Planet', quantity: 1 },
                        { name: 'Power Amplifier', type: 'COMPONENT', tier: 3, quantity: 1 }
                    ]
                },
                explanation: '"Quantum" indicates Tier 4+ exotic technology requiring rare materials'
            });
        }

        return suggestions;
    };

    const calculateConstructionTime = (size, tier) => {
        const baseTimes = {
            'XXXS': 30, 'XXS': 45, 'XS': 60, 'S': 90, 'M': 120,
            'L': 180, 'CAP': 300, 'CMD': 450, 'CLASS8': 600, 'TTN': 900
        };

        const baseTime = baseTimes[size] || 60;
        return baseTime * tier;
    };

    if (!isVisible) return null;

    return (
        <div className="recipe-suggestion-overlay">
            <div className="suggestion-modal">
                <div className="suggestion-header">
                    <h3>🤖 Recipe Suggestions for: {selectedIngredient}</h3>
                    <button onClick={onClose} className="close-suggestions">×</button>
                </div>

                <div className="suggestion-content">
                    {loading ? (
                        <div className="loading-suggestions">
                            <div className="spinner"></div>
                            <p>Analyzing MD files and generating suggestions...</p>
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="suggestions-list">
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="suggestion-card">
                                    <div className="suggestion-meta">
                                        <span className="suggestion-type">{suggestion.type}</span>
                                        <span className={`confidence confidence-${Math.round(suggestion.confidence * 100)}`}>
                                            {Math.round(suggestion.confidence * 100)}% confidence
                                        </span>
                                        <span className="suggestion-source">Source: {suggestion.source}</span>
                                    </div>

                                    <div className="suggestion-recipe">
                                        <div className="recipe-header">
                                            <strong>{suggestion.recipe.outputName}</strong>
                                            <span className={`tier-badge tier-${suggestion.recipe.outputTier}`}>
                                                T{suggestion.recipe.outputTier}
                                            </span>
                                            <span className="construction-time">
                                                ⏱️ {suggestion.recipe.constructionTime}s
                                            </span>
                                        </div>

                                        <div className="recipe-ingredients">
                                            <h4>Ingredients:</h4>
                                            {suggestion.recipe.ingredients.map((ing, idx) => (
                                                <div key={idx} className="ingredient-item">
                                                    <span className="ingredient-name">{ing.name}</span>
                                                    <span className="ingredient-quantity">({ing.quantity})</span>
                                                    {ing.tier !== undefined && (
                                                        <span className={`tier-badge tier-${ing.tier}`}>T{ing.tier}</span>
                                                    )}
                                                    {ing.source && (
                                                        <span className="ingredient-source">{ing.source}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="suggestion-explanation">
                                            <em>{suggestion.explanation}</em>
                                        </div>

                                        <button
                                            onClick={() => onApplySuggestion(suggestion.recipe)}
                                            className="apply-suggestion-btn"
                                        >
                                            ✅ Apply This Recipe
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-suggestions">
                            <p>No specific suggestions found for "{selectedIngredient}"</p>
                            <p>Try using the manual recipe builder or check if the ingredient name matches the patterns in the MD files.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeSuggestionEngine; 