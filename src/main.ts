import './style.css';
import { svg } from './inkscape/inkscape-svg';
import { parseAnimationParams } from './inkscape/parse';

console.log(parseAnimationParams(svg));
