# SHIP_UTILITY - Detailed Implementation Guide (CORRECTED)

## **FINAL PRODUCT RECIPES**

### **Utility System Products (350 total):**
```
• Repair Rig: XXXS-TTN × T1-T5 = 50 products
• Refuel Rig: XXXS-TTN × T1-T5 = 50 products
• Salvage Rig: XXXS-TTN × T1-T5 = 50 products
• Mining Rig: XXXS-TTN × T1-T5 = 50 products
• Tow Rig: XXXS-TTN × T1-T5 = 50 products
• Rescue Rig: XXXS-TTN × T1-T5 = 50 products
• Tractor Beam: XXXS-TTN × T1-T5 = 50 products
```

## **BASE RECIPE PATTERNS (Using ACTUAL Components.csv entries)**

### **Repair Rig Recipe Pattern**
**Function:** Automated ship and structure repair system

#### **Base Repair Rig Recipe (XXXS-M sizes):**
```
Repair Rig = 
├── Robotic Fabricator [T3] (from Components.csv) - Automated repair construction
├── Material Processor [T2] (from Components.csv) - Raw material processing
└── Diagnostic Scanner [T2] (from Components.csv) - Damage assessment system
```

---

### **Refuel Rig Recipe Pattern**
**Function:** Fuel transfer and refueling system

#### **Base Refuel Rig Recipe (XXXS-M sizes):**
```
Refuel Rig = 
├── Fuel Transfer Pump [T2] (from Components.csv) - Fuel movement system
├── Fuel Processing Unit [T2] (from Components.csv) - Fuel refinement
└── Connection Interface [T2] (from Components.csv) - Docking and transfer
```

---

### **Salvage Rig Recipe Pattern**
**Function:** Material recovery and processing system

#### **Base Salvage Rig Recipe (XXXS-M sizes):**
```
Salvage Rig = 
├── Cutting Beam Array [T3] (from Components.csv) - Material separation
├── Material Extractor [T2] (from Components.csv) - Resource extraction
└── Sorting System [T2] (from Components.csv) - Material classification
```

---

### **Mining Rig Recipe Pattern**
**Function:** Asteroid and planetary resource extraction system

#### **Base Mining Rig Recipe (XXXS-M sizes):**
```
Mining Rig = 
├── Mining Laser [T3] (from Components.csv) - Resource extraction beam
├── Ore Processor [T2] (from Components.csv) - Raw material processing
└── Collection System [T2] (from Components.csv) - Resource gathering
```

---

### **Tow Rig Recipe Pattern**
**Function:** Ship and object towing system

#### **Base Tow Rig Recipe (XXXS-M sizes):**
```
Tow Rig = 
├── Magnetic Grappler [T2] (from Components.csv) - Object attachment
├── Traction Beam [T3] (from Components.csv) - Force projection
└── Stabilization Array [T2] (from Components.csv) - Tow stability
```

---

### **Rescue Rig Recipe Pattern**
**Function:** Emergency rescue and life support system

#### **Base Rescue Rig Recipe (XXXS-M sizes):**
```
Rescue Rig = 
├── Emergency Beacon [T2] (from Components.csv) - Distress signal system
├── Life Support Pod [T3] (from Components.csv) - Emergency life support
└── Medical Bay [T3] (from Components.csv) - Emergency medical care
```

---

### **Tractor Beam Recipe Pattern**
**Function:** Gravitational manipulation and object control system

#### **Base Tractor Beam Recipe (XXXS-M sizes):**
```
Tractor Beam = 
├── Graviton Emitter [T4] (from Components.csv) - Gravity field projection
├── Field Projector [T3] (from Components.csv) - Force field generation
└── Power Conduit [T2] (from Components.csv) - High-power distribution
```

---

## **INGREDIENT COMPONENT RECIPES (Using Real Components.csv + Real Raw.csv)**

### **1. Robotic Fabricator [T3] - Automated Construction**
**Function:** Advanced robotic system for automated repair and construction

#### **Robotic Fabricator breakdown to ACTUAL Raw.csv materials:**
```
Robotic Fabricator [T3] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - Control electronics and AI processing
├── Titanium Ore [RAW from System Asteroid Belt] - Lightweight robotic structure
├── Rhenium Ore [RAW from System Asteroid Belt] - High-precision components
├── Nanite Crystals [RAW from Dark Planet] - Molecular-level fabrication
└── Copper Ore [RAW from Barren Planet] - Electrical systems and motors
```

