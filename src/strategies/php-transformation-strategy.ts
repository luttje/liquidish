import { BaseTransformationStrategy } from './base-transformation-strategy.js';
import { buildVariablesScope, getIndentationFromLineStart, readComponentWithIndentation, unescapeValue } from '../utils.js';
import { IfStatementBlock } from './abstract-transformation-strategy.js';
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
    override if(statementBlocks: IfStatementBlock[]): string {
        let output = '';

        for (const block of statementBlocks) {
            switch (block.type) {
                case 'if':
                    if (block.op && block.value) {
                        output += `<?php if ($${block.name} ${block.op} '${block.value}') : ?>${block.statements}`;
                    } else {
                        output += `<?php if ($${block.name}) : ?>${block.statements}`;
                    }
                    break;
                case 'elseif':
                    if (block.op && block.value) {
                        output += `<?php elseif ($${block.name} ${block.op} '${block.value}') : ?>${block.statements}`;
                    } else {
                        output += `<?php elseif ($${block.name}) : ?>${block.statements}`;
                    }
                    break;
                case 'else':
                    output += `<?php else : ?>${block.statements}`;
                    break;
            }
        }

        output += `<?php endif; ?>`;

        return output;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string, statements: string): string {
        return `<?php if (!$${name}) : ?>${statements}<?php endif; ?>`;
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
