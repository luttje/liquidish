import { LiquidishTransformer } from "../transformer.js";
import { Transformation } from "./base-transformation-strategy.js";

/**
 * Base class for transformation strategies.
 *
 * @public
 */
export abstract class AbstractTransformationStrategy {
    protected transformer: LiquidishTransformer;

    constructor(transformer: LiquidishTransformer) {
        this.transformer = transformer;
    }

    public abstract getTransformations(): Transformation[];

    public abstract comment(comment: string): string;

    public abstract render(component: string, variables: Record<string, string>, offset: number, string: string): string;

    public abstract for(itemName: string, collectionName: string, statement: string): string;

    public abstract if(name: string, op: string, value: string): string;

    public abstract elsif(name: string, op: string, value: string): string;

    public abstract else(): string;

    public abstract endif(): string;

    public abstract unless(name: string): string;

    public abstract endunless(): string;

    public abstract variable(variable: string): string;
}