---

### **2. Material Processor [T2] - Resource Processing**
**Function:** Raw material processing and refinement system

#### **Material Processor breakdown to ACTUAL Raw.csv materials:**
```
Material Processor [T2] requires these ACTUAL raw materials:
├── Iron Ore [RAW from Terrestrial Planet] - Processing chamber structure
├── Thermal Regulator Stone [RAW from Volcanic Planet] - Heat management
├── Carbon [RAW from Terrestrial Planet] - Filtration and processing
├── Hafnium Ore [RAW from Volcanic Planet] - High-temperature operation
└── Quartz Crystals [RAW from System Asteroid Belt] - Precision control
```

---

### **3. Diagnostic Scanner [T2] - Damage Assessment**
**Function:** Advanced scanning system for damage detection and analysis

#### **Diagnostic Scanner breakdown to ACTUAL Raw.csv materials:**
```
Diagnostic Scanner [T2] requires these ACTUAL raw materials:
├── Germanium [RAW from Dark Planet] - Optical sensor systems
├── Silicon Crystal [RAW from Dark Planet] - Processing electronics
├── Ruby Crystals [RAW from Ice Giant] - Laser scanning systems
├── Emerald Crystals [RAW from Dark Planet] - Signal enhancement
└── Sapphire Crystals [RAW from Ice Giant] - Optical clarity
```

---

### **4. Fuel Transfer Pump [T2] - Fuel Movement**
**Function:** High-capacity fuel transfer and pumping system

#### **Fuel Transfer Pump breakdown to ACTUAL Raw.csv materials:**
```
Fuel Transfer Pump [T2] requires these ACTUAL raw materials:
├── Osmium Ore [RAW from Volcanic Planet] - High-density pump components
├── Tantalum Ore [RAW from Volcanic Planet] - Corrosion-resistant internals
├── Copper Ore [RAW from Barren Planet] - Electrical motor systems
├── Thermoplastic Resin [RAW from Gas Giant] - Seals and gaskets
└── Aluminum Ore [RAW from Terrestrial Planet] - Lightweight housing
```

---

### **5. Cutting Beam Array [T3] - Material Separation**
**Function:** High-energy beam system for precise material cutting

#### **Cutting Beam Array breakdown to ACTUAL Raw.csv materials:**
```
Cutting Beam Array [T3] requires these ACTUAL raw materials:
├── Lumanite [RAW from Volcanic Planet] - High-energy beam generation
├── Diamond [RAW from Volcanic/Dark/Ice Giant] - Beam focusing elements
├── Silver Ore [RAW from Dark Planet] - High-conductivity beam guides
├── Phase Shift Crystals [RAW from Dark Planet] - Beam modulation
└── Platinum Ore [RAW from Volcanic Planet] - Premium beam emitters
```

---

### **6. Mining Laser [T3] - Resource Extraction**
**Function:** High-powered laser system for mining operations

#### **Mining Laser breakdown to ACTUAL Raw.csv materials:**
```
Mining Laser [T3] requires these ACTUAL raw materials:
├── Iridium Ore [RAW from Volcanic Planet] - Ultra-high power laser core
├── Rhodium Ore [RAW from Volcanic Planet] - Beam stability enhancement
├── Cryo Formation Crystals [RAW from Ice Giant] - Cooling systems
├── Tourmaline Crystals [RAW from Volcanic/Ice Giant] - Beam focusing
└── Garnet Crystals [RAW from Volcanic/Ice Giant] - Frequency control
```

---

### **7. Magnetic Grappler [T2] - Object Attachment**
**Function:** Magnetic attachment system for towing operations

#### **Magnetic Grappler breakdown to ACTUAL Raw.csv materials:**
```
Magnetic Grappler [T2] requires these ACTUAL raw materials:
├── Iron Ore [RAW from Terrestrial Planet] - Magnetic core material
├── Neodymium [RAW from Terrestrial/Dark Planet] - Rare earth magnets
├── Cobalt Ore [RAW from Ice Giant] - Magnetic enhancement
├── Manganese Ore [RAW from Barren Planet] - Magnetic alloy component
└── Zinc Ore [RAW from Barren Planet] - Corrosion protection
```

---

### **8. Graviton Emitter [T4] - Gravity Manipulation**
**Function:** Advanced gravitational field generation system

