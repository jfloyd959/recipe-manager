# SHIP_PROPULSION_SYSTEMS - Detailed Implementation Guide (CORRECTED)

## **FINAL PRODUCT RECIPES**

### **Propulsion System Products (150 total):**
```
• Subwarp Engine: XXXS-TTN × T1-T5 = 50 products
• Warp Drive: XXXS-TTN × T1-T5 = 50 products
• Maneuvering Thrusters: XXXS-TTN × T1-T5 = 50 products
```

## **BASE RECIPE PATTERNS (Using ACTUAL Components.csv entries)**

### **Subwarp Engine Recipe Pattern**
**Function:** Sub-light speed propulsion system for normal space travel

#### **Base Subwarp Engine Recipe (XXXS-M sizes):**
```
Subwarp Engine = 
├── Propulsion Core [T3] (from Components.csv) - Primary thrust generation system
├── Engine Manifold [T2] (from Components.csv) - Thrust distribution and control
└── Fuel Injector [T2] (from Components.csv) - Fuel delivery and combustion control
```

---

### **Warp Drive Recipe Pattern**
**Function:** Faster-than-light travel through space-time manipulation

#### **Base Warp Drive Recipe (XXXS-M sizes):**
```
Warp Drive = 
├── Warp Field Generator [T4] (from Components.csv) - Space-time distortion field
├── Subspace Conduit [T3] (from Components.csv) - Subspace energy channeling
└── Exotic Stabilizer [T4] (from Components.csv) - Field stability and control
```

---

### **Maneuvering Thrusters Recipe Pattern**
**Function:** Precision attitude control and maneuvering system

#### **Base Maneuvering Thrusters Recipe (XXXS-M sizes):**
```
Maneuvering Thrusters = 
├── Propulsion Core [T3] (from Components.csv) - Thrust generation (smaller scale)
├── Engine Manifold [T2] (from Components.csv) - Multi-directional thrust control
└── Thrust Vectoring [T2] (from Components.csv) - Precision direction control
```

#### **Large Propulsion Scaling (L-TTN sizes):**
```
All Propulsion-L = Base Recipe + Thrust Amplification Module [ENERGY_MATERIAL]
All Propulsion-CAP = Base Recipe + Propulsion Coordination Hub [ELECTRONIC_COMPONENT]
All Propulsion-CMD = Base Recipe + Advanced Navigation Core [ELECTRONIC_COMPONENT]
All Propulsion-CLASS8 = Base Recipe + Massive Drive Assembly [STRUCTURAL_ALLOY]
All Propulsion-TTN = Base Recipe + Titan Propulsion Matrix [EXOTIC_ELEMENT]
```

---

## **INGREDIENT COMPONENT RECIPES (Using Real Components.csv + Real Raw.csv)**

### **1. Propulsion Core [T3] - Thrust Generation**
**Function:** Primary thrust generation system for spacecraft propulsion

#### **Propulsion Core breakdown to ACTUAL Raw.csv materials:**
```
Propulsion Core [T3] requires these ACTUAL raw materials:
├── Lumanite [RAW from Volcanic Planet] - High-energy thrust generation
├── Hafnium Ore [RAW from Volcanic Planet] - High-temperature engine core
├── Iridium Ore [RAW from Volcanic Planet] - Ultra-high temperature resistance
├── Tantalum Ore [RAW from Volcanic Planet] - Corrosion-resistant engine internals
├── Thermal Regulator Stone [RAW from Volcanic Planet] - Heat management
├── Platinum Ore [RAW from Volcanic Planet] - Premium engine components
└── Diamond [RAW from Volcanic/Dark/Ice Giant] - Ultra-hard engine surfaces
```

---

### **2. Engine Manifold [T2] - Thrust Distribution**
**Function:** Thrust distribution and directional control system

