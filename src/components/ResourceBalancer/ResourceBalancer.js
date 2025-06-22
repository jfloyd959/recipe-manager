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
                        isCompleted: completedResources.has(ingredientName)
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
                    isCompleted: completedResources.has(outputName)
                });
            }
        });

        return analysis;
    }, [allRecipes, manuallyFlagged, completedResources]);

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

    // Generate substitute pools based on similar characteristics
    const generateSubstitutePools = (category) => {
        const categoryKey = getCategoryKey(category);
        if (!usageAnalysis[categoryKey]) return [];

        const resources = Array.from(usageAnalysis[categoryKey].values());
        const pools = {};

        // Group by similar characteristics (tier group, resource type, usage category)
        resources.forEach(resource => {
            const getTierGroup = (tier) => {
                if (tier >= 1 && tier <= 3) return 'T1-3';
                if (tier >= 4 && tier <= 5) return 'T4-5';
                return `T${tier}`;
            };

            const tierGroup = getTierGroup(resource.tier);
            const poolKey = `${tierGroup}-${resource.resourceType}-${resource.usageCategory}`;

            if (!pools[poolKey]) {
                pools[poolKey] = {
                    name: `${tierGroup} ${resource.resourceType} (${resource.usageCategory})`,
                    tierGroup: tierGroup,
                    resourceType: resource.resourceType,
                    usageCategory: resource.usageCategory,
                    resources: [],
                    averageUsage: 0,
                    totalUsage: 0
                };
            }

            pools[poolKey].resources.push(resource);
            pools[poolKey].totalUsage += resource.usageCount;
        });

        // Calculate averages and filter pools
        Object.values(pools).forEach(pool => {
            pool.averageUsage = pool.totalUsage / pool.resources.length;
        });

        return Object.values(pools).filter(pool => pool.resources.length > 1);
    };

    // Get resources by balancing status
    const getResourcesByStatus = (category, status) => {
        const categoryKey = getCategoryKey(category);
        if (!usageAnalysis[categoryKey]) return [];

        const resources = Array.from(usageAnalysis[categoryKey].values());

        switch (status) {
            case 'unused':
                return resources.filter(r => r.usageCount === 0);
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

    // Multi-pool export function
    const exportMultiPoolAnalysis = (selectedPoolNames) => {
        console.log(`Exporting multi-pool analysis for: ${selectedPoolNames.join(', ')}`);
        const timestamp = new Date().toISOString().split('T')[0];

        // Get all pools for the current category
        const allPools = generateSubstitutePools(activeTab);
        const selectedPoolObjects = allPools.filter(pool => selectedPoolNames.includes(pool.name));

        if (selectedPoolObjects.length === 0) {
            alert('No valid pools selected for export.');
            return;
        }

        // Combine all resources from selected pools
        const allResources = [];
        const poolSummaries = [];

        selectedPoolObjects.forEach(pool => {
            poolSummaries.push({
                name: pool.name,
                tierGroup: pool.tierGroup,
                resourceType: pool.resourceType,
                usageCategory: pool.usageCategory,
                totalResources: pool.resources.length,
                averageUsage: pool.averageUsage,
                totalUsage: pool.totalUsage
            });

            // Add all resources with pool identification
            pool.resources.forEach(resource => {
                allResources.push({
                    ...resource,
                    poolName: pool.name,
                    poolTierGroup: pool.tierGroup
                });
            });
        });

        // Create comprehensive markdown content
        const sections = [];

        // Multi-Pool Summary Section
        sections.push('# 📦 Multi-Pool Substitute Analysis Report\n');
        sections.push(`**Selected Pools:** ${selectedPoolNames.length}`);
        sections.push(`**Total Resources Analyzed:** ${allResources.length}`);
        sections.push(`**Report Date:** ${timestamp}\n`);
        sections.push('---\n');

        // Pool Summaries Section
        sections.push('## 📋 Pool Summaries\n');
        sections.push('| Pool Name | Tier Group | Resource Type | Usage Category | Total Resources | Average Usage | Total Pool Usage |');
        sections.push('|-----------|------------|---------------|----------------|----------------|---------------|------------------|');
        poolSummaries.forEach(pool => {
            sections.push(`| ${pool.name} | ${pool.tierGroup} | ${pool.resourceType} | ${pool.usageCategory} | ${pool.totalResources} | ${Math.round(pool.averageUsage)} | ${pool.totalUsage} |`);
        });
        sections.push('');

        // Combined Resource Analysis Section
        sections.push('## 🔍 Cross-Pool Resource Analysis\n');
        sections.push('| Resource Name | Pool Name | Tier Group | Tier | Direct Usage | Total Effect | Effect Multiplier | Status | Flagged | Completed | Cross Pool Opportunities |');
        sections.push('|---------------|-----------|------------|------|--------------|--------------|-------------------|--------|---------|-----------|-------------------------|');

        // Sort resources by usage count to identify cross-pool balancing opportunities
        allResources.sort((a, b) => b.usageCount - a.usageCount);

        allResources.forEach(resource => {
            // Look for balancing opportunities across pools
            const sameTypeResources = allResources.filter(r =>
                r.name !== resource.name &&
                r.resourceType === resource.resourceType &&
                r.usageCategory === resource.usageCategory &&
                Math.abs(r.tier - resource.tier) <= 1 // Similar tier
            );

            const balanceOpportunities = sameTypeResources.filter(r =>
                Math.abs(r.usageCount - resource.usageCount) > 5
            ).length;

            const effectData = calculatedEffects.get(resource.name);
            const status = resource.isCompleted ? '✅ COMPLETED' : resource.isManuallyFlagged ? '⚠️ FLAGGED' : '⚪ NORMAL';
            const flagged = resource.isManuallyFlagged ? '✅' : '❌';
            const completed = resource.isCompleted ? '✅' : '❌';

            sections.push(`| ${resource.name} | ${resource.poolName} | ${resource.poolTierGroup} | ${resource.tier} | ${resource.usageCount} | ${effectData ? effectData.totalEffect : 'Not Calculated'} | ${effectData ? effectData.effectMetrics.effectMultiplier : 'Not Calculated'} | ${status} | ${flagged} | ${completed} | ${balanceOpportunities} |`);
        });
        sections.push('');

        // Cross-Pool Balancing Opportunities
        sections.push('## ⚖️ Cross-Pool Balancing Opportunities\n');
        sections.push('| High Usage Resource | Low Usage Resource | Usage Difference | High Pool | Low Pool | Same Type | Potential Swaps |');
        sections.push('|--------------------|-------------------|------------------|-----------|----------|-----------|----------------|');

        const balancingOpportunities = [];
        allResources.forEach(highResource => {
            if (highResource.usageCount > 10) {
                const candidates = allResources.filter(lowResource =>
                    lowResource.name !== highResource.name &&
                    lowResource.usageCount < highResource.usageCount - 5 &&
                    lowResource.resourceType === highResource.resourceType &&
                    lowResource.usageCategory === highResource.usageCategory &&
                    lowResource.poolName !== highResource.poolName // Different pools
                );

                candidates.forEach(lowResource => {
                    balancingOpportunities.push({
                        high: highResource,
                        low: lowResource,
                        difference: highResource.usageCount - lowResource.usageCount,
                        potentialSwaps: Math.floor((highResource.usageCount - lowResource.usageCount) / 2)
                    });
                });
            }
        });

        // Sort by potential impact
        balancingOpportunities.sort((a, b) => b.difference - a.difference);
        balancingOpportunities.slice(0, 20).forEach(opp => { // Top 20 opportunities
            sections.push(`| ${opp.high.name} | ${opp.low.name} | ${opp.difference} | ${opp.high.poolName} | ${opp.low.poolName} | ✅ YES | ${opp.potentialSwaps} |`);
        });

        if (balancingOpportunities.length === 0) {
            sections.push('| No cross-pool balancing opportunities found | - | - | - | - | - | - |');
        }
        sections.push('');

        // Pool Utilization Comparison
        sections.push('## 📊 Pool Utilization Comparison\n');
        sections.push('| Pool Name | Total Resources | Under-utilized (<5) | Well-utilized (5-20) | Over-utilized (>20) | Unused (0) | Average Usage |');
        sections.push('|-----------|----------------|-------------------|-------------------|-------------------|------------|---------------|');
        poolSummaries.forEach(pool => {
            const poolResources = allResources.filter(r => r.poolName === pool.name);
            const underUtilized = poolResources.filter(r => r.usageCount > 0 && r.usageCount < 5).length;
            const wellUtilized = poolResources.filter(r => r.usageCount >= 5 && r.usageCount <= 20).length;
            const overUtilized = poolResources.filter(r => r.usageCount > 20).length;
            const unused = poolResources.filter(r => r.usageCount === 0).length;

            sections.push(`| ${pool.name} | ${pool.totalResources} | ${underUtilized} | ${wellUtilized} | ${overUtilized} | ${unused} | ${Math.round(pool.averageUsage)} |`);
        });
        sections.push('');

        // Detailed Recipe Usage (Deduplicated)
        sections.push('## 🧪 Detailed Recipe Usage\n');
        sections.push('*Showing all resources from selected pools used in each recipe (deduplicated)*\n');
        sections.push('| Recipe Name | Recipe Type | Resource Name | Pool Name | Ingredient Slot | Quantity | Resource Usage Count | Total Effect |');
        sections.push('|-------------|-------------|---------------|-----------|----------------|----------|-------------------|--------------|');

        // Create a map to deduplicate recipes and show all resources they use from selected pools
        const recipeUsageMap = new Map();

        allResources.forEach(resource => {
            if (resource.usedInRecipes && resource.usedInRecipes.length > 0) {
                resource.usedInRecipes.forEach(usage => {
                    const recipeKey = `${usage.recipeName}`;

                    if (!recipeUsageMap.has(recipeKey)) {
                        recipeUsageMap.set(recipeKey, {
                            recipeName: usage.recipeName,
                            recipeType: usage.recipeType || '',
                            resourceUsages: []
                        });
                    }

                    const effectData = calculatedEffects.get(resource.name);

                    recipeUsageMap.get(recipeKey).resourceUsages.push({
                        resourceName: resource.name,
                        poolName: resource.poolName,
                        slot: usage.slot || '',
                        quantity: usage.quantity || 1,
                        resourceUsageCount: resource.usageCount,
                        totalEffect: effectData ? effectData.totalEffect : 'Not Calculated'
                    });
                });
            }
        });

        // Sort recipes by name for consistent output
        const sortedRecipes = Array.from(recipeUsageMap.values()).sort((a, b) =>
            a.recipeName.localeCompare(b.recipeName)
        );

        sortedRecipes.forEach(recipe => {
            // Sort resource usages within each recipe by slot, then by resource name
            recipe.resourceUsages.sort((a, b) => {
                const slotA = parseInt(a.slot) || 999;
                const slotB = parseInt(b.slot) || 999;
                if (slotA !== slotB) return slotA - slotB;
                return a.resourceName.localeCompare(b.resourceName);
            });

            recipe.resourceUsages.forEach(usage => {
                sections.push(`| ${recipe.recipeName} | ${recipe.recipeType} | ${usage.resourceName} | ${usage.poolName} | ${usage.slot} | ${usage.quantity} | ${usage.resourceUsageCount} | ${usage.totalEffect} |`);
            });
        });
        sections.push('');

        // Recipe Substitution Opportunities
        sections.push('## 🔄 Recipe Substitution Opportunities\n');
        sections.push('*Recipes using multiple similar resources that could be balanced*\n');
        sections.push('| Recipe Name | Current Resources Used | Potential Substitution | Estimated Swaps | Balance Impact |');
        sections.push('|-------------|----------------------|----------------------|----------------|----------------|');

        let hasSubstitutionOpportunities = false;

        sortedRecipes.forEach(recipe => {
            const currentResources = recipe.resourceUsages;
            if (currentResources.length > 1) {
                // Look for substitution opportunities within this recipe
                const resourcesByType = {};
                currentResources.forEach(usage => {
                    const resource = allResources.find(r => r.name === usage.resourceName);
                    if (resource) {
                        const key = `${resource.resourceType}-${resource.usageCategory}`;
                        if (!resourcesByType[key]) resourcesByType[key] = [];
                        resourcesByType[key].push(usage);
                    }
                });

                // Find groups where multiple similar resources are used
                Object.entries(resourcesByType).forEach(([type, usages]) => {
                    if (usages.length > 1) {
                        const highUsage = usages.sort((a, b) => b.resourceUsageCount - a.resourceUsageCount)[0];
                        const lowUsage = usages.sort((a, b) => a.resourceUsageCount - b.resourceUsageCount)[0];

                        if (highUsage.resourceUsageCount > lowUsage.resourceUsageCount + 3) {
                            hasSubstitutionOpportunities = true;
                            const potentialSwaps = Math.floor((highUsage.resourceUsageCount - lowUsage.resourceUsageCount) / 2);
                            const resourcesList = usages.map(u => u.resourceName).join(', ');
                            const substitution = `Replace ${highUsage.resourceName} with ${lowUsage.resourceName}`;
                            const balanceImpact = `High: ${highUsage.resourceUsageCount} → Low: ${lowUsage.resourceUsageCount}`;

                            sections.push(`| ${recipe.recipeName} | ${resourcesList} | ${substitution} | ${potentialSwaps} | ${balanceImpact} |`);
                        }
                    }
                });
            }
        });

        if (!hasSubstitutionOpportunities) {
            sections.push('| No substitution opportunities found | - | - | - | - |');
        }

        const markdownContent = sections.join('\n');
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        const fileName = `multi_pool_analysis_${selectedPoolNames.length}_pools_${timestamp}.md`;
        link.setAttribute('download', fileName);

        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Multi-pool analysis exported: ${fileName}`);
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
                    <button className="btn-warning" onClick={exportBalancingReport}>
                        📋 Export Balancing Report
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
                                    <div>Under-utilized: {getResourcesByStatus('ingredients', 'under-utilized').length}</div>
                                    <div>Over-utilized: {getResourcesByStatus('ingredients', 'over-utilized').length}</div>
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
                                <h3>⚠️ Manually Flagged Resources</h3>
                                <div className="resource-list">
                                    {[...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                        .filter(r => r.isManuallyFlagged && !r.isCompleted)
                                        .slice(0, 10)
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
                                <div className="resource-list">
                                    {[...usageAnalysis.raw.values(), ...usageAnalysis.components.values(), ...usageAnalysis.ingredients.values()]
                                        .filter(r => r.isCompleted)
                                        .slice(0, 10)
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
                                <div key={resource.name} className={`resource-card ${balancingMode} ${resource.isManuallyFlagged ? 'flagged' : ''} ${resource.isCompleted ? 'completed' : ''}`}>
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
                                        <h3>📦 Multi-Pool Analysis</h3>
                                        <div className="selector-controls">
                                            <span className="selection-count">
                                                {selectedPools.size} of {currentSubstitutePools.length} pools selected
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
                                                    "Select pools to enable multi-pool export" :
                                                    `Export combined analysis for ${selectedPools.size} selected pools`}
                                            >
                                                📊 Export Multi-Pool Analysis ({selectedPools.size})
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
                                                        {pool.resources.length} resources •
                                                        Avg: {Math.round(pool.averageUsage)} uses •
                                                        Effects: {pool.resources.filter(r => calculatedEffects.has(r.name)).length}/{pool.resources.length}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="substitute-pools">
                                    <h3>🔄 Individual Pool Analysis</h3>
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
                                                        📊 Export Pool Analysis
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="pool-stats">
                                                <span>Average Usage: {Math.round(pool.averageUsage)}</span>
                                                <span>Total Usage: {pool.totalUsage}</span>
                                                <span>Resources: {pool.resources.length}</span>
                                                <span>Tier Range: {Math.min(...pool.resources.map(r => r.tier))}-{Math.max(...pool.resources.map(r => r.tier))}</span>
                                                <span>Effects calculated: {pool.resources.filter(r => calculatedEffects.has(r.name)).length}/{pool.resources.length}</span>
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
        </div>
    );
};

export default ResourceBalancer; 