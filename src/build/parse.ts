import 'path-data-polyfill';

import type { InkscapeSvg, LogoData, SegmentData } from './types';

/**
 * Parse input data from an inkscape save file.
 *
 * File should contain open paths labeled as inner{n}, outer{n}, and anim{n}
 * where {n} goes from 1 to 6 (or higher, but the lichess logo only has six
 * distinct sections). Curly braces should not be a part of label name.
 * Label refers to inkscape label, not id.
 *
 * Paths should line up so that inner2 starts where inner1 ends, etc.
 * All paths should point in the same direction.
 */
export function fromInkscape(inkscapeFile: InkscapeSvg): LogoData {
    // First line isn't html, so remove it
    const svgText = inkscapeFile.replace(/<\?xml.*\?>\n/, '');
    // Avoid creating any text nodes when we parse this as html
    const svgNodeText = svgText.trim();

    const template = document.createElement('template');
    template.innerHTML = svgNodeText;
    const svg = template.content.firstChild as SVGElement;

    return parse(svg);
}

function parse(svg: SVGElement): LogoData {
    const pathDataByLabel = new Map<string, PathData[]>();

    for (let i = 0; i < svg.children.length; i++) {
        const child = svg.children[i] as SVGElement;
        const label = child.getAttribute('inkscape:label');

        if (label && child.nodeName === 'path') {
            const path = child as SVGPathElement;
            if (/^(?:inner|outer|anim)\d+$/.test(label)) {
                pathDataByLabel.set(
                    label,
                    path.getPathData({ normalize: true }),
                );
            }
        }
    }

    const innerSegments: SegmentData[] = [];
    const outerSegments: SegmentData[] = [];
    const animationSegments: SegmentData[] = [];
    for (let segmentIndex = 1; true; segmentIndex++) {
        const inner = pathDataByLabel.get('inner' + segmentIndex);
        const outer = pathDataByLabel.get('outer' + segmentIndex);
        const anim = pathDataByLabel.get('anim' + segmentIndex);
        if (!inner || !outer || !anim) break;
        innerSegments.push(pathsToSegment(inner));
        outerSegments.push(pathsToSegment(outer));
        animationSegments.push(pathsToSegment(anim));
    }

    return {
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
        innerSegments,
        outerSegments,
        animationSegments,
    };
}

// PathData has three points per curve. SegmentData has four points per curve.
// Converting to four points per curve helps us iterate over curves backwards
// more easily.
function pathsToSegment(pathData: PathData[]): SegmentData {
    if (pathData.length < 2) throw 'Path data too short';
    const head = pathData[0];
    if (head.type !== 'M') throw 'Path does not start with move';
    let [lastX, lastY] = head.values;
    const xPoints: [number, number, number, number][] = [];
    const yPoints: [number, number, number, number][] = [];
    for (let i = 1; i < pathData.length; i++) {
        const path = pathData[i];
        if (path.type == 'L') {
            // Treat lines as bezier curves with control points
            // on the start and endpoints.
            const [x, y] = path.values;
            xPoints.push([lastX, lastX, x, x]);
            yPoints.push([lastY, lastY, y, y]);
            lastX = x;
            lastY = y;
        } else if (path.type === 'C') {
            const [x1, y1, x2, y2, x, y] = path.values;
            xPoints.push([lastX, x1, x2, x]);
            yPoints.push([lastY, y1, y2, y]);
            lastX = x;
            lastY = y;
        } else {
            throw 'Unsupported path type';
        }
    }
    return { xPoints, yPoints };
}