#### **Engine Manifold breakdown to ACTUAL Raw.csv materials:**
```
Engine Manifold [T2] requires these ACTUAL raw materials:
├── Titanium Ore [RAW from System Asteroid Belt] - Lightweight high-strength structure
├── Rhenium Ore [RAW from System Asteroid Belt] - High-temperature operation
├── Aluminum Ore [RAW from Terrestrial Planet] - Lightweight manifold construction
├── Carbon [RAW from Terrestrial Planet] - Heat-resistant composite materials
├── Copper Ore [RAW from Barren Planet] - Heat transfer systems
└── Thermoplastic Resin [RAW from Gas Giant] - Flexible joints and seals
```

---

### **3. Fuel Injector [T2] - Fuel Delivery**
**Function:** Precision fuel delivery and combustion control system

#### **Fuel Injector breakdown to ACTUAL Raw.csv materials:**
```
Fuel Injector [T2] requires these ACTUAL raw materials:
├── Osmium Ore [RAW from Volcanic Planet] - High-density precision nozzles
├── Silicon Crystal [RAW from Dark Planet] - Fuel control electronics
├── Ruby Crystals [RAW from Ice Giant] - Precision laser ignition
├── Palladium [RAW from Volcanic Planet] - Catalytic fuel processing
├── Zinc Ore [RAW from Barren Planet] - Corrosion-resistant coatings
└── Fluorine Gas [RAW from Volcanic/Gas Giant] - Advanced fuel oxidizer
```

---

### **4. Warp Field Generator [T4] - Space-Time Manipulation**
**Function:** Advanced space-time distortion field generation for FTL travel

#### **Warp Field Generator breakdown to ACTUAL Raw.csv materials:**
```
Warp Field Generator [T4] requires these ACTUAL raw materials:
├── Quantum Computational Substrate [RAW from Dark Planet] - Quantum field calculations
├── Viscovite Crystals [RAW from Dark Planet] - Space-time manipulation matrix
├── Phase Shift Crystals [RAW from Dark Planet] - Reality field modulation
├── Quantum Particle [RAW from Dark/Ice Giant] - Quantum field generation
├── Abyssal Energy Crystals [RAW from Oceanic Planet] - Deep space energy source
├── Fusion Catalyst Deposits [RAW from Dark Planet] - Unlimited power for field generation
└── Raw Chisenic [RAW from Dark Planet] - Ultimate exotic matter enhancement
```

---

### **5. Subspace Conduit [T3] - Subspace Energy**
**Function:** Subspace energy channeling and dimensional interface system

#### **Subspace Conduit breakdown to ACTUAL Raw.csv materials:**
```
Subspace Conduit [T3] requires these ACTUAL raw materials:
├── Emerald Crystals [RAW from Dark Planet] - Subspace energy channeling
├── Topaz Crystals [RAW from Dark/Ice Giant] - Dimensional interface enhancement
├── Prismarite [RAW from Dark Planet] - Subspace field stabilization
├── Beryllium Crystals [RAW from Dark/Ice Giant] - Ultra-lightweight conduit structure
├── Neon [RAW from Dark/Gas Giant] - Subspace medium enhancement
└── Xenon [RAW from Dark/Gas Giant] - Exotic atmosphere processing
```

---

### **6. Exotic Stabilizer [T4] - Field Stability**
**Function:** Exotic matter stabilization for warp field control

#### **Exotic Stabilizer breakdown to ACTUAL Raw.csv materials:**
```
Exotic Stabilizer [T4] requires these ACTUAL raw materials:
├── Nanite Crystals [RAW from Dark Planet] - Nanoscale field control
├── Biolumite [RAW from Ice Giant] - Living energy field integration
├── Resonium Ore [RAW from Barren Planet] - Universal field resonance
├── Strontium Crystals [RAW from System Asteroid Belt] - Field stabilization
├── Cryo Formation Crystals [RAW from Ice Giant] - Quantum state preservation
├── Garnet Crystals [RAW from Volcanic/Ice Giant] - Field harmonic control
└── Living Metal Symbionts [RAW from Dark Planet] - Self-adapting stabilization
```

---

### **7. Thrust Vectoring [T2] - Direction Control**
**Function:** Precision thrust direction control for maneuvering

