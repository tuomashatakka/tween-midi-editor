// How hard to pull the audio clock toward an external one. Kept pure and
// separate from the follower because the two failure modes are different:
// the follower gets tempo wrong, this gets phase wrong.

export interface CorrectionOptions {

  /** Beyond this error, nudging is hopeless and we relocate outright. */
  hardResyncSec: number

  /** Fraction of the remaining error removed per correction. */
  gain: number
}

export const DEFAULT_CORRECTION: CorrectionOptions = {
  // ~1/32 note at 120bpm: small enough to be a glitch, large enough that
  // ordinary jitter never trips it.
  hardResyncSec: 0.05,
  gain:          0.1,
}

export interface CorrectionResult {
  anchorSec: number

  /** True when the caller should relocate rather than nudge. */
  hard: boolean
}

/**
 * Next anchor for the audio clock. `errorSec` is externalTime - engineTime for
 * the same musical position: positive means the engine is running early.
 *
 * Below the threshold this is first-order feedback, so phase converges over a
 * few corrections without any audible jump. Above it, the caller does a hard
 * relocate — the same discontinuity a loop wrap already produces.
 */
export const nextAnchor = (
  currentAnchorSec: number,
  errorSec: number,
  options: CorrectionOptions = DEFAULT_CORRECTION,
): CorrectionResult => {
  if (Math.abs(errorSec) > options.hardResyncSec)
    return { anchorSec: currentAnchorSec, hard: true }

  return { anchorSec: currentAnchorSec + options.gain * errorSec, hard: false }
}
