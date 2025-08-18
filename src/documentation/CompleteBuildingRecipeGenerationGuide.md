# Complete Building Recipe Generation Process Guide

## Overview
This document details the exact process for generating building recipes for planetary claim stake systems, including infrastructure, processors, extractors, and farm modules while maintaining bootstrap accessibility and tier progression balance.

---

## Phase 1: System Foundation Understanding

### 1.1 Dual-Tier System Rules
**Resource Tier (T1-T5)**: Inherent complexity/rarity of the resource being produced
- T1: Basic materials (Abyssal Chromite, Hydrogen, Iron Ore)
- T2: Intermediate materials (Argon, Silver Ore, Aluminum Ore) 
- T3: Advanced materials (Gold Ore, Bathysphere Pearls, Neon)
- T4: Rare materials (Iridium Ore, Quantum Computational Substrate)
- T5: Exotic materials (Quantum Particle, Resonium Ore, Living Metal Symbionts)

**Building Tier (T1-T5)**: Technological sophistication of the building itself
- T1: Basic construction, simple recipes
- T2: Improved efficiency, moderate complexity
- T3: Advanced technology, complex recipes  
- T4: High-tech systems, very complex recipes
- T5: Cutting-edge technology, extremely complex recipes

### 1.2 Core Building Recipe Tier Rules
**±2 Tier Range Rule**: Every building operates within a maximum range of 2 tiers up and down from its target resource tier, modified by building tier.

**Resource Tier Progression Examples**:
- T1 Resource Buildings: T1 uses T1 only → T5 uses T1-T3
- T3 Resource Buildings: T1 uses T1-T3 → T5 uses T3-T5  
- T5 Resource Buildings: T1 uses T3-T5 → T5 uses T4-T5

**Minimum Tier Rules**:
- T4 Resources: Building recipes cannot use materials below T2
- T5 Resources: Building recipes cannot use materials below T3
- T3+ Buildings for T4/T5 Resources: MUST include at least one component at the resource tier or higher

---

## Phase 2: Resource Classification & Analysis

### 2.1 Raw Resource Classification
**Always Direct Use (No Processing Required)**:
- Crystals: Diamond, Ruby, Sapphire, Quartz, Garnet, Topaz, Peridot, etc.
- Gases: Argon, Hydrogen, Neon, Xenon, Krypton, Nitrogen, Fluorine Gas, etc.
- Organic: Biomass, Thermoplastic Resin, Amber Resin
- Unique: Arco, Germanium, Silicon Crystal, Lumanite, Thermal Regulator Stone, etc.

**Ores - Bootstrap Exception Only**:
- All Ores: Iron Ore, Copper Ore, Silver Ore, Titanium Ore, etc.
- Bootstrap Buildings: Can use raw ores directly
- All Other Buildings: Must use refined metals (Iron Ore → Iron → Iron Components)

### 2.2 Planet-Specific Native Resource Identification
For each planet, identify ALL native resources by tier:
```
EXAMPLE - Oceanic Planet Native Resources:
T1: Abyssal Chromite, Biomass, Hydrogen, Nitrogen, Marine Bio Extract
T2: Argon, Cobalt Ore, Fluorine Gas, Manganese Ore, Oxygen, Thermal Bloom Sediment, Bioluminous Algae  
T3: Bathysphere Pearls, Neural Coral Compounds, Phase Shift Crystals
T4: Abyssal Energy Crystals
T5: Lunar Echo Crystals
```

### 2.3 Self-Sufficiency Tier Determination
**Native Building Requirement**: T1-T3 claim stakes must be buildable with ONLY native planet resources.
- Analyze which tiers the planet can support natively
- T4+ resources may require imports from other planets
- Document the "native capability ceiling" for each planet

---

## Phase 3: Existing Component Analysis

### 3.1 Component Compatibility Assessment
For each existing component, determine:
1. **Planet Compatibility**: Can it be made with native resources?
2. **Tier Match**: Does the tier align with available native materials?
3. **Recipe Feasibility**: Are ALL ingredients available natively?
4. **Production Steps**: Is it ≤2 steps from raw materials?

**Example Analysis Process**:
```
Component: Chromite Ingot (T1)
- Recipe: Abyssal Chromite (T1)
- Native Available: YES (Oceanic Planet has Abyssal Chromite T1)
- Production Steps: 1 (Raw → Component)
- Verdict: USE EXISTING COMPONENT ✓

Component: Neural Interface (T3)  
- Recipe: Neural Coral Compounds + Palladium
- Native Available: NO (Palladium not native to Oceanic Planet)
- Production Steps: 2+ (requires imports)
- Verdict: CREATE NEW COMPONENT ✗
```

