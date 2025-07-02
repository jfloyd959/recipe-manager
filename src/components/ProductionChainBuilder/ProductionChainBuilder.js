import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import RecipeSuggestionEngine from './RecipeSuggestionEngine';
import ProductionChainTree from './ProductionChainTree';
import ResourceTooltip from './ResourceTooltip';
import './ProductionChainBuilder.css';

const ProductionChainBuilder = () => {
    const { state, addRecipe, updateRecipe, addComponent, addRawResource, updateComponent, reloadFromCSV } = useRecipes();
    const { recipes, components, rawResources, ingredients, loading, error } = state;

    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [currentProductionChain, setCurrentProductionChain] = useState(null);
    const [newRecipes, setNewRecipes] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [hoveredResource, setHoveredResource] = useState(null);
    const [showChainAnalysis, setShowChainAnalysis] = useState(false);
    const [filter, setFilter] = useState('all'); // Changed from 'missing' to 'all' to show all recipes
    const [outputTypeFilter, setOutputTypeFilter] = useState('all');
    const [suggestionsFor, setSuggestionsFor] = useState(null);
    const [showUsageAnalysis, setShowUsageAnalysis] = useState(false);
    const [selectedIngredientUsage, setSelectedIngredientUsage] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortBy, setSortBy] = useState('name'); // Add sorting state
    const [searchTerm, setSearchTerm] = useState(''); // Input field value
    const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Actually applied search filter

    // Column resizing state
    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Local loading state for async operations
    const [isLoadingProductionChain, setIsLoadingProductionChain] = useState(false);
    const [isAnalyzingChain, setIsAnalyzingChain] = useState(false);

    // Debounced search effect - only trigger search after user stops typing for 500ms
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setActiveSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Handle Enter key for immediate search
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setActiveSearchTerm(searchTerm);
        }
    };

    // Handle search clear
    const handleClearSearch = () => {
        setSearchTerm('');
        setActiveSearchTerm('');
    };

    // Helper function to extract ingredients from recipe format
    const extractIngredientsFromRecipe = (recipe) => {
        const ingredients = [];

        // Handle both new and old recipe formats
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            return recipe.ingredients.filter(ing => ing && ing.name);
        }

        // Handle old format with Ingredient1, Ingredient2, etc.
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            if (ingredient && ingredient.trim()) {
                ingredients.push({ name: ingredient.trim() });
            }
        }

        return ingredients;
    };

    // Column resizing functions
    const handleMouseDown = (e, columnIndex) => {
        // Only trigger resize if clicking near the right edge of the header
        const th = e.target.closest('th');
        if (!th) return;

        const rect = th.getBoundingClientRect();
        const rightEdgeThreshold = 8; // 8px from the right edge
        const distanceFromRightEdge = rect.right - e.clientX;

        // Only start resizing if clicking within the resize handle area
        if (distanceFromRightEdge > rightEdgeThreshold) {
            return; // Not clicking on resize handle
        }

        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        setResizingColumn(columnIndex);
        setStartX(e.clientX);
        setStartWidth(th.offsetWidth);

        // Add visual feedback
        th.classList.add('resizing');
        const table = th.closest('.production-chain-table');
        if (table) {
            table.classList.add('resizing');
        }

        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e) => {
        if (!isResizing || resizingColumn === null) return;

        e.preventDefault();
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px

        // Find the column header and update its width
        const table = document.querySelector('.production-chain-table');
        if (table) {
            const th = table.querySelectorAll('th')[resizingColumn];
            if (th) {
                th.style.width = newWidth + 'px';
                th.style.minWidth = newWidth + 'px';

                // Also update all cells in this column to maintain consistent width
                const columnCells = table.querySelectorAll(`td:nth-child(${resizingColumn + 1})`);
                columnCells.forEach(cell => {
                    cell.style.width = newWidth + 'px';
                    cell.style.minWidth = newWidth + 'px';
                });
            }
        }
    };

    const handleMouseUp = () => {
        if (!isResizing) return;

        setIsResizing(false);
        setResizingColumn(null);

        // Remove visual feedback
        const table = document.querySelector('.production-chain-table');
        if (table) {
            const resizingTh = table.querySelector('th.resizing');
            if (resizingTh) {
                resizingTh.classList.remove('resizing');
            }
            table.classList.remove('resizing');
        }

        // Restore normal cursor and text selection
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };

    // Add event listeners for column resizing
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, resizingColumn, startX, startWidth, handleMouseMove, handleMouseUp]);

    // Get all available resources with proper naming - Updated to work with CSV data
    const allResources = useMemo(() => {
        const resources = new Map();

        console.log('ProductionChainBuilder: Processing resources from recipes', {
            recipesCount: recipes.length,
            componentsCount: components.length,
            ingredientsCount: ingredients.length,
            rawResourcesCount: rawResources.length
        });

        // Debug: Show first few recipes
        if (recipes.length > 0) {
            console.log('First 3 recipes:', recipes.slice(0, 3).map(r => ({
                OutputName: r.OutputName,
                OutputType: r.OutputType,
                OutputTier: r.OutputTier,
                Ingredient1: r.Ingredient1,
                Ingredient2: r.Ingredient2
            })));

            // Debug: Find all photon missiles
            const photonMissiles = recipes.filter(r => r.OutputName && r.OutputName.toLowerCase().includes('photon missile'));
            console.log('=== PHOTON MISSILES DEBUG ===');
            console.log(`Found ${photonMissiles.length} photon missiles:`, photonMissiles.map(r => ({
                name: r.OutputName,
                type: r.OutputType,
                tier: r.OutputTier,
                hasIngredient1: !!r.Ingredient1,
                hasIngredient2: !!r.Ingredient2,
                ingredient1: r.Ingredient1,
                ingredient2: r.Ingredient2
            })));
        }

        // Process all recipes from CSV data
        recipes.forEach((recipe, index) => {
            const name = recipe.OutputName || recipe.outputName;
            if (name) {
                const outputType = recipe.OutputType || recipe.outputType || 'UNKNOWN';
                let resourceType = 'component'; // default

                // Determine resource type based on OutputType
                if (outputType === 'BASIC RESOURCE') {
                    resourceType = 'raw';
                } else if (outputType === 'INGREDIENT') {
                    resourceType = 'ingredient';
                } else {
                    resourceType = 'component';
                }

                resources.set(name, {
                    ...recipe,
                    name: name,
                    type: resourceType,
                    tier: recipe.OutputTier || recipe.outputTier || 1,
                    category: outputType,
                    outputType: outputType,
                    ingredients: extractIngredientsFromRecipe(recipe) // Extract ingredients from recipe format
                });

                // Debug log first few resources with more detail
                if (index < 5) {
                    console.log(`Resource ${index + 1} added:`, {
                        name,
                        outputType: outputType,
                        resourceType: resourceType,
                        tier: recipe.OutputTier || recipe.outputTier || 1,
                        ingredientsCount: extractIngredientsFromRecipe(recipe).length
                    });
                }
            }
        });

        // Also add legacy data if available (for backward compatibility)
        components.forEach((comp, index) => {
            const name = comp.outputName || comp.name;
            if (name && !resources.has(name)) {
                resources.set(name, {
                    ...comp,
                    name: name,
                    type: 'component',
                    tier: comp.outputTier || comp.tier || 1,
                    category: comp.outputType || comp.category || 'COMPONENT'
                });
            }
        });

        ingredients.forEach((ing, index) => {
            const name = ing.outputName || ing.name;
            if (name && !resources.has(name)) {
                resources.set(name, {
                    ...ing,
                    name: name,
                    type: 'ingredient',
                    tier: ing.outputTier || ing.tier || 1,
                    category: ing.outputType || ing.category || 'INGREDIENT'
                });
            }
        });

        rawResources.forEach((raw, index) => {
            const name = raw.outputName || raw.name;
            if (name && !resources.has(name)) {
                resources.set(name, {
                    ...raw,
                    name: name,
                    type: 'raw',
                    tier: raw.tier || raw.outputTier || 0,
                    category: 'BASIC RESOURCE'
                });
            }
        });

        const allResourcesArray = Array.from(resources.values()).sort((a, b) => a.name.localeCompare(b.name));
        console.log('ProductionChainBuilder: Total resources processed:', allResourcesArray.length);

        // Log sample resources to verify structure
        if (allResourcesArray.length > 0) {
            console.log('Sample resources:', allResourcesArray.slice(0, 3).map(r => ({
                name: r.name,
                type: r.type,
                outputType: r.outputType,
                tier: r.tier,
                ingredientsCount: r.ingredients?.length || 0
            })));
        }

        return allResourcesArray;
    }, [recipes, components, ingredients, rawResources]);

    // Get available output types for filtering
    const availableOutputTypes = useMemo(() => {
        const outputTypes = new Set();
        allResources.forEach(resource => {
            if (resource.outputType && resource.outputType !== 'BASIC RESOURCE') {
                outputTypes.add(resource.outputType);
            }
        });
        return ['all', ...Array.from(outputTypes).sort()];
    }, [allResources]);

    // Calculate completion status for an ingredient (recursive)
    const calculateCompletionStatus = (ingredientName, visited = new Set()) => {
        // Add debugging for Access Control specifically
        if (ingredientName === 'Access Control') {
            console.log('=== Access Control Debug ===');

            // Check for ingredient entries
            const ingredientEntries = ingredients.filter(ing => ing.name === ingredientName || (ing.outputName && ing.outputName === ingredientName));
            console.log('Ingredient entries found:', ingredientEntries.length, ingredientEntries);

            // Check for recipe entries
            const recipeEntries = recipes.filter(recipe => recipe.outputName === ingredientName);
            console.log('Recipe entries found:', recipeEntries.length, recipeEntries);

            // DETAILED RECIPE ANALYSIS
            recipeEntries.forEach((recipe, index) => {
                console.log(`Recipe ${index + 1} Details:`, {
                    id: recipe.id,
                    outputName: recipe.outputName,
                    ingredients: recipe.ingredients,
                    ingredientsLength: recipe.ingredients ? recipe.ingredients.length : 'undefined',
                    hasIngredients: recipe.ingredients && recipe.ingredients.length > 0,
                    completionStatus: recipe.completionStatus,
                    source: recipe.fromCSV ? 'CSV' : 'User'
                });

                if (recipe.ingredients && recipe.ingredients.length > 0) {
                    console.log(`Recipe ${index + 1} Ingredients Detail:`, recipe.ingredients);
                }
            });

            // Check allResources
            const allResourceEntries = allResources.filter(res => res.name === ingredientName);
            console.log('AllResources entries found:', allResourceEntries.length, allResourceEntries);

            // CHECK LOCALSTORAGE FOR SAVED RECIPES
            try {
                const savedData = localStorage.getItem('recipe-data');
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    console.log('LocalStorage data found:', parsedData);

                    // Check for Access Control in localStorage recipes
                    if (parsedData.recipes) {
                        const localACRecipes = parsedData.recipes.filter(r => r.outputName === ingredientName);
                        console.log('Access Control recipes in localStorage:', localACRecipes.length, localACRecipes);
                        localACRecipes.forEach((recipe, index) => {
                            console.log(`localStorage Recipe ${index + 1}:`, {
                                id: recipe.id,
                                ingredients: recipe.ingredients,
                                ingredientsLength: recipe.ingredients ? recipe.ingredients.length : 'undefined'
                            });
                        });
                    }
                }
            } catch (error) {
                console.log('Error reading localStorage:', error);
            }
        }

        if (visited.has(ingredientName)) {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: Circular dependency detected');
            }
            return 'circular';
        }

        visited.add(ingredientName);

        // Check if it's a raw material first
        const resource = allResources.find(r => r.name === ingredientName);
        if (!resource) {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: No resource found in allResources');
            }
            return 'missing';
        }

        if (resource.isRaw || resource.type === 'raw') {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: Is raw material');
            }
            return 'complete';
        }

        // Look for a recipe - prioritize recipes with ingredients over empty ones
        const allRecipes = recipes.filter(r => r.outputName === ingredientName);

        if (ingredientName === 'Access Control') {
            console.log('Access Control: All recipes found:', allRecipes);
            console.log('Access Control: Total recipes in system:', recipes.length);

            // Check if newRecipes are included
            console.log('Access Control: New recipes:', newRecipes);
            const newRecipesForAC = newRecipes.filter(r => r.outputName === ingredientName);
            console.log('Access Control: New recipes matching:', newRecipesForAC);
        }

        // Include newRecipes in the search (they might not be in the main recipes array yet)
        const allRecipesIncludingNew = [...allRecipes, ...newRecipes.filter(r => r.outputName === ingredientName)];

        let recipe = null;

        if (allRecipesIncludingNew.length > 0) {
            // Prioritize recipes that have ingredients
            const recipesWithIngredients = allRecipesIncludingNew.filter(r => r.ingredients && r.ingredients.length > 0);

            if (ingredientName === 'Access Control') {
                console.log('Access Control: Recipes with ingredients:', recipesWithIngredients);
            }

            if (recipesWithIngredients.length > 0) {
                recipe = recipesWithIngredients[0]; // Take first recipe with ingredients
                if (ingredientName === 'Access Control') {
                    console.log('Access Control: Using recipe with ingredients:', recipe);
                }
            } else {
                recipe = allRecipesIncludingNew[0]; // Fallback to first recipe
                if (ingredientName === 'Access Control') {
                    console.log('Access Control: Using first recipe (no ingredients):', recipe);
                }
            }
        }

        if (!recipe) {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: No recipe found');
            }
            return 'missing';
        }

        if (ingredientName === 'Access Control') {
            console.log('Access Control: Recipe found:', recipe);
        }

        // Check if recipe is flagged as force complete (user override)
        if (recipe.forceComplete || recipe.completionStatus === 'complete') {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: Recipe flagged as force complete or marked complete');
            }
            return 'complete';
        }

        // Check if recipe has ingredients
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            if (ingredientName === 'Access Control') {
                console.log('Access Control: Recipe has no ingredients');
            }
            return 'incomplete';
        }

        // Check all ingredients in the recipe
        for (const ingredient of recipe.ingredients) {
            if (ingredient && ingredient.name) {
                const ingredientStatus = calculateCompletionStatus(ingredient.name, new Set(visited));
                if (ingredientStatus === 'missing' || ingredientStatus === 'incomplete' || ingredientStatus === 'circular') {
                    if (ingredientName === 'Access Control') {
                        console.log(`Access Control: Ingredient ${ingredient.name} is ${ingredientStatus}`);
                    }
                    return ingredientStatus;
                }
            }
        }

        if (ingredientName === 'Access Control') {
            console.log('Access Control: All ingredients complete - returning complete');
            console.log('=== End Access Control Debug ===');
        }

        return 'complete';
    };

    // Find all recipes that use a specific ingredient - MOVED UP
    const findRecipesThatUse = (ingredientName) => {
        const usedInRecipes = recipes.filter(recipe =>
            recipe.ingredients && recipe.ingredients.some(ing => ing && ing.name === ingredientName)
        );

        const totalQuantityUsed = usedInRecipes.reduce((total, recipe) => {
            const ingredient = recipe.ingredients.find(ing => ing && ing.name === ingredientName);
            return total + (ingredient ? ingredient.quantity || 1 : 0);
        }, 0);

        return {
            recipes: usedInRecipes,
            usageCount: usedInRecipes.length,
            totalQuantityUsed,
            uniqueOutputs: usedInRecipes.map(r => r.outputName)
        };
    };

    // Calculate usage statistics for all ingredients - MOVED UP
    const ingredientUsageStats = useMemo(() => {
        const stats = new Map();

        allResources.forEach(resource => {
            const usage = findRecipesThatUse(resource.name);
            stats.set(resource.name, usage);
        });

        return stats;
    }, [allResources, recipes]);

    // Find orphaned ingredients in final component recipes
    const findOrphanedIngredients = () => {
        console.log('🔍 Searching for orphaned ingredients in final components...');

        // Get all final components (not INGREDIENT, COMPONENT, RAW_MATERIAL, or BASIC RESOURCE)
        const finalComponents = allResources.filter(resource => {
            const outputType = resource.outputType || resource.category || '';
            return !['INGREDIENT', 'COMPONENT', 'RAW_MATERIAL', 'BASIC RESOURCE'].includes(outputType);
        });

        console.log(`Found ${finalComponents.length} final components to check:`, finalComponents.map(r => r.name));

        // Collect all ingredients mentioned in final component recipes
        const ingredientsInFinalRecipes = new Set();
        const existingResourceNames = new Set(allResources.map(r => r.name));
        const orphanedIngredients = [];

        finalComponents.forEach(component => {
            // Find the recipe for this final component
            const recipe = recipes.find(r => r.outputName === component.name);
            if (recipe && recipe.ingredients) {
                recipe.ingredients.forEach(ingredient => {
                    if (ingredient && ingredient.name) {
                        ingredientsInFinalRecipes.add(ingredient.name);

                        // Check if this ingredient exists as a separate row
                        if (!existingResourceNames.has(ingredient.name)) {
                            const orphanData = {
                                name: ingredient.name,
                                usedInFinalComponent: component.name,
                                finalComponentType: component.outputType || component.category,
                                quantity: ingredient.quantity || 1
                            };

                            // Check if we already found this orphan
                            const existing = orphanedIngredients.find(o => o.name === ingredient.name);
                            if (existing) {
                                existing.usedInFinalComponents = existing.usedInFinalComponents || [existing.usedInFinalComponent];
                                existing.usedInFinalComponents.push(component.name);
                                existing.totalQuantity = (existing.totalQuantity || existing.quantity) + orphanData.quantity;
                            } else {
                                orphanedIngredients.push(orphanData);
                            }
                        }
                    }
                });
            }
        });

        console.log(`Found ${orphanedIngredients.length} orphaned ingredients:`, orphanedIngredients);
        return orphanedIngredients;
    };

    // Helper function to check if an ingredient is a lower tier version of the same item
    const isLowerTierOfSameItem = (ingredientName, outputName) => {
        // Remove tier indicators (T1, T2, T3, T4, T5) and compare base names
        const cleanIngredientName = ingredientName.replace(/\s+T[1-5]$/i, '').trim();
        const cleanOutputName = outputName.replace(/\s+T[1-5]$/i, '').trim();

        // If base names match, this is likely a tier progression
        if (cleanIngredientName === cleanOutputName) {
            // Extract tier numbers to confirm it's a lower tier
            const ingredientTierMatch = ingredientName.match(/T([1-5])$/i);
            const outputTierMatch = outputName.match(/T([1-5])$/i);

            if (ingredientTierMatch && outputTierMatch) {
                const ingredientTier = parseInt(ingredientTierMatch[1]);
                const outputTier = parseInt(outputTierMatch[1]);

                // Return true if ingredient tier is lower than output tier
                return ingredientTier < outputTier;
            }
        }

        return false;
    };

    // Create production chains for orphaned ingredients
    const createProductionChainsForOrphans = () => {
        // NEW IMPROVED ORPHAN DETECTION
        console.log('🔍 Searching for orphaned ingredients in non-COMPONENT/non-INGREDIENT recipes...');

        // Get all recipes where outputType is NOT COMPONENT or INGREDIENT
        const nonComponentRecipes = recipes.filter(recipe => {
            const outputType = recipe.outputType || '';
            return outputType !== 'COMPONENT' && outputType !== 'INGREDIENT';
        });

        console.log(`Found ${nonComponentRecipes.length} non-COMPONENT/non-INGREDIENT recipes to check:`);
        console.log('Recipe types found:', [...new Set(nonComponentRecipes.map(r => r.outputType))]);

        // Collect all ingredients mentioned in these recipes
        const existingResourceNames = new Set(allResources.map(r => r.name));
        const orphanedIngredients = [];

        nonComponentRecipes.forEach(recipe => {
            if (recipe.ingredients && recipe.outputName) {
                recipe.ingredients.forEach(ingredient => {
                    if (ingredient && ingredient.name && ingredient.name.trim()) {
                        // Check if this ingredient exists as a separate row
                        if (!existingResourceNames.has(ingredient.name)) {
                            // EXCLUDE LOWER TIER VERSIONS OF THE SAME ITEM
                            // Check if this ingredient is just a lower tier version of the recipe output
                            const isLowerTierVersion = isLowerTierOfSameItem(ingredient.name, recipe.outputName);

                            if (!isLowerTierVersion) {
                                const orphanData = {
                                    name: ingredient.name,
                                    usedInRecipe: recipe.outputName,
                                    recipeType: recipe.outputType || 'UNKNOWN',
                                    quantity: ingredient.quantity || 1,
                                    recipeTier: recipe.outputTier || 1
                                };

                                // Check if we already found this orphan
                                const existing = orphanedIngredients.find(o => o.name === ingredient.name);
                                if (existing) {
                                    existing.usedInRecipes = existing.usedInRecipes || [existing.usedInRecipe];
                                    if (!existing.usedInRecipes.includes(recipe.outputName)) {
                                        existing.usedInRecipes.push(recipe.outputName);
                                    }
                                    existing.totalQuantity = (existing.totalQuantity || existing.quantity) + orphanData.quantity;
                                    existing.usedInRecipeTypes = existing.usedInRecipeTypes || [existing.recipeType];
                                    if (!existing.usedInRecipeTypes.includes(orphanData.recipeType)) {
                                        existing.usedInRecipeTypes.push(orphanData.recipeType);
                                    }
                                    existing.maxTier = Math.max(existing.maxTier || existing.recipeTier || 1, orphanData.recipeTier);
                                } else {
                                    orphanData.maxTier = orphanData.recipeTier;
                                    orphanedIngredients.push(orphanData);
                                }
                            } else {
                                console.log(`Excluding lower tier version: "${ingredient.name}" used in "${recipe.outputName}"`);
                            }
                        }
                    }
                });
            }
        });

        console.log(`Found ${orphanedIngredients.length} orphaned ingredients across non-COMPONENT/non-INGREDIENT recipes:`);

        // Log some examples for debugging
        if (orphanedIngredients.length > 0) {
            console.log('Sample orphaned ingredients found:', orphanedIngredients.slice(0, 10).map(o => ({
                name: o.name,
                usedIn: o.usedInRecipe,
                type: o.recipeType,
                quantity: o.quantity
            })));
        }

        if (orphanedIngredients.length === 0) {
            alert('✅ No orphaned ingredients found! All ingredients in non-COMPONENT/non-INGREDIENT recipes exist as separate rows.');
            return;
        }

        console.log(`Creating production chains for ${orphanedIngredients.length} orphaned ingredients...`);

        // Add orphaned ingredients to the main ingredients list so they appear in the selection grid
        let addedCount = 0;

        orphanedIngredients.forEach(orphan => {
            // Create a new ingredient entry
            const newIngredient = {
                id: `orphan-ingredient-${Date.now()}-${orphan.name.replace(/\s+/g, '-')}`,
                name: orphan.name,
                outputName: orphan.name,
                outputType: 'INGREDIENT',
                outputTier: orphan.maxTier || 1,
                tier: orphan.maxTier || 1,
                category: 'INGREDIENT',
                type: 'ingredient',
                completionStatus: 'missing',
                ingredients: [],
                resourceType: 'INGREDIENT',
                functionalPurpose: 'PRODUCTION',
                usageCategory: 'Manufacturing',
                constructionTime: 60,
                isOrphaned: true,
                orphanSource: `Found in ${orphan.usedInRecipes ? orphan.usedInRecipes.join(', ') : orphan.usedInRecipe} recipe(s)`,
                orphanUsageTypes: orphan.usedInRecipeTypes || [orphan.recipeType]
            };

            try {
                // Add to ingredients via context (this will make them appear in the main grid)
                addComponent(newIngredient); // Using addComponent since there's no addIngredient function
                addedCount++;
                console.log(`Added orphaned ingredient to main list: ${orphan.name}`);
            } catch (error) {
                console.error(`Failed to add orphaned ingredient ${orphan.name}:`, error);
            }
        });

        // Show summary
        const orphanNames = orphanedIngredients.map(o => o.name).join(', ');
        alert(
            `🔍 Found ${orphanedIngredients.length} Orphaned Ingredients!\n\n` +
            `📋 Orphaned Ingredients Added to Main List:\n${orphanNames}\n\n` +
            `✅ Added ${addedCount} orphaned ingredients to the main ingredient selection grid.\n\n` +
            `💡 You can now click on these ingredients in the grid above to create production chains for them!\n\n` +
            `🎯 These ingredients were found in non-COMPONENT/non-INGREDIENT recipes but don't exist as separate rows.`
        );
    };

    // Helper functions for ship size filtering - moved here to avoid initialization errors
    const getShipSizesUsingIngredient = (ingredientName) => {
        const shipSizes = new Set();
        const shipSizePattern = /(XXXS|XXS|XS|S|M|L|CAP|CMD|CLASS8|TTN)/;

        // Find all recipes that use this ingredient
        const recipesUsingIngredient = recipes.filter(recipe => {
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) return false;
            return recipe.ingredients.some(ing => {
                const ingName = ing?.name || ing?.ingredient || ing?.outputName;
                return ingName === ingredientName;
            });
        });

        // Extract ship sizes from recipe names
        recipesUsingIngredient.forEach(recipe => {
            const recipeName = recipe.outputName || recipe.OutputName || '';
            const match = recipeName.match(shipSizePattern);
            if (match) {
                shipSizes.add(match[1]);
            }
        });

        return Array.from(shipSizes);
    };

    // Helper function to check if ingredient is used in small/medium ships only (XXXS to M)
    const isUsedInSmallMediumShipsOnly = (ingredientName) => {
        const shipSizes = getShipSizesUsingIngredient(ingredientName);
        const largeShipSizes = ['L', 'CAP', 'CMD', 'CLASS8', 'TTN'];

        // Return true if ingredient is used AND not used in any large ships
        return shipSizes.length > 0 && !shipSizes.some(size => largeShipSizes.includes(size));
    };

    // Filter all resources that have recipes (everything except BASIC RESOURCE)
    const targetIngredients = useMemo(() => {
        console.log('ProductionChainBuilder: Filtering target resources with recipes', {
            allResourcesCount: allResources.length,
            recipesCount: recipes.length,
            filter,
            outputTypeFilter,
            sortBy,
            availableOutputTypes: availableOutputTypes.length
        });

        let debugCount = 0;
        let resourceCount = 0;

        const filtered = allResources.filter(resource => {
            // Include all resources that have recipes (exclude only BASIC RESOURCE)
            const hasRecipe = resource.outputType && resource.outputType !== 'BASIC RESOURCE';
            if (!hasRecipe) return false;

            // Apply output type filter
            if (outputTypeFilter !== 'all' && resource.outputType !== outputTypeFilter) {
                return false;
            }

            // Apply search filter
            if (activeSearchTerm.trim() && !resource.name.toLowerCase().includes(activeSearchTerm.toLowerCase())) {
                return false;
            }

            resourceCount++; // Count how many resources we're processing

            const actualCompletionStatus = calculateCompletionStatus(resource.name);
            let shouldInclude = false;

            // Apply completion status filter
            switch (filter) {
                case 'missing':
                    shouldInclude = actualCompletionStatus === 'missing';
                    break;
                case 'incomplete':
                    shouldInclude = actualCompletionStatus === 'incomplete';
                    break;
                case 'complete':
                    shouldInclude = actualCompletionStatus === 'complete';
                    break;
                case 'all':
                default:
                    shouldInclude = true;
                    break;
            }

            // Debug log first few items to see what's happening
            if (debugCount < 10) {
                console.log(`Filter Debug ${debugCount + 1}: ${resource.name}`, {
                    actualStatus: actualCompletionStatus,
                    outputType: resource.outputType,
                    filter: filter,
                    outputTypeFilter: outputTypeFilter,
                    match: actualCompletionStatus === filter,
                    shouldInclude: shouldInclude
                });
                debugCount++;
            }

            // Special debug for photon missiles
            if (resource.name && resource.name.toLowerCase().includes('photon missile')) {
                console.log(`🚀 PHOTON MISSILE FILTER: ${resource.name}`, {
                    actualStatus: actualCompletionStatus,
                    outputType: resource.outputType,
                    hasRecipe: resource.outputType && resource.outputType !== 'BASIC RESOURCE',
                    filter: filter,
                    shouldInclude: shouldInclude,
                    ingredientsCount: resource.ingredients?.length || 0,
                    ingredients: resource.ingredients
                });
            }

            return shouldInclude;
        });

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            // First, prioritize small/medium ship ingredients (XXXS to M)
            const aIsSmallMedium = a.outputType === 'INGREDIENT' ? isUsedInSmallMediumShipsOnly(a.name) : false;
            const bIsSmallMedium = b.outputType === 'INGREDIENT' ? isUsedInSmallMediumShipsOnly(b.name) : false;

            if (aIsSmallMedium && !bIsSmallMedium) return -1; // a comes first
            if (!aIsSmallMedium && bIsSmallMedium) return 1;  // b comes first

            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    // Sort by outputType first, then by name
                    const typeA = a.outputType || a.category || 'UNKNOWN';
                    const typeB = b.outputType || b.category || 'UNKNOWN';
                    if (typeA !== typeB) {
                        return typeA.localeCompare(typeB);
                    }
                    return a.name.localeCompare(b.name);
                case 'tier':
                    // Sort by tier descending, then by name
                    const tierA = a.tier || a.outputTier || 0;
                    const tierB = b.tier || b.outputTier || 0;
                    if (tierA !== tierB) {
                        return tierB - tierA; // Higher tiers first
                    }
                    return a.name.localeCompare(b.name);
                case 'status':
                    // Sort by completion status, then by name
                    const statusA = calculateCompletionStatus(a.name);
                    const statusB = calculateCompletionStatus(b.name);
                    const statusOrder = { 'missing': 0, 'incomplete': 1, 'complete': 2 };
                    if (statusA !== statusB) {
                        return statusOrder[statusA] - statusOrder[statusB];
                    }
                    return a.name.localeCompare(b.name);
                case 'usage':
                    // Sort by usage count (most used first), then by name
                    const usageA = ingredientUsageStats.get(a.name)?.usageCount || 0;
                    const usageB = ingredientUsageStats.get(b.name)?.usageCount || 0;
                    if (usageA !== usageB) {
                        return usageB - usageA; // Higher usage first
                    }
                    return a.name.localeCompare(b.name);
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        console.log('ProductionChainBuilder: Filtered and Sorted RESOURCE count:', sorted.length);
        console.log('ProductionChainBuilder: Total resources processed:', resourceCount);

        // Log some sample resources
        if (sorted.length > 0) {
            console.log('Sample filtered RESOURCES:', sorted.slice(0, 3).map(r => ({
                name: r.name,
                type: r.type,
                outputType: r.outputType,
                completionStatus: r.completionStatus,
                ingredientsCount: r.ingredients?.length || 0,
                tier: r.tier || r.outputTier || 0
            })));
        } else {
            // Debug: check what types and outputTypes we have
            const types = [...new Set(allResources.map(r => r.type))];
            const outputTypes = [...new Set(allResources.map(r => r.outputType))];
            console.log('Available types in allResources:', types);
            console.log('Available outputTypes in allResources:', outputTypes);

            const resourcesWithRecipeCount = allResources.filter(r => r.outputType && r.outputType !== 'BASIC RESOURCE').length;
            console.log('Total resources with recipes found:', resourcesWithRecipeCount);
        }

        return sorted;
    }, [allResources, recipes, filter, outputTypeFilter, sortBy, ingredientUsageStats, activeSearchTerm]);

    // Calculate completion stats
    const completionStats = useMemo(() => {
        const stats = {
            total: targetIngredients.length,
            complete: 0,
            incomplete: 0,
            missing: 0
        };

        console.log('=== COMPLETION STATS DEBUG ===');
        console.log('Target ingredients:', targetIngredients.length);

        targetIngredients.forEach(ingredient => {
            const actualCompletionStatus = calculateCompletionStatus(ingredient.name);

            // Debug logging for first few ingredients
            if (stats.complete + stats.incomplete + stats.missing < 10) {
                console.log(`Ingredient: ${ingredient.name}`, {
                    actualStatus: actualCompletionStatus,
                    ingredientType: ingredient.type,
                    outputType: ingredient.outputType,
                    hasIngredients: ingredient.ingredients?.length || 0
                });
            }

            if (actualCompletionStatus === 'missing') {
                stats.missing++;
            } else if (actualCompletionStatus === 'complete') {
                stats.complete++;
                // Log complete ingredients specifically
                console.log(`COMPLETE INGREDIENT: ${ingredient.name}`, {
                    ingredientCount: ingredient.ingredients?.length || 0,
                    type: ingredient.type,
                    outputType: ingredient.outputType
                });
            } else if (actualCompletionStatus === 'incomplete') {
                stats.incomplete++;
            } else {
                // Default fallback for circular dependencies or unknown status
                stats.missing++;
            }
        });

        console.log('Final completion stats:', stats);
        console.log('=== END COMPLETION DEBUG ===');
        return stats;
    }, [targetIngredients, allResources, recipes]);

    // Calculate production chain analysis for current recipes being created
    const analyzeCurrentProductionChain = () => {
        if (newRecipes.length === 0) return null;

        const analysis = {
            totalRecipes: newRecipes.length,
            tiers: new Set(),
            planetTypes: new Set(),
            rawResources: new Map(), // Changed from Set to Map to store tier info
            componentTypes: new Set(),
            functionalPurposes: new Set(),
            complexity: 0,
            completeness: 0,
            incompleteIngredients: new Set(),
            allIngredients: new Set()
        };

        // Track all ingredients used across recipes
        newRecipes.forEach(recipe => {
            if (!recipe.outputName) return;

            // Add tier
            analysis.tiers.add(recipe.outputTier);

            // Add functional purpose
            if (recipe.functionalPurpose) {
                analysis.functionalPurposes.add(recipe.functionalPurpose);
            }

            // Add resource type
            if (recipe.resourceType) {
                analysis.componentTypes.add(recipe.resourceType);
            }

            // Analyze ingredients
            recipe.ingredients
                .filter(ing => ing && ing.name) // Filter out null ingredients
                .forEach(ingredient => {
                    if (ingredient && ingredient.name) {
                        analysis.allIngredients.add(ingredient.name);

                        const resource = allResources.find(r => r.name === ingredient.name);
                        if (resource) {
                            if (resource.type === 'raw') {
                                // Store raw resource with tier information
                                analysis.rawResources.set(ingredient.name, {
                                    name: ingredient.name,
                                    tier: resource.tier || 0
                                });
                                // Add planet types from raw resources
                                if (resource.planetSources) {
                                    resource.planetSources.forEach(planet => {
                                        analysis.planetTypes.add(planet);
                                    });
                                }
                            } else {
                                // Non-raw ingredient - check if we have a recipe for it
                                const hasRecipeInChain = newRecipes.some(r => r.outputName === ingredient.name);
                                const hasRecipeInDatabase = recipes.some(r => r.outputName === ingredient.name);

                                if (!hasRecipeInChain && !hasRecipeInDatabase) {
                                    analysis.incompleteIngredients.add(ingredient.name);
                                }

                                analysis.complexity++;
                                analysis.componentTypes.add(resource.category);
                            }
                        } else {
                            // Unknown ingredient
                            analysis.incompleteIngredients.add(ingredient.name);
                        }
                    }
                });
        });

        // Calculate completeness: percentage of ingredients that are either raw resources or have recipes
        const totalUniqueIngredients = analysis.allIngredients.size;
        const completeIngredients = totalUniqueIngredients - analysis.incompleteIngredients.size;
        analysis.completeness = totalUniqueIngredients > 0 ? Math.round((completeIngredients / totalUniqueIngredients) * 100) : 0;

        // Add missing ingredients info for display
        analysis.missingRecipeCount = analysis.incompleteIngredients.size;
        analysis.missingIngredients = Array.from(analysis.incompleteIngredients);

        return {
            ...analysis,
            tiers: Array.from(analysis.tiers).sort(),
            planetTypes: Array.from(analysis.planetTypes).sort(),
            rawResources: Array.from(analysis.rawResources.values()).sort((a, b) => a.name.localeCompare(b.name)), // Convert Map to sorted array
            componentTypes: Array.from(analysis.componentTypes).sort(),
            functionalPurposes: Array.from(analysis.functionalPurposes).sort()
        };
    };

    const currentChainAnalysis = analyzeCurrentProductionChain();

    // Show loading state
    if (loading) {
        return (
            <div className="production-chain-builder">
                <div className="builder-header">
                    <div className="header-title">
                        <h2>🏭 Production Chain Builder</h2>
                    </div>
                </div>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading ingredients and recipes...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="production-chain-builder">
                <div className="builder-header">
                    <div className="header-title">
                        <h2>🏭 Production Chain Builder</h2>
                    </div>
                </div>
                <div className="error-container">
                    <p>Error loading data: {error}</p>
                </div>
            </div>
        );
    }

    // Build complete production chain for an ingredient
    const buildProductionChain = (ingredientName, visited = new Set()) => {
        if (visited.has(ingredientName)) return { name: ingredientName, circular: true };
        visited.add(ingredientName);

        const resource = allResources.find(r => r.name === ingredientName);
        if (!resource) return { name: ingredientName, missing: true, notFound: true };

        if (resource.type === 'raw') {
            return {
                name: ingredientName,
                type: 'raw',
                tier: 0,
                category: resource.category,
                planetSources: resource.planetSources,
                isComplete: true
            };
        }

        // Use the same recipe selection logic as calculateCompletionStatus
        // Look for a recipe - prioritize recipes with ingredients over empty ones
        const allRecipes = recipes.filter(r => r.outputName === ingredientName);

        // Include newRecipes in the search (they might not be in the main recipes array yet)
        const allRecipesIncludingNew = [...allRecipes, ...newRecipes.filter(r => r.outputName === ingredientName)];

        let recipe = null;

        if (allRecipesIncludingNew.length > 0) {
            // Prioritize recipes that have ingredients (same logic as calculateCompletionStatus)
            const recipesWithIngredients = allRecipesIncludingNew.filter(r => r.ingredients && r.ingredients.length > 0);

            if (recipesWithIngredients.length > 0) {
                recipe = recipesWithIngredients[0]; // Take first recipe with ingredients
                console.log(`buildProductionChain: Using recipe with ingredients for ${ingredientName}:`, recipe.id);
            } else {
                recipe = allRecipesIncludingNew[0]; // Fallback to first recipe
                console.log(`buildProductionChain: Using first recipe (no ingredients) for ${ingredientName}:`, recipe.id);
            }
        }

        if (!recipe || !recipe.ingredients) {
            return {
                name: ingredientName,
                type: resource.type,
                tier: resource.tier,
                category: resource.category,
                isComplete: false,
                missing: true,
                needsRecipe: true,
                actualCompletionStatus: 'missing'
            };
        }

        const ingredientChains = recipe.ingredients
            .filter(ing => ing && ing.name) // Filter out null ingredients
            .map(ing => buildProductionChain(ing.name, new Set(visited)));

        const isComplete = ingredientChains.every(chain => chain && chain.isComplete);
        const maxTier = Math.max(0, ...ingredientChains.map(chain => chain?.tier || 0));

        // Use the same calculation logic as the filter
        const actualCompletionStatus = calculateCompletionStatus(ingredientName);

        return {
            name: ingredientName,
            type: resource.type,
            tier: resource.tier,
            category: resource.category,
            recipe: recipe,
            ingredients: ingredientChains,
            isComplete: actualCompletionStatus === 'complete',
            missing: actualCompletionStatus === 'missing',
            incomplete: actualCompletionStatus === 'incomplete',
            actualCompletionStatus,
            tierValid: resource.tier > maxTier,
            constructionTime: recipe.constructionTime,
            planetDependencies: [...new Set(ingredientChains.flatMap(chain => chain?.planetDependencies || []))]
        };
    };

    // Handle ingredient selection and build its production chain - ASYNC VERSION
    const handleIngredientSelect = async (ingredientName) => {
        // Prevent multiple simultaneous analyses
        if (isAnalyzingChain) {
            console.log('Chain analysis already in progress, ignoring click');
            return;
        }

        console.log('=== Ingredient Selection Debug ===');
        console.log('Selected ingredient:', ingredientName);

        try {
            setIsAnalyzingChain(true);
            setSelectedIngredient(ingredientName);
            setShowChainAnalysis(true);

            // Show loading state while building chain
            setCurrentProductionChain({ name: ingredientName, loading: true });

            // Build chain asynchronously with timeout protection
            const chain = await Promise.race([
                buildProductionChainAsync(ingredientName),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Chain analysis timed out')), 15000)
                )
            ]);

            console.log('Built production chain:', {
                name: chain.name,
                depth: chain.depth,
                totalNodes: chain.totalNodes,
                status: chain.actualCompletionStatus
            });

            setCurrentProductionChain(chain);

            console.log('State should be set to:', {
                selectedIngredient: ingredientName,
                showChainAnalysis: true,
                chainMissing: chain?.missing,
                chainIncomplete: chain?.incomplete,
                chainActualStatus: chain?.actualCompletionStatus
            });
        } catch (error) {
            console.error('Error building production chain for selection:', error);
            setCurrentProductionChain({
                name: ingredientName,
                error: true,
                errorMessage: error.message.includes('timed out')
                    ? 'Chain analysis timed out - too complex'
                    : error.message
            });
        } finally {
            setIsAnalyzingChain(false);
        }

        console.log('=== End Ingredient Selection Debug ===');
    };

    // Create new component that doesn't exist in the system
    const createNewComponent = (componentName, componentType = 'COMPONENT', tier = 1) => {
        console.log('Creating new component:', { componentName, componentType, tier });

        // Create the new component
        const newComponent = {
            name: componentName,
            outputName: componentName,
            type: 'component', // Internal type
            category: componentType, // Display category
            tier: tier,
            outputTier: tier,
            outputType: componentType,
            completionStatus: 'missing',
            ingredients: [],
            functionalPurpose: 'PRODUCTION'
        };

        // Add to components array (this will update allResources through the useMemo)
        addComponent(newComponent);

        // Return the new component for immediate use
        return newComponent;
    };

    // Update new recipe
    const updateNewRecipe = (id, field, value) => {
        // If changing outputType to RAW, convert to raw resource
        if (field === 'outputType' && value === 'RAW') {
            const recipeToConvert = newRecipes.find(recipe => recipe.id === id);
            if (recipeToConvert && recipeToConvert.outputName) {
                console.log('Converting recipe to raw resource:', recipeToConvert.outputName);

                // Create new raw resource
                const newRawResource = {
                    id: `raw-${recipeToConvert.outputName.toLowerCase().replace(/\s+/g, '-')}`,
                    name: recipeToConvert.outputName,
                    outputName: recipeToConvert.outputName,
                    type: 'Raw Resource',
                    tier: recipeToConvert.outputTier || 1,
                    outputTier: recipeToConvert.outputTier || 1,
                    category: 'BASIC RESOURCE',
                    outputType: 'BASIC RESOURCE',
                    extractionRate: 0,
                    planetSources: [], // Can be updated later
                    description: `Custom raw resource: ${recipeToConvert.outputName}`
                };

                // Add to raw resources via context
                addRawResource(newRawResource);

                // Remove from recipes
                setNewRecipes(newRecipes.filter(recipe => recipe.id !== id));

                alert(`"${recipeToConvert.outputName}" has been converted to a raw resource and removed from the recipe table.`);
                return;
            }
        }

        // Standard recipe update
        setNewRecipes(newRecipes.map(recipe =>
            recipe.id === id ? { ...recipe, [field]: value } : recipe
        ));
    };

    // Add ingredient to specific slot in recipe
    const addIngredientToRecipe = (recipeId, slotIndex, ingredientName) => {
        console.log('=== AddIngredientToRecipe Debug ===');
        console.log('Adding ingredient to recipe:', { recipeId, slotIndex, ingredientName });

        // Update the main recipe
        const updatedRecipes = newRecipes.map(recipe => {
            if (recipe.id !== recipeId) return recipe;

            const updatedIngredients = [...recipe.ingredients];
            updatedIngredients[slotIndex] = ingredientName ? { name: ingredientName, quantity: 1 } : null;

            // AUTO-TIER ADJUSTMENT: Check if ingredient is a raw resource and adjust tier
            let updatedTier = recipe.outputTier;
            if (ingredientName) {
                const resource = allResources.find(r => r.name === ingredientName);
                if (resource && resource.type === 'raw') {
                    const rawResourceTier = resource.tier || 0;
                    console.log(`Raw resource "${ingredientName}" has tier ${rawResourceTier}`);

                    // Adjust recipe tier to be at least equal to the raw resource tier
                    if (rawResourceTier > updatedTier) {
                        updatedTier = rawResourceTier;
                        console.log(`Auto-adjusting recipe tier from ${recipe.outputTier} to ${updatedTier} for raw resource ${ingredientName}`);
                    }
                }
            }

            return {
                ...recipe,
                ingredients: updatedIngredients,
                outputTier: updatedTier
            };
        });

        setNewRecipes(updatedRecipes);

        // Auto-create recipe for non-raw ingredients
        if (ingredientName) {
            let resource = allResources.find(r => r.name === ingredientName);

            // If resource not found, it might be a newly created component that hasn't been added to state yet
            if (!resource) {
                console.log('Resource not found in allResources, checking if it was just created...');
                // For newly created components, assume it's a non-raw component that needs a recipe
                resource = {
                    name: ingredientName,
                    type: 'component',
                    category: 'COMPONENT',
                    outputType: 'COMPONENT',
                    tier: 1
                };
                console.log('Using fallback resource for newly created component:', resource);
            }

            console.log('Found resource:', resource);
            console.log('Resource details:', {
                name: resource?.name,
                type: resource?.type,
                category: resource?.category,
                outputType: resource?.outputType,
                isRaw: resource?.type === 'raw'
            });

            // Check if this is a raw material or not
            const isRawMaterial = resource?.type === 'raw' || resource?.category === 'BASIC RESOURCE' || resource?.outputType === 'BASIC RESOURCE';
            console.log('Is raw material?', isRawMaterial);

            if (resource && !isRawMaterial) {
                // Check if we already have a recipe being created for this ingredient (using updated recipes)
                const existsInNewRecipes = updatedRecipes.some(r => r.outputName === ingredientName);
                const existsInDatabase = recipes.some(r => r.outputName === ingredientName);

                console.log('Recipe existence check:', {
                    ingredientName,
                    existsInNewRecipes,
                    existsInDatabase,
                    shouldCreate: !existsInNewRecipes && !existsInDatabase
                });

                // For production chain building, always create recipe rows (even if they exist in database)
                // Only skip if we already have this recipe in our current new recipes
                if (!existsInNewRecipes) {
                    // If recipe exists in database, load it as a starting point
                    let baseRecipe = null;
                    if (existsInDatabase) {
                        baseRecipe = recipes.find(r => r.outputName === ingredientName);
                        console.log('Found existing recipe in database:', baseRecipe);
                    }

                    // Determine appropriate defaults based on resource type and category
                    let outputType = baseRecipe?.outputType || 'INGREDIENT';
                    let resourceType = baseRecipe?.resourceType || 'COMPONENT';
                    let functionalPurpose = baseRecipe?.functionalPurpose || 'PRODUCTION';
                    let tier = baseRecipe?.outputTier || resource.tier || resource.outputTier || 1;

                    // Set better defaults based on resource information if no base recipe
                    if (!baseRecipe && (resource.category || resource.outputType)) {
                        const category = resource.category || resource.outputType;
                        console.log('Setting defaults based on category:', category);

                        if (['ELECTRONIC_COMPONENT', 'COMPONENT'].includes(category)) {
                            outputType = 'COMPONENT';
                            resourceType = 'ELECTRONIC_COMPONENT';
                            functionalPurpose = 'STRUCTURAL';
                        } else if (category === 'INGREDIENT') {
                            outputType = 'INGREDIENT';
                            resourceType = 'INGREDIENT';
                            functionalPurpose = 'PRODUCTION';
                        } else if (['ENERGY_MATERIAL'].includes(category)) {
                            outputType = 'COMPONENT';
                            resourceType = 'ENERGY_MATERIAL';
                            functionalPurpose = 'ENERGY';
                        } else if (['STRUCTURAL_ALLOY'].includes(category)) {
                            outputType = 'COMPONENT';
                            resourceType = 'STRUCTURAL_ALLOY';
                            functionalPurpose = 'STRUCTURAL';
                        } else {
                            // Default for unknown categories
                            outputType = 'COMPONENT';
                            resourceType = 'COMPONENT';
                            functionalPurpose = 'PRODUCTION';
                        }
                    }

                    // Auto-create a new recipe for this ingredient
                    const newRecipe = {
                        id: Date.now(),
                        outputName: ingredientName,
                        outputType: outputType,
                        outputTier: tier,
                        resourceType: resourceType,
                        functionalPurpose: functionalPurpose,
                        ingredients: baseRecipe ?
                            // If base recipe exists, copy its ingredients
                            (baseRecipe.ingredients || []).concat(Array(9).fill(null)).slice(0, 9) :
                            // Otherwise start with empty slots
                            Array(9).fill(null)
                    };

                    console.log('Auto-creating recipe (even if exists in DB):', newRecipe);

                    // Add the new recipe to the updated list
                    setNewRecipes(prev => {
                        const newList = [...prev, newRecipe];
                        console.log('Updated recipes list length:', newList.length);
                        return newList;
                    });
                } else {
                    console.log('Recipe already exists in new recipes, skipping auto-creation');
                }
            } else if (isRawMaterial) {
                console.log('Ingredient is raw resource, no auto-recipe needed:', ingredientName);
            } else {
                console.log('Resource not found or invalid type:', ingredientName);
            }
        }
        console.log('=== End AddIngredientToRecipe Debug ===');
    };

    // Remove ingredient from specific slot
    const removeIngredientFromSlot = (recipeId, slotIndex) => {
        setNewRecipes(newRecipes.map(recipe => {
            if (recipe.id !== recipeId) return recipe;

            const updatedIngredients = [...recipe.ingredients];
            updatedIngredients[slotIndex] = null;

            return { ...recipe, ingredients: updatedIngredients };
        }));
    };

    // Save new recipes
    const saveNewRecipes = () => {
        let savedCount = 0;

        newRecipes.forEach(newRecipe => {
            if (newRecipe.outputName && newRecipe.ingredients.some(ing => ing !== null)) {
                const recipeToSave = {
                    id: Date.now() + Math.random(),
                    outputName: newRecipe.outputName,
                    outputType: newRecipe.outputType,
                    outputTier: newRecipe.outputTier,
                    constructionTime: newRecipe.constructionTime,
                    ingredients: newRecipe.ingredients.filter(ing => ing !== null),
                    completionStatus: 'complete',
                    planetTypes: '',
                    factions: 'MUD;ONI;USTUR',
                    resourceType: newRecipe.resourceType,
                    functionalPurpose: newRecipe.functionalPurpose,
                    usageCategory: 'Manufacturing'
                };
                addRecipe(recipeToSave);
                savedCount++;

                // Refresh the production chain if this recipe affects the selected ingredient
                if (selectedIngredient) {
                    const chain = buildProductionChain(selectedIngredient);
                    setCurrentProductionChain(chain);
                }
            }
        });

        setNewRecipes([]);
        alert(`Successfully saved ${savedCount} production chain recipes!`);
    };

    // Start production chain creation for an ingredient
    const startProductionChainCreation = (ingredientName) => {
        // Clear existing new recipes and start fresh
        const resource = allResources.find(r => r.name === ingredientName);
        const initialRecipe = {
            id: Date.now(),
            outputName: ingredientName,
            outputType: 'INGREDIENT',
            outputTier: resource?.tier || 1,
            resourceType: 'INGREDIENT',
            functionalPurpose: 'PRODUCTION',
            ingredients: Array(9).fill(null)
        };
        setNewRecipes([initialRecipe]);
        setShowChainAnalysis(false);
    };

    // Async version of buildProductionChain to prevent timeouts with better performance
    const buildProductionChainAsync = async (ingredientName, visited = new Set(), depth = 0, maxDepth = 15) => {
        // Early termination for very deep chains to prevent timeouts
        if (depth > maxDepth) {
            console.warn(`Production chain for ${ingredientName} terminated at depth ${depth} to prevent timeout`);
            return {
                name: ingredientName,
                tooDeep: true,
                depth: depth,
                message: `Chain too deep (>${maxDepth} levels)`
            };
        }

        // More frequent and longer delays to prevent browser freezing
        if (depth > 0 && depth % 2 === 0) {
            await new Promise(resolve => setTimeout(resolve, 25)); // Increased delay
        }

        // Additional delay for very deep chains
        if (depth > 8) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (visited.has(ingredientName)) {
            return { name: ingredientName, circular: true, depth: depth };
        }
        visited.add(ingredientName);

        const resource = allResources.find(r => r.name === ingredientName);
        if (!resource) return { name: ingredientName, missing: true, notFound: true, depth: depth };

        if (resource.type === 'raw') {
            return {
                name: ingredientName,
                type: 'raw',
                tier: 0,
                category: resource.category,
                planetSources: resource.planetSources,
                isComplete: true,
                depth: depth
            };
        }

        // Use the same recipe selection logic as calculateCompletionStatus
        const allRecipes = recipes.filter(r => r.outputName === ingredientName);
        const allRecipesIncludingNew = [...allRecipes, ...newRecipes.filter(r => r.outputName === ingredientName)];

        let recipe = null;

        if (allRecipesIncludingNew.length > 0) {
            const recipesWithIngredients = allRecipesIncludingNew.filter(r => r.ingredients && r.ingredients.length > 0);
            if (recipesWithIngredients.length > 0) {
                recipe = recipesWithIngredients[0];
            } else {
                recipe = allRecipesIncludingNew[0];
            }
        }

        if (!recipe || !recipe.ingredients) {
            return {
                name: ingredientName,
                type: resource.type,
                tier: resource.tier,
                category: resource.category,
                isComplete: false,
                missing: true,
                needsRecipe: true,
                actualCompletionStatus: 'missing',
                depth: depth
            };
        }

        // Process ingredients asynchronously with better chunking
        const ingredientChains = [];
        const validIngredients = recipe.ingredients.filter(ing => ing && ing.name);

        // Process ingredients in smaller batches to prevent blocking
        const batchSize = 3;
        for (let i = 0; i < validIngredients.length; i += batchSize) {
            const batch = validIngredients.slice(i, i + batchSize);

            // Process batch in parallel but with delay between batches
            const batchPromises = batch.map(ing =>
                buildProductionChainAsync(ing.name, new Set(visited), depth + 1, maxDepth)
            );

            const batchResults = await Promise.all(batchPromises);
            ingredientChains.push(...batchResults);

            // Delay between batches to prevent overwhelming the browser
            if (i + batchSize < validIngredients.length) {
                await new Promise(resolve => setTimeout(resolve, 15));
            }
        }

        const isComplete = ingredientChains.every(chain => chain && chain.isComplete);
        const maxTier = Math.max(0, ...ingredientChains.map(chain => chain?.tier || 0));
        const actualCompletionStatus = calculateCompletionStatus(ingredientName);

        return {
            name: ingredientName,
            type: resource.type,
            tier: resource.tier,
            category: resource.category,
            recipe: recipe,
            ingredients: ingredientChains,
            isComplete: actualCompletionStatus === 'complete',
            missing: actualCompletionStatus === 'missing',
            incomplete: actualCompletionStatus === 'incomplete',
            actualCompletionStatus,
            tierValid: resource.tier > maxTier,
            constructionTime: recipe.constructionTime,
            planetDependencies: [...new Set(ingredientChains.flatMap(chain => chain?.planetDependencies || []))],
            depth: depth,
            totalNodes: 1 + ingredientChains.reduce((sum, chain) => sum + (chain?.totalNodes || 0), 0)
        };
    };

    // Load existing production chain for editing - IMPROVED ASYNC VERSION
    const editProductionChain = async (ingredientName) => {
        console.log('=== Edit Production Chain Debug ===');
        console.log('Loading production chain for editing:', ingredientName);

        try {
            // Show loading state
            setIsLoadingProductionChain(true);

            // Build production chain asynchronously with timeout protection
            console.log('Building production chain asynchronously...');
            const startTime = Date.now();

            const chain = await Promise.race([
                buildProductionChainAsync(ingredientName),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Production chain building timed out after 30 seconds')), 30000)
                )
            ]);

            const buildTime = Date.now() - startTime;
            console.log(`Built chain for editing in ${buildTime}ms:`, {
                name: chain.name,
                depth: chain.depth,
                totalNodes: chain.totalNodes,
                tooDeep: chain.tooDeep
            });

            // Handle special cases
            if (chain.tooDeep) {
                alert(`⚠️ Production chain for "${ingredientName}" is very complex (depth > 15 levels).\n\nShowing simplified version. Some deep dependencies may be truncated to prevent browser timeout.`);
            }

            if (chain.circular) {
                alert(`⚠️ Circular dependency detected in production chain for "${ingredientName}".\n\nSome recipes may be incomplete due to circular references.`);
            }

            // Convert the production chain to editable recipes
            const loadedRecipes = [];
            let conversionErrors = 0;

            const convertChainToRecipes = (chainNode, depth = 0) => {
                if (!chainNode || chainNode.type === 'raw' || chainNode.circular || chainNode.tooDeep) {
                    return;
                }

                try {
                    if (chainNode.recipe && chainNode.recipe.ingredients) {
                        // Convert existing recipe to editable format
                        const editableRecipe = {
                            id: `edit-${chainNode.recipe.id || Date.now()}-${depth}`,
                            outputName: chainNode.name,
                            outputType: chainNode.recipe.outputType || 'INGREDIENT',
                            outputTier: chainNode.recipe.outputTier || chainNode.tier || 1,
                            resourceType: chainNode.recipe.resourceType || 'INGREDIENT',
                            functionalPurpose: chainNode.recipe.functionalPurpose || 'PRODUCTION',
                            constructionTime: chainNode.recipe.constructionTime || 60,
                            ingredients: Array(9).fill(null), // Start with empty slots
                            fromEdit: true // Flag to indicate this came from editing
                        };

                        // Fill in existing ingredients
                        chainNode.recipe.ingredients.forEach((ingredient, index) => {
                            if (index < 9 && ingredient && ingredient.name) {
                                editableRecipe.ingredients[index] = {
                                    name: ingredient.name,
                                    quantity: ingredient.quantity || 1
                                };
                            }
                        });

                        loadedRecipes.push(editableRecipe);
                    }

                    // Recursively process ingredients
                    if (chainNode.ingredients && chainNode.ingredients.length > 0) {
                        chainNode.ingredients.forEach(ingredient => {
                            convertChainToRecipes(ingredient, depth + 1);
                        });
                    }
                } catch (error) {
                    console.error(`Error converting recipe for ${chainNode.name}:`, error);
                    conversionErrors++;
                }
            };

            convertChainToRecipes(chain);

            console.log(`Converted ${loadedRecipes.length} recipes with ${conversionErrors} errors`);
            console.log('=== End Edit Production Chain Debug ===');

            // Load recipes into the editor
            setNewRecipes(loadedRecipes);
            setShowChainAnalysis(false);

            // Show a detailed message about what was loaded
            const recipeNames = loadedRecipes.map(r => r.outputName).join(', ');
            let message = `✅ Successfully loaded ${loadedRecipes.length} recipes for editing!\n\n`;
            message += `📋 Recipes: ${recipeNames}\n\n`;
            message += `⏱️ Build time: ${buildTime}ms\n`;
            if (chain.totalNodes) {
                message += `🔗 Total chain nodes: ${chain.totalNodes}\n`;
            }
            if (chain.depth) {
                message += `🏗️ Maximum depth: ${chain.depth} levels\n`;
            }
            if (conversionErrors > 0) {
                message += `⚠️ ${conversionErrors} conversion errors (check console)\n`;
            }
            message += `\n💡 You can now edit ingredients, tiers, and save changes.`;

            alert(message);

        } catch (error) {
            console.error('Error building production chain:', error);
            let errorMessage = `❌ Error loading production chain for "${ingredientName}"\n\n`;

            if (error.message.includes('timed out')) {
                errorMessage += `⏱️ The production chain is too complex and timed out.\n\n`;
                errorMessage += `💡 Try:\n`;
                errorMessage += `• Building smaller sub-chains first\n`;
                errorMessage += `• Using the "Create New" option instead\n`;
                errorMessage += `• Checking for circular dependencies\n`;
            } else {
                errorMessage += `📋 Error details: ${error.message}\n\n`;
                errorMessage += `💡 This might be due to:\n`;
                errorMessage += `• Missing recipe data\n`;
                errorMessage += `• Circular dependencies\n`;
                errorMessage += `• Very complex production chains\n`;
            }

            alert(errorMessage);
        } finally {
            setIsLoadingProductionChain(false);
        }
    };

    // Apply suggestion from the suggestion engine
    const applySuggestion = (suggestedRecipe) => {
        setNewRecipes([...newRecipes, {
            id: Date.now(),
            ...suggestedRecipe
        }]);
        setShowSuggestions(false);
        setSuggestionsFor(null);
    };

    // Export all recipes to CSV
    const exportToCSV = () => {
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'InternalRecipeID'
        ];

        // Helper function to convert name to kebab-case
        const toKebabCase = (str) => {
            return str.toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and dashes
                .replace(/\s+/g, '-') // Replace spaces with dashes
                .replace(/-+/g, '-') // Replace multiple dashes with single dash
                .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        };

        // Helper function to generate outputId based on type and name
        const generateOutputId = (outputName, outputType) => {
            const kebabName = toKebabCase(outputName);

            switch (outputType) {
                case 'INGREDIENT':
                    return `ingredient-${kebabName}`;
                case 'COMPONENT':
                    return `component-${kebabName}`;
                case 'SHIP_COMPONENTS':
                    return `ship-component-${kebabName}`;
                case 'COUNTERMEASURES':
                    return `countermeasure-${kebabName}`;
                default:
                    return kebabName;
            }
        };

        const csvData = recipes.map((recipe, index) => {
            // Generate outputId in the same format as existing CSV
            const outputId = generateOutputId(recipe.outputName, recipe.outputType);

            // Create array with basic recipe info
            const row = [
                outputId, // Use generated kebab-case ID
                recipe.outputName,
                recipe.outputType,
                recipe.outputTier || '',
                recipe.constructionTime || '',
                recipe.planetTypes || '',
                recipe.factions || '',
                recipe.resourceType || '',
                recipe.functionalPurpose || '',
                recipe.usageCategory || ''
            ];

            // Add ingredient/quantity pairs (up to 9 ingredients)
            for (let i = 0; i < 9; i++) {
                if (recipe.ingredients[i]) {
                    row.push(recipe.ingredients[i].name || ''); // Ingredient
                    row.push(recipe.ingredients[i].quantity || 1); // Quantity
                } else {
                    row.push(''); // Empty ingredient
                    row.push(''); // Empty quantity
                }
            }

            // Add completion status and internal ID
            row.push(recipe.completionStatus || 'missing');
            row.push(recipe.id); // Internal tracking ID

            return row;
        });

        // Combine headers and data
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'production_chain_recipes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Exported ${recipes.length} recipes to CSV`);
    };

    // Export current production chain to CSV
    const exportProductionChainToCSV = () => {
        if (!currentProductionChain || newRecipes.length === 0) {
            alert('No production chain available to export. Please select a resource and build a production chain first.');
            return;
        }

        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'InternalRecipeID'
        ];

        // Helper function to convert name to kebab-case
        const toKebabCase = (str) => {
            return str.toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and dashes
                .replace(/\s+/g, '-') // Replace spaces with dashes
                .replace(/-+/g, '-') // Replace multiple dashes with single dash
                .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        };

        // Helper function to generate outputId based on type and name
        const generateOutputId = (outputName, outputType) => {
            const kebabName = toKebabCase(outputName);

            switch (outputType) {
                case 'INGREDIENT':
                    return `ingredient-${kebabName}`;
                case 'COMPONENT':
                    return `component-${kebabName}`;
                case 'SHIP_COMPONENTS':
                    return `ship-component-${kebabName}`;
                case 'COUNTERMEASURES':
                    return `countermeasure-${kebabName}`;
                default:
                    return kebabName;
            }
        };

        const csvData = newRecipes.map((recipe, index) => {
            // Generate outputId in the same format as existing CSV
            const outputId = generateOutputId(recipe.outputName, recipe.outputType);

            // Create array with basic recipe info
            const row = [
                outputId, // Use generated kebab-case ID
                recipe.outputName,
                recipe.outputType,
                recipe.outputTier || '',
                recipe.constructionTime || '',
                recipe.planetTypes || '',
                recipe.factions || '',
                recipe.resourceType || '',
                recipe.functionalPurpose || '',
                recipe.usageCategory || ''
            ];

            // Add ingredient/quantity pairs (up to 9 ingredients)
            for (let i = 0; i < 9; i++) {
                if (recipe.ingredients[i]) {
                    row.push(recipe.ingredients[i].name || ''); // Ingredient
                    row.push(recipe.ingredients[i].quantity || 1); // Quantity
                } else {
                    row.push(''); // Empty ingredient
                    row.push(''); // Empty quantity
                }
            }

            // Add completion status and internal ID
            row.push(recipe.completionStatus || 'missing');
            row.push(recipe.id); // Internal tracking ID

            return row;
        });

        // Combine headers and data
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Use the selected ingredient name in the filename
        const selectedResourceName = selectedIngredient || 'production-chain';
        const safeFileName = toKebabCase(selectedResourceName);
        link.setAttribute('download', `${safeFileName}-production-chain.csv`);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Exported ${newRecipes.length} production chain recipes for "${selectedIngredient}" to CSV`);
        alert(`✅ Exported ${newRecipes.length} recipes from "${selectedIngredient}" production chain to CSV!`);
    };

    // Helper function to extract ingredients from recipe (needed for production chain analysis)
    const extractIngredients = (recipe) => {
        const ingredients = [];

        console.log(`[DEBUG] Extracting ingredients from recipe: ${recipe.OutputName || recipe.outputName}`);
        console.log(`[DEBUG] Recipe structure:`, {
            hasIngredientsArray: !!recipe.ingredients,
            ingredientsArrayLength: recipe.ingredients ? recipe.ingredients.length : 0,
            ingredient1: recipe.Ingredient1,
            ingredient2: recipe.Ingredient2,
            ingredient3: recipe.Ingredient3,
            allKeys: Object.keys(recipe).filter(key => key.toLowerCase().includes('ingredient'))
        });

        // Handle both new and old recipe formats
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            console.log(`[DEBUG] Using new format (ingredients array) for ${recipe.OutputName || recipe.outputName}`);
            const filtered = recipe.ingredients.filter(ing => {
                const name = ing.name || ing.ingredient || ing.outputName;
                return name && name.trim();
            }).map(ing => ({
                name: ing.name || ing.ingredient || ing.outputName,
                quantity: ing.quantity || ing.amount || 1
            }));
            console.log(`[DEBUG] Filtered ingredients:`, filtered);
            return filtered;
        }

        // Handle old format with Ingredient1, Ingredient2, etc.
        console.log(`[DEBUG] Using old format (Ingredient1, Ingredient2, etc.) for ${recipe.OutputName || recipe.outputName}`);
        for (let i = 1; i <= 9; i++) {
            const ingredient = recipe[`Ingredient${i}`];
            if (ingredient && ingredient.trim()) {
                console.log(`[DEBUG] Found Ingredient${i}: ${ingredient}`);
                ingredients.push({ name: ingredient.trim() });
            }
        }

        console.log(`[DEBUG] Final extracted ingredients for ${recipe.OutputName || recipe.outputName}:`, ingredients);
        return ingredients;
    };

    // NEW: Export existing production chain directly from CSV data (no editing required)
    const exportExistingProductionChain = (ingredientName) => {
        if (!ingredientName) {
            alert('Please select an ingredient first.');
            return;
        }

        console.log(`Analyzing existing production chain for: ${ingredientName}`);

        // Build the complete production chain from existing CSV data
        const chainRecipes = new Map();
        const visited = new Set();

        const collectChainRecipes = (itemName, depth = 0) => {
            console.log(`[DEBUG] Collecting chain recipes for: ${itemName} (depth: ${depth})`);

            if (visited.has(itemName) || depth > 10) {
                console.log(`[DEBUG] Skipping ${itemName} - already visited or max depth reached`);
                return;
            }
            visited.add(itemName);

            // Find the recipe for this item
            const recipe = recipes.find(r => (r.OutputName || r.outputName) === itemName);
            if (!recipe) {
                console.log(`[DEBUG] No recipe found for: ${itemName}`);
                return;
            }

            console.log(`[DEBUG] Found recipe for ${itemName}:`, {
                outputName: recipe.OutputName || recipe.outputName,
                outputType: recipe.OutputType || recipe.outputType,
                hasIngredient1: !!recipe.Ingredient1,
                hasIngredient2: !!recipe.Ingredient2,
                ingredient1Value: recipe.Ingredient1,
                ingredient2Value: recipe.Ingredient2
            });

            // Add this recipe to the chain
            chainRecipes.set(itemName, recipe);

            // Recursively collect ingredient recipes
            const ingredients = extractIngredients(recipe);
            console.log(`[DEBUG] Extracted ${ingredients.length} ingredients from ${itemName}:`, ingredients.map(ing => ing.name));

            ingredients.forEach(ingredient => {
                if (ingredient && ingredient.name) {
                    collectChainRecipes(ingredient.name, depth + 1);
                }
            });
        };

        // Start the collection
        collectChainRecipes(ingredientName);

        if (chainRecipes.size === 0) {
            alert(`No production chain found for "${ingredientName}". This might be a basic resource or the recipe doesn't exist.`);
            return;
        }

        console.log(`Found ${chainRecipes.size} recipes in production chain for ${ingredientName}`);

        // Convert to array and prepare for CSV export
        const chainRecipesArray = Array.from(chainRecipes.values());

        // DEBUG: Show structure of first recipe to understand field names
        if (chainRecipesArray.length > 0) {
            const firstRecipe = chainRecipesArray[0];
            console.log(`[DEBUG] FIRST RECIPE STRUCTURE:`, firstRecipe);
            console.log(`[DEBUG] FIRST RECIPE KEYS:`, Object.keys(firstRecipe));
            console.log(`[DEBUG] Looking for ingredient fields in first recipe:`);
            Object.keys(firstRecipe).forEach(key => {
                if (key.toLowerCase().includes('ingredient') || key.toLowerCase().includes('quantity')) {
                    console.log(`[DEBUG] Found ingredient/quantity field: ${key} = ${firstRecipe[key]}`);
                }
            });
        }

        // Use the same CSV generation logic as the other export functions
        const headers = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'InternalRecipeID'
        ];

        // Helper function to convert name to kebab-case
        const toKebabCase = (str) => {
            return str.toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and dashes
                .replace(/\s+/g, '-') // Replace spaces with dashes
                .replace(/-+/g, '-') // Replace multiple dashes with single dash
                .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        };

        // Helper function to generate outputId based on type and name
        const generateOutputId = (outputName, outputType) => {
            const kebabName = toKebabCase(outputName);

            switch (outputType) {
                case 'INGREDIENT':
                    return `ingredient-${kebabName}`;
                case 'COMPONENT':
                    return `component-${kebabName}`;
                case 'SHIP_COMPONENTS':
                    return `ship-component-${kebabName}`;
                case 'COUNTERMEASURES':
                    return `countermeasure-${kebabName}`;
                default:
                    return kebabName;
            }
        };

        const csvData = chainRecipesArray.map((recipe, index) => {
            console.log(`[DEBUG] Processing recipe ${index + 1}/${chainRecipesArray.length}: ${recipe.OutputName || recipe.outputName}`);

            // Generate outputId in the same format as existing CSV
            const outputId = generateOutputId(recipe.OutputName || recipe.outputName, recipe.OutputType || recipe.outputType);

            // Create array with basic recipe info
            const row = [
                outputId,
                recipe.OutputName || recipe.outputName,
                recipe.OutputType || recipe.outputType,
                recipe.OutputTier || recipe.outputTier || '',
                recipe.ConstructionTime || recipe.constructionTime || '',
                recipe.PlanetTypes || recipe.planetTypes || '',
                recipe.Factions || recipe.factions || '',
                recipe.ResourceType || recipe.resourceType || '',
                recipe.FunctionalPurpose || recipe.functionalPurpose || '',
                recipe.UsageCategory || recipe.usageCategory || ''
            ];

            // Only show detailed debugging for first few recipes to avoid console spam
            if (index < 3) {
                console.log(`[DEBUG] Recipe ${recipe.OutputName || recipe.outputName} ingredient fields check:`);
                console.log(`[DEBUG] All recipe keys:`, Object.keys(recipe));
                console.log(`[DEBUG] Recipe object sample:`, recipe);

                const ingredientFields = {};
                for (let i = 1; i <= 9; i++) {
                    ingredientFields[`Ingredient${i}`] = recipe[`Ingredient${i}`];
                    ingredientFields[`Quantity${i}`] = recipe[`Quantity${i}`];
                }
                console.log(`[DEBUG] Ingredient fields:`, ingredientFields);

                // Check for alternative field names
                const alternativeFields = {};
                Object.keys(recipe).forEach(key => {
                    if (key.toLowerCase().includes('ingredient') || key.toLowerCase().includes('quantity')) {
                        alternativeFields[key] = recipe[key];
                    }
                });
                console.log(`[DEBUG] Alternative ingredient/quantity fields:`, alternativeFields);
            }

            // Add ingredient/quantity pairs (up to 9 ingredients)
            let ingredientCount = 0;

            // Handle ingredients array format (new format)
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                if (index < 3) {
                    console.log(`[DEBUG] Using ingredients array format for ${recipe.OutputName || recipe.outputName}`);
                    console.log(`[DEBUG] Ingredients array:`, recipe.ingredients);
                }

                for (let i = 0; i < 9; i++) {
                    if (i < recipe.ingredients.length) {
                        const ingredient = recipe.ingredients[i];
                        const ingredientName = ingredient.name || ingredient.ingredient || ingredient.outputName || '';
                        const quantity = ingredient.quantity || ingredient.amount || 1;

                        if (ingredientName) {
                            if (index < 3) {
                                console.log(`[DEBUG] Adding Ingredient${i + 1}: ${ingredientName}, Quantity: ${quantity}`);
                            }
                            row.push(ingredientName); // Ingredient
                            row.push(quantity); // Quantity
                            ingredientCount++;
                        } else {
                            row.push(''); // Empty ingredient
                            row.push(''); // Empty quantity
                        }
                    } else {
                        row.push(''); // Empty ingredient
                        row.push(''); // Empty quantity
                    }
                }
            } else {
                // Handle old format with Ingredient1, Ingredient2, etc. (fallback)
                if (index < 3) {
                    console.log(`[DEBUG] Using old Ingredient1, Ingredient2 format for ${recipe.OutputName || recipe.outputName}`);
                }

                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    const quantity = recipe[`Quantity${i}`];

                    if (ingredient && ingredient.trim()) {
                        if (index < 3) {
                            console.log(`[DEBUG] Adding Ingredient${i}: ${ingredient.trim()}, Quantity: ${quantity || 1}`);
                        }
                        row.push(ingredient.trim()); // Ingredient
                        row.push(quantity || 1); // Quantity
                        ingredientCount++;
                    } else {
                        row.push(''); // Empty ingredient
                        row.push(''); // Empty quantity
                    }
                }
            }

            console.log(`[DEBUG] Recipe ${recipe.OutputName || recipe.outputName} has ${ingredientCount} ingredients in CSV row`);

            // Add completion status and internal ID
            row.push(recipe.CompletionStatus || recipe.completionStatus || 'complete');
            row.push(recipe.id || recipe.OutputID || recipe.outputID || ''); // Internal tracking ID

            console.log(`[DEBUG] Final row length: ${row.length}, Expected: ${headers.length}`);
            return row;
        });

        // Combine headers and data
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Use the selected ingredient name in the filename
        const safeFileName = toKebabCase(ingredientName);
        link.setAttribute('download', `${safeFileName}-existing-production-chain.csv`);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Exported ${chainRecipesArray.length} existing production chain recipes for "${ingredientName}" to CSV`);
        alert(`✅ Exported ${chainRecipesArray.length} recipes from existing "${ingredientName}" production chain to CSV!`);
    };

    // NEW: Export ingredient optimization report for AI analysis

    const exportIngredientOptimizationReport = () => {
        console.log('Generating ingredient optimization report...');

        // Get all INGREDIENT type recipes
        const allIngredientRecipes = recipes.filter(recipe => {
            const outputType = (recipe.outputType || recipe.OutputType || '').toUpperCase();
            return outputType === 'INGREDIENT';
        });

        // Filter to only include ingredients used in XXXS to M ships (exclude L, CAP, CMD, CLASS8, TTN)
        const ingredientRecipes = allIngredientRecipes.filter(recipe => {
            const ingredientName = recipe.outputName || recipe.OutputName;
            return isUsedInSmallMediumShipsOnly(ingredientName);
        });

        console.log(`Found ${allIngredientRecipes.length} total ingredient recipes`);
        console.log(`Filtered to ${ingredientRecipes.length} ingredients used only in XXXS-M ships`);

        if (ingredientRecipes.length === 0) {
            alert('No ingredient recipes found to analyze.');
            return;
        }

        // Analyze each ingredient's production chain
        const ingredientAnalysis = ingredientRecipes.map(recipe => {
            const ingredientName = recipe.outputName || recipe.OutputName;

            // Build production chain for this ingredient
            const chainRecipes = new Map();
            const visited = new Set();
            const rawResources = new Set();

            const analyzeChain = (itemName, depth = 0) => {
                if (visited.has(itemName) || depth > 10) return;
                visited.add(itemName);

                const itemRecipe = recipes.find(r => (r.OutputName || r.outputName) === itemName);
                if (!itemRecipe) {
                    // If no recipe found, assume it's a raw resource
                    rawResources.add(itemName);
                    return;
                }

                const outputType = (itemRecipe.outputType || itemRecipe.OutputType || '').toUpperCase();
                if (outputType === 'BASIC RESOURCE') {
                    rawResources.add(itemName);
                }

                chainRecipes.set(itemName, itemRecipe);

                // Analyze ingredients
                if (itemRecipe.ingredients && Array.isArray(itemRecipe.ingredients)) {
                    itemRecipe.ingredients.forEach(ing => {
                        const ingName = ing.name || ing.ingredient || ing.outputName;
                        if (ingName) {
                            analyzeChain(ingName, depth + 1);
                        }
                    });
                }
            };

            analyzeChain(ingredientName);

            return {
                name: ingredientName,
                tier: recipe.outputTier || recipe.OutputTier || 1,
                directIngredients: recipe.ingredients || [],
                chainSize: chainRecipes.size,
                rawResourceCount: rawResources.size,
                rawResources: Array.from(rawResources),
                productionChain: Array.from(chainRecipes.values()),
                needsOptimization: rawResources.size > 5,
                usedInShipSizes: getShipSizesUsingIngredient(ingredientName) // Add ship size info
            };
        });

        // Sort by raw resource count (most problematic first)
        ingredientAnalysis.sort((a, b) => b.rawResourceCount - a.rawResourceCount);

        // Get all unique raw resources across all ingredients
        const allRawResources = new Set();
        ingredientAnalysis.forEach(ing => {
            ing.rawResources.forEach(res => allRawResources.add(res));
        });

        // Generate markdown report
        let report = `# Ingredient Production Chain Optimization Report\n\n`;
        report += `**Generated:** ${new Date().toLocaleString()}\n`;
        report += `**Focus:** Small to Medium Ships (XXXS, XXS, XS, S, M)\n`;
        report += `**Goal:** Reduce raw resource complexity while maintaining resource diversity\n`;
        report += `**Scope:** Excluding Large ship ingredients (L, CAP, CMD, CLASS8, TTN) as they are intended to be complex\n\n`;

        // Executive Summary
        report += `## Executive Summary\n\n`;
        report += `- **Total Ingredients in System:** ${allIngredientRecipes.length}\n`;
        report += `- **Small/Medium Ship Ingredients Analyzed:** ${ingredientAnalysis.length}\n`;
        report += `- **Ingredients Needing Optimization:** ${ingredientAnalysis.filter(ing => ing.needsOptimization).length}\n`;
        report += `- **Total Unique Raw Resources:** ${allRawResources.size}\n`;
        report += `- **Target:** Max 5 raw resources per ingredient\n`;
        report += `- **Large Ship Ingredients Excluded:** ${allIngredientRecipes.length - ingredientRecipes.length} (complexity acceptable)\n\n`;

        // Raw Resource Usage Analysis
        report += `## Raw Resource Usage Analysis\n\n`;
        const resourceUsage = {};
        ingredientAnalysis.forEach(ing => {
            ing.rawResources.forEach(res => {
                if (!resourceUsage[res]) resourceUsage[res] = [];
                resourceUsage[res].push(ing.name);
            });
        });

        const sortedResources = Object.entries(resourceUsage)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 20); // Top 20 most used

        report += `### Most Utilized Raw Resources (Top 20)\n\n`;
        sortedResources.forEach(([resource, users], index) => {
            report += `${index + 1}. **${resource}** - Used by ${users.length} ingredients\n`;
        });
        report += `\n`;

        // Ingredient Analysis
        report += `## Ingredient Optimization Targets\n\n`;
        report += `### Critical Priority (>10 Raw Resources)\n\n`;

        const criticalIngredients = ingredientAnalysis.filter(ing => ing.rawResourceCount > 10);
        if (criticalIngredients.length > 0) {
            criticalIngredients.forEach(ing => {
                report += `#### ${ing.name} (Tier ${ing.tier})\n`;
                report += `- **Current Raw Resources:** ${ing.rawResourceCount} (Target: 5)\n`;
                report += `- **Reduction Needed:** ${ing.rawResourceCount - 5} resources\n`;
                report += `- **Direct Ingredients:** ${ing.directIngredients.length}\n`;
                report += `- **Production Chain Size:** ${ing.chainSize} recipes\n`;
                report += `- **Used in Ship Sizes:** ${ing.usedInShipSizes.join(', ')}\n\n`;

                report += `**Current Raw Resources:**\n`;
                ing.rawResources.forEach(res => {
                    const usageCount = resourceUsage[res]?.length || 0;
                    report += `- ${res} (used by ${usageCount} ingredients)\n`;
                });
                report += `\n`;

                report += `**Direct Recipe Ingredients:**\n`;
                ing.directIngredients.forEach(ingredient => {
                    const ingName = ingredient.name || ingredient.ingredient || ingredient.outputName;
                    const quantity = ingredient.quantity || ingredient.amount || 1;
                    report += `- ${ingName} (${quantity})\n`;
                });
                report += `\n`;

                report += `**AI Optimization Task:**\n`;
                report += `1. Identify which direct ingredients contribute most to raw resource complexity\n`;
                report += `2. Suggest consolidation opportunities with other high-usage raw resources\n`;
                report += `3. Recommend ingredient substitutions that reduce unique resource count\n`;
                report += `4. Maintain functionality while achieving 5 or fewer raw resources\n\n`;
                report += `---\n\n`;
            });
        } else {
            report += `No ingredients require critical optimization.\n\n`;
        }

        report += `### High Priority (6-10 Raw Resources)\n\n`;
        const highPriorityIngredients = ingredientAnalysis.filter(ing => ing.rawResourceCount >= 6 && ing.rawResourceCount <= 10);
        if (highPriorityIngredients.length > 0) {
            highPriorityIngredients.forEach(ing => {
                report += `#### ${ing.name} (Tier ${ing.tier})\n`;
                report += `- **Current Raw Resources:** ${ing.rawResourceCount} (Target: 5)\n`;
                report += `- **Reduction Needed:** ${ing.rawResourceCount - 5} resources\n`;
                report += `- **Direct Ingredients:** ${ing.directIngredients.map(i => i.name || i.ingredient || i.outputName).join(', ')}\n`;
                report += `- **Raw Resources:** ${ing.rawResources.join(', ')}\n\n`;
            });
        } else {
            report += `No ingredients in this priority level.\n\n`;
        }

        report += `### Optimized Ingredients (≤5 Raw Resources)\n\n`;
        const optimizedIngredients = ingredientAnalysis.filter(ing => ing.rawResourceCount <= 5);
        report += `**Count:** ${optimizedIngredients.length} ingredients already meet the target.\n\n`;
        if (optimizedIngredients.length > 0) {
            report += `**Examples of well-optimized ingredients:**\n`;
            optimizedIngredients.slice(0, 10).forEach(ing => {
                report += `- ${ing.name}: ${ing.rawResourceCount} raw resources\n`;
            });
            report += `\n`;
        }

        // Optimization Strategies
        report += `## AI Optimization Strategies\n\n`;
        report += `### 1. Resource Consolidation\n`;
        report += `- Focus on ingredients using the top 10 most common raw resources\n`;
        report += `- Prioritize substitutions that maintain resource diversity across all ingredients\n`;
        report += `- Consider creating intermediate components that combine multiple raw resources\n\n`;

        report += `### 2. Tier-Based Optimization\n`;
        report += `- Higher tier ingredients can justify slightly more complexity\n`;
        report += `- Lower tier ingredients should use fewer, more common resources\n`;
        report += `- Maintain logical progression from simple to complex\n\n`;

        report += `### 3. Functional Grouping\n`;
        report += `- Group ingredients by similar functionality\n`;
        report += `- Share common resource bases within functional groups\n`;
        report += `- Avoid resource overlap between unrelated ingredient types\n\n`;

        report += `## Resource Utilization Goals\n\n`;
        report += `### Target Distribution\n`;
        report += `- **All ${allRawResources.size} raw resources should remain in use**\n`;
        report += `- **Each raw resource should be used by multiple ingredients**\n`;
        report += `- **No ingredient should require more than 5 raw resources**\n`;
        report += `- **Maintain logical production complexity scaling**\n\n`;

        report += `### Success Metrics\n`;
        report += `- Reduce average raw resources per ingredient to ≤4\n`;
        report += `- Ensure all ${allRawResources.size} raw resources remain utilized\n`;
        report += `- Maintain production chain logical flow\n`;
        report += `- Preserve ingredient tier progression complexity\n\n`;

        // Export the report
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ingredient-optimization-report-${new Date().toISOString().split('T')[0]}.md`;
        a.style.visibility = 'hidden';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Generated ingredient optimization report for ${ingredientAnalysis.length} ingredients`);
        alert(`✅ Generated ingredient optimization report!\n\nAnalyzed: ${ingredientAnalysis.length} ingredients\nNeed optimization: ${ingredientAnalysis.filter(ing => ing.needsOptimization).length}\nTotal raw resources: ${allRawResources.size}`);
    };

    // Refresh completion status for all ingredients based on current recipe availability
    const refreshCompletionStatus = () => {
        console.log('Refreshing completion status for all ingredients...');
        let updatedCount = 0;

        // Get all ingredients that might need status updates
        const ingredientsToUpdate = [...ingredients, ...components.filter(c => c.outputType === 'INGREDIENT')];

        ingredientsToUpdate.forEach(ingredient => {
            const currentStatus = ingredient.completionStatus;
            const calculatedStatus = calculateCompletionStatus(ingredient.name);

            if (currentStatus !== calculatedStatus) {
                console.log(`Updating ${ingredient.name}: ${currentStatus} -> ${calculatedStatus}`);

                // Update the ingredient with new completion status
                const updatedIngredient = {
                    ...ingredient,
                    completionStatus: calculatedStatus,
                    modified: true
                };

                if (ingredient.type === 'ingredient' || ingredients.includes(ingredient)) {
                    // This is an ingredient - we'd need to update via context if there was an updateIngredient function
                    // For now, just log the change
                    console.log('Would update ingredient:', updatedIngredient);
                } else {
                    // This is a component marked as INGREDIENT
                    updateComponent(updatedIngredient);
                }
                updatedCount++;
            }
        });

        alert(`Completion status refreshed! Updated ${updatedCount} ingredients.`);
    };

    // Handle suggestions request
    const handleShowSuggestions = (ingredientName) => {
        setSuggestionsFor(ingredientName);
        setShowSuggestions(true);
    };

    // Handle usage analysis request
    const handleShowUsageAnalysis = (ingredientName) => {
        const usage = ingredientUsageStats.get(ingredientName);
        setSelectedIngredientUsage({ ingredientName, ...usage });
        setShowUsageAnalysis(true);
    };

    // Quick fix for Access Control - create proper recipe with ingredients
    const quickFixAccessControl = () => {
        console.log('Quick fixing Access Control recipe...');

        // Create a proper Access Control recipe with RAW MATERIALS (not intermediate components)
        const accessControlRecipe = {
            id: `quick-fix-access-control-${Date.now()}`,
            outputName: 'Access Control',
            outputType: 'INGREDIENT',
            outputTier: 4,
            resourceType: 'INGREDIENT',
            functionalPurpose: 'PRODUCTION',
            ingredients: [
                { name: 'Silicon Crystal', quantity: 2 }, // Raw material from Dark Planet
                { name: 'Copper Ore', quantity: 3 },      // Raw material from Barren Planet  
                { name: 'Lithium Ore', quantity: 1 },     // Raw material from Barren Planet
                null, null, null, null, null, null
            ],
            constructionTime: 120,
            completionStatus: 'complete',
            planetTypes: '',
            factions: 'MUD;ONI;USTUR',
            usageCategory: 'Manufacturing',
            forceComplete: true // Override dependency checking
        };

        console.log('Adding quick fix recipe with raw materials:', accessControlRecipe);
        addRecipe(accessControlRecipe);

        alert('✅ Quick fix applied! Access Control now uses RAW MATERIALS: Silicon Crystal (2), Copper Ore (3), Lithium Ore (1). Should be COMPLETE immediately!');
    };

    // Quick fix for Circuit Board
    const quickFixCircuitBoard = () => {
        const circuitBoardRecipe = {
            id: `quick-fix-circuit-board-${Date.now()}`,
            outputName: 'Circuit Board',
            outputType: 'COMPONENT',
            outputTier: 3,
            resourceType: 'ELECTRONIC_COMPONENT',
            functionalPurpose: 'PRODUCTION',
            ingredients: [
                { name: 'Silicon Crystal', quantity: 1 },
                { name: 'Copper Ore', quantity: 2 },
                { name: 'Silver Ore', quantity: 1 },
                null, null, null, null, null, null
            ],
            constructionTime: 90,
            completionStatus: 'complete',
            planetTypes: '',
            factions: 'MUD;ONI;USTUR',
            usageCategory: 'Manufacturing'
        };
        addRecipe(circuitBoardRecipe);
        alert('✅ Circuit Board recipe added!');
    };

    // Quick fix for Memory Core
    const quickFixMemoryCore = () => {
        const memoryCoreRecipe = {
            id: `quick-fix-memory-core-${Date.now()}`,
            outputName: 'Memory Core',
            outputType: 'COMPONENT',
            outputTier: 2,
            resourceType: 'ELECTRONIC_COMPONENT',
            functionalPurpose: 'PRODUCTION',
            ingredients: [
                { name: 'Data Storage Bio Crystals', quantity: 1 },
                { name: 'Topaz Crystals', quantity: 1 },
                { name: 'Lithium Ore', quantity: 1 },
                null, null, null, null, null, null
            ],
            constructionTime: 60,
            completionStatus: 'complete',
            planetTypes: '',
            factions: 'MUD;ONI;USTUR',
            usageCategory: 'Manufacturing'
        };
        addRecipe(memoryCoreRecipe);
        alert('✅ Memory Core recipe added!');
    };

    // Quick fix for Signal Processor
    const quickFixSignalProcessor = () => {
        const signalProcessorRecipe = {
            id: `quick-fix-signal-processor-${Date.now()}`,
            outputName: 'Signal Processor',
            outputType: 'COMPONENT',
            outputTier: 2,
            resourceType: 'ELECTRONIC_COMPONENT',
            functionalPurpose: 'PRODUCTION',
            ingredients: [
                { name: 'Silicon Crystal', quantity: 1 },
                { name: 'Germanium', quantity: 1 },
                null, null, null, null, null, null, null
            ],
            constructionTime: 45,
            completionStatus: 'complete',
            planetTypes: '',
            factions: 'MUD;ONI;USTUR',
            usageCategory: 'Manufacturing'
        };
        addRecipe(signalProcessorRecipe);
        alert('✅ Signal Processor recipe added!');
    };

    // Mark all user-created recipes as complete (bypass dependency checking)
    const markAllUserRecipesAsComplete = () => {
        let updatedCount = 0;

        // Find all recipes that were created by the user (have recent IDs or specific patterns)
        const userCreatedRecipes = recipes.filter(recipe => {
            return recipe.id && (
                recipe.id.toString().includes('quick-fix') ||
                recipe.id.toString().length > 10 || // Long timestamp IDs
                !recipe.fromCSV
            );
        });

        console.log('Found user-created recipes:', userCreatedRecipes.map(r => r.outputName));

        userCreatedRecipes.forEach(recipe => {
            const updatedRecipe = {
                ...recipe,
                completionStatus: 'complete',
                allIngredientsComplete: true,
                forceComplete: true, // Flag to override dependency checking
                fromUser: true, // Mark as user-created for future reference
                dateCompleted: new Date().toISOString() // Track when completed
            };
            updateRecipe(updatedRecipe);
            updatedCount++;
        });

        // Force refresh of completion status for all ingredients
        setTimeout(() => {
            window.location.reload(); // Simple page refresh to update all UI
        }, 500);

        alert(`✅ Marked ${updatedCount} user-created recipes as COMPLETE! Page will refresh in 0.5 seconds.\n\n💡 Next steps:\n1. Export CSV to save your work\n2. Reload CSV to use these recipes in new production chains`);
    };

    // Complete workflow: Mark complete + Export + Reload
    const completeWorkflowCycle = async () => {
        // First mark all user recipes as complete
        let updatedCount = 0;
        const userCreatedRecipes = recipes.filter(recipe => {
            return recipe.id && (
                recipe.id.toString().includes('quick-fix') ||
                recipe.id.toString().length > 10 ||
                !recipe.fromCSV
            );
        });

        userCreatedRecipes.forEach(recipe => {
            const updatedRecipe = {
                ...recipe,
                completionStatus: 'complete',
                allIngredientsComplete: true,
                forceComplete: true,
                fromUser: true,
                dateCompleted: new Date().toISOString()
            };
            updateRecipe(updatedRecipe);
            updatedCount++;
        });

        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 200));

        // Auto-export CSV
        exportToCSV();

        // Prompt for reload
        const shouldReload = window.confirm(
            `✅ Workflow Complete!\n\n` +
            `• Marked ${updatedCount} recipes as COMPLETE\n` +
            `• Exported updated CSV with your new recipes\n\n` +
            `Click OK to reload CSV data and start your next production chain.\n` +
            `Click Cancel to continue without reloading.`
        );

        if (shouldReload) {
            reloadFromCSV();
        }
    };

    // Wrapper for cleanup with loading state
    const handleCleanupCSV = async () => {
        const button = document.querySelector('.cleanup-btn');
        if (!button) return;

        const originalText = button.textContent;
        const originalStyle = button.style.background;

        // Set loading state
        button.textContent = '⏳ Cleaning up...';
        button.style.background = 'linear-gradient(45deg, #6c757d, #545b62)';
        button.disabled = true;

        try {
            await cleanupCSV();
        } catch (error) {
            console.error('Cleanup error:', error);
        } finally {
            // Reset button state
            button.textContent = originalText;
            button.style.background = originalStyle;
            button.disabled = false;
        }
    };

    const cleanupCSV = async () => {
        console.log('Starting CSV cleanup process...');

        try {
            // Read the current CSV file
            const response = await fetch('/finalComponentList.csv');
            const csvText = await response.text();

            // Parse CSV
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',');
            const rows = lines.slice(1).map(line => {
                // Handle CSV parsing with quoted fields
                const result = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());

                return result;
            });

            console.log(`Parsed ${rows.length} rows from CSV`);

            // Convert rows to objects
            const records = rows.map(row => {
                const record = {};
                headers.forEach((header, index) => {
                    record[header.replace(/"/g, '')] = (row[index] || '').replace(/"/g, '');
                });
                return record;
            });

            console.log('Sample records:', records.slice(0, 3));

            // STEP 1: Remove ALL duplicates (keeping ones with recipes intact)
            const uniqueRecords = new Map();
            const duplicatesRemoved = [];

            records.forEach(record => {
                const key = record.OutputName;
                if (!key) return;

                const hasRecipe = record.Ingredient1 && record.Ingredient1.trim() !== '';

                if (uniqueRecords.has(key)) {
                    const existing = uniqueRecords.get(key);
                    const existingHasRecipe = existing.Ingredient1 && existing.Ingredient1.trim() !== '';

                    // Keep the one with a recipe, or the first one if neither has a recipe
                    if (hasRecipe && !existingHasRecipe) {
                        duplicatesRemoved.push(existing);
                        uniqueRecords.set(key, record);
                        console.log(`Replaced duplicate "${key}" - keeping version with recipe`);
                    } else if (!hasRecipe && existingHasRecipe) {
                        duplicatesRemoved.push(record);
                        console.log(`Keeping existing "${key}" - it has a recipe`);
                    } else {
                        duplicatesRemoved.push(record);
                        console.log(`Removed duplicate "${key}"`);
                    }
                } else {
                    uniqueRecords.set(key, record);
                }
            });

            console.log(`Removed ${duplicatesRemoved.length} duplicates`);

            // STEP 2: Ensure all recipe ingredients exist as rows
            const missingIngredients = new Set();
            const allRecordsArray = Array.from(uniqueRecords.values());

            allRecordsArray.forEach(record => {
                // Check all 9 ingredient slots
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim() !== '') {
                        // Check if this ingredient exists as a record
                        if (!uniqueRecords.has(ingredient)) {
                            missingIngredients.add(ingredient);
                        }
                    }
                }
            });

            console.log(`Found ${missingIngredients.size} missing ingredients:`, Array.from(missingIngredients));

            // Add missing ingredients as raw resources or components
            Array.from(missingIngredients).forEach(ingredientName => {
                // Check if it's a raw resource from our raw resources data
                const rawResource = rawResources.find(r => r.name === ingredientName);

                if (rawResource) {
                    // Add as raw resource
                    const newRecord = {
                        OutputID: `raw-${ingredientName.toLowerCase().replace(/\s+/g, '-')}`,
                        OutputName: ingredientName,
                        OutputType: 'BASIC RESOURCE',
                        OutputTier: rawResource.tier || 0,
                        ConstructionTime: '',
                        PlanetTypes: rawResource.planetSources ? rawResource.planetSources.join(';') : '',
                        Factions: 'MUD;ONI;USTUR',
                        ResourceType: 'BASIC RESOURCE',
                        FunctionalPurpose: 'RESOURCE',
                        UsageCategory: 'Raw Material',
                        Ingredient1: '', Quantity1: '', Ingredient2: '', Quantity2: '', Ingredient3: '', Quantity3: '',
                        Ingredient4: '', Quantity4: '', Ingredient5: '', Quantity5: '', Ingredient6: '', Quantity6: '',
                        Ingredient7: '', Quantity7: '', Ingredient8: '', Quantity8: '', Ingredient9: '', Quantity9: '',
                        CompletionStatus: 'complete',
                        InternalRecipeID: `raw-${Date.now()}-${ingredientName.replace(/\s+/g, '-')}`
                    };
                    uniqueRecords.set(ingredientName, newRecord);
                    console.log(`Added missing raw resource: ${ingredientName}`);
                } else {
                    // Add as component without recipe
                    const newRecord = {
                        OutputID: `component-${ingredientName.toLowerCase().replace(/\s+/g, '-')}`,
                        OutputName: ingredientName,
                        OutputType: 'COMPONENT',
                        OutputTier: '1',
                        ConstructionTime: '',
                        PlanetTypes: '',
                        Factions: 'MUD;ONI;USTUR',
                        ResourceType: 'COMPONENT',
                        FunctionalPurpose: 'PRODUCTION',
                        UsageCategory: 'Manufacturing',
                        Ingredient1: '', Quantity1: '', Ingredient2: '', Quantity2: '', Ingredient3: '', Quantity3: '',
                        Ingredient4: '', Quantity4: '', Ingredient5: '', Quantity5: '', Ingredient6: '', Quantity6: '',
                        Ingredient7: '', Quantity7: '', Ingredient8: '', Quantity8: '', Ingredient9: '', Quantity9: '',
                        CompletionStatus: 'missing',
                        InternalRecipeID: `component-${Date.now()}-${ingredientName.replace(/\s+/g, '-')}`
                    };
                    uniqueRecords.set(ingredientName, newRecord);
                    console.log(`Added missing component: ${ingredientName}`);
                }
            });

            // STEP 3: Mark completed recipes properly
            let completedRecipesMarked = 0;
            Array.from(uniqueRecords.values()).forEach(record => {
                const hasRecipe = record.Ingredient1 && record.Ingredient1.trim() !== '';
                if (hasRecipe && record.CompletionStatus !== 'complete') {
                    record.CompletionStatus = 'complete';
                    completedRecipesMarked++;
                }
            });

            console.log(`Marked ${completedRecipesMarked} recipes as complete`);

            // STEP 4: Recursive Tier Validation - Ensure all tiers match their raw resource dependencies
            console.log('🔍 Starting recursive tier validation...');

            // Helper function to recursively find all raw resources in a production chain
            // Enhanced to return tier, PlanetTypes, and Factions information
            const rawResourcesCache = new Map(); // Optimization: Cache results to avoid duplicate calculations
            const findRawResourcesInChain = (recordName, visited = new Set()) => {
                // Check cache first
                if (rawResourcesCache.has(recordName)) {
                    return rawResourcesCache.get(recordName);
                }

                if (visited.has(recordName)) {
                    return []; // Prevent infinite loops
                }
                visited.add(recordName);

                const record = Array.from(uniqueRecords.values()).find(r => r.OutputName === recordName);
                if (!record) {
                    rawResourcesCache.set(recordName, []);
                    return []; // Record not found
                }

                // If this is a raw material, return it with all metadata
                if (record.OutputType === 'BASIC RESOURCE') {
                    const result = [{
                        name: recordName,
                        tier: parseInt(record.OutputTier) || 0,
                        planetTypes: (record.PlanetTypes || '').trim(),
                        factions: (record.Factions || '').trim()
                    }];
                    rawResourcesCache.set(recordName, result);
                    return result;
                }

                // Otherwise, recursively check all ingredients
                const rawResources = [];
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        const ingredientRaws = findRawResourcesInChain(ingredient, new Set(visited));
                        rawResources.push(...ingredientRaws);
                    }
                }

                // Cache the result
                rawResourcesCache.set(recordName, rawResources);
                return rawResources;
            };

            let tierCorrections = 0;
            const tierCorrectionLog = [];

            // ENHANCED TIER VALIDATION: Consider ALL ingredient tiers, not just raw resources
            console.log('🔧 Enhanced tier validation: considering ALL ingredient tiers...');

            const recalculateAllTiers = () => {
                let changed = true;
                let iterations = 0;
                const maxIterations = 10; // Prevent infinite loops
                let totalCorrections = 0;

                // Keep iterating until no more changes (handles nested dependencies)
                while (changed && iterations < maxIterations) {
                    changed = false;
                    iterations++;
                    console.log(`🔄 Tier calculation iteration ${iterations}...`);

                    Array.from(uniqueRecords.values()).forEach(record => {
                        const outputType = (record.OutputType || '').toUpperCase();

                        // Only recalculate COMPONENT and INGREDIENT tiers
                        if (outputType !== 'COMPONENT' && outputType !== 'INGREDIENT') {
                            return;
                        }

                        const name = record.OutputName;
                        const currentTier = parseInt(record.OutputTier || 1);

                        // Get all ingredients and their tiers
                        const ingredientTiers = [];

                        // Check all ingredient slots
                        for (let i = 1; i <= 9; i++) {
                            const ingredientName = record[`Ingredient${i}`];
                            if (ingredientName && ingredientName.trim()) {
                                const ingredientRecord = uniqueRecords.get(ingredientName.trim());
                                if (ingredientRecord) {
                                    const ingTier = parseInt(ingredientRecord.OutputTier || 1);
                                    ingredientTiers.push(ingTier);
                                }
                            }
                        }

                        if (ingredientTiers.length > 0) {
                            const maxIngredientTier = Math.max(...ingredientTiers);

                            // Component tier should be >= highest ingredient tier
                            if (currentTier < maxIngredientTier) {
                                const oldTier = currentTier;
                                record.OutputTier = maxIngredientTier.toString();

                                tierCorrectionLog.push({
                                    item: name,
                                    oldTier: oldTier,
                                    newTier: maxIngredientTier,
                                    outputType: outputType,
                                    correctionType: 'INGREDIENT_BASED'
                                });

                                totalCorrections++;
                                changed = true;

                                if (totalCorrections <= 15) { // Log first 15 for visibility
                                    console.log(`📈 ${outputType}: ${name} T${oldTier} → T${maxIngredientTier} (ingredient-based)`);
                                }
                            }
                        }
                    });
                }

                console.log(`✅ Enhanced tier recalculation complete after ${iterations} iterations. ${totalCorrections} corrections made.`);
                return totalCorrections;
            };

            // Run the enhanced tier recalculation
            const enhancedCorrections = recalculateAllTiers();
            tierCorrections = enhancedCorrections;

            // FALLBACK: Also run the old raw resource validation for any remaining issues
            console.log('🔄 Running fallback raw resource tier validation...');

            const allRecords = Array.from(uniqueRecords.values()).filter(record =>
                record.OutputType !== 'BASIC RESOURCE' && record.OutputName
            );

            allRecords.forEach(record => {
                const outputType = record.OutputType || '';
                if (!['COMPONENT', 'INGREDIENT'].includes(outputType)) {
                    return;
                }

                // Find all raw resources used in this item's production chain
                const rawResourcesUsed = findRawResourcesInChain(record.OutputName);

                if (rawResourcesUsed.length > 0) {
                    const maxRawTier = Math.max(...rawResourcesUsed.map(r => r.tier));
                    const currentTier = parseInt(record.OutputTier) || 0;

                    if (currentTier < maxRawTier) {
                        const oldTier = currentTier;
                        record.OutputTier = maxRawTier.toString();
                        tierCorrections++;

                        const rawResourceNames = rawResourcesUsed.map(r => `${r.name} (T${r.tier})`).join(', ');
                        tierCorrectionLog.push({
                            item: record.OutputName,
                            oldTier: oldTier,
                            newTier: maxRawTier,
                            rawResources: rawResourceNames,
                            outputType: outputType,
                            correctionType: 'RAW_RESOURCE_BASED'
                        });

                        console.log(`🔧 Fallback correction (${outputType}): ${record.OutputName} T${oldTier} → T${maxRawTier} (raw resource fallback)`);
                    }
                }
            });

            console.log(`Applied ${tierCorrections} total tier corrections (enhanced + fallback validation)`);

            // Log summary of tier corrections
            if (tierCorrectionLog.length > 0) {
                console.log('📈 Tier Corrections Summary:');
                console.log(`Total corrections: ${tierCorrectionLog.length}`);

                // Show first 5 corrections as examples
                tierCorrectionLog.slice(0, 5).forEach(correction => {
                    console.log(`  • ${correction.item}: T${correction.oldTier} → T${correction.newTier}`);
                });

                if (tierCorrectionLog.length > 5) {
                    console.log(`  ... and ${tierCorrectionLog.length - 5} more corrections`);
                }

                // Show tier distribution
                const tierDistribution = {};
                tierCorrectionLog.forEach(c => {
                    const key = `T${c.oldTier} → T${c.newTier}`;
                    tierDistribution[key] = (tierDistribution[key] || 0) + 1;
                });
                console.log('Tier correction distribution:', tierDistribution);
            }

            // STEP 4.5: Inherit PlanetTypes and Factions from Raw Resources
            console.log('🌍 Inheriting PlanetTypes and Factions from raw resources...');

            let planetFactionInheritances = 0;
            const planetFactionLog = [];

            const inheritPlanetTypesAndFactions = () => {
                Array.from(uniqueRecords.values()).forEach(record => {
                    const outputType = (record.OutputType || '').toUpperCase();

                    // Only process COMPONENT and INGREDIENT types (not BASIC RESOURCE)
                    if (outputType !== 'COMPONENT' && outputType !== 'INGREDIENT') {
                        return;
                    }

                    // Find all raw resources used in this item's production chain
                    const rawResourcesUsed = findRawResourcesInChain(record.OutputName);

                    if (rawResourcesUsed.length > 0) {
                        // Collect unique planet types and factions
                        const allPlanetTypes = new Set();
                        const allFactions = new Set();

                        rawResourcesUsed.forEach(rawResource => {
                            if (rawResource.planetTypes) {
                                // Split by semicolon and add each planet type
                                rawResource.planetTypes.split(';').forEach(planetType => {
                                    const trimmed = planetType.trim();
                                    if (trimmed) allPlanetTypes.add(trimmed);
                                });
                            }
                            if (rawResource.factions) {
                                // Split by semicolon and add each faction
                                rawResource.factions.split(';').forEach(faction => {
                                    const trimmed = faction.trim();
                                    if (trimmed) allFactions.add(trimmed);
                                });
                            }
                        });

                        // Combine inherited data
                        const inheritedPlanetTypes = Array.from(allPlanetTypes).sort().join(';');
                        const inheritedFactions = Array.from(allFactions).sort().join(';');

                        // Only update if we have inherited data and it's different from current
                        let updated = false;
                        const oldPlanetTypes = record.PlanetTypes || '';
                        const oldFactions = record.Factions || '';

                        if (inheritedPlanetTypes && inheritedPlanetTypes !== oldPlanetTypes) {
                            record.PlanetTypes = inheritedPlanetTypes;
                            updated = true;
                        }

                        if (inheritedFactions && inheritedFactions !== oldFactions) {
                            record.Factions = inheritedFactions;
                            updated = true;
                        }

                        if (updated) {
                            planetFactionInheritances++;
                            planetFactionLog.push({
                                item: record.OutputName,
                                outputType: outputType,
                                oldPlanetTypes: oldPlanetTypes,
                                newPlanetTypes: inheritedPlanetTypes,
                                oldFactions: oldFactions,
                                newFactions: inheritedFactions,
                                rawResourcesUsed: rawResourcesUsed.map(r => r.name).join(', ')
                            });

                            console.log(`🌍 ${outputType}: ${record.OutputName} inherited planets: ${inheritedPlanetTypes}, factions: ${inheritedFactions}`);
                        }
                    }
                });
            };

            // Run the planet types and factions inheritance
            inheritPlanetTypesAndFactions();

            console.log(`✅ Planet/Faction inheritance complete. ${planetFactionInheritances} items updated.`);

            // Log summary of planet/faction inheritance
            if (planetFactionLog.length > 0) {
                console.log('🌍 Planet/Faction Inheritance Summary:');
                console.log(`Total items updated: ${planetFactionLog.length}`);

                // Show first 5 inheritance examples
                planetFactionLog.slice(0, 5).forEach(inheritance => {
                    console.log(`  • ${inheritance.item}: inherited from [${inheritance.rawResourcesUsed}]`);
                    if (inheritance.newPlanetTypes !== inheritance.oldPlanetTypes) {
                        console.log(`    Planets: "${inheritance.oldPlanetTypes}" → "${inheritance.newPlanetTypes}"`);
                    }
                    if (inheritance.newFactions !== inheritance.oldFactions) {
                        console.log(`    Factions: "${inheritance.oldFactions}" → "${inheritance.newFactions}"`);
                    }
                });

                if (planetFactionLog.length > 5) {
                    console.log(`  ... and ${planetFactionLog.length - 5} more inheritance updates`);
                }
            }

            // STEP 5: Calculate ProductionSteps for each item
            console.log('🔢 Calculating ProductionSteps for each item...');

            const productionStepsCache = new Map();

            const calculateProductionSteps = (itemName, visited = new Set()) => {
                // Check cache first
                if (productionStepsCache.has(itemName)) {
                    return productionStepsCache.get(itemName);
                }

                // Prevent infinite loops
                if (visited.has(itemName)) {
                    productionStepsCache.set(itemName, 0);
                    return 0;
                }
                visited.add(itemName);

                const record = Array.from(uniqueRecords.values()).find(r => r.OutputName === itemName);
                if (!record) {
                    productionStepsCache.set(itemName, 0);
                    return 0; // Item not found
                }

                // Raw materials have 0 production steps
                if (record.OutputType === 'BASIC RESOURCE') {
                    productionStepsCache.set(itemName, 0);
                    return 0;
                }

                // Find max production steps from all ingredients
                let maxIngredientSteps = 0;
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        const ingredientSteps = calculateProductionSteps(ingredient, new Set(visited));
                        maxIngredientSteps = Math.max(maxIngredientSteps, ingredientSteps);
                    }
                }

                // This item's production steps = max ingredient steps + 1
                const productionSteps = maxIngredientSteps + 1;
                productionStepsCache.set(itemName, productionSteps);
                return productionSteps;
            };

            // Calculate production steps for all records
            const recordsWithSteps = Array.from(uniqueRecords.values());
            recordsWithSteps.forEach(record => {
                const steps = calculateProductionSteps(record.OutputName);
                record.ProductionSteps = steps.toString();
                console.log(`Production steps: ${record.OutputName} = ${steps}`);
            });

            // STEP 6: Mark unused raw resources with NOT_USED flag
            console.log('🏷️ Marking unused raw resources...');

            // DEBUG: Check the structure of recordsWithSteps
            console.log('DEBUG: recordsWithSteps sample:', recordsWithSteps.slice(0, 3));
            console.log('DEBUG: First record keys:', Object.keys(recordsWithSteps[0] || {}));

            // Find all ingredients used across all recipes
            const usedIngredients = new Set();
            const ingredientDebugLog = [];

            recordsWithSteps.forEach((record, index) => {
                if (index < 5) { // Debug first 5 records
                    console.log(`DEBUG Record ${index}: ${record.OutputName}`);
                    console.log(`  OutputType: ${record.OutputType}`);
                }

                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        // Normalize ingredient name (trim whitespace)
                        const normalizedIngredient = ingredient.trim();
                        usedIngredients.add(normalizedIngredient);

                        if (ingredientDebugLog.length < 20) { // Log first 20 ingredients found
                            ingredientDebugLog.push({
                                recipe: record.OutputName,
                                slot: `Ingredient${i}`,
                                ingredient: normalizedIngredient
                            });
                        }
                    }
                }
            });

            console.log('DEBUG: Ingredient debug log (first 20):', ingredientDebugLog);
            console.log(`Found ${usedIngredients.size} unique ingredients used across all recipes`);
            console.log('Sample used ingredients:', Array.from(usedIngredients).slice(0, 15));

            // CRITICAL CHECK: If we found 0 ingredients, something is wrong with the data structure
            if (usedIngredients.size === 0) {
                console.error('❌ CRITICAL: Found 0 ingredients! Data structure issue detected.');
                console.log('DEBUG: Checking alternative field names...');

                // Check if the fields have different names
                const sampleRecord = recordsWithSteps[0];
                const allFields = Object.keys(sampleRecord);
                console.log('All fields in first record:', allFields);

                // Look for ingredient-like fields
                const ingredientFields = allFields.filter(field =>
                    field.toLowerCase().includes('ingredient') ||
                    field.toLowerCase().includes('input') ||
                    field.toLowerCase().includes('material')
                );
                console.log('Ingredient-like fields found:', ingredientFields);

                // Try alternative approach - check a few records manually
                console.log('Manual ingredient check for first 3 records:');
                recordsWithSteps.slice(0, 3).forEach((record, i) => {
                    console.log(`Record ${i}: ${record.OutputName}`);
                    for (let field in record) {
                        if (field.includes('Ingredient') && record[field]) {
                            console.log(`  ${field}: "${record[field]}"`);
                        }
                    }
                });
            }

            // DEBUG: Check raw materials specifically
            const allRawMaterials = recordsWithSteps.filter(r => r.OutputType === 'BASIC RESOURCE');
            console.log(`DEBUG: Found ${allRawMaterials.length} raw materials total`);
            console.log('DEBUG: First 10 raw materials:', allRawMaterials.slice(0, 10).map(r => r.OutputName));

            // Mark raw resources that are never used
            let unusedRawCount = 0;
            const unusedRawResources = [];
            recordsWithSteps.forEach(record => {
                if (record.OutputType === 'BASIC RESOURCE') {
                    // Normalize the output name for comparison
                    const normalizedOutputName = record.OutputName.trim();
                    const isUsed = usedIngredients.has(normalizedOutputName);

                    record.NOT_USED = isUsed ? 'FALSE' : 'TRUE';

                    if (!isUsed) {
                        unusedRawCount++;
                        unusedRawResources.push(normalizedOutputName);
                        console.log(`❌ Unused raw resource: "${normalizedOutputName}"`);
                    } else {
                        console.log(`✅ Used raw resource: "${normalizedOutputName}"`);
                    }
                } else {
                    record.NOT_USED = 'FALSE'; // Non-raw resources default to FALSE
                }
            });

            console.log(`Marked ${unusedRawCount} unused raw resources with NOT_USED=TRUE`);
            console.log('Complete list of unused raw resources:', unusedRawResources);

            // VERIFICATION: Double-check a few specific raw resources
            console.log('🔍 Verification checks:');
            const rawMaterials = recordsWithSteps.filter(r => r.OutputType === 'BASIC RESOURCE');
            console.log(`Total raw materials found: ${rawMaterials.length}`);

            // Check first 5 raw materials as examples
            rawMaterials.slice(0, 5).forEach(rawMaterial => {
                const name = rawMaterial.OutputName.trim();
                const isInUsedSet = usedIngredients.has(name);
                const notUsedFlag = rawMaterial.NOT_USED;

                // Manual verification: look for this raw material in any recipe
                let foundInRecipes = 0;
                recordsWithSteps.forEach(recipe => {
                    for (let i = 1; i <= 9; i++) {
                        const ingredient = recipe[`Ingredient${i}`];
                        if (ingredient && ingredient.trim() === name) {
                            foundInRecipes++;
                        }
                    }
                });

                console.log(`Raw Material: "${name}"`);
                console.log(`  - In usedIngredients set: ${isInUsedSet}`);
                console.log(`  - NOT_USED flag: ${notUsedFlag}`);
                console.log(`  - Manual count in recipes: ${foundInRecipes}`);
                console.log(`  - Expected NOT_USED: ${foundInRecipes === 0 ? 'TRUE' : 'FALSE'}`);

                // Flag any mismatches for debugging
                if ((foundInRecipes === 0 && notUsedFlag !== 'TRUE') || (foundInRecipes > 0 && notUsedFlag !== 'FALSE')) {
                    console.error(`❌ MISMATCH detected for "${name}"!`);
                }
            });

            // STEP 7: Remove COMPONENT and INGREDIENT outputTypes that do NOT have a recipe
            const beforeRemoval = uniqueRecords.size;
            const toRemove = [];

            Array.from(uniqueRecords.entries()).forEach(([key, record]) => {
                const isComponent = record.OutputType === 'COMPONENT';
                const isIngredient = record.OutputType === 'INGREDIENT';
                const hasRecipe = record.Ingredient1 && record.Ingredient1.trim() !== '';

                if ((isComponent || isIngredient) && !hasRecipe) {
                    toRemove.push(key);
                    console.log(`Removing ${record.OutputType} without recipe: ${key}`);
                }
            });

            toRemove.forEach(key => {
                uniqueRecords.delete(key);
            });

            const afterRemoval = uniqueRecords.size;
            console.log(`Removed ${beforeRemoval - afterRemoval} COMPONENT/INGREDIENT entries without recipes`);

            // STEP 8: Generate cleaned CSV
            const cleanedRecords = Array.from(uniqueRecords.values());
            const csvHeaders = [
                'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
                'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
                'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
                'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
                'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
                'CompletionStatus', 'InternalRecipeID', 'ProductionSteps', 'NOT_USED'
            ];

            const csvContent = [csvHeaders, ...cleanedRecords.map(record =>
                csvHeaders.map(header => `"${record[header] || ''}"`)
            )].map(row => row.join(',')).join('\n');

            // Download the cleaned CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'finalComponentList_cleaned.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Generate Claim Stake Tier Report after cleanup
            console.log('🏗️ Generating Claim Stake Tier Report with corrected tiers...');

            const generateClaimStakeTierReport = () => {
                // Group resources by tier using the corrected tier values
                const tierGroups = {};
                const maxTier = 5; // Assuming tiers 1-5

                for (let tier = 1; tier <= maxTier; tier++) {
                    tierGroups[tier] = {
                        rawResources: [],
                        components: [],
                        totalItems: 0
                    };
                }

                // Proper production steps calculation (same as BuildingManager)
                const calculateActualProductionSteps = (record, allRecords, visited = new Set()) => {
                    const recordId = record.OutputName;
                    if (visited.has(recordId)) return 0; // Prevent infinite loops
                    visited.add(recordId);

                    let maxSteps = 0;

                    // Check ingredients
                    for (let i = 1; i <= 9; i++) {
                        const ingredient = record[`Ingredient${i}`];
                        if (ingredient && ingredient.trim()) {
                            const ingredientRecord = allRecords.find(r => r.OutputName === ingredient.trim());

                            if (ingredientRecord) {
                                const ingredientType = (ingredientRecord.OutputType || '').toUpperCase();
                                if (ingredientType === 'BASIC RESOURCE' || ingredientType === 'RAW_MATERIAL' || ingredientType === 'RAW RESOURCE') {
                                    maxSteps = Math.max(maxSteps, 1);
                                } else {
                                    maxSteps = Math.max(maxSteps, 1 + calculateActualProductionSteps(ingredientRecord, allRecords, new Set(visited)));
                                }
                            }
                        }
                    }

                    return maxSteps;
                };

                // Create a unique items map to prevent duplicates
                const uniqueItems = new Map();

                // Categorize all records by tier (CLAIM STAKE FOCUS: Raw resources + Components ≤2 production steps only)
                cleanedRecords.forEach(record => {
                    const name = record.OutputName;
                    const tier = parseInt(record.OutputTier || 1);
                    const outputType = (record.OutputType || '').toUpperCase();

                    if (!name || tier < 1 || tier > maxTier) return;

                    // Calculate ACTUAL production steps using proper recursive algorithm
                    const actualProductionSteps = calculateActualProductionSteps(record, cleanedRecords);

                    // CLAIM STAKE FILTER: Only include items relevant to claim stakes
                    const isRawResource = outputType === 'BASIC RESOURCE' || outputType === 'RAW_MATERIAL' || outputType === 'RAW RESOURCE';
                    const isSimpleComponent = outputType === 'COMPONENT' && actualProductionSteps <= 2 && actualProductionSteps > 0;

                    // Skip ingredients and complex components (>2 production steps or 0 steps)
                    if (!isRawResource && !isSimpleComponent) {
                        return;
                    }

                    // Use name as unique key to prevent duplicates
                    if (uniqueItems.has(name)) {
                        return; // Skip duplicate
                    }

                    // Normalize faction formatting (handle both ; and , separators)
                    let factions = record.Factions || '';
                    if (factions) {
                        // Normalize to semicolon separator and clean up
                        factions = factions.replace(/,/g, ';').replace(/\s+/g, '').trim();
                    }

                    const item = {
                        name: name,
                        tier: tier,
                        type: outputType,
                        resourceType: record.ResourceType || '',
                        usageCategory: record.UsageCategory || '',
                        planetTypes: record.PlanetTypes || '',
                        factions: factions,
                        productionSteps: actualProductionSteps
                    };

                    uniqueItems.set(name, item);

                    if (isRawResource) {
                        tierGroups[tier].rawResources.push(item);
                    } else if (isSimpleComponent) {
                        tierGroups[tier].components.push(item);
                    }

                    tierGroups[tier].totalItems++;
                });

                // Generate markdown report
                const timestamp = new Date().toISOString().split('T')[0];
                let markdown = `# 🏗️ Claim Stake Tier Unlock Report\n\n`;
                markdown += `**Generated:** ${timestamp} (with CSV Cleanup)\n`;
                markdown += `**Total Tier Corrections Made:** ${tierCorrectionLog.length}\n\n`;

                if (tierCorrectionLog.length > 0) {
                    markdown += `## 🔧 Tier Corrections Applied\n\n`;
                    markdown += `The following items had their tiers corrected to match their ingredient requirements:\n\n`;
                    tierCorrectionLog.slice(0, 20).forEach(change => {
                        const correctionType = change.correctionType === 'INGREDIENT_BASED' ? '(ingredient-based)' : '(raw resource-based)';
                        markdown += `- **${change.item}** (${change.outputType}): T${change.oldTier} → T${change.newTier} ${correctionType}\n`;
                    });
                    if (tierCorrectionLog.length > 20) {
                        markdown += `- ... and ${tierCorrectionLog.length - 20} more corrections\n`;
                    }
                    markdown += `\n---\n\n`;
                }

                markdown += `## 📋 Summary by Tier (Claim Stake Extractable/Manufacturable Only)\n\n`;
                markdown += `*This report focuses only on resources that can be extracted or manufactured on claim stakes:*\n`;
                markdown += `*- Raw Resources: Extractable directly from claim stake nodes*\n`;
                markdown += `*- Components: Manufacturable on claim stakes (≤2 production steps)*\n\n`;

                // Summary table
                markdown += `| Tier | Raw Resources | Simple Components (≤2 steps) | Total |\n`;
                markdown += `|------|---------------|-------------------------------|-------|\n`;

                for (let tier = 1; tier <= maxTier; tier++) {
                    const group = tierGroups[tier];
                    markdown += `| **T${tier}** | ${group.rawResources.length} | ${group.components.length} | **${group.totalItems}** |\n`;
                }

                markdown += `\n---\n\n`;

                // Detailed breakdown by tier
                for (let tier = 1; tier <= maxTier; tier++) {
                    const group = tierGroups[tier];
                    if (group.totalItems === 0) continue;

                    markdown += `## 🏭 Tier ${tier} Unlock (${group.totalItems} total items)\n\n`;

                    if (group.rawResources.length > 0) {
                        markdown += `### 🌍 Raw Resources (${group.rawResources.length})\n\n`;
                        markdown += `*These raw resources become available on claim stakes at Tier ${tier}.*\n\n`;

                        // Group by planet types for better organization
                        const planetGroups = {};
                        group.rawResources.forEach(resource => {
                            const planets = resource.planetTypes || 'Unknown';
                            if (!planetGroups[planets]) planetGroups[planets] = [];
                            planetGroups[planets].push(resource);
                        });

                        Object.entries(planetGroups).forEach(([planets, resources]) => {
                            markdown += `**${planets}:**\n`;
                            resources.sort((a, b) => a.name.localeCompare(b.name)).forEach(resource => {
                                const factionInfo = resource.factions ? ` (${resource.factions})` : '';
                                const usage = resource.usageCategory ? ` - ${resource.usageCategory}` : '';
                                markdown += `- ${resource.name}${factionInfo}${usage}\n`;
                            });
                            markdown += `\n`;
                        });
                    }

                    if (group.components.length > 0) {
                        markdown += `### ⚙️ Simple Components (${group.components.length})\n\n`;
                        markdown += `*These components can be manufactured on Tier ${tier} claim stakes (≤2 production steps).*\n\n`;

                        // Group by production steps first, then by resource type
                        const stepGroups = {};
                        group.components.forEach(comp => {
                            const steps = comp.productionSteps || 0;
                            if (!stepGroups[steps]) stepGroups[steps] = [];
                            stepGroups[steps].push(comp);
                        });

                        Object.entries(stepGroups).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([steps, components]) => {
                            markdown += `**${steps} Production Step${steps === '1' ? '' : 's'}:**\n`;
                            components.sort((a, b) => a.name.localeCompare(b.name)).forEach(comp => {
                                const factionInfo = comp.factions ? ` (${comp.factions})` : '';
                                const usage = comp.usageCategory ? ` - ${comp.usageCategory}` : '';
                                markdown += `- ${comp.name}${factionInfo}${usage}\n`;
                            });
                            markdown += `\n`;
                        });
                    }

                    markdown += `---\n\n`;
                }

                // Download the report
                const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `claim_stake_tier_report_${timestamp}.md`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                return tierGroups;
            };

            // Generate the report
            generateClaimStakeTierReport();

            // Show summary
            const tierCorrectionSummary = tierCorrectionLog.length > 0
                ? `\n• Enhanced tier corrections made:\n  ${tierCorrectionLog.slice(0, 3).map(c =>
                    `${c.item}: T${c.oldTier} → T${c.newTier} (${c.correctionType?.toLowerCase() || 'corrected'})`
                ).join('\n  ')}${tierCorrectionLog.length > 3 ? `\n  ... and ${tierCorrectionLog.length - 3} more` : ''}`
                : '';

            alert(
                `🧹 CSV Cleanup Complete!\n\n` +
                `📊 Summary:\n` +
                `• Removed ${duplicatesRemoved.length} duplicates\n` +
                `• Added ${missingIngredients.size} missing ingredients\n` +
                `• Marked ${completedRecipesMarked} recipes as complete\n` +
                `• Applied ${tierCorrections} enhanced tier corrections (ingredient + raw resource based)${tierCorrectionSummary}\n` +
                `• Calculated ProductionSteps for all ${cleanedRecords.length} items\n` +
                `• Marked ${unusedRawCount} unused raw resources (NOT_USED=TRUE)\n` +
                `• Removed ${beforeRemoval - afterRemoval} COMPONENT/INGREDIENT entries without recipes\n` +
                `• Final CSV has ${cleanedRecords.length} entries\n\n` +
                `📁 Downloaded files:\n` +
                `  • finalComponentList_cleaned.csv\n` +
                `  • claim_stake_tier_report_${new Date().toISOString().split('T')[0]}.md\n\n` +
                `✅ Your CSV is now clean and ready to use!\n` +
                `🏗️ Claim stake tier report generated with corrected tiers!\n\n` +
                `💡 Check the console for detailed logs of all changes made.`
            );

        } catch (error) {
            console.error('Error during CSV cleanup:', error);
            alert(`❌ Error during CSV cleanup: ${error.message}`);
        }
    };

    // Optimized CSV Analysis function with timeout prevention
    const analyzeCSV = async () => {
        console.log('Starting optimized CSV analysis...');

        // Show loading state
        const originalText = document.querySelector('.analyze-btn').textContent;
        document.querySelector('.analyze-btn').textContent = '⏳ Analyzing...';
        document.querySelector('.analyze-btn').disabled = true;

        try {
            // Read the current CSV file
            const response = await fetch('/finalComponentList.csv');
            const csvText = await response.text();

            console.log('CSV file loaded, size:', csvText.length);

            // Parse CSV with chunking to prevent timeout
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',');

            console.log('Parsing', lines.length, 'lines...');

            // Process rows in chunks to prevent blocking
            const records = [];
            const chunkSize = 100;

            for (let i = 1; i < lines.length; i += chunkSize) {
                const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));

                const chunkRecords = chunk.map(line => {
                    // Simplified CSV parsing for performance
                    const values = line.split(',').map(val => val.replace(/"/g, '').trim());
                    const record = {};
                    headers.forEach((header, index) => {
                        record[header.replace(/"/g, '')] = values[index] || '';
                    });
                    return record;
                }).filter(record => record.OutputName && record.OutputName.trim());

                records.push(...chunkRecords);

                // Yield control to prevent timeout
                await new Promise(resolve => setTimeout(resolve, 1));
            }

            console.log(`Processed ${records.length} valid records`);

            // ANALYSIS 1: Basic Counts (optimized)
            const typeCounts = {};
            const tierCounts = {};
            const completionCounts = {};

            records.forEach(record => {
                const type = record.OutputType || 'Unknown';
                const tier = parseInt(record.OutputTier) || 0;
                const completion = record.CompletionStatus || 'unknown';

                typeCounts[type] = (typeCounts[type] || 0) + 1;
                tierCounts[tier] = (tierCounts[tier] || 0) + 1;
                completionCounts[completion] = (completionCounts[completion] || 0) + 1;
            });

            // ANALYSIS 2: Most Used Resources (optimized)
            const resourceUsage = {};
            console.log('Analyzing resource usage...');

            records.forEach(record => {
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    const quantity = parseInt(record[`Quantity${i}`]) || 1;
                    if (ingredient && ingredient.trim()) {
                        if (!resourceUsage[ingredient]) {
                            resourceUsage[ingredient] = { count: 0, totalQuantity: 0, usedBy: [] };
                        }
                        resourceUsage[ingredient].count += 1;
                        resourceUsage[ingredient].totalQuantity += quantity;
                        resourceUsage[ingredient].usedBy.push(record.OutputName);
                    }
                }
            });

            const mostUsedResources = Object.entries(resourceUsage)
                .map(([name, usage]) => ({ name, ...usage }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20); // Limit to top 20

            // ANALYSIS 3: Orphaned Resources (NEW FEATURE)
            console.log('Finding orphaned resources...');

            const usedResourceNames = new Set(Object.keys(resourceUsage));
            const allResourceNames = new Set(records.map(r => r.OutputName));

            // Find resources that exist but are never used as ingredients
            const orphanedResources = {
                rawMaterials: [],
                components: [],
                ingredients: [],
                total: 0
            };

            records.forEach(record => {
                const name = record.OutputName;
                const type = record.OutputType;

                if (!usedResourceNames.has(name)) {
                    // This resource is never used as an ingredient
                    if (type === 'BASIC RESOURCE') {
                        orphanedResources.rawMaterials.push({ name, type, tier: record.OutputTier });
                    } else if (type === 'COMPONENT') {
                        orphanedResources.components.push({ name, type, tier: record.OutputTier });
                    } else if (type === 'INGREDIENT') {
                        orphanedResources.ingredients.push({ name, type, tier: record.OutputTier });
                    }
                    orphanedResources.total++;
                }
            });

            // ANALYSIS 3.5: Rarely Used Resources (NEW FEATURE - Used 1-2 times only)
            console.log('Finding rarely used resources...');

            const rarelyUsedResources = {
                rawMaterials: [],
                components: [],
                ingredients: [],
                total: 0
            };

            records.forEach(record => {
                const name = record.OutputName;
                const type = record.OutputType;
                const usage = resourceUsage[name];

                // Check if this resource is used 1-2 times only
                if (usage && usage.count >= 1 && usage.count <= 2) {
                    const resourceInfo = {
                        name,
                        type,
                        tier: record.OutputTier,
                        usageCount: usage.count,
                        usedBy: usage.usedBy.slice(0, 3) // Show first 3 uses
                    };

                    if (type === 'BASIC RESOURCE') {
                        rarelyUsedResources.rawMaterials.push(resourceInfo);
                    } else if (type === 'COMPONENT') {
                        rarelyUsedResources.components.push(resourceInfo);
                    } else if (type === 'INGREDIENT') {
                        rarelyUsedResources.ingredients.push(resourceInfo);
                    }
                    rarelyUsedResources.total++;
                }
            });

            // Sort rarely used by usage count (ascending)
            rarelyUsedResources.rawMaterials.sort((a, b) => a.usageCount - b.usageCount);
            rarelyUsedResources.components.sort((a, b) => a.usageCount - b.usageCount);
            rarelyUsedResources.ingredients.sort((a, b) => a.usageCount - b.usageCount);

            // ANALYSIS 4: Enhanced Tier Violations (Recursive Validation)
            console.log('Checking recursive tier violations...');
            const tierViolations = [];

            // Helper function to recursively find all raw resources in a production chain (for analysis)
            const findRawResourcesInChainAnalysis = (recordName, visited = new Set()) => {
                if (visited.has(recordName)) {
                    return []; // Prevent infinite loops
                }
                visited.add(recordName);

                const record = records.find(r => r.OutputName === recordName);
                if (!record) {
                    return []; // Record not found
                }

                // If this is a raw material, return it
                if (record.OutputType === 'BASIC RESOURCE') {
                    return [{
                        name: recordName,
                        tier: parseInt(record.OutputTier) || 0
                    }];
                }

                // Otherwise, recursively check all ingredients
                const rawResources = [];
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        const ingredientRaws = findRawResourcesInChainAnalysis(ingredient, new Set(visited));
                        rawResources.push(...ingredientRaws);
                    }
                }

                return rawResources;
            };

            // Sample check instead of full check to prevent timeout
            const sampleSize = Math.min(100, records.length); // Reduced for recursive checking
            const recordSample = records.slice(0, sampleSize);

            recordSample.forEach(record => {
                if (record.OutputType !== 'BASIC RESOURCE' && record.OutputName) {
                    // Find all raw resources used in this item's production chain
                    const rawResourcesUsed = findRawResourcesInChainAnalysis(record.OutputName);

                    if (rawResourcesUsed.length > 0) {
                        // Find the highest tier raw resource
                        const maxRawTier = Math.max(...rawResourcesUsed.map(r => r.tier));
                        const currentTier = parseInt(record.OutputTier) || 0;

                        if (currentTier < maxRawTier) {
                            // Tier violation found!
                            const violatingRaws = rawResourcesUsed.filter(r => r.tier > currentTier);
                            tierViolations.push({
                                output: record.OutputName,
                                outputTier: currentTier,
                                requiredTier: maxRawTier,
                                violatingRawResources: violatingRaws.map(r => `${r.name} (T${r.tier})`).join(', ')
                            });
                        }
                    }
                }
            });

            // ANALYSIS 5: Missing Ingredients (simplified)
            const missingIngredients = new Set();
            recordSample.forEach(record => {
                for (let i = 1; i <= 3; i++) { // Check only first 3 ingredients
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        const found = records.find(r => r.OutputName === ingredient);
                        if (!found) {
                            missingIngredients.add(ingredient);
                        }
                    }
                }
            });

            // ANALYSIS 6: Production Chain Depths (simplified sample)
            console.log('Calculating chain depths (sample)...');
            const chainDepths = [];
            const depthSample = records.slice(0, 50); // Only analyze first 50 for performance

            depthSample.forEach(record => {
                let depth = 1;
                const ingredients = [];
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        ingredients.push(ingredient);
                    }
                }
                depth += ingredients.length > 0 ? 1 : 0; // Simplified depth calculation

                chainDepths.push({
                    name: record.OutputName,
                    depth: depth,
                    type: record.OutputType,
                    tier: parseInt(record.OutputTier) || 0
                });
            });

            chainDepths.sort((a, b) => b.depth - a.depth);

            // Generate optimized report
            const analysisReport = `
# 📊 CSV ANALYSIS REPORT (OPTIMIZED)
Generated: ${new Date().toLocaleString()}
Total Records: ${records.length}

## 🏷️ TYPE BREAKDOWN
${Object.entries(typeCounts).map(([type, count]) => `• ${type}: ${count} entries`).join('\n')}

## 🎯 TIER DISTRIBUTION  
${Object.entries(tierCounts).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([tier, count]) => `• Tier ${tier}: ${count} entries`).join('\n')}

## ✅ COMPLETION STATUS
${Object.entries(completionCounts).map(([status, count]) => `• ${status}: ${count} entries`).join('\n')}

## 🏝️ ORPHANED RESOURCES ANALYSIS (${orphanedResources.total} found)
### Raw Materials Never Used (${orphanedResources.rawMaterials.length})
${orphanedResources.rawMaterials.slice(0, 10).map(item => `• ${item.name} (T${item.tier || 0})`).join('\n')}
${orphanedResources.rawMaterials.length > 10 ? `• ... and ${orphanedResources.rawMaterials.length - 10} more` : ''}

### Components Never Used (${orphanedResources.components.length})
${orphanedResources.components.slice(0, 10).map(item => `• ${item.name} (T${item.tier || 0})`).join('\n')}
${orphanedResources.components.length > 10 ? `• ... and ${orphanedResources.components.length - 10} more` : ''}

### Ingredients Never Used (${orphanedResources.ingredients.length})
${orphanedResources.ingredients.slice(0, 10).map(item => `• ${item.name} (T${item.tier || 0})`).join('\n')}
${orphanedResources.ingredients.length > 10 ? `• ... and ${orphanedResources.ingredients.length - 10} more` : ''}

## 🔸 RARELY USED RESOURCES ANALYSIS (${rarelyUsedResources.total} found - Used only 1-2 times)
### Raw Materials Used 1-2 Times (${rarelyUsedResources.rawMaterials.length})
${rarelyUsedResources.rawMaterials.slice(0, 10).map(item =>
                `• ${item.name} (T${item.tier || 0}) - Used ${item.usageCount}x in: ${item.usedBy.join(', ')}`
            ).join('\n')}
${rarelyUsedResources.rawMaterials.length > 10 ? `• ... and ${rarelyUsedResources.rawMaterials.length - 10} more` : ''}

### Components Used 1-2 Times (${rarelyUsedResources.components.length})
${rarelyUsedResources.components.slice(0, 10).map(item =>
                `• ${item.name} (T${item.tier || 0}) - Used ${item.usageCount}x in: ${item.usedBy.join(', ')}`
            ).join('\n')}
${rarelyUsedResources.components.length > 10 ? `• ... and ${rarelyUsedResources.components.length - 10} more` : ''}

### Ingredients Used 1-2 Times (${rarelyUsedResources.ingredients.length})
${rarelyUsedResources.ingredients.slice(0, 10).map(item =>
                `• ${item.name} (T${item.tier || 0}) - Used ${item.usageCount}x in: ${item.usedBy.join(', ')}`
            ).join('\n')}
${rarelyUsedResources.ingredients.length > 10 ? `• ... and ${rarelyUsedResources.ingredients.length - 10} more` : ''}

## 📈 MOST USED RESOURCES (Top 15)
${mostUsedResources.slice(0, 15).map((item, index) => `${index + 1}. ${item.name} - Used ${item.count} times (Total: ${item.totalQuantity})`).join('\n')}

## 🔗 PRODUCTION CHAIN DEPTHS (Sample of 50)
${chainDepths.slice(0, 10).map((item, index) => `${index + 1}. ${item.name} (${item.type} T${item.tier}) - Depth: ${item.depth}`).join('\n')}

## ⚠️ TIER VIOLATIONS (Sample Check - ${tierViolations.length} found)
${tierViolations.length === 0 ? '✅ No tier violations found in sample!' :
                    tierViolations.slice(0, 10).map(v => `• ${v.output} uses ${v.ingredient} (T${v.ingredientTier} raw → T${v.outputTier} output)`).join('\n') +
                    (tierViolations.length > 10 ? `\n• ... and ${tierViolations.length - 10} more` : '')
                }

## ❌ MISSING INGREDIENTS (Sample Check - ${missingIngredients.size} found)
${missingIngredients.size === 0 ? '✅ No missing ingredients found in sample!' :
                    Array.from(missingIngredients).slice(0, 10).map(name => `• ${name}`).join('\n') +
                    (missingIngredients.size > 10 ? `\n• ... and ${missingIngredients.size - 10} more` : '')
                }

## 📊 OPTIMIZATION NOTES
• Analysis optimized for performance - some checks use sampling
• Full analysis: ${records.length} records processed
• Orphaned resources: Complete analysis performed
• Tier violations: Sample of ${sampleSize} records checked
• Chain depths: Sample of ${Math.min(50, records.length)} records analyzed

## 🎯 VERIFICATION STATUS
${tierViolations.length === 0 ? '✅' : '⚠️'} Tier Consistency: ${tierViolations.length === 0 ? 'PASS (Sample)' : `ISSUES FOUND (${tierViolations.length} in sample)`}
${missingIngredients.size === 0 ? '✅' : '❌'} Recipe Integrity: ${missingIngredients.size === 0 ? 'PASS (Sample)' : `ISSUES FOUND (${missingIngredients.size} in sample)`}
${orphanedResources.total < records.length * 0.2 ? '✅' : '⚠️'} Resource Usage: ${orphanedResources.total < records.length * 0.2 ? 'EFFICIENT' : `${orphanedResources.total} orphaned resources`}

## 🏆 OVERALL ASSESSMENT
${orphanedResources.total === 0 && tierViolations.length === 0 && missingIngredients.size === 0 ?
                    '🎉 EXCELLENT! Your CSV is highly optimized!' :
                    orphanedResources.total < 50 && tierViolations.length < 10 ?
                        '✅ GOOD! Minor optimization opportunities exist.' :
                        '⚠️ OPTIMIZATION NEEDED! Consider cleaning up orphaned resources.'}

## 🔧 RECOMMENDATIONS
${orphanedResources.total > 0 ? `• Remove ${orphanedResources.total} orphaned resources to optimize storage\n` : ''}${rarelyUsedResources.total > 0 ? `• Review ${rarelyUsedResources.total} rarely used resources - consider expanding recipes or removing\n` : ''}${tierViolations.length > 0 ? `• Fix ${tierViolations.length} tier violations for better game balance\n` : ''}${missingIngredients.size > 0 ? `• Add ${missingIngredients.size} missing ingredient definitions\n` : ''}• Consider using orphaned raw materials in new recipes
• Review orphaned components for potential recipe integration
• Rarely used raw materials might need more recipes to justify their existence
• Components used 1-2 times could be consolidated or expanded
`;

            // Create and download the analysis report
            const blob = new Blob([analysisReport], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `CSV_Analysis_Report_${new Date().toISOString().split('T')[0]}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // BONUS: Export complete rarely used resources lists
            if (rarelyUsedResources.total > 0) {
                console.log('📋 Generating complete rarely used resources export...');

                const rarelyUsedExport = `# COMPLETE RARELY USED RESOURCES EXPORT
Generated: ${new Date().toLocaleString()}
Total Rarely Used Resources: ${rarelyUsedResources.total}

## RAW MATERIALS USED 1-2 TIMES (${rarelyUsedResources.rawMaterials.length} found)
${rarelyUsedResources.rawMaterials.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - Used ${item.usageCount} times\n   Used in: ${item.usedBy.join(', ')}`
                ).join('\n')}

## COMPONENTS USED 1-2 TIMES (${rarelyUsedResources.components.length} found)
${rarelyUsedResources.components.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - Used ${item.usageCount} times\n   Used in: ${item.usedBy.join(', ')}`
                ).join('\n')}

