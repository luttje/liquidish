import { BaseTransformationStrategy } from './base-transformation-strategy.js';
import { buildVariablesScope, getIndentationFromLineStart, readComponentWithIndentation } from '../utils.js';
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode, TransformParser } from '../transformer/parser.js';
import { IfStatementBlock } from './abstract-transformation-strategy.js';

/**
 * @public
 */
export class ISPConfigTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getLogicTokens(): LogicToken[] {
        return [
            ...super.getLogicTokens(),
            { type: 'loop', flags: LogicTokenFlags.OpensScope },
            { type: 'endloop', flags: LogicTokenFlags.ClosesScope },
            { type: 'dyninclude' },
            { type: 'hook' },
        ];
    }

    /**
     * @inheritdoc
     */
    override transformNode(node: Node): string {
        switch (node.type) {
            case 'loop':
                return this.parseLoop(<ParentNode>node);
            case 'dyninclude':
                return this.parseDyninclude(<SelfClosingNode>node);
            case 'hook':
                return this.parseHook(<SelfClosingNode>node);
        }

        return super.transformNode(node);
    }

    private parseLoop(node: ParentNode): string {
        return this.loop(node.parameters);
    }

    private parseDyninclude(node: SelfClosingNode): string {
        return this.dyninclude(node.parameters);
    }

    private parseHook(node: SelfClosingNode): string {
        return this.hook(node.parameters);
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
    override render(component: string, variables: Record<string, string>): string {
        const indentation = this.transformer.getCurrentIndentation();
        const { contents, path } = readComponentWithIndentation(this.transformer.getPath(), component, indentation);

        this.transformer.pushToScope({
            ...variables,
            path
        });

        const transformed = this.transformer.transform(contents);

        // Clean up the scope after processing a block/component
        this.transformer.popScope();

        return transformed;
    }

    /**
     * @inheritdoc
     */
    override for(itemName: string, collectionName: string, statement: string): string {
        const scope = this.transformer.getScope();

        if (!Array.isArray(scope[collectionName])) {
            throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${this.transformer.getPath()})}`);
        }

        /** @type {any[]} */
        const collection = scope[collectionName];

        return collection.map(item => {
            const variables = {};
            buildVariablesScope(item, itemName, variables);

            this.transformer.pushToScope(variables);

            const transformed = this.transformer.transform(statement);

            // Clean up the scope after processing a block/component
            this.transformer.popScope();

            return transformed;
        }).join('');
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
                        output += `{tmpl_if name="${block.name}" op="${block.op}" value="${block.value}"}${block.statements}`;
                    } else {
                        output += `{tmpl_if name="${block.name}"}${block.statements}`;
                    }
                    break;
                case 'elseif':
                    if (block.op && block.value) {
                        output += `{tmpl_elseif name="${block.name}" op="${block.op}" value="${block.value}"}${block.statements}`;
                    } else {
                        output += `{tmpl_elseif name="${block.name}"}${block.statements}`;
                    }
                    break;
                case 'else':
                    output += `{tmpl_else}${block.statements}`;
                    break;
            }
        }

        output += `{/tmpl_if}`;

        return output;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string, statements: string): string {
        return `{tmpl_unless name="${name}"}${statements}{/tmpl_unless}`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        return `{tmpl_var name="${variable}"}`;
    }

    public loop(name: string): string {
        return `{tmpl_loop name="${name}"}`;
    }

    public endloop(): string {
        return '{/tmpl_loop}';
    }

    public dyninclude(component: string): string {
        component = component.slice(1, -1); // trim quotes
        return `{tmpl_dyninclude name="${component}"}`;
    }

    public hook(hookName: string): string {
        hookName = hookName.slice(1, -1); // trim quotes
        return `{tmpl_hook name="${hookName}"}`;
    }
}
