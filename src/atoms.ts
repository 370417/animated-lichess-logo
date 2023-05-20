import { createAnimationData } from './build';
import { flatten } from './build/flatten';
import { fromInkscape } from './build/parse';
import { cumulativeLength } from './build/path-length';
import inkscapeFile from './build/inkscape/2.svg?raw';
import { Store } from './state';
import { projectPointsToBezier } from './build/projection';

export const s = new Store();

export const logoData = s.atom(fromInkscape(inkscapeFile));
export const iterations = s.atom(500);
export const numFrames = s.atom(256);

const innerPoints = s.derived(
    [iterations, logoData] as const,
    (iterations, { innerSegments }) => flatten(innerSegments, iterations),
);
const outerPoints = s.derived(
    [iterations, logoData] as const,
    (iterations, { outerSegments }) => flatten(outerSegments, iterations),
);
const animationPoints = s.derived(
    [iterations, logoData] as const,
    (iterations, { animationSegments }) =>
        flatten(animationSegments, iterations),
);

const weightedInnerPoints = s.derived(
    [innerPoints, animationPoints, logoData] as const,
    (innerPoints, animationPoints, { animationSegments }) =>
        projectPointsToBezier(innerPoints, animationPoints, animationSegments),
);
const weightedOuterPoints = s.derived(
    [outerPoints, animationPoints, logoData] as const,
    (outerPoints, animationPoints, { animationSegments }) =>
        projectPointsToBezier(outerPoints, animationPoints, animationSegments),
);

const innerLengths = s.derived([weightedInnerPoints], cumulativeLength);
const outerLengths = s.derived([weightedOuterPoints], cumulativeLength);
const animationLengths = s.derived([animationPoints], cumulativeLength);

export const animationData = s.derived(
    [
        logoData,
        numFrames,
        animationLengths,
        innerLengths,
        outerLengths,
        innerPoints,
        outerPoints,
    ] as const,
    createAnimationData,
);
