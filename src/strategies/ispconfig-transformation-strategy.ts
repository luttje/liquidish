import { BaseTransformationStrategy } from './base-transformation-strategy.js';
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode } from '../transformer/parser.js';

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
    override transformNode(node: Node): string | null {
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
    override if(name: string, op?: string, value?: string): string {
        if (op && value) {
            return `{tmpl_if name="${name}" op="${op}" value="${value}"}`;
        }

        return `{tmpl_if name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    override elseif(name: string, op?: string, value?: string): string {
        if (op && value) {
            return `{tmpl_elseif name="${name}" op="${op}" value="${value}"}`;
        }

        return `{tmpl_elseif name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    override else(): string {
        return `{tmpl_else}`;
    }

    /**
     * @inheritdoc
     */
    override endif(): string {
        return '{/tmpl_if}';
    }

    /**
     * @inheritdoc
     */
    override unless(name: string): string {
        return `{tmpl_unless name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    override endunless(): string {
        return `{/tmpl_unless}`;
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
