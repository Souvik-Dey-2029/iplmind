const fs = require('fs');

const squadsRaw = `
Chennai Super Kings (CSK)
Batters: Ruturaj Gaikwad (C - IND), Ayush Mhatre (IND), Sarfaraz Khan (IND), Dewald Brevis (SA), Aman Khan (IND)
Wicket-keepers: MS Dhoni (IND), Sanju Samson (IND), Kartik Sharma (IND), Urvil Patel (IND)
All-rounders: Shivam Dube (IND), Jamie Overton (ENG), Matthew Short (AUS), Zak Foulkes (NZ), Prashant Veer (IND)
Bowlers: Noor Ahmad (AFG), Khaleel Ahmed (IND), Matt Henry (NZ), Rahul Chahar (IND), Nathan Ellis (AUS), Akeal Hosein (WI) 
2. Mumbai Indians (MI)
Batters: Rohit Sharma (IND), Suryakumar Yadav (IND), Tilak Varma (IND), Sherfane Rutherford (WI), Danish Malewar (IND)
Wicket-keepers: Quinton de Kock (SA), Ryan Rickelton (SA), Robin Minz (IND)
All-rounders: Hardik Pandya (C - IND), Will Jacks (ENG), Mitchell Santner (NZ), Shardul Thakur (IND), Raj Angad Bawa (IND)
Bowlers: Jasprit Bumrah (IND), Trent Boult (NZ), Deepak Chahar (IND), Allah Ghazanfar (AFG), Mayank Markande (IND) 
3. Royal Challengers Bengaluru (RCB)
Batters: Virat Kohli (IND), Rajat Patidar (C - IND), Devdutt Padikkal (IND), Tim David (AUS)
Wicket-keepers: Phil Salt (ENG), Jitesh Sharma (IND), Jordan Cox (ENG)
All-rounders: Krunal Pandya (IND), Jacob Bethell (ENG), Romario Shepherd (WI), Swapnil Singh (IND)
Bowlers: Josh Hazlewood (AUS), Bhuvneshwar Kumar (IND), Yash Dayal (IND), Nuwan Thushara (SL), Rasikh Salam (IND) 
4. Sunrisers Hyderabad (SRH) 
Batters: Travis Head (AUS), Abhishek Sharma (IND), Aiden Markram (SA), Aniket Verma (IND)
Wicket-keepers: Heinrich Klaasen (SA), Ishan Kishan (IND)
All-rounders: Liam Livingstone (ENG), Nitish Kumar Reddy (IND), Jack Edwards (AUS)
Bowlers: Pat Cummins (C - AUS), Harshal Patel (IND), Rashid Khan (AFG), Jaydev Unadkat (IND), T. Natarajan (IND) 
5. Rajasthan Royals (RR)
Batters: Yashasvi Jaiswal (IND), Shimron Hetmyer (WI), Shubham Dubey (IND)
Wicket-keepers: Jos Buttler (ENG), Dhruv Jurel (IND)
All-rounders: Riyan Parag (C - IND), Ravindra Jadeja (IND), Washington Sundar (IND), Marcus Stoinis (AUS)
Bowlers: Jofra Archer (ENG), Ravi Bishnoi (IND), Prasidh Krishna (IND), Sandeep Sharma (IND), Maheesh Theekshana (SL) 
6. Kolkata Knight Riders (KKR)
Batters: Rinku Singh (IND), Ajinkya Rahane (C - IND), Angkrish Raghuvanshi (IND), Manish Pandey (IND)
Wicket-keepers: Finn Allen (NZ), Tim Seifert (NZ)
All-rounders: Andre Russell (WI), Sunil Narine (WI), Cameron Green (AUS), Ramandeep Singh (IND)
Bowlers: Varun Chakaravarthy (IND), Harshit Rana (IND), Matheesha Pathirana (SL), Mitchell Starc (AUS), Umran Malik (IND) 
7. Gujarat Titans (GT) 
Batters: Shubman Gill (C - IND), Sai Sudharsan (IND), Shahrukh Khan (IND), Kane Williamson (NZ)
Wicket-keepers: Anuj Rawat (IND), Josh Inglis (AUS)
All-rounders: Rahul Tewatia (IND), Glenn Phillips (NZ)
Bowlers: Kagiso Rabada (SA), Mohammed Siraj (IND), Rashid Khan (AFG), Mohit Sharma (IND), Spencer Johnson (AUS) 
8. Delhi Capitals (DC) 
Batters: KL Rahul (IND), Jake Fraser-McGurk (AUS), David Warner (AUS), Prithvi Shaw (IND)
Wicket-keepers: Rishabh Pant (C - IND), Abishek Porel (IND)
All-rounders: Axar Patel (IND), Mitchell Marsh (AUS)
Bowlers: Kuldeep Yadav (IND), Mukesh Kumar (IND), Anrich Nortje (SA), Khaleel Ahmed (IND) 
9. Lucknow Super Giants (LSG) 
Batters: Ayush Badoni (IND), Himmat Singh (IND), Devdutt Padikkal (IND)
Wicket-keepers: Nicholas Pooran (WI), Rishabh Pant (C - IND)
All-rounders: Shahbaz Ahmed (IND), Arshin Kulkarni (IND)
Bowlers: Mohammed Shami (IND), Mayank Yadav (IND), Mohsin Khan (IND), Ravi Bishnoi (IND), Naveen-ul-Haq (AFG) 
10. Punjab Kings (PBKS)
Batters: Shreyas Iyer (C - IND), Nehal Wadhera (IND), Priyansh Arya (IND)
Wicket-keepers: Prabhsimran Singh (IND), Jitesh Sharma (IND)
All-rounders: Sam Curran (ENG), Marco Jansen (SA), Shashank Singh (IND)
Bowlers: Arshdeep Singh (IND), Harpreet Brar (IND), Kagiso Rabada (SA)
`;

