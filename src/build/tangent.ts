/**
 * Returns a tangent vector for a t value on a bezier curve.
 *
 * Does not normalize the tangent vector's magnitude.
 */
export function tangentVec(
    t: number,
    bezierXs: [number, number, number, number],
    bezierYs: [number, number, number, number],
): [number, number] {
    if (t === 0 || t === 1) return endpointTangent(t, bezierXs, bezierYs);
    return [bezierDerivative(t, bezierXs), bezierDerivative(t, bezierYs)];
}

/**
 * Tangent of a bezier curve at t == 0 or 1.
 *
 * This function exists to handle an edge case:
 *
 * When t == 0 or 1, the mathematical formula for the derivative (used in
 * bezierDerivative) simplifies down to the difference between an endpoint and
 * its corresponding control point. In the edge case that those two points are
 * congruent, the resulting tangent will be 0/0.
 *
 * Throws an exception if all points of the bezier are the same.
 */
function endpointTangent(
    t: 0 | 1,
    xs: [number, number, number, number],
    ys: [number, number, number, number],
): [number, number] {
    if (t === 0) {
        for (let i = 1; i < 4; i++) {
            if (xs[i] !== xs[0] || ys[i] !== ys[0]) {
                return [xs[i] - xs[0], ys[i] - ys[0]];
            }
        }
    } else {
        for (let i = 2; i >= 0; i--) {
            if (xs[3] !== xs[i] || ys[3] !== ys[i]) {
                return [xs[3] - xs[i], ys[3] - ys[i]];
            }
        }
    }
    throw 'Cannot calculate tangent: all points are congruent';
}

/**
 * Does not at endpoints which are congruent to their corresponding control
 * point. See endpointTangent for that edge case.
 */
function bezierDerivative(
    t: number,
    [c0, c1, c2, c3]: [number, number, number, number],
): number {
    const s = 1 - t;
    return (
        3 * s * s * (c1 - c0) + 6 * s * t * (c2 - c1) + 3 * t * t * (c3 - c2)
    );
}
