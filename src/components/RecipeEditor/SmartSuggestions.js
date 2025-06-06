import React, { useMemo } from 'react';
import { generateSuggestions } from '../../utils/suggestions';
import './SmartSuggestions.css';

const SmartSuggestions = ({ recipe, components, onApplySuggestion }) => {
    const suggestions = useMemo(() => {
        return generateSuggestions(recipe, components);
    }, [recipe, components]);

    if (suggestions.length === 0) {
        return (
            <div className="card smart-suggestions">
                <h3>💡 Smart Suggestions</h3>
                <p className="no-suggestions">No suggestions available. Try adding a component name or ingredients.</p>
            </div>
        );
    }

    return (
        <div className="card smart-suggestions">
            <h3>💡 Smart Suggestions</h3>

            {suggestions.map((suggestion, index) => (
                <div key={index} className="suggestion-item">
                    <div className="suggestion-header">
                        <span className="suggestion-type">{suggestion.type}</span>
                        <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                    </div>

                    <div className="suggestion-content">
                        <p className="suggestion-description">{suggestion.description}</p>

                        {suggestion.changes && (
                            <div className="suggested-changes">
                                {Object.entries(suggestion.changes).map(([field, value]) => (
                                    <div key={field} className="change-item">
                                        <strong>{field}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => onApplySuggestion(suggestion.changes)}
                        className="apply-suggestion"
                        disabled={suggestion.confidence < 0.6}
                    >
                        Apply Suggestion
                    </button>
                </div>
            ))}
        </div>
    );
};

export default SmartSuggestions; 