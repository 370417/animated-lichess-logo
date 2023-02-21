import inkscapeFile from './inkscape/2.svg?raw';
import {
    createAnimationData,
    cumulativeLength,
    flatten,
    fromInkscape,
} from './scratch';
import { Store } from './state2';

export const s = new Store();

export const logoData = s.atom(fromInkscape(inkscapeFile));
export const iterations = s.atom(50);
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

const innerLengths = s.derived([innerPoints], cumulativeLength);
const outerLengths = s.derived([outerPoints], cumulativeLength);
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
