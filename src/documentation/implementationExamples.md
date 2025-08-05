# Implementation Examples & Validation Guide

## Example 1: T1 Resource Extractor (Copper Ore)

### Current Broken System:
```
copper-ore-extractor-t1: Copper + MULTI_Power Source + Copper Wire
copper-ore-extractor-t2: Aluminum + MULTI_Power Source + Copper + Copper Wire  
copper-ore-extractor-t3: Aluminum + Copper Wire + Copper + Power Source + Iron
copper-ore-extractor-t4: Aluminum + Copper Wire + Copper + Power Source + Iron + Tin
copper-ore-extractor-t5: Aluminum + Copper Wire + Copper + Power Source + Iron + Tin
```
**Problems**: T4-T5 identical, uses T2 components for T1 resource, no native compliance

### Expected New System:
```
=== COPPER ORE EXTRACTOR (T1 Resource) ===

T1 Building (Deployable on: Barren Planet, System Asteroid Belt):
SAB_Copper,SAB_Power Source,Extraction Tools | 1,1,1 | 300s | FULLY_NATIVE
BARREN_Copper,BARREN_Power Source,Extraction Tools | 1,1,1 | 300s | FULLY_NATIVE

T2 Building:  
SAB_Copper,SAB_Power Source,Copper Wire,SAB_Control Circuit | 1,1,1,1 | 600s | FULLY_NATIVE
BARREN_Copper,BARREN_Power Source,Copper Wire,BARREN_Control Circuit | 1,1,1,1 | 600s | FULLY_NATIVE

T3 Building:
Copper,Power Source,Copper Wire,Iron,Alloy Frame | 1,1,1,1,1 | 900s | FULLY_NATIVE

T4 Building:  
Copper,Power Source,Copper Wire,Iron,Tin,Processing Core | 1,1,1,1,1,1 | 1200s | NOT_REQUIRED

T5 Building:
Copper,Energy Cells,Copper Wire,Iron,Tin,Processing Core,Monitoring Circuits | 1,1,1,1,1,1,1 | 1500s | NOT_REQUIRED
```

**New Alternate Components Created:**
```
SAB_Copper | Copper variant for System Asteroid Belt | T1 | ENERGY;EM;UTILITY;WEAPONS
SAB_Power Source | Power Source variant for System Asteroid Belt | T1 | ENERGY
SAB_Control Circuit | Control Circuit variant for System Asteroid Belt | T1 | ENERGY
BARREN_Copper | Copper variant for Barren Planet | T1 | ENERGY;EM;UTILITY;WEAPONS  
BARREN_Power Source | Power Source variant for Barren Planet | T1 | ENERGY
BARREN_Control Circuit | Control Circuit variant for Barren Planet | T1 | ENERGY
```

## Example 2: T2 Resource Extractor (Aluminum Ore)

### Expected New System:
```
=== ALUMINUM ORE EXTRACTOR (T2 Resource) ===

T1 Building (Deployable on: System Asteroid Belt, Terrestrial Planet):
SAB_Iron,SAB_Power Source,SAB_Aluminum | 1,1,1 | 600s | FULLY_NATIVE
TERR_Iron,TERR_Power Source,Aluminum | 1,1,1 | 600s | FULLY_NATIVE

T2 Building:
SAB_Iron,SAB_Power Source,Aluminum,SAB_Copper Wire | 1,1,1,1 | 1200s | FULLY_NATIVE  
TERR_Iron,TERR_Power Source,Aluminum,TERR_Copper Wire | 1,1,1,1 | 1200s | FULLY_NATIVE

T3 Building:
Iron,Aluminum,Power Router,Advanced Sensor Grid,Reinforcement Lattice | 1,1,1,1,1 | 1800s | FULLY_NATIVE

T4 Building:
Aluminum,Power Router,Advanced Sensor Grid,Gas Stabilizer,Processing Matrix,Energy Crystal Matrix | 1,1,1,1,1,1 | 2400s | NOT_REQUIRED

T5 Building:  
Aluminum,Advanced Sensor Grid,Gas Stabilizer,Processing Matrix,Energy Crystal Matrix,Vanadium Alloy,Neural Interface | 1,1,1,1,1,1,1 | 3000s | NOT_REQUIRED
```

