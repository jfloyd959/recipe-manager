const fs = require('fs');

class FullMissingComponentGenerator {
    constructor() {
        this.outputFile = 'missing_full_components.csv';
        this.targetFile = 'finalComponentList_new.csv';

        // Component definitions from ALLCOMPONENTS.md
        this.componentDefinitions = {
            'Mine': {
                category: 'DEFENSIVE',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Explosive Charge', 'Proximity Sensor'], baseTime: 60 },
                    'XXS': { ingredients: ['Explosive Charge', 'Proximity Sensor'], baseTime: 120 },
                    'XS': { ingredients: ['Enhanced Mine Core', 'Targeting System', 'Proximity Sensor'], baseTime: 180 },
                    'S': { ingredients: ['Enhanced Mine Core', 'Targeting System', 'Proximity Sensor'], baseTime: 240 },
                    'M': { ingredients: ['Military Mine Array', 'Enhanced Mine Core', 'Targeting System'], baseTime: 300 },
                    'L': { ingredients: ['Quantum Mine Network', 'Military Mine Array', 'Enhanced Mine Core'], baseTime: 360 },
                    'CAP': { ingredients: ['Capital Defense Grid', 'Quantum Mine Network', 'Military Mine Array'], baseTime: 420 },
                    'CMD': { ingredients: ['Battleship Mine System', 'Capital Defense Grid', 'Quantum Mine Network', 'Military Mine Array'], baseTime: 480 },
                    'CLASS8': { ingredients: ['Titan Mine Matrix', 'Battleship Mine System', 'Capital Defense Grid', 'Quantum Mine Network'], baseTime: 540 },
                    'TTN': { ingredients: ['Singularity Mine Core', 'Titan Mine Matrix', 'Battleship Mine System', 'Capital Defense Grid'], baseTime: 600 }
                }
            },
            'Negative Rem Plating': {
                category: 'DEFENSIVE',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Radiation Absorber', 'Basic Shielding'], baseTime: 60 },
                    'XXS': { ingredients: ['Radiation Absorber', 'Basic Shielding'], baseTime: 120 },
                    'XS': { ingredients: ['Advanced Rem Barrier', 'Particle Deflector', 'Basic Shielding'], baseTime: 180 },
                    'S': { ingredients: ['Advanced Rem Barrier', 'Particle Deflector', 'Basic Shielding'], baseTime: 240 },
                    'M': { ingredients: ['Military Rad Shield', 'Advanced Rem Barrier', 'Particle Deflector'], baseTime: 300 },
                    'L': { ingredients: ['Quantum Radiation Core', 'Military Rad Shield', 'Advanced Rem Barrier'], baseTime: 360 },
                    'CAP': { ingredients: ['Capital Rem System', 'Quantum Radiation Core', 'Military Rad Shield'], baseTime: 420 },
                    'CMD': { ingredients: ['Battleship Rad Defense', 'Capital Rem System', 'Quantum Radiation Core', 'Military Rad Shield'], baseTime: 480 },
                    'CLASS8': { ingredients: ['Titan Rem Matrix', 'Battleship Rad Defense', 'Capital Rem System', 'Quantum Radiation Core'], baseTime: 540 },
                    'TTN': { ingredients: ['Singularity Rad Core', 'Titan Rem Matrix', 'Battleship Rad Defense', 'Capital Rem System'], baseTime: 600 }
                }
            },
            'Warming Plates': {
                category: 'THERMAL',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Heat Generator', 'Thermal Regulator'], baseTime: 60 },
                    'XXS': { ingredients: ['Heat Generator', 'Thermal Regulator'], baseTime: 120 },
                    'XS': { ingredients: ['Enhanced Heating Array', 'Temperature Controller', 'Thermal Regulator'], baseTime: 180 },
                    'S': { ingredients: ['Enhanced Heating Array', 'Temperature Controller', 'Thermal Regulator'], baseTime: 240 },
                    'M': { ingredients: ['Military Thermal Core', 'Enhanced Heating Array', 'Temperature Controller'], baseTime: 300 },
                    'L': { ingredients: ['Quantum Heat Source', 'Military Thermal Core', 'Enhanced Heating Array'], baseTime: 360 },
                    'CAP': { ingredients: ['Capital Heating Grid', 'Quantum Heat Source', 'Military Thermal Core'], baseTime: 420 },
                    'CMD': { ingredients: ['Battleship Thermal System', 'Capital Heating Grid', 'Quantum Heat Source', 'Military Thermal Core'], baseTime: 480 },
                    'CLASS8': { ingredients: ['Titan Heat Matrix', 'Battleship Thermal System', 'Capital Heating Grid', 'Quantum Heat Source'], baseTime: 540 },
                    'TTN': { ingredients: ['Singularity Heat Core', 'Titan Heat Matrix', 'Battleship Thermal System', 'Capital Heating Grid'], baseTime: 600 }
                }
            }
        };

        // Tier configurations
        this.tierConfig = {
            1: { timeMultiplier: 1, planets: 'Terrestrial Planet', factions: 'MUD;ONI;USTUR' },
            2: { timeMultiplier: 2, planets: 'Terrestrial Planet', factions: 'MUD;ONI;USTUR' },
            3: { timeMultiplier: 3, planets: 'Terrestrial Planet;Volcanic Planet;Gas Giant', factions: 'MUD;ONI;USTUR' },
            4: { timeMultiplier: 4, planets: 'Volcanic Planet;Ice Planet', factions: 'MUD;USTUR' },
            5: { timeMultiplier: 5, planets: 'Volcanic Planet;Ice Planet', factions: 'USTUR' }
        };
    }

    generateFullComponentCSV() {
        console.log('🔧 Generating full tiered component CSV entries...');

        const csvHeader = 'OutputID,OutputName,OutputType,ComponentCategory,Size,OutputTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2,Ingredient3,Quantity3,Ingredient4,Quantity4,Ingredient5,Quantity5,Ingredient6,Quantity6,Ingredient7,Quantity7,Ingredient8,Quantity8,Ingredient9,Quantity9,Column 28,Column 29,Column 30,Column 31';

        const csvRows = [csvHeader];
        let totalEntries = 0;

        // Generate entries for each component
        Object.entries(this.componentDefinitions).forEach(([componentName, definition]) => {
            console.log(`\n📦 Processing ${componentName}...`);

            Object.entries(definition.sizes).forEach(([size, sizeData]) => {
                console.log(`  🔧 Generating ${size} tiers...`);

                // Generate T1-T5 for each size
                for (let tier = 1; tier <= 5; tier++) {
                    const tierConfig = this.tierConfig[tier];
                    const outputId = `${componentName.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}-t${tier}`;
                    const outputName = `${componentName} ${size} T${tier}`;
                    const constructionTime = sizeData.baseTime * tierConfig.timeMultiplier;

                    // Build ingredient list
                    const allIngredients = [];
                    let productionSteps = sizeData.ingredients.length;

                    // For T2+, add previous tier as first ingredient
                    if (tier > 1) {
                        const prevTierName = `${componentName} ${size} T${tier - 1}`;
                        allIngredients.push(prevTierName);
                        productionSteps++;
                    }

                    // Add base ingredients
                    allIngredients.push(...sizeData.ingredients);

                    // Build CSV row
                    const row = [
                        outputId,                           // OutputID
                        outputName,                         // OutputName
                        definition.outputType,              // OutputType
                        definition.category,                // ComponentCategory
                        size,                               // Size
                        tier.toString(),                    // OutputTier
                        constructionTime.toString(),        // ConstructionTime
                        tierConfig.planets,                 // PlanetTypes
                        tierConfig.factions,                // Factions
                        'ELECTRONIC_COMPONENT',            // ResourceType
                        productionSteps.toString(),         // ProductionSteps
                    ];

                    // Add ingredients (up to 9 ingredient slots)
                    for (let i = 0; i < 9; i++) {
                        if (i < allIngredients.length) {
                            row.push(allIngredients[i]);       // Ingredient
                            row.push('1');                     // Quantity
                        } else {
                            row.push('');                      // Empty ingredient
                            row.push('');                      // Empty quantity
                        }
                    }

                    // Add remaining empty columns to match header
                    while (row.length < 33) {
                        row.push('');
                    }

                    csvRows.push(row.join(','));
                    totalEntries++;
                }

                console.log(`    ✓ Generated T1-T5 for ${componentName} ${size}`);
            });
        });

        // Write to file
        const csvContent = csvRows.join('\n');
        fs.writeFileSync(this.outputFile, csvContent);

        console.log(`\n✅ Generated ${totalEntries} complete tiered entries`);
        console.log(`📁 Saved to: ${this.outputFile}`);

        return totalEntries;
    }

    // Remove existing incomplete entries from target CSV
    cleanupTargetCSV() {
        console.log(`\n🧹 Cleaning up incomplete entries in ${this.targetFile}...`);

        try {
            // Create backup
            const backupFile = this.targetFile.replace('.csv', '_before_full_cleanup.csv');
            fs.copyFileSync(this.targetFile, backupFile);
            console.log(`📁 Backup created: ${backupFile}`);

            // Read and parse CSV
            const content = fs.readFileSync(this.targetFile, 'utf8');
            const lines = content.split('\n');

            const header = lines[0];
            const dataLines = lines.slice(1);

            // Filter out incomplete entries for the three components
            const filteredLines = dataLines.filter(line => {
                if (!line.trim()) return false;

                // Simple check for component names in OutputID
                const lowerLine = line.toLowerCase();
                const isIncompleteEntry = (
                    lowerLine.includes('mine-') ||
                    lowerLine.includes('negative-rem-plating-') ||
                    lowerLine.includes('warming-plates-')
                );

                return !isIncompleteEntry;
            });

            // Write cleaned CSV
            const cleanedContent = [header, ...filteredLines].join('\n');
            fs.writeFileSync(this.targetFile, cleanedContent);

            const removedCount = dataLines.length - filteredLines.length;
            console.log(`✅ Removed ${removedCount} incomplete entries from target file`);

            return true;

        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
            return false;
        }
    }

    // Add entries to target CSV file
    appendToTargetCSV() {
        console.log(`\n🔗 Appending to ${this.targetFile}...`);

        try {
            // Read existing CSV
            const existingContent = fs.readFileSync(this.targetFile, 'utf8');
            const existingLines = existingContent.split('\n');

            // Read generated entries (skip header)
            const newContent = fs.readFileSync(this.outputFile, 'utf8');
            const newLines = newContent.split('\n').slice(1); // Skip header

            // Filter out any empty lines
            const filteredNewLines = newLines.filter(line => line.trim() !== '');

            // Combine
            const combinedContent = [...existingLines, ...filteredNewLines].join('\n');

            // Write combined content
            fs.writeFileSync(this.targetFile, combinedContent);

            console.log(`✅ Added ${filteredNewLines.length} entries to ${this.targetFile}`);

            return filteredNewLines.length;

        } catch (error) {
            console.error('❌ Error appending to target CSV:', error.message);
            return 0;
        }
    }

    // Create final complete CSV
    createFinalCSV() {
        console.log('\n📝 Creating final complete CSV...');

        try {
            // Copy the updated file to finalComponentList.csv
            fs.copyFileSync(this.targetFile, 'finalComponentList.csv');
            console.log('✅ Created finalComponentList.csv');

            // Get final stats
            const content = fs.readFileSync('finalComponentList.csv', 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            const totalEntries = lines.length - 1; // Exclude header

            console.log(`📊 Final CSV stats:`);
            console.log(`   • Total entries: ${totalEntries}`);
            console.log(`   • File size: ${(fs.statSync('finalComponentList.csv').size / 1024).toFixed(2)} KB`);

            return true;

        } catch (error) {
            console.error('❌ Error creating final CSV:', error.message);
            return false;
        }
    }
}

