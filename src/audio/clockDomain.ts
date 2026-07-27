// The editor lives in two clock domains and they must never be mixed by hand:
//
//   * AudioContext.currentTime — seconds, the audio thread's epoch. Everything
//     the scheduler does is expressed here.
//   * performance.now()        — milliseconds, the epoch MIDIOutput.send takes
//     for its timestamp. A future timestamp is honoured by the driver with
//     sub-millisecond accuracy, which is what lets MIDI output be jitter-free
//     even though the scheduler runs off a 25ms interval.
//
// A `ClockPair` is one simultaneous reading of both. The engine samples a fresh
// pair at the top of every lookahead pass, so the two clocks' relative drift is
// tracked for free. All conversion lives here.

export interface ClockPair {
  perfMs: number
  ctxSec: number
}

export const perfToCtx = (perfMs: number, pair: ClockPair): number =>
  pair.ctxSec + (perfMs - pair.perfMs) / 1000

export const ctxToPerf = (ctxSec: number, pair: ClockPair): number =>
  pair.perfMs + (ctxSec - pair.ctxSec) * 1000
