# Building Recipe Analyzer

## Overview
The Building Recipe Analyzer is a comprehensive validation tool that checks generated building recipes against all construction rules and constraints.

## Features

### 1. **Rule Validation**
The analyzer validates the following rules:

#### Native Building Requirements (T1-T3)
- Buildings up to Tier 3 must be constructible using only native planet resources
- Checks component dependency chains to ensure all ingredients can be sourced locally

#### Banned Components Check
- Identifies and flags any weapon or ship-specific components that shouldn't be used in buildings
- Banned components include:
  - Weapon systems (Blast Charges, Beam Emitter, etc.)
  - Ship control systems (Crystal Lattice MUD/ONI/Ustur, etc.)
  - Ship-specific systems (Cooling Network Hub, Neural Networks, etc.)

#### Tier Restrictions
- **Infrastructure Buildings**: Components should match building tier
- **Resource Extractors/Processors (T1-T3)**: Ingredients cannot exceed resource tier
- **Resource Extractors/Processors (T4-T5)**: Can use higher tier ingredients

#### Progression Rules
- Building recipes must maintain ingredients from lower tiers (build-up progression)
- Exception: T1→T2 infrastructure can replace raw materials with processed components

### 2. **Analysis Output**

#### Validation Status
- Clear pass/fail indication
- Total violation count
- Affected recipe count

#### Violation Categories
- Banned Components
- Tier Violations
- Native Building Violations
- Infrastructure Violations
- Progression Violations

#### Statistics
- Total recipes analyzed
- Unique components used
- Tier distribution
- Planet and type breakdown

### 3. **Export Options**
- Detailed text report with all violations
- Categorized violation listings
- Summary statistics

## How to Use

1. **Generate Building Recipes**
   - Use the Building Recipes tab to generate recipes
   - Export the results as TSV

2. **Analyze Recipes**
   - Navigate to the Recipe Analyzer tab
   - Paste the TSV data (including headers) into the text area
   - Click "Analyze Recipes"

3. **Review Results**
   - Check the validation status (Pass/Fail)
   - Review any violations found
   - Export detailed report if needed

## Validation Rules in Detail

### Native Building Check
```
For buildings T1-T3:
- All ingredients must be either:
  - Native resources to the planet
  - Components that can be crafted from native resources
```

### Tier Restriction Rules
```
Infrastructure (Hubs, Power Plants, Crew Quarters):
- T1: Can use T1 components
- T2: Can use T1-T2 components
- T3: Can use T1-T3 components
- etc.

Resource Extractors/Processors:
- T1-T3: Max ingredient tier = resource tier
- T4-T5: Can use higher tier ingredients
```

### Progression Rules
```
T1 → T2: 
- Infrastructure: Can replace raw materials
- Others: Must maintain T1 ingredients

T2 → T3 → T4 → T5:
- Must maintain all previous ingredients
- Can add new ingredients
- Can increase quantities
```

## Example Violations

### Banned Component
```
❌ oceanic-central-hub-t2 (T2): Uses Blast Charges x21
    Reason: Weapon component in building recipe
```

### Tier Violation
```
❌ oceanic-copper-ore-extractor-t2: 
    T2 building using T3 component (resource is T1)
    Component: Advanced Matrix
```

### Native Building Violation
```
❌ volcanic-iron-processor-t3 (T3 on Volcanic Planet):
    Component: Aluminum - Not native to planet
```

### Progression Violation
```
❌ barren-storage-hub-t3:
    Ingredient removed in tier progression
    Missing: Copper Wire (from T2)
``` 