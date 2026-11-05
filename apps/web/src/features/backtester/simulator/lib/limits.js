// Keep in sync with MAX_CELLS in shared/trading/monteCarlo.js.
export const MAX_CELLS = 200_000_000;
export const BYTES_PER_CELL = 4; // Float32 equity matrix
export const RUN_OPTIONS = [1000, 5000, 10000, 25000, 50000, 100000];
export const MIN_TRADES = 5;

export const cellsFor = (runs, trades) => runs * (trades + 1);
export const bytesFor = (runs, trades) => cellsFor(runs, trades) * BYTES_PER_CELL;
export const runsAllowed = (runs, trades) => cellsFor(runs, trades) <= MAX_CELLS;
