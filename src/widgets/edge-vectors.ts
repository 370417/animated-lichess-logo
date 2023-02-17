import {
    distance,
    getCurrentSegmentIndex,
    getLatestPoint,
    getNormal,
    limitByLength,
} from '../bezier';
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

export function runEdgeVectors() {
    const frameLength = 101;

    const frame = producer<number>(frameLength - 1);
    const play = producer<boolean>(false);
    const mask = producer<boolean>(true);

    const rootId = 'edgeVec';
    const frameId = 'edgeVecFrame';
    const playId = 'edgeVecPlay';
    const lengthId = 'edgeVecLength';
    const maskToggleId = 'edgeVecMaskToggle';

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
                true,
            ),
    );

    const animatedPointsStr = transformer([animatedPoints], (animatedPoints) =>
        animatedPoints.map(toSvgPoints),
    );

    /**
     * Returns a string in the svg polyline points format for
     * a polyline centered around the last point of the input
     * and extending in parallel with vec. Extends in both
     * directions, not just the direction that the vec points in.
     */
    function renderEdgeVec(
        center: { x: number; y: number },
        vec: { dx: number; dy: number },
    ): string {
        const scale = 8;
        const { x, y } = center;
        const dx = scale * vec.dx;
        const dy = scale * vec.dy;
        return `${x - dx},${y - dy} ${x + dx},${y + dy}`;
    }

    const normalStr = transformer([animatedPoints], (points) => {
        const normal = getNormal(points);
        if (!normal) return '';
        return renderEdgeVec(getLatestPoint(points)!, normal);
    });

    function edgeToVec(edge: [MovePathData, LinePathData]): {
        dx: number;
        dy: number;
    } {
        const dx = edge[1].values[0] - edge[0].values[0];
        const dy = edge[1].values[1] - edge[0].values[1];
        const length = distance(dx, dy, 0, 0);
        return { dx: dx / length, dy: dy / length };
    }

    const root = document.getElementById(rootId)!;
    const outputContainer = root.getElementsByClassName('output').item(0)!;
    let normalLine: SVGPolylineElement | undefined = undefined;

    init(get(animatedPointsStr)!);

    function init(points: string[]) {
        const { width, height } = get(animParams)!;
        const enableMask = get(mask)!;
        const createChild = (points: string) =>
            polyline({
                points,
                stroke: '#fff',
                fill: 'none',
                'stroke-width': enableMask ? '5' : '1',
            });
        normalLine = polyline({
            id: '',
            points: '',
            stroke: '#f00',
            fill: 'none',
            'stroke-width': '0.5',
        });
        const $svg = svg(width, height, g(points.map(createChild)), normalLine);
        outputContainer.replaceChildren($svg);
        updateMask(enableMask);
    }

    function update(points: string[]) {
        points.forEach((p, i) => {
            outputContainer
                .getElementsByTagName('g')[0] // TODO: Move call out of loop
                .children.item(i)
                ?.setAttributeNS(null, 'points', p);
        });
        normalLine?.setAttributeNS(null, 'points', get(normalStr)!);
    }

    function updateMask(mask: boolean) {
        outputContainer
            .getElementsByTagName('g')[0]
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