**New Alternate Components Created:**
```
SAB_Iron | Iron variant for System Asteroid Belt | T1 | KINETIC;WEAPONS;HABITAT
TERR_Iron | Iron variant for Terrestrial Planet | T1 | KINETIC;WEAPONS;HABITAT
TERR_Power Source | Power Source variant for Terrestrial Planet | T1 | ENERGY
TERR_Copper Wire | Copper Wire variant for Terrestrial Planet | T1 | (empty category)
```

## Example 3: T4 Resource Extractor (Titanium Ore)

### Expected New System:
```
=== TITANIUM ORE EXTRACTOR (T4 Resource) ===

T1 Building (Deployable on: System Asteroid Belt):
SAB_Aluminum,SAB_Power Router,SAB_Advanced Sensor Grid | 1,1,1 | 1200s | FULLY_NATIVE

T2 Building:
SAB_Aluminum,SAB_Power Router,SAB_Processing Matrix,SAB_Reinforcement Lattice | 1,1,1,1 | 2400s | FULLY_NATIVE

T3 Building:
Aluminum,Power Router,Processing Matrix,Energy Crystal Matrix,Vanadium Alloy | 1,1,1,1,1 | 3600s | FULLY_NATIVE

T4 Building:
Energy Crystal Matrix,Vanadium Alloy,Titanium Framework,EM Quantum Core,Hicenium Lattice,Utility Matrix | 1,1,1,1,1,1 | 4800s | NOT_REQUIRED  

T5 Building:
Titanium Framework,EM Quantum Core,Hicenium Lattice,Utility Matrix,Rhodium Power Core,Control System Core,Kinetic Beryllium Core | 1,1,1,1,1,1,1 | 6000s | NOT_REQUIRED
```

**New Alternate Components Created:**
```
SAB_Power Router | Power Router variant for System Asteroid Belt | T2 | ENERGY
SAB_Advanced Sensor Grid | Advanced Sensor Grid variant for System Asteroid Belt | T2 | UTILITY  
SAB_Processing Matrix | Processing Matrix variant for System Asteroid Belt | T2 | EM
SAB_Reinforcement Lattice | Reinforcement Lattice variant for System Asteroid Belt | T2 | KINETIC
```

## Example 4: T5 Resource Extractor (Quantum Particles)

### Expected New System:
```
=== QUANTUM PARTICLE EXTRACTOR (T5 Resource) ===

T1 Building (Deployable on: [Wherever quantum particles appear]):
SPACE_Aluminum,SPACE_Energy Crystal Matrix,SPACE_Neural Interface | 1,1,1 | 1500s | FULLY_NATIVE

T2 Building:  
SPACE_Energy Crystal Matrix,SPACE_Neural Interface,SPACE_Coordination Matrix,SPACE_Titanium Framework | 1,1,1,1 | 3000s | FULLY_NATIVE

T3 Building:
Energy Crystal Matrix,Neural Interface,Titanium Framework,EM Quantum Core,Hicenium Lattice | 1,1,1,1,1 | 4500s | FULLY_NATIVE

T4 Building:
EM Quantum Core,Hicenium Lattice,Utility Matrix,Rhodium Power Core,Quantum Interface Core,Living Metal Network | 1,1,1,1,1,1 | 6000s | NOT_REQUIRED

T5 Building:
Quantum Interface Core,Living Metal Network,Kinetic Beryllium Core,Fusion Energy Core,Adaptive Utility Core,Assembly Control Matrix,Energy Network Core | 1,1,1,1,1,1,1 | 7500s | NOT_REQUIRED
```

