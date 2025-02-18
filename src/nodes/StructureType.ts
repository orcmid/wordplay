import type Type from './Type';
import type ConversionDefinition from './ConversionDefinition';
import type Context from './Context';
import type StructureDefinition from './StructureDefinition';
import NameType from './NameType';
import type TypeSet from './TypeSet';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Definition from './Definition';
import type Node from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import type { Grammar } from './Node';
import BasisType from './BasisType';
import type Spaces from '../parser/Spaces';
import type Locales from '../locale/Locales';

export const STRUCTURE_NATIVE_TYPE_NAME = 'structure';

export default class StructureType extends BasisType {
    /** The structure definition that defines this type. */
    readonly structure: StructureDefinition;

    /** Any type inputs provided in creating this structure. */
    readonly types: Type[];

    constructor(definition: StructureDefinition, types: Type[] = []) {
        super();

        this.structure = definition;
        this.types = types;
    }

    getGrammar(): Grammar {
        return [];
    }

    computeConflicts() {
        return [];
    }

    /**
     * The scope of a structure type is its block of definitions.
     */
    getScope() {
        return this.structure.expression;
    }

    /** Structures have additional scope from its basis type, e.g., the = function and other inherited functionality. */
    getAdditionalBasisScope(context: Context): Node | undefined {
        return super.getScope(context);
    }

    getDefinition(name: string) {
        return this.structure.getDefinition(name);
    }

    /** Override to include this structure's definitions, but also the base structure definitions (e.g., =, ≠) */
    getDefinitions(node: Node, context: Context): Definition[] {
        return [
            ...this.structure.getDefinitions(node),
            ...(this.getAdditionalBasisScope(context)?.getDefinitions(
                node,
                context
            ) ?? []),
        ];
    }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every((type) => {
            // If the given type is a name type, is does it refer to this type's structure definition?
            if (type instanceof NameType) type = type.getType(context);

            if (!(type instanceof StructureType)) return false;
            if (this.structure === type.structure) return true;
            // Are any of the given type's interfaces compatible with this?
            return (
                type.structure.interfaces.find((int) => {
                    return this.accepts(int.getType(context), context);
                }) !== undefined
            );
        });
    }

    getConversion(
        context: Context,
        input: Type,
        output: Type
    ): ConversionDefinition | undefined {
        return this.structure.getConversion(context, input, output);
    }

    getAllConversions(context: Context) {
        return [
            ...this.structure.getAllConversions(),
            ...(context
                .getBasis()
                .getStructureDefinition('structure')
                ?.getAllConversions() ?? []),
        ];
    }

    resolveTypeVariable(name: string): Type | undefined {
        if (this.types.length > 0) {
            // Find the type variable corresponding to the name, then the type input corresponding to that variable.
            const variableIndex = this.structure.types?.variables.findIndex(
                (v) => v.hasName(name)
            );
            if (
                variableIndex !== undefined &&
                variableIndex < this.types.length
            )
                return this.types[variableIndex];
        }

        // Otherwise, we fail.
        return undefined;
    }

    getBasisTypeName(): BasisTypeName {
        return 'structure';
    }

    clone() {
        return this;
    }

    toWordplay(_?: Spaces, locale?: Locale) {
        return this.structure.getPreferredName(locale ? [locale] : []);
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.StructureType);
    }

    getGlyphs() {
        return Glyphs.Type;
    }

    getDescriptionInputs(locales: Locales) {
        return [locales.getName(this.structure.names)];
    }
}
