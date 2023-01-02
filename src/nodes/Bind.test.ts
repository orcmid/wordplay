import { test, expect } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import UnusedBind from '../conflicts/UnusedBind';
import IncompatibleBind from '../conflicts/IncompatibleBind';
import DuplicateNames from '../conflicts/DuplicateNames';
import Evaluator from '../runtime/Evaluator';
import Bind from './Bind';
import Names from './Names';
import { MisplacedShare } from '../conflicts/MisplacedShare';
import { MissingShareLanguages } from '../conflicts/MissingShareLanguages';

test.each([
    ['a, b: 1\na', 'a, a: 1\na', Names, DuplicateNames],
    ['a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleBind],
    ['a•#: 1\na', 'a•"cat"|"dot": "mouse"\na', Bind, IncompatibleBind],
    ['a•#: 1\na', 'a•1|2: 3\na', Bind, IncompatibleBind],
    ['a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind],
    ['↑ a: 1', 'ƒ() (↑ a: 1)', Bind, MisplacedShare],
    ['↑ a/eng: 1', '↑ a: 1', Bind, MissingShareLanguages],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    }
);

test('Test binding logic', () => {
    expect(Evaluator.evaluateCode('a: 5\na')?.toString()).toBe('5');
});

test.each([['a: 5\na', '5']])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(code)?.toString()).toBe(value);
});