## Component Creation Recipe Examples

### T1 Alternate Components:
```
SAB_Copper:
Inputs: Copper Ore + Iron + Energy Cells | 2,1,1 | 900s | System Asteroid Belt
Description: Asteroid-refined copper with enhanced conductivity for space environments

TERR_Power Source:  
Inputs: Iron + Copper + Generator Coils | 1,1,1 | 900s | Terrestrial Planet
Description: Terrestrial-adapted power generation unit using planetary magnetic fields

OCEAN_Iron:
Inputs: Iron Ore + Nitrogen Gas + Structural Shell | 2,1,1 | 1200s | Oceanic Planet  
Description: Corrosion-resistant iron alloy designed for high-moisture environments
```

### T2 Alternate Components:
```
GAS_Aluminum:
Inputs: Aluminum Ore + Argon + Gas Stabilizer | 2,1,1 | 1800s | Gas Giant
Description: Gas giant aluminum processing utilizing atmospheric pressure advantages

VOLCANO_Climate Controller:
Inputs: Garnet Crystals + Iron + Thermal Control Unit | 2,1,1 | 2400s | Volcanic Planet
Description: Heat-resistant climate control system for extreme temperature environments

ICE_Processing Matrix:  
Inputs: Quartz Crystals + Nitrogen Gas + Processing Core | 3,1,1 | 2100s | Ice Giant
Description: Cryogenic-optimized processing system for sub-zero operations
```

## Validation Test Cases

### Test Case 1: Native Building Capability
```
FOR EACH T1-T3 building on EACH valid planet:
1. Identify all required components
2. Verify each component is either:
   a) Naturally available on that planet type, OR
   b) Has a planet-specific alternate available on that planet type
3. Verify all alternate component creation recipes use only planet-native resources
4. PASS: Building can be constructed using only planet resources
5. FAIL: Building requires imported components
```

### Test Case 2: Tier Progression Logic
```
FOR EACH extractor type:
1. Identify the tier of resource being extracted
2. FOR EACH building tier T1-T5:
   a) Verify component tiers match expected ranges for that resource tier
   b) Verify component count matches tier (3,4,5,6,7-8)
   c) Verify construction time follows scaling formula
3. PASS: All building tiers use appropriate component tiers  
4. FAIL: Component tiers don't match extracted resource tier guidelines
```

### Test Case 3: Recipe Uniqueness
```  
FOR EACH extractor type:
1. Compare recipes across all building tiers T1-T5
2. PASS: All 5 recipes are unique (no identical ingredient lists)
3. FAIL: Any duplicate recipes found
```

### Test Case 4: Economic Balance
```
FOR EACH component tier T1-T5:
1. Count usage frequency across all appropriate-tier recipes  
2. PASS: T3-T5 components used in >50% of appropriate recipes
3. FAIL: T3-T5 components remain under-utilized
```

## Expected Output Volume Summary

### Alternate Components by Category:
```
T1 Alternates: ~70-80 components (most needed for native T1-T3 building)
T2 Alternates: ~40-50 components (fill gaps in T2-T3 native building)
T3 Alternates: ~10-15 components (limited gaps, mostly planet-specific variants)
T4+ Alternates: ~5-10 components (minimal need, T4-T5 buildings allow imports)

TOTAL: 125-155 new alternate components
```

### Recipe Updates:
```
Building Recipes: 430 updated (86 extractors × 5 tiers)
Component Recipes: 125-155 new component creation recipes
Total Recipe Changes: 555-585 recipes
```

### Development Validation:
```
Manual Spot-Check Required: ~20-30 extractor progressions
Automated Validation: All 430 building recipes + all component recipes
Economic Balance Testing: Full system playtesting recommended
Performance Impact: Monitor recipe lookup/generation performance
```

This comprehensive system will create meaningful tier progression while enabling native building capability that reduces early-game trade dependency without eliminating late-game logistics complexity.