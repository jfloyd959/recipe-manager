import React, { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../../context/RecipeContext';
import ComponentMetricsAnalyzer from '../ComponentMetricsAnalyzer/ComponentMetricsAnalyzer';
import './PreferredResourceSelector.css';

const PreferredResourceSelector = () => {
    const { recipes, state } = useRecipes();
    const [selectedPlanet, setSelectedPlanet] = useState('Oceanic Planet'); // Set default planet
    const [buildingResourceTier, setBuildingResourceTier] = useState(1);
    const [buildingTier, setBuildingTier] = useState(1);
    const [selectedResources, setSelectedResources] = useState([]);
    const [filterTheme, setFilterTheme] = useState('all');
    const [showNewComponents, setShowNewComponents] = useState(false);
    const [savedPreferences, setSavedPreferences] = useState([]);
    const [componentMetrics, setComponentMetrics] = useState([]);
    const [showMetrics, setShowMetrics] = useState(true);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [jsonTextInput, setJsonTextInput] = useState('');
    const [parsedPreferenceSets, setParsedPreferenceSets] = useState([]);
    const [showPreferenceSelector, setShowPreferenceSelector] = useState(false);
    const [showBulkExport, setShowBulkExport] = useState(false);
    const [bulkExportPlanet, setBulkExportPlanet] = useState('Terrestrial Planet');

    // Planet types from the system
    const planetTypes = [
        'Oceanic Planet',
        'Volcanic Planet',
        'Terrestrial Planet',
        'Barren Planet',
        'Dark Planet',
        'Ice Giant',
        'Gas Giant',
        'System Asteroid Belt'
    ];

    // Components that should NEVER be used in building recipes
    const bannedBuildingComponents = new Set([
        // Weapon/Ammo components
        'Blast Charges',
        'Ammo Control Core',
        'Beam Interface Core',
        'Beam Emitter',
        'Field Harmonizer',
        'Signal Booster',
        'Emergency Suppressant',
        'Interference Shield',
        'Thrust Modulator',
        'Explosive Compound',
        'Explosive Core',
        'Incendiary Mix',
        'Thermal Charges',
        'Precision Detonator',

        // Ship-specific systems
        'Control System Core',
        'Coordination Matrix',
        'Emergency Matrix Core',
        'Crystal Lattice MUD',
        'Crystal Lattice ONI',
        'Crystal Lattice Ustur',
        'Drive Assembly Core',
        'Launch Platform Core',
        'Jasphorus Propulsion Core',
        'Kinetic Opal Core',
        'Phase Drive Core',
        'Warp Coils',
        'Subspace Coils',

        // Ship cooling/power systems
        'Coolant Circulator',
        'Cooling Network Hub',
        'Cryogenic Core',
        'Neural Networks',

        // Defense/Countermeasure systems
        'Shield Generator',
        'Defense Matrix',
        'Countermeasure System',
        'Decoy System',
        'Flare Dispenser',
        'Mine Layer',

        // Weapon-specific components
        'Weapon Catalyst',
        'Weapon Amplifier',
        'Weapon Frame',
        'Advanced Weapon Core',
        'Kinetic Amplifier',
        'Photon Emitters',
        'Scatter Pattern Generator',
        'Pressure Wave Generator',

        // Production steps > 2 (complex components)
        'Electronics',
        'Dispersal Mechanism',
        'Dispersal Gas Mix',
        'Dimensional Stabilizer',
        'Command Module',
        'Energy Focuser'
    ]);

    // Preferred components for buildings (structural, utility, basic materials)
    const preferredBuildingComponents = new Set([
        // Structural
        'Framework',
        'Aerogel',
        'Alloy Frame',
        'Base Structure',
        'Barrier Material',
        'Bio Framework',
        'Bio Stabilizer',
        'Structural Joint',
        'Structural Brace',
        'Structural Anchor',
        'Load Bearing Beams',
        'Heavy Alloy',
        'Reinforcement Lattice',

        // Basic processed materials
        'Aluminum',
        'Boron',
        'Chromite Ingot',
        'Cobalt',
        'Copper',
        'Copper Wire',
        'Iron',
        'Lithium',
        'Manganese',
        'Tin',
        'Zinc',
        'Steel',
        'Gold',
        'Silver',
        'Platinum',
        'Palladium',

        // Building systems
        'Utility Core',
        'Adaptive Utility Core',
        'Assembly Control Matrix',
        'Climate Controller',
        'Coupling Interface',
        'Boron Composite',
        'Insulation Material',
        'Protective Coating',
        'Reactive Coating',

        // Power/Energy (non-weapon)
        'Capacitor Matrix Core',
        'Capacity Control Core',
        'Power Source',
        'Power Distribution Hub',
        'Energy Cells',
        'Storage Matrix',
        'Voltage Regulator',
        'Current Limiter',

        // Environmental/Life Support
        'Thermal Control Unit',
        'Temperature Regulator',
        'Heat Dissipator',
        'Heat Distribution Grid',
        'Heat Exchange Coils',
        'Heat Circulation Pipes',
        'Fire Suppressant',
        'Pressure Relief',
        'Safety Buffer',
        'Safety Shutoff',

        // Utility
        'Utility Interface',
        'Utility Conduit',
        'Transfer Lines',
        'Tank Shell',
        'Sensor Array',
        'Sensor Elements',
        'Repair Kit',
        'Medical Nanites'
    ]);

    // Filter components based on selection criteria
    const filteredComponents = useMemo(() => {
        if (!recipes || !selectedPlanet) {
            console.log('PreferredResourceSelector: No recipes or planet selected', { recipes: recipes?.length, selectedPlanet });
            return [];
        }

        console.log('PreferredResourceSelector: Filtering components', {
            totalRecipes: recipes.length,
            selectedPlanet,
            buildingResourceTier,
            buildingTier,
            sampleRecipes: recipes.slice(0, 3).map(r => ({
                name: r.OutputName || r.outputName,
                type: r.OutputType || r.outputType,
                tier: r.OutputTier || r.outputTier,
                planets: r.PlanetTypes || r.planetTypes
            }))
        });

        // Deduplicate recipes by OutputID first
        const uniqueRecipes = [];
        const seenIds = new Set();

        recipes.forEach(r => {
            const id = r.OutputID || r.outputID || r.id;
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                uniqueRecipes.push(r);
            }
        });

        console.log('PreferredResourceSelector: Unique recipes after dedup', uniqueRecipes.length);

        // Get all components and basic resources
        const availableItems = uniqueRecipes.filter(r => {
            // Handle different field names for raw resources vs components
            const outputType = r.OutputType || r.outputType || r.type;
            const outputName = r.OutputName || r.outputName || r.name;
            const outputTier = parseInt(r.OutputTier || r.outputTier || r.tier || 1);

            // Handle planetTypes which could be string or array
            let planetTypes = r.PlanetTypes || r.planetTypes || '';
            if (Array.isArray(planetTypes)) {
                planetTypes = planetTypes.join(';');
            }

            const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || 0);

            // Skip banned components
            if (bannedBuildingComponents.has(outputName)) {
                return false;
            }

            // Include basic resources (raw materials)
            if (outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE' || outputType === 'Raw Resource') {
                // Check if it's available on the selected planet or system-wide
                if (planetTypes.includes(selectedPlanet) || planetTypes === '') {
                    // Apply tier filtering
                    if (outputTier <= buildingResourceTier) {
                        return true;
                    }
                    // T4-T5 buildings can use higher tier materials
                    if (buildingTier >= 4 && outputTier <= buildingResourceTier + 1) {
                        return true;
                    }
                }
                return false;
            }

            // Include components with production steps <= 2
            if ((outputType === 'COMPONENT' || outputType === 'Component') && productionSteps <= 2) {
                // Check planet availability
                if (planetTypes.includes(selectedPlanet) || planetTypes === '') {
                    // Apply tier filtering - components cannot exceed building resource tier (except T4-T5)
                    if (outputTier <= buildingResourceTier) {
                        return true;
                    }
                    // T4-T5 buildings can use slightly higher tier components
                    if (buildingTier >= 4 && outputTier <= buildingResourceTier + 1) {
                        return true;
                    }
                }
            }

            return false;
        });

        console.log('PreferredResourceSelector: Available items before theme filter', availableItems.length);

        // Apply theme filtering
        let filtered = availableItems;
        if (filterTheme === 'preferred') {
            filtered = availableItems.filter(item => {
                const name = item.OutputName || item.outputName;
                return preferredBuildingComponents.has(name);
            });
        } else if (filterTheme === 'structural') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('frame') || name.includes('structure') ||
                    name.includes('beam') || name.includes('brace') ||
                    name.includes('anchor') || name.includes('joint') ||
                    name.includes('plate') || name.includes('plating') ||
                    name.includes('composite') || name.includes('alloy');
            });
        } else if (filterTheme === 'utility') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('utility') || name.includes('power') ||
                    name.includes('energy') || name.includes('control') ||
                    name.includes('system') || name.includes('matrix') ||
                    name.includes('core') || name.includes('module');
            });
        } else if (filterTheme === 'environmental') {
            filtered = availableItems.filter(item => {
                const name = (item.OutputName || item.outputName || '').toLowerCase();
                return name.includes('thermal') || name.includes('heat') ||
                    name.includes('cooling') || name.includes('climate') ||
                    name.includes('pressure') || name.includes('insulation') ||
                    name.includes('safety') || name.includes('fire');
            });
        } else if (filterTheme === 'raw') {
            filtered = availableItems.filter(item => {
                const outputType = item.OutputType || item.outputType;
                return outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE';
            });
        }

        // Sort by tier, then by preference, then by name
        return filtered.sort((a, b) => {
            const tierA = parseInt(a.OutputTier || a.outputTier || 1);
            const tierB = parseInt(b.OutputTier || b.outputTier || 1);
            const nameA = a.OutputName || a.outputName;
            const nameB = b.OutputName || b.outputName;
            const isPreferredA = preferredBuildingComponents.has(nameA);
            const isPreferredB = preferredBuildingComponents.has(nameB);

            // Sort by tier first
            if (tierA !== tierB) return tierA - tierB;
            // Then by preference
            if (isPreferredA && !isPreferredB) return -1;
            if (!isPreferredA && isPreferredB) return 1;
            // Finally by name
            return nameA.localeCompare(nameB);
        });
    }, [recipes, selectedPlanet, buildingResourceTier, buildingTier, filterTheme]);

    // Suggested new components (only if needed)
    const suggestedNewComponents = useMemo(() => {
        if (!showNewComponents || !selectedPlanet) return [];

        const suggestions = [];
        const planetPrefix = selectedPlanet.toLowerCase().split(' ')[0];

        // Only suggest if we have very few existing components
        if (filteredComponents.length < 5) {
            // Suggest planet-specific structural components
            if (buildingResourceTier === 1) {
                suggestions.push({
                    name: `${planetPrefix}-framework`,
                    displayName: `${planetPrefix.charAt(0).toUpperCase() + planetPrefix.slice(1)} Framework`,
                    tier: 1,
                    type: 'COMPONENT',
                    isNew: true,
                    reason: 'Basic structural component for T1 buildings'
                });
            }
            if (buildingResourceTier === 2) {
                suggestions.push({
                    name: `${planetPrefix}-composite-plating`,
                    displayName: `${planetPrefix.charAt(0).toUpperCase() + planetPrefix.slice(1)} Composite Plating`,
                    tier: 2,
                    type: 'COMPONENT',
                    isNew: true,
                    reason: 'Advanced structural component for T2 buildings'
                });
            }
        }

        return suggestions;
    }, [showNewComponents, selectedPlanet, buildingResourceTier, filteredComponents]);

    // Handle resource selection
    const toggleResourceSelection = (resource) => {
        const resourceId = resource.OutputID || resource.outputID || resource.OutputName || resource.outputName;
        setSelectedResources(prev => {
            const isSelected = prev.some(r => {
                const id = r.OutputID || r.outputID || r.OutputName || r.outputName;
                return id === resourceId;
            });

            if (isSelected) {
                return prev.filter(r => {
                    const id = r.OutputID || r.outputID || r.OutputName || r.outputName;
                    return id !== resourceId;
                });
            } else {
                return [...prev, resource];
            }
        });
    };

    // Save current preference set
    const savePreferenceSet = () => {
        try {
            // Optimize data - store only essential identifiers instead of full objects
            const optimizedResources = selectedResources.map(r => ({
                id: r.OutputID || r.outputID,
                name: r.OutputName || r.outputName || r.displayName || r.name,
                type: r.OutputType || r.outputType || r.type,
                tier: r.OutputTier || r.outputTier || r.tier
            }));

            const preferenceSet = {
                id: Date.now(),
                name: `${selectedPlanet} - Resource T${buildingResourceTier} - Building T${buildingTier}`,
                planet: selectedPlanet,
                resourceTier: buildingResourceTier,
                buildingTier: buildingTier,
                resources: optimizedResources,
                timestamp: new Date().toISOString()
            };

            // Get existing localStorage preferences (excluding file-based ones)
            const allPreferences = [...savedPreferences];
            const localStoragePrefs = allPreferences.filter(p => !p.fromFile);

            // If we have too many localStorage preferences, remove oldest ones (keep last 10)
            let existingLocal = localStoragePrefs.slice(-9); // Keep last 9, add new one = 10 total
            existingLocal.push(preferenceSet);

            // Try to save to localStorage
            try {
                localStorage.setItem('buildingResourcePreferences', JSON.stringify(existingLocal));

                // Update UI with both file and localStorage preferences
                const filePrefs = savedPreferences.filter(p => p.fromFile);
                setSavedPreferences([...filePrefs, ...existingLocal]);

                alert('Preference set saved successfully!');
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError') {
                    // Storage full - try cleaning up and save again
                    existingLocal = existingLocal.slice(-4); // Keep only last 4 preferences
                    existingLocal.push(preferenceSet);
                    localStorage.setItem('buildingResourcePreferences', JSON.stringify(existingLocal));

                    const filePrefs = savedPreferences.filter(p => p.fromFile);
                    setSavedPreferences([...filePrefs, ...existingLocal]);

                    alert('Preference set saved! (Older localStorage preferences were removed due to storage limits)');
                } else {
                    throw storageError;
                }
            }
        } catch (error) {
            console.error('Error saving preference set:', error);
            alert('Failed to save preference set. Your browser storage may be full. Try clearing some saved preferences.');
        }
    };

    // Load saved preferences on mount (from file first, then localStorage)
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                // First try to load from public/resourcePreferences.json
                const response = await fetch('/resourcePreferences.json');
                if (response.ok) {
                    const data = await response.json();
                    if (data.preferences && Array.isArray(data.preferences)) {
                        console.log(`Loaded ${data.preferences.length} preference sets from resourcePreferences.json`);

                        // Format preferences to match our structure
                        const formattedPreferences = data.preferences.map((pref, index) => ({
                            ...pref,
                            id: pref.id || Date.now() + index,
                            name: pref.name || `${pref.planet} - Resource T${pref.buildingResourceTier} - Building T${pref.buildingTier}`,
                            timestamp: pref.timestamp || new Date().toISOString(),
                            fromFile: true  // Mark as loaded from file
                        }));

                        // Also load any localStorage preferences and merge
                        try {
                            const localStoragePrefs = JSON.parse(localStorage.getItem('buildingResourcePreferences') || '[]');
                            const mergedPrefs = [...formattedPreferences, ...localStoragePrefs];
                            setSavedPreferences(mergedPrefs);
                            console.log(`Loaded ${formattedPreferences.length} from file + ${localStoragePrefs.length} from localStorage`);
                        } catch (e) {
                            // If localStorage fails, just use file preferences
                            setSavedPreferences(formattedPreferences);
                        }

                        console.log('Using resourcePreferences.json + localStorage as preference sources');
                        return;
                    }
                }
            } catch (error) {
                console.log('No resourcePreferences.json found or error loading it, falling back to localStorage');
            }

            // Fallback to localStorage if no file or error
            try {
                const saved = JSON.parse(localStorage.getItem('buildingResourcePreferences') || '[]');
                setSavedPreferences(saved);
            } catch (error) {
                console.error('Error loading saved preferences from localStorage:', error);
                setSavedPreferences([]);
            }
        };

        loadPreferences();
    }, []);

    // Load a saved preference set
    const loadPreferenceSet = (set) => {
        // Handle both formats (from file or from localStorage)
        setSelectedPlanet(set.planet);
        setBuildingResourceTier(set.buildingResourceTier || set.resourceTier || 1);
        setBuildingTier(set.buildingTier || 1);

        // If resources are simple objects (from file), need to match them with full recipe data
        if (set.resources && set.resources.length > 0 && set.resources[0].id) {
            // Resources from file - need to match with recipes
            const matchedResources = [];
            set.resources.forEach(resource => {
                const matchedRecipe = recipes.find(recipe => {
                    const recipeId = recipe.OutputID || recipe.outputID;
                    const recipeName = recipe.OutputName || recipe.outputName;
                    return (recipeId && recipeId === resource.id) ||
                        (recipeName && recipeName === resource.name);
                });
                if (matchedRecipe) {
                    matchedResources.push(matchedRecipe);
                }
            });
            setSelectedResources(matchedResources);
        } else {
            // Resources already matched (from localStorage)
            setSelectedResources(set.resources);
        }
    };

    // Delete a saved preference set (only works for localStorage, not file-based)
    const deletePreferenceSet = (id) => {
        const prefToDelete = savedPreferences.find(p => p.id === id);

        if (prefToDelete && prefToDelete.fromFile) {
            alert('This preference is loaded from resourcePreferences.json and cannot be deleted here. Edit the JSON file directly to remove it.');
            return;
        }

        const updated = savedPreferences.filter(p => p.id !== id);
        setSavedPreferences(updated);

        // Only update localStorage for non-file preferences
        const localStoragePrefs = updated.filter(p => !p.fromFile);
        localStorage.setItem('buildingResourcePreferences', JSON.stringify(localStoragePrefs));
    };

    // Generate bulk export for all tier combinations
    const generateBulkExport = () => {
        if (!bulkExportPlanet || !recipes) {
            alert('Please select a planet for bulk export');
            return;
        }

        const exportSets = [];

        // Helper to filter components by tier and planet
        const getComponentsForTier = (resourceTier, buildingTier, planetType) => {
            const components = [];

            recipes.forEach(r => {
                const outputType = r.OutputType || r.outputType || r.type;
                const outputName = r.OutputName || r.outputName || r.name;
                const outputTier = parseInt(r.OutputTier || r.outputTier || r.tier || 1);
                const productionSteps = parseInt(r.ProductionSteps || r.productionSteps || 0);

                // Handle planetTypes
                let planetTypes = r.PlanetTypes || r.planetTypes || '';
                if (Array.isArray(planetTypes)) {
                    planetTypes = planetTypes.join(';');
                }

                // Skip banned components
                if (bannedBuildingComponents.has(outputName)) return;

                // For T1 buildings, include raw materials and simple components
                if (buildingTier === 1 && resourceTier <= 2) {
                    if (outputType === 'BASIC RESOURCE' || outputType === 'BASIC ORGANIC RESOURCE') {
                        if ((planetTypes.includes(planetType) || planetTypes === '') && outputTier <= resourceTier) {
                            components.push(r);
                        }
                    }
                }

                // Include components
                if ((outputType === 'COMPONENT' || outputType === 'Component') && productionSteps <= 2) {
                    if (planetTypes.includes(planetType) || planetTypes === '') {
                        if (outputTier <= resourceTier) {
                            // Check if it's a preferred building component
                            if (preferredBuildingComponents.has(outputName)) {
                                components.push(r);
                            } else if (resourceTier >= 4) {
                                // For T4/T5, include high-quality structural/utility components
                                const nameLower = outputName.toLowerCase();
                                if (nameLower.includes('framework') || nameLower.includes('structure') ||
                                    nameLower.includes('core') && !nameLower.includes('weapon') && !nameLower.includes('drive') ||
                                    nameLower.includes('matrix') && !nameLower.includes('weapon') ||
                                    nameLower.includes('utility') || nameLower.includes('control') && !nameLower.includes('fire') ||
                                    nameLower.includes('assembly') || nameLower.includes('network') ||
                                    nameLower.includes('stabilizer') || nameLower.includes('reinforcement')) {
                                    components.push(r);
                                }
                            }
                        }
                    }
                }
            });

            return components;
        };

        // Generate all tier combinations (Resource T1-5, Building T1)
        for (let resourceTier = 1; resourceTier <= 5; resourceTier++) {
            const components = getComponentsForTier(resourceTier, 1, bulkExportPlanet);

            // Sort and limit components
            const sortedComponents = components.sort((a, b) => {
                const tierA = parseInt(a.OutputTier || a.outputTier || 1);
                const tierB = parseInt(b.OutputTier || b.outputTier || 1);
                const nameA = a.OutputName || a.outputName;
                const nameB = b.OutputName || b.outputName;
                const isPreferredA = preferredBuildingComponents.has(nameA);
                const isPreferredB = preferredBuildingComponents.has(nameB);

                if (tierA !== tierB) return tierA - tierB;
                if (isPreferredA && !isPreferredB) return -1;
                if (!isPreferredA && isPreferredB) return 1;
                return nameA.localeCompare(nameB);
            });

            // Create export set
            const exportSet = {
                planet: bulkExportPlanet,
                buildingResourceTier: resourceTier,
                buildingTier: 1,
                resources: sortedComponents.slice(0, resourceTier === 1 ? 30 : resourceTier === 2 ? 40 : resourceTier === 3 ? 50 : resourceTier === 4 ? 60 : 70).map(r => ({
                    id: r.OutputID || r.outputID || r.id,
                    name: r.OutputName || r.outputName || r.name,
                    type: r.OutputType || r.outputType || r.type,
                    tier: r.OutputTier || r.outputTier || r.tier
                }))
            };

            exportSets.push(exportSet);
        }

        // Generate markdown analysis
        let markdown = `# Building Resource Analysis for ${bulkExportPlanet}\n\n`;
        markdown += `Generated: ${new Date().toISOString()}\n\n`;
        markdown += `## Summary\n\n`;
        markdown += `This analysis includes all 5 resource tiers for T1 buildings on ${bulkExportPlanet}.\n\n`;

        exportSets.forEach((set, index) => {
            markdown += `---\n\n`;
            markdown += `## Resource Tier ${set.buildingResourceTier} - Building Tier ${set.buildingTier}\n\n`;
            markdown += `**Total Components:** ${set.resources.length}\n\n`;

            // Group by tier
            const byTier = {};
            set.resources.forEach(r => {
                const tier = r.tier || 1;
                if (!byTier[tier]) byTier[tier] = [];
                byTier[tier].push(r);
            });

            Object.keys(byTier).sort().forEach(tier => {
                markdown += `### Tier ${tier} Components (${byTier[tier].length})\n\n`;
                byTier[tier].forEach(r => {
                    markdown += `- **${r.name}** (${r.type})\n`;
                });
                markdown += '\n';
            });

            // Add JSON export
            markdown += `<details>\n<summary>JSON Export</summary>\n\n\`\`\`json\n`;
            markdown += JSON.stringify(set, null, 2);
            markdown += `\n\`\`\`\n</details>\n\n`;
        });

        // Add recommendations
        markdown += `## Recommendations\n\n`;
        markdown += `### Priority Components for All Tiers\n\n`;
        markdown += `1. **Structural:** Framework, Alloy Frame, Base Structure, Heavy Alloy, Load Bearing Beams\n`;
        markdown += `2. **Power/Energy:** Power Source, Energy Cells, Storage Matrix, Capacitor Matrix Core\n`;
        markdown += `3. **Thermal:** Thermal Control Unit, Heat Exchange Coils, Temperature Regulator\n`;
        markdown += `4. **Utility:** Utility Interface, Utility Core, Assembly Control Matrix\n`;
        markdown += `5. **Protection:** Protective Coating, Barrier Material, Insulation Material\n\n`;

        markdown += `### T4-T5 Premium Components\n\n`;
        markdown += `For T4-T5 buildings, consider these high-tier components:\n`;
        markdown += `- Capacity Control Core (T4) - Advanced control systems\n`;
        markdown += `- Mega Framework Core (T4) - Massive structural support\n`;
        markdown += `- Zirconium components (T4) - High-strength materials\n`;
        markdown += `- Adaptive Utility Core (T5) - Intelligent building systems\n`;
        markdown += `- Assembly Control Matrix (T5) - Advanced automation\n`;
        markdown += `- Energy Network Core (T5) - Integrated power management\n\n`;

        // Create download
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `building-resources-${bulkExportPlanet.toLowerCase().replace(' ', '-')}-bulk-analysis.md`;
        a.click();
        URL.revokeObjectURL(url);

        // Also copy combined JSON to clipboard
        const combinedJson = exportSets.map(set => JSON.stringify(set)).join('\n\n');
        navigator.clipboard.writeText(combinedJson).then(() => {
            alert(`Bulk export generated!\n\n✅ Markdown analysis downloaded\n✅ All ${exportSets.length} JSON preference sets copied to clipboard\n\nYou can now paste the JSON directly into the import field.`);
        }).catch(err => {
            alert('Bulk export downloaded! Could not copy to clipboard: ' + err);
        });

        setShowBulkExport(false);
    };

    // Export selected resources as JSON
    const exportSelectedResources = () => {
        const exportData = {
            planet: selectedPlanet,
            buildingResourceTier,
            buildingTier,
            resources: selectedResources.map(r => ({
                id: r.OutputID || r.outputID,
                name: r.OutputName || r.outputName,
                type: r.OutputType || r.outputType,
                tier: r.OutputTier || r.outputTier
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `building-resources-${selectedPlanet.toLowerCase().replace(' ', '-')}-rt${buildingResourceTier}-bt${buildingTier}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import preferred resource set from JSON file
    const importPreferenceSet = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = handleImportFile;
        input.click();
    };

    // Handle imported JSON file
    const handleImportFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);

                // Validate import data structure
                if (!importData.planet || !importData.resources || !Array.isArray(importData.resources)) {
                    alert('Invalid JSON format. Expected format: { planet, buildingResourceTier, buildingTier, resources: [...] }');
                    return;
                }

                // Find matching resources from available recipes
                const matchedResources = [];
                const unmatchedResources = [];

                importData.resources.forEach(importedResource => {
                    // Try to find the resource in current recipes
                    const matchedRecipe = recipes.find(recipe => {
                        const recipeId = recipe.OutputID || recipe.outputID;
                        const recipeName = recipe.OutputName || recipe.outputName;

                        // Match by ID first, then by name
                        return (recipeId && recipeId === importedResource.id) ||
                            (recipeName && recipeName === importedResource.name);
                    });

                    if (matchedRecipe) {
                        matchedResources.push(matchedRecipe);
                    } else {
                        unmatchedResources.push(importedResource);
                    }
                });

                // Set the imported preferences
                setSelectedPlanet(importData.planet);
                setBuildingResourceTier(importData.buildingResourceTier || 1);
                setBuildingTier(importData.buildingTier || 1);
                setSelectedResources(matchedResources);

                // Show import results
                let message = `Successfully imported ${matchedResources.length} resources.`;
                if (unmatchedResources.length > 0) {
                    message += `\n\nWarning: ${unmatchedResources.length} resources could not be found in current data:`;
                    unmatchedResources.forEach(resource => {
                        message += `\n- ${resource.name} (${resource.type} T${resource.tier})`;
                    });
                }

                alert(message);

            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
            }
        };

        reader.readAsText(file);
    };

    // Parse JSON from text input (supports multiple JSON objects)
    const parseJsonText = () => {
        if (!jsonTextInput.trim()) {
            alert('Please paste JSON text first');
            return;
        }

        try {
            // Handle multiple JSON objects separated by whitespace
            const text = jsonTextInput.trim();
            const preferenceSets = [];

            // Split by } followed by whitespace and { to find separate JSON objects
            const jsonObjects = [];
            let currentJson = '';
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];

                if (escapeNext) {
                    escapeNext = false;
                    currentJson += char;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    currentJson += char;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                }

                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                }

                currentJson += char;

                // If we've closed all braces and have content, we have a complete JSON object
                if (braceCount === 0 && currentJson.trim()) {
                    jsonObjects.push(currentJson.trim());
                    currentJson = '';
                }
            }

            // Parse each JSON object
            jsonObjects.forEach((jsonStr, index) => {
                if (!jsonStr) return;

                try {
                    const importData = JSON.parse(jsonStr);

                    // Validate structure
                    if (importData.planet && importData.resources && Array.isArray(importData.resources)) {
                        preferenceSets.push({
                            ...importData,
                            _index: index,
                            _displayName: `${importData.planet} - Resource T${importData.buildingResourceTier || 1} - Building T${importData.buildingTier || 1}`,
                            _resourceCount: importData.resources.length
                        });
                    }
                } catch (parseError) {
                    console.warn(`Failed to parse JSON object ${index + 1}:`, parseError);
                }
            });

            if (preferenceSets.length === 0) {
                alert('No valid preference sets found. Expected format: { planet, buildingResourceTier, buildingTier, resources: [...] }');
                return;
            }

            // If only one preference set, load it directly
            if (preferenceSets.length === 1) {
                loadPreferenceSetData(preferenceSets[0]);
                return;
            }

            // Multiple preference sets - show selector
            setParsedPreferenceSets(preferenceSets);
            setShowPreferenceSelector(true);

        } catch (error) {
            alert('Error parsing JSON: ' + error.message);
        }
    };

    // Load preference set data and match resources
    const loadPreferenceSetData = (importData) => {
        try {
            // Find matching resources from available recipes
            const matchedResources = [];
            const unmatchedResources = [];

            importData.resources.forEach(importedResource => {
                // Try to find the resource in current recipes
                const matchedRecipe = recipes.find(recipe => {
                    const recipeId = recipe.OutputID || recipe.outputID;
                    const recipeName = recipe.OutputName || recipe.outputName;

                    // Match by ID first, then by name
                    return (recipeId && recipeId === importedResource.id) ||
                        (recipeName && recipeName === importedResource.name);
                });

                if (matchedRecipe) {
                    matchedResources.push(matchedRecipe);
                } else {
                    unmatchedResources.push(importedResource);
                }
            });

            // Set the imported preferences
            setSelectedPlanet(importData.planet);
            setBuildingResourceTier(importData.buildingResourceTier || 1);
            setBuildingTier(importData.buildingTier || 1);
            setSelectedResources(matchedResources);

            // Clear states and hide dialogs
            setJsonTextInput('');
            setShowImportOptions(false);
            setShowPreferenceSelector(false);
            setParsedPreferenceSets([]);

            // Show import results
            let message = `Successfully imported ${matchedResources.length} resources for ${importData.planet}.`;
            if (unmatchedResources.length > 0) {
                message += `\n\nWarning: ${unmatchedResources.length} resources could not be found in current data:`;
                unmatchedResources.slice(0, 5).forEach(resource => {
                    message += `\n- ${resource.name} (${resource.type} T${resource.tier})`;
                });
                if (unmatchedResources.length > 5) {
                    message += `\n... and ${unmatchedResources.length - 5} more`;
                }
            }

            alert(message);

        } catch (error) {
            console.error('Error loading preference set:', error);
            alert('Error loading preference set: ' + error.message);
        }
    };

    // Show loading state if data isn't ready
    if (state?.loading) {
        return (
            <div className="preferred-resource-selector">
                <h2>Preferred Building Resources Selector</h2>
                <div className="loading-message" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading resources...
                </div>
            </div>
        );
    }

    // Show error if no recipes loaded
    if (!recipes || recipes.length === 0) {
        return (
            <div className="preferred-resource-selector">
                <h2>Preferred Building Resources Selector</h2>
                <div className="error-message" style={{ textAlign: 'center', padding: '40px', color: '#ff4444' }}>
                    No recipe data loaded. Please check that finalComponentList.csv exists in the public folder.
                </div>
            </div>
        );
    }

    return (
        <div className="preferred-resource-selector">
            <h2>Preferred Building Resources Selector</h2>

            {/* Main Container with Side Panel Layout */}
            <div className="selector-main-container">
                {/* Left Panel - Resource Selection */}
                <div className="resources-panel">
                    {/* Selection Criteria */}
                    <div className="selection-criteria">
                        <div className="criteria-row">
                            <div className="criteria-item">
                                <label>Planet Type:</label>
                                <select
                                    value={selectedPlanet}
                                    onChange={(e) => setSelectedPlanet(e.target.value)}
                                >
                                    <option value="">Select Planet...</option>
                                    {planetTypes.map(planet => (
                                        <option key={planet} value={planet}>{planet}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="criteria-item">
                                <label>Building Resource Tier:</label>
                                <select
                                    value={buildingResourceTier}
                                    onChange={(e) => setBuildingResourceTier(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map(tier => (
                                        <option key={tier} value={tier}>Tier {tier}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="criteria-item">
                                <label>Building Tier:</label>
                                <select
                                    value={buildingTier}
                                    onChange={(e) => setBuildingTier(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5].map(tier => (
                                        <option key={tier} value={tier}>Tier {tier}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="filter-row">
                            <label>Filter by Type:</label>
                            <div className="filter-buttons">
                                <button
                                    className={filterTheme === 'all' ? 'active' : ''}
                                    onClick={() => setFilterTheme('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={filterTheme === 'preferred' ? 'active' : ''}
                                    onClick={() => setFilterTheme('preferred')}
                                >
                                    Preferred
                                </button>
                                <button
                                    className={filterTheme === 'structural' ? 'active' : ''}
                                    onClick={() => setFilterTheme('structural')}
                                >
                                    Structural
                                </button>
                                <button
                                    className={filterTheme === 'utility' ? 'active' : ''}
                                    onClick={() => setFilterTheme('utility')}
                                >
                                    Utility
                                </button>
                                <button
                                    className={filterTheme === 'environmental' ? 'active' : ''}
                                    onClick={() => setFilterTheme('environmental')}
                                >
                                    Environmental
                                </button>
                                <button
                                    className={filterTheme === 'raw' ? 'active' : ''}
                                    onClick={() => setFilterTheme('raw')}
                                >
                                    Raw Materials
                                </button>
                            </div>
                        </div>

                        <div className="options-row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showNewComponents}
                                    onChange={(e) => setShowNewComponents(e.target.checked)}
                                />
                                Show suggested NEW components (if needed)
                            </label>
                            <button
                                onClick={() => setShowImportOptions(!showImportOptions)}
                                className="import-btn-top"
                            >
                                📁 Import Preference Set {showImportOptions ? '▲' : '▼'}
                            </button>
                            <button
                                onClick={() => setShowBulkExport(!showBulkExport)}
                                className="bulk-export-btn-top"
                            >
                                ⚡ Quick Bulk Export {showBulkExport ? '▲' : '▼'}
                            </button>
                        </div>

                        {/* Import Options */}
                        {showImportOptions && (
                            <div className="import-options">
                                <h4>Import Preference Set</h4>
                                <div className="import-methods">
                                    <div className="import-method">
                                        <h5>📁 Upload JSON File</h5>
                                        <button onClick={importPreferenceSet} className="import-file-btn">
                                            Choose File
                                        </button>
                                    </div>
                                    <div className="import-method">
                                        <h5>📋 Paste JSON Text</h5>
                                        <textarea
                                            placeholder="Paste your JSON preference data here..."
                                            value={jsonTextInput}
                                            onChange={(e) => setJsonTextInput(e.target.value)}
                                            className="json-input"
                                            rows={8}
                                        />
                                        <div className="json-input-actions">
                                            <button onClick={parseJsonText} className="parse-json-btn">
                                                Parse & Import
                                            </button>
                                            <button onClick={() => setJsonTextInput('')} className="clear-json-btn">
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowImportOptions(false)}
                                    className="close-import-btn"
                                >
                                    Close Import Options
                                </button>
                            </div>
                        )}

                        {/* Bulk Export Options */}
                        {showBulkExport && (
                            <div className="bulk-export-dialog">
                                <h4>⚡ Quick Bulk Export - All Tier Combinations</h4>
                                <p className="bulk-export-description">
                                    Generate all 5 resource tiers for T1 buildings with optimized component selection.
                                    This will create a comprehensive markdown analysis and copy JSON to clipboard.
                                </p>
                                <div className="bulk-export-controls">
                                    <div className="bulk-export-planet-select">
                                        <label>Select Planet:</label>
                                        <select
                                            value={bulkExportPlanet}
                                            onChange={(e) => setBulkExportPlanet(e.target.value)}
                                        >
                                            {planetTypes.map(planet => (
                                                <option key={planet} value={planet}>{planet}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bulk-export-info">
                                        <h5>What you'll get:</h5>
                                        <ul>
                                            <li>✅ 5 preference sets (Resource T1-T5, Building T1)</li>
                                            <li>✅ Markdown analysis file with all components</li>
                                            <li>✅ Smart T4/T5 component selection</li>
                                            <li>✅ JSON copied to clipboard for immediate import</li>
                                            <li>✅ Recommendations and priority components</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="bulk-export-actions">
                                    <button onClick={generateBulkExport} className="generate-bulk-export-btn">
                                        🚀 Generate Bulk Export
                                    </button>
                                    <button onClick={() => setShowBulkExport(false)} className="cancel-bulk-export-btn">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Preference Set Selector */}
                        {showPreferenceSelector && (
                            <div className="preference-selector-dialog">
                                <h4>Select Preference Set to Load</h4>
                                <div className="parsed-preferences-list">
                                    {parsedPreferenceSets.map((prefSet, index) => (
                                        <div key={index} className="parsed-preference-item">
                                            <div className="parsed-preference-info">
                                                <h5>{prefSet._displayName}</h5>
                                                <div className="parsed-preference-details">
                                                    <span>Planet: {prefSet.planet}</span>
                                                    <span>Resource Tier: {prefSet.buildingResourceTier || 1}</span>
                                                    <span>Building Tier: {prefSet.buildingTier || 1}</span>
                                                    <span>{prefSet._resourceCount} resources</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => loadPreferenceSetData(prefSet)}
                                                className="load-preference-btn"
                                            >
                                                Load This Set
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setShowPreferenceSelector(false);
                                        setParsedPreferenceSets([]);
                                    }}
                                    className="cancel-preference-selection-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Available Resources */}
                    {selectedPlanet && (
                        <div className="resources-section">
                            <h3>Available Resources ({filteredComponents.length} found)</h3>

                            {buildingTier === 1 && buildingResourceTier <= 2 && (
                                <div className="info-box">
                                    ℹ️ T1 infrastructure and T1 resource buildings can use raw materials for bootstrap.
                                </div>
                            )}

                            <div className="resources-grid">
                                {filteredComponents.map(resource => {
                                    const resourceId = resource.OutputID || resource.outputID || resource.id || resource.OutputName || resource.outputName || resource.name;
                                    const isSelected = selectedResources.some(r => {
                                        const id = r.OutputID || r.outputID || r.id || r.OutputName || r.outputName || r.name;
                                        return id === resourceId;
                                    });
                                    const isPreferred = preferredBuildingComponents.has(resource.OutputName || resource.outputName || resource.name);

                                    return (
                                        <div
                                            key={resourceId}
                                            className={`resource-card ${isSelected ? 'selected' : ''} ${isPreferred ? 'preferred' : ''}`}
                                            onClick={() => toggleResourceSelection(resource)}
                                        >
                                            <div className="resource-name">
                                                {resource.OutputName || resource.outputName || resource.name}
                                                {isPreferred && <span className="preferred-badge">★</span>}
                                            </div>
                                            <div className="resource-details">
                                                <span className="resource-tier">T{resource.OutputTier || resource.outputTier || resource.tier || 1}</span>
                                                <span className="resource-type">{resource.OutputType || resource.outputType || resource.type}</span>
                                            </div>
                                            {resource.PlanetTypes && resource.PlanetTypes !== selectedPlanet && (
                                                <div className="resource-planet">
                                                    {resource.PlanetTypes}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {showNewComponents && suggestedNewComponents.length > 0 && (
                                <>
                                    <h3>Suggested NEW Components (Only if absolutely needed)</h3>
                                    <div className="new-components-warning">
                                        ⚠️ These are NEW components that don't exist yet. Only select if no existing components can fill the requirement.
                                    </div>
                                    <div className="resources-grid">
                                        {suggestedNewComponents.map(component => (
                                            <div
                                                key={component.name}
                                                className="resource-card new-component"
                                                onClick={() => toggleResourceSelection(component)}
                                            >
                                                <div className="resource-name">
                                                    {component.displayName}
                                                    <span className="new-badge">NEW</span>
                                                </div>
                                                <div className="resource-details">
                                                    <span className="resource-tier">T{component.tier}</span>
                                                    <span className="resource-type">{component.type}</span>
                                                </div>
                                                <div className="new-reason">{component.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Selected Resources and Metrics */}
                <div className="details-panel">
                    {/* Selected Resources */}
                    {selectedResources.length > 0 && (
                        <div className="selected-section">
                            <h3>Selected Resources ({selectedResources.length})</h3>
                            <div className="selected-list">
                                {selectedResources.map(resource => {
                                    const resourceId = resource.OutputID || resource.outputID || resource.id || resource.OutputName || resource.outputName || resource.name;
                                    const resourceName = resource.OutputName || resource.outputName || resource.displayName || resource.name;
                                    return (
                                        <div key={resourceId} className="selected-item">
                                            <span>{resourceName}</span>
                                            <button onClick={() => toggleResourceSelection(resource)}>Remove</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="action-buttons">
                                <button onClick={savePreferenceSet} className="save-btn">
                                    Save Preference Set
                                </button>
                                <button onClick={exportSelectedResources} className="export-btn">
                                    Export as JSON
                                </button>
                                <button onClick={() => setShowImportOptions(!showImportOptions)} className="import-btn">
                                    Import from JSON
                                </button>
                                <button onClick={() => setSelectedResources([])} className="clear-btn">
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Component Metrics Analyzer */}
                    {selectedResources.length > 0 && (
                        <div className="metrics-section">
                            <div className="metrics-toggle">
                                <button
                                    onClick={() => setShowMetrics(!showMetrics)}
                                    className="metrics-toggle-btn"
                                >
                                    {showMetrics ? 'Hide' : 'Show'} Component Metrics
                                </button>
                            </div>
                            {showMetrics && (
                                <ComponentMetricsAnalyzer
                                    selectedComponents={selectedResources}
                                    planetType={selectedPlanet}
                                    buildingResourceTier={buildingResourceTier}
                                    buildingTier={buildingTier}
                                    onMetricsUpdate={setComponentMetrics}
                                />
                            )}
                        </div>
                    )}

                    {/* Saved Preferences */}
                    {savedPreferences.length > 0 && (
                        <div className="saved-preferences">
                            <h3>Saved Preference Sets</h3>
                            <div className="preferences-list">
                                {savedPreferences.map(set => (
                                    <div key={set.id} className={`preference-item ${set.fromFile ? 'from-file' : ''}`}>
                                        <div className="preference-info">
                                            <strong>{set.name}</strong>
                                            <span className="preference-count">
                                                {set.resources.length} resources
                                                {set.fromFile && <span className="file-badge"> 📁</span>}
                                            </span>
                                        </div>
                                        <div className="preference-actions">
                                            <button onClick={() => loadPreferenceSet(set)}>Load</button>
                                            <button
                                                onClick={() => deletePreferenceSet(set.id)}
                                                disabled={set.fromFile}
                                                title={set.fromFile ? 'File-based preferences cannot be deleted' : 'Delete preference'}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreferredResourceSelector; 