import { deCasteljau } from './bezier';
import type { SegmentData, SegmentPoints } from './types';

/**
 * Flatten a series of bezier curves into `iterations + 1` line segments
 * represented by `iterations + 2` points.
 */
export function flatten(
    segments: SegmentData[],
    iterations: number,
): SegmentPoints[] {
    return segments.map((segment) => flattenSegment(segment, iterations));
}

function flattenSegment(
    segment: SegmentData,
    iterations: number,
): SegmentPoints {
    const xs: number[] = [segment.xPoints[0][0]];
    const ys: number[] = [segment.yPoints[0][0]];
    const ts: number[] = [0];
    const curveIndices = [0];
    for (let i = 0; i < segment.xPoints.length; i++) {
        for (let j = 0; j <= iterations; j++) {
            const t = (j + 1) / (iterations + 1);
            xs.push(deCasteljau(segment.xPoints[i], t));
            ys.push(deCasteljau(segment.yPoints[i], t));
            ts.push(t);
            curveIndices.push(i);
        }
    }
    return { xs, ys, ts, curveIndices };
}
