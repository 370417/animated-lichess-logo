// Use variable to force minifier to reduce repetition.
// Might not be necessary.
const svgNamespace = 'http://www.w3.org/2000/svg';

export function svg(
    width: number,
    height: number,
    ...children: SVGElement[]
): SVGSVGElement {
    const $svg = document.createElementNS(svgNamespace, 'svg');
    $svg.setAttributeNS(null, 'width', `${width}`);
    $svg.setAttributeNS(null, 'height', `${height}`);
    $svg.setAttributeNS(null, 'viewBox', `-2 -2 ${width + 4} ${height + 4}`);
    if (children) $svg.replaceChildren(...children);
    return $svg;
}

export function g(children: SVGElement[]): SVGGElement {
    const $g = document.createElementNS(svgNamespace, 'g');
    $g.replaceChildren(...children);
    return $g;
}

export function defs(...children: SVGElement[]): SVGDefsElement {
    const $defs = document.createElementNS(svgNamespace, 'defs');
    $defs.replaceChildren(...children);
    return $defs;
}

export function path(stroke: string, fill: string, d: string): SVGPathElement {
    const $path = document.createElementNS(svgNamespace, 'path');
    $path.setAttributeNS(null, 'stroke', stroke);
    $path.setAttributeNS(null, 'fill', fill);
    $path.setAttributeNS(null, 'd', d);
    return $path;
}

export function polyline(attributes: {
    [K in string]: string;
}): SVGPolylineElement {
    const $polyline = document.createElementNS(svgNamespace, 'polyline');
    for (const [attr, value] of Object.entries(attributes)) {
        $polyline.setAttributeNS(null, attr, value);
    }
    return $polyline;
}

export function mask(id: string, ...children: SVGElement[]): SVGMaskElement {
    const $mask = document.createElementNS(svgNamespace, 'mask');
    $mask.setAttributeNS(null, 'id', id);
    $mask.replaceChildren(...children);
    return $mask;
}
