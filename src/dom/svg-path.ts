import { Points } from '../bezier';

export function toSvgPoints(points: Points): string {
    const parts: string[] = [];
    for (let i = 0; i < points.xs.length; i++) {
        parts.push(`${points.xs[i]},${points.ys[i]}`);
    }
    return parts.join(' ');
}
