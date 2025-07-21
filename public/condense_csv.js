#!/usr/bin/env node
/**
 * CSV Condenser Script
 * Removes redundant T2-T5 components from WorkingCopy.csv, keeping only T1 versions.
 * 
 * The T2-T5 versions are predictable since they only add the previous tier as the first ingredient
 * while keeping all other ingredients the same.
 */

const fs = require('fs');
const path = require('path');

class CSVCondenser {
    constructor() {
        this.inputFile = 'finalComponentList_new.csv';
        this.outputFile = 'finalComponentList_condensed.csv';
        this.backupFile = 'finalComponentList_new_backup.csv';
    }

    // Parse CSV row handling quoted fields and commas
    parseCSVRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    // Convert array back to CSV row
    arrayToCSVRow(arr) {
        return arr.map(field => {
            // Quote fields that contain commas or quotes
            if (field.includes(',') || field.includes('"')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        }).join(',');
    }

    // Process the CSV file
    condenseCSV() {
        try {
            console.log('📖 Reading CSV file...');
            const content = fs.readFileSync(this.inputFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            console.log(`Found ${lines.length} lines`);

            // Parse header
            const header = this.parseCSVRow(lines[0]);
            console.log('Header columns:', header.length);

            // Process all rows
            const condensedRows = [];
            const processedComponents = new Set();

            for (let i = 1; i < lines.length; i++) {
                const row = this.parseCSVRow(lines[i]);

                if (row.length < header.length) {
                    console.log(`Skipping malformed row ${i}: ${row.length} columns`);
                    continue;
                }

                const outputId = row[0];
                const outputName = row[1];
                const outputTier = parseInt(row[5]) || 1;

                // Only process T1 versions (base recipes)
                if (outputTier === 1) {
                    // Remove tier designation from ID and name
                    const condensedId = outputId.replace(/-t1$/, '');
                    const condensedName = outputName.replace(/ T1$/, '');

                    // Check if we've already processed this component
                    if (processedComponents.has(condensedId)) {
                        console.log(`Duplicate component found: ${condensedId}`);
                        continue;
                    }

                    processedComponents.add(condensedId);

                    // Create condensed row
                    const condensedRow = [...row];
                    condensedRow[0] = condensedId;      // Remove tier from ID
                    condensedRow[1] = condensedName;    // Remove tier from name
                    condensedRow[5] = '1';              // Set tier to 1

                    condensedRows.push(condensedRow);
                }
            }

            console.log(`\n📊 Condensation Results:`);
            console.log(`Original entries: ${lines.length - 1}`);
            console.log(`Condensed entries: ${condensedRows.length}`);
            console.log(`Reduction: ${((lines.length - 1 - condensedRows.length) / (lines.length - 1) * 100).toFixed(1)}%`);

            // Create backup
            console.log('\n💾 Creating backup...');
            fs.copyFileSync(this.inputFile, this.backupFile);

            // Write condensed file
            console.log('✏️ Writing condensed CSV...');
            const condensedContent = [
                this.arrayToCSVRow(header),
                ...condensedRows.map(row => this.arrayToCSVRow(row))
            ].join('\n');

            fs.writeFileSync(this.outputFile, condensedContent);

            console.log(`\n✅ Condensation complete!`);
            console.log(`📁 Backup saved as: ${this.backupFile}`);
            console.log(`📁 Condensed file saved as: ${this.outputFile}`);

            // Show some sample entries
            console.log('\n📋 Sample condensed entries:');
            for (let i = 0; i < Math.min(5, condensedRows.length); i++) {
                const row = condensedRows[i];
                console.log(`  ${row[0]} - ${row[1]} (${row[4]})`);
            }

            return true;

        } catch (error) {
            console.error('❌ Error during condensation:', error.message);
            return false;
        }
    }

    // Analyze current structure
    analyzeStructure() {
        try {
            console.log('🔍 Analyzing current CSV structure...');
            const content = fs.readFileSync(this.inputFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            const tierCounts = {};
            const componentTypes = {};
            const sizes = {};

            for (let i = 1; i < lines.length; i++) {
                const row = this.parseCSVRow(lines[i]);

                if (row.length < 6) continue;

                const outputType = row[2];
                const size = row[4];
                const tier = parseInt(row[5]) || 1;

                tierCounts[tier] = (tierCounts[tier] || 0) + 1;
                componentTypes[outputType] = (componentTypes[outputType] || 0) + 1;
                sizes[size] = (sizes[size] || 0) + 1;
            }

            console.log('📊 Current structure analysis:');
            console.log('Tier distribution:', tierCounts);
            console.log('Component types:', Object.keys(componentTypes).length);
            console.log('Ship sizes:', Object.keys(sizes));

            return {
                totalEntries: lines.length - 1,
                tierCounts,
                componentTypes,
                sizes
            };

        } catch (error) {
            console.error('❌ Error analyzing structure:', error.message);
            return null;
        }
    }
}

// Main execution
console.log('🚀 Starting CSV Condensation Process...');
console.log('==========================================');

const condenser = new CSVCondenser();

// Analyze current structure
const analysis = condenser.analyzeStructure();

if (analysis) {
    console.log('\n🔄 Proceeding with condensation...');
    console.log('==========================================');

    const success = condenser.condenseCSV();

    if (success) {
        console.log('\n🎉 CSV condensation completed successfully!');
        console.log('\nThe condensed file contains only the base recipes for each component size,');
        console.log('removing the tiered versions (T1-T5) while maintaining all other data.');
    } else {
        console.log('\n❌ CSV condensation failed. Please check the error messages above.');
    }
} else {
    console.log('\n❌ Could not analyze CSV structure. Please check the file exists and is readable.');
} 