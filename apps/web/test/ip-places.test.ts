import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeNames as names } from '../src/lib/ip-places.ts'
import en from '../src/lib/place-names/en.ts'
import zhTW from '../src/lib/place-names/zh-TW.ts'
import ja from '../src/lib/place-names/ja.ts'
import de from '../src/lib/place-names/de.ts'

import zhCN from '../src/lib/place-names/zh-CN.ts'

const TABLES: Record<string, typeof en | null> = { 'zh-CN': zhCN, 'zh-TW': zhTW, en, ja, de, fr: en }
const placeNames = (place: Parameters<typeof names>[0], locale: string) => names(place, locale, TABLES[locale] ?? null)

const shenzhen = { kind: 'public' as const, country: 'CN', region: '广东省', city: '深圳市', isp: '电信' }

test('places in China: Chinese in simplified Chinese, traditional in zh-TW, English elsewhere', () => {
  assert.deepEqual(placeNames(shenzhen, 'zh-CN'), { where: ['中国', '广东省', '深圳市'], operator: '电信' })
  assert.deepEqual(placeNames(shenzhen, 'zh-TW'), { where: ['中國', '廣東省', '深圳市'], operator: '電信' })
  assert.deepEqual(placeNames(shenzhen, 'en'), { where: ['China', 'Guangdong', 'Shenzhen'], operator: 'China Telecom' })
  assert.deepEqual(placeNames(shenzhen, 'de'), { where: ['China', 'Guangdong', 'Shenzhen'], operator: 'China Telecom' })
  // Japanese writes Chinese places in kanji.
  assert.deepEqual(placeNames(shenzhen, 'ja'), { where: ['中国', '広東省', '深圳市'], operator: '中国電信' })
})

test('an operator without a translation is left out in other languages', () => {
  const rare = { ...shenzhen, isp: '某某宽带' }
  assert.equal(placeNames(rare, 'zh-CN').operator, '某某宽带')
  assert.equal(placeNames(rare, 'en').operator, null)
})

test('elsewhere: the country named in the language, the rest as the database writes it', () => {
  const miami = { kind: 'public' as const, country: 'US', region: 'Florida', city: 'Miami', isp: 'Google LLC' }
  assert.deepEqual(placeNames(miami, 'zh-CN'), { where: ['美国', '佛罗里达州', 'Miami'], operator: 'Google LLC' })
  assert.deepEqual(placeNames(miami, 'ja').where, ['アメリカ合衆国', 'フロリダ州', 'Miami'])
  assert.deepEqual(placeNames({ kind: 'public', country: 'DE', region: 'State of Berlin' }, 'en').where, ['Germany', 'Berlin'])
  // A region without a name in the language stays as it is.
  assert.deepEqual(placeNames({ kind: 'public', country: 'GB', region: 'Hounslow' }, 'zh-CN').where, ['英国', 'Hounslow'])
})

test('Hong Kong and Macao as special administrative regions; Taiwan as 中国 台湾省 in simplified Chinese only', () => {
  const hk = { kind: 'public' as const, country: 'HK' }
  assert.deepEqual(placeNames(hk, 'zh-CN').where, ['中国', '香港特别行政区'])
  assert.deepEqual(placeNames(hk, 'en').where, ['Hong Kong SAR'])
  assert.deepEqual(placeNames({ kind: 'public', country: 'MO' }, 'zh-TW').where, ['澳門特別行政區'])
  assert.deepEqual(placeNames({ kind: 'public', country: 'MO' }, 'de').where, ['Sonderverwaltungszone Macau'])
  const taipei = { kind: 'public' as const, country: 'TW', city: '台北市', isp: '中华电信' }
  assert.deepEqual(placeNames(taipei, 'zh-CN'), { where: ['中国', '台湾省', '台北市'], operator: '中华电信' })
  assert.deepEqual(placeNames(taipei, 'zh-TW'), { where: ['台灣', '臺北市'], operator: '中華電信' })
  assert.deepEqual(placeNames(taipei, 'en'), { where: ['Taiwan', 'Taipei'], operator: 'Chunghwa Telecom' })
})

test('every language has every name', async () => {
  const fs = await import('node:fs')
  const dir = new URL('../src/lib/place-names/', import.meta.url)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'))
  assert.equal(files.length, 14)
  for (const file of files.filter(f => f !== 'zh-CN.ts')) {
    const table = (await import(new URL(file, dir).href)).default as typeof en
    assert.deepEqual(Object.keys(table.places).sort(), Object.keys(en.places).sort(), file)
    assert.deepEqual(Object.keys(table.operators).sort(), Object.keys(en.operators).sort(), file)
    for (const value of [...Object.values(table.places), ...Object.values(table.operators)]) assert.ok(value.trim(), file)
  }
})
