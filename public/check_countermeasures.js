const fs = require('fs');

const componentData = fs.readFileSync('./finalComponentList.csv', 'utf-8');
const componentLines = componentData.split('\n');
const headers = componentLines[0].split(',');

console.log('Column structure:');
for (let i = 0; i < Math.min(20, headers.length); i++) {
    console.log(`${i}: ${headers[i]}`);
}

console.log('\nCountermeasure Decoy XXXS T1 structure:');
const decoyLine = componentLines.find(line => line.includes('Decoy XXXS T1'));
if (decoyLine) {
    const values = decoyLine.split(',');
    console.log('Full line:', decoyLine);
    console.log('\nParsed values:');
    for (let i = 0; i < Math.min(25, values.length); i++) {
        console.log(`${i}: ${values[i]}`);
    }
} else {
    console.log('Decoy XXXS T1 not found');
}

console.log('\nCountermeasure Energy Capacitor XXXS T1 structure:');
const energyLine = componentLines.find(line => line.includes('Energy Capacitor XXXS T1'));
if (energyLine) {
    const values = energyLine.split(',');
    console.log('Full line:', energyLine);
    console.log('\nParsed values:');
    for (let i = 0; i < Math.min(25, values.length); i++) {
        console.log(`${i}: ${values[i]}`);
    }
} else {
    console.log('Energy Capacitor XXXS T1 not found');
} 