import { tangentVec } from './tangent';
import type { SegmentData, SegmentPoints } from './types';

export function projectPointsToBezier(
    originalPoints: SegmentPoints[],
    targetPoints: SegmentPoints[],
    targetData: SegmentData[],
): SegmentPoints[] {
    const projectedPoints: SegmentPoints[] = [];
    for (let i = 0; i < originalPoints.length; i++) {
        const projected: SegmentPoints = {
            ...originalPoints[i],
            xs: [],
            ys: [],
        };
        debugger;
        for (let j = 0; j < originalPoints[i].xs.length; j++) {
            const originalX = originalPoints[i].xs[j];
            const originalY = originalPoints[i].ys[j];
            const [projectedX, projectedY] = projectPointToBezier(
                [originalX, originalY],
                targetPoints[i],
                targetData[i],
            );
            projected.xs.push(projectedX);
            projected.ys.push(projectedY);
        }
        projectedPoints.push(projected);
    }
    return projectedPoints;
}

/**
 * For a given point R, find the closest point to R on a segment of bezier curves
 * extended by the tangent rays at the start and end of the segment.
 */
export function projectPointToBezier(
    referencePoint: [number, number],
    segmentPoints: SegmentPoints,
    segmentData: SegmentData,
): [number, number] {
    // Find closest point of sampled segment points
    let closestCurveI = -1;
    let closestPointI = -1;
    let smallestSquareDistance = Infinity;
    for (let i = 0; i < segmentPoints.xs.length; i++) {
        const dx = referencePoint[0] - segmentPoints.xs[i];
        const dy = referencePoint[1] - segmentPoints.ys[i];
        const squareDistance = dx * dx + dy * dy;
        if (squareDistance < smallestSquareDistance) {
            smallestSquareDistance = squareDistance;
            closestCurveI = segmentPoints.curveIndices[i];
            closestPointI = i;
        }
    }

    // Approximate the true closest point on the curve by taking the tangent
    // at the closest sampled point and projecting the reference point
    // onto the tangent.
    // The main benefit of this approximation is that it satisfies the
    // requirement of including the tangent rays at the start and end of
    // the bezier curves when calculating the closest point.
    // A better approximation for points on the curve itself would be binary
    // search between the two sampled points that the true closest point lies
    // between, but the complexity is not worth it here, as we can just increase
    // the amount of sampled points to compensate for a less accurate
    // approximation technique.

    const closestSampled = [
        segmentPoints.xs[closestPointI],
        segmentPoints.ys[closestPointI],
    ] as const;
    const closestSampledT = segmentPoints.ts[closestPointI];
    const bezierXs = segmentData.xPoints[closestCurveI];
    const bezierYs = segmentData.yPoints[closestCurveI];

    // R = reference point
    // S = sampled point
    // X = approx closest point

    const vecTangent = tangentVec(closestSampledT, bezierXs, bezierYs);
    const vecNormal = [-vecTangent[1], vecTangent[0]] as const;
    const vecRS = minus(closestSampled, referencePoint);
    const vecRX = projectVector(vecRS, vecNormal);
    return plus(referencePoint, vecRX);
}

/** Project a onto b. */
function projectVector(
    a: readonly [number, number],
    b: readonly [number, number],
): [number, number] {
    return scale(dotProduct(a, b) / dotProduct(b, b), b);
}

function dotProduct(
    [a1, a2]: readonly [number, number],
    [b1, b2]: readonly [number, number],
): number {
    return a1 * b1 + a2 * b2;
}

function plus(
    [a1, a2]: readonly [number, number],
    [b1, b2]: readonly [number, number],
): [number, number] {
    return [a1 + b1, a2 + b2];
}

function minus(
    [a1, a2]: readonly [number, number],
    [b1, b2]: readonly [number, number],
): [number, number] {
    return [a1 - b1, a2 - b2];
}

/** Multiply a vector by a scalar. */
function scale(n: number, [x, y]: readonly [number, number]): [number, number] {
    return [n * x, n * y];
}