// Main execution
console.log('🚀 Generating Full Missing Component Entries...');
console.log('===============================================');

const generator = new FullMissingComponentGenerator();

// Step 1: Generate the CSV entries
console.log('Step 1: Generating tiered entries...');
const entriesGenerated = generator.generateFullComponentCSV();

if (entriesGenerated > 0) {
    // Step 2: Clean up existing incomplete entries
    console.log('\nStep 2: Cleaning up incomplete entries...');
    const cleanupSuccess = generator.cleanupTargetCSV();

    if (cleanupSuccess) {
        // Step 3: Append new complete entries
        console.log('\nStep 3: Adding complete entries...');
        const appendedCount = generator.appendToTargetCSV();

        if (appendedCount > 0) {
            // Step 4: Create final CSV
            console.log('\nStep 4: Creating final CSV...');
            const finalSuccess = generator.createFinalCSV();

            if (finalSuccess) {
                console.log('\n🎉 Successfully created complete finalComponentList.csv!');
                console.log('\nAll three components now have complete T1-T5 progressions:');
                console.log('• Mine: XXXS → TTN with T1-T5 tiers (50 entries)');
                console.log('• Negative Rem Plating: XXXS → TTN with T1-T5 tiers (50 entries)');
                console.log('• Warming Plates: XXXS → TTN with T1-T5 tiers (50 entries)');
                console.log('\nTotal added: 150 complete tiered entries');
            } else {
                console.log('\n❌ Failed to create final CSV file.');
            }
        } else {
            console.log('\n❌ Failed to append entries to target CSV file.');
        }
    } else {
        console.log('\n❌ Failed to clean up target CSV file.');
    }
} else {
    console.log('\n❌ No entries were generated.');
} 