import playerProfiles from "./players.json";
import { normalizePlayerProfiles } from "@/lib/playerNormalizer";

export const players = normalizePlayerProfiles(playerProfiles);
export default players;
