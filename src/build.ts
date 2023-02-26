import { progressByT } from './build/curve-progress';
import { progressByLength } from './build/segment-progress';
import type {
    AnimationData,
    CumulativeLengths,
    LogoData,
    SegmentData,
    SegmentPoints,
} from './build/types';

export type { AnimationData } from './build/types';

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
        tByFrame.push(progress.t);
    }

    return {
        segments,
        curveIndexByFrame,
        segmentIndexByFrame,
        tByFrame,
    };
}

/** Calculate what the length should be at a given frame. Uses lerp. */
function lengthAtFrame(
    frame: number,
    maxFrame: number,
    animationLengths: CumulativeLengths,
): number {
    const totalLength = animationLengths.at(-1)?.at(-1);
    if (totalLength === undefined) throw 'Length not found';
    return (totalLength * frame) / maxFrame;
}