### 3.2 Gap Analysis for New Components
Identify gaps where new components are needed:
1. **No Existing Equivalent**: Resource type has no existing component
2. **Non-Native Dependencies**: Existing component requires imported materials
3. **Wrong Tier**: Existing component tier doesn't match resource tier
4. **Too Complex**: Existing component exceeds 2-step production limit

### 3.3 New Component Creation Rules
**Only create new components when**:
- No existing component serves the purpose
- All ingredients can be sourced natively
- Fits within 2-step production chain
- Tier aligns with intended use case

**New Component Naming Convention**:
- Format: `[planet]-[function]` (e.g., `oceanic-bio-kelp`)
- Purpose-driven names that indicate function
- Consistent with existing component naming patterns

---

## Phase 4: Building Category Definition

### 4.1 Infrastructure Buildings (Bootstrap Exception)
**Central Hub**: 
- T1: Auto-built (no cost, comes with claim stake)
- T2-T5: Uses processed components

**Cultivation Hub**: 
- T1: Auto-built (no cost, alternative to Central Hub that comes with claim stake)
- T2-T5: Uses processed components

**Strategic Choice Hubs**: (Processing, Extraction, Farm, Storage)
- T1: Uses raw native materials (bootstrap exception)
- T2-T5: Uses processed components

**CHUB Modules**: (Power Plant, Crew Quarters)
- T1: Uses raw native materials (bootstrap exception)  
- T2-T5: Uses processed components

**Bootstrap Logic**: These buildings are essential for claim stake operation, so T1 versions can use raw materials to solve the "chicken-and-egg" problem.

### 4.2 Processor Buildings
**Purpose**: Convert raw materials to components

**Basic Component Processors** (Bootstrap Exception):
- Convert native raw materials to basic T1 components
- T1 versions can use raw materials
- T2+ versions use processed materials for efficiency

**Advanced Component Processors**:
- Convert basic components to advanced components
- Always use processed materials (no bootstrap exception)
- Follow tier progression rules

### 4.3 Extractor Buildings  
**Purpose**: Extract raw resources using processed components

**Resource Tier Categories**:
- T1 Resources: Simple extraction recipes
- T2 Resources: Moderate complexity
- T3 Resources: Advanced extraction requiring T3 components
- T4 Resources: Complex extraction, minimum T2 materials
- T5 Resources: Exotic extraction, minimum T3 materials

### 4.4 Farm Module Buildings
**Purpose**: Extract plant/organic resources

**Plant Tier Processing**:
- T1 Plants: Basic farm equipment
- T2 Plants: Intermediate cultivation systems  
- T3+ Plants: Advanced bio-processing systems

---

## Phase 5: Recipe Construction Process

### 5.1 Build-Up Recipe System Implementation
**Core Principle**: Maintain consistency across building tiers through additive progression

**Recipe Progression Rules**:
1. **Maintain Existing Slots**: Never remove ingredients from previous tiers
2. **Never Decrease Quantities**: Previous quantities stay same or increase
3. **Add Complexity**: New ingredient slots for higher tiers
4. **Increase Base Quantities**: Core ingredients scale up
5. **Introduce Higher-Tier Materials**: New slots use higher-tier components

**Example Pattern**:
```
T1 Building: 
├─ Slot 1: Basic Component (qty 8)
└─ Slot 2: Secondary Component (qty 6)

T2 Building:
├─ Slot 1: Basic Component (qty 10) ← increased
├─ Slot 2: Secondary Component (qty 8) ← increased  
└─ Slot 3: T2 Component (qty 4) ← new slot

T3 Building:
├─ Slot 1: Basic Component (qty 12) ← increased
├─ Slot 2: Secondary Component (qty 10) ← increased
├─ Slot 3: T2 Component (qty 6) ← increased
└─ Slot 4: T3 Component (qty 3) ← new slot
```

### 5.2 Quantity Scaling Patterns
**Infrastructure Buildings**:
- T1→T2: +20-25% base quantities, +1-2 new ingredients
- T2→T3: +15-20% quantities, +1-2 new ingredients  
- T3→T4: +15-20% quantities, +1 new ingredient (T4+ required)
- T4→T5: +10-15% quantities, +1 new ingredient (T5 components)

**Processing Buildings**:
- Faster progression, smaller quantity increases
- Focus on efficiency gains rather than complexity

**Extraction Buildings**:
- Larger quantity scaling for higher resource tiers
- More complex recipes for exotic resource extraction

### 5.3 Construction Time Scaling
**Time Pattern by Building Type**:
```
Infrastructure: 90→135→180→270→360 minutes
Processors: 60→45→30→25→20 minutes (efficiency gain)
Extractors T1-T2: 90→75→60→50→40 minutes  
Extractors T3: 180→150→120→100→80 minutes
Extractors T4: 300→250→200→160→120 minutes
Extractors T5: 480→400→320→250→200 minutes
Farm Modules: 90→75→60→50→40 minutes
```

