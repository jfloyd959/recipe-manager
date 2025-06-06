const initialState = {
    recipes: [],
    finals: [],
    ingredients: [],
    components: [],
    rawResources: [],
    potentialComponents: [],
    selectedRecipe: null,
    isLoading: false,
    error: null
};

export const recipeReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };

        case 'LOAD_CSV_DATA':
            return {
                ...state,
                recipes: action.payload.recipes || [],
                finals: action.payload.finals || [],
                ingredients: action.payload.ingredients || [],
                components: action.payload.components || [],
                rawResources: action.payload.rawResources || [],
                isLoading: false,
                error: null
            };

        case 'LOAD_POTENTIAL_COMPONENTS':
            return {
                ...state,
                potentialComponents: action.payload,
                isLoading: false,
                error: null
            };

        case 'ADD_RECIPE':
            return {
                ...state,
                recipes: [...state.recipes, { ...action.payload, id: action.payload.id || generateId() }]
            };

        case 'UPDATE_RECIPE':
            return {
                ...state,
                recipes: state.recipes.map(recipe =>
                    recipe.id === action.payload.id
                        ? { ...action.payload, modified: true }
                        : recipe
                ),
                selectedRecipe: action.payload
            };

        case 'SELECT_RECIPE':
            return {
                ...state,
                selectedRecipe: action.payload
            };

        case 'ADD_COMPONENT':
            return {
                ...state,
                components: [...state.components, { ...action.payload, id: generateId(), modified: true }]
            };

        case 'ADD_RAW_RESOURCE':
            return {
                ...state,
                rawResources: [...state.rawResources, { ...action.payload, id: action.payload.id || generateId(), modified: true }]
            };

        case 'UPDATE_COMPONENT':
            return {
                ...state,
                components: state.components.map(comp =>
                    comp.id === action.payload.id ? action.payload : comp
                )
            };

        case 'DELETE_COMPONENT':
            return {
                ...state,
                components: state.components.filter(comp => comp.id !== action.payload)
            };

        case 'MOVE_POTENTIAL_TO_COMPONENT':
            const potentialComponent = state.potentialComponents.find(comp => comp.id === action.payload);
            if (!potentialComponent) return state;

            return {
                ...state,
                components: [...state.components, { ...potentialComponent, isPotential: false, isFinalized: true }],
                potentialComponents: state.potentialComponents.filter(comp => comp.id !== action.payload)
            };

        default:
            return state;
    }
};

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export { initialState }; 