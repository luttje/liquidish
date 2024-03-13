
import { BaseTransformationStrategy } from './index.js';
import { LogicToken, Node, LogicTokenFlags, ParentNode, SelfClosingNode } from '../index.js';

/**
 * @public
 */
export class VueTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getLogicTokens(): LogicToken[] {
        return [
            ...super.getLogicTokens(),
            { type: 'html' },
            { type: 'pre', flags: LogicTokenFlags.OpensScope },
            { type: 'endpre', flags: LogicTokenFlags.ClosesScope },
        ];
    }

    /**
     * @inheritdoc
     */
    override transformNode(node: Node): string | null {
        switch (node.type) {
            case 'html':
                return this.html(<SelfClosingNode>node);
            case 'pre':
                return this.pre(<ParentNode>node);
            // No need to implement endpre, as it's handled by the base class
        }

        return super.transformNode(node);
    }

    /**
     * Transforms {% html '<div>hello</div>' %}
     */
    private html(node: SelfClosingNode): string {
        return `<div v-html="'${node.parameters}'"></div>`
    }

    /**
     * Transforms {% pre %}
     */
    private pre(node: ParentNode): string {
        const contents = this.statementsToText(node.statements);
        const transformed = this.transformer.transform(contents);

        return `<span v-pre>${transformed}</span>`;
    }

    /**
     * @inheritdoc
     */
    override comment(comment: string): string {
        if (this.transformer.showComments === true) {
            return `<!--${comment}-->`;
        }

        return '';
    }

    /**
     * @inheritdoc
     */
    override if(name: string, op?: string, value?: string): string {
        if (op && value) {
          return `<div v-if="$${name} ${op} '${value}'">`;
        }

        return `<div v-if="$${name}">`;
    }

    /**
     * @inheritdoc
     */
    override elseif(name: string, op?: string, value?: string): string {
        if (op && value) {
          return `</div><div v-else-if="$${name} ${op} '${value}'">`;
        }

        return `</div><div v-else-if="$${name}">`;
    }

    /**
     * @inheritdoc
     */
    override else(): string {
        return `</div><div v-else>`;
    }

    /**
     * @inheritdoc
     */
    override endif(): string {
        return `</div>`;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string): string {
        return `<div v-if="!${name}">`;
    }

    /**
     * @inheritdoc
     */
    override endunless(): string {
        return `</div>`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        return `{{ ${variable} }}`;
    }
}
