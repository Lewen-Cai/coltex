import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { passwordProblem, passwordScore, passwordStrength } from '@coltex/shared'

describe('password rules', () => {
  test('8 characters with upper, lower case and a digit; symbols optional', () => {
    assert.equal(passwordProblem('Abcdefg1'), undefined)
    for (const p of ['Abcdef1', 'abcdefg1', 'ABCDEFG1', 'Abcdefgh', '']) assert.ok(passwordProblem(p), p)
    assert.ok(passwordProblem(`Aa1${'x'.repeat(126)}`))
  })

  test('strength: weak, fair, good, strong', () => {
    assert.equal(passwordStrength(''), 0)
    assert.equal(passwordStrength('abcdefg1'), 1)
    assert.equal(passwordStrength('Tiger7mo'), 2)
    assert.equal(passwordStrength('Tiger7mountain'), 3)
    assert.equal(passwordStrength('Tiger7mountain!'), 4)
    assert.equal(passwordStrength('Tiger7-mountain-river'), 4)
    assert.equal(passwordStrength('Tiger7mountainriver'), 4)
    // Predictable patterns cost a level, never below fair.
    assert.equal(passwordStrength('Password1234'), 2)
    assert.equal(passwordStrength('Aaaa1111bbbb'), 2)
  })

  test('the bar fills one segment per rule met, then for length and symbols', () => {
    assert.deepEqual(['', 'a', 'aB', 'aB1', 'aB1cdefg', 'aB1cdefghijk', 'aB1cdefghijk!'].map(passwordScore), [0, 1, 2, 3, 4, 5, 6])
    // Any order of rules counts the same; a long run without other rules stays below fair.
    assert.equal(passwordScore('12345678'), 2)
    assert.equal(passwordScore('ABCDEFGHIJKLMNOPQRS'), 2)
    assert.equal(passwordScore('abcdefghijklmnop!'), 2)
  })
})
