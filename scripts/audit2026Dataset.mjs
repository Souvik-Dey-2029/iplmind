/**
 * Dataset Audit Engine for IPL 2026
 * Detects duplicates, missing fields, inconsistencies, and stale data.
 * 
 * Usage: node scripts/audit2026Dataset.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = join(__dirname, '..', 'src', 'data', 'players.json');

function run() {
  const players = JSON.parse(readFileSync(PLAYERS_PATH, 'utf-8'));
  const issues = [];

  // 1. Duplicate name detection
  const nameCount = {};
  players.forEach(p => { nameCount[p.name] = (nameCount[p.name] || 0) + 1; });
  Object.entries(nameCount).filter(([, c]) => c > 1).forEach(([name, count]) => {
    issues.push(`DUPLICATE: "${name}" appears ${count} times`);
  });

  // 2. Missing critical fields
  players.forEach(p => {
    if (!p.name) issues.push(`MISSING NAME: id=${p.id}`);
    if (!p.country || p.country === 'Unknown') issues.push(`MISSING COUNTRY: ${p.name}`);
    if (!p.role || p.role === 'Unknown') issues.push(`MISSING ROLE: ${p.name}`);
    if (!p.currentTeam) issues.push(`MISSING CURRENT TEAM: ${p.name}`);
    if (p.active && p.retired) issues.push(`CONFLICT active+retired: ${p.name}`);
  });

  // 3. Stale franchise names
  const VALID_TEAMS = new Set([
    'Chennai Super Kings','Mumbai Indians','Royal Challengers Bengaluru',
    'Kolkata Knight Riders','Delhi Capitals','Sunrisers Hyderabad',
    'Rajasthan Royals','Gujarat Titans','Lucknow Super Giants','Punjab Kings',
    'Rising Pune Supergiant','Gujarat Lions','Kochi Tuskers Kerala',
    'Deccan Chargers','Pune Warriors',
  ]);
  players.forEach(p => {
    if (p.currentTeam && !VALID_TEAMS.has(p.currentTeam)) {
      issues.push(`INVALID TEAM: ${p.name} → "${p.currentTeam}"`);
    }
  });

  // 4. Country normalization check
  const VALID_COUNTRIES = new Set([
    'India','Australia','England','New Zealand','South Africa','West Indies',
    'Sri Lanka','Afghanistan','Bangladesh','Zimbabwe','Ireland','Nepal','Scotland',
  ]);
  players.forEach(p => {
    if (p.country && !VALID_COUNTRIES.has(p.country)) {
      issues.push(`UNNORMALIZED COUNTRY: ${p.name} → "${p.country}"`);
    }
  });

  // Summary
  console.log(`\n=== IPL 2026 Dataset Audit ===`);
  console.log(`Total players: ${players.length}`);
  console.log(`Active: ${players.filter(p => p.active).length}`);
  console.log(`Retired: ${players.filter(p => p.retired).length}`);
  console.log(`Issues found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('\n--- Issues ---');
    issues.forEach(i => console.log(`  ⚠ ${i}`));
  } else {
    console.log('\n✅ No issues found. Dataset is clean.');
  }
}

run();
