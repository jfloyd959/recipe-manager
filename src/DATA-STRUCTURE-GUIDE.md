# SAGE C4 Tools - Unified Data Structure Guide

## Overview
This document describes the standardized data structure for all SAGE C4 Tools. All tools now rely solely on JSON/CSV files for data, with no hardcoded values or mock data in the application code.

## Key Changes from Previous Implementation
1. **Unified Resource IDs**: All resources now use consistent IDs without prefixes (e.g., `iron-ore` instead of `cargo-iron-ore`)
2. **Single Source of Truth**: All data comes from JSON/CSV files in `/public/data/`
3. **Logic in Data**: Building dependencies, unlocks, and other logic moved from code to JSON configuration
4. **No Mock Data**: All mock data removed from code, everything loads from files

## Data Files Structure

### 1. resources.json
**Path**: `/public/data/resources.json`

Master definition of all resources in the game.

```json
{
  "resources": [
    {
      "id": "iron-ore",              // Unique identifier (NO cargo- prefix!)
      "name": "Iron Ore",            // Display name
      "category": "raw",             // Category: raw, processed, component, advanced, consumable
      "tier": 1,                     // Resource tier (1-5)
      "description": "...",          // Description
      "stackSize": 100,              // Max stack size
      "baseValue": 10                // Base economic value
    }
  ],
  "categories": {
    "raw": {
      "name": "Raw Materials",
      "color": "#8B4513",
      "icon": "⛏️"
    }
  }
}
```

### 2. claimStakeBuildings.json
**Path**: `/public/data/claimStakeBuildings.json`

Defines all buildings that can be placed on claim stakes with complete progression system.

#### Building Progression Path

1. **Central Hub T1** (Standard Claim Stake) → Unlocks 4 main hubs:
   - **Processing Hub** → Unlocks all processor modules
   - **Storage Hub** → Unlocks storage modules
   - **Extraction Hub** → Unlocks extractor modules (raw resources)
   - **Farm Hub** → Unlocks organic extractors, biomass extractor, food processor

2. **Cultivation Hub T1** (Cultivation Claim Stake) → ALSO unlocks 4 main hubs:
   - **Processing Hub** → Unlocks all processor modules
   - **Storage Hub** → Unlocks storage modules
   - **Extraction Hub** → Unlocks extractor modules (raw resources)
   - **Farm Hub** → Unlocks:
     - Organic extractors (`enables-organic-extractors`)
     - Plant extractors (`enables-plant-extractors`)
     - Food processor (`enables-food-processor`)
     - Biomass extractor (`enables-biomass-extractor`)
   - **Special**: Doubles extraction rate for organic resources
   - **Exclusive Access**: ALL organic farms and exotic/rare organic extractors require cultivation stakes

3. **Important Notes**:
   - Central Hub and Cultivation Hub are mutually exclusive (one per claim stake)
   - Both hubs enable the same 4 main hub buildings
   - Some organic extractors require `cultivation-stake-only` tag
   - Power Plants and Crew Quarters work on any planetary claim stake

4. **Tier Progression**: Each building tier unlocks the next tier (T1→T2→T3→T4→T5)

