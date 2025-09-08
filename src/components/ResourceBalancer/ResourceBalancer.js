import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import './ResourceBalancer.css';

const ResourceBalancer = () => {
    const { state, updateRecipe } = useRecipes();

    // Combine all recipe data from the context
    const allRecipes = useMemo(() => {
        return [
            ...state.recipes,
            ...state.components,
            ...state.ingredients,
            ...state.finals,
            ...state.rawResources
        ];
    }, [state.recipes, state.components, state.ingredients, state.finals, state.rawResources]);

    // Function to update recipes for the balancer
    const setAllRecipes = (updatedRecipes) => {
        console.log('ResourceBalancer: Recipes updated', updatedRecipes.length);
        localStorage.setItem('recipes', JSON.stringify(updatedRecipes));
    };
    const [activeTab, setActiveTab] = useState('overview'); // overview, raw-resources, components, ingredients
    const [selectedResource, setSelectedResource] = useState(null);
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapData, setSwapData] = useState({ from: '', to: '', affectedRecipes: [] });
    const [balancingMode, setBalancingMode] = useState('needs-increase');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResources, setSelectedResources] = useState(new Set());
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [balancingRecommendations, setBalancingRecommendations] = useState([]);

    // Enhanced swap modal state
    const [swapFromResource, setSwapFromResource] = useState('');
    const [swapToResource, setSwapToResource] = useState('');
    const [availableFromResources, setAvailableFromResources] = useState([]);
    const [availableToResources, setAvailableToResources] = useState([]);
    const [affectedRecipesForSwap, setAffectedRecipesForSwap] = useState([]);
    const [selectedRecipesToSwap, setSelectedRecipesToSwap] = useState(new Set());

    // Manual NEEDS_USAGE_INCREASE management
    const [manuallyFlagged, setManuallyFlagged] = useState(new Set());
    const [completedResources, setCompletedResources] = useState(new Set());

    // Local storage management
    const [showClearStorageModal, setShowClearStorageModal] = useState(false);
    const [storageInfo, setStorageInfo] = useState({});

    // Effect calculation state
    const [calculatedEffects, setCalculatedEffects] = useState(new Map());
    const [calculatingEffects, setCalculatingEffects] = useState(new Set());
    const [poolCalculationProgress, setPoolCalculationProgress] = useState({});

    // Background calculation queue system
    const [calculationQueue, setCalculationQueue] = useState([]);
    const [queueProcessing, setQueueProcessing] = useState(false);
    const [queueProgress, setQueueProgress] = useState({ completed: 0, total: 0, current: null });
    const [autoCalculationEnabled, setAutoCalculationEnabled] = useState(true);
    const queueWorkerRef = useRef(null);

    // Multi-pool export selector state
    const [selectedPools, setSelectedPools] = useState(new Set());
    const [showMultiPoolSelector, setShowMultiPoolSelector] = useState(false);

    // Category mapping helper
    const getCategoryKey = (activeTab) => {
        switch (activeTab) {
            case 'raw-resources':
                return 'raw';
            case 'components':
                return 'components';
            case 'ingredients':
                return 'ingredients';
            default:
                return activeTab;
        }
    };

    // Load completed resources and manually flagged from localStorage, plus initialize from CSV
    useEffect(() => {
        const saved = localStorage.getItem('resourceBalancerState');

        // Initialize flags from CSV NEEDS_USAGE_INCREASE column
        const csvFlagged = new Set();
        allRecipes.forEach(recipe => {
            const outputName = recipe.OutputName || recipe.outputName || recipe.name;
            if (recipe.needsUsageIncrease || recipe.NEEDS_USAGE_INCREASE === 'TRUE') {
                csvFlagged.add(outputName);
                console.log(`Found CSV flagged resource: ${outputName}`);
            }
        });

        if (saved) {
            const state = JSON.parse(saved);
            // Merge CSV flags with saved localStorage flags
            const savedFlagged = new Set(state.manuallyFlagged || []);
            const mergedFlagged = new Set([...csvFlagged, ...savedFlagged]);
            setManuallyFlagged(mergedFlagged);
            setCompletedResources(new Set(state.completedResources || []));
        } else {
            // No saved state, just use CSV flags
            setManuallyFlagged(csvFlagged);
        }

        console.log(`Initialized ${csvFlagged.size} resources from CSV NEEDS_USAGE_INCREASE column`);
    }, [allRecipes]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const state = {
            manuallyFlagged: Array.from(manuallyFlagged),
            completedResources: Array.from(completedResources)
        };
        localStorage.setItem('resourceBalancerState', JSON.stringify(state));
    }, [manuallyFlagged, completedResources]);

    // Use loading state from context
    const loading = state.isLoading;

    // Function to analyze localStorage data
    const analyzeLocalStorage = () => {
        const info = {};
        let totalSize = 0;
        let totalItems = 0;

        // Check all localStorage keys related to the app
        const appKeys = [
            'recipe-data',
            'recipes',
            'resourceBalancerState',
            'generated-buildings',
            'building-recipes'
        ];

        appKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                const size = new Blob([data]).size;
                totalSize += size;
                try {
                    const parsedData = JSON.parse(data);
                    let itemCount = 0;

                    if (Array.isArray(parsedData)) {
                        itemCount = parsedData.length;
                    } else if (typeof parsedData === 'object') {
                        // Count items in object
                        Object.keys(parsedData).forEach(objKey => {
                            if (Array.isArray(parsedData[objKey])) {
                                itemCount += parsedData[objKey].length;
                            } else if (typeof parsedData[objKey] === 'object') {
                                itemCount += Object.keys(parsedData[objKey]).length;
                            } else {
                                itemCount += 1;
                            }
                        });
                    }

                    info[key] = {
                        size: size,
                        sizeFormatted: formatBytes(size),
                        itemCount: itemCount,
                        exists: true,
                        description: getKeyDescription(key)
                    };
                    totalItems += itemCount;
                } catch (error) {
                    info[key] = {
                        size: size,
                        sizeFormatted: formatBytes(size),
                        itemCount: 0,
                        exists: true,
                        description: getKeyDescription(key),
                        error: 'Unable to parse data'
                    };
                }
            } else {
                info[key] = {
                    size: 0,
                    sizeFormatted: '0 B',
                    itemCount: 0,
                    exists: false,
                    description: getKeyDescription(key)
                };
            }
        });

        info.totals = {
            size: totalSize,
            sizeFormatted: formatBytes(totalSize),
            itemCount: totalItems,
            keysWithData: Object.values(info).filter(item => item.exists).length
        };

        return info;
    };

    // Helper function to format bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper function to get key descriptions
    const getKeyDescription = (key) => {
        const descriptions = {
            'recipe-data': 'Modified recipes, components, and raw resources',
            'recipes': 'Recipe system data from Resource Balancer',
            'resourceBalancerState': 'Resource Balancer settings and flags',
            'generated-buildings': 'Generated buildings from Building Manager',
            'building-recipes': 'Building recipes from Building Recipes manager'
        };
        return descriptions[key] || 'Unknown data type';
    };

    // Function to clear all localStorage
    const clearAllLocalStorage = () => {
        const appKeys = [
            'recipe-data',
            'recipes',
            'resourceBalancerState',
            'generated-buildings',
            'building-recipes'
        ];

        appKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        // Reset state
        setManuallyFlagged(new Set());
        setCompletedResources(new Set());
        setShowClearStorageModal(false);

        // Show success message
        alert('Local storage cleared successfully! The page will reload to refresh the data.');

        // Reload the page to refresh all data
        window.location.reload();
    };

    // Function to show clear storage modal
    const showClearStorageInfo = () => {
        const info = analyzeLocalStorage();
        setStorageInfo(info);
        setShowClearStorageModal(true);
    };



    // Usage analysis with manual flagging
    const usageAnalysis = useMemo(() => {
        if (allRecipes.length === 0) return { raw: new Map(), components: new Map(), ingredients: new Map(), other: new Map() };

        const analysis = {
            raw: new Map(),
            components: new Map(),
            ingredients: new Map(),
            other: new Map()
        };

        // Count how many times each resource is used as an ingredient
        allRecipes.forEach(recipe => {
            // Handle both old CSV format (Ingredient1, Ingredient2, etc.) and new context format (ingredients array)
            const ingredientsToProcess = [];

            // New format: ingredients array
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach((ing, index) => {
                    if (ing.name && ing.name.trim()) {
                        ingredientsToProcess.push({
                            name: ing.name.trim(),
                            slot: index + 1,
                            quantity: ing.quantity || 1
                        });
                    }
                });
            } else {
                // Old format: Ingredient1, Ingredient2, etc.
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        ingredientsToProcess.push({
                            name: ingredient.trim(),
                            slot: i,
                            quantity: recipe[`Quantity${i}`] || 1
                        });
                    }
                }
            }

            ingredientsToProcess.forEach(({ name: ingredientName, slot, quantity }) => {

                // Find the resource definition to categorize it
                const resourceDef = allRecipes.find(r =>
                    (r.OutputName === ingredientName) || (r.outputName === ingredientName) || (r.name === ingredientName)
                );
                let category = 'other';

                if (resourceDef) {
                    const outputType = (resourceDef.OutputType || resourceDef.outputType || resourceDef.type || '').toUpperCase();
                    if (outputType === 'BASIC RESOURCE' || outputType === 'RAW_MATERIAL' || outputType === 'RAW RESOURCE') {
                        category = 'raw';
                    } else if (outputType === 'COMPONENT') {
                        category = 'components';
                    } else if (outputType === 'INGREDIENT') {
                        category = 'ingredients';
                    }
                }

                if (!analysis[category].has(ingredientName)) {
                    analysis[category].set(ingredientName, {
                        name: ingredientName,
                        usageCount: 0,
                        usedInRecipes: [],
                        tier: resourceDef?.OutputTier || resourceDef?.outputTier || resourceDef?.tier || 0,
                        type: resourceDef?.OutputType || resourceDef?.outputType || resourceDef?.type || 'UNKNOWN',
                        resourceType: resourceDef?.ResourceType || resourceDef?.resourceType || '',
                        usageCategory: resourceDef?.UsageCategory || resourceDef?.usageCategory || '',
                        planetTypes: resourceDef?.PlanetTypes || resourceDef?.planetTypes || '',
                        needsUsageIncrease: manuallyFlagged.has(ingredientName) && !completedResources.has(ingredientName),
                        isManuallyFlagged: manuallyFlagged.has(ingredientName),
                        isCompleted: completedResources.has(ingredientName),
                        isUnusedComponent: false // Will be updated after usage counting
                    });
                }

                const resourceData = analysis[category].get(ingredientName);
                resourceData.usageCount++;
                resourceData.usedInRecipes.push({
                    recipeName: recipe.OutputName || recipe.outputName || recipe.name,
                    recipeType: recipe.OutputType || recipe.outputType || recipe.type,
                    slot: slot,
                    quantity: quantity
                });
            });
        });

        // Add resources that exist but are never used (usage count = 0)
        allRecipes.forEach(recipe => {
            const outputName = recipe.OutputName || recipe.outputName || recipe.name;
            const outputType = (recipe.OutputType || recipe.outputType || recipe.type || '').toUpperCase();

            let category = 'other';
            if (outputType === 'BASIC RESOURCE' || outputType === 'RAW_MATERIAL' || outputType === 'RAW RESOURCE') {
                category = 'raw';
            } else if (outputType === 'COMPONENT') {
                category = 'components';
            } else if (outputType === 'INGREDIENT') {
                category = 'ingredients';
            }

            if (!analysis[category].has(outputName)) {
                analysis[category].set(outputName, {
                    name: outputName,
                    usageCount: 0,
                    usedInRecipes: [],
                    tier: recipe.OutputTier || recipe.outputTier || recipe.tier || 0,
                    type: recipe.OutputType || recipe.outputType || recipe.type || 'UNKNOWN',
                    resourceType: recipe.ResourceType || recipe.resourceType || '',
                    usageCategory: recipe.UsageCategory || recipe.usageCategory || '',
                    planetTypes: recipe.PlanetTypes || recipe.planetTypes || '',
                    needsUsageIncrease: manuallyFlagged.has(outputName) && !completedResources.has(outputName),
                    isManuallyFlagged: manuallyFlagged.has(outputName),
                    isCompleted: completedResources.has(outputName),
                    isUnusedComponent: outputType === 'COMPONENT' // Will be updated below based on usageCount
                });
            }
        });

        // Final pass: Mark unused components and unused ingredients
        analysis.components.forEach(resource => {
            resource.isUnusedComponent = resource.type === 'COMPONENT' && resource.usageCount === 0;
        });

        // Mark ingredients as unused if they're not used in final ship configuration components
        analysis.ingredients.forEach(resource => {
            if (resource.type === 'INGREDIENT') {
                // Check if this ingredient is used in any final ship configuration recipes
                const finalShipOutputTypes = ['DRONE', 'HAB_ASSETS', 'SHIP_COMPONENTS', 'SHIP_MODULES', 'SHIP_WEAPONS', 'MISSILES', 'COUNTERMEASURES'];

                const usedInFinalShipComponents = resource.usedInRecipes.some(usage => {
                    const recipeType = (usage.recipeType || '').toUpperCase();
                    return finalShipOutputTypes.includes(recipeType);
                });

                // Mark as unused if not used in final ship components
                resource.isUnusedIngredient = !usedInFinalShipComponents;

                // Debug logging for ingredient usage analysis
                if (resource.usageCount > 0 && !usedInFinalShipComponents) {
                    console.log(`🔍 Ingredient "${resource.name}" marked as unused (only used in non-final components):`, {
                        usageCount: resource.usageCount,
                        usedInTypes: [...new Set(resource.usedInRecipes.map(r => r.recipeType))],
                        finalShipOutputTypes
                    });
                }
            }
        });

        return analysis;
    }, [allRecipes, manuallyFlagged, completedResources]);

    // Missing ingredients analysis - ingredients referenced but not defined as components
    const missingIngredients = useMemo(() => {
        if (allRecipes.length === 0) return [];

        const allOutputNames = new Set();
        const allReferencedIngredients = new Set();

        // Collect all OutputNames
        allRecipes.forEach(recipe => {
            const outputName = recipe.OutputName || recipe.outputName || recipe.name;
            if (outputName && outputName.trim()) {
                allOutputNames.add(outputName.trim());
            }
        });

        // Collect all referenced ingredients
        allRecipes.forEach(recipe => {
            // Handle both old CSV format (Ingredient1, Ingredient2, etc.) and new context format (ingredients array)
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ing => {
                    if (ing.name && ing.name.trim()) {
                        const ingredientName = ing.name.trim();
                        allReferencedIngredients.add(ingredientName);

                        // Debug suspicious ingredients
                        if (ingredientName === '1' || ingredientName.match(/^\d+$/)) {
                            console.log('🐛 DEBUG: Found suspicious ingredient in array format:', {
                                ingredient: ingredientName,
                                recipe: recipe.OutputName || recipe.outputName || recipe.name,
                                allIngredients: recipe.ingredients
                            });
                        }
                    }
                });
            } else {
                // Old format: Ingredient1, Ingredient2, etc. (skip Quantity columns)
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    if (ingredient && ingredient.trim()) {
                        const ingredientName = ingredient.trim();
                        allReferencedIngredients.add(ingredientName);

                        // Debug suspicious ingredients
                        if (ingredientName === '1' || ingredientName.match(/^\d+$/)) {
                            console.log('🐛 DEBUG: Found suspicious ingredient in CSV format:', {
                                ingredient: ingredientName,
                                recipe: recipe.OutputName || recipe.outputName || recipe.name,
                                slot: i,
                                allIngredientFields: {
                                    Ingredient1: recipe.Ingredient1,
                                    Quantity1: recipe.Quantity1,
                                    Ingredient2: recipe.Ingredient2,
                                    Quantity2: recipe.Quantity2,
                                    Ingredient3: recipe.Ingredient3,
                                    Quantity3: recipe.Quantity3
                                }
                            });
                        }
                    }
                }
            }
        });

        // Find ingredients that are referenced but don't exist as OutputNames
        const missing = [];
        allReferencedIngredients.forEach(ingredientName => {
            if (!allOutputNames.has(ingredientName)) {
                // Count how many times this missing ingredient is used
                let usageCount = 0;
                const usedInRecipes = [];

                allRecipes.forEach(recipe => {
                    let found = false;

                    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                        recipe.ingredients.forEach((ing, index) => {
                            if (ing.name && ing.name.trim() === ingredientName) {
                                usageCount++;
                                found = true;
                                usedInRecipes.push({
                                    recipeName: recipe.OutputName || recipe.outputName || recipe.name,
                                    recipeType: recipe.OutputType || recipe.outputType || recipe.type,
                                    slot: index + 1,
                                    quantity: ing.quantity || 1
                                });
                            }
                        });
                    } else {
                        for (let i = 1; i <= 9; i++) {
                            const ingredient = recipe[`Ingredient${i}`];
                            if (ingredient && ingredient.trim() === ingredientName) {
                                usageCount++;
                                found = true;
                                usedInRecipes.push({
                                    recipeName: recipe.OutputName || recipe.outputName || recipe.name,
                                    recipeType: recipe.OutputType || recipe.outputType || recipe.type,
                                    slot: i,
                                    quantity: recipe[`Quantity${i}`] || 1
                                });
                            }
                        }
                    }
                });

                // Debug logging for suspicious ingredients
                if (ingredientName === '1' || ingredientName.match(/^\d+$/)) {
                    console.log('🐛 DEBUG: Found suspicious numeric ingredient:', {
                        ingredient: ingredientName,
                        usageCount,
                        firstFewRecipes: usedInRecipes.slice(0, 3)
                    });
                }

                missing.push({
                    name: ingredientName,
                    usageCount,
                    usedInRecipes
                });
            }
        });

        // Sort by usage count (most used first)
        return missing.sort((a, b) => b.usageCount - a.usageCount);
    }, [allRecipes]);

    // Manual flagging functions
    const toggleManualFlag = (resourceName) => {
        const newFlagged = new Set(manuallyFlagged);
        if (newFlagged.has(resourceName)) {
            newFlagged.delete(resourceName);
        } else {
            newFlagged.add(resourceName);
        }
        setManuallyFlagged(newFlagged);
    };

    const markAsCompleted = (resourceName) => {
        const newCompleted = new Set(completedResources);
        newCompleted.add(resourceName);
        setCompletedResources(newCompleted);
    };

    const unmarkCompleted = (resourceName) => {
        const newCompleted = new Set(completedResources);
        newCompleted.delete(resourceName);
        setCompletedResources(newCompleted);
    };

    // Initialize available resources for swapping
    const initializeSwapResources = () => {
        const allResourceNames = [];

        console.log('Initializing swap resources, usageAnalysis:', usageAnalysis);

        ['raw', 'components', 'ingredients'].forEach(category => {
            if (usageAnalysis[category] && usageAnalysis[category].size > 0) {
                console.log(`Processing ${category} category with ${usageAnalysis[category].size} resources`);
                Array.from(usageAnalysis[category].values()).forEach(resource => {
                    allResourceNames.push({
                        name: resource.name,
                        category,
                        tier: resource.tier,
                        type: resource.type,
                        usageCount: resource.usageCount,
                        usedInRecipes: resource.usedInRecipes || []
                    });
                });
            }
        });

        console.log(`Found ${allResourceNames.length} total resources`);
        const fromResources = allResourceNames.filter(r => r.usageCount > 0);
        console.log(`Found ${fromResources.length} resources with usage > 0`);

        setAvailableFromResources(fromResources);
        setAvailableToResources(allResourceNames);
    };

    // Handle from resource selection
    const handleFromResourceChange = (resourceName) => {
        setSwapFromResource(resourceName);
        setSwapToResource('');
        setSelectedRecipesToSwap(new Set());

        const fromResource = availableFromResources.find(r => r.name === resourceName);
        if (fromResource) {
            setAffectedRecipesForSwap(fromResource.usedInRecipes);
            // Filter available "to" resources by same tier and type
            const compatibleResources = availableToResources.filter(r =>
                r.name !== resourceName &&
                r.tier === fromResource.tier &&
                r.type === fromResource.type
            );
            setAvailableToResources(compatibleResources);
        } else {
            setAffectedRecipesForSwap([]);
        }
    };

    // Handle recipe selection for individual swapping
    const handleRecipeSwapSelection = (recipeId, isSelected) => {
        const newSelection = new Set(selectedRecipesToSwap);
        if (isSelected) {
            newSelection.add(recipeId);
        } else {
            newSelection.delete(recipeId);
        }
        setSelectedRecipesToSwap(newSelection);
    };

    // Execute selective recipe swaps
    const executeSelectiveSwap = async () => {
        if (!swapFromResource || !swapToResource || selectedRecipesToSwap.size === 0) {
            alert('Please select from/to resources and at least one recipe to swap.');
            return;
        }

        try {
            const recipesToUpdate = affectedRecipesForSwap.filter(recipe =>
                selectedRecipesToSwap.has(`${recipe.recipeName}-${recipe.slot}`)
            );

            console.log(`Swapping ${swapFromResource} -> ${swapToResource} in ${recipesToUpdate.length} selected recipes`);

            // Here you would implement the actual recipe updating logic
            // For now, just log and close the modal
            alert(`Would swap ${swapFromResource} with ${swapToResource} in ${recipesToUpdate.length} recipes`);

            setShowSwapModal(false);
            setSwapFromResource('');
            setSwapToResource('');
            setSelectedRecipesToSwap(new Set());
        } catch (error) {
            console.error('Error executing selective swap:', error);
            alert('Error executing swap. Please try again.');
        }
    };

    // Open enhanced swap modal
    const openEnhancedSwapModal = () => {
        initializeSwapResources();
        setShowSwapModal(true);
    };

    // Helper function to check if two tiers are in the same group
    const isCompatibleTier = (tier1, tier2) => {
        const getTierGroup = (tier) => {
            if (tier >= 1 && tier <= 3) return 'low';
            if (tier >= 4 && tier <= 5) return 'high';
            return 'other';
        };
        return getTierGroup(tier1) === getTierGroup(tier2);
    };

    // Generate balancing recommendations - prioritize manually flagged resources
    const generateBalancingRecommendations = () => {
        const recommendations = [];

        // Prioritize manually flagged resources first
        ['raw', 'components', 'ingredients'].forEach(category => {
            const resources = Array.from(usageAnalysis[category].values());

            // First, handle manually flagged resources
            const manuallyFlaggedResources = resources.filter(r =>
                r.isManuallyFlagged && !r.isCompleted
            );

            manuallyFlaggedResources.forEach(resource => {
                // Find over-utilized resources in the same category/tier group that could be substituted
                const candidates = resources.filter(r =>
                    r.name !== resource.name &&
                    isCompatibleTier(r.tier, resource.tier) &&
                    r.resourceType === resource.resourceType &&
                    r.usageCount > 10 // Over-utilized threshold
                ).sort((a, b) => b.usageCount - a.usageCount);

                if (candidates.length > 0) {
                    recommendations.push({
                        action: 'substitute',
                        from: candidates[0],
                        to: resource,
                        reason: 'Manually flagged as needing usage increase',
                        potentialSavings: Math.floor(candidates[0].usageCount * 0.3),
                        category,
                        priority: 'high'
                    });
                }
            });

            // Then handle other low-usage resources
            const lowUsageResources = resources.filter(r =>
                !r.isManuallyFlagged &&
                !r.isCompleted &&
                (r.usageCount === 0 || r.usageCount < 3)
            );

            lowUsageResources.forEach(resource => {
                const candidates = resources.filter(r =>
                    r.name !== resource.name &&
                    isCompatibleTier(r.tier, resource.tier) &&
                    r.resourceType === resource.resourceType &&
                    r.usageCount > 15
                ).sort((a, b) => b.usageCount - a.usageCount);

                if (candidates.length > 0) {
                    recommendations.push({
                        action: 'substitute',
                        from: candidates[0],
                        to: resource,
                        reason: resource.usageCount === 0 ? 'Currently unused' : 'Low usage count',
                        potentialSavings: Math.floor(candidates[0].usageCount * 0.2),
                        category,
                        priority: 'normal'
                    });
                }
            });
        });

        // Sort recommendations by priority (high priority first)
        recommendations.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (a.priority !== 'high' && b.priority === 'high') return 1;
            return b.potentialSavings - a.potentialSavings;
        });

        setBalancingRecommendations(recommendations);
        return recommendations;
    };

    // Generate substitute pools based on ComponentCategory + Tier for production chain analysis
    const generateSubstitutePools = (category) => {
        const categoryKey = getCategoryKey(category);
        if (!usageAnalysis[categoryKey]) return [];

        const resources = Array.from(usageAnalysis[categoryKey].values());
        const pools = {};

        // Group by ComponentCategory + Tier for ingredient production chain analysis
        resources.forEach(resource => {
            // Get component category from the CSV data - need to find it from allRecipes
            let componentCategory = 'Unknown';

            // Find the recipe that produces this resource to get its ComponentCategory
            const producingRecipe = allRecipes.find(recipe =>
                (recipe.OutputName || recipe.outputName) === resource.name &&
                (recipe.OutputType || recipe.outputType || '').toUpperCase() === 'INGREDIENT'
            );

            if (producingRecipe) {
                componentCategory = producingRecipe.ComponentCategory || 'Unknown';
            }

            // Create pool key: ComponentCategory + Tier
            const poolKey = `${componentCategory}-T${resource.tier}`;

            if (!pools[poolKey]) {
                pools[poolKey] = {
                    name: `${componentCategory} T${resource.tier}`,
                    componentCategory: componentCategory,
                    tier: resource.tier,
                    resources: [],
                    averageUsage: 0,
                    totalUsage: 0,
                    // Production chain analysis specific fields
                    incompleteRecipes: [],
                    availableRawResources: new Set(),
                    availableComponents: new Set()
                };
            }

            pools[poolKey].resources.push(resource);
            pools[poolKey].totalUsage += resource.usageCount;

            // Track incomplete production chains for ingredients
            if (categoryKey === 'ingredients' && resource.usageCount === 0) {
                pools[poolKey].incompleteRecipes.push(resource.name);
            }
        });

        // Calculate averages and analyze production chain gaps
        Object.values(pools).forEach(pool => {
            pool.averageUsage = pool.totalUsage / pool.resources.length;

            // Find available raw resources and components for this tier combination
            if (categoryKey === 'ingredients') {
                const currentTier = pool.tier;

                // Raw resources: same tier or up to 2 tiers below
                const minTier = Math.max(1, currentTier - 2);
                const maxTier = currentTier;

                // Find raw resources in tier range
                if (usageAnalysis.raw) {
                    Array.from(usageAnalysis.raw.values()).forEach(rawResource => {
                        if (rawResource.tier >= minTier && rawResource.tier <= maxTier) {
                            // Check if this raw resource has the same component category
                            const rawRecipe = allRecipes.find(recipe =>
                                (recipe.OutputName || recipe.outputName) === rawResource.name &&
                                (recipe.OutputType || recipe.outputType || '').toUpperCase() === 'BASIC RESOURCE'
                            );

                            if (rawRecipe && (rawRecipe.ComponentCategory === pool.componentCategory ||
                                rawRecipe.ComponentCategory === 'Universal' ||
                                !rawRecipe.ComponentCategory)) {
                                pool.availableRawResources.add(rawResource.name);
                            }
                        }
                    });
                }

                // Find components in tier range
                if (usageAnalysis.components) {
                    Array.from(usageAnalysis.components.values()).forEach(component => {
                        if (component.tier >= minTier && component.tier <= maxTier) {
                            const compRecipe = allRecipes.find(recipe =>
                                (recipe.OutputName || recipe.outputName) === component.name &&
                                (recipe.OutputType || recipe.outputType || '').toUpperCase() === 'COMPONENT'
                            );

                            if (compRecipe && (compRecipe.ComponentCategory === pool.componentCategory ||
                                compRecipe.ComponentCategory === 'Universal' ||
                                !compRecipe.ComponentCategory)) {
                                pool.availableComponents.add(component.name);
                            }
                        }
                    });
                }
            }
        });

        return Object.values(pools).filter(pool => pool.resources.length > 0);
    };

    // Get resources by balancing status
    const getResourcesByStatus = (category, status) => {
        const categoryKey = getCategoryKey(category);
        if (!usageAnalysis[categoryKey]) return [];

        const resources = Array.from(usageAnalysis[categoryKey].values());

        switch (status) {
            case 'unused':
                if (categoryKey === 'ingredients') {
                    // For ingredients, consider them unused if they have 0 usage OR only used in non-final components
                    return resources.filter(r => r.usageCount === 0 || r.isUnusedIngredient);
                } else {
                    return resources.filter(r => r.usageCount === 0);
                }
            case 'unused-components':
                return resources.filter(r => r.isUnusedComponent && r.usageCount === 0);
            case 'unused-ingredients':
                return resources.filter(r => r.isUnusedIngredient);
            case 'under-utilized':
                return resources.filter(r => r.usageCount > 0 && r.usageCount < 5);
            case 'over-utilized':
                return resources.filter(r => r.usageCount > 20);
            case 'balanced':
                return resources.filter(r => r.usageCount >= 5 && r.usageCount <= 20);
            case 'needs-increase':
                return resources.filter(r => r.needsUsageIncrease || r.isManuallyFlagged);
            case 'completed':
                return resources.filter(r => r.isCompleted);
            default:
                return resources;
        }
    };

    // Handle resource swap - updated to use enhanced modal
    const initiateSwap = (fromResource, toResource) => {
        // Initialize the enhanced swap modal with pre-selected resources
        initializeSwapResources();

        // Set the FROM resource
        setSwapFromResource(fromResource.name);

        // Set affected recipes for the from resource
        setAffectedRecipesForSwap(fromResource.usedInRecipes || []);

        // Filter compatible TO resources by same tier group and type
        const compatibleResources = [];
        ['raw', 'components', 'ingredients'].forEach(category => {
            if (usageAnalysis[category]) {
                Array.from(usageAnalysis[category].values()).forEach(resource => {
                    if (resource.name !== fromResource.name &&
                        isCompatibleTier(resource.tier, fromResource.tier) &&
                        resource.type === fromResource.type) {
                        compatibleResources.push({
                            name: resource.name,
                            category,
                            tier: resource.tier,
                            type: resource.type,
                            usageCount: resource.usageCount,
                            usedInRecipes: resource.usedInRecipes
                        });
                    }
                });
            }
        });
        setAvailableToResources(compatibleResources);

        // If a toResource was suggested, pre-select it
        if (toResource) {
            setSwapToResource(toResource.name);
        }

        setShowSwapModal(true);
    };

    const executeSwap = async () => {
        try {
            const updatedRecipes = [...allRecipes];

            swapData.affectedRecipes.forEach(swap => {
                const recipe = updatedRecipes.find(r => r.OutputName === swap.recipeName);
                if (recipe) {
                    recipe[`Ingredient${swap.slot}`] = swapData.to;
                }
            });

            setAllRecipes(updatedRecipes);
            localStorage.setItem('recipes', JSON.stringify(updatedRecipes));

            console.log(`Swapped ${swapData.from} with ${swapData.to} in ${swapData.affectedRecipes.length} recipes`);
            setShowSwapModal(false);
            setSwapData({ from: '', to: '', affectedRecipes: [] });
        } catch (error) {
            console.error('Error executing swap:', error);
        }
    };

    // Batch operations
    const handleResourceSelection = (resourceName, isSelected) => {
        const newSelection = new Set(selectedResources);
        if (isSelected) {
            newSelection.add(resourceName);
        } else {
            newSelection.delete(resourceName);
        }
        setSelectedResources(newSelection);
    };

    const executeBatchBalancing = () => {
        setShowBatchModal(true);
    };

    // Comprehensive balancing report export
    const exportBalancingReport = () => {
        const flaggedResources = [];
        ['raw', 'components', 'ingredients'].forEach(category => {
            if (usageAnalysis[category]) {
                Array.from(usageAnalysis[category].values()).forEach(resource => {
                    if (resource.isManuallyFlagged && !resource.isCompleted) {
                        flaggedResources.push({ ...resource, category });
                    }
                });
            }
        });

        // Analyze faction-specific resources
        const getFactionSpecificity = (resource) => {
            const resourceDef = allRecipes.find(r =>
                (r.OutputName === resource.name) || (r.outputName === resource.name) || (r.name === resource.name)
            );
            if (!resourceDef) return null;

            const factionsField = resourceDef.Factions || resourceDef.factions || '';
            const factionsString = typeof factionsField === 'string' ? factionsField : String(factionsField || '');
            const factions = factionsString.split(';').filter(f => f.trim());
            if (factions.length === 1) {
                const faction = factions[0].trim();
                const themes = {
                    'MUD': 'Firepower/Distance - Emphasizes offensive capabilities and long-range engagement',
                    'ONI': 'Science/Stealth - Focuses on advanced technology and covert operations',
                    'USTUR': 'Defense/Evasion - Specializes in protective systems and mobility'
                };
                return { faction, theme: themes[faction] || 'Unknown specialization' };
            }
            return null;
        };

        // Analyze production chains for different component families
        const analyzeProductionChains = () => {
            const componentFamilies = {};

            allRecipes.forEach(recipe => {
                const outputName = recipe.OutputName || recipe.outputName || recipe.name;
                if (!outputName) return;

                // Group by base component name (removing size and tier)
                let baseName = outputName;
                baseName = baseName.replace(/\b(XXS|XS|S|M|L|XL|XXL|CAP|CMD|CLASS\d+|TTN)\b/gi, '').trim();
                baseName = baseName.replace(/\bT[1-5]\b/gi, '').trim();
                baseName = baseName.replace(/\s+/g, ' ').trim();

                if (!componentFamilies[baseName]) {
                    componentFamilies[baseName] = {
                        baseName,
                        variants: [],
                        totalUsageCount: 0,
                        ingredients: new Set(),
                        components: new Set(),
                        rawResources: new Set(),
                        tiers: new Set(),
                        outputTypes: new Set()
                    };
                }

                const family = componentFamilies[baseName];
                family.variants.push(recipe);
                family.outputTypes.add(recipe.OutputType || recipe.outputType || recipe.type);
                family.tiers.add(parseInt(recipe.OutputTier || recipe.outputTier || recipe.tier) || 1);

                // Analyze ingredients
                const processIngredients = (ingredients) => {
                    if (Array.isArray(ingredients)) {
                        ingredients.forEach(ing => {
                            if (ing.name) {
                                const ingResource = [...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                    .find(r => r.name === ing.name);
                                if (ingResource) {
                                    family.totalUsageCount += ingResource.usageCount;
                                    if (ingResource.type === 'BASIC RESOURCE') {
                                        family.rawResources.add(ing.name);
                                    } else if (ingResource.type === 'COMPONENT') {
                                        family.components.add(ing.name);
                                    } else if (ingResource.type === 'INGREDIENT') {
                                        family.ingredients.add(ing.name);
                                    }
                                }
                            }
                        });
                    } else {
                        // Handle old format
                        for (let i = 1; i <= 9; i++) {
                            const ingredient = recipe[`Ingredient${i}`];
                            if (ingredient && ingredient.trim()) {
                                const ingResource = [...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                    .find(r => r.name === ingredient.trim());
                                if (ingResource) {
                                    family.totalUsageCount += ingResource.usageCount;
                                    if (ingResource.type === 'BASIC RESOURCE') {
                                        family.rawResources.add(ingredient.trim());
                                    } else if (ingResource.type === 'COMPONENT') {
                                        family.components.add(ingredient.trim());
                                    } else if (ingResource.type === 'INGREDIENT') {
                                        family.ingredients.add(ingredient.trim());
                                    }
                                }
                            }
                        }
                    }
                };

                if (recipe.ingredients) {
                    processIngredients(recipe.ingredients);
                } else {
                    processIngredients(null);
                }
            });

            return Object.values(componentFamilies).filter(family => family.variants.length > 1);
        };

        const productionChains = analyzeProductionChains();

        // Generate the comprehensive report
        let report = `# Resource Balancing Analysis Report\n\n`;
        report += `Generated on: ${new Date().toLocaleString()}\n\n`;

        report += `## Executive Summary\n\n`;
        report += `This report provides a comprehensive analysis of resource usage patterns and balancing opportunities for optimizing production chains across 145 different final components.\n\n`;

        report += `### Key Statistics:\n`;
        report += `- **Total Resources Flagged for Increase:** ${flaggedResources.length}\n`;
        report += `- **Raw Resources:** ${usageAnalysis.raw?.size || 0} (${flaggedResources.filter(r => r.category === 'raw').length} flagged)\n`;
        report += `- **Components:** ${usageAnalysis.components?.size || 0} (${flaggedResources.filter(r => r.category === 'components').length} flagged)\n`;
        report += `- **Ingredients:** ${usageAnalysis.ingredients?.size || 0} (${flaggedResources.filter(r => r.category === 'ingredients').length} flagged)\n`;
        report += `- **Component Families Analyzed:** ${productionChains.length}\n\n`;

        // Flagged Resources Analysis
        report += `## 🎯 Resources Requiring Usage Increase\n\n`;
        report += `The following resources have been identified as needing increased usage across production chains:\n\n`;

        ['raw', 'components', 'ingredients'].forEach(category => {
            const categoryResources = flaggedResources.filter(r => r.category === category);
            if (categoryResources.length === 0) return;

            report += `### ${category.toUpperCase()} RESOURCES\n\n`;

            categoryResources.forEach(resource => {
                report += `#### ${resource.name}\n`;
                report += `- **Current Usage:** ${resource.usageCount} recipes\n`;
                report += `- **Tier:** T${resource.tier}\n`;
                report += `- **Type:** ${resource.type}\n`;
                report += `- **Resource Type:** ${resource.resourceType}\n`;
                report += `- **Usage Category:** ${resource.usageCategory}\n`;

                // Faction analysis
                const factionInfo = getFactionSpecificity(resource);
                if (factionInfo) {
                    report += `- **Faction Specific:** ${factionInfo.faction} - ${factionInfo.theme}\n`;
                }

                // Current usage details
                if (resource.usedInRecipes && resource.usedInRecipes.length > 0) {
                    report += `- **Currently Used In:**\n`;
                    resource.usedInRecipes.slice(0, 10).forEach(usage => {
                        report += `  - ${usage.recipeName} (${usage.recipeType}) - Slot ${usage.slot} (x${usage.quantity})\n`;
                    });
                    if (resource.usedInRecipes.length > 10) {
                        report += `  - *...and ${resource.usedInRecipes.length - 10} more recipes*\n`;
                    }
                }

                // Find potential substitution candidates
                const compatibleResources = [];
                ['raw', 'components', 'ingredients'].forEach(cat => {
                    if (usageAnalysis[cat]) {
                        Array.from(usageAnalysis[cat].values()).forEach(candidate => {
                            if (candidate.name !== resource.name &&
                                candidate.tier === resource.tier &&
                                candidate.type === resource.type &&
                                candidate.usageCount > resource.usageCount + 5) {
                                compatibleResources.push(candidate);
                            }
                        });
                    }
                });

                if (compatibleResources.length > 0) {
                    report += `- **Potential Substitution Sources:**\n`;
                    compatibleResources.slice(0, 5).forEach(candidate => {
                        report += `  - **${candidate.name}** (${candidate.usageCount} uses) - Can transfer ${Math.min(10, Math.floor((candidate.usageCount - resource.usageCount) / 2))} uses\n`;
                    });
                }

                report += `\n`;
            });
        });

        // Production Chain Analysis
        report += `## 🏭 Production Chain Analysis\n\n`;
        report += `Analysis of major component families and their resource dependencies:\n\n`;

        // Sort by total usage for most important chains first
        productionChains.sort((a, b) => b.totalUsageCount - a.totalUsageCount).slice(0, 20).forEach(family => {
            report += `### ${family.baseName}\n`;
            report += `- **Variants:** ${family.variants.length} (Tiers: ${Array.from(family.tiers).sort().join(', ')})\n`;
            report += `- **Output Types:** ${Array.from(family.outputTypes).join(', ')}\n`;
            report += `- **Total Usage Impact:** ${family.totalUsageCount} recipe usages\n`;

            if (family.rawResources.size > 0) {
                report += `- **Raw Resources Required:** ${Array.from(family.rawResources).join(', ')}\n`;
            }
            if (family.components.size > 0) {
                report += `- **Components Required:** ${Array.from(family.components).join(', ')}\n`;
            }
            if (family.ingredients.size > 0) {
                report += `- **Ingredients Required:** ${Array.from(family.ingredients).join(', ')}\n`;
            }

            // Check for faction-specific patterns
            const factionPatterns = {};
            family.variants.forEach(variant => {
                const factionInfo = getFactionSpecificity({ name: variant.OutputName || variant.outputName || variant.name });
                if (factionInfo) {
                    if (!factionPatterns[factionInfo.faction]) {
                        factionPatterns[factionInfo.faction] = [];
                    }
                    factionPatterns[factionInfo.faction].push(variant);
                }
            });

            if (Object.keys(factionPatterns).length > 0) {
                report += `- **Faction Specializations:**\n`;
                Object.entries(factionPatterns).forEach(([faction, variants]) => {
                    const themes = {
                        'MUD': 'Firepower/Distance',
                        'ONI': 'Science/Stealth',
                        'USTUR': 'Defense/Evasion'
                    };
                    report += `  - **${faction}** (${themes[faction]}): ${variants.length} variants\n`;
                });
            }

            report += `\n`;
        });

        // Balancing Opportunities
        report += `## ⚖️ Balancing Opportunities\n\n`;

        // High-usage resources that could share load
        const overUtilized = [];
        ['raw', 'components', 'ingredients'].forEach(category => {
            if (usageAnalysis[category]) {
                Array.from(usageAnalysis[category].values()).forEach(resource => {
                    if (resource.usageCount > 20) {
                        overUtilized.push({ ...resource, category });
                    }
                });
            }
        });

        overUtilized.sort((a, b) => b.usageCount - a.usageCount).slice(0, 15).forEach(resource => {
            report += `### ${resource.name} (${resource.usageCount} uses)\n`;
            report += `**Category:** ${resource.category} | **Tier:** T${resource.tier} | **Type:** ${resource.type}\n\n`;

            // Find under-utilized alternatives
            const alternatives = [];
            ['raw', 'components', 'ingredients'].forEach(cat => {
                if (usageAnalysis[cat]) {
                    Array.from(usageAnalysis[cat].values()).forEach(alt => {
                        if (alt.name !== resource.name &&
                            alt.tier === resource.tier &&
                            alt.type === resource.type &&
                            alt.usageCount < 5) {
                            alternatives.push(alt);
                        }
                    });
                }
            });

            if (alternatives.length > 0) {
                report += `**Recommended Load Distribution:**\n`;
                alternatives.slice(0, 3).forEach(alt => {
                    const suggestedTransfer = Math.min(8, Math.floor(resource.usageCount * 0.15));
                    report += `- Transfer ~${suggestedTransfer} uses to **${alt.name}** (currently ${alt.usageCount} uses)\n`;
                });
            }

            report += `\n`;
        });

        // Faction-Specific Recommendations
        report += `## 🎖️ Faction-Specific Resource Optimization\n\n`;

        const factionSpecific = {};
        allRecipes.forEach(recipe => {
            const outputName = recipe.OutputName || recipe.outputName || recipe.name;
            const factionsField = recipe.Factions || recipe.factions || '';
            const factionsString = typeof factionsField === 'string' ? factionsField : String(factionsField || '');
            const factions = factionsString.split(';').filter(f => f.trim());
            if (factions.length === 1) {
                const faction = factions[0].trim();
                if (!factionSpecific[faction]) {
                    factionSpecific[faction] = [];
                }
                factionSpecific[faction].push(recipe);
            }
        });

        Object.entries(factionSpecific).forEach(([faction, recipes]) => {
            const themes = {
                'MUD': 'Firepower/Distance - Long-range weapons, high-damage systems',
                'ONI': 'Science/Stealth - Advanced sensors, cloaking, research equipment',
                'USTUR': 'Defense/Evasion - Armor, shields, mobility systems'
            };

            report += `### ${faction} Faction (${themes[faction]})\n`;
            report += `**Exclusive Resources:** ${recipes.length}\n\n`;

            // Group by component families
            const familyGroups = {};
            recipes.forEach(recipe => {
                let baseName = recipe.OutputName || recipe.outputName || recipe.name;
                baseName = baseName.replace(/\b(XXS|XS|S|M|L|XL|XXL|CAP|CMD|CLASS\d+|TTN)\b/gi, '').trim();
                baseName = baseName.replace(/\bT[1-5]\b/gi, '').trim();
                baseName = baseName.replace(/\s+/g, ' ').trim();

                if (!familyGroups[baseName]) {
                    familyGroups[baseName] = [];
                }
                familyGroups[baseName].push(recipe);
            });

            Object.entries(familyGroups).slice(0, 10).forEach(([familyName, familyRecipes]) => {
                if (familyRecipes.length > 1) {
                    const tiers = [...new Set(familyRecipes.map(r => r.OutputTier || r.outputTier || r.tier))].sort();
                    report += `- **${familyName}:** ${familyRecipes.length} variants (T${tiers.join(', T')})\n`;
                }
            });

            report += `\n`;
        });

        // Comprehensive Substitution Pool Analysis
        report += `## 🔄 Substitution Pool Analysis\n\n`;
        report += `Analysis of resource groups that can substitute for each other, showing distribution opportunities:\n\n`;

        ['raw', 'components', 'ingredients'].forEach(category => {
            const pools = generateSubstitutePools(category);
            if (pools.length === 0) return;

            report += `### ${category.toUpperCase()} SUBSTITUTION POOLS\n\n`;

            pools.sort((a, b) => b.totalUsage - a.totalUsage).forEach(pool => {
                report += `#### ${pool.name}\n`;
                report += `- **Pool Size:** ${pool.resources.length} resources\n`;
                report += `- **Total Usage:** ${pool.totalUsage} across all pool members\n`;
                report += `- **Average Usage:** ${pool.averageUsage.toFixed(1)} per resource\n\n`;

                // Sort resources by usage to show distribution opportunities
                const sortedResources = pool.resources.sort((a, b) => b.usageCount - a.usageCount);
                const overUtilizedInPool = sortedResources.filter(r => r.usageCount > pool.averageUsage * 1.5);
                const underUtilizedInPool = sortedResources.filter(r => r.usageCount < pool.averageUsage * 0.5);
                const unusedInPool = sortedResources.filter(r => r.usageCount === 0);

                report += `**Current Usage Distribution:**\n`;
                sortedResources.forEach(resource => {
                    const flagIcon = resource.isManuallyFlagged ? ' 🎯' : '';
                    const completedIcon = resource.isCompleted ? ' ✅' : '';
                    report += `- **${resource.name}**${flagIcon}${completedIcon}: ${resource.usageCount} uses`;

                    if (resource.usageCount > pool.averageUsage * 1.5) {
                        report += ` (OVER-UTILIZED)`;
                    } else if (resource.usageCount === 0) {
                        report += ` (UNUSED)`;
                    } else if (resource.usageCount < pool.averageUsage * 0.5) {
                        report += ` (UNDER-UTILIZED)`;
                    }
                    report += `\n`;
                });

                // Specific redistribution recommendations
                if (overUtilizedInPool.length > 0 && (underUtilizedInPool.length > 0 || unusedInPool.length > 0)) {
                    report += `\n**Redistribution Opportunities:**\n`;

                    overUtilizedInPool.forEach(overUsed => {
                        const availableTargets = [...unusedInPool, ...underUtilizedInPool].filter(t => t.name !== overUsed.name);
                        if (availableTargets.length > 0) {
                            const excessUsage = overUsed.usageCount - Math.ceil(pool.averageUsage);
                            const transferPerTarget = Math.ceil(excessUsage / availableTargets.length);

                            report += `- **${overUsed.name}** (${overUsed.usageCount} uses) can transfer to:\n`;
                            availableTargets.slice(0, 3).forEach(target => {
                                const suggestedTransfer = Math.min(transferPerTarget, Math.max(1, Math.floor(overUsed.usageCount * 0.2)));
                                report += `  - **${target.name}** (${target.usageCount} → ${target.usageCount + suggestedTransfer} uses) - Transfer ${suggestedTransfer} recipes\n`;
                            });
                        }
                    });
                }

                // Show specific recipes for top resources
                if (sortedResources.length > 0 && sortedResources[0].usedInRecipes && sortedResources[0].usedInRecipes.length > 0) {
                    report += `\n**Example Recipes Using ${sortedResources[0].name}:**\n`;
                    sortedResources[0].usedInRecipes.slice(0, 5).forEach(usage => {
                        report += `- ${usage.recipeName} (${usage.recipeType}) - Slot ${usage.slot} (x${usage.quantity})\n`;
                    });
                    if (sortedResources[0].usedInRecipes.length > 5) {
                        report += `- *...and ${sortedResources[0].usedInRecipes.length - 5} more recipes*\n`;
                    }
                }

                report += `\n`;
            });
        });

        // Detailed Production Chain Visibility
        report += `## 🏗️ Production Chain Impact Analysis\n\n`;
        report += `Detailed view of how resource changes affect production chains:\n\n`;

        // Focus on the most critical production chains
        const criticalChains = productionChains.filter(family =>
            family.totalUsageCount > 50 || family.variants.length > 5
        ).sort((a, b) => b.totalUsageCount - a.totalUsageCount).slice(0, 15);

        criticalChains.forEach(family => {
            report += `### ${family.baseName} Production Chain\n`;
            report += `- **Impact Scale:** ${family.totalUsageCount} total resource uses across ${family.variants.length} variants\n`;
            report += `- **Tier Range:** T${Math.min(...family.tiers)} to T${Math.max(...family.tiers)}\n`;
            report += `- **Output Types:** ${Array.from(family.outputTypes).join(', ')}\n`;

            // Show resource dependencies with substitution opportunities
            if (family.rawResources.size > 0) {
                report += `\n**Raw Resource Dependencies:**\n`;
                Array.from(family.rawResources).forEach(rawName => {
                    const rawResource = usageAnalysis.raw?.get(rawName);
                    if (rawResource) {
                        report += `- **${rawName}**: ${rawResource.usageCount} total uses`;

                        // Find substitutes in the same pool
                        const rawPools = generateSubstitutePools('raw');
                        const containingPool = rawPools.find(pool =>
                            pool.resources.some(r => r.name === rawName)
                        );

                        if (containingPool) {
                            const alternativesInPool = containingPool.resources.filter(r =>
                                r.name !== rawName && r.usageCount < rawResource.usageCount
                            );
                            if (alternativesInPool.length > 0) {
                                const bestAlternative = alternativesInPool.reduce((best, current) =>
                                    current.usageCount < best.usageCount ? current : best
                                );
                                report += ` → Can substitute with **${bestAlternative.name}** (${bestAlternative.usageCount} uses)`;
                            }
                        }
                        report += `\n`;
                    }
                });
            }

            if (family.components.size > 0) {
                report += `\n**Component Dependencies:**\n`;
                Array.from(family.components).forEach(compName => {
                    const compResource = usageAnalysis.components?.get(compName);
                    if (compResource) {
                        report += `- **${compName}**: ${compResource.usageCount} total uses`;

                        // Find substitutes in the same pool
                        const compPools = generateSubstitutePools('components');
                        const containingPool = compPools.find(pool =>
                            pool.resources.some(r => r.name === compName)
                        );

                        if (containingPool) {
                            const alternativesInPool = containingPool.resources.filter(r =>
                                r.name !== compName && r.usageCount < compResource.usageCount
                            );
                            if (alternativesInPool.length > 0) {
                                const bestAlternative = alternativesInPool.reduce((best, current) =>
                                    current.usageCount < best.usageCount ? current : best
                                );
                                report += ` → Can substitute with **${bestAlternative.name}** (${bestAlternative.usageCount} uses)`;
                            }
                        }
                        report += `\n`;
                    }
                });
            }

            if (family.ingredients.size > 0) {
                report += `\n**Ingredient Dependencies:**\n`;
                Array.from(family.ingredients).forEach(ingName => {
                    const ingResource = usageAnalysis.ingredients?.get(ingName);
                    if (ingResource) {
                        report += `- **${ingName}**: ${ingResource.usageCount} total uses`;

                        // Find substitutes in the same pool
                        const ingPools = generateSubstitutePools('ingredients');
                        const containingPool = ingPools.find(pool =>
                            pool.resources.some(r => r.name === ingName)
                        );

                        if (containingPool) {
                            const alternativesInPool = containingPool.resources.filter(r =>
                                r.name !== ingName && r.usageCount < ingResource.usageCount
                            );
                            if (alternativesInPool.length > 0) {
                                const bestAlternative = alternativesInPool.reduce((best, current) =>
                                    current.usageCount < best.usageCount ? current : best
                                );
                                report += ` → Can substitute with **${bestAlternative.name}** (${bestAlternative.usageCount} uses)`;
                            }
                        }
                        report += `\n`;
                    }
                });
            }

            report += `\n`;
        });

        // Action Items
        report += `## 📋 Recommended Action Items\n\n`;
        report += `### Immediate Actions (High Priority)\n`;
        flaggedResources.filter(r => r.usageCount === 0).forEach(resource => {
            report += `- [ ] **${resource.name}** - Currently unused, needs integration into production chains\n`;
        });

        report += `\n### Medium-Term Balancing (Normal Priority)\n`;
        flaggedResources.filter(r => r.usageCount > 0 && r.usageCount < 3).forEach(resource => {
            report += `- [ ] **${resource.name}** - Low usage (${resource.usageCount}), consider substituting in compatible recipes\n`;
        });

        report += `\n### Resource Distribution Optimization\n`;
        overUtilized.slice(0, 5).forEach(resource => {
            report += `- [ ] **${resource.name}** - Overutilized (${resource.usageCount} uses), distribute load to similar resources\n`;
        });

        // Pool-specific action items
        report += `\n### Substitution Pool Balancing\n`;
        ['raw', 'components', 'ingredients'].forEach(category => {
            const pools = generateSubstitutePools(category);
            pools.forEach(pool => {
                const sortedResources = pool.resources.sort((a, b) => b.usageCount - a.usageCount);
                const overUtilized = sortedResources.filter(r => r.usageCount > pool.averageUsage * 1.5);
                const unused = sortedResources.filter(r => r.usageCount === 0);

                if (overUtilized.length > 0 && unused.length > 0) {
                    report += `- [ ] **${pool.name}**: Transfer usage from ${overUtilized[0].name} (${overUtilized[0].usageCount}) to unused alternatives: ${unused.map(r => r.name).join(', ')}\n`;
                }
            });
        });

        report += `\n---\n*Report generated by Resource Balancer v1.0*\n`;

        // Export the report
        const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `resource-balancing-report-${new Date().toISOString().split('T')[0]}.md`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Exported comprehensive balancing report');
    };

    // Export functionality with NEEDS_USAGE_INCREASE column
    const exportBalancedCSV = () => {
        const csvHeaders = [
            'OutputID', 'OutputName', 'OutputType', 'OutputTier', 'ConstructionTime',
            'PlanetTypes', 'Factions', 'ResourceType', 'FunctionalPurpose', 'UsageCategory',
            'Ingredient1', 'Quantity1', 'Ingredient2', 'Quantity2', 'Ingredient3', 'Quantity3',
            'Ingredient4', 'Quantity4', 'Ingredient5', 'Quantity5', 'Ingredient6', 'Quantity6',
            'Ingredient7', 'Quantity7', 'Ingredient8', 'Quantity8', 'Ingredient9', 'Quantity9',
            'CompletionStatus', 'InternalRecipeID', 'ProductionSteps', 'NOT_USED', 'NEEDS_USAGE_INCREASE'
        ];

        const csvRows = allRecipes.map(recipe => {
            const resourceName = recipe.OutputName;
            const categoryData = Object.values(usageAnalysis).find(map => map.has(resourceName));
            const usageData = categoryData?.get(resourceName);

            // Export NEEDS_USAGE_INCREASE based on manual flagging
            let needsIncrease = 'FALSE';
            if (usageData && usageData.isManuallyFlagged && !usageData.isCompleted) {
                needsIncrease = 'TRUE';
            }

            return csvHeaders.map(header => {
                if (header === 'NEEDS_USAGE_INCREASE') {
                    return needsIncrease;
                }
                return recipe[header] || '';
            }).map(value => `"${value}"`).join(',');
        });

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'balanced_recipes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Exported balanced CSV with manual usage analysis');
    };

    // Calculate total EFFECT of a resource throughout the entire production chain
    const calculateResourceEffect = (resource) => {
        const effectChain = [];
        const processedPaths = new Set(); // Track unique recipe-depth combinations to avoid duplicates
        let totalUpstreamEffect = 0;

        const analyzeUpstreamChain = (resourceName, depth = 0, pathHistory = []) => {
            // Prevent infinite loops by checking path history
            if (depth > 15 || pathHistory.includes(resourceName)) {
                return;
            }

            const currentPath = [...pathHistory, resourceName];

            // Find all recipes that use this resource
            const recipesUsingResource = allRecipes.filter(recipe => {
                // Check if ingredients is an array or object
                if (Array.isArray(recipe.ingredients)) {
                    return recipe.ingredients.some(ing => {
                        if (typeof ing === 'object' && ing.name) {
                            return ing.name === resourceName;
                        }
                        return ing === resourceName;
                    });
                } else if (typeof recipe.ingredients === 'object' && recipe.ingredients) {
                    return Object.values(recipe.ingredients).includes(resourceName);
                } else if (typeof recipe.ingredients === 'string') {
                    return recipe.ingredients.includes(resourceName);
                }

                // Fallback: check individual ingredient fields
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`] || recipe[`ingredient${i}`];
                    if (ingredient === resourceName) {
                        return true;
                    }
                }
                return false;
            });

            console.log(`At depth ${depth}, looking for recipes using "${resourceName}". Found ${recipesUsingResource.length} recipes.`);
            if (recipesUsingResource.length > 0) {
                console.log(`Recipes using ${resourceName}:`, recipesUsingResource.slice(0, 5).map(r => r.outputName || r.OutputName));
            }

            // Process each recipe that uses this resource
            recipesUsingResource.forEach(recipe => {
                const recipeName = recipe.outputName || recipe.OutputName;
                if (!recipeName) {
                    console.warn(`Recipe missing outputName:`, recipe);
                    return;
                }

                const pathKey = `${recipeName}-${depth}`;

                // Only count each recipe once per depth level to avoid duplicates
                if (!processedPaths.has(pathKey)) {
                    processedPaths.add(pathKey);
                    totalUpstreamEffect++;

                    effectChain.push({
                        recipeName: recipeName,
                        recipeType: recipe.outputType || recipe.OutputType,
                        usedResource: resourceName,
                        depth: depth,
                        pathToRoot: [...currentPath],
                        effectType: depth === 0 ? 'DIRECT' : `UPSTREAM_LEVEL_${depth}`
                    });

                    console.log(`${resource.name} effect chain: ${recipeName} at depth ${depth} (path: ${currentPath.join(' → ')})`);
                }

                // Recursively analyze what uses this recipe's output
                analyzeUpstreamChain(recipeName, depth + 1, currentPath);
            });
        };

        // Start analysis from the resource
        console.log(`=== Calculating effect for ${resource.name} ===`);

        // Debug: Show the structure of allRecipes
        if (allRecipes.length > 0) {
            console.log(`Total recipes available: ${allRecipes.length}`);
            console.log(`Sample recipe structure:`, Object.keys(allRecipes[0]));

            // Debug: Let's see how ingredients are structured
            const sampleRecipe = allRecipes[0];
            console.log(`Sample recipe:`, sampleRecipe);
            console.log(`Sample ingredients:`, sampleRecipe.ingredients);

            // Find a recipe that uses our resource to debug field names
            const testRecipe = allRecipes.find(recipe => {
                // Check if ingredients is an array or object
                if (Array.isArray(recipe.ingredients)) {
                    return recipe.ingredients.some(ing => ing.name === resource.name || ing === resource.name);
                } else if (typeof recipe.ingredients === 'object' && recipe.ingredients) {
                    return Object.values(recipe.ingredients).includes(resource.name);
                } else if (typeof recipe.ingredients === 'string') {
                    return recipe.ingredients.includes(resource.name);
                }

                // Fallback: check individual ingredient fields
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`] || recipe[`ingredient${i}`];
                    if (ingredient === resource.name) {
                        return true;
                    }
                }
                return false;
            });

            if (testRecipe) {
                console.log(`Found test recipe using ${resource.name}:`, testRecipe);
            } else {
                console.log(`No recipes found using ${resource.name} directly`);
            }
        }

        analyzeUpstreamChain(resource.name);

        // Also calculate downstream/refinement usage (original logic)
        const downstreamAnalysis = calculateDownstreamUsage(resource);

        const finalTotalEffect = resource.usageCount + downstreamAnalysis.downstreamUsage + totalUpstreamEffect;

        console.log(`${resource.name} effect breakdown:`);
        console.log(`- Direct: ${resource.usageCount}`);
        console.log(`- Downstream: ${downstreamAnalysis.downstreamUsage}`);
        console.log(`- Upstream: ${totalUpstreamEffect}`);
        console.log(`- Total Effect: ${finalTotalEffect}`);

        return {
            directUsage: resource.usageCount,
            downstreamUsage: downstreamAnalysis.downstreamUsage,
            upstreamEffect: totalUpstreamEffect,
            totalEffect: finalTotalEffect,
            effectChain: effectChain,
            downstreamChain: downstreamAnalysis.downstreamChain,
            effectMetrics: {
                directRecipes: resource.usageCount,
                downstreamRecipes: downstreamAnalysis.downstreamUsage,
                upstreamRecipes: totalUpstreamEffect,
                totalRecipesAffected: finalTotalEffect,
                effectMultiplier: totalUpstreamEffect > 0 ? (totalUpstreamEffect / Math.max(resource.usageCount, 1)).toFixed(2) : '0'
            }
        };
    };

    // Calculate downstream usage for raw resources (handles refinement chains) - simplified version
    const calculateDownstreamUsage = (resource) => {
        const visited = new Set();
        let totalDownstreamUsage = 0;
        const downstreamRecipes = [];

        const analyzeRefinement = (resourceName, depth = 0) => {
            if (visited.has(resourceName) || depth > 10) return;
            visited.add(resourceName);

            // Find direct refinement recipes (1-to-1 transformations)
            const refinementRecipes = allRecipes.filter(recipe => {
                const ingredients = [];
                for (let i = 1; i <= 9; i++) {
                    const ingredient = recipe[`Ingredient${i}`];
                    if (ingredient) ingredients.push(ingredient);
                }
                return ingredients.length === 1 && ingredients[0] === resourceName;
            });

            refinementRecipes.forEach(recipe => {
                const outputName = recipe.OutputName || recipe.name;

                // Find all recipes that use this refined product
                allRecipes.forEach(downstreamRecipe => {
                    for (let i = 1; i <= 9; i++) {
                        const ingredient = downstreamRecipe[`Ingredient${i}`];
                        if (ingredient === outputName) {
                            totalDownstreamUsage++;
                            downstreamRecipes.push({
                                recipeName: downstreamRecipe.OutputName || downstreamRecipe.name,
                                recipeType: downstreamRecipe.OutputType,
                                intermediateProduct: outputName,
                                depth: depth + 1
                            });
                        }
                    }
                });

                // Recursively analyze further refinements
                analyzeRefinement(outputName, depth + 1);
            });
        };

        analyzeRefinement(resource.name);

        return {
            downstreamUsage: totalDownstreamUsage,
            downstreamChain: downstreamRecipes
        };
    };

    // Background queue management
    const getAllAvailableResources = () => {
        const allResources = [];
        Object.keys(usageAnalysis).forEach(category => {
            if (usageAnalysis[category] && typeof usageAnalysis[category].values === 'function') {
                allResources.push(...Array.from(usageAnalysis[category].values()));
            }
        });
        return allResources;
    };

    const addToCalculationQueue = (resourceName, priority = 'normal') => {
        // Check if already calculated or in queue
        if (calculatedEffects.has(resourceName)) {
            console.log(`${resourceName} already calculated, skipping queue`);
            return;
        }

        setCalculationQueue(prevQueue => {
            const alreadyInQueue = prevQueue.some(item => item.resourceName === resourceName);
            if (alreadyInQueue) {
                console.log(`${resourceName} already in queue`);
                return prevQueue;
            }

            const newItem = { resourceName, priority, addedAt: Date.now() };

            // Add high priority items to front, normal to back
            if (priority === 'high') {
                return [newItem, ...prevQueue];
            } else {
                return [...prevQueue, newItem];
            }
        });
    };

    const initializeAutoCalculationQueue = () => {
        if (!autoCalculationEnabled) return;

        console.log('🚀 Initializing auto-calculation queue...');
        const allResources = getAllAvailableResources();

        // Add all resources to queue (they'll be filtered for duplicates)
        allResources.forEach(resource => {
            addToCalculationQueue(resource.name, 'normal');
        });

        console.log(`📋 Added ${allResources.length} resources to calculation queue`);
    };

    // Simple fallback calculation for resources that timeout
    const calculateSimpleEffect = (resource) => {
        return {
            directUsage: resource.usageCount,
            downstreamUsage: 0,
            upstreamEffect: Math.min(resource.usageCount * 2, 50), // Simple heuristic
            totalEffect: resource.usageCount + Math.min(resource.usageCount * 2, 50),
            effectChain: [],
            downstreamChain: [],
            effectMetrics: {
                directRecipes: resource.usageCount,
                downstreamRecipes: 0,
                upstreamRecipes: Math.min(resource.usageCount * 2, 50),
                totalRecipesAffected: resource.usageCount + Math.min(resource.usageCount * 2, 50),
                effectMultiplier: resource.usageCount > 0 ? '2.0' : '0'
            }
        };
    };

    // Async effect calculation with timeout protection
    const calculateResourceEffectAsync = async (resource, timeoutMs = 5000) => {
        console.log(`🧮 Calculating effect for ${resource.name}...`);

        return new Promise(async (resolve, reject) => {
            // Set up timeout
            const timeoutId = setTimeout(() => {
                console.warn(`⏰ Timeout calculating ${resource.name} after ${timeoutMs}ms`);
                reject(new Error(`Calculation timeout for ${resource.name}`));
            }, timeoutMs);

            try {
                let totalUpstreamEffect = 0;
                const effectChain = [];
                const processedPaths = new Set();
                let iterationCount = 0;
                const maxIterations = 10000; // Prevent infinite loops

                const analyzeUpstreamChainAsync = async (resourceName, depth = 0, pathHistory = []) => {
                    // Check iteration limit
                    iterationCount++;
                    if (iterationCount > maxIterations) {
                        console.warn(`🛑 Max iterations reached for ${resource.name}`);
                        return;
                    }

                    // Yield to UI every 50 iterations
                    if (iterationCount % 50 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }

                    // Prevent infinite loops with stricter limits
                    if (depth > 10 || pathHistory.includes(resourceName)) {
                        return;
                    }

                    const currentPath = [...pathHistory, resourceName];

                    // Find all recipes that use this resource - exactly like usageCount calculation
                    const recipesUsingResource = [];
                    for (const recipe of allRecipes) {
                        let found = false;

                        // Handle both new and old ingredient formats (same as usageCount calculation)
                        const ingredientsToCheck = [];

                        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                            // New format: ingredients array
                            recipe.ingredients.forEach(ing => {
                                if (ing && ing.name) {
                                    ingredientsToCheck.push(ing.name.trim());
                                }
                            });
                        } else {
                            // Old format: Ingredient1, Ingredient2, etc.
                            for (let i = 1; i <= 9; i++) {
                                const ingredient = recipe[`Ingredient${i}`];
                                if (ingredient && ingredient.trim()) {
                                    ingredientsToCheck.push(ingredient.trim());
                                }
                            }
                        }

                        // Check if our resource is in the ingredients
                        if (ingredientsToCheck.includes(resourceName)) {
                            recipesUsingResource.push(recipe);
                            found = true;
                        }
                    }

                    // Process each recipe that uses this resource
                    for (const recipe of recipesUsingResource) {
                        const recipeName = recipe.outputName || recipe.OutputName;
                        const recipeOutputType = (recipe.outputType || recipe.OutputType || '').toUpperCase();

                        if (!recipeName) continue;

                        const pathKey = `${recipeName}-${depth}`;

                        // Only count each recipe once per depth level to avoid duplicates
                        if (!processedPaths.has(pathKey)) {
                            processedPaths.add(pathKey);
                            totalUpstreamEffect++;

                            effectChain.push({
                                recipeName: recipeName,
                                recipeType: recipeOutputType,
                                usedResource: resourceName,
                                depth: depth,
                                pathToRoot: [...currentPath],
                                effectType: depth === 0 ? 'DIRECT' : `UPSTREAM_LEVEL_${depth}`
                            });
                        }

                        // Only continue recursively if this recipe produces a COMPONENT or INGREDIENT
                        // Stop at final products like SHIP_COMPONENTS, BUILDINGS, etc.
                        if (depth < 8 && (recipeOutputType === 'COMPONENT' || recipeOutputType === 'INGREDIENT')) {
                            await analyzeUpstreamChainAsync(recipeName, depth + 1, currentPath);
                        }
                    }
                };

                // Start analysis from the resource
                await analyzeUpstreamChainAsync(resource.name);

                // Simplified downstream analysis (with timeout protection)
                let downstreamUsage = 0;
                try {
                    const downstreamAnalysis = calculateDownstreamUsage(resource);
                    downstreamUsage = downstreamAnalysis.downstreamUsage || 0;
                } catch (error) {
                    console.warn(`⚠️ Downstream calculation failed for ${resource.name}:`, error);
                    downstreamUsage = 0;
                }

                const finalTotalEffect = resource.usageCount + downstreamUsage + totalUpstreamEffect;

                console.log(`✅ ${resource.name} effect: Direct=${resource.usageCount}, Downstream=${downstreamUsage}, Upstream=${totalUpstreamEffect}, Total=${finalTotalEffect} (${iterationCount} iterations)`);

                const result = {
                    directUsage: resource.usageCount,
                    downstreamUsage: downstreamUsage,
                    upstreamEffect: totalUpstreamEffect,
                    totalEffect: finalTotalEffect,
                    effectChain: effectChain.slice(0, 1000), // Limit chain size
                    downstreamChain: [],
                    effectMetrics: {
                        directRecipes: resource.usageCount,
                        downstreamRecipes: downstreamUsage,
                        upstreamRecipes: totalUpstreamEffect,
                        totalRecipesAffected: finalTotalEffect,
                        effectMultiplier: totalUpstreamEffect > 0 ? (totalUpstreamEffect / Math.max(resource.usageCount, 1)).toFixed(2) : '0'
                    }
                };

                clearTimeout(timeoutId);
                resolve(result);

            } catch (error) {
                clearTimeout(timeoutId);
                console.error(`❌ Error calculating ${resource.name}:`, error);
                reject(error);
            }
        });
    };

    // Background queue worker - processes one item at a time
    const processCalculationQueue = async () => {
        if (queueProcessing) {
            console.log('⏭️ Queue processing already active');
            return;
        }

        console.log(`🔄 Starting queue processing... ${calculationQueue.length} items remaining`);
        setQueueProcessing(true);
    };

    // Process queue items automatically when queue changes and processing is enabled
    useEffect(() => {
        // Only process if we have items, processing is enabled, and we're not already processing
        if (calculationQueue.length === 0 || !queueProcessing || calculatingEffects.size > 0) {
            return;
        }

        const processOneItem = async () => {
            const queueItem = calculationQueue[0];
            if (!queueItem) {
                console.log('✅ Queue empty, stopping processing');
                setQueueProcessing(false);
                setQueueProgress(prev => ({ ...prev, current: null }));
                return;
            }

            const { resourceName } = queueItem;
            console.log(`🔄 Processing ${resourceName} (${calculationQueue.length} remaining)`);

            // Update progress
            setQueueProgress(prev => ({
                ...prev,
                current: resourceName,
                completed: prev.total - calculationQueue.length
            }));

            // Skip if already calculated
            if (calculatedEffects.has(resourceName)) {
                console.log(`⏭️ Skipping ${resourceName} (already calculated)`);
                setCalculationQueue(prev => prev.slice(1));
                return;
            }

            // Find the resource
            const allResources = getAllAvailableResources();
            const resource = allResources.find(r => r.name.toLowerCase() === resourceName.toLowerCase());

            if (!resource) {
                console.warn(`⚠️ Resource ${resourceName} not found, removing from queue`);
                setCalculationQueue(prev => prev.slice(1));
                return;
            }

            try {
                // Mark as calculating
                setCalculatingEffects(prev => new Set([...prev, resourceName]));

                // Calculate effect with timeout
                const effect = await calculateResourceEffectAsync(resource, 15000);

                // Store result
                setCalculatedEffects(prev => new Map(prev).set(resourceName, effect));
                console.log(`✅ Queue: Completed ${resourceName} (effect: ${effect.totalEffect})`);

            } catch (error) {
                console.error(`❌ Error calculating ${resourceName}:`, error);

                // Use simple fallback calculation for failed resources
                const fallbackResult = calculateSimpleEffect(resource);
                console.log(`🔄 Using fallback calculation for ${resourceName}: ${fallbackResult.totalEffect}`);

                setCalculatedEffects(prev => new Map(prev).set(resourceName, fallbackResult));
            }

            // Remove from calculating set and queue
            setCalculatingEffects(prev => {
                const newSet = new Set(prev);
                newSet.delete(resourceName);
                return newSet;
            });
            setCalculationQueue(prev => prev.slice(1));
        };

        // Process one item
        processOneItem();

    }, [calculationQueue, queueProcessing, calculatingEffects.size, calculatedEffects]); // Re-run when queue changes

    // Calculate effect for a single resource on-demand (now uses queue)
    const calculateSingleResourceEffect = async (resourceName) => {
        console.log(`🎯 Manual calculation request for: "${resourceName}"`);

        // Check if already calculated
        if (calculatedEffects.has(resourceName)) {
            console.log(`Effect already calculated for ${resourceName}:`, calculatedEffects.get(resourceName));
            return calculatedEffects.get(resourceName);
        }

        // Add to queue with high priority
        addToCalculationQueue(resourceName, 'high');

        // Start processing if not already running
        if (!queueProcessing) {
            processCalculationQueue();
        }

        return null; // Will be calculated in background
    };

    // Calculate effects for all resources in a pool on-demand (now uses queue)
    const calculatePoolEffects = async (poolName) => {
        console.log(`🎯 Pool calculation request for: "${poolName}"`);
        const pools = generateSubstitutePools(activeTab);

        const pool = pools.find(p => p.name.toLowerCase() === poolName.toLowerCase());
        if (!pool) {
            console.error(`Pool "${poolName}" not found`);
            return null;
        }

        console.log(`Adding ${pool.resources.length} pool resources to queue with high priority`);

        // Add all pool resources to queue with high priority
        pool.resources.forEach(resource => {
            addToCalculationQueue(resource.name, 'high');
        });

        // Start processing if not already running
        if (!queueProcessing) {
            processCalculationQueue();
        }

        return null; // Will be calculated in background
    };

    // Detailed substitute pool analysis (with optional effect calculation)
    const analyzeSubstitutePool = (pool, includeEffects = false) => {
        const poolAnalysis = {
            poolInfo: {
                name: pool.name,
                tierGroup: pool.tierGroup,
                resourceType: pool.resourceType,
                usageCategory: pool.usageCategory,
                totalResources: pool.resources.length,
                averageUsage: pool.averageUsage,
                totalUsage: pool.totalUsage
            },
            resourceAnalysis: [],
            utilizationGaps: [],
            balancingOpportunities: [],
            criticalInsights: []
        };

        // Analyze each resource in the pool
        pool.resources.forEach(resource => {
            // Use cached effect if available, otherwise use basic metrics
            const effectAnalysis = includeEffects && calculatedEffects.has(resource.name) ?
                calculatedEffects.get(resource.name) : {
                    directUsage: resource.usageCount,
                    downstreamUsage: 0,
                    upstreamEffect: 0,
                    totalEffect: resource.usageCount,
                    effectChain: [],
                    downstreamChain: [],
                    effectMetrics: {
                        directRecipes: resource.usageCount,
                        downstreamRecipes: 0,
                        upstreamRecipes: 0,
                        totalRecipesAffected: resource.usageCount,
                        effectMultiplier: '0'
                    }
                };
            const resourceData = {
                name: resource.name,
                tier: resource.tier,
                directUsage: resource.usageCount,
                downstreamUsage: effectAnalysis.downstreamUsage,
                upstreamEffect: effectAnalysis.upstreamEffect,
                totalEffect: effectAnalysis.totalEffect,
                effectMultiplier: effectAnalysis.effectMetrics.effectMultiplier,
                utilizationRatio: effectAnalysis.totalEffect / (pool.averageUsage || 1),
                isManuallyFlagged: resource.isManuallyFlagged || false,
                isCompleted: resource.isCompleted || false,
                status: resource.usageCount === 0 ? 'UNUSED' :
                    effectAnalysis.totalEffect < pool.averageUsage * 0.5 ? 'UNDER_UTILIZED' :
                        effectAnalysis.totalEffect > pool.averageUsage * 1.5 ? 'OVER_UTILIZED' :
                            'BALANCED',
                usedInRecipes: resource.usedInRecipes || [],
                downstreamChain: effectAnalysis.downstreamChain,
                effectChain: effectAnalysis.effectChain,
                effectMetrics: effectAnalysis.effectMetrics
            };

            poolAnalysis.resourceAnalysis.push(resourceData);

            // Identify gaps and opportunities
            if (resourceData.status === 'UNUSED') {
                poolAnalysis.utilizationGaps.push({
                    type: 'UNUSED_RESOURCE',
                    resource: resource.name,
                    description: `${resource.name} is not used in any recipes`,
                    priority: 'HIGH'
                });
            } else if (resourceData.status === 'UNDER_UTILIZED') {
                poolAnalysis.utilizationGaps.push({
                    type: 'UNDER_UTILIZED',
                    resource: resource.name,
                    currentUsage: resourceData.totalEffect,
                    expectedUsage: Math.round(pool.averageUsage),
                    description: `${resource.name} has low total effect (${resourceData.totalEffect} vs avg ${Math.round(pool.averageUsage)})`,
                    priority: 'MEDIUM'
                });
            }
        });

        // Find balancing opportunities
        const overUsed = poolAnalysis.resourceAnalysis.filter(r => r.status === 'OVER_UTILIZED');
        const underUsed = poolAnalysis.resourceAnalysis.filter(r => r.status === 'UNDER_UTILIZED' || r.status === 'UNUSED');

        overUsed.forEach(over => {
            underUsed.forEach(under => {
                if (isCompatibleTier(over.tier, under.tier)) {
                    poolAnalysis.balancingOpportunities.push({
                        from: over.name,
                        to: under.name,
                        fromEffect: over.totalEffect,
                        toEffect: under.totalEffect,
                        fromMultiplier: over.effectMultiplier,
                        toMultiplier: under.effectMultiplier,
                        potentialSwaps: Math.min(3, over.usedInRecipes.length),
                        description: `Move ${Math.min(3, over.usedInRecipes.length)} uses from ${over.name} (effect: ${over.totalEffect}) to ${under.name} (effect: ${under.totalEffect})`,
                        expectedBalance: Math.abs(over.totalEffect - under.totalEffect) / 2
                    });
                }
            });
        });

        // Generate critical insights
        const unusedCount = poolAnalysis.resourceAnalysis.filter(r => r.status === 'UNUSED').length;
        const flaggedCount = poolAnalysis.resourceAnalysis.filter(r => r.isManuallyFlagged).length;
        const completedCount = poolAnalysis.resourceAnalysis.filter(r => r.isCompleted).length;

        if (unusedCount > poolAnalysis.poolInfo.totalResources * 0.3) {
            poolAnalysis.criticalInsights.push({
                type: 'HIGH_UNUSED_RATE',
                severity: 'WARNING',
                message: `${unusedCount} of ${poolAnalysis.poolInfo.totalResources} resources (${Math.round(unusedCount / poolAnalysis.poolInfo.totalResources * 100)}%) are completely unused`
            });
        }

        if (poolAnalysis.balancingOpportunities.length > 0) {
            poolAnalysis.criticalInsights.push({
                type: 'BALANCING_OPPORTUNITIES',
                severity: 'INFO',
                message: `${poolAnalysis.balancingOpportunities.length} potential balancing opportunities identified`
            });
        }

        if (flaggedCount > 0) {
            poolAnalysis.criticalInsights.push({
                type: 'MANUAL_FLAGS',
                severity: 'ATTENTION',
                message: `${flaggedCount} resources manually flagged for attention`
            });
        }

        return poolAnalysis;
    };

    // Export substitute pool analysis
    const exportSubstitutePoolAnalysis = (pool, includeEffects = true) => {
        console.log(`Exporting pool analysis for ${pool.name} with effects: ${includeEffects}`);
        const analysis = analyzeSubstitutePool(pool, includeEffects);
        const timestamp = new Date().toISOString().split('T')[0];

        // Create comprehensive markdown content
        const sections = [];

        // Pool Summary Section
        sections.push('# 📊 Substitute Pool Analysis Report\n');
        sections.push(`**Pool Name:** ${analysis.poolInfo.name}`);
        sections.push(`**Tier Group:** ${analysis.poolInfo.tierGroup}`);
        sections.push(`**Resource Type:** ${analysis.poolInfo.resourceType}`);
        sections.push(`**Usage Category:** ${analysis.poolInfo.usageCategory}`);
        sections.push(`**Total Resources:** ${analysis.poolInfo.totalResources}`);
        sections.push(`**Average Usage:** ${Math.round(analysis.poolInfo.averageUsage)}`);
        sections.push(`**Total Pool Usage:** ${analysis.poolInfo.totalUsage}`);
        sections.push(`**Report Date:** ${timestamp}\n`);
        sections.push('---\n');

        // Critical Insights Section
        sections.push('## ⚠️ Critical Insights\n');
        if (analysis.criticalInsights.length > 0) {
            sections.push('| Severity | Type | Message |');
            sections.push('|----------|------|---------|');
            analysis.criticalInsights.forEach(insight => {
                const severity = insight.severity === 'HIGH' ? '🔴 HIGH' :
                    insight.severity === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
                sections.push(`| ${severity} | ${insight.type} | ${insight.message} |`);
            });
        } else {
            sections.push('*No critical insights identified for this pool.*');
        }
        sections.push('');

        // Resource Analysis Section
        sections.push('## 📈 Resource Usage Analysis\n');
        sections.push('| Resource Name | Tier | Direct Usage | Downstream Usage | Upstream Effect | Total Effect | Effect Multiplier | Utilization Ratio | Status | Flagged | Completed |');
        sections.push('|---------------|------|--------------|------------------|-----------------|--------------|-------------------|-------------------|--------|---------|-----------|');
        analysis.resourceAnalysis.forEach(resource => {
            const status = resource.status === 'COMPLETED' ? '✅ COMPLETED' :
                resource.status === 'FLAGGED' ? '⚠️ FLAGGED' : '⚪ NORMAL';
            const flagged = resource.isManuallyFlagged ? '✅' : '❌';
            const completed = resource.isCompleted ? '✅' : '❌';

            sections.push(`| ${resource.name} | ${resource.tier} | ${resource.directUsage} | ${resource.downstreamUsage} | ${resource.upstreamEffect} | ${resource.totalEffect} | ${resource.effectMultiplier} | ${resource.utilizationRatio.toFixed(2)} | ${status} | ${flagged} | ${completed} |`);
        });
        sections.push('');

        // Recipe Usage Details Section
        sections.push('## 🧪 Detailed Recipe Usage\n');
        sections.push('| Resource Name | Recipe Name | Recipe Type | Slot | Quantity | Usage Type |');
        sections.push('|---------------|-------------|-------------|------|----------|------------|');
        analysis.resourceAnalysis.forEach(resource => {
            if (resource.usedInRecipes.length > 0) {
                resource.usedInRecipes.forEach(usage => {
                    sections.push(`| ${resource.name} | ${usage.recipeName} | ${usage.recipeType || ''} | ${usage.slot || ''} | ${usage.quantity || 1} | 🎯 DIRECT |`);
                });
            }

            // Add downstream usage
            if (resource.downstreamChain.length > 0) {
                resource.downstreamChain.forEach(downstream => {
                    sections.push(`| ${resource.name} | ${downstream.recipeName} | ${downstream.recipeType || ''} | - | 1 | ⬇️ DOWNSTREAM VIA ${downstream.intermediateProduct} |`);
                });
            }

            if (resource.usedInRecipes.length === 0 && resource.downstreamChain.length === 0) {
                sections.push(`| ${resource.name} | UNUSED | - | - | 0 | ❌ NONE |`);
            }
        });
        sections.push('');

        // Effect Chain Analysis Section (Summarized - detailed chains removed for brevity)
        sections.push('## ⚡ Effect Summary\n');
        sections.push('*Summary of production chain effects (detailed chains removed for brevity)*\n');
        sections.push('| Resource Name | Total Recipes Affected | Maximum Chain Depth | Effect Categories |');
        sections.push('|---------------|------------------------|---------------------|-------------------|');
        analysis.resourceAnalysis.forEach(resource => {
            if (resource.effectChain && resource.effectChain.length > 0) {
                const uniqueEffectTypes = [...new Set(resource.effectChain.map(e => e.effectType))];
                const maxDepth = Math.max(...resource.effectChain.map(e => e.depth));
                sections.push(`| ${resource.name} | ${resource.effectChain.length} | ${maxDepth} | ${uniqueEffectTypes.join(', ')} |`);
            } else {
                sections.push(`| ${resource.name} | 0 | 0 | None |`);
            }
        });
        sections.push('');

        // Balancing Opportunities Section
        sections.push('## ⚖️ Balancing Opportunities\n');
        if (analysis.balancingOpportunities.length > 0) {
            sections.push('| From Resource | To Resource | From Effect | To Effect | From Multiplier | To Multiplier | Potential Swaps | Expected Balance | Description |');
            sections.push('|---------------|-------------|-------------|-----------|----------------|---------------|----------------|------------------|-------------|');
            analysis.balancingOpportunities.forEach(opportunity => {
                sections.push(`| ${opportunity.from} | ${opportunity.to} | ${opportunity.fromEffect} | ${opportunity.toEffect} | ${opportunity.fromMultiplier} | ${opportunity.toMultiplier} | ${opportunity.potentialSwaps} | ${Math.round(opportunity.expectedBalance)} | ${opportunity.description} |`);
            });
        } else {
            sections.push('*No balancing opportunities identified for this pool.*');
        }
        sections.push('');

        // Utilization Gaps Section
        sections.push('## 📊 Utilization Gaps\n');
        if (analysis.utilizationGaps.length > 0) {
            sections.push('| Type | Resource | Current Usage | Expected Usage | Priority | Description |');
            sections.push('|------|----------|---------------|----------------|----------|-------------|');
            analysis.utilizationGaps.forEach(gap => {
                const priority = gap.priority === 'HIGH' ? '🔴 HIGH' :
                    gap.priority === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
                sections.push(`| ${gap.type} | ${gap.resource} | ${gap.currentUsage || 0} | ${gap.expectedUsage || Math.round(analysis.poolInfo.averageUsage)} | ${priority} | ${gap.description} |`);
            });
        } else {
            sections.push('*No utilization gaps identified for this pool.*');
        }

        const markdownContent = sections.join('\n');
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        const poolFileName = analysis.poolInfo.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        link.setAttribute('download', `substitute_pool_${poolFileName}_${timestamp}.md`);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Component to Ingredient Usage Analysis Export
    const exportComponentToIngredientAnalysis = () => {
        console.log('Generating Component to Ingredient Usage Analysis...');

        // Get all components and ingredients from the data
        const components = allRecipes.filter(recipe =>
            (recipe.OutputType || recipe.outputType || recipe.type) === 'COMPONENT'
        );

        const ingredients = allRecipes.filter(recipe =>
            (recipe.OutputType || recipe.outputType || recipe.type) === 'INGREDIENT'
        );

        // Build component usage map
        const componentUsageMap = new Map();

        // Initialize all components in the map
        components.forEach(component => {
            const componentName = component.OutputName || component.outputName || component.name;
            componentUsageMap.set(componentName, {
                component: component,
                usedInIngredients: [],
                usedInComponents: [],
                totalUses: 0,
                tier: component.OutputTier || component.outputTier || component.tier || 1,
                functionalPurpose: component.FunctionalPurpose || component.functionalPurpose || '',
                usageCategory: component.UsageCategory || component.usageCategory || ''
            });
        });

        // Create a helper function to normalize component names for matching
        const normalizeComponentName = (name) => {
            if (!name) return '';
            return name.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Create a lookup map for normalized component names
        const normalizedComponentMap = new Map();
        componentUsageMap.forEach((usage, componentName) => {
            const normalized = normalizeComponentName(componentName);
            normalizedComponentMap.set(normalized, componentName);
        });

        // Track component usage in ingredients
        ingredients.forEach(ingredient => {
            const ingredientName = ingredient.OutputName || ingredient.outputName || ingredient.name;

            // Use the processed ingredients array instead of individual Ingredient1, Ingredient2 fields
            const ingredientsList = ingredient.ingredients || [];

            ingredientsList.forEach(ing => {
                const ingredientComponent = ing.name;
                const quantity = ing.quantity || 1;

                if (ingredientComponent) {
                    // Try exact match first
                    let matchedComponentName = null;
                    if (componentUsageMap.has(ingredientComponent)) {
                        matchedComponentName = ingredientComponent;
                    } else {
                        // Try normalized match
                        const normalizedIngredient = normalizeComponentName(ingredientComponent);
                        if (normalizedComponentMap.has(normalizedIngredient)) {
                            matchedComponentName = normalizedComponentMap.get(normalizedIngredient);
                        }
                    }

                    if (matchedComponentName) {
                        const usage = componentUsageMap.get(matchedComponentName);

                        // Check if this ingredient is already in the list to avoid duplicates
                        const existingIndex = usage.usedInIngredients.findIndex(existing =>
                            existing.name === ingredientName
                        );

                        if (existingIndex >= 0) {
                            // Update existing entry - don't add to total again
                            const oldQuantity = usage.usedInIngredients[existingIndex].quantity;
                            const newQuantity = Math.max(oldQuantity, quantity);
                            usage.usedInIngredients[existingIndex].quantity = newQuantity;
                            // Adjust total uses (remove old, add new)
                            usage.totalUses = usage.totalUses - oldQuantity + newQuantity;
                        } else {
                            // Add new entry
                            usage.usedInIngredients.push({
                                name: ingredientName,
                                quantity: quantity,
                                tier: ingredient.OutputTier || ingredient.outputTier || ingredient.tier || 1,
                                constructionTime: ingredient.ConstructionTime || ingredient.constructionTime || 0
                            });
                            usage.totalUses += quantity;
                        }
                    }
                }
            });
        });

        // Track component usage in other components
        components.forEach(component => {
            const componentName = component.OutputName || component.outputName || component.name;

            // Use the processed ingredients array instead of individual Ingredient1, Ingredient2 fields
            const ingredientsList = component.ingredients || [];

            ingredientsList.forEach(ing => {
                const ingredientComponent = ing.name;
                const quantity = ing.quantity || 1;

                if (ingredientComponent) {
                    // Try exact match first
                    let matchedComponentName = null;
                    if (componentUsageMap.has(ingredientComponent)) {
                        matchedComponentName = ingredientComponent;
                    } else {
                        // Try normalized match
                        const normalizedIngredient = normalizeComponentName(ingredientComponent);
                        if (normalizedComponentMap.has(normalizedIngredient)) {
                            matchedComponentName = normalizedComponentMap.get(normalizedIngredient);
                        }
                    }

                    if (matchedComponentName) {
                        const usage = componentUsageMap.get(matchedComponentName);

                        // Check if this component is already in the list to avoid duplicates
                        const existingIndex = usage.usedInComponents.findIndex(existing =>
                            existing.name === componentName
                        );

                        if (existingIndex >= 0) {
                            // Update existing entry - don't add to total again
                            const oldQuantity = usage.usedInComponents[existingIndex].quantity;
                            const newQuantity = Math.max(oldQuantity, quantity);
                            usage.usedInComponents[existingIndex].quantity = newQuantity;
                            // Adjust total uses (remove old, add new)
                            usage.totalUses = usage.totalUses - oldQuantity + newQuantity;
                        } else {
                            // Add new entry
                            usage.usedInComponents.push({
                                name: componentName,
                                quantity: quantity,
                                tier: component.OutputTier || component.outputTier || component.tier || 1
                            });
                            usage.totalUses += quantity;
                        }
                    }
                }
            });
        });

        // Generate markdown report
        let markdownContent = `# Component to Ingredient Production Paths Analysis\n\n`;
        markdownContent += `Generated on: ${new Date().toISOString()}\n\n`;

        // Debug information
        markdownContent += `## Debug Information\n\n`;
        markdownContent += `- Total Components Found: ${components.length}\n`;
        markdownContent += `- Total Ingredients Found: ${ingredients.length}\n`;

        // Show sample component names
        markdownContent += `\n**Sample Component Names:**\n`;
        components.slice(0, 5).forEach(comp => {
            const name = comp.OutputName || comp.outputName || comp.name;
            markdownContent += `- "${name}"\n`;
        });

        // Show sample ingredient names and their ingredients
        markdownContent += `\n**Sample Ingredients and Their Components:**\n`;
        ingredients.slice(0, 5).forEach(ing => {
            const name = ing.OutputName || ing.outputName || ing.name;
            markdownContent += `- **${name}** uses:\n`;

            const ingredientsList = ing.ingredients || [];
            if (ingredientsList.length > 0) {
                ingredientsList.forEach(ingredient => {
                    markdownContent += `  - "${ingredient.name}" x${ingredient.quantity}\n`;
                });
            } else {
                markdownContent += `  - (No ingredients found)\n`;
            }
        });

        // Show matching debug info
        markdownContent += `\n**Component Matching Debug:**\n`;
        let matchCount = 0;
        let totalChecked = 0;
        ingredients.slice(0, 3).forEach(ing => {
            const name = ing.OutputName || ing.outputName || ing.name;
            markdownContent += `- **${name}** ingredient matching:\n`;

            const ingredientsList = ing.ingredients || [];
            ingredientsList.forEach(ingredient => {
                const ingredientComponent = ingredient.name;
                if (ingredientComponent) {
                    totalChecked++;
                    const exactMatch = componentUsageMap.has(ingredientComponent);
                    const normalizedIngredient = normalizeComponentName(ingredientComponent);
                    const normalizedMatch = normalizedComponentMap.has(normalizedIngredient);

                    markdownContent += `  - "${ingredientComponent}" -> Exact: ${exactMatch}, Normalized: ${normalizedMatch}\n`;
                    if (exactMatch || normalizedMatch) matchCount++;
                }
            });
        });
        markdownContent += `- **Total matches found: ${matchCount}/${totalChecked}**\n`;

        markdownContent += `\n## Summary\n\n`;
        markdownContent += `- Total Components Analyzed: ${components.length}\n`;
        markdownContent += `- Total Ingredients Analyzed: ${ingredients.length}\n`;

        // Count components by usage
        const usedComponents = Array.from(componentUsageMap.values()).filter(c => c.totalUses > 0);
        const unusedComponents = Array.from(componentUsageMap.values()).filter(c => c.totalUses === 0);

        markdownContent += `- Components Used in Production: ${usedComponents.length}\n`;
        markdownContent += `- Components Not Used: ${unusedComponents.length}\n\n`;

        // Sort components by total usage (descending)
        const sortedComponents = Array.from(componentUsageMap.entries())
            .sort(([, a], [, b]) => b.totalUses - a.totalUses);

        markdownContent += `## Component Usage Analysis\n\n`;
        markdownContent += `### Most Used Components\n\n`;

        // Top 20 most used components
        const topComponents = sortedComponents.slice(0, 20);
        topComponents.forEach(([name, usage], index) => {
            markdownContent += `${index + 1}. **${name}** (${usage.totalUses} total uses)\n`;
            markdownContent += `   - Tier: T${usage.tier}\n`;
            if (usage.functionalPurpose) {
                markdownContent += `   - Purpose: ${usage.functionalPurpose}\n`;
            }
            if (usage.usageCategory) {
                markdownContent += `   - Category: ${usage.usageCategory}\n`;
            }
            markdownContent += `   - Used in ${usage.usedInIngredients.length} ingredients, ${usage.usedInComponents.length} components\n\n`;
        });

        markdownContent += `## Detailed Component Usage Breakdown\n\n`;

        // Detailed breakdown for all components with usage
        usedComponents.forEach(usage => {
            const componentName = usage.component.OutputName || usage.component.outputName || usage.component.name;
            markdownContent += `### ${componentName}\n\n`;
            markdownContent += `**Component Details:**\n`;
            markdownContent += `- Tier: T${usage.tier}\n`;
            markdownContent += `- Total Uses: ${usage.totalUses}\n`;
            if (usage.functionalPurpose) {
                markdownContent += `- Functional Purpose: ${usage.functionalPurpose}\n`;
            }
            if (usage.usageCategory) {
                markdownContent += `- Usage Category: ${usage.usageCategory}\n`;
            }

            // Show component recipe
            markdownContent += `\n**Component Recipe:**\n`;
            for (let i = 1; i <= 9; i++) {
                const ingredient = usage.component[`Ingredient${i}`];
                const quantity = usage.component[`Quantity${i}`];
                if (ingredient && quantity) {
                    markdownContent += `- ${ingredient} x${quantity}\n`;
                }
            }

            if (usage.usedInIngredients.length > 0) {
                markdownContent += `\n**Used in Ingredients (${usage.usedInIngredients.length}):**\n`;
                usage.usedInIngredients
                    .sort((a, b) => b.quantity - a.quantity)
                    .forEach(ing => {
                        markdownContent += `- **${ing.name}** (T${ing.tier}) - Uses ${ing.quantity}x`;
                        if (ing.constructionTime) {
                            markdownContent += ` - Construction Time: ${ing.constructionTime}s`;
                        }
                        markdownContent += `\n`;
                    });
            }

            if (usage.usedInComponents.length > 0) {
                markdownContent += `\n**Used in Other Components (${usage.usedInComponents.length}):**\n`;
                usage.usedInComponents
                    .sort((a, b) => b.quantity - a.quantity)
                    .forEach(comp => {
                        markdownContent += `- **${comp.name}** (T${comp.tier}) - Uses ${comp.quantity}x\n`;
                    });
            }

            markdownContent += `\n---\n\n`;
        });

        // Unused components section
        if (unusedComponents.length > 0) {
            markdownContent += `## Unused Components (${unusedComponents.length})\n\n`;
            markdownContent += `These components are not used in any ingredient or component recipes:\n\n`;

            unusedComponents
                .sort((a, b) => {
                    const tierDiff = a.tier - b.tier;
                    if (tierDiff !== 0) return tierDiff;

                    const nameA = a.component.OutputName || a.component.outputName || a.component.name || '';
                    const nameB = b.component.OutputName || b.component.outputName || b.component.name || '';
                    return nameA.localeCompare(nameB);
                })
                .forEach(usage => {
                    const componentName = usage.component.OutputName || usage.component.outputName || usage.component.name;
                    markdownContent += `- **${componentName}** (T${usage.tier})`;
                    if (usage.functionalPurpose) {
                        markdownContent += ` - ${usage.functionalPurpose}`;
                    }
                    markdownContent += `\n`;
                });
        }

        // Production chain statistics
        markdownContent += `\n## Production Chain Statistics\n\n`;
        markdownContent += `### Components by Tier Usage\n\n`;

        const tierStats = {};
        for (let tier = 1; tier <= 5; tier++) {
            const tierComponents = usedComponents.filter(c => c.tier == tier);
            const totalTierUses = tierComponents.reduce((sum, c) => sum + c.totalUses, 0);
            tierStats[tier] = { count: tierComponents.length, totalUses: totalTierUses };

            markdownContent += `**Tier ${tier}:** ${tierComponents.length} components, ${totalTierUses} total uses\n`;
        }

        // Export the markdown file
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `component-to-ingredient-analysis-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Component to Ingredient Analysis exported successfully');
    };

    // Basic Resource Usage Analysis Export
    const exportBasicResourceUsageAnalysis = () => {
        console.log('Generating Basic Resource Usage Analysis...');

        // Get all basic resources and what uses them
        const basicResources = allRecipes.filter(recipe => {
            const outputType = (recipe.OutputType || recipe.outputType || recipe.type || '').toUpperCase();
            return outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE';
        });

        const allOtherRecipes = allRecipes.filter(recipe => {
            const outputType = (recipe.OutputType || recipe.outputType || recipe.type || '').toUpperCase();
            return outputType !== 'BASIC RESOURCE' && outputType !== 'BASIC ORGANIC RESOURCE';
        });

        // Build basic resource usage map
        const resourceUsageMap = new Map();

        // Initialize all basic resources in the map
        basicResources.forEach(resource => {
            const resourceName = resource.OutputName || resource.outputName || resource.name;
            resourceUsageMap.set(resourceName, {
                resource: resource,
                usedInComponents: [],
                usedInIngredients: [],
                usedInOthers: [],
                totalUses: 0,
                tier: resource.OutputTier || resource.outputTier || resource.tier || 1,
                functionalPurpose: resource.FunctionalPurpose || resource.functionalPurpose || '',
                planetTypes: resource.PlanetTypes || resource.planetTypes || '',
                factions: resource.Factions || resource.factions || ''
            });
        });

        // Create a helper function to normalize resource names for matching
        const normalizeResourceName = (name) => {
            if (!name) return '';
            return name.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Create a lookup map for normalized resource names
        const normalizedResourceMap = new Map();
        resourceUsageMap.forEach((usage, resourceName) => {
            const normalized = normalizeResourceName(resourceName);
            normalizedResourceMap.set(normalized, resourceName);
        });

        // Track basic resource usage in all other recipes
        allOtherRecipes.forEach(recipe => {
            const recipeName = recipe.OutputName || recipe.outputName || recipe.name;
            const recipeType = recipe.OutputType || recipe.outputType || recipe.type || 'UNKNOWN';

            // Use the processed ingredients array
            const ingredientsList = recipe.ingredients || [];

            ingredientsList.forEach(ing => {
                const ingredientResource = ing.name;
                const quantity = ing.quantity || 1;

                if (ingredientResource) {
                    // Try exact match first
                    let matchedResourceName = null;
                    if (resourceUsageMap.has(ingredientResource)) {
                        matchedResourceName = ingredientResource;
                    } else {
                        // Try normalized match
                        const normalizedIngredient = normalizeResourceName(ingredientResource);
                        if (normalizedResourceMap.has(normalizedIngredient)) {
                            matchedResourceName = normalizedResourceMap.get(normalizedIngredient);
                        }
                    }

                    if (matchedResourceName) {
                        const usage = resourceUsageMap.get(matchedResourceName);

                        // Categorize by recipe type
                        let targetArray;
                        if (recipeType === 'COMPONENT') {
                            targetArray = usage.usedInComponents;
                        } else if (recipeType === 'INGREDIENT') {
                            targetArray = usage.usedInIngredients;
                        } else {
                            targetArray = usage.usedInOthers;
                        }

                        // Check if this recipe is already in the list to avoid duplicates
                        const existingIndex = targetArray.findIndex(existing =>
                            existing.name === recipeName
                        );

                        if (existingIndex >= 0) {
                            // Update existing entry - don't add to total again
                            const oldQuantity = targetArray[existingIndex].quantity;
                            const newQuantity = Math.max(oldQuantity, quantity);
                            targetArray[existingIndex].quantity = newQuantity;
                            // Adjust total uses (remove old, add new)
                            usage.totalUses = usage.totalUses - oldQuantity + newQuantity;
                        } else {
                            // Add new entry
                            targetArray.push({
                                name: recipeName,
                                quantity: quantity,
                                tier: recipe.OutputTier || recipe.outputTier || recipe.tier || 1,
                                type: recipeType,
                                constructionTime: recipe.ConstructionTime || recipe.constructionTime || 0
                            });
                            usage.totalUses += quantity;
                        }
                    }
                }
            });
        });

        // Generate markdown report
        let markdownContent = `# Basic Resource Usage Analysis\n\n`;
        markdownContent += `Generated on: ${new Date().toISOString()}\n\n`;

        // Debug information
        markdownContent += `## Debug Information\n\n`;
        markdownContent += `- Total Basic Resources Found: ${basicResources.length}\n`;
        markdownContent += `- Total Other Recipes Analyzed: ${allOtherRecipes.length}\n`;

        // Show sample resource names
        markdownContent += `\n**Sample Basic Resource Names:**\n`;
        basicResources.slice(0, 10).forEach(res => {
            const name = res.OutputName || res.outputName || res.name;
            const type = res.OutputType || res.outputType || res.type;
            markdownContent += `- "${name}" (${type})\n`;
        });

        markdownContent += `\n## Summary\n\n`;
        markdownContent += `- Total Basic Resources Analyzed: ${basicResources.length}\n`;
        markdownContent += `- Total Recipes Using Resources: ${allOtherRecipes.length}\n`;

        // Count resources by usage
        const usedResources = Array.from(resourceUsageMap.values()).filter(r => r.totalUses > 0);
        const unusedResources = Array.from(resourceUsageMap.values()).filter(r => r.totalUses === 0);

        markdownContent += `- Basic Resources Used in Production: ${usedResources.length}\n`;
        markdownContent += `- Basic Resources Not Used: ${unusedResources.length}\n\n`;

        // Sort resources by total usage (descending)
        const sortedResources = Array.from(resourceUsageMap.entries())
            .sort(([, a], [, b]) => b.totalUses - a.totalUses);

        markdownContent += `## Resource Usage Analysis\n\n`;
        markdownContent += `### Most Used Basic Resources\n\n`;

        // Top 20 most used resources
        const topResources = sortedResources.slice(0, 20);
        topResources.forEach(([name, usage], index) => {
            markdownContent += `${index + 1}. **${name}** (${usage.totalUses} total uses)\n`;
            markdownContent += `   - Tier: T${usage.tier}\n`;
            markdownContent += `   - Type: ${usage.resource.OutputType || usage.resource.outputType || usage.resource.type}\n`;
            if (usage.functionalPurpose) {
                markdownContent += `   - Purpose: ${usage.functionalPurpose}\n`;
            }
            if (usage.planetTypes) {
                markdownContent += `   - Planets: ${usage.planetTypes}\n`;
            }
            markdownContent += `   - Used in ${usage.usedInComponents.length} components, ${usage.usedInIngredients.length} ingredients, ${usage.usedInOthers.length} others\n\n`;
        });

        markdownContent += `## Detailed Resource Usage Breakdown\n\n`;

        // Detailed breakdown for all resources with usage
        usedResources.forEach(usage => {
            const resourceName = usage.resource.OutputName || usage.resource.outputName || usage.resource.name;
            markdownContent += `### ${resourceName}\n\n`;
            markdownContent += `**Resource Details:**\n`;
            markdownContent += `- Type: ${usage.resource.OutputType || usage.resource.outputType || usage.resource.type}\n`;
            markdownContent += `- Tier: T${usage.tier}\n`;
            markdownContent += `- Total Uses: ${usage.totalUses}\n`;
            if (usage.functionalPurpose) {
                markdownContent += `- Functional Purpose: ${usage.functionalPurpose}\n`;
            }
            if (usage.planetTypes) {
                markdownContent += `- Planet Types: ${usage.planetTypes}\n`;
            }
            if (usage.factions) {
                markdownContent += `- Factions: ${usage.factions}\n`;
            }

            if (usage.usedInComponents.length > 0) {
                markdownContent += `\n**Used in Components (${usage.usedInComponents.length}):**\n`;
                usage.usedInComponents
                    .sort((a, b) => b.quantity - a.quantity)
                    .forEach(comp => {
                        markdownContent += `- **${comp.name}** (T${comp.tier}) - Uses ${comp.quantity}x`;
                        if (comp.constructionTime) {
                            markdownContent += ` - Construction Time: ${comp.constructionTime}s`;
                        }
                        markdownContent += `\n`;
                    });
            }

            if (usage.usedInIngredients.length > 0) {
                markdownContent += `\n**Used in Ingredients (${usage.usedInIngredients.length}):**\n`;
                usage.usedInIngredients
                    .sort((a, b) => b.quantity - a.quantity)
                    .forEach(ing => {
                        markdownContent += `- **${ing.name}** (T${ing.tier}) - Uses ${ing.quantity}x`;
                        if (ing.constructionTime) {
                            markdownContent += ` - Construction Time: ${ing.constructionTime}s`;
                        }
                        markdownContent += `\n`;
                    });
            }

            if (usage.usedInOthers.length > 0) {
                markdownContent += `\n**Used in Other Recipes (${usage.usedInOthers.length}):**\n`;
                usage.usedInOthers
                    .sort((a, b) => b.quantity - a.quantity)
                    .forEach(other => {
                        markdownContent += `- **${other.name}** (${other.type}, T${other.tier}) - Uses ${other.quantity}x`;
                        if (other.constructionTime) {
                            markdownContent += ` - Construction Time: ${other.constructionTime}s`;
                        }
                        markdownContent += `\n`;
                    });
            }

            markdownContent += `\n---\n\n`;
        });

        // Unused resources section
        if (unusedResources.length > 0) {
            markdownContent += `## Unused Basic Resources (${unusedResources.length})\n\n`;
            markdownContent += `These basic resources are not used in any recipes:\n\n`;

            unusedResources
                .sort((a, b) => {
                    const tierDiff = a.tier - b.tier;
                    if (tierDiff !== 0) return tierDiff;

                    const nameA = a.resource.OutputName || a.resource.outputName || a.resource.name || '';
                    const nameB = b.resource.OutputName || b.resource.outputName || b.resource.name || '';
                    return nameA.localeCompare(nameB);
                })
                .forEach(usage => {
                    const resourceName = usage.resource.OutputName || usage.resource.outputName || usage.resource.name;
                    const resourceType = usage.resource.OutputType || usage.resource.outputType || usage.resource.type;
                    markdownContent += `- **${resourceName}** (${resourceType}, T${usage.tier})`;
                    if (usage.functionalPurpose) {
                        markdownContent += ` - ${usage.functionalPurpose}`;
                    }
                    markdownContent += `\n`;
                });
        }

        // Production chain statistics
        markdownContent += `\n## Production Chain Statistics\n\n`;
        markdownContent += `### Resources by Tier Usage\n\n`;

        for (let tier = 1; tier <= 5; tier++) {
            const tierResources = usedResources.filter(r => r.tier == tier);
            const totalTierUses = tierResources.reduce((sum, r) => sum + r.totalUses, 0);

            markdownContent += `**Tier ${tier}:** ${tierResources.length} resources, ${totalTierUses} total uses\n`;
        }

        markdownContent += `\n### Usage by Recipe Type\n\n`;
        let totalComponentUses = 0;
        let totalIngredientUses = 0;
        let totalOtherUses = 0;

        usedResources.forEach(usage => {
            totalComponentUses += usage.usedInComponents.reduce((sum, comp) => sum + comp.quantity, 0);
            totalIngredientUses += usage.usedInIngredients.reduce((sum, ing) => sum + ing.quantity, 0);
            totalOtherUses += usage.usedInOthers.reduce((sum, other) => sum + other.quantity, 0);
        });

        markdownContent += `- **Components:** ${totalComponentUses} total uses\n`;
        markdownContent += `- **Ingredients:** ${totalIngredientUses} total uses\n`;
        markdownContent += `- **Other Recipes:** ${totalOtherUses} total uses\n`;

        // Export the markdown file
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `basic-resource-usage-analysis-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Basic Resource Usage Analysis exported successfully');
    };

    // Multi-pool production chain analysis export
    const exportMultiPoolAnalysis = (selectedPoolNames) => {
        console.log(`Exporting production chain analysis for: ${selectedPoolNames.join(', ')}`);
        const timestamp = new Date().toISOString().split('T')[0];

        // Get all pools for the current category
        const allPools = generateSubstitutePools(activeTab);
        const selectedPoolObjects = allPools.filter(pool => selectedPoolNames.includes(pool.name));

        if (selectedPoolObjects.length === 0) {
            alert('No valid pools selected for export.');
            return;
        }

        // Create production chain focused markdown content
        const sections = [];

        // Header
        sections.push('# 🏭 Production Chain Development Report\n');
        sections.push(`**Generated:** ${timestamp}`);
        sections.push(`**Category:** ${activeTab.replace('-', ' ').toUpperCase()}`);
        sections.push(`**Selected Component Categories + Tiers:** ${selectedPoolNames.length}`);
        sections.push(`**Total Pools Analyzed:** ${selectedPoolObjects.length}`);
        sections.push(`**Purpose:** AI-assisted production chain completion\n`);

        // Instructions for AI
        sections.push('## 🤖 Instructions for AI Agent\n');
        sections.push('This report identifies ingredients that need production chains and provides the allowed resources for each tier/category combination.\n');
        sections.push('**Production Chain Rules:**');
        sections.push('- **3-6 production steps maximum** per ingredient');
        sections.push('- **1-5 unique raw resources** per ingredient (avoid complexity)');
        sections.push('- **Tier restrictions:** Ingredients can use resources from same tier or up to 2 tiers below');
        sections.push('- **Prefer tier-appropriate complexity:** Higher tiers = more complex chains');
        sections.push('- **Balance resource usage:** Use underutilized raw resources when possible');
        sections.push('- **Follow logical progression:** Basic materials → Components → Ingredients\n');

        // Overall summary
        let totalIncomplete = 0;
        let totalPartial = 0;
        let totalAvailableRaw = 0;
        let totalAvailableComponents = 0;

        selectedPoolObjects.forEach(pool => {
            totalIncomplete += pool.resources.filter(r => r.usageCount === 0).length;
            totalPartial += pool.resources.filter(r => r.usageCount > 0 && r.usageCount < 3).length;
            totalAvailableRaw += pool.availableRawResources.size;
            totalAvailableComponents += pool.availableComponents.size;
        });

        sections.push('## 📊 Production Chain Gap Summary\n');
        sections.push(`| Category | Count | Description |`);
        sections.push(`|----------|-------|-------------|`);
        sections.push(`| **Missing Production Chains** | ${totalIncomplete} | Ingredients with 0 usage that need complete recipes |`);
        sections.push(`| **Incomplete Production Chains** | ${totalPartial} | Ingredients with minimal usage (<3) that may need improvement |`);
        sections.push(`| **Available Raw Resources** | ${totalAvailableRaw} | Raw resources available across all selected pools |`);
        sections.push(`| **Available Components** | ${totalAvailableComponents} | Components available across all selected pools |`);
        sections.push(`| **Component Categories** | ${new Set(selectedPoolObjects.map(p => p.componentCategory)).size} | Unique component categories in selection |\n`);

        // Component category analysis
        const componentCategories = [...new Set(selectedPoolObjects.map(p => p.componentCategory))];

        if (componentCategories.length > 1) {
            sections.push('## 🔧 Component Category Overview\n');
            sections.push(`| Component Category | Tiers | Incomplete Ingredients | Available Resources |`);
            sections.push(`|--------------------|-------|----------------------|-------------------|`);

            componentCategories.forEach(category => {
                const categoryPools = selectedPoolObjects.filter(p => p.componentCategory === category);
                const categoryTiers = categoryPools.map(p => `T${p.tier}`).join(', ');
                const categoryIncomplete = categoryPools.reduce((sum, p) => sum + p.resources.filter(r => r.usageCount === 0).length, 0);
                const categoryResources = categoryPools.reduce((sum, p) => sum + p.availableRawResources.size + p.availableComponents.size, 0);

                sections.push(`| **${category}** | ${categoryTiers} | ${categoryIncomplete} | ${categoryResources} |`);
            });
            sections.push('');
        }

        // Detailed pool analysis
        selectedPoolObjects.forEach(pool => {
            sections.push(`## 🏭 ${pool.name} Production Chain Analysis\n`);

            // Pool summary
            sections.push(`**Component Category:** ${pool.componentCategory}`);
            sections.push(`**Tier:** ${pool.tier} (can use resources T${Math.max(1, pool.tier - 2)}-T${pool.tier})`);
            sections.push(`**Total Ingredients:** ${pool.resources.length}`);

            // Incomplete ingredients that need production chains
            const incompleteIngredients = pool.resources.filter(r => r.usageCount === 0);
            const partialIngredients = pool.resources.filter(r => r.usageCount > 0 && r.usageCount < 3);

            if (incompleteIngredients.length > 0) {
                sections.push(`\n### ❌ Missing Production Chains (${incompleteIngredients.length})\n`);
                sections.push('*These ingredients have NO production chains defined and need complete recipes:*\n');
                incompleteIngredients.forEach(ingredient => {
                    sections.push(`- **${ingredient.name}** (T${ingredient.tier}) - 0 uses`);
                });
                sections.push('');
            }

            if (partialIngredients.length > 0) {
                sections.push(`### ⚠️ Incomplete Production Chains (${partialIngredients.length})\n`);
                sections.push('*These ingredients have minimal usage and may need production chain improvements:*\n');
                partialIngredients.forEach(ingredient => {
                    sections.push(`- **${ingredient.name}** (T${ingredient.tier}) - ${ingredient.usageCount} uses`);
                });
                sections.push('');
            }

            // Available resources for this tier/category
            sections.push(`### ✅ Available Resources for ${pool.componentCategory} T${pool.tier}\n`);

            if (pool.availableRawResources.size > 0) {
                sections.push(`#### Raw Resources (${pool.availableRawResources.size} available)\n`);
                sections.push(`*Tier range: T${Math.max(1, pool.tier - 2)}-T${pool.tier} • Category: ${pool.componentCategory}*\n`);

                // Group raw resources by tier for better organization
                const rawResourcesByTier = {};
                Array.from(pool.availableRawResources).forEach(rawName => {
                    const rawResource = usageAnalysis.raw?.get(rawName);
                    if (rawResource) {
                        const tier = rawResource.tier;
                        if (!rawResourcesByTier[tier]) rawResourcesByTier[tier] = [];
                        rawResourcesByTier[tier].push(`${rawName} (${rawResource.usageCount} uses)`);
                    }
                });

                Object.keys(rawResourcesByTier).sort((a, b) => parseInt(a) - parseInt(b)).forEach(tier => {
                    sections.push(`**T${tier} Raw Resources (${rawResourcesByTier[tier].length}):**`);
                    rawResourcesByTier[tier].forEach(resource => {
                        sections.push(`- ${resource}`);
                    });
                    sections.push('');
                });
            } else {
                sections.push(`#### ⚠️ No Raw Resources Available\n`);
                sections.push(`*No raw resources found for ${pool.componentCategory} T${pool.tier}. This may indicate a data issue.*\n`);
            }

            if (pool.availableComponents.size > 0) {
                sections.push(`#### Components (${pool.availableComponents.size} available)\n`);
                sections.push(`*Tier range: T${Math.max(1, pool.tier - 2)}-T${pool.tier} • Category: ${pool.componentCategory}*\n`);

                // Group components by tier
                const componentsByTier = {};
                Array.from(pool.availableComponents).forEach(compName => {
                    const component = usageAnalysis.components?.get(compName);
                    if (component) {
                        const tier = component.tier;
                        if (!componentsByTier[tier]) componentsByTier[tier] = [];
                        componentsByTier[tier].push(`${compName} (${component.usageCount} uses)`);
                    }
                });

                Object.keys(componentsByTier).sort((a, b) => parseInt(a) - parseInt(b)).forEach(tier => {
                    sections.push(`**T${tier} Components (${componentsByTier[tier].length}):**`);
                    componentsByTier[tier].forEach(component => {
                        sections.push(`- ${component}`);
                    });
                    sections.push('');
                });
            }

            // Production chain recommendations
            sections.push(`### 🎯 Production Chain Recommendations\n`);

            if (incompleteIngredients.length > 0) {
                sections.push('**Complexity Guidelines for this tier:**');
                if (pool.tier <= 2) {
                    sections.push('- Simple chains: 3-4 steps, 2-3 raw resources');
                    sections.push('- Focus on basic combinations and minimal processing');
                } else if (pool.tier <= 4) {
                    sections.push('- Moderate chains: 4-5 steps, 3-4 raw resources');
                    sections.push('- Allow intermediate processing steps');
                } else {
                    sections.push('- Complex chains: 5-6 steps, 4-5 raw resources');
                    sections.push('- Multiple processing stages and specialized resources');
                }

                sections.push('- **Prioritize underutilized raw resources** to balance usage');
                sections.push('- **Use tier-appropriate resources** only');
                sections.push('- **Build logical progression** from raw materials to final ingredient');
                sections.push('- **Test resource availability** before finalizing chains\n');

                // Sample production chain structure
                sections.push('**Example Production Chain Structure:**');
                sections.push('```');
                sections.push('T1 Raw Resource A + T1 Raw Resource B → T2 Basic Component');
                sections.push('T2 Basic Component + T2 Raw Resource C → T3 Intermediate Component');
                sections.push(`T3 Intermediate Component + T${pool.tier} Raw Resource D → T${pool.tier} Final Ingredient`);
                sections.push('```\n');
            }

            sections.push('---\n');
        });

        // Summary recommendations
        sections.push('## 📋 Summary & AI Agent Tasks\n');

        sections.push(`**Production Chain Development Status:**`);
        sections.push(`- **${totalIncomplete} ingredients** need complete production chains`);
        sections.push(`- **${totalPartial} ingredients** need production chain improvements`);
        sections.push(`- **${selectedPoolObjects.length} component category + tier** combinations analyzed`);
        sections.push(`- **${totalAvailableRaw} raw resources** available for use`);
        sections.push(`- **${totalAvailableComponents} components** available for intermediate steps\n`);

        sections.push(`**AI Agent Priority Tasks:**`);
        sections.push(`1. **Create production chains** for ingredients with 0 usage (highest priority)`);
        sections.push(`2. **Review and improve** chains for low-usage ingredients`);
        sections.push(`3. **Ensure tier restrictions** are followed (max 2 tiers below current)`);
        sections.push(`4. **Balance raw resource usage** across chains`);
        sections.push(`5. **Test production chain viability** and resource availability`);
        sections.push(`6. **Maintain 3-6 step complexity** with 1-5 unique raw resources`);
        sections.push(`7. **Use component category appropriate** resources when possible\n`);

        sections.push(`**Next Steps:**`);
        sections.push(`1. Select a component category + tier combination to focus on`);
        sections.push(`2. Use this report to identify available resources`);
        sections.push(`3. Create production chains following the complexity guidelines`);
        sections.push(`4. Update the CSV with new ingredient recipes`);
        sections.push(`5. Test and validate the production chains`);
        sections.push(`6. Export updated CSV for integration\n`);

        const markdownContent = sections.join('\n');
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        const fileName = `production_chain_analysis_${selectedPoolNames.length}_pools_${timestamp}.md`;
        link.setAttribute('download', fileName);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Production chain analysis exported: ${fileName}`);
    };

    // Handle multi-pool selection
    const handlePoolSelection = (poolName, isSelected) => {
        const newSelection = new Set(selectedPools);
        if (isSelected) {
            newSelection.add(poolName);
        } else {
            newSelection.delete(poolName);
        }
        setSelectedPools(newSelection);
    };

    // Filter resources based on search term
    const filterResources = (resources) => {
        if (!searchTerm) return resources;
        return resources.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.usageCategory.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Recalculate all component tiers based on their ingredients
    const recalculateAllTiers = (recipes) => {
        console.log('🔄 Recalculating all component tiers...');
        const updatedRecipes = [...recipes];
        const tierChanges = [];
        let changed = true;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops

        // Create a map for quick lookups
        const recipeMap = new Map();
        updatedRecipes.forEach(recipe => {
            const name = recipe.OutputName || recipe.outputName || recipe.name;
            if (name) {
                recipeMap.set(name, recipe);
            }
        });

        // Keep iterating until no more changes (handles nested dependencies)
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            console.log(`🔄 Tier calculation iteration ${iterations}...`);

            updatedRecipes.forEach(recipe => {
                const outputType = (recipe.OutputType || recipe.outputType || recipe.type || '').toUpperCase();

                // Only recalculate COMPONENT and INGREDIENT tiers
                if (outputType !== 'COMPONENT' && outputType !== 'INGREDIENT') {
                    return;
                }

                const name = recipe.OutputName || recipe.outputName || recipe.name;
                const currentTier = parseInt(recipe.OutputTier || recipe.outputTier || recipe.tier || 1);

                // Get all ingredients and their tiers
                const ingredientTiers = [];

                // Handle both ingredient formats
                if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                    recipe.ingredients.forEach(ing => {
                        if (ing && ing.name) {
                            const ingredientRecipe = recipeMap.get(ing.name);
                            if (ingredientRecipe) {
                                const ingTier = parseInt(ingredientRecipe.OutputTier || ingredientRecipe.outputTier || ingredientRecipe.tier || 1);
                                ingredientTiers.push(ingTier);
                            }
                        }
                    });
                } else {
                    // Old format: Ingredient1, Ingredient2, etc.
                    for (let i = 1; i <= 9; i++) {
                        const ingredientName = recipe[`Ingredient${i}`];
                        if (ingredientName && ingredientName.trim()) {
                            const ingredientRecipe = recipeMap.get(ingredientName.trim());
                            if (ingredientRecipe) {
                                const ingTier = parseInt(ingredientRecipe.OutputTier || ingredientRecipe.outputTier || ingredientRecipe.tier || 1);
                                ingredientTiers.push(ingTier);
                            }
                        }
                    }
                }

                if (ingredientTiers.length > 0) {
                    const maxIngredientTier = Math.max(...ingredientTiers);

                    // Component tier should be >= highest ingredient tier
                    if (currentTier < maxIngredientTier) {
                        const oldTier = currentTier;
                        recipe.OutputTier = maxIngredientTier.toString();
                        recipe.outputTier = maxIngredientTier.toString();
                        recipe.tier = maxIngredientTier.toString();

                        tierChanges.push({
                            name: name,
                            type: outputType,
                            oldTier: oldTier,
                            newTier: maxIngredientTier,
                            highestIngredient: Math.max(...ingredientTiers)
                        });

                        changed = true;
                        console.log(`📈 ${outputType}: ${name} T${oldTier} → T${maxIngredientTier}`);
                    }
                }
            });
        }

        console.log(`✅ Tier recalculation complete after ${iterations} iterations. ${tierChanges.length} changes made.`);
        return { updatedRecipes, tierChanges };
    };

    // Generate Claim Stake Tier Report with progress tracking
    const generateClaimStakeTierReport = async () => {
        console.log('📊 Generating Claim Stake Tier Report...');

        // Show progress in button
        const button = document.querySelector('.btn-info');
        const originalText = button.textContent;
        button.disabled = true;

        try {
            button.textContent = '🔧 Recalculating tiers...';

            // First, recalculate all tiers to ensure accuracy
            const { updatedRecipes, tierChanges } = recalculateAllTiers(allRecipes);

            // Group resources by tier
            const tierGroups = {};
            const maxTier = 5; // Assuming tiers 1-5

            for (let tier = 1; tier <= maxTier; tier++) {
                tierGroups[tier] = {
                    rawResources: [],
                    components: [],
                    totalItems: 0
                };
            }

            button.textContent = '🧮 Calculating production steps...';
            await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI

            // Proper production steps calculation (same as BuildingManager)
            const calculateActualProductionSteps = (recipe, allRecipes, visited = new Set()) => {
                const recipeId = recipe.OutputName || recipe.outputName || recipe.name;
                if (visited.has(recipeId)) return 0; // Prevent infinite loops
                visited.add(recipeId);

                let maxSteps = 0;

                // Check ingredients based on data format
                const checkIngredients = [];

                // Handle both ingredient formats
                if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                    checkIngredients.push(...recipe.ingredients.map(ing => ing.name).filter(name => name));
                } else {
                    // Old format: Ingredient1, Ingredient2, etc.
                    for (let i = 1; i <= 9; i++) {
                        const ingredient = recipe[`Ingredient${i}`];
                        if (ingredient && ingredient.trim()) {
                            checkIngredients.push(ingredient.trim());
                        }
                    }
                }

                checkIngredients.forEach(ingredientName => {
                    const ingredientRecipe = allRecipes.find(r =>
                        (r.OutputName || r.outputName || r.name) === ingredientName
                    );

                    if (ingredientRecipe) {
                        const ingredientType = (ingredientRecipe.OutputType || ingredientRecipe.outputType || ingredientRecipe.type || '').toUpperCase();
                        if (ingredientType === 'BASIC RESOURCE' || ingredientType === 'RAW_MATERIAL' || ingredientType === 'RAW RESOURCE') {
                            maxSteps = Math.max(maxSteps, 1);
                        } else {
                            maxSteps = Math.max(maxSteps, 1 + calculateActualProductionSteps(ingredientRecipe, allRecipes, new Set(visited)));
                        }
                    }
                });

                return maxSteps;
            };

            // Create a unique items map to prevent duplicates
            const uniqueItems = new Map();

            // Process recipes in chunks to prevent timeouts
            const chunkSize = 50;
            const totalRecipes = updatedRecipes.length;
            let processedCount = 0;

            for (let i = 0; i < updatedRecipes.length; i += chunkSize) {
                const chunk = updatedRecipes.slice(i, i + chunkSize);
                const progress = Math.round((processedCount / totalRecipes) * 100);

                button.textContent = `🧮 Processing recipes... ${progress}% (${processedCount}/${totalRecipes})`;
                await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

                // Categorize chunk of recipes by tier (CLAIM STAKE FOCUS: Raw resources + Components ≤2 production steps only)
                chunk.forEach(recipe => {
                    const name = recipe.OutputName || recipe.outputName || recipe.name;
                    const tier = parseInt(recipe.OutputTier || recipe.outputTier || recipe.tier || 1);
                    const outputType = (recipe.OutputType || recipe.outputType || recipe.type || '').toUpperCase();

                    if (!name || tier < 1 || tier > maxTier) return;

                    // Calculate ACTUAL production steps using proper recursive algorithm
                    const actualProductionSteps = calculateActualProductionSteps(recipe, updatedRecipes);

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
                    let factions = recipe.Factions || recipe.factions || '';
                    if (factions) {
                        // Normalize to semicolon separator and clean up
                        factions = factions.replace(/,/g, ';').replace(/\s+/g, '').trim();
                    }

                    const item = {
                        name: name,
                        tier: tier,
                        type: outputType,
                        resourceType: recipe.ResourceType || recipe.resourceType || '',
                        usageCategory: recipe.UsageCategory || recipe.usageCategory || '',
                        planetTypes: recipe.PlanetTypes || recipe.planetTypes || '',
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

                processedCount += chunk.length;
            }

            button.textContent = '📝 Generating report...';
            await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI

            // Generate markdown report
            const timestamp = new Date().toISOString().split('T')[0];
            let markdown = `# 🏗️ Claim Stake Tier Unlock Report\n\n`;
            markdown += `**Generated:** ${timestamp}\n`;
            markdown += `**Total Tier Corrections Made:** ${tierChanges.length}\n\n`;

            if (tierChanges.length > 0) {
                markdown += `## 🔧 Tier Corrections Applied\n\n`;
                markdown += `The following items had their tiers corrected to match their ingredient requirements:\n\n`;
                tierChanges.forEach(change => {
                    markdown += `- **${change.name}** (${change.type}): T${change.oldTier} → T${change.newTier}\n`;
                });
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

            // Claim Stake Manufacturing Progression
            markdown += `## 🏭 Claim Stake Manufacturing Progression\n\n`;
            markdown += `This section shows the progression of manufacturing capabilities as you unlock higher claim stake tiers.\n\n`;

            for (let tier = 1; tier <= maxTier; tier++) {
                const tierGroup = tierGroups[tier];
                if (tierGroup.totalItems === 0) continue;

                markdown += `### Tier ${tier} Claim Stakes Enable:\n\n`;

                if (tierGroup.rawResources.length > 0) {
                    markdown += `**${tierGroup.rawResources.length} Raw Resource${tierGroup.rawResources.length === 1 ? '' : 's'} for extraction:**\n`;
                    tierGroup.rawResources.slice(0, 10).forEach(resource => {
                        markdown += `- ${resource.name}\n`;
                    });
                    if (tierGroup.rawResources.length > 10) {
                        markdown += `- ... and ${tierGroup.rawResources.length - 10} more\n`;
                    }
                    markdown += `\n`;
                }

                if (tierGroup.components.length > 0) {
                    markdown += `**${tierGroup.components.length} Simple Component${tierGroup.components.length === 1 ? '' : 's'} for manufacturing:**\n`;
                    tierGroup.components.slice(0, 10).forEach(component => {
                        const steps = component.productionSteps || 0;
                        markdown += `- ${component.name} (${steps} step${steps === 1 ? '' : 's'})\n`;
                    });
                    if (tierGroup.components.length > 10) {
                        markdown += `- ... and ${tierGroup.components.length - 10} more\n`;
                    }
                    markdown += `\n`;
                }
            }

            button.textContent = '💾 Downloading report...';
            await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI

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

            return { markdown, tierChanges, tierGroups };

        } catch (error) {
            console.error('Error generating claim stake tier report:', error);
            alert(`❌ Error generating report: ${error.message}`);
        } finally {
            // Reset button state
            button.textContent = originalText;
            button.disabled = false;
        }
    };

    // Auto-generate recommendations on load (without heavy effect calculations)
    useEffect(() => {
        if (allRecipes.length > 0) {
            generateBalancingRecommendations();
        }
    }, [usageAnalysis, manuallyFlagged, completedResources]);

    // Initialize auto-calculation queue when usage analysis is ready
    useEffect(() => {
        if (Object.keys(usageAnalysis).length > 0 && autoCalculationEnabled) {
            const totalResources = getAllAvailableResources().length;
            if (totalResources > 0 && calculationQueue.length === 0) {
                console.log(`🚀 Auto-initializing calculation queue for ${totalResources} resources`);
                setQueueProgress(prev => ({ ...prev, total: totalResources, completed: 0 }));
                initializeAutoCalculationQueue();
            }
        }
    }, [usageAnalysis, autoCalculationEnabled]);

    // Auto-start queue processing when queue has items (with debouncing)
    useEffect(() => {
        if (calculationQueue.length > 0 && !queueProcessing && autoCalculationEnabled) {
            console.log(`🎬 Auto-starting queue processing for ${calculationQueue.length} items`);
            const timeoutId = setTimeout(() => {
                processCalculationQueue();
            }, 500); // Small delay to allow queue to stabilize

            return () => clearTimeout(timeoutId);
        }
    }, [calculationQueue.length, queueProcessing, autoCalculationEnabled]);

    // Update queue progress total when queue changes
    useEffect(() => {
        if (calculationQueue.length > 0) {
            setQueueProgress(prev => ({
                ...prev,
                total: Math.max(prev.total, prev.completed + calculationQueue.length)
            }));
        }
    }, [calculationQueue.length]);

    if (loading) {
        return (
            <div className="resource-balancer">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading recipe data for balancing analysis...</p>
                </div>
            </div>
        );
    }

    const statusResources = activeTab === 'overview' ? [] : getResourcesByStatus(activeTab, balancingMode);
    const filteredResources = filterResources(statusResources);
    const currentSubstitutePools = activeTab === 'overview' ? [] : generateSubstitutePools(activeTab);

    return (
        <div className="resource-balancer">
            <div className="balancer-header">
                <h2>🎯 Resource Balancer</h2>
                <p>Analyze usage patterns and balance resource distribution across recipes</p>

                {/* Global Queue Progress */}
                {(queueProcessing || queueProgress.total > 0) && (
                    <div className="global-queue-progress">
                        <div className="queue-status">
                            {queueProcessing ? (
                                <>
                                    <div className="spinner-small"></div>
                                    <span>🧮 Calculating effects... ({queueProgress.completed}/{queueProgress.total})</span>
                                    {queueProgress.current && <span className="current-resource">Current: {queueProgress.current}</span>}
                                </>
                            ) : (
                                <span>✅ Effect calculations complete! ({calculatedEffects.size} resources calculated)</span>
                            )}
                        </div>
                        {queueProgress.total > 0 && (
                            <div className="global-progress-bar">
                                <div
                                    className="global-progress-fill"
                                    style={{ width: `${(queueProgress.completed / queueProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        )}
                        <div className="queue-controls">
                            <button
                                className="btn-small"
                                onClick={() => {
                                    const newState = !autoCalculationEnabled;
                                    setAutoCalculationEnabled(newState);
                                    if (newState && calculationQueue.length === 0) {
                                        // Re-initialize queue if resuming and queue is empty
                                        initializeAutoCalculationQueue();
                                    }
                                }}
                                title={autoCalculationEnabled ? "Pause auto-calculation" : "Resume auto-calculation"}
                            >
                                {autoCalculationEnabled ? "⏸️ Pause" : "▶️ Resume"}
                            </button>
                            <span className="queue-info">
                                Queue: {calculationQueue.length} remaining
                            </span>
                            <button
                                className="btn-small btn-danger"
                                onClick={() => {
                                    setCalculationQueue([]);
                                    setQueueProcessing(false);
                                    setCalculatingEffects(new Set());
                                    setQueueProgress({ completed: 0, total: 0, current: null });
                                }}
                                title="Clear queue and stop processing"
                            >
                                🛑 Clear Queue
                            </button>
                        </div>
                    </div>
                )}

                <div className="header-actions">
                    <div className="effect-calculator">
                        <input
                            type="text"
                            placeholder="Resource name..."
                            className="effect-input"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                    calculateSingleResourceEffect(e.target.value.trim());
                                    e.target.value = '';
                                }
                            }}
                        />
                        <span className="effect-hint">Press Enter to calculate effect</span>
                    </div>

                    <button className="btn-secondary" onClick={openEnhancedSwapModal}>
                        🔄 Resource Swapper
                    </button>
                    <button className="btn-primary" onClick={exportBalancedCSV}>
                        📄 Export Balanced CSV
                    </button>
                    <button className="btn-danger" onClick={showClearStorageInfo}>
                        🗑️ Clear Storage
                    </button>
                    <button className="btn-warning" onClick={exportBalancingReport}>
                        📋 Export Balancing Report
                    </button>
                    <button className="btn-success" onClick={exportComponentToIngredientAnalysis}>
                        🔗 Component Usage Analysis (MD)
                    </button>
                    <button className="btn-success" onClick={exportBasicResourceUsageAnalysis}>
                        ⛏️ Basic Resource Usage Analysis (MD)
                    </button>
                    <button className="btn-info" onClick={() => generateClaimStakeTierReport().catch(err => console.error('Report generation failed:', err))}>
                        🏗️ Claim Stake Tier Report
                    </button>
                    {selectedResources.size > 0 && (
                        <button className="btn-secondary" onClick={executeBatchBalancing}>
                            ⚡ Batch Balance ({selectedResources.size})
                        </button>
                    )}
                </div>

                <div className="search-controls">
                    <input
                        type="text"
                        placeholder="Search resources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />

                    {activeTab !== 'overview' && (
                        <select
                            value={balancingMode}
                            onChange={(e) => setBalancingMode(e.target.value)}
                            className="balancing-mode-select"
                        >
                            <option value="needs-increase">⚠️ Needs Usage Increase</option>
                            <option value="completed">✅ Completed</option>
                            <option value="unused">🚫 Unused Resources</option>
                            <option value="unused-components">🔧 Unused Components Only</option>
                            <option value="unused-ingredients">🧪 Unused Ingredients Only</option>
                            <option value="under-utilized">📉 Under-utilized (&lt; 5 uses)</option>
                            <option value="over-utilized">📈 Over-utilized (&gt; 20 uses)</option>
                            <option value="balanced">⚖️ Balanced (5-20 uses)</option>
                        </select>
                    )}
                </div>
            </div>

            <div className="balancer-tabs">
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button
                    className={`tab ${activeTab === 'raw-resources' ? 'active' : ''}`}
                    onClick={() => setActiveTab('raw-resources')}
                >
                    🏔️ Raw Resources ({usageAnalysis.raw?.size || 0})
                </button>
                <button
                    className={`tab ${activeTab === 'components' ? 'active' : ''}`}
                    onClick={() => setActiveTab('components')}
                >
                    ⚙️ Components ({usageAnalysis.components?.size || 0})
                </button>
                <button
                    className={`tab ${activeTab === 'ingredients' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ingredients')}
                >
                    🧪 Ingredients ({usageAnalysis.ingredients?.size || 0})
                </button>
            </div>

            <div className="balancer-content">
                {activeTab === 'overview' && (
                    <div className="resource-overview-section">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Raw Resources</h3>
                                <div className="stat-breakdown">
                                    <div>Total: {usageAnalysis.raw?.size || 0}</div>
                                    <div>Flagged: {getResourcesByStatus('raw', 'needs-increase').length}</div>
                                    <div>Completed: {getResourcesByStatus('raw', 'completed').length}</div>
                                    <div>Unused: {getResourcesByStatus('raw', 'unused').length}</div>
                                    <div>Under-utilized: {getResourcesByStatus('raw', 'under-utilized').length}</div>
                                    <div>Over-utilized: {getResourcesByStatus('raw', 'over-utilized').length}</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <h3>Components</h3>
                                <div className="stat-breakdown">
                                    <div>Total: {usageAnalysis.components?.size || 0}</div>
                                    <div>Flagged: {getResourcesByStatus('components', 'needs-increase').length}</div>
                                    <div>Completed: {getResourcesByStatus('components', 'completed').length}</div>
                                    <div>Unused: {getResourcesByStatus('components', 'unused').length}</div>
                                    <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>🔧❌ Unused Components: {getResourcesByStatus('components', 'unused-components').length}</div>
                                    <div>Under-utilized: {getResourcesByStatus('components', 'under-utilized').length}</div>
                                    <div>Over-utilized: {getResourcesByStatus('components', 'over-utilized').length}</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <h3>Ingredients</h3>
                                <div className="stat-breakdown">
                                    <div>Total: {usageAnalysis.ingredients?.size || 0}</div>
                                    <div>Flagged: {getResourcesByStatus('ingredients', 'needs-increase').length}</div>
                                    <div>Completed: {getResourcesByStatus('ingredients', 'completed').length}</div>
                                    <div>Unused: {getResourcesByStatus('ingredients', 'unused').length}</div>
                                    <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>❌ Missing Components: {missingIngredients.length}</div>
                                    <div style={{ color: '#ff9500', fontWeight: 'bold' }}>🧪❌ Unused Ingredients: {getResourcesByStatus('ingredients', 'unused-ingredients').length}</div>
                                    <div>Under-utilized: {getResourcesByStatus('ingredients', 'under-utilized').length}</div>
                                    <div>Over-utilized: {getResourcesByStatus('ingredients', 'over-utilized').length}</div>
                                </div>
                            </div>

                            <div className="stat-card" style={{ gridColumn: 'span 3', backgroundColor: '#f8f9fa', border: '2px solid #e74c3c' }}>
                                <h3>🚫 Complete Unused Resource Summary</h3>
                                <div className="stat-breakdown">
                                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#e74c3c' }}>
                                        Total Unused Across All Types: {
                                            [...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                                .filter(r => r.usageCount === 0).length
                                        }
                                    </div>
                                    <div>📦 Unused Basic Resources: {Array.from(usageAnalysis.raw.values()).filter(r => r.usageCount === 0).length}</div>
                                    <div>🔧 Unused Components: {Array.from(usageAnalysis.components.values()).filter(r => r.usageCount === 0).length}</div>
                                    <div>🧪 Unused Ingredients: {Array.from(usageAnalysis.ingredients.values()).filter(r => r.usageCount === 0).length}</div>
                                    <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>❌ Missing Ingredients: {missingIngredients.length}</div>
                                </div>
                            </div>
                        </div>

                        {balancingRecommendations.length > 0 && (
                            <div className="recommendations-section">
                                <h3>🎯 Priority Balancing Recommendations</h3>
                                <div className="recommendations-grid">
                                    {balancingRecommendations.slice(0, 8).map((rec, idx) => (
                                        <div key={idx} className={`recommendation-card ${rec.priority}`}>
                                            <div className="rec-header">
                                                <h4>Substitute Suggestion</h4>
                                                {rec.priority === 'high' && <span className="priority-badge">HIGH PRIORITY</span>}
                                            </div>
                                            <p>
                                                Replace some usage of <strong>{rec.from.name}</strong> ({rec.from.usageCount} uses)
                                                with <strong>{rec.to.name}</strong> ({rec.to.usageCount} uses)
                                            </p>
                                            <div className="rec-reason">
                                                <small>{rec.reason}</small>
                                            </div>
                                            <div className="rec-actions">
                                                <button
                                                    className="btn-small"
                                                    onClick={() => initiateSwap(rec.from, rec.to)}
                                                >
                                                    Apply Suggestion
                                                </button>
                                                {rec.to.isManuallyFlagged && (
                                                    <button
                                                        className="btn-small btn-success"
                                                        onClick={() => markAsCompleted(rec.to.name)}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="top-resources">
                            <div className="top-section">
                                <h3>🚫 All Unused Resources (Basic Resources, Components, Ingredients)</h3>
                                <p className="section-description">
                                    Complete list of all resources with 0 usage across all types
                                </p>
                                <div className="resource-list">
                                    {(() => {
                                        // Collect ALL unused resources from all categories
                                        const allUnusedResources = [
                                            ...Array.from(usageAnalysis.raw.values()).filter(r => r.usageCount === 0),
                                            ...Array.from(usageAnalysis.components.values()).filter(r => r.usageCount === 0),
                                            ...Array.from(usageAnalysis.ingredients.values()).filter(r => r.usageCount === 0)
                                        ];

                                        // Sort by type then by name for better organization
                                        allUnusedResources.sort((a, b) => {
                                            if (a.type !== b.type) {
                                                const typeOrder = { 'BASIC RESOURCE': 1, 'COMPONENT': 2, 'INGREDIENT': 3 };
                                                return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
                                            }
                                            return a.name.localeCompare(b.name);
                                        });

                                        return allUnusedResources.map(resource => (
                                            <div key={resource.name} className="resource-item unused-component">
                                                <span className="resource-name">{resource.name}</span>
                                                <span className="usage-count">0 uses</span>
                                                <span className="resource-type">{resource.type}</span>
                                                <span className="tier-info">T{resource.tier}</span>
                                                <div className="resource-actions">
                                                    <button
                                                        className="btn-small btn-warning"
                                                        onClick={() => {
                                                            // Navigate to appropriate tab based on type
                                                            if (resource.type === 'BASIC RESOURCE') {
                                                                setActiveTab('raw');
                                                            } else if (resource.type === 'COMPONENT') {
                                                                setActiveTab('components');
                                                            } else {
                                                                setActiveTab('ingredients');
                                                            }
                                                            setBalancingMode('unused');
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        className="btn-small btn-info"
                                                        onClick={() => toggleManualFlag(resource.name)}
                                                    >
                                                        Flag for Review
                                                    </button>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                    {(() => {
                                        const totalUnused = [
                                            ...Array.from(usageAnalysis.raw.values()).filter(r => r.usageCount === 0),
                                            ...Array.from(usageAnalysis.components.values()).filter(r => r.usageCount === 0),
                                            ...Array.from(usageAnalysis.ingredients.values()).filter(r => r.usageCount === 0)
                                        ].length;

                                        if (totalUnused === 0) {
                                            return (
                                                <div className="no-unused-components">
                                                    <span>✅ All resources are being used in recipes!</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="unused-summary">
                                                    <span>📊 Total unused resources: {totalUnused}</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>

                            <div className="top-section">
                                <h3>❌ Missing Ingredients</h3>
                                <p className="section-description">
                                    Complete list of ingredients referenced in recipes but not defined as individual components in the CSV
                                </p>
                                <div className="resource-list">
                                    {missingIngredients
                                        .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name)) // Sort by usage count (highest first), then by name
                                        .map(ingredient => (
                                            <div key={ingredient.name} className="resource-item missing-ingredient">
                                                <span className="resource-name">{ingredient.name}</span>
                                                <span className="usage-count">{ingredient.usageCount} references</span>
                                                <span className="resource-type">MISSING</span>
                                                <div className="resource-actions">
                                                    <button
                                                        className="btn-small btn-warning"
                                                        onClick={() => {
                                                            console.log('Missing ingredient details:', ingredient);
                                                            alert(`"${ingredient.name}" is used in ${ingredient.usageCount} recipes:\n\n${ingredient.usedInRecipes.map(r => `• ${r.recipeName} (${r.recipeType}) - Slot ${r.slot}`).join('\n')}`);
                                                        }}
                                                        title="Show which recipes use this missing ingredient"
                                                    >
                                                        Show Usage
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    {missingIngredients.length === 0 ? (
                                        <div className="no-missing-ingredients">
                                            <span>✅ All referenced ingredients exist as individual components!</span>
                                        </div>
                                    ) : (
                                        <div className="missing-summary">
                                            <span>📊 Total missing ingredients: {missingIngredients.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="top-section">
                                <h3>⚠️ Manually Flagged Resources</h3>
                                <p className="section-description">
                                    Complete list of all manually flagged resources across all types
                                </p>
                                <div className="resource-list">
                                    {[...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                        .filter(r => r.isManuallyFlagged && !r.isCompleted)
                                        .sort((a, b) => {
                                            // Sort by type then by name for better organization
                                            if (a.type !== b.type) {
                                                const typeOrder = { 'BASIC RESOURCE': 1, 'COMPONENT': 2, 'INGREDIENT': 3 };
                                                return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
                                            }
                                            return a.name.localeCompare(b.name);
                                        })
                                        .map(resource => (
                                            <div key={resource.name} className="resource-item flagged">
                                                <span className="resource-name">{resource.name}</span>
                                                <span className="usage-count">{resource.usageCount} uses</span>
                                                <span className="resource-type">{resource.type}</span>
                                                <div className="resource-actions">
                                                    <button
                                                        className="btn-small btn-success"
                                                        onClick={() => markAsCompleted(resource.name)}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                    <button
                                                        className="btn-small btn-danger"
                                                        onClick={() => toggleManualFlag(resource.name)}
                                                    >
                                                        Remove Flag
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="top-section">
                                <h3>✅ Completed Resources</h3>
                                <p className="section-description">
                                    Complete list of all marked-as-completed resources across all types
                                </p>
                                <div className="resource-list">
                                    {[...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                        .filter(r => r.isCompleted)
                                        .sort((a, b) => {
                                            // Sort by type then by name for better organization
                                            if (a.type !== b.type) {
                                                const typeOrder = { 'BASIC RESOURCE': 1, 'COMPONENT': 2, 'INGREDIENT': 3 };
                                                return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
                                            }
                                            return a.name.localeCompare(b.name);
                                        })
                                        .map(resource => (
                                            <div key={resource.name} className="resource-item completed">
                                                <span className="resource-name">{resource.name}</span>
                                                <span className="usage-count">{resource.usageCount} uses</span>
                                                <span className="resource-type">{resource.type}</span>
                                                <button
                                                    className="btn-small"
                                                    onClick={() => unmarkCompleted(resource.name)}
                                                >
                                                    Reopen
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab !== 'overview' && (
                    <div className="balancing-section">
                        <div className="section-header">
                            <h3>{balancingMode.replace('-', ' ').toUpperCase()} Resources ({filteredResources.length})</h3>
                        </div>

                        <div className="resources-grid">
                            {filteredResources.map(resource => (
                                <div key={resource.name} className={`resource-card ${balancingMode} ${resource.isManuallyFlagged ? 'flagged' : ''} ${resource.isCompleted ? 'completed' : ''} ${resource.isUnusedComponent ? 'unused-component' : ''} ${resource.isUnusedIngredient ? 'unused-ingredient' : ''}`}>
                                    <div className="resource-header">
                                        <div className="resource-title">
                                            <input
                                                type="checkbox"
                                                checked={selectedResources.has(resource.name)}
                                                onChange={(e) => handleResourceSelection(resource.name, e.target.checked)}
                                                className="resource-checkbox"
                                            />
                                            <h4>{resource.name}</h4>
                                        </div>
                                        <div className="resource-badges">
                                            <span className="tier-badge">T{resource.tier}</span>
                                            {resource.isManuallyFlagged && <span className="flag-badge">⚠️</span>}
                                            {resource.isCompleted && <span className="complete-badge">✅</span>}
                                            {resource.isUnusedComponent && <span className="unused-component-badge" title="Unused Component - Not used in any ingredient recipes">🔧❌</span>}
                                            {resource.isUnusedIngredient && <span className="unused-ingredient-badge" title="Unused Ingredient - Only used in non-final ship components">🧪❌</span>}
                                        </div>
                                    </div>

                                    <div className="resource-stats">
                                        <div className="stat">
                                            <span className="label">Usage:</span>
                                            <span className="value">{resource.usageCount} recipes</span>
                                        </div>
                                        <div className="stat">
                                            <span className="label">Type:</span>
                                            <span className="value">{resource.resourceType}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="label">Category:</span>
                                            <span className="value">{resource.usageCategory}</span>
                                        </div>
                                        {calculatedEffects.has(resource.name) && (
                                            <div className="stat effect-stat">
                                                <span className="label">Total Effect:</span>
                                                <span className="value effect-value">
                                                    ⚡{calculatedEffects.get(resource.name).totalEffect}
                                                    <span className="multiplier">
                                                        (×{calculatedEffects.get(resource.name).effectMetrics.effectMultiplier})
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                        {calculatingEffects.has(resource.name) && (
                                            <div className="stat calculating-stat">
                                                <span className="label">Calculating:</span>
                                                <span className="value">
                                                    <div className="spinner-small"></div>
                                                    Computing effect...
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {resource.usageCount > 0 && (
                                        <div className="usage-details">
                                            <summary>Used in {resource.usageCount} recipes</summary>
                                            <div className="recipe-list">
                                                {resource.usedInRecipes.slice(0, 5).map((usage, idx) => (
                                                    <div key={idx} className="recipe-usage">
                                                        {usage.recipeName} (x{usage.quantity})
                                                    </div>
                                                ))}
                                                {resource.usedInRecipes.length > 5 && (
                                                    <div className="more-recipes">
                                                        +{resource.usedInRecipes.length - 5} more...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {resource.isUnusedComponent && resource.usageCount === 0 && (
                                        <div className="unused-component-notice">
                                            <div className="notice-header">
                                                <span className="notice-icon">🔧❌</span>
                                                <strong>Unused Component</strong>
                                            </div>
                                            <div className="notice-message">
                                                This component is not used in any ingredient recipes. Consider removing it from the system or finding ways to integrate it into existing recipes.
                                            </div>
                                        </div>
                                    )}

                                    <div className="resource-actions">
                                        <button
                                            className="btn-secondary"
                                            onClick={() => setSelectedResource(resource)}
                                        >
                                            View Details
                                        </button>

                                        <button
                                            className={`btn-info ${calculatingEffects.has(resource.name) ? 'calculating' : ''}`}
                                            onClick={() => calculateSingleResourceEffect(resource.name)}
                                            disabled={calculatingEffects.has(resource.name)}
                                            title={calculatingEffects.has(resource.name) ?
                                                "Calculating effect..." :
                                                calculatedEffects.has(resource.name) ?
                                                    "Recalculate effect" :
                                                    "Calculate total production chain effect"}
                                        >
                                            {calculatingEffects.has(resource.name) ? (
                                                <>
                                                    <div className="spinner-small"></div>
                                                    Calculating...
                                                </>
                                            ) : calculatedEffects.has(resource.name) ? (
                                                "🧮 Recalculate Effect"
                                            ) : (
                                                "🧮 Calculate Effect"
                                            )}
                                        </button>

                                        {!resource.isManuallyFlagged ? (
                                            <button
                                                className="btn-warning"
                                                onClick={() => toggleManualFlag(resource.name)}
                                            >
                                                Flag for Increase
                                            </button>
                                        ) : (
                                            <div className="flag-actions">
                                                {!resource.isCompleted ? (
                                                    <button
                                                        className="btn-success"
                                                        onClick={() => markAsCompleted(resource.name)}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => unmarkCompleted(resource.name)}
                                                    >
                                                        Reopen
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-danger"
                                                    onClick={() => toggleManualFlag(resource.name)}
                                                >
                                                    Remove Flag
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {currentSubstitutePools.length > 0 && (
                            <>
                                {/* Multi-Pool Selector */}
                                <div className="multi-pool-selector">
                                    <div className="selector-header">
                                        <h3>🏭 Production Chain Analysis</h3>
                                        <div className="selector-controls">
                                            <span className="selection-count">
                                                {selectedPools.size} of {currentSubstitutePools.length} category + tier combinations selected
                                            </span>
                                            <button
                                                className="btn-small"
                                                onClick={() => {
                                                    const allPoolNames = new Set(currentSubstitutePools.map(p => p.name));
                                                    setSelectedPools(allPoolNames);
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                className="btn-small"
                                                onClick={() => setSelectedPools(new Set())}
                                            >
                                                Clear All
                                            </button>
                                            <button
                                                className="btn-export-multi"
                                                onClick={() => exportMultiPoolAnalysis(Array.from(selectedPools))}
                                                disabled={selectedPools.size === 0}
                                                title={selectedPools.size === 0 ?
                                                    "Select component categories + tiers to enable production chain analysis export" :
                                                    `Export production chain analysis for ${selectedPools.size} selected category + tier combinations`}
                                            >
                                                🏭 Export Production Chain Analysis ({selectedPools.size})
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pool-checkboxes">
                                        {currentSubstitutePools.map((pool, idx) => (
                                            <label key={idx} className="pool-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPools.has(pool.name)}
                                                    onChange={(e) => handlePoolSelection(pool.name, e.target.checked)}
                                                />
                                                <div className="pool-selection-info">
                                                    <span className="pool-name">{pool.name}</span>
                                                    <span className="pool-summary">
                                                        {pool.resources.length} ingredients •
                                                        Avg: {Math.round(pool.averageUsage)} uses •
                                                        Missing chains: {pool.resources.filter(r => r.usageCount === 0).length} •
                                                        Available resources: {(pool.availableRawResources?.size || 0) + (pool.availableComponents?.size || 0)}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="substitute-pools">
                                    <h3>🔧 Component Category + Tier Analysis</h3>
                                    {currentSubstitutePools.map((pool, idx) => (
                                        <div key={idx} className="substitute-pool">
                                            <div className="pool-header">
                                                <h4>{pool.name}</h4>
                                                <div className="pool-actions">
                                                    <button
                                                        className="btn-info"
                                                        onClick={() => calculatePoolEffects(pool.name)}
                                                        title="Add all pool resources to calculation queue with high priority"
                                                    >
                                                        🧮 Queue Pool Effects
                                                    </button>
                                                    <button
                                                        className="btn-export-pool"
                                                        onClick={() => exportSubstitutePoolAnalysis(pool)}
                                                        title="Export detailed analysis with full effect calculations"
                                                    >
                                                        🏭 Export Production Chain Analysis
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="pool-stats">
                                                <span>Category: {pool.componentCategory || 'Unknown'}</span>
                                                <span>Tier: T{pool.tier}</span>
                                                <span>Ingredients: {pool.resources.length}</span>
                                                <span>Missing chains: {pool.resources.filter(r => r.usageCount === 0).length}</span>
                                                <span>Available raw resources: {pool.availableRawResources?.size || 0}</span>
                                                <span>Available components: {pool.availableComponents?.size || 0}</span>
                                            </div>
                                            <div className="pool-resources">
                                                {pool.resources.map(resource => (
                                                    <div key={resource.name} className="pool-resource">
                                                        <div className="resource-info">
                                                            <span className="resource-name">{resource.name}</span>
                                                            <div className="resource-metrics">
                                                                <span className="usage-badge">{resource.usageCount} direct</span>
                                                                <span className="tier-badge">T{resource.tier}</span>
                                                                <span className="type-badge">{resource.resourceType}</span>
                                                                {calculatedEffects.has(resource.name) && (
                                                                    <span className="effect-badge">
                                                                        ⚡{calculatedEffects.get(resource.name).totalEffect} total
                                                                    </span>
                                                                )}
                                                                {calculatingEffects.has(resource.name) && (
                                                                    <span className="calculating-badge">
                                                                        <div className="spinner-tiny"></div>
                                                                        Calculating...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="resource-actions">
                                                            {resource.isManuallyFlagged && (
                                                                <span className="flag-badge">⚠️</span>
                                                            )}
                                                            {resource.isCompleted && (
                                                                <span className="complete-badge">✅</span>
                                                            )}
                                                            <button
                                                                className={`calc-effect-btn ${calculatingEffects.has(resource.name) ? 'calculating' : ''}`}
                                                                onClick={() => calculateSingleResourceEffect(resource.name)}
                                                                disabled={calculatingEffects.has(resource.name)}
                                                                title={calculatingEffects.has(resource.name) ?
                                                                    "Calculating..." :
                                                                    calculatedEffects.has(resource.name) ?
                                                                        "Recalculate effect" :
                                                                        "Calculate effect for this resource"}
                                                            >
                                                                {calculatingEffects.has(resource.name) ? (
                                                                    <div className="spinner-tiny"></div>
                                                                ) : calculatedEffects.has(resource.name) ? (
                                                                    "🔄"
                                                                ) : (
                                                                    "🧮"
                                                                )}
                                                            </button>
                                                            {resource.usageCount > 0 && (
                                                                <button
                                                                    className="swap-btn"
                                                                    onClick={() => {
                                                                        // Find under-utilized substitute based on direct usage
                                                                        const substitute = pool.resources
                                                                            .filter(r => r.name !== resource.name && r.usageCount < resource.usageCount)
                                                                            .sort((a, b) => a.usageCount - b.usageCount)[0];

                                                                        if (substitute) {
                                                                            initiateSwap(resource, substitute);
                                                                        }
                                                                    }}
                                                                >
                                                                    Balance
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div className="modal-overlay" onClick={() => setSelectedResource(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedResource.name}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setSelectedResource(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-stats">
                                <div className="stat">
                                    <span className="label">Tier:</span>
                                    <span className="value">T{selectedResource.tier}</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Type:</span>
                                    <span className="value">{selectedResource.type}</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Resource Type:</span>
                                    <span className="value">{selectedResource.resourceType}</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Usage Category:</span>
                                    <span className="value">{selectedResource.usageCategory}</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Total Usage:</span>
                                    <span className="value">{selectedResource.usageCount} recipes</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Status:</span>
                                    <span className="value">
                                        {selectedResource.isCompleted ? '✅ Completed' :
                                            selectedResource.isManuallyFlagged ? '⚠️ Flagged' :
                                                '⚪ Normal'}
                                    </span>
                                </div>
                            </div>

                            {selectedResource.usageCount > 0 && (
                                <div className="usage-detail">
                                    <h4>Recipe Usage Details</h4>
                                    <div className="recipe-usage-list">
                                        {selectedResource.usedInRecipes.map((usage, idx) => (
                                            <div key={idx} className="recipe-usage-item">
                                                <span className="recipe-name">{usage.recipeName}</span>
                                                <span className="recipe-type">{usage.recipeType}</span>
                                                <span className="usage-quantity">Slot {usage.slot} (x{usage.quantity})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Resource Swapper Modal */}
            {showSwapModal && (
                <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔄 Enhanced Resource Swapper</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowSwapModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="swap-controls">
                                <div className="resource-selectors">
                                    <div className="selector-group">
                                        <label>Swap FROM Resource:</label>
                                        <select
                                            value={swapFromResource}
                                            onChange={(e) => handleFromResourceChange(e.target.value)}
                                            className="resource-select"
                                        >
                                            <option value="">Select resource to replace...</option>
                                            {availableFromResources.map(resource => (
                                                <option key={resource.name} value={resource.name}>
                                                    {resource.name} (T{resource.tier}, {resource.usageCount} uses)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="selector-group">
                                        <label>Swap TO Resource:</label>
                                        <select
                                            value={swapToResource}
                                            onChange={(e) => setSwapToResource(e.target.value)}
                                            className="resource-select"
                                            disabled={!swapFromResource}
                                        >
                                            <option value="">Select replacement resource...</option>
                                            {availableToResources.map(resource => (
                                                <option key={resource.name} value={resource.name}>
                                                    {resource.name} (T{resource.tier}, {resource.usageCount} uses)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {swapFromResource && affectedRecipesForSwap.length > 0 && (
                                    <div className="affected-recipes-section">
                                        <h4>Select Recipes to Update ({affectedRecipesForSwap.length} total)</h4>
                                        <div className="recipe-selection-controls">
                                            <button
                                                className="btn-small"
                                                onClick={() => {
                                                    const allRecipeIds = new Set(affectedRecipesForSwap.map(r => `${r.recipeName}-${r.slot}`));
                                                    setSelectedRecipesToSwap(allRecipeIds);
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                className="btn-small"
                                                onClick={() => setSelectedRecipesToSwap(new Set())}
                                            >
                                                Clear All
                                            </button>
                                            <span className="selection-count">
                                                {selectedRecipesToSwap.size} of {affectedRecipesForSwap.length} selected
                                            </span>
                                        </div>

                                        <div className="recipes-grid">
                                            {affectedRecipesForSwap.map((recipe, idx) => {
                                                const recipeId = `${recipe.recipeName}-${recipe.slot}`;
                                                const isSelected = selectedRecipesToSwap.has(recipeId);
                                                return (
                                                    <div key={idx} className={`recipe-swap-item ${isSelected ? 'selected' : ''}`}>
                                                        <label className="recipe-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => handleRecipeSwapSelection(recipeId, e.target.checked)}
                                                            />
                                                            <div className="recipe-info">
                                                                <div className="recipe-name">{recipe.recipeName}</div>
                                                                <div className="recipe-details">
                                                                    <span className="recipe-type">{recipe.recipeType}</span>
                                                                    <span className="ingredient-slot">Slot {recipe.slot}</span>
                                                                    <span className="quantity">x{recipe.quantity}</span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {!swapFromResource && (
                                    <div className="no-selection">
                                        <p>Select a resource to see which recipes use it</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowSwapModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={executeSelectiveSwap}
                                disabled={!swapFromResource || !swapToResource || selectedRecipesToSwap.size === 0}
                            >
                                Swap in {selectedRecipesToSwap.size} Recipes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Storage Modal */}
            {showClearStorageModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2>Clear Local Storage</h2>
                        <p>This will clear all locally stored data from the Recipe Manager application.</p>

                        <div className="storage-info">
                            <h3>Storage Analysis</h3>
                            <div className="storage-summary">
                                <p><strong>Total Data:</strong> {storageInfo.totals?.sizeFormatted}</p>
                                <p><strong>Total Items:</strong> {storageInfo.totals?.itemCount}</p>
                                <p><strong>Storage Keys:</strong> {storageInfo.totals?.keysWithData} of 5</p>
                            </div>

                            <div className="storage-details">
                                <h4>What will be cleared:</h4>
                                {Object.entries(storageInfo).filter(([key]) => key !== 'totals').map(([key, info]) => (
                                    <div key={key} className={`storage-item ${info.exists ? 'has-data' : 'no-data'}`}>
                                        <div className="storage-item-header">
                                            <strong>{key}</strong>
                                            <span className="storage-size">{info.sizeFormatted}</span>
                                        </div>
                                        <div className="storage-item-details">
                                            <p>{info.description}</p>
                                            {info.exists && (
                                                <p><strong>Items:</strong> {info.itemCount}</p>
                                            )}
                                            {info.error && (
                                                <p className="error-text">⚠️ {info.error}</p>
                                            )}
                                            {!info.exists && (
                                                <p className="no-data-text">No data stored</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="warning-box">
                                <h4>⚠️ Warning</h4>
                                <p>This action will:</p>
                                <ul>
                                    <li>Remove all saved recipe modifications</li>
                                    <li>Clear Resource Balancer settings and flags</li>
                                    <li>Delete generated buildings and building recipes</li>
                                    <li>Reset all manual configurations</li>
                                    <li>Reload the page to refresh data from CSV files</li>
                                </ul>
                                <p><strong>This action cannot be undone.</strong></p>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowClearStorageModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={clearAllLocalStorage}
                                style={{
                                    backgroundColor: '#dc3545',
                                    borderColor: '#dc3545'
                                }}
                            >
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceBalancer; 