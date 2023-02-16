import { producer } from '../state';
import inkscapeFile from './logo-inkscape.svg?raw';
import { parseAnimationParams } from './parse';

// First line isn't html, so remove it
const svgText = inkscapeFile.replace(/<\?xml.*\?>\n/, '');
// Avoid creating any text nodes when we parse this as html
const svgNodeText = svgText.trim();

const template = document.createElement('template');
template.innerHTML = svgNodeText;
const svg = template.content.firstChild as SVGElement;

export const animParams = producer(parseAnimationParams(svg));
