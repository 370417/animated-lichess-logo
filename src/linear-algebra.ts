export class Matrix4 {
    _m4storage: number[];

    // https://api.flutter.dev/flutter/vector_math/Matrix4/Matrix4.html
    constructor(
        arg0: number,
        arg1: number,
        arg2: number,
        arg3: number,
        arg4: number,
        arg5: number,
        arg6: number,
        arg7: number,
        arg8: number,
        arg9: number,
        arg10: number,
        arg11: number,
        arg12: number,
        arg13: number,
        arg14: number,
        arg15: number,
    ) {
        this._m4storage = [
            arg0,
            arg1,
            arg2,
            arg3,
            arg4,
            arg5,
            arg6,
            arg7,
            arg8,
            arg9,
            arg10,
            arg11,
            arg12,
            arg13,
            arg14,
            arg15,
        ];
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/Matrix4.zero.html
    static zero() {
        return new Matrix4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    clone() {
        const matrix = Matrix4.zero();
        matrix.setFrom(this);
        return matrix;
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/Matrix4.inverted.html
    static inverted(other: Matrix4) {
        const r = Matrix4.zero();
        const determinant = r.copyInverse(other);
        if (determinant == 0.0) {
            throw 'Matrix cannot be inverted';
        }
        return r;
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/copyInverse.html
    copyInverse(arg: Matrix4) {
        const argStorage = arg._m4storage;
        const a00 = argStorage[0];
        const a01 = argStorage[1];
        const a02 = argStorage[2];
        const a03 = argStorage[3];
        const a10 = argStorage[4];
        const a11 = argStorage[5];
        const a12 = argStorage[6];
        const a13 = argStorage[7];
        const a20 = argStorage[8];
        const a21 = argStorage[9];
        const a22 = argStorage[10];
        const a23 = argStorage[11];
        const a30 = argStorage[12];
        const a31 = argStorage[13];
        const a32 = argStorage[14];
        const a33 = argStorage[15];
        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;
        const det =
            b00 * b11 -
            b01 * b10 +
            b02 * b09 +
            b03 * b08 -
            b04 * b07 +
            b05 * b06;
        if (det == 0.0) {
            this.setFrom(arg);
            return 0.0;
        }
        const invDet = 1.0 / det;
        this._m4storage[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        this._m4storage[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        this._m4storage[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        this._m4storage[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        this._m4storage[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        this._m4storage[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        this._m4storage[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        this._m4storage[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        this._m4storage[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        this._m4storage[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        this._m4storage[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        this._m4storage[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        this._m4storage[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        this._m4storage[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        this._m4storage[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        this._m4storage[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
        return det;
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/setDiagonal.html
    setDiagonal(arg: Vector4) {
        const argStorage = arg._v4storage;
        this._m4storage[0] = argStorage[0];
        this._m4storage[5] = argStorage[1];
        this._m4storage[10] = argStorage[2];
        this._m4storage[15] = argStorage[3];
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/setFrom.html
    setFrom(arg: Matrix4) {
        const argStorage = arg._m4storage;
        this._m4storage[15] = argStorage[15];
        this._m4storage[14] = argStorage[14];
        this._m4storage[13] = argStorage[13];
        this._m4storage[12] = argStorage[12];
        this._m4storage[11] = argStorage[11];
        this._m4storage[10] = argStorage[10];
        this._m4storage[9] = argStorage[9];
        this._m4storage[8] = argStorage[8];
        this._m4storage[7] = argStorage[7];
        this._m4storage[6] = argStorage[6];
        this._m4storage[5] = argStorage[5];
        this._m4storage[4] = argStorage[4];
        this._m4storage[3] = argStorage[3];
        this._m4storage[2] = argStorage[2];
        this._m4storage[1] = argStorage[1];
        this._m4storage[0] = argStorage[0];
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/multiply.html
    multiply(arg: Matrix4) {
        const m00 = this._m4storage[0];
        const m01 = this._m4storage[4];
        const m02 = this._m4storage[8];
        const m03 = this._m4storage[12];
        const m10 = this._m4storage[1];
        const m11 = this._m4storage[5];
        const m12 = this._m4storage[9];
        const m13 = this._m4storage[13];
        const m20 = this._m4storage[2];
        const m21 = this._m4storage[6];
        const m22 = this._m4storage[10];
        const m23 = this._m4storage[14];
        const m30 = this._m4storage[3];
        const m31 = this._m4storage[7];
        const m32 = this._m4storage[11];
        const m33 = this._m4storage[15];
        const argStorage = arg._m4storage;
        const n00 = argStorage[0];
        const n01 = argStorage[4];
        const n02 = argStorage[8];
        const n03 = argStorage[12];
        const n10 = argStorage[1];
        const n11 = argStorage[5];
        const n12 = argStorage[9];
        const n13 = argStorage[13];
        const n20 = argStorage[2];
        const n21 = argStorage[6];
        const n22 = argStorage[10];
        const n23 = argStorage[14];
        const n30 = argStorage[3];
        const n31 = argStorage[7];
        const n32 = argStorage[11];
        const n33 = argStorage[15];
        this._m4storage[0] = m00 * n00 + m01 * n10 + m02 * n20 + m03 * n30;
        this._m4storage[4] = m00 * n01 + m01 * n11 + m02 * n21 + m03 * n31;
        this._m4storage[8] = m00 * n02 + m01 * n12 + m02 * n22 + m03 * n32;
        this._m4storage[12] = m00 * n03 + m01 * n13 + m02 * n23 + m03 * n33;
        this._m4storage[1] = m10 * n00 + m11 * n10 + m12 * n20 + m13 * n30;
        this._m4storage[5] = m10 * n01 + m11 * n11 + m12 * n21 + m13 * n31;
        this._m4storage[9] = m10 * n02 + m11 * n12 + m12 * n22 + m13 * n32;
        this._m4storage[13] = m10 * n03 + m11 * n13 + m12 * n23 + m13 * n33;
        this._m4storage[2] = m20 * n00 + m21 * n10 + m22 * n20 + m23 * n30;
        this._m4storage[6] = m20 * n01 + m21 * n11 + m22 * n21 + m23 * n31;
        this._m4storage[10] = m20 * n02 + m21 * n12 + m22 * n22 + m23 * n32;
        this._m4storage[14] = m20 * n03 + m21 * n13 + m22 * n23 + m23 * n33;
        this._m4storage[3] = m30 * n00 + m31 * n10 + m32 * n20 + m33 * n30;
        this._m4storage[7] = m30 * n01 + m31 * n11 + m32 * n21 + m33 * n31;
        this._m4storage[11] = m30 * n02 + m31 * n12 + m32 * n22 + m33 * n32;
        this._m4storage[15] = m30 * n03 + m31 * n13 + m32 * n23 + m33 * n33;
    }

    // https://api.flutter.dev/flutter/vector_math/Matrix4/multiplied.html
    multiplied(arg: Matrix4) {
        const result = Matrix4.zero();
        result.setFrom(this);
        result.multiply(arg);
        return result;
    }

    transform(arg: Vector4) {
        const argStorage = arg._v4storage;
        const x_ =
            this._m4storage[0] * argStorage[0] +
            this._m4storage[4] * argStorage[1] +
            this._m4storage[8] * argStorage[2] +
            this._m4storage[12] * argStorage[3];
        const y_ =
            this._m4storage[1] * argStorage[0] +
            this._m4storage[5] * argStorage[1] +
            this._m4storage[9] * argStorage[2] +
            this._m4storage[13] * argStorage[3];
        const z_ =
            this._m4storage[2] * argStorage[0] +
            this._m4storage[6] * argStorage[1] +
            this._m4storage[10] * argStorage[2] +
            this._m4storage[14] * argStorage[3];
        const w_ =
            this._m4storage[3] * argStorage[0] +
            this._m4storage[7] * argStorage[1] +
            this._m4storage[11] * argStorage[2] +
            this._m4storage[15] * argStorage[3];
        argStorage[0] = x_;
        argStorage[1] = y_;
        argStorage[2] = z_;
        argStorage[3] = w_;
        return arg;
    }
}

export class Vector4 {
    _v4storage: number[];

    // https://api.flutter.dev/flutter/vector_math/Vector4/Vector4.html
    constructor(x: number, y: number, z: number, w: number) {
        this._v4storage = [x, y, z, w];
    }
}
