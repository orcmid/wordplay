import { SET_TYPE_VAR_NAMES, type NativeTypeName } from "../native/NativeConstants";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import Type from "./Type";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import SetOpenToken from "./SetOpenToken";
import SetCloseToken from "./SetCloseToken";
import UnclosedDelimiter from "../conflicts/UnclosedDelimiter";
import type Conflict from "../conflicts/Conflict";
import type TypeSet from "./TypeSet";

export default class SetType extends NativeType {

    readonly open: Token;
    readonly key?: Type;
    readonly close?: Token;

    constructor(open: Token, key?: Type, close?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;

        this.computeChildren();

    }

    static make(key?: Type) {
        return new SetType(new SetOpenToken(), key, new SetCloseToken());
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "key", types:[ Type, undefined ] },
            { name: "close", types:[ Token ] },
        ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new SetType(
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild("key", this.key, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts(): Conflict[] {

        if(this.close === undefined)
            return [ new UnclosedDelimiter(this, this.open, new SetCloseToken()) ]
        return [];

    }

    acceptsAll(types: TypeSet, context: Context): boolean { 
        return types.list().every(type =>
        // If they have one, then they must be compable, and if there is a value type, they must be compatible.
            type instanceof SetType &&
                (
                    // If the key type isn't specified, any will do.
                    this.key === undefined ||
                    (
                        this.key instanceof Type &&
                        type.key instanceof Type &&
                        this.key.accepts(type.key, context)
                    )
                )
        );
    }

    getNativeTypeName(): NativeTypeName { return "set"; }

    resolveTypeVariable(name: string): Type | undefined { 
        return Object.values(SET_TYPE_VAR_NAMES).includes(name) && this.key instanceof Type ? this.key : undefined;
    };

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A set type"
        }
    }

}