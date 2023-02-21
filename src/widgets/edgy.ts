import {
    cumulativeLength,
    distance,
    flatten2,
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
import { animParams2 } from '../inkscape/inkscape-svg2';
import { producer, subscribe, get, transformer } from '../state';
import { toggleTickerAndRange } from './common-patterns';
import {
    standardCurveLength,
    standardCurveLengths,
    standardPoints,
} from './common-state';

// svg -> pathdata -> flattened points -> animated points
//                              \-> lengths -/
//                                  lengths -\
//        pathdata -----------------------> split pathdata -> svg

// need inner & outer points
// inner & outer lengths
// need to be able to translate

export function runEdgy() {
    const frameLength = 101;

    const frame = producer<number>(frameLength - 1);
    const play = producer<boolean>(false);

    const rootId = 'edgy';
    const frameId = 'edgyFrame';
    const playId = 'edgyPlay';

    subscribe(play, toggleTickerAndRange(frame, frameLength, 60, frameId));

    const innerPoints = transformer([animParams2], (animParams) =>
        animParams.innerSegments.map(flatten2),
    );
    const outerPoints = transformer([animParams2], (animParams) =>
        animParams.outerSegments.map(flatten2),
    );
    const innerLengths = transformer([innerPoints], cumulativeLength);
    const outerLengths = transformer([outerPoints], cumulativeLength);

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
        const { width, height } = get(animParams2)!;
        const createChild = (points: string) =>
            polyline({
                points,
                stroke: '#fff',
                fill: 'none',
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

    // Assume that animParams will never change,
    // therefore we will never need to call init again
    subscribe(animatedPointsStr, update);

    hydrateRange(frameId, frame);
    hydrateStateDisplay(frameId, frame);
    hydrateCheckbox(playId, play);
}
