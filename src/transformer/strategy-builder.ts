import { AbstractTransformationStrategy } from "../strategies/abstract-transformation-strategy.js";
import { LiquidishTransformer } from "../transformer.js";

export type StrategyBuilder = (transformer: LiquidishTransformer) => AbstractTransformationStrategy;
