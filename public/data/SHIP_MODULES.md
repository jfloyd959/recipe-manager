# SHIP_MODULES - Detailed Implementation Guide (CORRECTED)

## **FINAL PRODUCT RECIPES**

### **Ship Module Products (180 total):**
```
• Ammo Module: XXXS-TTN × T1-T5 = 45 products
• Cargo Module: XXXS-TTN × T1-T5 = 45 products
• Fuel Module: XXXS-TTN × T1-T5 = 45 products
• Passenger Module: XXXS-TTN × T1-T5 = 45 products
```

## **BASE RECIPE PATTERNS (Using ACTUAL Components.csv entries)**

### **Ammo Module Recipe Pattern**
**Function:** Ammunition storage and feeding system for ship weapons

#### **Base Ammo Module Recipe (XXXS-M sizes):**
```
Ammo Module = 
├── Basic Storage Container [STRUCTURAL_ALLOY] (REQUIRED) - Ammunition storage
├── Automated Loader [ELECTRONIC_COMPONENT] (REQUIRED) - Weapon feeding mechanism
└── Safety Interlock [ELECTRONIC_COMPONENT] (REQUIRED) - Safety control system
```

---

### **Cargo Module Recipe Pattern**
**Function:** General cargo storage and handling system for ships

#### **Base Cargo Module Recipe (XXXS-M sizes):**
```
Cargo Module = 
├── Basic Storage Container [STRUCTURAL_ALLOY] (REQUIRED) - Primary storage
├── Conveyor System [ELECTRONIC_COMPONENT] (REQUIRED) - Cargo handling
└── Access Control System [ELECTRONIC_COMPONENT] (REQUIRED) - Entry control
```

---

### **Fuel Module Recipe Pattern**
**Function:** Fuel storage and distribution system for ship propulsion

#### **Base Fuel Module Recipe (XXXS-M sizes):**
```
Fuel Module = 
├── Fuel Storage Tank [STRUCTURAL_ALLOY] (REQUIRED) - Pressurized fuel container
├── Fuel Transfer Pump [ELECTRONIC_COMPONENT] (REQUIRED) - Fuel distribution
└── Pressure Relief Valve [ELECTRONIC_COMPONENT] (REQUIRED) - Emergency pressure relief
```

---

### **Passenger Module Recipe Pattern**
**Function:** Life support and accommodation system for ship passengers

#### **Base Passenger Module Recipe (XXXS-M sizes):**
```
Passenger Module = 
├── Habitat Module [STRUCTURAL_ALLOY] (REQUIRED) - Living quarters structure
├── Life Support System [BIO_MATTER] (REQUIRED) - Life support systems
└── Environmental Control [ELECTRONIC_COMPONENT] (REQUIRED) - Climate control
```

---

## **ACTUAL COMPONENT RECIPES (Using Real Components.csv + Real Raw.csv)**

### **1. Basic Storage Container [STRUCTURAL_ALLOY]**
**Function:** Primary storage container for various module types

#### **Recipe using ACTUAL Components.csv entries:**
```
Basic Storage Container = 
├── Steel [T3] (from Components.csv) - Primary structural material
├── Reinforced Frame [T2] (from Components.csv) - Structural support
├── Access Hatch [T2] (from Components.csv) - Entry portal
└── Protective Casing [T2] (from Components.csv) - External protection
```

#### **Component breakdown to ACTUAL Raw.csv materials:**

##### **Steel [T3] breakdown:**
```
Steel [T3] requires these ACTUAL raw materials:
├── Iron Ore [RAW from Terrestrial Planet]
├── Carbon [RAW from Terrestrial Planet]  
├── Manganese Ore [RAW from Barren Planet]
└── Chromium (from processing other ores)
```

##### **Reinforced Frame [T2] breakdown:**
```
Reinforced Frame [T2] requires these ACTUAL raw materials:
├── Iron Ore [RAW from Terrestrial Planet]
├── Aluminum Ore [RAW from Terrestrial Planet] 
├── Titanium Ore [RAW from System Asteroid Belt]
└── Carbon [RAW from Terrestrial Planet]
```

##### **Access Hatch [T2] breakdown:**
```
Access Hatch [T2] requires these ACTUAL raw materials:
├── Steel base (Iron Ore + Carbon from Terrestrial Planet)
├── Copper Ore [RAW from Barren Planet] - for hinges/mechanisms
├── Tin Ore [RAW from Barren Planet] - for seals
└── Zinc Ore [RAW from Barren Planet] - for corrosion protection
```

##### **Protective Casing [T2] breakdown:**
```
Protective Casing [T2] requires these ACTUAL raw materials:
├── Aluminum Ore [RAW from Terrestrial Planet]
├── Thermoplastic Resin [RAW from Terrestrial Planet]
├── Graphite [RAW from Terrestrial Planet]
└── Magnesium [RAW from Terrestrial Planet]
```

