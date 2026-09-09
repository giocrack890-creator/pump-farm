import {
  WEATHER_RAINBOW_FRACTION,
  WEATHER_STORM_FRACTION,
} from "@/lib/game/config"

/** Atmospheric farm state driven by real $FARM price action. */
export type WeatherState = "Sunny" | "Storming" | "RainbowBullSky"

/**
 * Map a rolling price-change fraction (e.g. `0.15` = +15%) to weather.
 * Rainbow Bull Sky aligns with the Golden Harvest pump threshold.
 *
 * Callers should pass normalized fractions (Dexscreener percents / 100).
 */
export function weatherFromPriceChange(changeFraction: number): WeatherState {
  if (!Number.isFinite(changeFraction)) {
    throw new Error("changeFraction must be a finite number")
  }
  if (changeFraction >= WEATHER_RAINBOW_FRACTION) return "RainbowBullSky"
  if (changeFraction <= WEATHER_STORM_FRACTION) return "Storming"
  return "Sunny"
}