---

## Phase 6: Bootstrap Progression Logic

### 6.1 Player Choice Flexibility
**Initial Choices Must Not Force Paths**:
- All T1 hubs can be built with raw materials
- No T1 building should require processed components
- Players can choose Processing Hub OR Extraction Hub first
- Components from one path shouldn't block other paths initially

### 6.2 Progressive Complexity Introduction
**Phase 1 - Bootstrap** (Raw Materials Allowed):
- Central Hub (auto-built)
- Choice of first hub (Processing/Extraction/Farm/Storage)  
- Power Plant and Crew Quarters (optional)

**Phase 2 - Basic Processing** (Processed Components Required):
- Basic component processors (Chromite Ingot, Bio Kelp, etc.)
- T1 extractors using basic processed components
- T1 farm modules for plant extraction

**Phase 3 - Advanced Processing** (Complex Components):
- Advanced component processors (Gas Stabilizer, Cobalt, etc.)
- T2 extractors using advanced components
- T2 farm modules for advanced plants

**Phase 4 - Exotic Operations** (Import Requirements):
- T3+ component processors
- T3+ extractors (may require imports)
- Cross-planet supply chains

### 6.3 Component Availability Timing
**Ensure Logical Progression**:
1. Raw materials → Basic components (immediate)
2. Basic components → Advanced components (after Processing Hub)
3. Advanced components → Extraction capability (after Extraction Hub)
4. Extraction → Higher-tier raw materials (expanding capability)

---

## Phase 7: Tier Range Validation

### 7.1 Building Tier vs Resource Tier Matrix
For each building, validate ingredient tiers against rules:

**T1 Resource Buildings**:
- T1 Building: T1 materials only
- T2 Building: T1-T2 materials
- T3 Building: T1-T3 materials  
- T4 Building: T1-T4 materials (shifts up)
- T5 Building: T1-T5 materials (shifts up further)

**T3 Resource Buildings**:
- T1 Building: T1-T3 materials (T1 minimum allowed)
- T2 Building: T1-T4 materials
- T3 Building: T2-T4 materials (MUST include T3+ component)
- T4 Building: T3-T5 materials  
- T5 Building: T3-T5 materials

**T5 Resource Buildings**:
- T1 Building: T3-T5 materials (T3 minimum enforced)
- T2 Building: T3-T5 materials
- T3 Building: T3-T5 materials (MUST include T4/T5 components)
- T4 Building: T4-T5 materials (high-end only)
- T5 Building: T4-T5 materials (cutting-edge only)

### 7.2 Validation Checklist
For each recipe, verify:
- [ ] All ingredients fall within allowed tier range
- [ ] T4+ resources don't use sub-T2 materials  
- [ ] T5+ resources don't use sub-T3 materials
- [ ] T3+ buildings for T4/T5 resources include tier-appropriate components
- [ ] Bootstrap buildings only use raw materials in T1 versions
- [ ] Build-up progression maintains previous ingredients

---

## Phase 8: Recipe Complexity Metrics

### 8.1 Difficulty Scoring System
**Base Difficulty Factors**:
- Ingredient Count: +1 point per ingredient
- Tier Spread: +1 point per tier above minimum
- Construction Time: +0.1 point per 10 minutes
- Resource Tier: +1 point per resource tier
- Import Requirements: +3 points if requires non-native materials

**Complexity Categories**:
- Simple (1-5 points): Basic T1 buildings
- Moderate (6-10 points): T2-T3 buildings  
- Complex (11-15 points): Advanced T3-T4 buildings
- Exotic (16+ points): T5 buildings and imports required

### 8.2 Balance Validation Metrics
**Recipe Balance Checks**:
- Ingredient diversity (avoid single-component dominance)
- Quantity progression (logical scaling)
- Time efficiency (higher tiers = better time/output ratio)
- Resource accessibility (native materials preferred)

---

## Phase 9: Output Generation

### 9.1 CSV Format Specification
```
OutputID	OutputName	OutputType	OutputTier	ConstructionTime	PlanetTypes	Factions	ResourceType	ProductionSteps	Ingredient1	Quantity1	Ingredient2	Quantity2	Ingredient3	Quantity3	Ingredient4	Quantity4	Ingredient5	Quantity5	Ingredient6	Quantity6	Ingredient7	Quantity7	Ingredient8	Quantity8
```

### 9.2 Naming Convention Standards
**Building ID Format**: `[planet]-[building-name]-[tier]`
- Example: `oceanic-chromite-ingot-processor-t1`

**Component ID Format**: `[planet]-[component-name]` or existing ID
- Example: `oceanic-bio-kelp` (new) or `chromite-ingot` (existing)