## INGREDIENTS USED 1-2 TIMES (${rarelyUsedResources.ingredients.length} found)
${rarelyUsedResources.ingredients.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - Used ${item.usageCount} times\n   Used in: ${item.usedBy.join(', ')}`
                ).join('\n')}

## ORPHANED RESOURCES (NEVER USED) - ${orphanedResources.total} found

### RAW MATERIALS NEVER USED (${orphanedResources.rawMaterials.length} found)
${orphanedResources.rawMaterials.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - NEVER USED`
                ).join('\n')}

### COMPONENTS NEVER USED (${orphanedResources.components.length} found)
${orphanedResources.components.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - NEVER USED`
                ).join('\n')}

### INGREDIENTS NEVER USED (${orphanedResources.ingredients.length} found)
${orphanedResources.ingredients.map((item, index) =>
                    `${index + 1}. ${item.name} (Tier ${item.tier || 0}) - NEVER USED`
                ).join('\n')}

## SUMMARY STATISTICS
• Total Problem Resources: ${rarelyUsedResources.total + orphanedResources.total}
• Rarely Used (1-2x): ${rarelyUsedResources.total}
• Never Used (0x): ${orphanedResources.total}
• Usage Efficiency: ${((records.length - orphanedResources.total - rarelyUsedResources.total) / records.length * 100).toFixed(1)}%

## RECOMMENDED ACTIONS
1. Review orphaned resources for removal or recipe integration
2. Consider expanding recipes for rarely used raw materials
3. Evaluate consolidation opportunities for rarely used components
4. Ensure game balance with under-utilized resources
`;

                // Download the complete rarely used resources report
                const rarelyUsedBlob = new Blob([rarelyUsedExport], { type: 'text/plain;charset=utf-8;' });
                const rarelyUsedLink = document.createElement('a');
                const rarelyUsedUrl = URL.createObjectURL(rarelyUsedBlob);
                rarelyUsedLink.setAttribute('href', rarelyUsedUrl);
                rarelyUsedLink.setAttribute('download', `Complete_Problem_Resources_${new Date().toISOString().split('T')[0]}.txt`);
                rarelyUsedLink.style.visibility = 'hidden';
                document.body.appendChild(rarelyUsedLink);
                rarelyUsedLink.click();
                document.body.removeChild(rarelyUsedLink);

                console.log('📁 Complete rarely used resources export downloaded!');
            }

            // Show summary in alert
            alert(
                `📊 Optimized CSV Analysis Complete!\n\n` +
                `📈 Key Metrics:\n` +
                `• Total Records: ${records.length}\n` +
                `• Most Used: ${mostUsedResources[0]?.name || 'None'} (${mostUsedResources[0]?.count || 0} times)\n` +
                `• Orphaned Resources: ${orphanedResources.total}\n` +
                `  - Raw Materials: ${orphanedResources.rawMaterials.length}\n` +
                `  - Components: ${orphanedResources.components.length}\n` +
                `  - Ingredients: ${orphanedResources.ingredients.length}\n` +
                `• Rarely Used (1-2x): ${rarelyUsedResources.total}\n` +
                `  - Raw Materials: ${rarelyUsedResources.rawMaterials.length}\n` +
                `  - Components: ${rarelyUsedResources.components.length}\n` +
                `  - Ingredients: ${rarelyUsedResources.ingredients.length}\n` +
                `• Tier Violations: ${tierViolations.length} (sample)\n` +
                `• Missing Ingredients: ${missingIngredients.size} (sample)\n\n` +
                `📁 Full report downloaded!\n` +
                `${rarelyUsedResources.total > 0 ? '📁 Complete problem resources list downloaded!\n' : ''}` +
                `\n${orphanedResources.total === 0 ? '🎉 STATUS: FULLY OPTIMIZED!' : '⚠️ STATUS: CLEANUP RECOMMENDED'}`
            );

        } catch (error) {
            console.error('Error during CSV analysis:', error);
            alert(`❌ Error during CSV analysis: ${error.message}`);
        } finally {
            // Reset button state
            document.querySelector('.analyze-btn').textContent = originalText;
            document.querySelector('.analyze-btn').disabled = false;
        }
    };

    // Visualize complete production chain in spreadsheet format
    const visualizeCompleteProductionChain = async (startingItem) => {
        console.log('Visualizing complete production chain for:', startingItem);

        try {
            // Read the current CSV file to get all recipes
            const response = await fetch('/finalComponentList.csv');
            const csvText = await response.text();

            // Parse CSV
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',');
            const rows = lines.slice(1).map(line => {
                const result = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            });

            // Convert to objects
            const csvRecords = rows.map(row => {
                const record = {};
                headers.forEach((header, index) => {
                    record[header.replace(/"/g, '')] = (row[index] || '').replace(/"/g, '');
                });
                return record;
            }).filter(record => record.OutputName);

            console.log(`Loaded ${csvRecords.length} recipes from CSV`);

            // Build complete production chain recursively
            const buildCompleteChain = (itemName, depth = 0, visited = new Set()) => {
                if (visited.has(itemName)) {
                    return []; // Prevent circular dependencies
                }
                visited.add(itemName);

                const record = csvRecords.find(r => r.OutputName === itemName);
                if (!record) {
                    // Item not found, create a placeholder
                    return [{
                        id: `missing-${Date.now()}-${itemName}`,
                        outputName: itemName,
                        outputType: 'MISSING',
                        outputTier: 0,
                        resourceType: 'MISSING',
                        functionalPurpose: 'MISSING',
                        ingredients: Array(9).fill(null),
                        depth: depth,
                        constructionTime: 0,
                        completionStatus: 'missing',
                        isFromCSV: false
                    }];
                }

                // Convert CSV record to our format
                const recipeRow = {
                    id: `csv-${record.InternalRecipeID || Date.now()}-${itemName}`,
                    outputName: record.OutputName,
                    outputType: record.OutputType || 'COMPONENT',
                    outputTier: parseInt(record.OutputTier) || 1,
                    resourceType: record.ResourceType || 'COMPONENT',
                    functionalPurpose: record.FunctionalPurpose || 'PRODUCTION',
                    constructionTime: parseInt(record.ConstructionTime) || 60,
                    completionStatus: record.CompletionStatus || 'complete',
                    depth: depth,
                    isFromCSV: true,
                    ingredients: Array(9).fill(null)
                };

                // Fill in ingredients
                for (let i = 1; i <= 9; i++) {
                    const ingredient = record[`Ingredient${i}`];
                    const quantity = parseInt(record[`Quantity${i}`]) || 1;
                    if (ingredient && ingredient.trim()) {
                        recipeRow.ingredients[i - 1] = {
                            name: ingredient,
                            quantity: quantity
                        };
                    }
                }

                // Collect all chains (this recipe + all ingredient chains)
                let allChains = [recipeRow];

                // Recursively build chains for all ingredients
                recipeRow.ingredients.forEach(ingredient => {
                    if (ingredient && ingredient.name) {
                        const ingredientChains = buildCompleteChain(ingredient.name, depth + 1, new Set(visited));
                        allChains = allChains.concat(ingredientChains);
                    }
                });

                return allChains;
            };

            // Build the complete chain
            const completeChain = buildCompleteChain(startingItem);

            // Remove duplicates (keep the one with lowest depth)
            const uniqueChain = [];
            const seenItems = new Map();

            completeChain.forEach(recipe => {
                const key = recipe.outputName;
                if (!seenItems.has(key) || seenItems.get(key).depth > recipe.depth) {
                    seenItems.set(key, recipe);
                }
            });

            const finalChain = Array.from(seenItems.values()).sort((a, b) => a.depth - b.depth);

            console.log(`Built complete production chain with ${finalChain.length} recipes`);

            // Load into the spreadsheet editor
            setNewRecipes(finalChain);
            setShowChainAnalysis(false);

            // Show summary
            const rawMaterials = finalChain.filter(r => r.outputType === 'BASIC RESOURCE').length;
            const components = finalChain.filter(r => r.outputType === 'COMPONENT').length;
            const ingredients = finalChain.filter(r => r.outputType === 'INGREDIENT').length;
            const missing = finalChain.filter(r => r.outputType === 'MISSING').length;
            const maxDepth = Math.max(...finalChain.map(r => r.depth));

            alert(
                `🔗 Complete Production Chain Loaded!\n\n` +
                `📊 Chain Analysis for "${startingItem}":\n` +
                `• Total Items: ${finalChain.length}\n` +
                `• Chain Depth: ${maxDepth + 1} levels\n` +
                `• Raw Materials: ${rawMaterials}\n` +
                `• Components: ${components}\n` +
                `• Ingredients: ${ingredients}\n` +
                `• Missing Items: ${missing}\n\n` +
                `✅ All recipes loaded into spreadsheet editor below.\n` +
                `You can now view and edit the complete production chain!`
            );

        } catch (error) {
            console.error('Error visualizing production chain:', error);
            alert(`❌ Error loading production chain: ${error.message}`);
        }
    };

    return (
        <div className="production-chain-builder">
            {/* Header */}
            <div className="builder-header">
                <div className="header-title">
                    <h2>🏭 Production Chain Builder</h2>
                    <div className="completion-stats">
                        <span className="stat complete">✅ {completionStats.complete} Complete</span>
                        <span className="stat incomplete">⚠️ {completionStats.incomplete} Incomplete</span>
                        <span className="stat missing">❌ {completionStats.missing} Missing</span>
                        <span className="stat total">📊 {completionStats.total} Total</span>
                    </div>
                </div>

                <div className="header-controls">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="missing">❌ Missing Recipes</option>
                        <option value="incomplete">⚠️ Incomplete</option>
                        <option value="complete">✅ Complete</option>
                        <option value="all">📋 All Resources</option>
                    </select>

                    <select
                        value={outputTypeFilter}
                        onChange={(e) => setOutputTypeFilter(e.target.value)}
                        className="filter-select"
                        style={{ marginLeft: '0.5rem' }}
                    >
                        <option value="all">🏷️ All Types</option>
                        {availableOutputTypes.filter(type => type !== 'all').map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                        style={{ marginLeft: '0.5rem' }}
                    >
                        <option value="name">🔤 Sort by Name</option>
                        <option value="type">🏷️ Sort by Type</option>
                        <option value="tier">⭐ Sort by Tier</option>
                        <option value="status">📊 Sort by Status</option>
                        <option value="usage">📈 Sort by Usage</option>
                    </select>

                    <button onClick={reloadFromCSV} className="reload-btn">
                        📁 Reload CSV
                    </button>

                    <button onClick={refreshCompletionStatus} className="refresh-btn">
                        🔄 Refresh Status
                    </button>

                    <button onClick={exportToCSV} className="export-btn">
                        📤 Export CSV
                    </button>

                    <button
                        onClick={() => selectedIngredient ? exportExistingProductionChain(selectedIngredient) : alert('Please select an ingredient first')}
                        className="export-existing-chain-header-btn"
                        disabled={!selectedIngredient}
                        style={{
                            background: selectedIngredient
                                ? 'linear-gradient(45deg, #28a745, #20c997)'
                                : '#6c757d',
                            border: selectedIngredient
                                ? '2px solid #20c997'
                                : '2px solid #6c757d',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: selectedIngredient ? 'pointer' : 'not-allowed',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            opacity: selectedIngredient ? 1 : 0.6,
                            marginRight: '10px'
                        }}
                        title={selectedIngredient
                            ? `Export existing production chain for ${selectedIngredient} from CSV data`
                            : 'Select an ingredient first to export its production chain'}
                    >
                        🏭 Export Existing Chain
                    </button>

                    <button
                        onClick={exportIngredientOptimizationReport}
                        className="export-ingredient-optimization-btn"
                        style={{
                            background: 'linear-gradient(45deg, #6f42c1, #563d7c)',
                            border: '2px solid #563d7c',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="Generate AI optimization report for all INGREDIENT types to reduce raw resource complexity"
                    >
                        🤖 Export Ingredient Optimization Report
                    </button>

                    <button
                        onClick={handleCleanupCSV}
                        className="cleanup-btn"
                        style={{
                            background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                            border: '2px solid #ee5a52',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        🧹 Cleanup CSV
                    </button>

                    <button
                        onClick={analyzeCSV}
                        className="analyze-btn"
                        style={{
                            background: 'linear-gradient(45deg, #6f42c1, #563d7c)',
                            border: '2px solid #563d7c',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    >
                        📊 Analyze CSV
                    </button>



                    <button
                        onClick={createProductionChainsForOrphans}
                        className="orphan-btn"
                        style={{
                            background: 'linear-gradient(45deg, #fd7e14, #e8590c)',
                            border: '2px solid #e8590c',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            marginLeft: '0.5rem'
                        }}
                    >
                        🔍 Find & Create Orphaned Ingredients
                    </button>
                </div>
            </div>

            {/* Production Chain Analysis Sidebar */}
            {(() => {
                console.log('=== Sidebar Render Debug ===');
                console.log('showChainAnalysis:', showChainAnalysis);
                console.log('currentProductionChain:', currentProductionChain);
                console.log('selectedIngredient:', selectedIngredient);
                console.log('Should render sidebar:', showChainAnalysis && currentProductionChain);
                console.log('=== End Sidebar Render Debug ===');
                return null;
            })()}
            {showChainAnalysis && currentProductionChain && (
                <div className="chain-analysis-sidebar" style={{
                    background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                    border: '3px solid #3498db',
                    borderRadius: '12px',
                    margin: '1rem',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    position: 'relative'
                }}>
                    <div className="sidebar-header" style={{
                        background: 'linear-gradient(90deg, #3498db, #2980b9)',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px'
                    }}>
                        <h3>🔗 Production Chain: {selectedIngredient}</h3>
                        <button
                            onClick={() => setShowChainAnalysis(false)}
                            className="close-sidebar"
                        >
                            ×
                        </button>
                    </div>
                    <div className="sidebar-content">
                        <div className="chain-summary">
                            {/* Handle loading state */}
                            {currentProductionChain.loading && (
                                <div className="loading-state" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                                    borderRadius: '8px',
                                    margin: '1rem 0'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        Analyzing Production Chain...
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                                        This may take a moment for complex chains
                                    </div>
                                </div>
                            )}

                            {/* Handle error state */}
                            {currentProductionChain.error && (
                                <div className="error-state" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    background: 'linear-gradient(45deg, #f8d7da, #f5c6cb)',
                                    borderRadius: '8px',
                                    margin: '1rem 0',
                                    border: '2px solid #dc3545'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#721c24' }}>
                                        Analysis Failed
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#721c24' }}>
                                        {currentProductionChain.errorMessage}
                                    </div>
                                </div>
                            )}

                            {/* Normal chain display */}
                            {!currentProductionChain.loading && !currentProductionChain.error && (
                                <>
                                    <div className="summary-item">
                                        <span className="label">Status:</span>
                                        <span className={`value ${currentProductionChain.actualCompletionStatus || 'missing'}`}>
                                            {currentProductionChain.actualCompletionStatus === 'complete' && '✅ Complete'}
                                            {currentProductionChain.actualCompletionStatus === 'incomplete' && '⚠️ Incomplete'}
                                            {currentProductionChain.actualCompletionStatus === 'missing' && '❌ Missing Recipe'}
                                            {currentProductionChain.circular && '🔄 Circular Dependency'}
                                            {currentProductionChain.tooDeep && '🔄 Chain Too Deep'}
                                        </span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Tier:</span>
                                        <span className={`tier-badge tier-${currentProductionChain.tier}`}>
                                            T{currentProductionChain.tier || 0}
                                        </span>
                                    </div>
                                    {currentProductionChain.depth && (
                                        <div className="summary-item">
                                            <span className="label">Depth:</span>
                                            <span className="value">
                                                {currentProductionChain.depth} levels
                                            </span>
                                        </div>
                                    )}
                                    {currentProductionChain.totalNodes && (
                                        <div className="summary-item">
                                            <span className="label">Complexity:</span>
                                            <span className="value">
                                                {currentProductionChain.totalNodes} nodes
                                            </span>
                                        </div>
                                    )}
                                    {currentProductionChain.missing && (
                                        <div className="summary-item">
                                            <span className="label">Issue:</span>
                                            <span className="value missing">No Recipe Exists</span>
                                        </div>
                                    )}
                                    {currentProductionChain.incomplete && (
                                        <div className="summary-item">
                                            <span className="label">Issue:</span>
                                            <span className="value incomplete">Dependencies Missing</span>
                                        </div>
                                    )}
                                    {currentProductionChain.tooDeep && (
                                        <div className="summary-item">
                                            <span className="label">Warning:</span>
                                            <span className="value warning">
                                                {currentProductionChain.message || 'Chain truncated for performance'}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Add Recipe Button for Missing Ingredients */}
                        {(() => {
                            console.log('=== Button Condition Debug ===');
                            console.log('currentProductionChain.missing:', currentProductionChain.missing);
                            console.log('currentProductionChain.incomplete:', currentProductionChain.incomplete);
                            console.log('currentProductionChain.actualCompletionStatus:', currentProductionChain.actualCompletionStatus);
                            console.log('Should show missing/incomplete buttons:', currentProductionChain.missing || currentProductionChain.incomplete);
                            console.log('Should show edit button:', currentProductionChain.actualCompletionStatus === 'complete');
                            console.log('=== End Button Condition Debug ===');
                            return null;
                        })()}

                        {/* Action Buttons Section */}
                        <div className="chain-actions" style={{ margin: '1rem 0' }}>
                            {/* Edit button for complete production chains - OUTSIDE missing/incomplete condition */}
                            {currentProductionChain.actualCompletionStatus === 'complete' && (
                                <button
                                    onClick={async () => await editProductionChain(selectedIngredient)}
                                    className="edit-chain-btn"
                                    disabled={isLoadingProductionChain}
                                    style={{
                                        background: isLoadingProductionChain
                                            ? 'linear-gradient(45deg, #6c757d, #495057)'
                                            : 'linear-gradient(45deg, #007bff, #0056b3)',
                                        border: isLoadingProductionChain
                                            ? '2px solid #495057'
                                            : '2px solid #0056b3',
                                        color: 'white',
                                        padding: '1rem 2rem',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: isLoadingProductionChain ? 'not-allowed' : 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '1rem',
                                        display: 'block',
                                        width: '100%',
                                        opacity: isLoadingProductionChain ? 0.7 : 1
                                    }}
                                >
                                    {isLoadingProductionChain ? '⏳ Loading Production Chain...' : '✏️ Edit Production Chain'}
                                </button>
                            )}

                            {/* Visualize Complete Chain button - always show for any ingredient */}
                            <button
                                onClick={() => visualizeCompleteProductionChain(selectedIngredient)}
                                className="visualize-complete-chain-btn"
                                style={{
                                    background: 'linear-gradient(45deg, #17a2b8, #138496)',
                                    border: '2px solid #138496',
                                    color: 'white',
                                    padding: '1rem 2rem',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginBottom: '1rem',
                                    fontSize: '1rem',
                                    display: 'block',
                                    width: '100%'
                                }}
                            >
                                🔗 Visualize Complete Chain (Spreadsheet)
                            </button>

                            {/* Always show AI suggestions button */}
                            <button
                                onClick={() => handleShowSuggestions(selectedIngredient)}
                                className="ai-suggest-btn"
                                style={{
                                    background: '#6f42c1',
                                    border: '2px solid #6f42c1',
                                    color: 'white',
                                    padding: '0.8rem 1.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem',
                                    width: '100%'
                                }}
                            >
                                🤖 Get AI Recipe Suggestions
                            </button>

                            {/* Export Existing Production Chain button - always available for complete chains */}
                            <button
                                onClick={() => exportExistingProductionChain(selectedIngredient)}
                                className="export-existing-chain-sidebar-btn"
                                disabled={!selectedIngredient}
                                style={{
                                    background: selectedIngredient
                                        ? 'linear-gradient(45deg, #28a745, #20c997)'
                                        : '#6c757d',
                                    border: selectedIngredient
                                        ? '2px solid #20c997'
                                        : '2px solid #6c757d',
                                    color: 'white',
                                    padding: '0.8rem 1.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: selectedIngredient ? 'pointer' : 'not-allowed',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    opacity: selectedIngredient ? 1 : 0.6
                                }}
                                title={selectedIngredient
                                    ? `Export existing production chain for ${selectedIngredient} from CSV data`
                                    : 'Select an ingredient first'}
                            >
                                📤 Export Existing Production Chain
                            </button>

                            {/* Export Edited Production Chain button - only show when editing */}
                            {newRecipes.length > 0 && (
                                <button
                                    onClick={exportProductionChainToCSV}
                                    className="export-edited-chain-sidebar-btn"
                                    style={{
                                        background: 'linear-gradient(45deg, #fd7e14, #e8590c)',
                                        border: '2px solid #e8590c',
                                        color: 'white',
                                        padding: '0.8rem 1.5rem',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem',
                                        width: '100%'
                                    }}
                                    title={`Export ${newRecipes.length} edited recipes from current editing session`}
                                >
                                    ✏️ Export Edited Chain ({newRecipes.length})
                                </button>
                            )}
                        </div>

                        {/* Buttons for missing/incomplete ingredients */}
                        {(() => {
                            console.log('=== Sidebar Button Condition Debug ===');
                            console.log('currentProductionChain:', currentProductionChain);
                            console.log('currentProductionChain.missing:', currentProductionChain.missing);
                            console.log('currentProductionChain.incomplete:', currentProductionChain.incomplete);
                            console.log('condition result:', (currentProductionChain.missing || currentProductionChain.incomplete));
                            console.log('selectedIngredient:', selectedIngredient);
                            console.log('=== End Sidebar Button Debug ===');
                            return null;
                        })()}
                        {(currentProductionChain.missing || currentProductionChain.incomplete) && (
                            <div className="missing-incomplete-actions" style={{ margin: '1rem 0' }}>
                                {/* Quick Fix button for Access Control specifically */}
                                {selectedIngredient === 'Access Control' && (
                                    <button
                                        onClick={quickFixAccessControl}
                                        className="quick-fix-btn"
                                        style={{
                                            background: 'linear-gradient(45deg, #28a745, #20c997)',
                                            border: '3px solid #20c997',
                                            color: 'white',
                                            padding: '1rem 2rem',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        ⚡ Quick Fix: Add Access Control Recipe
                                    </button>
                                )}

                                {/* Quick Fix buttons for dependencies */}
                                {selectedIngredient === 'Circuit Board' && (
                                    <button
                                        onClick={quickFixCircuitBoard}
                                        className="quick-fix-btn"
                                        style={{
                                            background: 'linear-gradient(45deg, #17a2b8, #138496)',
                                            border: '3px solid #138496',
                                            color: 'white',
                                            padding: '1rem 2rem',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        ⚡ Quick Fix: Add Circuit Board Recipe
                                    </button>
                                )}

                                {selectedIngredient === 'Memory Core' && (
                                    <button
                                        onClick={quickFixMemoryCore}
                                        className="quick-fix-btn"
                                        style={{
                                            background: 'linear-gradient(45deg, #6f42c1, #5a32a3)',
                                            border: '3px solid #5a32a3',
                                            color: 'white',
                                            padding: '1rem 2rem',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        ⚡ Quick Fix: Add Memory Core Recipe
                                    </button>
                                )}

                                {selectedIngredient === 'Signal Processor' && (
                                    <button
                                        onClick={quickFixSignalProcessor}
                                        className="quick-fix-btn"
                                        style={{
                                            background: 'linear-gradient(45deg, #fd7e14, #e8590c)',
                                            border: '3px solid #e8590c',
                                            color: 'white',
                                            padding: '1rem 2rem',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        ⚡ Quick Fix: Add Signal Processor Recipe
                                    </button>
                                )}

                                {(currentProductionChain.missing || currentProductionChain.incomplete) && (
                                    <button
                                        onClick={() => startProductionChainCreation(selectedIngredient)}
                                        className="create-chain-btn"
                                        style={{
                                            background: 'linear-gradient(45deg, #28a745, #20c997)',
                                            border: '2px solid #20c997',
                                            color: 'white',
                                            padding: '1rem 2rem',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        🏭 Start Production Chain Creation
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        // Create a new recipe for this ingredient
                                        const newRecipe = {
                                            id: Date.now(),
                                            outputName: selectedIngredient,
                                            outputType: 'INGREDIENT',
                                            outputTier: currentProductionChain.tier || 1,
                                            constructionTime: 60,
                                            ingredients: Array(9).fill(null)
                                        };
                                        setNewRecipes([...newRecipes, newRecipe]);
                                        setShowChainAnalysis(false);
                                    }}
                                    className="create-recipe-btn"
                                    style={{
                                        background: '#6c757d',
                                        border: '2px solid #6c757d',
                                        color: 'white',
                                        padding: '0.8rem 1.5rem',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    ➕ Create Single Recipe
                                </button>
                            </div>
                        )}

                        {/* Fallback buttons for orphaned ingredients - always show if it's an orphaned ingredient */}
                        {selectedIngredient && allResources.find(r => r.name === selectedIngredient && r.isOrphaned) && (
                            <div className="orphaned-ingredient-actions" style={{
                                margin: '1rem 0',
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                border: '2px solid #ffc107',
                                borderRadius: '8px'
                            }}>
                                <h4 style={{ color: '#ffc107', margin: '0 0 1rem 0' }}>🔍 Orphaned Ingredient Actions</h4>

                                <button
                                    onClick={() => startProductionChainCreation(selectedIngredient)}
                                    className="create-orphan-chain-btn"
                                    style={{
                                        background: 'linear-gradient(45deg, #28a745, #20c997)',
                                        border: '2px solid #20c997',
                                        color: 'white',
                                        padding: '1rem 2rem',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '1rem',
                                        width: '100%',
                                        display: 'block'
                                    }}
                                >
                                    🏭 Create Production Chain for Orphaned Ingredient
                                </button>

                                <button
                                    onClick={() => {
                                        // Create a new recipe for this orphaned ingredient
                                        const resource = allResources.find(r => r.name === selectedIngredient);
                                        const newRecipe = {
                                            id: Date.now(),
                                            outputName: selectedIngredient,
                                            outputType: 'INGREDIENT',
                                            outputTier: resource?.tier || 1,
                                            resourceType: 'INGREDIENT',
                                            functionalPurpose: 'PRODUCTION',
                                            constructionTime: 60,
                                            ingredients: Array(9).fill(null)
                                        };
                                        setNewRecipes([...newRecipes, newRecipe]);
                                        setShowChainAnalysis(false);
                                    }}
                                    className="create-orphan-recipe-btn"
                                    style={{
                                        background: '#6c757d',
                                        border: '2px solid #6c757d',
                                        color: 'white',
                                        padding: '0.8rem 1.5rem',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        width: '100%',
                                        display: 'block'
                                    }}
                                >
                                    ➕ Create Single Recipe for Orphaned Ingredient
                                </button>
                            </div>
                        )}

                        <ProductionChainTree
                            chain={currentProductionChain}
                            onResourceClick={() => { }}
                            onResourceHover={() => { }}
                        />
                    </div>
                </div>
            )}

            <div className="builder-content">
                {/* Recipe Creation - moved above ingredient selection */}
                {newRecipes.length > 0 && (
                    <div className="recipe-creation">
                        <div className="creation-header">
                            <h3>🏭 Production Chain Creation ({newRecipes.length} recipes)</h3>
                            <div className="creation-controls">
                                <button onClick={saveNewRecipes} className="save-recipes-btn">
                                    💾 Save Production Chain ({newRecipes.length})
                                </button>
                            </div>
                        </div>

                        {/* Production Chain Overview */}
                        {currentChainAnalysis && (
                            <div className="chain-overview">
                                <h4>📊 Production Chain Analysis</h4>
                                <div className="overview-grid">
                                    <div className="overview-section">
                                        <h5>📈 Progress</h5>
                                        <div className="progress-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Recipes:</span>
                                                <span className="stat-value">{currentChainAnalysis.totalRecipes}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Completeness:</span>
                                                <span className="stat-value">{currentChainAnalysis.completeness}%</span>
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${currentChainAnalysis.completeness}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Complexity:</span>
                                                <span className="stat-value">{currentChainAnalysis.complexity}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overview-section">
                                        <h5>🏭 Tiers & Types</h5>
                                        <div className="tier-display">
                                            <div className="tier-list">
                                                <span className="section-label">Tiers:</span>
                                                {currentChainAnalysis.tiers.map(tier => (
                                                    <span key={tier} className={`tier-badge tier-${tier}`}>T{tier}</span>
                                                ))}
                                                {currentChainAnalysis.tiers.length === 0 && (
                                                    <span className="empty-state">None yet</span>
                                                )}
                                            </div>
                                            <div className="type-list">
                                                <span className="section-label">Component Types:</span>
                                                <div className="type-chips">
                                                    {currentChainAnalysis.componentTypes.map(type => (
                                                        <span key={type} className="type-chip">{type}</span>
                                                    ))}
                                                    {currentChainAnalysis.componentTypes.length === 0 && (
                                                        <span className="empty-state">None yet</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overview-section">
                                        <h5>🌍 Planet Dependencies</h5>
                                        <div className="planet-grid">
                                            {currentChainAnalysis.planetTypes.map(planet => (
                                                <span key={planet} className="planet-chip">{planet}</span>
                                            ))}
                                            {currentChainAnalysis.planetTypes.length === 0 && (
                                                <span className="empty-state">No planets identified yet</span>
                                            )}
                                        </div>
                                        <div className="planet-count">
                                            <span className="stat-label">Total Planets:</span>
                                            <span className="stat-value">{currentChainAnalysis.planetTypes.length}/8</span>
                                        </div>
                                    </div>

                                    <div className="overview-section">
                                        <h5>⚗️ Raw Resources</h5>
                                        <div className="resource-count">
                                            <span className="stat-label">Raw Materials:</span>
                                            <span className="stat-value">{currentChainAnalysis.rawResources.length}</span>
                                        </div>
                                        <div className="resource-list" style={{
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            backgroundColor: 'rgba(0,0,0,0.1)'
                                        }}>
                                            {currentChainAnalysis.rawResources.map(resource => (
                                                <span key={resource.name} className="resource-chip" style={{
                                                    display: 'inline-block',
                                                    margin: '2px',
                                                    padding: '4px 8px',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85rem',
                                                    border: '1px solid rgba(255,255,255,0.2)'
                                                }}>
                                                    {resource.name} <span className={`tier-badge tier-${resource.tier}`} style={{
                                                        backgroundColor: resource.tier === 0 ? '#6c757d' :
                                                            resource.tier === 1 ? '#28a745' :
                                                                resource.tier === 2 ? '#007bff' :
                                                                    resource.tier === 3 ? '#6f42c1' :
                                                                        resource.tier === 4 ? '#fd7e14' : '#dc3545',
                                                        color: 'white',
                                                        padding: '2px 6px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        marginLeft: '4px'
                                                    }}>T{resource.tier}</span>
                                                </span>
                                            ))}
                                            {currentChainAnalysis.rawResources.length === 0 && (
                                                <span className="empty-state">No raw materials yet</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overview-section">
                                        <h5>🎯 Functional Analysis</h5>
                                        <div className="purpose-list">
                                            {currentChainAnalysis.functionalPurposes.map(purpose => (
                                                <span key={purpose} className="purpose-chip">{purpose}</span>
                                            ))}
                                            {currentChainAnalysis.functionalPurposes.length === 0 && (
                                                <span className="empty-state">No purposes defined yet</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overview-section">
                                        <h5>🔄 Recipe Chain Status</h5>
                                        <div className="chain-status">
                                            <div className="status-item">
                                                <span className="status-label">Missing Recipes:</span>
                                                <span className={`status-value ${currentChainAnalysis.missingRecipeCount === 0 ? 'complete' : 'incomplete'}`}>
                                                    {currentChainAnalysis.missingRecipeCount}
                                                </span>
                                            </div>
                                            {currentChainAnalysis.missingRecipeCount > 0 && (
                                                <div className="missing-ingredients">
                                                    <span className="missing-label">Needs recipes:</span>
                                                    <div className="missing-chips">
                                                        {currentChainAnalysis.missingIngredients.slice(0, 6).map(ingredient => (
                                                            <span key={ingredient} className="missing-chip">{ingredient}</span>
                                                        ))}
                                                        {currentChainAnalysis.missingIngredients.length > 6 && (
                                                            <span className="more-missing">
                                                                +{currentChainAnalysis.missingIngredients.length - 6} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {currentChainAnalysis.missingRecipeCount === 0 && (
                                                <div className="complete-message">
                                                    ✅ All ingredients trace to raw materials!
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overview-section complexity-rating">
                                        <h5>⚡ Complexity Rating</h5>
                                        <div className="complexity-meter">
                                            <div className="complexity-bar">
                                                <div
                                                    className={`complexity-fill ${currentChainAnalysis.complexity < 5 ? 'simple' :
                                                        currentChainAnalysis.complexity < 15 ? 'moderate' :
                                                            currentChainAnalysis.complexity < 30 ? 'complex' : 'very-complex'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(100, (currentChainAnalysis.complexity / 50) * 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="complexity-label">
                                                {currentChainAnalysis.complexity < 5 ? 'Simple' :
                                                    currentChainAnalysis.complexity < 15 ? 'Moderate' :
                                                        currentChainAnalysis.complexity < 30 ? 'Complex' : 'Very Complex'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="recipes-spreadsheet">
                            <div className="table-instructions" style={{
                                fontSize: '0.8em',
                                color: '#bbb',
                                marginBottom: '8px',
                                textAlign: 'right'
                            }}>
                                💡 Hover over column edges and drag to resize columns
                            </div>
                            <table className="production-chain-table">
                                <thead>
                                    <tr>
                                        <th className="row-num-col" onMouseDown={(e) => handleMouseDown(e, 0)}>#</th>
                                        <th className="output-col" onMouseDown={(e) => handleMouseDown(e, 1)}>Output Name</th>
                                        <th className="type-col" onMouseDown={(e) => handleMouseDown(e, 2)}>Type</th>
                                        <th className="tier-col" onMouseDown={(e) => handleMouseDown(e, 3)}>Tier</th>
                                        <th className="resource-type-col" onMouseDown={(e) => handleMouseDown(e, 4)}>Resource Type</th>
                                        <th className="functional-purpose-col" onMouseDown={(e) => handleMouseDown(e, 5)}>Functional Purpose</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 6)}>Ingredient 1</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 7)}>Ingredient 2</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 8)}>Ingredient 3</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 9)}>Ingredient 4</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 10)}>Ingredient 5</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 11)}>Ingredient 6</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 12)}>Ingredient 7</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 13)}>Ingredient 8</th>
                                        <th className="ingredient-col" onMouseDown={(e) => handleMouseDown(e, 14)}>Ingredient 9</th>
                                        <th className="actions-col" onMouseDown={(e) => handleMouseDown(e, 15)}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newRecipes.map((recipe, rowIndex) => (
                                        <tr key={recipe.id} className="recipe-row">
                                            <td className="row-num-cell">{rowIndex + 1}</td>
                                            <td className="output-cell">
                                                <input
                                                    type="text"
                                                    value={recipe.outputName}
                                                    onChange={(e) => updateNewRecipe(recipe.id, 'outputName', e.target.value)}
                                                    placeholder="Output name..."
                                                    className="recipe-input output-input"
                                                />
                                            </td>
                                            <td className="type-cell">
                                                <select
                                                    value={recipe.outputType}
                                                    onChange={(e) => updateNewRecipe(recipe.id, 'outputType', e.target.value)}
                                                    className="recipe-select"
                                                >
                                                    <option value="INGREDIENT">Ingredient</option>
                                                    <option value="COMPONENT">Component</option>
                                                    <option value="COUNTERMEASURES">Countermeasure</option>
                                                    <option value="BOMBS">Bomb</option>
                                                    <option value="RAW">Raw Resource</option>
                                                </select>
                                            </td>
                                            <td className="tier-cell">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={recipe.outputTier}
                                                    onChange={(e) => updateNewRecipe(recipe.id, 'outputTier', parseInt(e.target.value))}
                                                    className="recipe-input tier-input"
                                                />
                                            </td>
                                            <td className="resource-type-cell">
                                                <select
                                                    value={recipe.resourceType}
                                                    onChange={(e) => updateNewRecipe(recipe.id, 'resourceType', e.target.value)}
                                                    className="recipe-select"
                                                >
                                                    <option value="INGREDIENT">Ingredient</option>
                                                    <option value="COMPONENT">Component</option>
                                                    <option value="ENERGY_MATERIAL">Energy Material</option>
                                                    <option value="STRUCTURAL_ALLOY">Structural Alloy</option>
                                                    <option value="ELECTRONIC_COMPONENT">Electronic Component</option>
                                                    <option value="BIO_MATTER">Bio Matter</option>
                                                    <option value="EXOTIC_ELEMENT">Exotic Element</option>
                                                </select>
                                            </td>
                                            <td className="functional-purpose-cell">
                                                <select
                                                    value={recipe.functionalPurpose}
                                                    onChange={(e) => updateNewRecipe(recipe.id, 'functionalPurpose', e.target.value)}
                                                    className="recipe-select"
                                                >
                                                    <option value="PRODUCTION">Production</option>
                                                    <option value="STRUCTURAL">Structural</option>
                                                    <option value="ENERGY">Energy</option>
                                                    <option value="DEFENSIVE">Defensive</option>
                                                    <option value="OFFENSIVE">Offensive</option>
                                                    <option value="UTILITY">Utility</option>
                                                    <option value="SPECIALIZED">Specialized</option>
                                                </select>
                                            </td>
                                            {/* 9 Ingredient Columns */}
                                            {Array.from({ length: 9 }, (_, index) => {
                                                // Find which row this ingredient is defined in
                                                const ingredientName = recipe.ingredients[index]?.name;
                                                const ingredientRowIndex = ingredientName ?
                                                    newRecipes.findIndex(r => (r.outputName || '').trim() === ingredientName.trim()) : -1;
                                                const ingredientRowNumber = ingredientRowIndex >= 0 ? ingredientRowIndex + 1 : '?';

                                                return (
                                                    <td key={`ingredient-${recipe.id}-${index}`} className="ingredient-cell">
                                                        <div className="ingredient-slot">
                                                            {recipe.ingredients[index] ? (
                                                                <div className="ingredient-selected">
                                                                    <span className="row-reference">R{ingredientRowNumber}</span>
                                                                    <span className="ingredient-name">
                                                                        {recipe.ingredients[index].name}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => removeIngredientFromSlot(recipe.id, index)}
                                                                        className="remove-ingredient-btn"
                                                                        title="Remove ingredient"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="ingredient-selector-slot">
                                                                    <select
                                                                        onChange={(e) => {
                                                                            if (e.target.value) {
                                                                                addIngredientToRecipe(recipe.id, index, e.target.value);
                                                                                e.target.value = ''; // Reset selection
                                                                            }
                                                                        }}
                                                                        className="ingredient-dropdown"
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '4px 8px',
                                                                            fontSize: '12px',
                                                                            border: '1px solid #ddd',
                                                                            borderRadius: '4px',
                                                                            backgroundColor: 'white'
                                                                        }}
                                                                    >
                                                                        <option value="">{`Slot ${index + 1} - Select ingredient...`}</option>
                                                                        {allResources
                                                                            .filter(resource => resource.outputType !== 'BASIC RESOURCE')
                                                                            .sort((a, b) => a.name.localeCompare(b.name))
                                                                            .map(resource => (
                                                                                <option key={resource.name} value={resource.name}>
                                                                                    {resource.name} (T{resource.tier || 1})
                                                                                </option>
                                                                            ))
                                                                        }
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="actions-cell">
                                                <button
                                                    onClick={() => setNewRecipes(newRecipes.filter(r => r.id !== recipe.id))}
                                                    className="delete-recipe-btn"
                                                    title="Delete recipe"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Ingredient Selection */}
                <div className="ingredient-selection">
                    <h3>🎯 Select Resource to Build Production Chain ({targetIngredients.length}{searchTerm ? ` filtered` : ''})</h3>

                    {/* Debug information when no ingredients are found */}
                    {targetIngredients.length === 0 && (
                        <div className="debug-info">
                            <p>No resources found. Debug info:</p>
                            <ul>
                                <li>Components loaded: {components.length}</li>
                                <li>Raw resources loaded: {rawResources.length}</li>
                                <li>Recipes loaded: {recipes.length}</li>
                                <li>All resources processed: {allResources.length}</li>
                                <li>Current filter: {filter}</li>
                            </ul>
                            {allResources.length > 0 && (
                                <div>
                                    <p>Sample resources:</p>
                                    <ul>
                                        {allResources.slice(0, 5).map(r => (
                                            <li key={r.name}>{r.name} (Type: {r.type}, Category: {r.category})</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="ingredient-search-container">
                        <div className="search-input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="🔍 Search ingredients by name (Press Enter or wait 500ms)..."
                                className="ingredient-search-input"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '16px',
                                    border: activeSearchTerm !== searchTerm ? '2px solid #ffc107' : '2px solid #ddd',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    marginBottom: '1rem',
                                    background: activeSearchTerm !== searchTerm ? 'rgba(255, 193, 7, 0.1)' : 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = activeSearchTerm !== searchTerm ? '#ffc107' : '#007bff'}
                                onBlur={(e) => e.target.style.borderColor = activeSearchTerm !== searchTerm ? '#ffc107' : '#ddd'}
                            />
                            {searchTerm && (
                                <button
                                    onClick={handleClearSearch}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        color: '#999'
                                    }}
                                    title="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        {activeSearchTerm && (
                            <div className="search-results-info" style={{
                                marginBottom: '1rem',
                                padding: '8px 12px',
                                background: 'rgba(0, 123, 255, 0.1)',
                                border: '1px solid rgba(0, 123, 255, 0.2)',
                                borderRadius: '4px',
                                fontSize: '14px',
                                color: '#0056b3'
                            }}>
                                🔍 Showing {targetIngredients.length} results for "{activeSearchTerm}"
                                {targetIngredients.length === 0 && " - try a different search term"}
                            </div>
                        )}
                        {searchTerm && activeSearchTerm !== searchTerm && (
                            <div className="search-pending-info" style={{
                                marginBottom: '1rem',
                                padding: '8px 12px',
                                background: 'rgba(255, 193, 7, 0.1)',
                                border: '1px solid rgba(255, 193, 7, 0.3)',
                                borderRadius: '4px',
                                fontSize: '14px',
                                color: '#856404'
                            }}>
                                ⏳ Search pending for "{searchTerm}" - Press Enter for immediate search
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {targetIngredients.length > 0 && (
                        <div className="pagination-controls" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            margin: '1rem 0',
                            padding: '0.5rem',
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            borderRadius: '8px'
                        }}>
                            <div className="pagination-info">
                                <span>Showing {Math.min(currentPage * itemsPerPage + 1, targetIngredients.length)} - {Math.min((currentPage + 1) * itemsPerPage, targetIngredients.length)} of {targetIngredients.length} resources</span>
                            </div>

                            <div className="pagination-controls-group">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(0); // Reset to first page
                                    }}
                                    style={{ marginRight: '1rem' }}
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={20}>20 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>

                                <button
                                    onClick={() => setCurrentPage(0)}
                                    disabled={currentPage === 0}
                                    style={{ marginRight: '0.5rem' }}
                                >
                                    ⏮️ First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 0}
                                    style={{ marginRight: '0.5rem' }}
                                >
                                    ⬅️ Prev
                                </button>
                                <span style={{ margin: '0 1rem' }}>
                                    Page {currentPage + 1} of {Math.ceil(targetIngredients.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={(currentPage + 1) * itemsPerPage >= targetIngredients.length}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    Next ➡️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.ceil(targetIngredients.length / itemsPerPage) - 1)}
                                    disabled={(currentPage + 1) * itemsPerPage >= targetIngredients.length}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    Last ⏭️
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="ingredients-grid">
                        {targetIngredients
                            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                            .map(ingredient => {
                                const recipe = recipes.find(r => r.outputName === ingredient.name);
                                const actualCompletionStatus = calculateCompletionStatus(ingredient.name);
                                const usageStats = ingredientUsageStats.get(ingredient.name) || { usageCount: 0, totalQuantityUsed: 0 };

                                return (
                                    <div
                                        key={ingredient.name}
                                        className={`ingredient-card ${selectedIngredient === ingredient.name ? 'selected' : ''} ${isAnalyzingChain && selectedIngredient === ingredient.name ? 'analyzing' : ''}`}
                                        onClick={() => handleIngredientSelect(ingredient.name)}
                                        style={{
                                            opacity: isAnalyzingChain && selectedIngredient === ingredient.name ? 0.7 : 1,
                                            cursor: isAnalyzingChain ? 'wait' : 'pointer'
                                        }}
                                    >
                                        <div className="ingredient-status">
                                            {actualCompletionStatus === 'complete' && '✅'}
                                            {actualCompletionStatus === 'incomplete' && '⚠️'}
                                            {actualCompletionStatus === 'missing' && '❌'}
                                            {actualCompletionStatus === 'circular' && '🔄'}
                                        </div>

                                        <div className="ingredient-content">
                                            <div className="ingredient-info">
                                                <div className="ingredient-name" title={ingredient.name}>
                                                    {ingredient.name}
                                                </div>
                                                <div className="ingredient-meta">
                                                    <span className={`tier-badge tier-${ingredient.tier}`}>
                                                        T{ingredient.tier}
                                                    </span>
                                                    <span className="ingredient-type">{ingredient.category}</span>
                                                    <span className="completion-status" title={`Actual Status: ${actualCompletionStatus}`}>
                                                        {actualCompletionStatus}
                                                    </span>
                                                    <span className="ingredient-count" title={`Number of ingredients in recipe`}>
                                                        📦 {ingredient.ingredients?.length || 0} ingredients
                                                    </span>
                                                    <span className="usage-count" title={`Used in ${usageStats.usageCount} recipes (${usageStats.totalQuantityUsed} total quantity)`}>
                                                        📊 {usageStats.usageCount} uses
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ingredient-actions-section">
                                            <div className="ingredient-actions">
                                                <button
                                                    className="usage-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShowUsageAnalysis(ingredient.name);
                                                    }}
                                                    title="View recipe usage"
                                                    disabled={usageStats.usageCount === 0}
                                                >
                                                    📈
                                                </button>
                                                <button
                                                    className="visualize-complete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        visualizeCompleteProductionChain(ingredient.name);
                                                    }}
                                                    title="Visualize Complete Production Chain"
                                                    style={{
                                                        backgroundColor: '#17a2b8',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 8px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        marginLeft: '4px'
                                                    }}
                                                >
                                                    🔗
                                                </button>
                                                {actualCompletionStatus === 'complete' && (
                                                    <button
                                                        className="visualize-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleIngredientSelect(ingredient.name);
                                                        }}
                                                        title="Visualize & Edit Production Chain"
                                                        style={{
                                                            backgroundColor: '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 8px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        🔍 View
                                                    </button>
                                                )}

                                                {/* Export Existing Production Chain button for ingredient cards */}
                                                <button
                                                    className="export-existing-chain-card-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        exportExistingProductionChain(ingredient.name);
                                                    }}
                                                    title={`Export existing production chain for ${ingredient.name} from CSV data`}
                                                    style={{
                                                        backgroundColor: '#28a745',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 8px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        marginLeft: '4px'
                                                    }}
                                                >
                                                    📤
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            {/* Recipe Suggestion Engine */}
            <RecipeSuggestionEngine
                selectedIngredient={suggestionsFor}
                onApplySuggestion={applySuggestion}
                isVisible={showSuggestions}
                onClose={() => {
                    setShowSuggestions(false);
                    setSuggestionsFor(null);
                }}
            />

            {/* Recipe Usage Analysis */}
            {showUsageAnalysis && selectedIngredientUsage && (
                <div className="usage-analysis-overlay">
                    <div className="usage-modal">
                        <div className="usage-header">
                            <h3>📊 Recipe Usage Analysis: {selectedIngredientUsage.ingredientName}</h3>
                            <button
                                onClick={() => setShowUsageAnalysis(false)}
                                className="close-usage"
                            >
                                ×
                            </button>
                        </div>
                        <div className="usage-content">
                            <div className="usage-summary">
                                <div className="usage-stats">
                                    <div className="stat-card">
                                        <span className="stat-value">{selectedIngredientUsage.usageCount}</span>
                                        <span className="stat-label">Recipes Using This</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{selectedIngredientUsage.totalQuantityUsed}</span>
                                        <span className="stat-label">Total Quantity Needed</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{selectedIngredientUsage.uniqueOutputs?.length || 0}</span>
                                        <span className="stat-label">Unique Products</span>
                                    </div>
                                </div>
                            </div>

                            {selectedIngredientUsage.usageCount > 0 ? (
                                <div className="usage-recipes">
                                    <h4>Recipes Using "{selectedIngredientUsage.ingredientName}":</h4>
                                    <div className="recipes-list">
                                        {selectedIngredientUsage.recipes.map((recipe, index) => {
                                            const ingredient = recipe.ingredients.find(ing => ing.name === selectedIngredientUsage.ingredientName);
                                            const quantity = ingredient ? ingredient.quantity || 1 : 1;

                                            return (
                                                <div key={`usage-${recipe.outputName || recipe.name}-${index}`} className="usage-recipe-card">
                                                    <div className="recipe-header">
                                                        <div className="recipe-name">
                                                            <span className="output-name">{recipe.outputName}</span>
                                                            <span className={`tier-badge tier-${recipe.outputTier || 1}`}>
                                                                T{recipe.outputTier || 1}
                                                            </span>
                                                        </div>
                                                        <div className="recipe-type">{recipe.outputType}</div>
                                                    </div>
                                                    <div className="recipe-usage">
                                                        <span className="quantity-used">
                                                            Uses {quantity}x {selectedIngredientUsage.ingredientName}
                                                        </span>
                                                        {recipe.constructionTime && (
                                                            <span className="construction-time">
                                                                ⏱️ {recipe.constructionTime}s
                                                            </span>
                                                        )}
                                                    </div>
                                                    {recipe.ingredients && (
                                                        <div className="recipe-ingredients">
                                                            <span className="ingredients-label">All ingredients:</span>
                                                            <div className="ingredients-chips">
                                                                {recipe.ingredients.map((ing, ingIndex) => (
                                                                    <span
                                                                        key={`${ing.name}-${ingIndex}`}
                                                                        className={`ingredient-chip ${ing.name === selectedIngredientUsage.ingredientName ? 'highlighted' : ''}`}
                                                                    >
                                                                        {ing.name} ({ing.quantity || 1})
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="no-usage">
                                    <p>This ingredient is not currently used in any recipes.</p>
                                    <p>Consider creating recipes that use this ingredient to increase its value in the production chain.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hover Tooltip */}
            {hoveredResource && (
                <ResourceTooltip
                    resourceName={hoveredResource}
                    resource={allResources.find(r => r.name === hoveredResource)}
                    recipe={recipes.find(r => r.outputName === hoveredResource)}
                />
            )}
        </div>
    );
};

export default ProductionChainBuilder; 