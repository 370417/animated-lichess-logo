import { cumulativeLength, flatten } from '../bezier';
import { animParams } from '../inkscape/inkscape-svg';
import { transformer } from '../state';

const iterations = 20;

export const standardPoints = transformer([animParams], (animParams) => {
    return animParams.segments.map((segment) =>
        flatten(segment.segmentData, iterations),
    );
});

export const standardCurveLengths = transformer(
    [standardPoints],
    cumulativeLength,
);

export const standardCurveLength = transformer(
    [standardCurveLengths],
    (lengths) => lengths.at(-1)!.at(-1)!,
);
