import type { CumulativeLengths, LengthProgress } from './types';

/**
 * Calculate progress along the curve in terms of segment index and length ratio.
 *
 * Length ratio is just progress along a specific segment measured as ratio
 * of current length to total length.
 * Calculating segment index and length ratio is useful because we want to
 * constrain the animation to have the inner and outer paths always be at the
 * same segment on any given frame.
 */
export function progressByLength( // progress within segment
    length: number,
    animationLengths: CumulativeLengths,
): LengthProgress {
    for (let i = 0; i < animationLengths.length; i++) {
        const segmentLengthMin = animationLengths[i][0];
        const segmentLengthMax = animationLengths[i].at(-1);
        if (segmentLengthMax === undefined) throw 'Length not found';
        if (length <= segmentLengthMax) {
            return {
                segmentIndex: i,
                lengthRatio:
                    (length - segmentLengthMin) /
                    (segmentLengthMax - segmentLengthMin),
            };
        }
    }
    throw 'Length argument longer than cumulative lengths';
}
