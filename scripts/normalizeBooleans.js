const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, '..', 'src', 'data', 'players.json');
let players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));

players = players.map(p => {
  p.id = p.id || p.canonicalPlayerId || p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  p.canonicalPlayerId = p.id;
  
  // Normalize Country & Overseas
  p.country = p.country || p.nationality || "India";
  p.overseas = p.country !== "India";
  
  // Normalize Role Booleans
  const r = p.role?.toLowerCase() || p.primaryRole?.toLowerCase() || "";
  p.role = r;
  p.batsman = r.includes("batsman") || r.includes("batter");
  p.bowler = r.includes("bowler");
  p.allrounder = r.includes("all-rounder") || r.includes("allrounder");
  p.wicketKeeper = r.includes("keeper") || p.wicketKeeper === true;
  
  // Handedness
  const bS = p.battingStyle || p.battingHand || "";
  p.leftHanded = p.leftHanded || bS.toLowerCase().includes("left");
  
  // Bowling Style
  const bwS = p.bowlingStyle || "";
  p.spinner = p.spinner || bwS.toLowerCase().includes("spin") || bwS.toLowerCase().includes("break") || bwS.toLowerCase().includes("orthodox");
  p.pacer = p.pacer || bwS.toLowerCase().includes("fast") || bwS.toLowerCase().includes("medium") || bwS.toLowerCase().includes("pace");
  
  // Tactics
  const tTags = [
    ...(p.dnaTags||[]), 
    ...(p.tacticalTags||[]), 
    ...(p.playerDNA?.playstyleEmbeddings||[]),
    ...(p.semanticVector||[])
  ].map(t => typeof t === "string" ? t.toLowerCase() : "");
  
  p.opener = p.opener || tTags.includes("opener");
  p.middleOrder = p.middleOrder || tTags.includes("middleorder") || tTags.includes("middle-order");
  p.finisher = p.finisher || tTags.includes("finisher");
  p.powerHitter = p.powerHitter || tTags.includes("power-hitter") || tTags.includes("powerhitter");
  p.anchorBatter = p.anchorBatter || tTags.includes("anchor") || tTags.includes("anchorbatter");
  p.deathBowler = p.deathBowler || tTags.includes("death-bowler") || tTags.includes("death-over-bowler");
  
  return p;
});

fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
console.log(`Normalized 302 players.`);
