/**
 * Sight-word pronunciation matching. Import this only from the server.
 * The dictionary is large and must not be bundled into the browser or the phone app.
 */
export {
  anySightAlternativeMatches,
  exactSightMatch,
  phoneticFallback,
  pronunciationDistance,
  sightHearingMatches,
} from "./sound.ts";
