import type Node from "./Node";
import BooleanType from "./BooleanType";
import Conflict, { IncompatibleOperand } from "../parser/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import Unit from "./Unit";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";
import Bool from "../runtime/Bool";
import Measurement from "../runtime/Measurement";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly operand: Expression | Unparsable;

    constructor(operator: Token, value: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.operand = value;
    }

    getChildren() {
        return [ this.operator, this.operand ];
    }

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        // If the type is unknown, that's bad.
        const type = this.operand instanceof Expression ? this.operand.getType(program) : undefined;

        // If the type doesn't match the operator, that's bad.
        if(this.operand instanceof Expression && (this.operator.text === "√" || this.operator.text === "-") && !(type instanceof MeasurementType))
            conflicts.push(new IncompatibleOperand(this.operand, this.operator, new MeasurementType()));
        else if(this.operand instanceof Expression && this.operator.text === "¬" && !(type instanceof BooleanType))
            conflicts.push(new IncompatibleOperand(this.operand, this.operator, new BooleanType()));

        return conflicts;
    
    }

    getType(program: Program): Type {
        if(this.operator.text === "¬") return new BooleanType();
        else if(this.operator.text === "√" && this.operand instanceof Expression) {
            const type = this.operand.getType(program);
            if(!(type instanceof MeasurementType)) return new UnknownType(this);
            if(type.unit ===  undefined || type.unit instanceof Unparsable) return type;
            const newNumerator = type.unit.numerator.slice();
            const newDenominator = type.unit.denominator.slice();
            // If it has a unit, remove one of each unique unit on the numerator, and if it's the last one, move it to the denominator.
            // For example:
            //   m·m·m => m·m
            //   m => 1/m
            //   1/m => 1/m·m
            const numeratorUnits = [ ... new Set(type.unit.numerator) ];
            const denominatorUnits = [ ... new Set(type.unit.denominator) ];
            // Remove one of each numerator unit from the numerator.
            numeratorUnits.forEach(u => newNumerator.splice(newNumerator.indexOf(u), 1));
            // Add an extra of each denominator unit to the denominator.
            denominatorUnits.forEach(u => newDenominator.push(u));
            // For each numerator unit no longer in the numerator, add one unit to the denominator.
            numeratorUnits.forEach(u => { if(newNumerator.indexOf(u) < 0) newDenominator.push(u); });
            return new MeasurementType(undefined, new Unit(newNumerator, newDenominator));
        } 
        else if(this.operator.text === "-" && this.operand instanceof Expression)
            return this.operand.getType(program);
        else return new UnknownType(this);
    }
    
    evaluate(evaluator: Evaluator): Value | Node {

        // If the operand hasn't been evaluated, evaluate it.
        if(!evaluator.justEvaluated(this.operand))
            return this.operand;

        // Get the value of the operand.
        const value = evaluator.popValue();

        // Compute the new value based on the operator.
        if(this.operator.text === "¬") {
            return value instanceof Bool ?
                new Bool(!value.bool) :
                new Exception(ExceptionType.INCOMPATIBLE_TYPE);
        }
        else if(this.operator.text === "√") {
            return value instanceof Measurement ?
                new Measurement(Math.sqrt(value.number), value.unit) :
                new Exception(ExceptionType.INCOMPATIBLE_TYPE);
        } 
        else if(this.operator.text === "-") {
            return value instanceof Measurement ?
                new Measurement(-value.number, value.unit) :
                new Exception(ExceptionType.INCOMPATIBLE_TYPE);
        }
        else return new Exception(ExceptionType.UNKNOWN_OPERATOR);

    }

}