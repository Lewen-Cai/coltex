import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { matchPeople, mentionQuery, mentionsToText, rememberPick, splitMentions, textToMentions } from '../src/lib/mentions.ts'

const people = [
  { userId: 'u1', name: 'Ann', email: 'ann@lab.test' },
  { userId: 'u2', name: 'Ann Lee', email: 'lee@lab.test' },
  { userId: 'u3', name: '张三', email: 'zs@lab.test' },
  { userId: 'u4', name: 'Bob', email: 'bob@lab.test' },
]

describe('mentions', () => {
  test('typed names become tokens, longest first, on word boundaries', () => {
    assert.equal(textToMentions('@Ann Lee and @Ann, not @Anna', people), '<@u2> and <@u1>, not @Anna')
    assert.equal(textToMentions('请@张三看一下', people), '请<@u3>看一下')
    assert.equal(textToMentions('mail bob@Bob.org', people), 'mail bob@Bob.org')
    assert.equal(textToMentions('@Carol hi', people), '@Carol hi')
  })

  test('tokens become names for editing and survive a round trip', () => {
    const names = new Map(people.map(p => [p.userId, p.name]))
    const text = mentionsToText('<@u2> and <@u3>, <@gone>', names)
    assert.equal(text, '@Ann Lee and @张三, <@gone>')
    assert.equal(textToMentions(text, people), '<@u2> and <@u3>, <@gone>')
  })

  test('the last pick decides between people with the same name', () => {
    const twins = [...people, { userId: 'u5', name: 'Bob' }]
    assert.equal(textToMentions('@Bob', twins), '<@u4>')
    rememberPick({ userId: 'u5', name: 'Bob' })
    assert.equal(textToMentions('@Bob', twins), '<@u5>')
  })

  test('split and query', () => {
    assert.deepEqual(splitMentions('hi <@u1>!'), [{ text: 'hi ' }, { userId: 'u1' }, { text: '!' }])
    assert.deepEqual(mentionQuery('hello @An', 9), { start: 6, query: 'An' })
    assert.deepEqual(mentionQuery('@Ann L', 6), { start: 0, query: 'Ann L' })
    assert.equal(mentionQuery('mail a@b', 8), null)
    assert.equal(mentionQuery('@ x', 3), null)
    assert.deepEqual(matchPeople(people, 'le').map(p => p.name), ['Ann Lee'])
    assert.deepEqual(matchPeople(people, 'ann').map(p => p.name), ['Ann', 'Ann Lee'])
    assert.deepEqual(matchPeople(people, 'zs').map(p => p.name), ['张三'])
  })
})
