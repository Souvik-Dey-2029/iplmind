export type PlayerRole = "batsman" | "bowler" | "all-rounder" | "wicket-keeper" | "unknown";

export type BattingPosition = "" | "opener" | "top-middle" | "middle-lower" | "tail";

export type Trait =
  | "active"
  | "retired"
  | "overseas"
  | "wicketKeeper"
  | "opener"
  | "middleOrder"
  | "finisher"
  | "powerHitter"
  | "anchorBatter"
  | "spinner"
  | "pacer"
  | "deathBowler"
  | "captain"
  | "titleWinningCaptain"
  | "orangeCap"
  | "purpleCap"
  | "leftHanded"
  | "aggressive"
  | "defensive"
  | "mysterySpinner"
  | "famousForYorkers"
  | "playoffsHero"
  | "fanFavorite"
  | "iconic";

export interface Player {
  id: string;
  name: string;
  country: string;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  teams: string[];
  active: boolean;
  retired: boolean;
  overseas: boolean;
  wicketKeeper: boolean;
  opener: boolean;
  middleOrder: boolean;
  finisher: boolean;
  powerHitter: boolean;
  anchorBatter: boolean;
  spinner: boolean;
  pacer: boolean;
  deathBowler: boolean;
  captain: boolean;
  titleWinningCaptain: boolean;
  orangeCap: boolean;
  purpleCap: boolean;
  leftHanded: boolean;
  aggressive: boolean;
  defensive: boolean;
  mysterySpinner: boolean;
  famousForYorkers: boolean;
  playoffsHero: boolean;
  fanFavorite: boolean;
  iconic: boolean;
  battingPosition: BattingPosition;
  debutYear: number;
  titlesWon: number;
}

export interface Question {
  id: string;
  text: string;
  trait?: Trait;
  attribute?: keyof Player;
  expectedValue?: string | number | boolean;
  weight: number;
}

export interface CandidateScore {
  playerId: string;
  playerName: string;
  probability: number;
  score: number;
  matchedTraits: Trait[];
}
