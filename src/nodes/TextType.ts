import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TEXT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import Language from "./Language";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnionType from "./UnionType";

/** Any string or a specific string, depending on whether the given token is an empty text literal. */
export default class TextType extends NativeType {

    readonly text: Token;
    readonly format?: Language;

    constructor(text?: Token, format?: Language) {
        super();

        this.text = text ?? new Token(TEXT_SYMBOL, TokenType.TEXT);
        this.format = format;
    }

    getGrammar() { 
        return [
            { name: "text", types:[ Token ] },
            { name: "format", types:[ Language, undefined ] },
        ]; 
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TextType(
            this.cloneOrReplaceChild(pretty, [ Token ], "quote", this.text, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Language, undefined ], "format", this.format, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    accepts(type: Type, context: Context): boolean { 

        const types = 
            type instanceof TextType ? [ type ] : 
            type instanceof UnionType ? type.getTypes(context).list() : 
            [];

        if(types.length === 0) return false;

        // For this to accept the given type, this must be an empty string or the text and the given type must be the same.
        for(const possibleType of types) {
            if(!(possibleType instanceof TextType)) return false;
            if(!((this.getText() === "" || (this.text.getText() === possibleType.text.getText())) &&
                ((this.format === undefined && possibleType.format === undefined) || 
                 (this.format !== undefined && possibleType.format !== undefined && this.format.equals(possibleType.format)))))
                 return false;
        }
        return true;

    }

    /** Strip the delimiters from the token to get the text literal that defines this type. */
    getText() {
        const text = this.text.getText();
        return text.substring(1, text.length - 1);
    }

    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
    
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && child === this.format)
            return getPossibleLanguages(project).map(l => new Replace(context.source, child, new Language(l)));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 
        
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && this.format === undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "format", new Language(l)));

    }
    
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.format) return new Remove(context.source, this, child);
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A text type"
        }
    }


}