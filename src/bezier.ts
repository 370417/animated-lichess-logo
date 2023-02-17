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
