import 'path-data-polyfill';

export type AnimationParams = {
    width: number;
    height: number;
    maskHtml: string;
    segments: SegmentParams[];
};

export type SegmentParams = {
    segmentData: SegmentData;
    startData: [MovePathData, LinePathData];
    endData: [MovePathData, LinePathData];
};

/**
 * Extract animation parameters from an inkscape svg element.
 *
 * Gets width and height from the svg's attributes.
 *
 * Parses children using the label of elements. Possible labels:
 * - mask
 *   Required.
 * - segment{n}-{n+1}-{n+2}... at least one number is required
 *   A path of bezier curves or straight lines numbered chronologically.
 *   The animation will follow these paths one by one.
 *   If there is a gap in index, eg segment5 exists but there is no segment4,
 *   the segments after the gap will be ignored.
 *   Number of indices in name must match number of segments in path.
 *   Parser does not check that indices count up one by one.
 * - start{n}
 *   A single line that sets the start slope of a segment.
 *   Visually, this line can be placed near the start of its segment,
 *   but it has no impact on where the segment starts.
 * - end{n}
 *   A single line that sets the end slope of a segment. Like start{n},
 *   the location of this path does not affect where the segment ends.
 * - end{n}-start{n+1}
 *   A single line that sets the end slope for a segment and the start
 *   slope of the next segment at the same time. Useful for when the
 *   start slope of one segment is always the same as the end slope of
 *   the previous segment.
 *   Parser does not check that the start index is the end index plus one.
 *
 * Indices start at 1.
 *
 * All elements are assumed to be paths. Elements that aren't labeled
 * according to this spec will be ignored.
 */
export function parseAnimationParams(svg: SVGElement): AnimationParams {
    const [pathsByLabel, pathDataByLabel] = childrenToMaps(svg.children);

    const mask = pathsByLabel.get('mask');
    if (!mask) throw 'Parse error: mask not found';

    const segments: SegmentParams[] = [];
    for (let segmentIndex = 1; true; segmentIndex++) {
        const segmentData = pathDataByLabel.get('segment' + segmentIndex);
        if (!segmentData) break;
        const startPath = pathsByLabel.get('start' + segmentIndex);
        const endPath = pathsByLabel.get('end' + segmentIndex);
        if (!startPath)
            throw `Parse error: start path for segment ${segmentIndex} is missing`;
        if (!endPath)
            throw `Parse error: end path for segment ${segmentIndex} is missing`;
        segments.push({
            segmentData,
            startData: pathToLine(startPath),
            endData: pathToLine(endPath),
        });
    }

    if (segments.length === 0) {
        throw 'Parse error: no path segments found';
    } else if (segments.length < pathDataByLabel.size) {
        console.warn('Found unreachable path segments');
    }

    return {
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
        maskHtml: mask.outerHTML,
        segments,
    };
}

function childrenToMaps(
    children: HTMLCollection
): [Map<string, SVGPathElement>, Map<string, SegmentData>] {
    // Start, end, and mask paths only
    const pathsByLabel: Map<string, SVGPathElement> = new Map();
    // Segment paths after being split
    const pathDataByLabel: Map<string, SegmentData> = new Map();

    for (let i = 0; i < children.length; i++) {
        const child = children[i] as SVGElement;
        const label = child.getAttribute('inkscape:label');

        if (label && child.nodeName === 'path') {
            const path = child as SVGPathElement;
            if ('mask' == label) {
                pathsByLabel.set(label, path);
            } else if (/^end\d+-start\d+$/.test(label)) {
                // Split end{n}start{n+1} into two separate paths
                const [startLabel, endLabel] = label.split('-');
                pathsByLabel.set(startLabel, path);
                pathsByLabel.set(endLabel, path);
            } else if (/^(?:start|end)\d+$/.test(label)) {
                pathsByLabel.set(label, path);
            } else if (/^segment\d+(?:-\d+)+$/.test(label)) {
                // Split segments with multiple parts into separate paths
                const [firstLabel, ...moreIndices] = label.split('-');
                const splitPaths = splitPathData(
                    path.getPathData({ normalize: true })
                );
                // Add one to account for firstLabel
                if (splitPaths.length < moreIndices.length + 1) {
                    throw 'Parse error: path data has more segments than described by path label';
                } else if (splitPaths.length > moreIndices.length + 1) {
                    throw 'Parse error: path data has fewer segments than described by path label';
                } else {
                    pathDataByLabel.set(firstLabel, splitPaths[0]);
                    for (let i = 1; i < splitPaths.length; i++) {
                        const subLabel = 'segment' + moreIndices[i - 1];
                        pathDataByLabel.set(subLabel, splitPaths[i]);
                    }
                }
            } else if (/^segment\d+$/.test(label)) {
                const pathData = path.getPathData({ normalize: true });
                if (pathData.length < 2) throw 'Parse error: path too short';
                if (pathData.length > 2)
                    throw 'Parse error: path data has more than one segment';
                const [moveData, drawData] = pathData;
                if (moveData.type != 'M')
                    throw 'Parse error: path must start with move';
                if (drawData.type != 'C' && drawData.type != 'L')
                    throw 'Parse error: path must end with C or L command';
                pathDataByLabel.set(label, [moveData, drawData]);
            } else {
                console.warn('Failed to parse path label, skipping:', label);
            }
        }
    }

    return [pathsByLabel, pathDataByLabel];
}

/**
 * Split a path into one segment paths
 *
 * The first command of the input path must be a move.
 * The remaining commands must not be moves.
 *
 * Also doesn't support the Z command. It's feasible, but Z is not currently being used.
 */
function splitPathData(pathData: PathData[]): SegmentData[] {
    if (pathData.length < 2) throw 'Parse error: path is too short';
    const head = pathData[0];
    let move = {
        type: 'M' as 'M',
        values: [0, 0] as [number, number],
    };
    if (head.type === 'M') {
        move = head;
    } else {
        throw 'Parse error: path must start with move';
    }
    const splitPaths: SegmentData[] = [];
    for (let i = 1; i < pathData.length; i++) {
        const pathDatum = pathData[i];
        if (pathDatum.type == 'M') {
            throw 'Parse error: path cannot contain a second move';
        } else if (pathDatum.type == 'Z') {
            throw 'Parse error: path cannot contain Z command';
        } else if (pathDatum.type == 'C') {
            splitPaths.push([
                move,
                {
                    type: 'C',
                    values: [...pathDatum.values],
                },
            ]);
            move = {
                type: 'M',
                values: [pathDatum.values[4], pathDatum.values[5]],
            };
        } else if (pathDatum.type == 'L') {
            splitPaths.push([
                move,
                {
                    type: 'L',
                    values: [...pathDatum.values],
                },
            ]);
            move = {
                type: 'M',
                values: [...pathDatum.values],
            };
        }
    }
    return splitPaths;
}

function pathToLine(path: SVGPathElement): [MovePathData, LinePathData] {
    const pathData = path.getPathData({ normalize: true });
    if (pathData.length < 2) throw 'Parse error: path too short';
    if (pathData.length > 2)
        throw 'Parse error: path data has more than one segment';
    const [moveData, lineData] = pathData;
    if (moveData.type != 'M') throw 'Parse error: path must start with move';
    if (lineData.type != 'L') throw 'Parse error: path must end with L command';
    return [moveData, lineData];
}
