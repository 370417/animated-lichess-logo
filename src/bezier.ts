export function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/**
 * De Casteljau's algorithm but for a list of scalars instead of a list of points.
 * Does not mutate input array.
 */
export function deCasteljau(points: number[], t: number): number {
    const buffer = points.slice();
    for (let length = buffer.length; length > 1; length--) {
        for (let i = 0; i + 1 < length; i++) {
            buffer[i] = lerp(buffer[i], buffer[i + 1], t);
        }
    }
    return buffer[0];
}

/** Array of x coordinates and array of y coordinates */
export type Points = {
    xs: number[];
    ys: number[];
};

/**
 * Approximate a path with lines.
 * If the input is a bezier, number of output lines is iterations plus one.
 * If the input already is a line, output is a single line.
 */
export function flatten(segmentData: SegmentData, iterations: number): Points {
    const [move, draw] = segmentData;
    if (draw.type === 'L') {
        // Already flat
        let xs = [move.values[0], draw.values[0]];
        let ys = [move.values[1], draw.values[1]];
        return { xs, ys };
    } else {
        let curveXs = [
            move.values[0],
            draw.values[0],
            draw.values[2],
            draw.values[4],
        ];
        let curveYs = [
            move.values[1],
            draw.values[1],
            draw.values[3],
            draw.values[5],
        ];
        let xs = [];
        let ys = [];
        // Add one because with 0 iterations there are still 2 points to make a flat line
        const maxI = iterations + 1;
        for (let i = 0; i <= maxI; i++) {
            xs.push(deCasteljau(curveXs, i / maxI));
            ys.push(deCasteljau(curveYs, i / maxI));
        }
        return { xs, ys };
    }
}

export function flatten2(pathData: PathData[], iterations: number): Points {
    if (pathData.length < 2) throw 'Path data too short';
    const head = pathData[0];
    if (head.type !== 'M') throw 'Path does not start with move';
    let [x, y] = head.values;
    let xs: number[] = [x];
    let ys: number[] = [y];
    for (let segmentI = 1; segmentI < pathData.length; segmentI++) {
        const segment = pathData[segmentI];
        if (segment.type == 'L') {
            xs.push(segment.values[0]);
            ys.push(segment.values[1]);
        } else if (segment.type == 'C') {
            let curveXs = [
                x,
                segment.values[0],
                segment.values[2],
                segment.values[4],
            ];
            let curveYs = [
                y,
                segment.values[1],
                segment.values[3],
                segment.values[5],
            ];
            // Add one because with 0 iterations there are still 2 points to make a flat line
            const maxI = iterations + 1;
            for (let i = 1; i <= maxI; i++) {
                xs.push(deCasteljau(curveXs, i / maxI));
                ys.push(deCasteljau(curveYs, i / maxI));
            }
        } else {
            throw 'Unsupported path type';
        }
    }
    return { xs, ys };
}

export function distance(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): number {
    return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
}

export function cumulativeLength(points: Points[]): number[][] {
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

export function limitByLength(
    points: Points[],
    lengths: number[][],
    currLength: number,
    doLerp: boolean,
) {
    return points.map((points, i) => {
        const filtered: Points = { xs: [], ys: [] };
        for (let j = 0; j < points.xs.length; j++) {
            if (lengths[i][j] <= currLength) {
                filtered.xs.push(points.xs[j]);
                filtered.ys.push(points.ys[j]);
            } else if (doLerp && j > 0) {
                const danglingLength = currLength - lengths[i][j - 1];
                const segmentLength = lengths[i][j] - lengths[i][j - 1];
                const t = danglingLength / segmentLength;
                filtered.xs.push(lerp(points.xs[j - 1], points.xs[j], t));
                filtered.ys.push(lerp(points.ys[j - 1], points.ys[j], t));
                break;
            } else {
                break;
            }
        }
        return filtered;
    });
}

export function getCurrentSegmentIndex(points: Points[]): number {
    const firstEmptySegmentIndex = points.findIndex((p) => p.xs.length < 2);
    if (firstEmptySegmentIndex === -1) return points.length - 1;
    else return firstEmptySegmentIndex - 1;
}

export function getLatestPoint(
    points: Points[],
): { x: number; y: number } | undefined {
    const currentSegmentIndex = getCurrentSegmentIndex(points);
    if (currentSegmentIndex < 0) return;
    const { xs, ys } = points[currentSegmentIndex];
    return {
        x: xs.at(-1)!,
        y: ys.at(-1)!,
    };
}

export function getNormal(
    points: Points[],
): { dx: number; dy: number } | undefined {
    const currentSegmentIndex = getCurrentSegmentIndex(points);
    if (currentSegmentIndex < 0) return;
    const { xs, ys } = points[currentSegmentIndex];
    const dx = xs.at(-1)! - xs.at(-2)!;
    const dy = ys.at(-1)! - ys.at(-2)!;
    const length = distance(dx, dy, 0, 0);
    return {
        dx: -dy / length,
        dy: dx / length,
    };
}

/**
 * Find the intersection between two lines defined as:
 * line A through [x1, y1] and [x2, y2]
 * line B through [x3, y3] nad [x4, y4]
 */
// https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
export function lineLineItersection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
): [number, number] | undefined {
    const xNumerator =
        (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4);
    const yNumerator =
        (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4);
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return;
    else return [xNumerator / denominator, yNumerator / denominator];
}

export function dotProduct(
    v1: readonly [number, number],
    v2: readonly [number, number],
): number {
    return v1[0] * v2[0] + v1[1] * v2[1];
}

/**
 * Find the closest intersection between a ray and a line:
 * ray starts at [x1, y1] and goes through [x2, y2]
 * line goes through [x3, y3] and [x4, y4]
 */
export function rayLineIntersection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
): [number, number] | undefined {
    // Intersection if the ray was a line
    const lineIntersection = lineLineItersection(
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        x4,
        y4,
    );
    if (!lineIntersection) return;
    const rayVector = [x2 - x1, y2 - y1] as const;
    const rayOriginToIntersection = [
        lineIntersection[0] - x1,
        lineIntersection[1] - y1,
    ] as const;
    // Only return the intersection if the ray is pointing at it
    if (dotProduct(rayVector, rayOriginToIntersection) > 0) {
        return lineIntersection;
    } else {
        return undefined;
    }
}
