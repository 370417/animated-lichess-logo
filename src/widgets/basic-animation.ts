import { limitByLength } from '../bezier';
import { g, polyline, svg } from '../dom/creation';
import {
    hydrateRange,
    hydrateStateDisplay,
    hydrateCheckbox,
} from '../dom/hydration';
import { toSvgPoints } from '../dom/svg-path';
import { animParams } from '../inkscape/inkscape-svg';
import { producer, subscribe, get, transformer } from '../state';
import { toggleTickerAndRange } from './common-patterns';
import {
    standardCurveLength,
    standardCurveLengths,
    standardPoints,
} from './common-state';

export function runBasicAnimation(
    prefix: string,
    doLerp: boolean,
    applyMask: boolean,
) {
    const frame = producer<number>(100);
    const play = producer<boolean>(false);
    const mask = producer<boolean>(applyMask);

    const rootId = `${prefix}Animation`;
    const frameId = `${prefix}AnimationFrame`;
    const playId = `${prefix}AnimationPlay`;
    const lengthId = `${prefix}CurveLength`;
    const maskToggleId = `${prefix}MaskToggle`;

    const frameLength = 101;

    subscribe(play, toggleTickerAndRange(frame, frameLength, 60, frameId));

    const currentCurveLength = transformer(
        [standardCurveLength, frame],
        (standardCurveLength, frame) =>
            (standardCurveLength * frame) / (frameLength - 1),
    );
    // Truncated for display
    const currentCurveLengthStr = transformer([currentCurveLength], (length) =>
        length.toFixed(2),
    );

    const animatedPoints = transformer(
        [standardPoints, standardCurveLengths, currentCurveLength] as const,
        (standardPoints, standardCurveLengths, currentCurveLength) =>
            limitByLength(
                standardPoints,
                standardCurveLengths,
                currentCurveLength,
                doLerp,
            ),
    );

    const animatedPointsStr = transformer([animatedPoints], (animatedPoints) =>
        animatedPoints.map(toSvgPoints),
    );

    alert.bind;

    const root = document.getElementById(rootId)!;
    const outputContainer = root.getElementsByClassName('output').item(0)!;
    init(get(animatedPointsStr)!);

    function init(points: string[]) {
        const { width, height } = get(animParams)!;
        const enableMask = get(mask)!;
        const createChild = (points: string) =>
            polyline({
                points,
                stroke: '#000',
                fill: 'none',
                'stroke-width': enableMask ? '5' : '1',
            });
        const $svg = svg(width, height, g(points.map(createChild)));
        outputContainer.replaceChildren($svg);
        updateMask(enableMask);
    }

    function update(points: string[]) {
        points.forEach((p, i) => {
            outputContainer
                .getElementsByTagName('g')[0]
                .children.item(i)
                ?.setAttributeNS(null, 'points', p);
        });
    }

    function updateMask(mask: boolean) {
        outputContainer
            .getElementsByTagName('g')
            .item(0)!
            .setAttributeNS(null, 'mask', mask ? 'url(#logo)' : 'none');
    }

    // Assume that animParams will never change,
    // therefore we will never need to call init again
    subscribe(animatedPointsStr, update);

    subscribe(mask, updateMask);

    hydrateRange(frameId, frame);
    hydrateStateDisplay(frameId, frame);
    hydrateStateDisplay(lengthId, currentCurveLengthStr);
    hydrateCheckbox(playId, play);
    hydrateCheckbox(maskToggleId, mask);
}
