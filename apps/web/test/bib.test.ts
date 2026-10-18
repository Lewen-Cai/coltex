import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { filterEntries, parseBib } from '../src/references/bib.ts'

const BIB = String.raw`% A comment
@string{nat = "Nature"}
@article{Harris_2020,
  title = {Array programming with {NumPy}},
  author = {Harris, Charles R. and Millman, K. Jarrod and van der Walt, St{\'e}fan J.},
  journal = nat,
  year = 2020,
  doi = {10.1038/s41586-020-2649-2}
}

@inproceedings{vaswani2017,
  title = "Attention Is All You Need",
  author = {Ashish Vaswani and Noam Shazeer},
  booktitle = {Advances in Neural Information Processing Systems},
  date = {2017-12},
}
@comment{ignored, x}
@book{张三2021, title = {深度学习与{LaTeX}}, author = {张三 and 李四}, publisher = {清华大学出版社}, year = {2021}}
`

describe('bibliography parsing for the citation picker', () => {
  test('keys, titles, surnames, years and venues', () => {
    const entries = parseBib('refs.bib', BIB)
    assert.deepEqual(
      entries.map(e => [e.key, e.type, e.title, e.authors, e.year, e.venue]),
      [
        ['Harris_2020', 'article', 'Array programming with NumPy', 'Harris, Millman, van der Walt', '2020', 'nat'],
        ['vaswani2017', 'inproceedings', 'Attention Is All You Need', 'Vaswani, Shazeer', '2017', 'Advances in Neural Information Processing Systems'],
        ['张三2021', 'book', '深度学习与LaTeX', '张三, 李四', '2021', '清华大学出版社'],
      ],
    )
  })

  test('search matches every word anywhere in the entry', () => {
    const entries = parseBib('refs.bib', BIB)
    assert.deepEqual(filterEntries(entries, 'attention 2017').map(e => e.key), ['vaswani2017'])
    assert.deepEqual(filterEntries(entries, 'numpy harris').map(e => e.key), ['Harris_2020'])
    assert.deepEqual(filterEntries(entries, '深度').map(e => e.key), ['张三2021'])
    assert.equal(filterEntries(entries, '').length, 3)
  })
})
