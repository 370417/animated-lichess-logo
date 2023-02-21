import { animationData, s } from './flow';
import { animParams } from './inkscape/inkscape-svg';
import { AnimationParams } from './inkscape/parse';
import { drawAnimationFrame } from './scratch';
import { get, subscribe } from './state';
import { AtomHandle, Store } from './state2';
import './style.css';
import { tick } from './ticker';
import { runBasicAnimation } from './widgets/basic-animation';
import { runDrawPath } from './widgets/draw-path';
import { runEdgeVectors } from './widgets/edge-vectors';

// only need one mask for the entire page
function setMask(animParams: AnimationParams) {
    const mask = document
        .getElementsByTagNameNS('http://www.w3.org/2000/svg', 'mask')
        .item(0)!;
    mask.innerHTML = animParams.maskHtml;
}
subscribe(animParams, setMask);
setMask(get(animParams)!);

runDrawPath();
runBasicAnimation('basic', false, false);
runBasicAnimation('lerp', true, false);
runBasicAnimation('mask', true, true);
runEdgeVectors();

tick();

console.log(s.get(animationData));

const canvas = document.createElement('canvas');
canvas.width = 50;
canvas.height = 50;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

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
