import { BaseTransformationStrategy } from './base-transformation-strategy.js';
import { buildVariablesScope, getIndentationFromLineStart, readComponentWithIndentation } from '../utils.js';
import { IfStatementBlock } from './abstract-transformation-strategy.js';
import { LogicToken, LogicTokenFlags } from '../transformer/parser.js';

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
    override comment(comment: string): string {
        if (this.transformer.showComments === true) {
            return `<!--${comment}-->`;
        }

        return '<?php /* ' + comment + ' */ ?>';
    }

    /**
     * @inheritdoc
     */
    override render(component: string, variables: Record<string, string>): string {
        const indentation = this.transformer.getCurrentIndentation();
        const { contents, path } = readComponentWithIndentation(this.transformer.getPath(), component, indentation);

        this.transformer.pushToScope({
            ...variables,
            path
        });

        return this.transformer.transform(contents);
    }

    /**
     * @inheritdoc
     */
    override for(itemName: string, collectionName: string, statement: string): string {
        const scope = this.transformer.getScope();

        if (!Array.isArray(scope[collectionName])) {
            throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${this.transformer.getPath()})}`);
        }

        return scope[collectionName].map(item => {
            const variables = {};
            buildVariablesScope(item, itemName, variables);

            this.transformer.pushToScope(variables);

            return this.transformer.transform(statement);
        }).join('');
    }

    private compileKnownIf(name: string, op: string, value: string, statements: string): string | null {
        const scope = this.transformer.getScope();

        // If the variable is defined in the current scope, use it
        if (scope[name] !== undefined) {
            if (this.performIf(scope[name], op, value)) {
                return statements;
            } else {
                return '';
            }
        }

        return null;
    }

    /**
     * @inheritdoc
     */
    override if(statementBlocks: IfStatementBlock[]): string {
        return '';
        // const knownIf = this.compileKnownIf(name, op, value, statements);

        // if (knownIf !== null) {
        //     return knownIf;
        // }

        // if (op && value) {
        //     return `<?php if ($${name} ${op} '${value}') : ?>${statements}<?php endif; ?>`;
        // }

        // return `<?php if ($${name}) : ?>${statements}<?php endif; ?>`;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string, statements: string): string {
        const knownIf = this.compileKnownIf(name, '!=', 'true', statements);

        if (knownIf !== null) {
            return knownIf;
        }

        return `<?php if (!$${name}) : ?>`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        const scope = this.transformer.getScope();

        // If the variable is defined in the current scope, use it
        if (scope[variable] !== undefined) {
            return scope[variable];
        }

        // Otherwise it's a template variable
        return `<?php echo $${variable}; ?>`;
    }

    public include(component: string): string {
        component = component.slice(1, -1); // trim quotes
        return `<?php include '${component}'; ?>`;
    }
}
