export const buildDependencyGraph = (targetItem, recipes) => {
    const visited = new Set();
    const recipeMap = new Map();

    // Create a map for quick recipe lookup
    recipes.forEach(recipe => {
        recipeMap.set(recipe.outputName, recipe);
    });

    const buildNode = (itemName, depth = 0) => {
        if (visited.has(itemName) || depth > 10) { // Prevent infinite loops
            return { name: itemName, isCircular: true };
        }

        visited.add(itemName);
        const recipe = recipeMap.get(itemName);

        if (!recipe) {
            return {
                name: itemName,
                type: 'raw_resource',
                missing: true,
                depth
            };
        }

        const node = {
            id: recipe.id,
            name: recipe.outputName,
            type: recipe.outputType,
            tier: recipe.outputTier,
            constructionTime: recipe.constructionTime,
            functionalPurpose: recipe.functionalPurpose,
            dependencies: [],
            depth,
            totalIngredients: recipe.ingredients.length
        };

        // Build dependencies recursively
        recipe.ingredients.forEach(ingredient => {
            const depNode = buildNode(ingredient.name, depth + 1);
            depNode.quantity = ingredient.quantity;
            node.dependencies.push(depNode);
        });

        visited.delete(itemName); // Allow revisiting in other branches
        return node;
    };

    return buildNode(targetItem);
};

export const findCircularDependencies = (recipes) => {
    const circularDeps = [];
    const recipeMap = new Map();

    recipes.forEach(recipe => {
        recipeMap.set(recipe.outputName, recipe);
    });

    const checkCircular = (itemName, path = [], visited = new Set()) => {
        if (path.includes(itemName)) {
            circularDeps.push([...path, itemName]);
            return;
        }

        if (visited.has(itemName)) return;
        visited.add(itemName);

        const recipe = recipeMap.get(itemName);
        if (!recipe) return;

        recipe.ingredients.forEach(ingredient => {
            checkCircular(ingredient.name, [...path, itemName], visited);
        });
    };

    recipes.forEach(recipe => {
        checkCircular(recipe.outputName);
    });

    return circularDeps;
};

export const calculateCriticalPath = (dependencyData) => {
    const criticalPath = [];

    const findLongestPath = (node, currentPath = []) => {
        const newPath = [...currentPath, node];

        if (!node.dependencies || node.dependencies.length === 0) {
            return newPath;
        }

        let longestPath = newPath;
        let maxTime = node.constructionTime || 0;

        node.dependencies.forEach(dep => {
            const depPath = findLongestPath(dep, newPath);
            const depTime = depPath.reduce((sum, n) => sum + (n.constructionTime || 0), 0);

            if (depTime > maxTime) {
                maxTime = depTime;
                longestPath = depPath;
            }
        });

        return longestPath;
    };

    return findLongestPath(dependencyData);
}; 