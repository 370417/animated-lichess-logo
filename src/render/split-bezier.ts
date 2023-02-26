import { Matrix4, Vector4 } from './linear-algebra';

const bezierCoefficients = new Matrix4(
    1,
    -3,
    3,
    -1,
    0,
    3,
    -6,
    3,
    0,
    0,
    3,
    -3,
    0,
    0,
    0,
    1,
);

const invBezierCoefficients = Matrix4.inverted(bezierCoefficients);

/**
 * Create a matrix that can split a bezier curve at a value z.
 */
// In dart, can use cascade operator `..`
export function createSplitMatrix(z: number): Matrix4 {
    const zz = z * z;
    const zzz = zz * z;
    const zMatrix = Matrix4.zero();
    zMatrix.setDiagonal(new Vector4(1, z, zz, zzz));
    const matrix = invBezierCoefficients.clone();
    return matrix.multiplied(zMatrix).multiplied(bezierCoefficients);
    // matrix.multiply(bezierCoefficients);
    // return matrix;
}
