// https://github.com/jarek-foksa/path-data-polyfill
// Some functionality left out of these type declarations

// need this export to make this a module
export {}

declare global {
    interface SVGPathElement {
        getPathData(options: { normalize: true }): PathData[];
        setPathData(pathData: PathData[]): void;
    }

    // Normalized values only because we declared getPathData to always normalize.
    // If we hadn't, we'd also have to consider arcs 'A', relative types like 'm',
    // and shorthand types like 'h'.
    type PathData = MovePathData | LinePathData | BezierPathData | ClosePathData;

    type SegmentData = [MovePathData, LinePathData | BezierPathData];

    type MovePathData = {
        type: 'M';
        /** [x, y] */
        values: [number, number];
    };

    type LinePathData = {
        type: 'L';
        /** [x, y] */
        values: [number, number];
    };

    type BezierPathData = {
        type: 'C';
        /** x1, y1, x2, y2, x, y */
        values: [number, number, number, number, number, number];
    };

    type ClosePathData = {
        type: 'Z';
    };
}
