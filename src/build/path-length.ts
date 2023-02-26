import type { CumulativeLengths, SegmentPoints } from './types';

/** Calculate length from start to every point in segment points. */
export function cumulativeLength(points: SegmentPoints[]): CumulativeLengths {
    let length = 0;
    return points.map(({ xs, ys }) => {
        const lengths: number[] = [length];
        for (let i = 0; i + 1 < xs.length; i++) {
            length += distance(xs[i], ys[i], xs[i + 1], ys[i + 1]);
            lengths.push(length);
        }
        return lengths;
    });
}

function distance(x0: number, y0: number, x1: number, y1: number): number {
    return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
}
