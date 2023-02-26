/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/** Returns the t for which lerp(min, max, t) === middle */
export function inverseLerp(min: number, max: number, middle: number): number {
    return (middle - min) / (max - min);
}