---

### **2. Automated Loader [ELECTRONIC_COMPONENT]**
**Function:** Automated ammunition delivery system for weapons

#### **Recipe using ACTUAL Components.csv entries:**
```
Automated Loader = 
├── Motor Controller [T2] (from Components.csv) - Movement control
├── Conveyor Belt [T1] (from Components.csv) - Material transport
├── Position Sensor [T2] (from Components.csv) - Location tracking
└── Logic Controller [T2] (from Components.csv) - System coordination
```

#### **Component breakdown to ACTUAL Raw.csv materials:**

##### **Motor Controller [T2] breakdown:**
```
Motor Controller [T2] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - semiconductor base
├── Copper Ore [RAW from Barren Planet] - electrical connections
├── Silver Ore [RAW from Dark Planet] - high-quality conductors  
└── Quartz Crystals [RAW from System Asteroid Belt] - timing systems
```

##### **Conveyor Belt [T1] breakdown:**
```
Conveyor Belt [T1] requires these ACTUAL raw materials:
├── Thermoplastic Resin [RAW from Gas Giant] - belt material
├── Iron Ore [RAW from Terrestrial Planet] - support structure
├── Carbon [RAW from Terrestrial Planet] - reinforcement
└── Copper Ore [RAW from Barren Planet] - drive motors
```

##### **Position Sensor [T2] breakdown:**
```
Position Sensor [T2] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - sensor electronics
├── Germanium [RAW from Dark Planet] - optical sensors
├── Quartz Crystals [RAW from System Asteroid Belt] - precision timing
└── Emerald Crystals [RAW from Dark Planet] - signal enhancement
```

##### **Logic Controller [T2] breakdown:**
```
Logic Controller [T2] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - processing core
├── Data Storage Bio Crystals [RAW from Terrestrial Planet] - memory
├── Copper Ore [RAW from Barren Planet] - circuit connections
└── Silver Ore [RAW from Dark Planet] - high-speed connections
```

---

### **3. Life Support System [BIO_MATTER]**
**Function:** Essential life support system for passenger modules

#### **Recipe using ACTUAL Components.csv entries:**
```
Life Support System = 
├── Air Recycling Unit [T2] (from Components.csv) - Atmosphere processing
├── Water Purification [T2] (from Components.csv) - Water treatment
├── Waste Processing [T2] (from Components.csv) - Waste management
└── Emergency Backup [T3] (from Components.csv) - Emergency systems
```

#### **Component breakdown to ACTUAL Raw.csv materials:**

##### **Air Recycling Unit [T2] breakdown:**
```
Air Recycling Unit [T2] requires these ACTUAL raw materials:
├── Marine Bio Extract [RAW from Oceanic Planet] - biological air processing
├── Oxygen [RAW from Terrestrial Planet] - breathable atmosphere
├── Carbon [RAW from Terrestrial Planet] - CO2 scrubbing
└── Nitrogen [RAW from Terrestrial Planet] - atmospheric balance
```

##### **Water Purification [T2] breakdown:**
```
Water Purification [T2] requires these ACTUAL raw materials:
├── Marine Bio Extract [RAW from Oceanic Planet] - biological filtration
├── Deep Sea Minerals [RAW from Oceanic Planet] - mineral processing
├── Silver Ore [RAW from Dark Planet] - antimicrobial properties
└── Carbon [RAW from Terrestrial Planet] - filtration media
```

##### **Waste Processing [T2] breakdown:**
```
Waste Processing [T2] requires these ACTUAL raw materials:
├── Biomass [RAW from Terrestrial Planet] - organic processing
├── Marine Bio Extract [RAW from Oceanic Planet] - biological breakdown
├── Synthetic Bio Cultures [RAW from Terrestrial Planet] - decomposition
└── Thermal Regulator Stone [RAW from Volcanic Planet] - heat processing
```

##### **Emergency Backup [T3] breakdown:**
```
Emergency Backup [T3] requires these ACTUAL raw materials:
├── Compressed atmosphere (Oxygen + Nitrogen from Terrestrial Planet)
├── Emergency power (Lumanite from Volcanic Planet)
├── Medical supplies (Marine Bio Extract from Oceanic Planet)
└── Emergency rations (Biomass from Terrestrial Planet)
```

---

### **4. Environmental Control [ELECTRONIC_COMPONENT]**
**Function:** Climate and atmospheric control system

#### **Recipe using ACTUAL Components.csv entries:**
```
Environmental Control = 
├── Temperature Controller [T2] (from Components.csv) - Climate regulation
├── Humidity Control [T2] (from Components.csv) - Moisture management
├── Air Circulation [T2] (from Components.csv) - Air movement
└── Atmospheric Monitor [T2] (from Components.csv) - Environmental sensing
```

