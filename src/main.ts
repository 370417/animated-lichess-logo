import { animParams } from './inkscape/inkscape-svg';
import { AnimationParams } from './inkscape/parse';
import { get, subscribe } from './state';
import './style.css';
import { tick } from './ticker';
import { runBasicAnimation } from './widgets/basic-animation';
import { runDrawPath } from './widgets/draw-path';

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

tick();
