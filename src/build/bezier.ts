import { lerp } from './interpolation';

/**
 * De Casteljau's algorithm but for a list of scalars instead of a list of points.
 * Does not mutate input array.
 */
export function deCasteljau(
    points: [number, number, number, number],
    t: number,
): number {
    const buffer = points.slice();
    for (let length = buffer.length; length > 1; length--) {
        for (let i = 0; i + 1 < length; i++) {
            buffer[i] = lerp(buffer[i], buffer[i + 1], t);
        }
    }
    return buffer[0];
}
