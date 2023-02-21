import { producer } from '../state';
import inkscapeFile from './2.svg?raw';
import { parse2 } from './parse';

// First line isn't html, so remove it
const svgText = inkscapeFile.replace(/<\?xml.*\?>\n/, '');
// Avoid creating any text nodes when we parse this as html
const svgNodeText = svgText.trim();

const template = document.createElement('template');
template.innerHTML = svgNodeText;
const svg = template.content.firstChild as SVGElement;

export const animParams2 = producer(parse2(svg));
