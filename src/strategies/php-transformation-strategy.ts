import { BaseTransformationStrategy } from './base-transformation-strategy.js';
import { unescapeValue } from '../utils.js';
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode } from '../transformer/parser.js';

/**
 * @augments BaseTransformationStrategy
 * @public
 */
export class PHPTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getLogicTokens(): LogicToken[] {
        return [
            ...super.getLogicTokens(),
            { type: 'include' },
        ];
    }

    /**
     * @inheritdoc
     */
    override transformNode(node: Node): string | null {
        switch (node.type) {
            case 'include':
                return this.parseInclude(<ParentNode>node);
        }

        return super.transformNode(node);
    }

    private parseInclude(node: SelfClosingNode): string {
        return this.include(node.parameters);
    }

    /**
     * @inheritdoc
     */
    override comment(comment: string): string {
        if (this.transformer.showComments === true) {
            return `<!--${comment}-->`;
        }

        return '<?php /* ' + comment + ' */ ?>';
    }

    /**
     * @inheritdoc
     */
    override if(name: string, op?: string, value?: string): string {
        if (op && value) {
            return `<?php if ($${name} ${op} '${value}') : ?>`;
        }

        return `<?php if ($${name}) : ?>`;
    }

    /**
     * @inheritdoc
     */
    override elseif(name: string, op?: string, value?: string): string {
        if (op && value) {
            return `<?php elseif ($${name} ${op} '${value}') : ?>`;
        }

        return `<?php elseif ($${name}) : ?>`;
    }

    /**
     * @inheritdoc
     */
    override else(): string {
        return `<?php else : ?>`;
    }

    /**
     * @inheritdoc
     */
    override endif(): string {
        return `<?php endif; ?>`;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string): string {
        return `<?php if (!$${name}) : ?>`;
    }

    /**
     * @inheritdoc
     */
    override endunless(): string {
        return `<?php endif; ?>`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        return `<?php echo $${variable}; ?>`;
    }

    public include(name: string): string {
        name = unescapeValue(name);
        return `<?php include '${name}'; ?>`;
    }
}
