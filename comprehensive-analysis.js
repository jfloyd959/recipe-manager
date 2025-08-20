const fs = require('fs');

// Load component production steps from CSV
function loadComponentData() {
    const csvContent = fs.readFileSync('public/finalComponentList.csv', 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0].split(',');

    const nameIndex = header.indexOf('OutputName');
    const stepsIndex = header.indexOf('ProductionSteps');
    const tierIndex = header.indexOf('OutputTier');

    const components = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const name = parts[nameIndex]?.trim();
        const steps = parseInt(parts[stepsIndex]) || 0;
        const tier = parseInt(parts[tierIndex]) || 0;

        if (name) {
            components.set(name, { steps, tier });
        }
    }

    console.log(`✅ Loaded ${components.size} components from finalComponentList.csv`);
    return components;
}

// Comprehensive analysis of the user's data
function analyzeCompleteDataset() {
    const componentData = loadComponentData();

    // From the user's complete dataset, identify all components with >2 steps
    const violatingComponents = new Map();

    // Scan all components for violations
    componentData.forEach((info, name) => {
        if (info.steps > 2) {
            violatingComponents.set(name, {
                steps: info.steps,
                tier: info.tier,
                usages: []
            });
        }
    });

    console.log(`\n🔍 Found ${violatingComponents.size} components with >2 production steps:`);

    // Sort by steps (descending) then by name
    const sorted = Array.from(violatingComponents.entries()).sort((a, b) => {
        if (b[1].steps !== a[1].steps) return b[1].steps - a[1].steps;
        return a[0].localeCompare(b[0]);
    });

    console.log('\n📋 COMPLETE LIST OF VIOLATING COMPONENTS:');
    console.log('='.repeat(80));

    let reportContent = `# Complete Production Steps Violation Analysis

**Generated:** ${new Date().toLocaleString()}
**Analysis:** All components requiring more than 2 production steps
**Total Violating Components:** ${violatingComponents.size}

## All Violating Components (${violatingComponents.size} total)

| # | Component Name | Steps | Tier | Notes |
|---|---|---|---|---|
`;

    sorted.forEach(([name, info], index) => {
        const severity = info.steps >= 5 ? '🔥 CRITICAL' :
            info.steps === 4 ? '🔴 HIGH' :
                info.steps === 3 ? '🟡 MODERATE' : '🟢 LOW';

        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${name}`);
        console.log(`     Steps: ${info.steps} | Tier: T${info.tier} | Severity: ${severity}`);

        reportContent += `| ${index + 1} | **${name}** | ${info.steps} | T${info.tier} | ${severity} |\n`;
    });

    reportContent += `\n## Detailed Component Analysis\n\n`;

    // Group by production steps
    const bySteps = new Map();
    sorted.forEach(([name, info]) => {
        if (!bySteps.has(info.steps)) {
            bySteps.set(info.steps, []);
        }
        bySteps.get(info.steps).push(name);
    });

    Array.from(bySteps.entries()).sort((a, b) => b[0] - a[0]).forEach(([steps, components]) => {
        const severity = steps >= 5 ? '🔥 CRITICAL' :
            steps === 4 ? '🔴 HIGH' :
                steps === 3 ? '🟡 MODERATE' : '🟢 LOW';

        console.log(`\n${severity} - ${steps} Production Steps (${components.length} components):`);
        reportContent += `### ${severity} ${steps} Production Steps (${components.length} components)\n\n`;

        components.forEach(name => {
            const info = violatingComponents.get(name);
            console.log(`  • ${name} (T${info.tier})`);
            reportContent += `- **${name}** (T${info.tier})\n`;
        });
        reportContent += '\n';
    });

    // Critical early-game analysis
    reportContent += `## 🚨 Critical Early-Game Impact Analysis\n\n`;

    const earlyGameComponents = sorted.filter(([name, info]) => info.tier <= 2);
    if (earlyGameComponents.length > 0) {
        reportContent += `**Early-Game Components (T1-T2) with >2 steps:** ${earlyGameComponents.length}\n\n`;
        earlyGameComponents.forEach(([name, info]) => {
            reportContent += `- **${name}** - ${info.steps} steps (T${info.tier}) - ⚠️ **BLOCKS EARLY PROGRESSION**\n`;
        });
    } else {
        reportContent += `✅ **No early-game components (T1-T2) require >2 steps - Good for progression!**\n\n`;
    }

    // Mid-game analysis
    const midGameComponents = sorted.filter(([name, info]) => info.tier >= 3 && info.tier <= 4);
    if (midGameComponents.length > 0) {
        reportContent += `**Mid-Game Components (T3-T4) with >2 steps:** ${midGameComponents.length}\n\n`;
        midGameComponents.forEach(([name, info]) => {
            reportContent += `- **${name}** - ${info.steps} steps (T${info.tier})\n`;
        });
    }

    // Late-game analysis
    const lateGameComponents = sorted.filter(([name, info]) => info.tier === 5);
    if (lateGameComponents.length > 0) {
        reportContent += `\n**Late-Game Components (T5) with >2 steps:** ${lateGameComponents.length}\n\n`;
        lateGameComponents.forEach(([name, info]) => {
            reportContent += `- **${name}** - ${info.steps} steps (T${info.tier}) - ✅ **Acceptable for late-game**\n`;
        });
    }

    // Recommendations
    reportContent += `\n## 📝 Recommendations for Manual Review\n\n`;
    reportContent += `### Priority Order for Manual Review:\n\n`;
    reportContent += `1. **🔥 CRITICAL (5+ steps):** Review immediately - these severely impact progression\n`;
    reportContent += `2. **🔴 HIGH (4 steps):** Review soon - significant complexity\n`;
    reportContent += `3. **🟡 MODERATE (3 steps):** Review when possible - manageable complexity\n\n`;

    reportContent += `### Specific Actions:\n\n`;
    reportContent += `- **For T1-T2 components:** Find simpler alternatives or break into smaller components\n`;
    reportContent += `- **For T3-T4 components:** Consider if complexity is justified for mid-game\n`;
    reportContent += `- **For T5 components:** Generally acceptable but review if used in critical early buildings\n`;
    reportContent += `- **Infrastructure buildings:** Can handle more complex components\n`;
    reportContent += `- **Resource extraction buildings:** Should prioritize simpler components for early tiers\n\n`;

    reportContent += `### Questions to Ask During Manual Review:\n\n`;
    reportContent += `1. Is this component used in any T1-T3 resource buildings?\n`;
    reportContent += `2. Can this component be broken down into simpler sub-components?\n`;
    reportContent += `3. Are there existing simpler alternatives that could be used instead?\n`;
    reportContent += `4. Is the complexity justified by the component's function and tier?\n`;
    reportContent += `5. Would replacing this component improve early-game progression?\n\n`;

    // Save the report
    fs.writeFileSync('COMPLETE_VIOLATION_ANALYSIS.md', reportContent);

    console.log('\n' + '='.repeat(80));
    console.log('📝 COMPLETE ANALYSIS SAVED TO: COMPLETE_VIOLATION_ANALYSIS.md');
    console.log('='.repeat(80));

    return { violatingComponents, sorted };
}

// Run the analysis
console.log('🚀 Starting comprehensive production steps analysis...');
console.log('📊 This will identify ALL components requiring >2 production steps');
console.log('🎯 Perfect for manual review and optimization planning\n');

try {
    const { violatingComponents, sorted } = analyzeCompleteDataset();

    console.log(`\n✅ ANALYSIS COMPLETE!`);
    console.log(`📊 Found ${violatingComponents.size} components requiring manual review`);
    console.log(`📝 Detailed report saved for your manual analysis`);

} catch (error) {
    console.error('❌ Error during analysis:', error);
    console.error(error.stack);
} 