```json
{
  "buildings": [
    {
      "id": "central-hub-t1",
      "name": "Central Hub T1",
      "description": "Basic extraction and processing",
      "tier": 1,
      "minimumTier": 1,               // Minimum stake tier required
      "slots": 0,                      // Slots consumed (0 for hubs that come with stake)
      "power": 100,                    // Power provided (negative = consumed)
      "crewSlots": 4,                  // Crew capacity
      "neededCrew": 1,                 // Minimum crew required
      "storage": 1000,                 // Storage capacity THIS building provides
      "hubValue": 100,                 // Economic value
      "comesWithStake": true,          // Automatically added with stake
      "cannotRemove": true,            // Cannot be removed by player
      "requiredTags": [],              // Tags required from other buildings
      "addedTags": [                   // Tags this building provides
        "central-hub",
        "standard-stake-only",
        "central-hub-t1",
        "enables-processing-hub",
        "enables-storage-hub",
        "enables-extraction-hub", 
        "enables-farm-hub"
      ],
      "resourceExtractionRate": {},    // Central hub doesn't extract
      "resourceRate": {},              // No consumption/production
      "constructionCost": {             // Resources needed to build
        "steel": 50,
        "electronics": 25
      },
      "constructionTime": 60           // Build time in seconds
    },
    {
      "id": "cultivation-hub-t1",
      "name": "Cultivation Hub T1",
      "tier": 1,
      "slots": 0,
      "power": 100,
      "crewSlots": 4,
      "neededCrew": 1,
      "storage": 1000,
      "comesWithStake": true,
      "cannotRemove": true,
      "requiredTags": [],
      "addedTags": [
        "cultivation-hub", 
        "cultivation-stake-only",
        "organic-focused",
        "cultivation-hub-t1",
        "enables-processing-hub",
        "enables-storage-hub",
        "enables-extraction-hub",
        "enables-farm-hub"
      ],
      "resourceExtractionRate": {      // Slow organic extraction
        "biomass": 0.01,
        "organic-compound": 0.005
      },
      "constructionCost": {...}
    },
    {
      "id": "processing-hub-t1",
      "name": "Processing Hub T1",
      "tier": 1,
      "slots": 4,
      "power": 50,
      "requiredTags": ["enables-processing-hub"],  // Works with both central and cultivation hub
      "addedTags": ["processing-hub", "processing-hub-t1", "enables-processors"],
      // ...
    },
    {
      "id": "iron-ore-extractor-t1",
      "name": "Iron Ore Extractor T1",
      "tier": 1,
      "slots": 8,
      "power": -25,
      "requiredTags": ["extraction-hub"],  // Requires extraction hub
      "addedTags": [
        "extractor",
        "iron-ore-extractor-t1",
        "terrestrial",                     // Planet type tags
        "volcanic"                         // where iron ore is found
      ],
      "resourceExtractionRate": {
        "iron-ore": 0.02
      },
      // ...
    },
    {
      "id": "biomass-extractor-t1",
      "name": "Biomass Extractor T1", 
      "tier": 1,
      "requiredTags": ["farm-hub"],       // Requires farm hub
      "addedTags": ["extractor", "organic", "terrestrial", "oceanic"],
      // ...
    },
    {
      "id": "exotic-orchid-extractor-t1",
      "name": "Exotic Orchid Extractor T1", 
      "tier": 1,
      "requiredTags": ["enables-organic-extractors", "cultivation-stake-only"],  // Requires cultivation stake
      "addedTags": ["extractor", "organic-extractor", "exotic-organic", "terrestrial"],
      // ...
    },
    {
      "id": "umbral-rush-tendril-farm-t1",
      "name": "Umbral Rush Tendril Farm T1",
      "tier": 1,
      "requiredTags": ["enables-plant-extractors", "cultivation-stake-only"],  // Requires farm hub + cultivation stake
      "addedTags": ["farm", "organic-extraction", "umbral-rush-tendril-farm-t1"],
      "resourceExtractionRate": {
        "umbral-rush-tendril": 0.015
      },
    },
    {
      "id": "storage-module-t1",
      "name": "Storage Module T1",
      "tier": 1,
      "slots": 4,
      "storage": 5000,
      "power": -5,
      "requiredTags": ["storage-hub"],    // Requires storage hub
      "addedTags": ["storage-module", "storage-module-t1"],
      // ...
    }
  ],
  "claimStakeDefinitions": [
    {
      "id": "claim-stake-terrestrial-mud-t1",
      "name": "MUD Terrestrial Planet T1 Claim Stake",
      "tier": 1,
      "slots": 10,                      // Total building slots available
      "rentMultiplier": 1.0,
      "placementFeeMultiplier": 1.0,
      "hubValue": 100,
      "requiredTags": ["terrestrial-planet", "mud"],
      "addedTags": ["planetary", "claim-stake", "standard-stake-only", "tier-1"],
      "defaultBuilding": "central-hub-t1"  // Building that comes with stake
    },
    {
      "id": "cultivation-stake-terrestrial-mud-t1",
      "name": "MUD Terrestrial Planet T1 Cultivation Stake",
      "tier": 1,
      "slots": 10,
      "rentMultiplier": 1.3,            // Higher rent for cultivation stakes
      "placementFeeMultiplier": 1.2,
      "hubValue": 120,
      "requiredTags": ["terrestrial-planet", "mud", "organic-suitable"],
      "addedTags": ["planetary", "cultivation-stake", "cultivation-stake-only", "organic-focused", "tier-1"],
      "defaultBuilding": "cultivation-hub-t1"  // Comes with cultivation hub instead
    }
  ]
}
```

