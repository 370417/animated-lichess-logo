import 'path-data-polyfill';
import { Matrix4, Vector4 } from './linear-algebra';

/** Text contents of an inkscape save file */
export type InkscapeSvg = string;

/** Paths that form a single smooth stroke. */
export type SegmentData = {
    xStart: number;
    yStart: number;
    /** [control point 1, control point 2, endpoint] */
    xPoints: [number, number, number][];
    /** [control point 1, control point 2, endpoint] */
    yPoints: [number, number, number][];
};

export type LogoData = {
    width: number;
    height: number;
    innerSegments: SegmentData[];
    outerSegments: SegmentData[];
    /** Path that the animation follows */
    animationSegments: SegmentData[];
};

export type SegmentPoints = {
    /** x coordinates */
    xs: number[];
    /** y coordinates */
    ys: number[];
    /** Parametric t value used to calculate this x and y coordinate */
    ts: number[];
    /**
     * Index of the curve that this point belongs to,
     * since segments can contain multiple curves.
     * For points that belong to two curves, the smaller index is stored.
     */
    curveIndices: number[];
};

/**
 * CumulativeLengths[i][j]:
 * Index i is for segment index.
 * Index j is for point index.
 */
export type CumulativeLengths = number[][];

/** Points to a point along an array of segments. */
export type LengthProgress = {
    segmentIndex: number;
    /**
     * Current progress along the segment by length divided by
     * total length of the segment.
     * Ranges from 0 to 1 inclusive.
     */
    lengthRatio: number;
};

/** Points to a point along an array of bezier curves */
export type DrawProgress = {
    /**
     * Different than LengthProgress's segmentIndex.
     * One segment can contain multiple curves.
     */
    curveIndex: number;
    /**
     * Parameter for drawing the bezier curve.
     * Ranges from 0 to 1 inclusive.
     */
    t: number;
};

export type AnimationData = {
    innerSegments: SegmentData[];
    outerSegments: SegmentData[];
    segmentIndexByFrame: number[];
    innerPathIndexByFrame: number[];
    outerPathIndexByFrame: number[];
    innerTByFrame: number[];
    outerTByFrame: number[];
};

export function fromInkscape(inkscapeFile: InkscapeSvg): LogoData {
    // First line isn't html, so remove it
    const svgText = inkscapeFile.replace(/<\?xml.*\?>\n/, '');
    // Avoid creating any text nodes when we parse this as html
    const svgNodeText = svgText.trim();

    const template = document.createElement('template');
    template.innerHTML = svgNodeText;
    const svg = template.content.firstChild as SVGElement;

    return parse(svg);
}

function parse(svg: SVGElement): LogoData {
    const pathDataByLabel = new Map<string, PathData[]>();

    for (let i = 0; i < svg.children.length; i++) {
        const child = svg.children[i] as SVGElement;
        const label = child.getAttribute('inkscape:label');

        if (label && child.nodeName === 'path') {
            const path = child as SVGPathElement;
            if (/^(?:inner|outer|anim)\d+$/.test(label)) {
                pathDataByLabel.set(
                    label,
                    path.getPathData({ normalize: true }),
                );
            }
        }
    }

    const innerSegments: SegmentData[] = [];
    const outerSegments: SegmentData[] = [];
    const animationSegments: SegmentData[] = [];
    for (let segmentIndex = 1; true; segmentIndex++) {
        const inner = pathDataByLabel.get('inner' + segmentIndex);
        const outer = pathDataByLabel.get('outer' + segmentIndex);
        const anim = pathDataByLabel.get('anim' + segmentIndex);
        if (!inner || !outer || !anim) break;
        innerSegments.push(pathsToSegment(inner));
        outerSegments.push(pathsToSegment(outer));
        animationSegments.push(pathsToSegment(anim));
    }

    return {
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
        innerSegments,
        outerSegments,
        animationSegments,
    };
}

function pathsToSegment(pathData: PathData[]): SegmentData {
    if (pathData.length < 2) throw 'Path data too short';
    const head = pathData[0];
    if (head.type !== 'M') throw 'Path does not start with move';
    const [xStart, yStart] = head.values;
    let lastX = xStart;
    let lastY = yStart;
    const xPoints: [number, number, number][] = [];
    const yPoints: [number, number, number][] = [];
    for (let i = 1; i < pathData.length; i++) {
        const path = pathData[i];
        if (path.type == 'L') {
            // Treat lines as bezier curves with control points
            // on the start and endpoints.
            const [x, y] = path.values;
            xPoints.push([lastX, x, x]);
            yPoints.push([lastY, y, y]);
            lastX = x;
            lastY = y;
        } else if (path.type === 'C') {
            const [x1, y1, x2, y2, x, y] = path.values;
            xPoints.push([x1, x2, x]);
            yPoints.push([y1, y2, y]);
            lastX = x;
            lastY = y;
        } else {
            throw 'Unsupported path type';
        }
    }
    return { xStart, yStart, xPoints, yPoints };
}

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
    let x = segment.xStart;
    let y = segment.yStart;
    const xs: number[] = [x];
    const ys: number[] = [y];
    const ts: number[] = [0];
    const curveIndices = [0];
    for (let i = 0; i < segment.xPoints.length; i++) {
        let curveXs = [
            x,
            segment.xPoints[i][0],
            segment.xPoints[i][1],
            segment.xPoints[i][2],
        ];
        let curveYs = [
            y,
            segment.yPoints[i][0],
            segment.yPoints[i][1],
            segment.yPoints[i][2],
        ];
        for (let j = 0; j <= iterations; j++) {
            const t = (j + 1) / (iterations + 1);
            xs.push(deCasteljau(curveXs, t));
            ys.push(deCasteljau(curveYs, t));
            ts.push(t);
            curveIndices.push(i);
        }
        x = segment.xPoints[i][2];
        y = segment.yPoints[i][2];
    }
    return { xs, ys, ts, curveIndices };
}

