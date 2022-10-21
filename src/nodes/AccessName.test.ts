import { testConflict } from "../conflicts/TestUtilities";
import { UnknownProperty } from "../conflicts/UnknownProperty";
import Evaluator from "../runtime/Evaluator";
import AccessName from "./AccessName";
import Text from "../runtime/Text";
import { test, expect } from "vitest";

test("Test access name conflicts", () => {

    testConflict('•Cat(name•"") ()\nboomy: Cat("boom")\nboomy.name', '•Cat(name•"") ()\nboomy: Cat("boom")\nboomy.nam', AccessName, UnknownProperty);

});

test("Test access evaluate", () => {

    expect(Evaluator.evaluateCode("•Cat(name•'') ()\nCat('boomy').name")).toBeInstanceOf(Text);

});