**Important**: Storage shown in UI comes from buildings, not stake tier!

### 3. craftingHabBuildings.json
**Path**: `/public/data/craftingHabBuildings.json`

Defines buildings for crafting hab plots in starbases.

```json
{
  "habs": [
    {
      "id": "hab-t1",
      "name": "Basic Hab",
      "tier": 1,
      "slots": 10,                    // Available slots for buildings
      "description": "...",
      "constructionCost": {
        "steel": 20,
        "aluminum": 15
      }
    }
  ],
  "craftingStations": [
    {
      "id": "station-xxs",
      "name": "XXS Crafting Station",
      "size": "XXS",
      "speedBonus": 1.0,              // Crafting speed multiplier
      "jobSlots": 1,                  // Concurrent crafting jobs
      "constructionCost": {...}
    }
  ],
  "cargoStorage": [
    {
      "id": "cargo-t1",
      "name": "Cargo Storage T1",
      "tier": 1,
      "storageBonus": 100,             // Additional inventory space
      "jobSlotBonus": 1,               // Additional job slots
      "constructionCost": {...}
    }
  ]
}
```

### 4. recipes.csv
**Path**: `/public/data/recipes.csv`

All crafting recipes in CSV format.

```csv
OutputID,OutputName,OutputType,OutputTier,BuildingResourceTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2
iron,Iron,Component,1,1,30,Rocky;Terrestrial,All,Processed,1,iron-ore,2,,
steel,Steel,Component,2,2,60,Industrial,All,Processed,2,iron,2,carbon,1
```

**Important**: All resource IDs in recipes MUST match the IDs in resources.json (no cargo- prefix!)

### 5. planets.json
**Path**: `/public/data/planets.json`

Planet definitions with their available resources (richness defined in archetypes).

```json
{
  "planets": [
    {
      "id": "planet-001",
      "name": "Terra Prime",
      "archetype": "terrestrial",      // Archetype reference
      "faction": "MUD",
      "starbaseLevel": 3,              // 0-6
      "resources": [                   // List of available resources
        "iron-ore",
        "copper-ore",
        "silica"
      ],
      "coordinates": { "x": 100, "y": 200 },
      "description": "..."
    }
  ]
}
```

**Note**: The application supports backward compatibility with the old format:
```json
"resources": {
  "iron-ore": { "richness": 1.5 },
  "copper-ore": { "richness": 1.2 }
}
```
But the new array format with archetype-based richness is recommended.

### 6. planetArchetypes.json
**Path**: `/public/data/planetArchetypes.json`

Planet type definitions with per-resource richness values.

```json
{
  "archetypes": [
    {
      "id": "terrestrial",
      "name": "Terrestrial",
      "description": "...",
      "faction": "MUD",               // MUD, ONI, or UST
      "richness": {                   // Per-resource extraction multipliers
        "iron-ore": 1.0,
        "copper-ore": 1.0,
        "silica": 1.5,
        "carbon": 0.8,
        "aluminum-ore": 1.2
        // ... all available resources on this planet type
      },
      "plots": {                       // Available plots by starbase level
        "0": { "1": 10, "2": 5, "3": 2, "4": 1, "5": 0 },
        "1": { "1": 12, "2": 6, "3": 3, "4": 1, "5": 0 },
        // ... levels 0-6
      },
      "rent": {                        // Daily rent by starbase level  
        "0": { "1": 0.5, "2": 1.0, "3": 1.5, "4": 2.0, "5": 2.5 },
        // ... levels 0-6
      },
      "tags": ["terrestrial-planet", "mud"]
    }
  ]
}
```

### 7. starbases.json
**Path**: `/public/data/starbases.json`

