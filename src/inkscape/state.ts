import { producer } from "../state";
import { svg } from "./inkscape-svg";
import { parseAnimationParams } from "./parse";

export const animParams = producer(parseAnimationParams(svg));
