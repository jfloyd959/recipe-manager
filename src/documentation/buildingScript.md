# Script Functionality & Expected Results Documentation

## System Overview

The native building recipe generation system will create a comprehensive set of planet-specific alternate components and recipes that enable T1-T3 buildings to be constructed using only resources available on their deployment planet, while maintaining tier-appropriate complexity based on the extracted resource type.

## Script Processing Flow

### Phase 1: Resource Analysis & Classification
```
INPUT: Current resource list + building recipes
PROCESS: 
1. Classify each extractable resource by tier (T1-T5)
2. Map resource availability by planet type
3. Identify component gaps for native building
OUTPUT: Resource classification matrix
```

### Phase 2: Alternate Component Generation
```
INPUT: Component availability gaps by planet
PROCESS:
1. Generate planet-specific alternate components  
2. Create recipes for new alternate components
3. Ensure tier-appropriate complexity
OUTPUT: New alternate component definitions + recipes
```

### Phase 3: Building Recipe Regeneration  
```
INPUT: Original building recipes + new alternate components
PROCESS:
1. Regenerate all extractor recipes (T1-T5) based on extracted resource tier
2. Apply native compliance for T1-T3 building tiers
3. Scale construction times and complexity appropriately  
OUTPUT: Updated building recipe database
```

## Expected Resource Creation Volume

### Alternate Components by Planet Type
Based on the current system gaps, expect approximately:

```
Terrestrial Planet (TERR_): ~15-20 alternate components
- TERR_Power Source, TERR_Processing Matrix, TERR_Gas Stabilizer, etc.

System Asteroid Belt (SAB_): ~12-15 alternate components  
- SAB_Climate Controller, SAB_Safety Buffer, SAB_Emergency Transmitter, etc.

Gas Giant (GAS_): ~18-22 alternate components
- GAS_Aluminum, GAS_Iron, GAS_Copper Wire, GAS_Advanced Sensor Grid, etc.

Oceanic Planet (OCEAN_): ~20-25 alternate components
- OCEAN_Power Source, OCEAN_Reinforcement Lattice, OCEAN_Processing Matrix, etc.

Volcanic Planet (VOLCANO_): ~16-20 alternate components  
- VOLCANO_Gas Stabilizer, VOLCANO_Climate Controller, VOLCANO_Resin Sealant, etc.

Ice Giant (ICE_): ~18-22 alternate components
- ICE_Power Source, ICE_Aluminum, ICE_Processing Matrix, ICE_Climate Controller, etc.

Dark Planet (DARK_): ~14-18 alternate components
- DARK_Power Source, DARK_Processing Matrix, DARK_Advanced Sensor Grid, etc.

TOTAL ESTIMATED: 113-142 new alternate components
```

### Component Recipe Creation
Each alternate component needs a creation recipe:
```
TOTAL ESTIMATED: 113-142 new component recipes
Average ingredients per recipe: 2-4 components
Resource requirements: Emphasize planet-native basic resources
```

### Building Recipe Updates
```
86 different extractor types × 5 tiers = 430 total extractor buildings
Each building gets updated recipe with 3-8 ingredients
TOTAL ESTIMATED: 430 updated building recipes
```

## Validation Metrics & Success Criteria

### 1. Native Building Compliance
```
SUCCESS METRIC: 100% of T1-T3 buildings can be built natively
VALIDATION: For each T1-T3 building on each valid planet:
- All required components have planet-native alternatives OR
- All required components are naturally available on that planet type

EXPECTED RESULT: 
- T1 buildings: FULLY_NATIVE on all valid planets
- T2 buildings: FULLY_NATIVE on all valid planets  
- T3 buildings: FULLY_NATIVE on all valid planets
- T4-T5 buildings: CAN use imports (NOT_REQUIRED compliance)
```

