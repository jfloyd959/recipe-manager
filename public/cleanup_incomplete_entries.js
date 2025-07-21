const fs = require('fs');

// Parse CSV row handling quoted fields and commas
function parseCSVRow(row) {
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
function arrayToCSVRow(arr) {
    return arr.map(field => {
        // Quote fields that contain commas or quotes
        if (field.includes(',') || field.includes('"')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }).join(',');
}

function cleanupIncompleteEntries() {
    const inputFile = 'finalComponentList_condensed.csv';
    const backupFile = 'finalComponentList_condensed_before_cleanup.csv';

    console.log('🧹 Cleaning up incomplete entries...');

    try {
        // Create backup
        fs.copyFileSync(inputFile, backupFile);
        console.log(`📁 Backup created: ${backupFile}`);

        // Read and parse CSV
        const content = fs.readFileSync(inputFile, 'utf8');
        const lines = content.split('\n');

        const header = lines[0];
        const dataLines = lines.slice(1);

        // Filter out incomplete entries for the three components
        const filteredLines = dataLines.filter(line => {
            if (!line.trim()) return false;

            const row = parseCSVRow(line);
            const outputId = row[0];

            // Remove existing incomplete entries for these components
            const isIncompleteEntry = (
                outputId.startsWith('mine-') ||
                outputId.startsWith('negative-rem-plating-') ||
                outputId.startsWith('warming-plates-')
            );

            return !isIncompleteEntry;
        });

        // Write cleaned CSV
        const cleanedContent = [header, ...filteredLines].join('\n');
        fs.writeFileSync(inputFile, cleanedContent);

        const removedCount = dataLines.length - filteredLines.length;
        console.log(`✅ Removed ${removedCount} incomplete entries`);
        console.log(`📊 Remaining entries: ${filteredLines.length}`);

        return true;

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        return false;
    }
}

// Run cleanup
console.log('🚀 Starting Incomplete Entry Cleanup...');
console.log('=====================================');

const success = cleanupIncompleteEntries();

if (success) {
    console.log('\n✅ Cleanup completed successfully!');
    console.log('The CSV is now ready for the complete component entries.');
} else {
    console.log('\n❌ Cleanup failed. Please check the error messages above.');
} 