#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../lib/data/sar-resources.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const other = require('./sar-other-resources');

console.log('\n📊 Starting database:');
console.log(`   Coast Guards: ${db.coastGuardStations.length}`);
console.log(`   Salvage Tugs: ${db.salvageTugs.length}`);
console.log(`   Emergency Shelters: ${db.emergencyShelters.length}`);
console.log(`   Port Authorities: ${db.portAuthorities.length}`);
console.log(`   Tsunami Centers: ${db.tsunamiWarningCenters.length}`);
console.log(`   Weather Services: ${db.maritimeWeatherServices.length}`);

// Add new resources
db.portAuthorities.push(...other.ports);
db.salvageTugs.push(...other.salvage);
db.tsunamiWarningCenters.push(...other.tsunami);
db.maritimeWeatherServices.push(...other.weather);

// Add new lifeboat section if doesn't exist
if (!db.lifeboatStations) {
  db.lifeboatStations = [];
}
db.lifeboatStations.push(...other.lifeboat);

console.log('\n✅ Added:');
console.log(`   + ${other.ports.length} Port Authorities`);
console.log(`   + ${other.salvage.length} Salvage Companies`);
console.log(`   + ${other.lifeboat.length} Lifeboat Stations`);
console.log(`   + ${other.tsunami.length} Tsunami Centers`);
console.log(`   + ${other.weather.length} Weather Services`);

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const total = db.coastGuardStations.length + db.salvageTugs.length + 
              db.emergencyShelters.length + db.portAuthorities.length +
              db.tsunamiWarningCenters.length + db.maritimeWeatherServices.length +
              (db.lifeboatStations?.length || 0);

console.log('\n📊 Final database:');
console.log(`   Coast Guards: ${db.coastGuardStations.length}`);
console.log(`   Salvage Tugs: ${db.salvageTugs.length}`);
console.log(`   Emergency Shelters: ${db.emergencyShelters.length}`);
console.log(`   Port Authorities: ${db.portAuthorities.length}`);
console.log(`   Tsunami Centers: ${db.tsunamiWarningCenters.length}`);
console.log(`   Weather Services: ${db.maritimeWeatherServices.length}`);
console.log(`   Lifeboat Stations: ${db.lifeboatStations.length}`);
console.log(`   🎉 TOTAL: ${total} resources`);