#### **Thrust Vectoring breakdown to ACTUAL Raw.csv materials:**
```
Thrust Vectoring [T2] requires these ACTUAL raw materials:
├── Neodymium [RAW from Terrestrial/Dark Planet] - Magnetic thrust control
├── Iron Ore [RAW from Terrestrial Planet] - Magnetic actuator cores
├── Cobalt Ore [RAW from Ice Giant] - Magnetic field enhancement
├── Tourmaline Crystals [RAW from Volcanic/Ice Giant] - Electromagnetic control
├── Spinel Crystals [RAW from Volcanic/Ice Giant] - Precision magnetic focusing
├── Manganese Ore [RAW from Barren Planet] - Magnetic alloy components
└── Quartz Crystals [RAW from System Asteroid Belt] - Precision timing control
```

---

## **ADVANCED PROPULSION COMPONENTS**

### **8. Quantum Drive [T5] - Ultimate Propulsion**
**Function:** Reality-level propulsion system with quantum field manipulation

#### **Component recipe using ACTUAL Components.csv entries:**
```
Quantum Drive = 
├── Reality Engine Core [T5] (from Components.csv) - Reality manipulation engine
├── Dimensional Propulsion Field [T5] (from Components.csv) - Multi-dimensional thrust
├── Quantum Navigation Matrix [T5] (from Components.csv) - Quantum navigation
└── Universal Thrust Controller [T5] (from Components.csv) - Universal force control
```

#### **Reality Engine Core breakdown to ACTUAL Raw.csv materials:**
```
Reality Engine Core [T5] requires these ACTUAL raw materials:
├── Living Metal Symbionts [RAW from Dark Planet] - Self-evolving engine systems
├── Fusion Catalyst Deposits [RAW from Dark Planet] - Unlimited power generation
├── Raw Chisenic [RAW from Dark Planet] - Ultimate exotic matter base
├── Quantum Particle [RAW from Dark/Ice Giant] - Reality-level manipulation
├── Opal Fragments [RAW from Dark Planet] - Multi-dimensional interface
├── Jasphorus Crystals [RAW from Barren Planet] - Ultimate precision control
├── Black Opal [RAW from Barren Planet] - Multi-dimensional enhancement
└── Plasma Containment Minerals [RAW from Volcanic Planet] - Ultimate energy containment
```

---

### **9. Atmospheric Flight System [T3] - Planetary Operation**
**Function:** Atmospheric flight capability for planetary operations

#### **Component recipe using ACTUAL Components.csv entries:**
```
Atmospheric Flight System = 
├── Atmospheric Processor [T3] (from Components.csv) - Atmosphere interaction
├── Aerodynamic Control Surface [T2] (from Components.csv) - Flight control
├── Environmental Adaptation [T3] (from Components.csv) - Planetary adaptation
└── Pressure Regulation [T2] (from Components.csv) - Atmospheric pressure control
```

#### **Atmospheric Processor breakdown to ACTUAL Raw.csv materials:**
```
Atmospheric Processor [T3] requires these ACTUAL raw materials:
├── Oxygen [RAW from Terrestrial Planet] - Atmospheric oxygen processing
├── Nitrogen [RAW from Terrestrial Planet] - Atmospheric nitrogen handling
├── Argon [RAW from Gas Giant] - Noble gas processing
├── Helium [RAW from Gas Giant] - Light gas processing
├── Krypton [RAW from Gas Giant] - Dense gas processing
├── Marine Bio Extract [RAW from Oceanic Planet] - Bio-atmospheric interface
└── Hydrothermal Deposits [RAW from Oceanic Planet] - Pressure adaptation
```

---

## **SCALING COMPONENTS FOR LARGE PROPULSION**

### **10. Thrust Amplification Module [T4] - Large-Scale Power**
**Function:** Large-scale thrust amplification for capital+ ships

#### **Thrust Amplification Module breakdown to ACTUAL Raw.csv materials:**
```
Thrust Amplification Module [T4] requires these ACTUAL raw materials:
├── Rhodium Ore [RAW from Volcanic Planet] - Ultra-premium thrust enhancement
├── Cesium [RAW from System Asteroid Belt] - Precision thrust timing
├── Scandium Ore [RAW from System Asteroid Belt] - Advanced lightweight structures
├── Vanadium Ore [RAW from Barren Planet] - High-strength thrust channeling
├── Magnesium [RAW from Terrestrial Planet] - Weight reduction enhancement
├── Lithium Ore [RAW from Barren Planet] - Energy storage for thrust bursts
└── Tenon Gas [RAW from Gas Giant] - Exotic propulsion medium
```