/**
 * De Casteljau's algorithm but for a list of scalars instead of a list of points.
 * Does not mutate input array.
 */
function deCasteljau(points: number[], t: number): number {
    const buffer = points.slice();
    for (let length = buffer.length; length > 1; length--) {
        for (let i = 0; i + 1 < length; i++) {
            buffer[i] = lerp(buffer[i], buffer[i + 1], t);
        }
    }
    return buffer[0];
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/** Returns the t for which lerp(min, max, t) === middle */
function inverseLerp(min: number, max: number, middle: number): number {
    return (middle - min) / (max - min);
}

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

export function distance(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): number {
    return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
}

export function lengthAtFrame(
    frame: number,
    maxFrame: number,
    animationLengths: CumulativeLengths,
): number {
    const totalLength = animationLengths.at(-1)?.at(-1);
    if (totalLength === undefined) throw 'Length not found';
    return (totalLength * frame) / maxFrame;
}

export function progressByLength(
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

export function progressByT(
    lenthProgress: LengthProgress,
    lengths: CumulativeLengths,
    segments: SegmentPoints[],
): DrawProgress {
    const { segmentIndex, lengthRatio } = lenthProgress;
    const segmentLengths = lengths[segmentIndex];

    // Scale length progress to fit these segments' dimensions
    const segmentLength = segmentLengths.at(-1)! - segmentLengths[0];
    const currentLength = segmentLengths[0] + lengthRatio * segmentLength;

    if (lengthRatio === 0) {
        return {
            curveIndex: segments[segmentIndex].curveIndices[0],
            t: 0,
        };
    } else if (lengthRatio === 1) {
        return {
            curveIndex: segments[segmentIndex].curveIndices.at(-1)!,
            t: 1,
        };
    }

    const [smallerI, largerI] = binarySearch(currentLength, segmentLengths);
    if (largerI >= segmentLengths.length) throw 'length larger than expected';
    if (smallerI < 0) throw 'length smaller than expected';
    const fractionalIndex = inverseLerp(
        segmentLengths[smallerI],
        segmentLengths[largerI],
        currentLength,
    );
    if (fractionalIndex < 0 || fractionalIndex >= 1) {
        throw 'unexpected fractional index';
    }
    const ts = segments[segmentIndex].ts;

    let smallerT = ts[smallerI];
    const largerT = ts[largerI];
    if (smallerT > largerT) {
        // Edge case: if largerI is the first index of a new curve,
        // ts[smallerI] will be 1 because it is from the perspective
        // of the previous curve. We need it to be from the perspective
        // of the current curve, so it should be 0 instead of 1.
        smallerT = 0;
    }

    return {
        // Use largerI instead of smallerI because if
        // curveIndices[largerI] != curveIndices[smallerI],
        // that means smallerI is the index of an endpoint shared between
        // two curves, and curveIndices[smallerI] will be the smaller index
        // of the two possibilities. Since our value is larger than
        // the length at smallerI, we want the larger index.
        curveIndex: segments[segmentIndex].curveIndices[largerI],
        t: lerp(smallerT, largerT, fractionalIndex),
    };
}

/**
 * For a sorted array, returns an index i such that
 * array[i - 1] < value < array[i].
 */
function binarySearch(value: number, array: number[]): [number, number] {
    let high = array.length;
    let low = -1;
    while (1 + low < high) {
        const mid = low + ((high - low) >> 1);
        if (value < array[mid]) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return [high - 1, high];
}

export function createAnimationData(
    logoData: LogoData,
    numFrames: number,
    animationLengths: CumulativeLengths,
    innerLengths: CumulativeLengths,
    outerLengths: CumulativeLengths,
    innerPoints: SegmentPoints[],
    outerPoints: SegmentPoints[],
): AnimationData {
    const innerData = animationData(
        logoData.innerSegments,
        animationLengths,
        innerLengths,
        innerPoints,
        numFrames,
    );
    const outerData = animationData(
        logoData.outerSegments,
        animationLengths,
        outerLengths,
        outerPoints,
        numFrames,
    );
    const { segmentIndexByFrame } = innerData;
    return {
        innerSegments: innerData.segments,
        outerSegments: outerData.segments,
        segmentIndexByFrame,
        innerPathIndexByFrame: innerData.curveIndexByFrame,
        outerPathIndexByFrame: outerData.curveIndexByFrame,
        innerTByFrame: innerData.tByFrame,
        outerTByFrame: outerData.tByFrame,
    };
}

function animationData(
    segments: SegmentData[],
    animationLengths: CumulativeLengths,
    pathLengths: CumulativeLengths,
    points: SegmentPoints[],
    numFrames: number,
) {
    const curveIndexByFrame: number[] = [];
    const segmentIndexByFrame: number[] = [];
    const tByFrame: number[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
        const length = lengthAtFrame(frame, numFrames - 1, animationLengths);
        const lengthProgress = progressByLength(length, animationLengths);
        const progress = progressByT(lengthProgress, pathLengths, points);
        curveIndexByFrame.push(progress.curveIndex);
        segmentIndexByFrame.push(lengthProgress.segmentIndex);
        // bookmark
        tByFrame.push(progress.t);
    }

    return {
        segments,
        curveIndexByFrame,
        segmentIndexByFrame,
        tByFrame,
    };
}

export function drawAnimationFrame(
    animationData: AnimationData,
    frame: number,
    ctx: CanvasRenderingContext2D,
) {
    const segmentIndex = animationData.segmentIndexByFrame[frame];
    const innerPathIndex = animationData.innerPathIndexByFrame[frame];
    const outerPathIndex = animationData.outerPathIndexByFrame[frame];
    const innerT = animationData.innerTByFrame[frame];
    const outerT = animationData.outerTByFrame[frame];

    console.log(frame, segmentIndex, outerPathIndex, outerT);

    ctx.clearRect(0, 0, 50, 50);

    // outer first
    // draw full paths
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    const { xStart, yStart } = animationData.outerSegments[0];
    let lastX = xStart;
    let lastY = yStart;
    ctx.moveTo(xStart, yStart);
    for (let i = 0; i < segmentIndex; i++) {
        const { xPoints, yPoints } = animationData.outerSegments[i];
        for (let j = 0; j < xPoints.length; j++) {
            const [x1, x2, x] = xPoints[j];
            const [y1, y2, y] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
            lastX = x;
            lastY = y;
        }
    }
    const currOuterSegment = animationData.outerSegments[segmentIndex];
    for (let i = 0; i < outerPathIndex; i++) {
        const { xPoints, yPoints } = currOuterSegment;
        for (let j = 0; j <= i; j++) {
            const [x1, x2, x] = xPoints[j];
            const [y1, y2, y] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
            lastX = x;
            lastY = y;
        }
    }
    const outerXs = currOuterSegment.xPoints[outerPathIndex];
    const outerYs = currOuterSegment.yPoints[outerPathIndex];
    createSplitMatrix(outerT);
    const minusT = 1 - outerT;
    const directMatrix = new Matrix4(
        1,
        minusT,
        minusT * minusT,
        minusT * minusT * minusT,
        0,
        outerT,
        2 * minusT * outerT,
        3 * minusT * minusT * outerT,
        0,
        0,
        outerT * outerT,
        3 * minusT * outerT * outerT,
        0,
        0,
        0,
        outerT * outerT * outerT,
    );
    const newOuterXs = directMatrix.transform(
        new Vector4(lastX, outerXs[0], outerXs[1], outerXs[2]),
    );
    const newOuterYs = directMatrix.transform(
        new Vector4(lastY, outerYs[0], outerYs[1], outerYs[2]),
    );
    ctx.bezierCurveTo(
        newOuterXs._v4storage[1],
        newOuterYs._v4storage[1],
        newOuterXs._v4storage[2],
        newOuterYs._v4storage[2],
        newOuterXs._v4storage[3],
        newOuterYs._v4storage[3],
    );

    ctx.stroke();
    // draw partial path

    // inner
    // draw partial path
    // draw partial paths
}

const bezierCoefficients = new Matrix4(
    1,
    0,
    0,
    0,
    -3,
    3,
    0,
    0,
    3,
    -6,
    3,
    0,
    -1,
    3,
    -3,
    1,
);

const invBezierCoefficients = Matrix4.inverted(bezierCoefficients);

/**
 * Create a matrix that can split a bezier curve at a value z.
 */
// In dart, can use cascade operator `..`
function createSplitMatrix(z: number): Matrix4 {
    const zz = z * z;
    const zzz = zz * z;
    const zMatrix = Matrix4.zero();
    zMatrix.setDiagonal(new Vector4(1, z, zz, zzz));
    const matrix = invBezierCoefficients.clone();
    return matrix.multiplied(zMatrix).multiplied(bezierCoefficients);
    // matrix.multiply(bezierCoefficients);
    // return matrix;
}
