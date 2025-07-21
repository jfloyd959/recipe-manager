const fs = require('fs');

const componentData = fs.readFileSync('./finalComponentList.csv', 'utf-8');
const componentLines = componentData.split('\n');
const headers = componentLines[0].split(',');

console.log('Column structure:');
for (let i = 0; i < Math.min(20, headers.length); i++) {
    console.log(`${i}: ${headers[i]}`);
}

console.log('\nHeat Sink XXS T1 structure:');
const heatSinkLine = componentLines.find(line => line.includes('Heat Sink XXS T1'));
if (heatSinkLine) {
    const values = heatSinkLine.split(',');
    for (let i = 0; i < Math.min(20, values.length); i++) {
        console.log(`${i}: ${values[i]}`);
    }
} 