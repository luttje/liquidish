import { LiquidishTransformer } from "./transformer.js";

export type TransformParser = (transformer: LiquidishTransformer, ...args: any[]) => any[];
