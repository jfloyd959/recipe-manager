import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { recipeReducer, initialState } from './recipeReducer';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { loadCSVFromPublic } from '../utils/csvLoader';
import { loadPotentialComponents } from '../utils/potentialComponentsLoader';

const RecipeContext = createContext();

export const RecipeProvider = ({ children }) => {
    const [state, dispatch] = useReducer(recipeReducer, initialState);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            console.log('RecipeContext: Starting data load...');
            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                // Always load CSV data as the base dataset
                console.log('RecipeContext: Loading base CSV data...');
                const csvData = await loadCSVFromPublic();
                if (!csvData) {
                    console.error('RecipeContext: Failed to load CSV data');
                    dispatch({ type: 'SET_ERROR', payload: 'Failed to load CSV data' });
                    return;
                }

                console.log('RecipeContext: Base CSV data loaded successfully');
                dispatch({ type: 'LOAD_CSV_DATA', payload: csvData });

                // Then try to load and apply saved modifications from localStorage
                const savedData = loadFromStorage('recipe-data');
                console.log('RecipeContext: Saved modifications from localStorage:', savedData);

                if (savedData && (savedData.components?.length > 0 || savedData.recipes?.length > 0)) {
                    console.log('RecipeContext: Applying saved modifications');

                    // Apply saved recipes
                    if (savedData.recipes?.length > 0) {
                        savedData.recipes.forEach(recipe => {
                            dispatch({ type: 'ADD_RECIPE', payload: recipe });
                        });
                    }

                    // Apply saved components
                    if (savedData.components?.length > 0) {
                        savedData.components.forEach(component => {
                            dispatch({ type: 'ADD_COMPONENT', payload: component });
                        });
                    }

                    // Apply saved raw resources
                    if (savedData.rawResources?.length > 0) {
                        savedData.rawResources.forEach(rawResource => {
                            dispatch({ type: 'ADD_RAW_RESOURCE', payload: rawResource });
                        });
                    }
                } else {
                    console.log('RecipeContext: No saved modifications found');
                }

                // Always load potential components (they're not saved to localStorage)
                // console.log('RecipeContext: Loading potential components...');
                // const potentialComponents = await loadPotentialComponents();
                // dispatch({ type: 'LOAD_POTENTIAL_COMPONENTS', payload: potentialComponents });

            } catch (error) {
                console.error('RecipeContext: Error loading data:', error);
                dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        loadData();
    }, []);

    // Save to localStorage whenever state changes (but not potential components)
    // Only save modified recipes and user changes, not the entire dataset
    useEffect(() => {
        // Only save if we have actual user modifications, not just loaded data
        const hasUserModifications = state.recipes.some(recipe => recipe.modified) ||
            state.components.some(comp => comp.modified);

        if (hasUserModifications) {
            console.log('RecipeContext: Saving user modifications to localStorage');
            try {
                // Only save modified recipes and essential components to avoid quota issues
                const modifiedRecipes = state.recipes.filter(recipe => recipe.modified);
                const modifiedComponents = state.components.filter(comp => comp.modified);

                const dataToSave = {
                    recipes: modifiedRecipes,
                    components: modifiedComponents,
                    // Don't save large datasets like finals, ingredients, rawResources
                };

                saveToStorage('recipe-data', dataToSave);
            } catch (error) {
                console.warn('RecipeContext: Failed to save to localStorage (quota exceeded):', error);
                // Clear old data and try to save minimal data
                try {
                    localStorage.removeItem('recipe-data');
                    const minimalData = {
                        recipes: state.recipes.filter(recipe => recipe.modified).slice(0, 10), // Only first 10 modified
                        components: []
                    };
                    saveToStorage('recipe-data', minimalData);
                } catch (secondError) {
                    console.warn('RecipeContext: Even minimal save failed, disabling localStorage');
                }
            }
        }
    }, [state.recipes, state.components]);

    const value = {
        state,
        dispatch,
        // Expose all recipes for analysis (combines all recipe types)
        recipes: [
            ...state.recipes,
            ...state.components,
            ...state.ingredients,
            ...state.finals,
            ...state.rawResources
        ],
        // Helper functions
        addComponent: (component) => dispatch({ type: 'ADD_COMPONENT', payload: component }),
        addRawResource: (rawResource) => dispatch({ type: 'ADD_RAW_RESOURCE', payload: rawResource }),
        updateComponent: (component) => dispatch({ type: 'UPDATE_COMPONENT', payload: component }),
        deleteComponent: (id) => dispatch({ type: 'DELETE_COMPONENT', payload: id }),
        moveToComponents: (id) => dispatch({ type: 'MOVE_POTENTIAL_TO_COMPONENT', payload: id }),
        // Recipe management functions
        addRecipe: (recipe) => dispatch({ type: 'ADD_RECIPE', payload: recipe }),
        updateRecipe: (recipe) => dispatch({ type: 'UPDATE_RECIPE', payload: recipe }),
        selectRecipe: (recipe) => dispatch({ type: 'SELECT_RECIPE', payload: recipe }),
        reloadFromCSV: async () => {
            console.log('RecipeContext: Manual CSV reload requested');
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const csvData = await loadCSVFromPublic();
                if (csvData) {
                    dispatch({ type: 'LOAD_CSV_DATA', payload: csvData });
                }

                // Also reload potential components
                // const potentialComponents = await loadPotentialComponents();
                // dispatch({ type: 'LOAD_POTENTIAL_COMPONENTS', payload: potentialComponents });
            } catch (error) {
                dispatch({ type: 'SET_ERROR', payload: 'Failed to reload CSV data' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
    };

    return (
        <RecipeContext.Provider value={value}>
            {children}
        </RecipeContext.Provider>
    );
};

export const useRecipes = () => {
    const context = useContext(RecipeContext);
    if (!context) {
        throw new Error('useRecipes must be used within a RecipeProvider');
    }
    return context;
}; 