function extractPlayersFromText(text) {
  const players = [];
  const lines = text.split('\n');
  let currentTeam = "";
  
  lines.forEach(line => {
    if (line.match(/^\d*\.?\s*([A-Za-z\s]+)\s*\([A-Z]+\)$/) || line.match(/^[A-Za-z\s]+ \([A-Z]+\)$/)) {
      currentTeam = line.split('(')[0].replace(/^\d*\.?\s*/, '').trim();
    } else if (line.includes(':')) {
      const parts = line.split(':');
      const role = parts[0].trim();
      const playersList = parts[1].split(',');
      playersList.forEach(p => {
        let name = p.trim().replace(/\s*\(.*?\)/, ''); // Remove (C - IND)
        if (name) {
          players.push({ name, team: currentTeam, role });
        }
      });
    }
  });
  return players;
}

const squadPlayers = extractPlayersFromText(squadsRaw);

const playersJson = JSON.parse(fs.readFileSync('./src/data/players.json', 'utf8'));
const playerMap = new Map();
const duplicates = [];

playersJson.forEach(p => {
  const normName = p.name.toLowerCase().trim();
  if (playerMap.has(normName)) {
    duplicates.push({ name: p.name, id1: playerMap.get(normName).id, id2: p.id });
  }
  playerMap.set(normName, p);
});

const missingPlayers = [];
const teamMismatches = [];

squadPlayers.forEach(sp => {
  const normName = sp.name.toLowerCase().trim();
  const dbPlayer = playerMap.get(normName);
  
  if (!dbPlayer) {
    missingPlayers.push(sp);
  } else {
    // Check team
    const dbTeam = dbPlayer.latestSeasonTeam || dbPlayer.currentTeam || "";
    if (dbTeam.toLowerCase() !== sp.team.toLowerCase() && !dbPlayer.teams?.includes(sp.team)) {
      teamMismatches.push({ name: sp.name, dbTeam, squadTeam: sp.team });
    }
  }
});

console.log("=== DATASET AUDIT REPORT ===");
console.log(`Total Squad Players: ${squadPlayers.length}`);
console.log(`Total Database Players: ${playersJson.length}`);
console.log(`\nDuplicates in DB: ${duplicates.length}`);
console.log(duplicates);
console.log(`\nMissing Players (${missingPlayers.length}):`);
console.log(missingPlayers.map(p => p.name));
console.log(`\nTeam Mismatches (${teamMismatches.length}):`);
console.log(teamMismatches.slice(0, 10));

