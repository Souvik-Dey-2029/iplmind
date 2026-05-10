const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, '..', 'src', 'data', 'players.json');
const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
const existingNames = new Set(players.map(p => p.name.toLowerCase()));

function mk(n,c,r,t,ht,tags,extra={}) {
  if (existingNames.has(n.toLowerCase())) return null;
  const id = n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {
    id: id,
    canonicalPlayerId: id,
    name: n, country: c, role: r, currentTeam: t, latestSeasonTeam: t,
    teams: [t, ...(ht||[])], historicalTeams: ht||[],
    battingStyle: extra.bat||"Right", bowlingStyle: extra.bowl||"",
    ...extra, dnaTags: tags, semanticVector: tags,
    searchText: [n,c,r,t,...(ht||[]),...tags].join(' ').toLowerCase()
  };
}

const newPlayers = [
// === LEGENDS ===
mk("Adam Gilchrist","Australia","wicket-keeper","Deccan Chargers",["Kings XI Punjab"],["explosive-opener","wicketkeeper","world-cup-hero","left-handed","inaugural-ipl","deccan-chargers-legend"],{bat:"Left",iconic:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Shane Warne","Australia","bowler","Rajasthan Royals",[],["leg-spinner","captain","inaugural-champion","spin-wizard","rajasthan-royals-legend","founding-era"],{bowl:"Right-arm leg-break",captain:true,titleWinningCaptain:true,iconic:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Suresh Raina","India","batsman","Chennai Super Kings",["Gujarat Lions"],["mr-ipl","left-handed","csk-legend","fielding-specialist","middle-order","consistent-performer","most-runs-early-ipl"],{bat:"Left",iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008}),
mk("Yusuf Pathan","India","all-rounder","Kolkata Knight Riders",["Rajasthan Royals","Sunrisers Hyderabad"],["power-hitter","off-spinner","inaugural-champion","big-hitter","rajasthan-royals"],{bowl:"Right-arm off-break",retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Murali Vijay","India","batsman","Chennai Super Kings",["Delhi Capitals","Kings XI Punjab"],["classical-opener","right-handed","csk-opener","test-specialist"],{retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Jacques Kallis","South Africa","all-rounder","Kolkata Knight Riders",["Royal Challengers Bengaluru"],["legendary-allrounder","classical-batsman","medium-pacer","overseas-icon","complete-cricketer"],{bowl:"Right-arm fast-medium",retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Lasith Malinga","Sri Lanka","bowler","Mumbai Indians",[],["yorker-king","slinga-malinga","death-bowling-legend","mi-legend","unorthodox-action","toe-crushing-yorkers"],{bowl:"Right-arm fast",iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2009}),
mk("AB de Villiers","South Africa","batsman","Royal Challengers Bengaluru",["Delhi Capitals"],["mr-360","impossible-shots","rcb-icon","innovation-specialist","greatest-t20-batsman","explosive-middle-order"],{iconic:true,retired:true,active:false,era:"golden-era",rarity:"common",debutYear:2008}),
mk("Chris Gayle","West Indies","batsman","Royal Challengers Bengaluru",["Kolkata Knight Riders","Kings XI Punjab"],["universe-boss","six-machine","explosive-opener","175-record","entertainer","ipl-monster","left-handed"],{bat:"Left",iconic:true,retired:true,active:false,era:"golden-era",rarity:"common",debutYear:2009}),
mk("Kieron Pollard","West Indies","all-rounder","Mumbai Indians",[],["power-hitter","mi-legend","death-over-specialist","six-hitter","finisher","long-ipl-career"],{bowl:"Right-arm medium",iconic:true,retired:true,active:false,era:"golden-era",rarity:"common",debutYear:2010}),
mk("Robin Uthappa","India","batsman","Kolkata Knight Riders",["Royal Challengers Bengaluru","Rajasthan Royals","Chennai Super Kings","Mumbai Indians","Pune Warriors"],["aggressive-opener","orange-cap-2014","kkr-champion","journeyman","flamboyant-batsman"],{retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008,orangeCap:true}),
mk("Harbhajan Singh","India","bowler","Mumbai Indians",["Chennai Super Kings","Kolkata Knight Riders"],["turbanator","off-spinner","mi-champion","experienced-spinner","veteran-spinner"],{bowl:"Right-arm off-break",retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("RP Singh","India","bowler","Deccan Chargers",["Royal Challengers Bengaluru","Kochi Tuskers Kerala","Pune Warriors"],["left-arm-pacer","deccan-champion","swing-bowler","early-ipl-star"],{bowl:"Left-arm fast-medium",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Pragyan Ojha","India","bowler","Deccan Chargers",["Mumbai Indians"],["left-arm-spinner","deccan-champion","classical-spinner","early-ipl-wicket-taker"],{bowl:"Slow left-arm orthodox",bat:"Left",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Shaun Marsh","Australia","batsman","Kings XI Punjab",["Delhi Capitals"],["elegant-left-hander","first-orange-cap","overseas-opener","kxip-icon"],{bat:"Left",retired:true,active:false,era:"founding-era",rarity:"rare",orangeCap:true,debutYear:2008}),
mk("Paul Valthaty","India","batsman","Kings XI Punjab",[],["one-season-wonder","explosive-century","kxip-sensation","domestic-hero","cult-player"],{retired:true,active:false,era:"founding-era",rarity:"legendary",debutYear:2011}),
mk("Shane Watson","Australia","all-rounder","Rajasthan Royals",["Royal Challengers Bengaluru","Chennai Super Kings"],["power-allrounder","inaugural-champion","csk-final-century","explosive-opener","match-winner"],{bowl:"Right-arm fast-medium",iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008}),
mk("Brendon McCullum","New Zealand","batsman","Kolkata Knight Riders",["Chennai Super Kings","Gujarat Lions"],["first-ipl-century","158-not-out","explosive-opener","inaugural-hero","kkr-icon"],{iconic:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Gautam Gambhir","India","batsman","Kolkata Knight Riders",["Delhi Capitals","Lucknow Super Giants"],["kkr-captain","two-time-champion","left-handed-opener","tactical-captain","delhi-boy"],{bat:"Left",captain:true,titleWinningCaptain:true,iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008}),
mk("Sachin Tendulkar","India","batsman","Mumbai Indians",[],["god-of-cricket","mi-icon","greatest-batsman","master-blaster","living-legend"],{iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008}),
mk("Yuvraj Singh","India","all-rounder","Kings XI Punjab",["Pune Warriors","Royal Challengers Bengaluru","Delhi Capitals","Sunrisers Hyderabad","Mumbai Indians"],["six-sixes","left-handed","cancer-survivor","world-cup-hero","power-hitter","journeyman"],{bat:"Left",bowl:"Slow left-arm orthodox",iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008}),
mk("Virender Sehwag","India","batsman","Delhi Capitals",["Kings XI Punjab"],["nawab-of-najafgarh","destructive-opener","fearless-batting","delhi-icon"],{iconic:true,retired:true,active:false,era:"founding-era",rarity:"common",debutYear:2008,captain:true}),
mk("Zaheer Khan","India","bowler","Mumbai Indians",["Royal Challengers Bengaluru","Delhi Capitals"],["left-arm-pacer","swing-master","mi-bowling-mentor","experienced-seamer"],{bowl:"Left-arm fast-medium",bat:"Left",retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Ashish Nehra","India","bowler","Delhi Capitals",["Chennai Super Kings","Royal Challengers Bengaluru","Pune Warriors","Sunrisers Hyderabad"],["left-arm-pacer","veteran-pacer","comeback-specialist","farewell-at-delhi"],{bowl:"Left-arm fast-medium",bat:"Left",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("S Sreesanth","India","bowler","Rajasthan Royals",["Kochi Tuskers Kerala","Kings XI Punjab"],["inaugural-champion","controversial","fast-bowler","spot-fixing-scandal"],{bowl:"Right-arm fast",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Irfan Pathan","India","all-rounder","Kings XI Punjab",["Delhi Capitals","Rajasthan Royals","Chennai Super Kings","Rising Pune Supergiant","Gujarat Lions"],["swing-bowling-allrounder","left-arm-seamer","hatrick-hero","baroda-express"],{bowl:"Left-arm fast-medium",bat:"Left",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Munaf Patel","India","bowler","Rajasthan Royals",["Mumbai Indians","Gujarat Lions"],["medium-pacer","inaugural-champion","defensive-bowler","economical"],{bowl:"Right-arm medium-fast",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Parthiv Patel","India","wicket-keeper","Chennai Super Kings",["Kochi Tuskers Kerala","Royal Challengers Bengaluru","Sunrisers Hyderabad","Mumbai Indians"],["diminutive-keeper","left-handed-opener","journeyman-keeper","veteran"],{bat:"Left",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Sourav Ganguly","India","batsman","Kolkata Knight Riders",["Pune Warriors"],["dada","prince-of-kolkata","kkr-captain","left-handed","iconic-leader"],{bat:"Left",captain:true,iconic:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("VVS Laxman","India","batsman","Deccan Chargers",["Kochi Tuskers Kerala","Sunrisers Hyderabad"],["very-very-special","wristy-batsman","deccan-icon","elegant-stroke-maker"],{retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Rahul Dravid","India","batsman","Royal Challengers Bengaluru",["Rajasthan Royals"],["the-wall","mr-dependable","rcb-captain","classical-batsman","rr-mentor"],{captain:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Anil Kumble","India","bowler","Royal Challengers Bengaluru",[],["jumbo","leg-spinner","rcb-captain","spin-legend","10-wicket-haul"],{bowl:"Right-arm leg-break",captain:true,retired:true,active:false,era:"founding-era",rarity:"uncommon",debutYear:2008}),
mk("Kevin Pietersen","England","batsman","Royal Challengers Bengaluru",["Delhi Capitals","Rising Pune Supergiant"],["kp","switch-hit","flamboyant-batsman","overseas-star","entertainer"],{retired:true,active:false,era:"golden-era",rarity:"rare",debutYear:2009}),
mk("Aaron Finch","Australia","batsman","Rajasthan Royals",["Delhi Capitals","Gujarat Lions","Mumbai Indians","Royal Challengers Bengaluru","Kolkata Knight Riders"],["australian-captain","explosive-opener","journeyman","power-hitter"],{retired:true,active:false,era:"golden-era",rarity:"rare",debutYear:2010}),
mk("Dale Steyn","South Africa","bowler","Royal Challengers Bengaluru",["Deccan Chargers","Sunrisers Hyderabad","Gujarat Lions"],["fastest-bowler","steyn-gun","express-pace","lethal-pacer"],{bowl:"Right-arm fast",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Morne Morkel","South Africa","bowler","Delhi Capitals",["Rajasthan Royals","Kolkata Knight Riders","Lucknow Super Giants"],["tall-pacer","bounce-specialist","south-african-pacer"],{bowl:"Right-arm fast",retired:true,active:false,era:"founding-era",rarity:"rare",debutYear:2008}),
mk("Imran Tahir","South Africa","bowler","Chennai Super Kings",["Delhi Capitals","Rising Pune Supergiant"],["celebration-king","leg-spinner","csk-champion","animated-wicket-celebration","purple-cap-winner"],{bowl:"Right-arm leg-break",retired:true,active:false,era:"golden-era",rarity:"uncommon",purpleCap:true,debutYear:2014}),
mk("Dwayne Smith","West Indies","all-rounder","Chennai Super Kings",["Mumbai Indians","Rajasthan Royals","Gujarat Lions"],["explosive-opener","csk-powerplay","big-hitter"],{bowl:"Right-arm medium-fast",retired:true,active:false,era:"golden-era",rarity:"rare",debutYear:2008}),
mk("Corey Anderson","New Zealand","all-rounder","Mumbai Indians",["Delhi Capitals","Rajasthan Royals"],["fastest-odi-century","left-handed-allrounder","power-hitter"],{bat:"Left",bowl:"Left-arm medium-fast",retired:true,active:false,era:"golden-era",rarity:"rare",debutYear:2014}),
mk("Ben Stokes","England","all-rounder","Rajasthan Royals",["Rising Pune Supergiant","Chennai Super Kings","Lucknow Super Giants"],["match-winner","most-expensive-buy","allrounder","aggressive-batting","english-allrounder"],{bat:"Left",bowl:"Right-arm fast-medium",retired:true,active:false,era:"golden-era",rarity:"uncommon",debutYear:2017}),
mk("Ben Duckett","England","batsman","Rajasthan Royals",[],["left-handed-opener","english-batter","aggressive-scorer"],{bat:"Left",era:"modern-era",active:true,retired:false,rarity:"rare",debutYear:2025}),
// === MODERN MISSING ===
mk("Ayush Mhatre","India","batsman","Chennai Super Kings",[],["young-talent","domestic-prodigy","aggressive-batter","uncapped"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Jake Fraser-McGurk","Australia","batsman","Delhi Capitals",[],["explosive-youngster","australian-prospect","six-hitter","aggressive-opener"],{era:"modern-era",active:true,retired:false,rarity:"rare",debutYear:2024}),
mk("Arshin Kulkarni","India","all-rounder","Lucknow Super Giants",[],["young-allrounder","domestic-talent","batting-allrounder"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Finn Allen","New Zealand","batsman","Kolkata Knight Riders",[],["explosive-opener","nz-power-hitter","wicketkeeper","overseas-youngster"],{era:"modern-era",active:true,retired:false,rarity:"rare",debutYear:2024}),
mk("Josh Inglis","Australia","wicket-keeper","Gujarat Titans",[],["australian-keeper","aggressive-batting","versatile-keeper"],{era:"modern-era",active:true,retired:false,rarity:"rare",debutYear:2025}),
mk("Spencer Johnson","Australia","bowler","Gujarat Titans",[],["left-arm-pacer","australian-quick","death-bowling","express-pace"],{bowl:"Left-arm fast",bat:"Left",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2024}),
mk("Matt Henry","New Zealand","bowler","Chennai Super Kings",[],["nz-seamer","swing-bowler","new-ball-specialist","experienced-international"],{bowl:"Right-arm fast-medium",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2025}),
mk("Akeal Hosein","West Indies","bowler","Chennai Super Kings",[],["left-arm-spinner","windies-spinner","powerplay-spinner","economical"],{bowl:"Slow left-arm orthodox",bat:"Left",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2025}),
mk("Jordan Cox","England","wicket-keeper","Royal Challengers Bengaluru",[],["english-keeper","versatile-batter","young-talent"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Jack Edwards","Australia","all-rounder","Sunrisers Hyderabad",[],["australian-allrounder","batting-allrounder","young-talent"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Aniket Verma","India","batsman","Sunrisers Hyderabad",[],["domestic-talent","young-batter","uncapped-indian"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Shubham Dubey","India","batsman","Rajasthan Royals",[],["domestic-batter","young-talent","middle-order"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2024}),
mk("Himmat Singh","India","batsman","Lucknow Super Giants",[],["delhi-domestic","middle-order","aggressive-batter"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Priyansh Arya","India","batsman","Punjab Kings",[],["domestic-talent","aggressive-batter","power-hitter"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Mohit Sharma","India","bowler","Gujarat Titans",["Chennai Super Kings","Delhi Capitals","Kings XI Punjab"],["medium-pacer","csk-pacer","death-bowler","experienced-seamer"],{bowl:"Right-arm medium-fast",active:true,retired:false,era:"golden-era",rarity:"rare",debutYear:2013}),
mk("Naveen-ul-Haq","Afghanistan","bowler","Lucknow Super Giants",[],["afghan-pacer","fast-bowler","aggressive-quick","lsg-spearhead"],{bowl:"Right-arm fast-medium",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2023}),
mk("Mohammed Shami","India","bowler","Lucknow Super Giants",["Delhi Capitals","Kings XI Punjab","Gujarat Titans"],["seam-bowling","wicket-taker","test-match-bowler","gt-champion","death-bowling"],{bowl:"Right-arm fast-medium",active:true,retired:false,iconic:true,era:"golden-era",rarity:"uncommon",debutYear:2013}),
mk("Danish Malewar","India","batsman","Mumbai Indians",[],["young-opener","domestic-talent","uncapped-indian"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("Raj Angad Bawa","India","all-rounder","Mumbai Indians",["Punjab Kings"],["u19-world-cup","young-allrounder","tall-allrounder"],{bowl:"Right-arm medium",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2022}),
mk("Zak Foulkes","New Zealand","bowler","Chennai Super Kings",[],["nz-pacer","young-seamer","death-bowler"],{bowl:"Right-arm fast-medium",active:true,retired:false,era:"modern-era",rarity:"legendary",debutYear:2025}),
mk("Matthew Short","Australia","all-rounder","Chennai Super Kings",[],["australian-allrounder","aggressive-opener","off-spinner"],{bowl:"Right-arm off-break",active:true,retired:false,era:"modern-era",rarity:"rare",debutYear:2025}),
mk("Aman Khan","India","all-rounder","Chennai Super Kings",[],["domestic-allrounder","young-talent","middle-order"],{era:"modern-era",active:true,retired:false,rarity:"legendary",debutYear:2025}),
mk("T Natarajan","India","bowler","Sunrisers Hyderabad",[],["yorker-specialist","left-arm-pacer","srh-death-bowler","net-bowler-to-star"],{bowl:"Left-arm fast-medium",bat:"Left",active:true,retired:false,era:"modern-era",rarity:"uncommon",debutYear:2017}),
mk("KL Rahul","India","batsman","Delhi Capitals",["Royal Challengers Bengaluru","Kings XI Punjab","Lucknow Super Giants"],["elegant-batsman","orange-cap-winner","keeper-captain","stylish-stroke-maker","anchor"],{orangeCap:true,captain:true,active:true,retired:false,iconic:true,era:"golden-era",rarity:"common",debutYear:2013}),
mk("Abishek Porel","India","wicket-keeper","Delhi Capitals",[],["young-keeper","domestic-talent","left-handed","aggressive-keeper"],{bat:"Left",era:"modern-era",active:true,retired:false,rarity:"rare",debutYear:2023}),
].filter(Boolean);

console.log(`Adding ${newPlayers.length} new players to database...`);
players.push(...newPlayers);

// Fix missing IDs for existing players
players.forEach(p => {
  if (!p.id || !p.canonicalPlayerId) {
    p.id = p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    p.canonicalPlayerId = p.id;
  }
});

fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
console.log(`Done. Total players: ${players.length}`);
