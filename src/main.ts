import { animationData, s } from './flow';
import { drawAnimationFrame } from './scratch';
import { AtomHandle, Store } from './state2';
import './style.css';

const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;
ctx.scale(12, 12);

const frame = s.atom(0);
const frameAnimation = s.derived(
    [frame, animationData] as const,
    (f, a) => [f, a] as const,
);
s.subscribe(frameAnimation, ([frame, animationData]) => {
    drawAnimationFrame(animationData, frame, ctx);
});
hydrateRange(s, 'frame', frame);

function hydrateRange(s: Store, id: string, handle: AtomHandle<number>): void {
    const range = document.getElementById(id) as HTMLInputElement | undefined;
    if (!range || range.tagName !== 'INPUT') return;
    range.value = `${s.get(handle)}`;
    range.addEventListener('input', () => {
        s.set(handle, range.valueAsNumber);
    });
    s.subscribe(handle, (val) => {
        range.value = `${val}`;
    });
}
