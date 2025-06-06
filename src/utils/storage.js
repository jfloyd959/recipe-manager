export const exportToJSON = (data) => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `recipe-data-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

export const exportToCSV = (recipes) => {
    if (!recipes || recipes.length === 0) {
        alert('No recipes to export');
        return;
    }

    const headers = ['Name', 'Description', 'Ingredients', 'Instructions', 'PrepTime', 'CookTime', 'Servings'];
    const csvContent = [
        headers.join(','),
        ...recipes.map(recipe => [
            `"${recipe.name || ''}"`,
            `"${recipe.description || ''}"`,
            `"${recipe.ingredients ? recipe.ingredients.map(ing => `${ing.name}: ${ing.amount} ${ing.unit}`).join('; ') : ''}"`,
            `"${recipe.instructions || ''}"`,
            `"${recipe.prepTime || ''}"`,
            `"${recipe.cookTime || ''}"`,
            `"${recipe.servings || ''}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `recipes-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const importFromJSON = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
};

export const saveToLocalStorage = (key, data) => {
    try {
        const dataSize = JSON.stringify(data).length;
        console.log(`Attempting to save ${dataSize} characters to localStorage key: ${key}`);

        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Successfully saved to localStorage key: ${key}`);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn(`localStorage quota exceeded for key: ${key}. Data size: ${JSON.stringify(data).length} characters`);

            // Try to clear some space by removing old recipe data
            try {
                localStorage.removeItem(key);
                console.log(`Cleared existing data for key: ${key}, retrying with new data...`);
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (retryError) {
                console.error(`Failed to save even after clearing space for key: ${key}`, retryError);
                return false;
            }
        } else {
            console.error(`Error saving to localStorage for key: ${key}:`, error);
            return false;
        }
    }
};

export const loadFromLocalStorage = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
};

// Aliases for RecipeContext compatibility
export const saveToStorage = saveToLocalStorage;
export const loadFromStorage = loadFromLocalStorage; 