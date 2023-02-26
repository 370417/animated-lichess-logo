import { inverseLerp, lerp } from './interpolation';
import type {
    CumulativeLengths,
    DrawProgress,
    LengthProgress,
    SegmentPoints,
} from './types';

/**
 * Calculate progress along a single segment in terms of curve index and t.
 *
 * t is the parametric argument to a bezier curve, ranging from 0 to 1.
 * Curve index is not cumulative. It starts at 0 for each segment even if
 * the segment is not the first segment of the overall path.
 *
 * Length (even length ratio) is different from t, and the exact conversion
 * between the two is complicated, which is why we approximate curves to
 * calculate length.
 *
 * Length is needed to control the visual rate of animation progress.
 * We convert length to t to subdivide bezier curves.
 */
export function progressByT( // progress within curve
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
