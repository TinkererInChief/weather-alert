#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../lib/data/sar-resources.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Import all additions
const coastGuardsData = require('./sar-additions-data');

// Merge all coast guards
const allNewCoastGuards = [
  ...coastGuardsData.asiaPacificCoastGuards,
  ...coastGuardsData.middleEastPhase2a,
  ...coastGuardsData.americasPhase2a,
  ...coastGuardsData.middleEast5Star
];

db.coastGuardStations.push(...allNewCoastGuards);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`✅ Added ${allNewCoastGuards.length} coast guards`);
console.log(`📊 Total: ${db.coastGuardStations.length} coast guards`);
