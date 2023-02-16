import { flatten, cumulativeLength } from '../bezier';
import { polyline, svg } from '../dom/creation';
import { hydrateRange, hydrateStateDisplay } from '../dom/hydration';
import { toSvgPoints } from '../dom/svg-path';
import { animParams } from '../inkscape/inkscape-svg';
import { producer, subscribe, get, transformer } from '../state';

export function runDrawPath() {
    const iterations = producer<number>(0);

    const points = transformer(
        [animParams, iterations] as const,
        (animParams, iterations) => {
            return animParams.segments.map((segment) =>
                flatten(segment.segmentData, iterations),
            );
        },
    );

    const pointsStr = transformer([points], (points) =>
        points.map(toSvgPoints),
    );

    const curveLengths = transformer([points], (points) =>
        cumulativeLength(points),
    );

    const curveLength = transformer([curveLengths], (curveLengths) =>
        curveLengths.at(-1)!.at(-1)!.toFixed(2),
    );

    hydrateRange('drawPathI', iterations);
    hydrateStateDisplay('drawPathI', iterations);
    hydrateStateDisplay('drawPathCurveLength', curveLength);

    const root = document.getElementById('drawPath')!;
    const outputContainer = root.getElementsByClassName('output').item(0)!;
    init(get(pointsStr)!);

    function init(points: string[]) {
        const { width, height } = get(animParams)!;
        const createChild = (points: string) =>
            polyline({
                points,
                stroke: '#000',
                fill: 'none',
            });
        const $svg = svg(width, height, ...points.map(createChild));
        outputContainer.replaceChildren($svg);
    }

    function update(points: string[]) {
        points.forEach((p, i) => {
            outputContainer
                .getElementsByTagName('svg')[0]
                .children.item(i)
                ?.setAttributeNS(null, 'points', p);
        });
    }

    // Assume that animParams will never change,
    // therefore we will never need to call init again
    subscribe(pointsStr, update);
}