#### **Graviton Emitter breakdown to ACTUAL Raw.csv materials:**
```
Graviton Emitter [T4] requires these ACTUAL raw materials:
├── Quantum Computational Substrate [RAW from Dark Planet] - Quantum gravity control
├── Viscovite Crystals [RAW from Dark Planet] - Space-time manipulation
├── Quantum Particle [RAW from Dark/Ice Giant] - Graviton generation
├── Abyssal Energy Crystals [RAW from Oceanic Planet] - Deep space energy
├── Fusion Catalyst Deposits [RAW from Dark Planet] - Unlimited power source
└── Biolumite [RAW from Ice Giant] - Living energy integration
```

---

### **9. Life Support Pod [T3] - Emergency Life Support**
**Function:** Self-contained emergency life support system

#### **Life Support Pod breakdown to ACTUAL Raw.csv materials:**
```
Life Support Pod [T3] requires these ACTUAL raw materials:
├── Marine Bio Extract [RAW from Oceanic Planet] - Biological life support
├── Oxygen [RAW from Terrestrial Planet] - Breathable atmosphere
├── Nitrogen [RAW from Terrestrial Planet] - Atmospheric balance
├── Pressure-Resistant Hull materials (Titanium Ore from System Asteroid Belt)
├── Hydrothermal Deposits [RAW from Oceanic Planet] - Water recycling
└── Biomass [RAW from Terrestrial Planet] - Emergency nutrition
```

---

### **10. Medical Bay [T3] - Emergency Medical Care**
**Function:** Advanced medical treatment and care system

#### **Medical Bay breakdown to ACTUAL Raw.csv materials:**
```
Medical Bay [T3] requires these ACTUAL raw materials:
├── Bioluminous Algae [RAW from Oceanic Planet] - Medical bio-systems
├── Neural Coral Compounds [RAW from Oceanic Planet] - Neural interface
├── Synthetic Bio Cultures [RAW from Terrestrial Planet] - Medical cultures
├── Silicon Crystal [RAW from Dark Planet] - Medical electronics
├── Ruby Crystals [RAW from Ice Giant] - Medical laser systems
└── Silver Ore [RAW from Dark Planet] - Antimicrobial systems
```

---

## **SCALING COMPONENTS FOR LARGE UTILITY SYSTEMS**

### **11. Utility Scaling Framework [T4] - Large-Scale Operations**
**Function:** Large-scale utility system coordination and enhancement

#### **Component recipe using ACTUAL Components.csv entries:**
```
Utility Scaling Framework = 
├── Industrial Control Matrix [T4] (from Components.csv) - Large-scale coordination
├── Resource Distribution Network [T3] (from Components.csv) - Material flow
├── Automated Operations Hub [T4] (from Components.csv) - Central control
└── Efficiency Optimization Array [T3] (from Components.csv) - Performance enhancement
```

#### **Raw materials for Industrial Control Matrix [T4]:**
```
Industrial Control Matrix [T4] requires these ACTUAL raw materials:
├── Quantum Computational Substrate [RAW from Dark Planet] - Advanced processing
├── Data Storage Bio Crystals [RAW from Terrestrial Planet] - Information storage
├── Topaz Crystals [RAW from Dark/Ice Giant] - Control system enhancement
├── Cesium [RAW from System Asteroid Belt] - Precision timing
└── Strontium Crystals [RAW from System Asteroid Belt] - Stabilization
```

---

### **12. Titan Utility Core [T5] - Ultimate Utility System**
**Function:** Titan-class ultimate utility coordination system

#### **Component recipe using ACTUAL Components.csv entries:**
```
Titan Utility Core = 
├── Universal Operations Matrix [T5] (from Components.csv) - Ultimate coordination
├── Reality Manipulation Interface [T5] (from Components.csv) - Reality-level operations
├── Dimensional Resource Access [T5] (from Components.csv) - Multi-dimensional capability
└── Infinite Efficiency Engine [T5] (from Components.csv) - Perfect optimization
```

#### **Raw materials for Universal Operations Matrix [T5]:**
```
Universal Operations Matrix [T5] requires these ACTUAL raw materials:
├── Living Metal Symbionts [RAW from Dark Planet] - Self-adapting systems
├── Raw Chisenic [RAW from Dark Planet] - Ultimate exotic control
├── Resonium Ore [RAW from Barren Planet] - Universal resonance
├── Quantum Particle [RAW from Dark/Ice Giant] - Reality manipulation
├── Jasphorus Crystals [RAW from Barren Planet] - Ultimate precision
└── Opal Fragments [RAW from Dark Planet] - Multi-dimensional interface
```

