import type { AnimationData } from './build';
import { Vector4 } from './render/linear-algebra';
import { createSplitMatrix } from './render/split-bezier';

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

    ctx.clearRect(0, 0, 50, 50);

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(
        animationData.outerSegments[0].xPoints[0][0],
        animationData.outerSegments[0].yPoints[0][0],
    );
    for (let i = 0; i < segmentIndex; i++) {
        const { xPoints, yPoints } = animationData.outerSegments[i];
        for (let j = 0; j < xPoints.length; j++) {
            const [_x0, x1, x2, x3] = xPoints[j];
            const [_y0, y1, y2, y3] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
    }
    const currOuterSegment = animationData.outerSegments[segmentIndex];
    {
        const { xPoints, yPoints } = currOuterSegment;
        for (let j = 0; j < outerPathIndex; j++) {
            const [_x0, x1, x2, x3] = xPoints[j];
            const [_y0, y1, y2, y3] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
    }
    const outerXs = currOuterSegment.xPoints[outerPathIndex];
    const outerYs = currOuterSegment.yPoints[outerPathIndex];
    const outerSplitMatrix = createSplitMatrix(outerT);
    const newOuterXs = outerSplitMatrix.transform(new Vector4(...outerXs));
    const newOuterYs = outerSplitMatrix.transform(new Vector4(...outerYs));
    ctx.bezierCurveTo(
        newOuterXs._v4storage[1],
        newOuterYs._v4storage[1],
        newOuterXs._v4storage[2],
        newOuterYs._v4storage[2],
        newOuterXs._v4storage[3],
        newOuterYs._v4storage[3],
    );
    const currInnerSegment = animationData.innerSegments[segmentIndex];
    const innerXs = currInnerSegment.xPoints[innerPathIndex];
    const innerYs = currInnerSegment.yPoints[innerPathIndex];
    const innerSplitMatrix = createSplitMatrix(innerT);
    const newInnerXs = innerSplitMatrix.transform(new Vector4(...innerXs));
    const newInnerYs = innerSplitMatrix.transform(new Vector4(...innerYs));
    ctx.lineTo(newInnerXs._v4storage[3], newInnerYs._v4storage[3]);
    ctx.bezierCurveTo(
        newInnerXs._v4storage[2],
        newInnerYs._v4storage[2],
        newInnerXs._v4storage[1],
        newInnerYs._v4storage[1],
        newInnerXs._v4storage[0],
        newInnerYs._v4storage[0],
    );
    {
        const { xPoints, yPoints } = currInnerSegment;
        for (let j = innerPathIndex - 1; j >= 0; j--) {
            const [x0, x1, x2, _x3] = xPoints[j];
            const [y0, y1, y2, _y3] = yPoints[j];
            ctx.bezierCurveTo(x2, y2, x1, y1, x0, y0);
        }
    }
    for (let i = segmentIndex - 1; i >= 0; i--) {
        const { xPoints, yPoints } = animationData.innerSegments[i];
        for (let j = xPoints.length - 1; j >= 0; j--) {
            const [x0, x1, x2, _x3] = xPoints[j];
            const [y0, y1, y2, _y3] = yPoints[j];
            ctx.bezierCurveTo(x2, y2, x1, y1, x0, y0);
        }
    }

    ctx.closePath();

    ctx.fill();
    ctx.stroke();
}
