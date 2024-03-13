import { LiquidishTransformer } from "../transformer/transformer.js";
import { Transformation } from "./base-transformation-strategy.js";

export type MetaData = {
    isChildOnly?: boolean;
    defaults?: Record<string, any>;
    [key: string]: any;
};

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

    public abstract meta(meta: MetaData): string;

    public abstract comment(comment: string): string;

    public abstract render(component: string, variables: Record<string, string>, offset: number, string: string): string;

    public abstract for(itemName: string, collectionName: string, statement: string): string;

    public abstract if(name: string, op: string, value: string, statements: string): string;

    public abstract unless(name: string, statements: string): string;

    public abstract variable(variable: string): string;
}