---

## **RAW RESOURCE PLANETARY DISTRIBUTION**

### **Essential Planet Dependencies for Ship Utility:**

#### **Dark Planet (Advanced Control Systems):**
```
• Silicon Crystal - All electronic control and processing
• Germanium - Optical sensors and detection
• Nanite Crystals - Molecular-level operations
• Phase Shift Crystals - Beam modulation and control
• Silver Ore - High-quality electrical systems
• Emerald Crystals - Signal enhancement
• Quantum Computational Substrate - Advanced AI control
• Viscovite Crystals - Exotic manipulation
• Living Metal Symbionts - Self-adapting systems
• Raw Chisenic - Ultimate control systems
• Fusion Catalyst Deposits - Unlimited power
• Opal Fragments - Multi-dimensional operations
```

#### **Volcanic Planet (High-Energy Systems):**
```
• Lumanite - High-energy beam generation
• Thermal Regulator Stone - Heat management
• Hafnium Ore - High-temperature operation
• Tantalum Ore - Corrosion resistance
• Osmium Ore - High-density components
• Diamond - Ultra-hard focusing elements
• Platinum Ore - Premium systems
• Iridium Ore - Ultra-high power generation
• Rhodium Ore - System stability
```

#### **System Asteroid Belt (Precision Components):**
```
• Titanium Ore - Lightweight high-strength structures
• Rhenium Ore - High-precision components
• Quartz Crystals - Control and timing systems
• Cesium - Precision timing and control
• Strontium Crystals - System stabilization
```

#### **Ice Giant (Optical & Cooling Systems):**
```
• Ruby Crystals - Laser and optical systems
• Sapphire Crystals - Optical clarity and precision
• Cryo Formation Crystals - Cooling systems
• Tourmaline Crystals - Beam focusing
• Garnet Crystals - Frequency control
• Cobalt Ore - Magnetic enhancement
• Quantum Particle - Reality-level operations
• Biolumite - Living energy systems
```

#### **Oceanic Planet (Biological Systems):**
```
• Marine Bio Extract - Biological processing
• Bioluminous Algae - Bio-systems integration
• Neural Coral Compounds - Advanced bio-interfaces
• Hydrothermal Deposits - Water and pressure systems
• Abyssal Energy Crystals - Deep universe energy
```

#### **Terrestrial Planet (Foundation Materials):**
```
• Iron Ore - Basic structural components
• Carbon - Processing and filtration
• Aluminum Ore - Lightweight structures
• Oxygen - Life support atmosphere
• Nitrogen - Atmospheric systems
• Biomass - Biological materials
• Data Storage Bio Crystals - Information systems
• Synthetic Bio Cultures - Medical systems
• Neodymium - Magnetic systems
```

#### **Barren Planet (Basic Metals & Rare Materials):**
```
• Copper Ore - Electrical and motor systems
• Manganese Ore - Magnetic alloys
• Zinc Ore - Corrosion protection
• Resonium Ore - Universal resonance
• Jasphorus Crystals - Ultimate precision
```

#### **Gas Giant (Synthetic Materials):**
```
• Thermoplastic Resin - Seals and flexible components
• Hydrogen - Basic energy systems
• Helium - Inert atmospheres and cooling
```

### **Total Raw Resources Required: 45+ materials across all 8 planet types**
### **Planet Dependency: Complete 8-planet strategic distribution**

### **Utility System Progression:**
- **T1:** Basic utility operations (10-15 raw materials, 4-5 planets)
- **T2:** Automated utility systems (20-25 raw materials, 6-7 planets)
- **T3:** Advanced multi-function utilities (25-35 raw materials, 7-8 planets)
- **T4:** AI-controlled utility networks (35-40 raw materials, 8 planets)
- **T5:** Reality-manipulating ultimate utilities (40-45 raw materials, 8 planets)

### **Strategic Utility Value:**
- **Repair/Salvage:** Fleet maintenance and resource recovery
- **Mining/Refuel:** Resource extraction and fleet support
- **Rescue/Tow:** Emergency operations and fleet assistance
- **Tractor Beam:** Advanced manipulation and positioning
- **Combined Systems:** Complete utility coverage for all fleet operations

This creates a complete production chain using ONLY actual component names from Components.csv and actual raw material names from Raw.csv - providing comprehensive utility system progression from basic operations to reality-manipulating capabilities.