---

### **11. Massive Drive Assembly [T5] - Class-8 Propulsion**
**Function:** Massive-scale propulsion coordination for Class-8 ships

#### **Massive Drive Assembly breakdown to ACTUAL Raw.csv materials:**
```
Massive Drive Assembly [T5] requires these ACTUAL raw materials:
├── Dodiline Crystals [RAW from Volcanic Planet] - Massive structure coordination
├── Hicenium Crystals [RAW from Ice Giant] - Ultra-cold massive operations
├── Peridot Crystals [RAW from Ice Giant] - Massive field control
├── Zirconium Ore [RAW from Ice Giant] - High-strength massive structures
├── Tellurium Crystals [RAW from Ice Giant] - Massive system enhancement
├── Mica [RAW from Volcanic Planet] - High-temperature massive insulation
├── Dysprosium [RAW from Terrestrial Planet] - Massive magnetic systems
└── Clay [RAW from Terrestrial Planet] - Massive structure foundations
```

---

### **12. Titan Propulsion Matrix [T5] - Ultimate System**
**Function:** Titan-class ultimate propulsion with reality manipulation

#### **Titan Propulsion Matrix breakdown to ACTUAL Raw.csv materials:**
```
Titan Propulsion Matrix [T5] requires these ACTUAL raw materials:
├── Living Metal Symbionts [RAW from Dark Planet] - Self-evolving propulsion
├── Fusion Catalyst Deposits [RAW from Dark Planet] - Unlimited propulsion power
├── Raw Chisenic [RAW from Dark Planet] - Ultimate propulsion control
├── Resonium Ore [RAW from Barren Planet] - Universal propulsion resonance
├── Quantum Particle [RAW from Dark/Ice Giant] - Reality-level propulsion
├── Abyssal Energy Crystals [RAW from Oceanic Planet] - Deep universe propulsion
├── Biolumite [RAW from Ice Giant] - Living propulsion integration
├── Black Opal [RAW from Barren Planet] - Multi-dimensional propulsion
├── Jasphorus Crystals [RAW from Barren Planet] - Ultimate propulsion precision
└── Plasma Containment Minerals [RAW from Volcanic Planet] - Ultimate energy control
```

---

## **RAW RESOURCE PLANETARY DISTRIBUTION**

### **Essential Planet Dependencies for Ship Propulsion:**

#### **Dark Planet (Quantum & Control Systems):**
```
• Quantum Computational Substrate - Quantum field calculations
• Viscovite Crystals - Space-time manipulation
• Phase Shift Crystals - Reality field modulation
• Silicon Crystal - Control electronics
• Emerald Crystals - Subspace energy channeling
• Topaz Crystals - Dimensional interfaces
• Prismarite - Field stabilization
• Nanite Crystals - Nanoscale control
• Living Metal Symbionts - Self-evolving systems
• Raw Chisenic - Ultimate exotic control
• Fusion Catalyst Deposits - Unlimited power
• Opal Fragments - Multi-dimensional interface
• Neodymium - Magnetic control systems
```

#### **Volcanic Planet (High-Energy & Premium Materials):**
```
• Lumanite - High-energy thrust generation
• Hafnium Ore - High-temperature cores
• Iridium Ore - Ultra-high temperature resistance
• Tantalum Ore - Corrosion resistance
• Thermal Regulator Stone - Heat management
• Platinum Ore - Premium components
• Osmium Ore - High-density precision parts
• Palladium - Catalytic systems
• Fluorine Gas - Advanced oxidizers
• Diamond - Ultra-hard surfaces
• Rhodium Ore - Ultra-premium enhancement
• Tourmaline Crystals - Electromagnetic control
• Spinel Crystals - Precision focusing
• Garnet Crystals - Harmonic control
• Dodiline Crystals - Massive coordination
• Mica - High-temperature insulation
• Plasma Containment Minerals - Ultimate energy
```