### 9.3 Data Consistency Rules
- Faction availability matches source data
- Planet types correctly specified  
- Resource types properly categorized (Infrastructure/Processing/Extraction/Farm)
- Production steps accurate (0 for extractors, 1+ for processors)

---

## Phase 10: Validation & Quality Assurance

### 10.1 Self-Sufficiency Validation
**For T1-T3 Claim Stakes**:
- [ ] All required buildings can be constructed with native resources
- [ ] No circular dependencies in component chains
- [ ] Bootstrap path exists from raw materials to all T3 capabilities
- [ ] Player has meaningful choices in build order

### 10.2 Progression Logic Validation  
**Bootstrap Progression**:
- [ ] T1 buildings provide foundation for T2+ buildings
- [ ] Component processors unlock before buildings that need components
- [ ] No forced single-path dependencies in early game
- [ ] Clear upgrade paths from basic to advanced operations

### 10.3 Balance Validation
**Recipe Reasonableness**:
- [ ] Ingredient quantities scale logically across tiers
- [ ] Construction times reflect building complexity
- [ ] Resource costs appropriate for building function
- [ ] No ingredients used in excessive quantities

---

## Phase 11: Cross-Planet Considerations

### 11.1 Component Reusability Analysis
**Before Creating New Components**:
1. Check if ANY existing component could serve the purpose
2. Verify if existing component recipe can be made native to planet
3. Consider if slight recipe modification could enable reuse
4. Only create new component if no existing alternative works

### 11.2 Trade Network Integration
**For T4+ Operations**:
- Identify which components will require imports
- Document trade dependencies between planets  
- Ensure each planet has exportable specializations
- Maintain strategic resource distribution across planets

### 11.3 Global Component Library Management
**Component Creation Standards**:
- Always prefer existing components when possible
- New components must have clear, unique purpose
- Naming must follow established conventions
- Recipes must use native materials when possible

---

## Phase 12: Implementation Process Summary

### 12.1 Step-by-Step Execution Order
1. **Analyze** native planet resources by tier
2. **Inventory** existing components usable with native materials
3. **Identify** gaps requiring new component creation
4. **Design** new components with minimal, purpose-driven recipes
5. **Generate** infrastructure building recipes (T1 raw, T2+ processed)
6. **Generate** basic processor recipes (bootstrap exceptions)
7. **Generate** advanced processor recipes (processed materials)
8. **Generate** extractor recipes by resource tier (processed materials)
9. **Generate** farm module recipes (plant extraction)
10. **Validate** all recipes against tier rules and progression logic
11. **Calculate** complexity metrics and balance scores
12. **Output** final CSV with proper formatting and IDs

### 12.2 Quality Gates
**Before Finalizing**:
- [ ] All tier range rules enforced
- [ ] Bootstrap progression logic maintained
- [ ] Component reuse maximized
- [ ] New component creation minimized
- [ ] Self-sufficiency requirements met
- [ ] Recipe complexity properly scaled
- [ ] Build-up progression implemented correctly

---

## Appendix A: Common Pitfalls & Solutions

**Pitfall**: Creating new components when existing ones could work
**Solution**: Always complete component compatibility analysis first

**Pitfall**: Breaking bootstrap progression with component dependencies  
**Solution**: Ensure T1 buildings never require processed components

**Pitfall**: Violating tier range rules for high-tier resources
**Solution**: Use tier validation matrix for every recipe

**Pitfall**: Creating forced progression paths that limit player choice
**Solution**: Verify multiple viable build orders exist

**Pitfall**: Inconsistent quantity scaling across building tiers
**Solution**: Use standardized scaling patterns and validate progression

---

## Appendix B: Example Decision Trees

### B.1 Component Selection Decision Tree
```
Need component for building recipe?
├─ Check existing components for planet compatibility
│   ├─ Compatible existing component found?
│   │   └─ USE EXISTING COMPONENT ✓
│   └─ No compatible existing component?
│       ├─ Can existing component recipe be modified for native compatibility?
│       │   ├─ Yes → Modify and use existing
│       │   └─ No → Continue to new component creation
│       └─ Create new component with native-only ingredients
```

### B.2 Building Tier Recipe Decision Tree
```
Generating recipe for building tier X targeting resource tier Y?
├─ Is this infrastructure building T1?
│   └─ Yes → Use raw native materials (bootstrap exception)
├─ Is this a processor building?
│   ├─ T1 basic processor → Can use raw materials
│   └─ T2+ processor → Must use processed components
└─ Is this extractor/farm building?
    └─ Must use processed components, follow tier range rules
```

This process ensures consistent, balanced, and strategically sound building recipes that maintain both gameplay accessibility and meaningful progression complexity.