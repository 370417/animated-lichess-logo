import { ProducerHandle } from '../state';
import { createTickerToggle } from '../ticker';

/**
 * Returns a function that can be called with a boolean to:
 * - turn a ticker on or off
 * - enable/disable a range input
 *
 * The intent of this function is to be used with a
 * play/pause button and a range input that both control
 * time. When the play button is pressed, a ticker should
 * run, and the range input should be disabled. When the
 * pause button is pressed, the ticker should be stopped,
 * and the range input should be enabled.
 */
export function toggleTickerAndRange(
    frame: ProducerHandle<number>,
    maxFrame: number,
    fps: number,
    rangeInputId: string,
) {
    const tickerToggle = createTickerToggle(frame, maxFrame, fps);
    const rangeInput = document.getElementById(rangeInputId) as
        | HTMLInputElement
        | undefined;
    return (play: boolean) => {
        tickerToggle(play);
        if (rangeInput && rangeInput.tagName === 'INPUT') {
            rangeInput.disabled = play;
        }
    };
}