#### **System Asteroid Belt (Precision & Structural):**
```
• Titanium Ore - Lightweight high-strength structures
• Rhenium Ore - High-temperature operation
• Quartz Crystals - Precision timing
• Cesium - Precision timing control
• Strontium Crystals - Field stabilization
• Scandium Ore - Advanced lightweight alloys
```

#### **Ice Giant (Optical & Cryogenic Systems):**
```
• Ruby Crystals - Precision ignition systems
• Quantum Particle - Reality manipulation
• Biolumite - Living energy integration
• Cobalt Ore - Magnetic enhancement
• Beryllium Crystals - Ultra-lightweight structures
• Topaz Crystals - Interface enhancement
• Cryo Formation Crystals - Quantum preservation
• Garnet Crystals - Field control
• Hicenium Crystals - Ultra-cold operations
• Peridot Crystals - Massive field control
• Zirconium Ore - High-strength structures
• Tellurium Crystals - System enhancement
• Spinel Crystals - Precision systems
• Tourmaline Crystals - Control enhancement
```

#### **Gas Giant (Propulsion Media & Atmospheres):**
```
• Thermoplastic Resin - Flexible components
• Fluorine Gas - Advanced oxidizers
• Neon - Subspace medium enhancement
• Xenon - Exotic atmosphere processing
• Argon - Noble gas processing
• Helium - Light gas processing
• Krypton - Dense gas processing
• Tenon Gas - Exotic propulsion medium
• Hydrogen - Basic propulsion fuel
```

#### **Terrestrial Planet (Foundation & Atmospheric):**
```
• Aluminum Ore - Lightweight construction
• Carbon - Heat-resistant composites
• Iron Ore - Magnetic cores
• Neodymium - Magnetic control
• Oxygen - Atmospheric processing
• Nitrogen - Atmospheric systems
• Magnesium - Weight reduction
• Dysprosium - Massive magnetic systems
• Clay - Massive foundations
```

#### **Barren Planet (Basic Metals & Rare Materials):**
```
• Copper Ore - Heat transfer systems
• Zinc Ore - Corrosion protection
• Manganese Ore - Magnetic alloys
• Resonium Ore - Universal resonance
• Vanadium Ore - High-strength systems
• Lithium Ore - Energy storage
• Black Opal - Multi-dimensional enhancement
• Jasphorus Crystals - Ultimate precision
```

#### **Oceanic Planet (Deep Energy & Bio Systems):**
```
• Abyssal Energy Crystals - Deep space energy
• Marine Bio Extract - Bio-atmospheric interface
• Hydrothermal Deposits - Pressure adaptation
• Neural Coral Compounds - Bio-neural interfaces
• Bioluminous Algae - Living enhancement
```

### **Total Raw Resources Required: 60+ materials across all 8 planet types**
### **Planet Dependency: Complete 8-planet strategic distribution**

### **Propulsion System Progression:**
- **T1:** Basic chemical propulsion (12-18 raw materials, 4-5 planets)
- **T2:** Advanced chemical with vectoring (18-25 raw materials, 5-6 planets)
- **T3:** Exotic matter enhancement (25-35 raw materials, 6-7 planets)
- **T4:** Quantum field propulsion (35-50 raw materials, 7-8 planets)
- **T5:** Reality-level ultimate propulsion (50-60 raw materials, 8 planets)

### **Strategic Propulsion Value:**
- **Subwarp Engines:** High-efficiency sub-light travel for system navigation
- **Warp Drives:** FTL travel through space-time manipulation
- **Maneuvering Thrusters:** Precision control for combat and docking
- **Combined Systems:** Complete mobility from atmospheric flight to reality-level travel
- **Ultimate Systems:** Universal propulsion capability across all dimensions

This creates a complete production chain using ONLY actual component names from Components.csv and actual raw material names from Raw.csv - providing comprehensive propulsion progression from basic chemical thrust to reality-manipulating dimensional travel.