Starbase definitions for crafting hab locations.

```json
{
  "starbases": [
    {
      "id": "starbase-mud-alpha",
      "name": "MUD Alpha Station",
      "faction": "MUD",
      "level": 3,
      "coordinates": { "x": 100, "y": 100 },
      "habPlots": 5,                   // Available plots for players
      "services": ["crafting", "trading", "repair"],
      "description": "..."
    }
  ]
}
```

## Data Loading Process

The `DataLoader.ts` service handles all data loading:

1. **Load all JSON files** from `/public/data/`
2. **Load CSV recipes** and process into JSON format
3. **No fallback to mock data** - if files are missing, error is thrown
4. **Helper methods** added to gameData for resource lookups

```typescript
const gameData = await DataLoader.loadAll();
// Returns:
{
  resources: [...],
  planets: [...],
  buildings: [...],
  recipes: [...],
  // Helper methods:
  getResourceById(id): Resource,
  getResourceName(id): string,
  getResourceCategory(id): string
}
```

## Migration Guide

### For Existing Data

1. **Remove cargo- prefixes** from all resource IDs
2. **Move building logic to JSON**:
   - `comesWithStake`: Buildings that come with claim stake
   - `cannotRemove`: Buildings that can't be removed
   - `requiredTags`/`providedTags`: Building dependencies
   - `unlocks`: Buildings this enables

3. **Standardize resource references**:
   - Use same IDs everywhere (recipes, buildings, inventory)
   - No more duplicate resources with different prefixes

### Adding New Resources

1. Add to `resources.json` with unique ID
2. Use same ID in recipes.csv
3. Reference in building extraction/production rates
4. No code changes needed!

### Adding New Buildings

1. Add to `claimStakeBuildings.json` or `craftingHabBuildings.json`
2. Include all logic fields (tags, unlocks, etc.)
3. No code changes needed!

## Save File Compatibility

Save files store resource IDs and must be migrated:
- Old: `"cargo-iron-ore": 100`
- New: `"iron-ore": 100`

## UI Display Considerations

### Claim Stake Purchase Screen
When displaying available claim stake tiers:
- **Storage**: Calculate from `defaultBuilding`'s storage value (e.g., Central Hub T1 = 1000 storage)
- **Slots**: From `claimStakeDefinition.slots` 
- **Daily Rent**: From `planetArchetype.rent[starbaseLevel][tier]`
- **Power/Crew**: From default building's values

### Resource Extraction Rates
Actual extraction rate = `building.resourceExtractionRate[resource]` × `planetArchetype.richness[resource]`

Example:
- Building extracts iron-ore at 0.5/s
- Planet richness for iron-ore is 1.5
- Actual rate: 0.5 × 1.5 = 0.75/s

### Storage Calculation
Total storage = Sum of all buildings' storage values on the claim stake
- Central Hub T1: 1000
- Storage Hub T1: 2000
- Total: 3000

## Testing Checklist

- [ ] All resources load from resources.json
- [ ] Recipes use correct resource IDs
- [ ] Claim stakes extract/produce correct resources
- [ ] Crafting hab accepts correct resources
- [ ] Resource transfer between tools works
- [ ] Building dependencies work via tags
- [ ] No "cargo-" prefixes appear anywhere
- [ ] Storage displays correctly based on buildings
- [ ] Extraction rates factor in planet richness

## Troubleshooting

### Resource Not Found
- Check resource ID matches exactly in resources.json
- Ensure no cargo- prefix is used
- Verify CSV doesn't have old prefixed IDs

### Building Not Available
- Check requiredTags are provided by another building
- Verify tier restrictions on claim stake
- Ensure building is in correct JSON file

### Recipe Not Working
- Verify all ingredient IDs exist in resources.json
- Check output ID matches resource definition
- Ensure CSV is properly formatted

## Future Improvements

1. **Resource Aliases**: Support legacy IDs for backward compatibility
2. **Validation Tool**: Script to validate all JSON/CSV cross-references
3. **Auto-Migration**: Tool to migrate old save files
4. **Hot Reload**: Reload data files without restart
5. **Schema Validation**: JSON Schema for all data files
