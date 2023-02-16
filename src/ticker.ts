// Global requestAnimationFrame loop that handles all tickers

import { get, ProducerHandle, set } from './state';

const tickers: Set<Ticker> = new Set();

function singleTick() {
    for (const ticker of tickers) {
        const deltaMs = performance.now() - ticker.lastFrameMs;
        const numFrames = Math.floor((deltaMs * ticker.fps) / 1000);
        if (numFrames > 0) {
            const newFrame = (get(ticker.frame)! + numFrames) % ticker.maxFrame;
            ticker.lastFrameMs = performance.now();
            set(ticker.frame, newFrame);
        }
    }
}

/** Start global ticker handler */
export function tick() {
    singleTick();
    requestAnimationFrame(tick);
}

export function addTicker(
    frame: ProducerHandle<number>,
    maxFrame: number,
    fps: number,
): Ticker {
    const ticker = {
        frame,
        maxFrame,
        fps,
        lastFrameMs: performance.now(),
    };
    tickers.add(ticker);
    return ticker;
}

export function removeTicker(ticker: Ticker): void {
    tickers.delete(ticker);
}

/**
 * Returns a function that can be called with a boolean
 * to turn a ticker on or off.
 */
export function createTickerToggle(
    frame: ProducerHandle<number>,
    maxFrame: number,
    fps: number,
): (on: boolean) => void {
    let ticker: Ticker | undefined = undefined;
    return (on: boolean) => {
        if (on && !ticker) {
            ticker = addTicker(frame, maxFrame, fps);
        } else if (!on && ticker) {
            removeTicker(ticker);
            ticker = undefined;
        }
    };
}

export type Ticker = {
    frame: ProducerHandle<number>;
    /** Frame should stay in the range [0, maxFrame) */
    maxFrame: number;
    fps: number;
    lastFrameMs: number;
};
