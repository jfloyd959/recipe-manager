const fs = require('fs');

class MissingComponentGenerator {
    constructor() {
        this.outputFile = 'missing_components.csv';

        // Component definitions from ALLCOMPONENTS.md
        this.componentDefinitions = {
            'Mine': {
                category: 'DEFENSIVE',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Explosive Charge', 'Proximity Sensor'], time: 60 },
                    'XXS': { ingredients: ['Explosive Charge', 'Proximity Sensor'], time: 120 },
                    'XS': { ingredients: ['Enhanced Mine Core', 'Targeting System', 'Proximity Sensor'], time: 180 },
                    'S': { ingredients: ['Enhanced Mine Core', 'Targeting System', 'Proximity Sensor'], time: 240 },
                    'M': { ingredients: ['Military Mine Array', 'Enhanced Mine Core', 'Targeting System'], time: 300 },
                    'L': { ingredients: ['Quantum Mine Network', 'Military Mine Array', 'Enhanced Mine Core'], time: 360 },
                    'CAP': { ingredients: ['Capital Defense Grid', 'Quantum Mine Network', 'Military Mine Array'], time: 420 },
                    'CMD': { ingredients: ['Battleship Mine System', 'Capital Defense Grid', 'Quantum Mine Network', 'Military Mine Array'], time: 480 },
                    'CLASS8': { ingredients: ['Titan Mine Matrix', 'Battleship Mine System', 'Capital Defense Grid', 'Quantum Mine Network'], time: 540 },
                    'TTN': { ingredients: ['Singularity Mine Core', 'Titan Mine Matrix', 'Battleship Mine System', 'Capital Defense Grid'], time: 600 }
                }
            },
            'Negative Rem Plating': {
                category: 'DEFENSIVE',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Radiation Absorber', 'Basic Shielding'], time: 60 },
                    'XXS': { ingredients: ['Radiation Absorber', 'Basic Shielding'], time: 120 },
                    'XS': { ingredients: ['Advanced Rem Barrier', 'Particle Deflector', 'Basic Shielding'], time: 180 },
                    'S': { ingredients: ['Advanced Rem Barrier', 'Particle Deflector', 'Basic Shielding'], time: 240 },
                    'M': { ingredients: ['Military Rad Shield', 'Advanced Rem Barrier', 'Particle Deflector'], time: 300 },
                    'L': { ingredients: ['Quantum Radiation Core', 'Military Rad Shield', 'Advanced Rem Barrier'], time: 360 },
                    'CAP': { ingredients: ['Capital Rem System', 'Quantum Radiation Core', 'Military Rad Shield'], time: 420 },
                    'CMD': { ingredients: ['Battleship Rad Defense', 'Capital Rem System', 'Quantum Radiation Core', 'Military Rad Shield'], time: 480 },
                    'CLASS8': { ingredients: ['Titan Rem Matrix', 'Battleship Rad Defense', 'Capital Rem System', 'Quantum Radiation Core'], time: 540 },
                    'TTN': { ingredients: ['Singularity Rad Core', 'Titan Rem Matrix', 'Battleship Rad Defense', 'Capital Rem System'], time: 600 }
                }
            },
            'Warming Plates': {
                category: 'THERMAL',
                outputType: 'COUNTERMEASURES',
                sizes: {
                    'XXXS': { ingredients: ['Heat Generator', 'Thermal Regulator'], time: 60 },
                    'XXS': { ingredients: ['Heat Generator', 'Thermal Regulator'], time: 120 },
                    'XS': { ingredients: ['Enhanced Heating Array', 'Temperature Controller', 'Thermal Regulator'], time: 180 },
                    'S': { ingredients: ['Enhanced Heating Array', 'Temperature Controller', 'Thermal Regulator'], time: 240 },
                    'M': { ingredients: ['Military Thermal Core', 'Enhanced Heating Array', 'Temperature Controller'], time: 300 },
                    'L': { ingredients: ['Quantum Heat Source', 'Military Thermal Core', 'Enhanced Heating Array'], time: 360 },
                    'CAP': { ingredients: ['Capital Heating Grid', 'Quantum Heat Source', 'Military Thermal Core'], time: 420 },
                    'CMD': { ingredients: ['Battleship Thermal System', 'Capital Heating Grid', 'Quantum Heat Source', 'Military Thermal Core'], time: 480 },
                    'CLASS8': { ingredients: ['Titan Heat Matrix', 'Battleship Thermal System', 'Capital Heating Grid', 'Quantum Heat Source'], time: 540 },
                    'TTN': { ingredients: ['Singularity Heat Core', 'Titan Heat Matrix', 'Battleship Thermal System', 'Capital Heating Grid'], time: 600 }
                }
            }
        };
    }

    generateComponentCSV() {
        console.log('🔧 Generating missing component CSV entries...');

        const csvHeader = 'OutputID,OutputName,OutputType,ComponentCategory,Size,OutputTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2,Ingredient3,Quantity3,Ingredient4,Quantity4,Ingredient5,Quantity5,Ingredient6,Quantity6,Ingredient7,Quantity7,Ingredient8,Quantity8,Ingredient9,Quantity9,Column 28,Column 29,Column 30,Column 31';

        const csvRows = [csvHeader];

        // Generate entries for each component
        Object.entries(this.componentDefinitions).forEach(([componentName, definition]) => {
            console.log(`\n📦 Processing ${componentName}...`);

            Object.entries(definition.sizes).forEach(([size, sizeData]) => {
                const outputId = `${componentName.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}`;
                const outputName = `${componentName} ${size}`;
                const ingredientCount = sizeData.ingredients.length;

                // Build CSV row
                const row = [
                    outputId,                           // OutputID
                    outputName,                         // OutputName
                    definition.outputType,              // OutputType
                    definition.category,                // ComponentCategory
                    size,                               // Size
                    '1',                                // OutputTier
                    sizeData.time.toString(),           // ConstructionTime
                    'Terrestrial Planet',               // PlanetTypes
                    'MUD;ONI;USTUR',                   // Factions
                    'ELECTRONIC_COMPONENT',            // ResourceType
                    ingredientCount.toString(),         // ProductionSteps
                ];

                // Add ingredients (up to 9 ingredient slots)
                for (let i = 0; i < 9; i++) {
                    if (i < sizeData.ingredients.length) {
                        row.push(sizeData.ingredients[i]);  // Ingredient
                        row.push('1');                      // Quantity
                    } else {
                        row.push('');                       // Empty ingredient
                        row.push('');                       // Empty quantity
                    }
                }

                // Add remaining empty columns to match header
                while (row.length < 33) {
                    row.push('');
                }

                csvRows.push(row.join(','));

                console.log(`  ✓ ${outputName} (${ingredientCount} ingredients)`);
            });
        });

        // Write to file
        const csvContent = csvRows.join('\n');
        fs.writeFileSync(this.outputFile, csvContent);

        console.log(`\n✅ Generated ${csvRows.length - 1} component entries`);
        console.log(`📁 Saved to: ${this.outputFile}`);

        return csvRows.length - 1;
    }

    // Add entries to existing CSV file
    appendToCSV(targetFile) {
        console.log(`\n🔗 Appending to ${targetFile}...`);

        try {
            // Read existing CSV
            const existingContent = fs.readFileSync(targetFile, 'utf8');
            const existingLines = existingContent.split('\n');

            // Read generated entries (skip header)
            const newContent = fs.readFileSync(this.outputFile, 'utf8');
            const newLines = newContent.split('\n').slice(1); // Skip header

            // Filter out any empty lines
            const filteredNewLines = newLines.filter(line => line.trim() !== '');

            // Combine
            const combinedContent = [...existingLines, ...filteredNewLines].join('\n');

            // Create backup
            const backupFile = targetFile.replace('.csv', '_before_missing.csv');
            fs.copyFileSync(targetFile, backupFile);

            // Write combined content
            fs.writeFileSync(targetFile, combinedContent);

            console.log(`✅ Added ${filteredNewLines.length} entries to ${targetFile}`);
            console.log(`📁 Backup created: ${backupFile}`);

            return true;

        } catch (error) {
            console.error('❌ Error appending to CSV:', error.message);
            return false;
        }
    }
}

// Main execution
console.log('🚀 Generating Missing Component Entries...');
console.log('==========================================');

const generator = new MissingComponentGenerator();

// Generate the CSV entries
const entriesGenerated = generator.generateComponentCSV();

if (entriesGenerated > 0) {
    console.log('\n🔄 Appending to finalComponentList_condensed.csv...');
    const success = generator.appendToCSV('finalComponentList_condensed.csv');

    if (success) {
        console.log('\n🎉 Successfully added missing component entries!');
        console.log('\nAll three components now have complete size progressions:');
        console.log('• Mine: XXXS → TTN (DEFENSIVE/COUNTERMEASURES)');
        console.log('• Negative Rem Plating: XXXS → TTN (DEFENSIVE/COUNTERMEASURES)');
        console.log('• Warming Plates: XXXS → TTN (THERMAL/COUNTERMEASURES)');
    } else {
        console.log('\n❌ Failed to append to target CSV file.');
    }
} else {
    console.log('\n❌ No entries were generated.');
} 