### 2. Tier Progression Appropriateness
```
SUCCESS METRIC: Component tiers match extracted resource tiers
VALIDATION: For each extractor type:
- T1 resource extractors use predominantly T1 components
- T2 resource extractors use T1-T2 components  
- T3 resource extractors use T2-T3 components
- T4 resource extractors use T3-T4 components
- T5 resource extractors use T4-T5 components

EXPECTED RESULT:
- Copper Ore (T1): Uses T1 components across all building tiers
- Aluminum Ore (T2): Uses T1-T2 components, emphasizing T2 in higher tiers
- Titanium Ore (T4): Uses T3-T4 components, emphasizing T4 in higher tiers  
- Quantum Particles (T5): Uses T4-T5 components across all tiers
```

### 3. Recipe Uniqueness
```
SUCCESS METRIC: 0% duplicate recipes across building tiers
VALIDATION: No two building tiers of same extractor have identical recipes
EXPECTED RESULT: 430 unique recipes (86 extractors × 5 tiers)
```

### 4. Component Usage Distribution
```
SUCCESS METRIC: Balanced usage of available components
VALIDATION: 
- T1 components used in 60-80% of T1 resource extractor recipes
- T2 components used in 60-80% of T2 resource extractor recipes
- T3-T5 components significantly more utilized than current system

EXPECTED RESULT:
- Current T3-T5 component usage: ~15% of recipes
- Target T3-T5 component usage: ~60% of appropriate-tier recipes
```

### 5. Construction Time Scaling
```
SUCCESS METRIC: Appropriate time scaling based on resource + building tier
VALIDATION: Construction times follow formula (Resource Tier × Building Tier × 300)
EXPECTED RESULT:
- T1 resource extractors: 5min to 25min construction times
- T5 resource extractors: 25min to 125min construction times
```

## Quality Assurance Checklist

### Pre-Generation Validation
- [ ] All 86 extractor types identified and classified by extracted resource tier
- [ ] All 7 planet types mapped with native resource availability
- [ ] Component gap analysis completed for each planet type
- [ ] Tier progression rules clearly defined

### Post-Generation Validation  
- [ ] All T1-T3 buildings have FULLY_NATIVE or PARTIALLY_NATIVE compliance
- [ ] No duplicate recipes exist across building tiers within same extractor
- [ ] Component tier usage matches extracted resource tier guidelines
- [ ] Construction times scale appropriately with complexity
- [ ] All new alternate components have viable creation recipes
- [ ] Recipe ingredient counts match tier requirements (3,4,5,6,7-8)

### Economic Balance Validation
- [ ] T1 resource extractors remain accessible to new players
- [ ] T5 resource extractors require established industrial base
- [ ] Planet specialization creates meaningful trade opportunities  
- [ ] Native building reduces but doesn't eliminate inter-planet trade
- [ ] Higher building tiers provide meaningful capability increases

## Expected Performance Impact

### Player Experience Improvements
```
+ Reduced dependency on inter-planet trade for basic infrastructure
+ More meaningful progression from T1 to T5 extractors
+ Planet specialization becomes more strategically important  
+ Late-game logistics complexity appropriately challenging
+ Native building capability reduces early-game trade bottlenecks
```

### Economic System Impact
```
+ Increased demand for T3-T5 components in late-game
+ More diverse supply chain requirements across tiers
+ Planet-specific component advantages create trade opportunities
+ Reduced early-game trade pressure, increased late-game complexity
+ More viable single-planet development strategies for T1-T3 buildings
```

### Development Workload
```
Asset Creation Required:
- ~130 new alternate component definitions
- ~130 new component creation recipes  
- 430 updated building recipes
- Component tier rebalancing
- Construction time rebalancing
- Economic impact testing

Estimated Development Time: 2-3 weeks full-time development
```

## Implementation Phases

### Phase 1: Core System Components (Week 1)
- Generate alternate components for most critical gaps
- Update T1-T2 resource extractor recipes
- Implement basic native compliance system

### Phase 2: Complete Coverage (Week 2)  
- Generate all remaining alternate components
- Update T3-T5 resource extractor recipes
- Implement construction time scaling

### Phase 3: Balance & Polish (Week 3)
- Economic balance testing
- Recipe optimization based on playtesting
- Documentation and player communication

This systematic approach will create a robust native building system that maintains appropriate complexity scaling while enabling meaningful planet-based development strategies.