#### **Component breakdown to ACTUAL Raw.csv materials:**

##### **Temperature Controller [T2] breakdown:**
```
Temperature Controller [T2] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - control electronics
├── Thermal Regulator Stone [RAW from Volcanic Planet] - heat management
├── Ruby Crystals [RAW from Ice Giant] - temperature sensors
└── Copper Ore [RAW from Barren Planet] - heat transfer
```

##### **Humidity Control [T2] breakdown:**
```
Humidity Control [T2] requires these ACTUAL raw materials:
├── Hydrothermal Deposits [RAW from Oceanic Planet] - moisture processing
├── Thermoplastic Resin [RAW from Gas Giant] - moisture barriers
├── Silicon Crystal [RAW from Dark Planet] - control circuits
└── Marine Bio Extract [RAW from Oceanic Planet] - biological humidity control
```

##### **Air Circulation [T2] breakdown:**
```
Air Circulation [T2] requires these ACTUAL raw materials:
├── Aluminum Ore [RAW from Terrestrial Planet] - fan components
├── Copper Ore [RAW from Barren Planet] - motor windings
├── Iron Ore [RAW from Terrestrial Planet] - motor core
└── Silicon Crystal [RAW from Dark Planet] - speed control
```

##### **Atmospheric Monitor [T2] breakdown:**
```
Atmospheric Monitor [T2] requires these ACTUAL raw materials:
├── Silicon Crystal [RAW from Dark Planet] - sensor electronics
├── Germanium [RAW from Dark Planet] - gas sensors
├── Oceanic Gas Pockets [RAW from Oceanic Planet] - atmospheric reference
└── Argon [RAW from Gas Giant] - calibration standards
```

---

## **RAW RESOURCE PLANETARY SUMMARY**

### **Required Raw Materials by Planet:**

#### **Terrestrial Planet (Primary Foundation):**
```
• Iron Ore - Basic structural components, motors
• Carbon - Steel production, filters, reinforcement  
• Aluminum Ore - Lightweight structures, fans
• Oxygen - Life support atmosphere
• Nitrogen - Atmospheric balance
• Biomass - Organic processing, emergency rations
• Data Storage Bio Crystals - Memory systems
• Synthetic Bio Cultures - Waste processing
• Thermoplastic Resin - Seals, barriers
• Graphite - Protective materials
• Magnesium - Lightweight alloys
```

#### **Dark Planet (Electronics & Control):**
```
• Silicon Crystal - All electronic processing and control
• Silver Ore - High-quality electrical connections
• Germanium - Sensors and optical systems
• Emerald Crystals - Signal enhancement
• Copper connections and basic electronics also available
```

#### **Barren Planet (Basic Metals):**
```
• Copper Ore - Electrical systems, heat transfer
• Tin Ore - Seals and joining
• Zinc Ore - Corrosion protection
• Manganese Ore - Steel alloying
• Available: Lithium Ore, Tungsten Ore, Vanadium Ore for advanced systems
```

#### **System Asteroid Belt (Precision Components):**
```
• Titanium Ore - High-strength lightweight structures
• Quartz Crystals - Precision timing and control
• Available: Cesium, Strontium Crystals for advanced timing
```

#### **Oceanic Planet (Biological Systems):**
```
• Marine Bio Extract - Biological processing, life support
• Deep Sea Minerals - Water processing
• Hydrothermal Deposits - Moisture control
• Oceanic Gas Pockets - Atmospheric references
```

#### **Volcanic Planet (Energy & Heat):**
```
• Thermal Regulator Stone - Heat management
• Lumanite - Emergency power systems
• Available: High-temperature materials for extreme conditions
```

#### **Gas Giant (Synthetic Materials):**
```
• Thermoplastic Resin - Flexible materials, seals
• Argon - Calibration standards, inert atmosphere
• Available: Various gases for atmospheric control
```

#### **Ice Giant (Precision Materials):**
```
• Ruby Crystals - Temperature sensors
• Available: Sapphire Crystals, various precision crystals
```

### **Total Raw Resources Required: 25+ materials across 8 planet types**
### **Planet Dependency: Complete 8-planet strategic distribution**

### **Ship Module Progression:**
- **T1:** Basic storage and manual systems (8-12 raw materials, 4-5 planets)
- **T2:** Automated systems with basic electronics (15-20 raw materials, 6-7 planets)  
- **T3:** Smart systems with advanced sensors (20-25 raw materials, 7-8 planets)
- **T4-T5:** AI and exotic matter integration (25+ raw materials, 8 planets)

This creates a complete production chain using ONLY actual component names from Components.csv and actual raw material names from Raw.csv - no fake materials invented!