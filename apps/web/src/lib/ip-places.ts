// Where a sign-in's address is, in the interface's language. The server sends the parts of the
// place as ip2region writes them (ISO country, region, city, network operator; in Chinese for
// places in China). Countries are named by the browser (Intl); the Chinese names have a table per
// language in place-names/<locale>.ts, loaded when needed, with other countries' first-level
// regions (Wikidata's names, matched through GeoNames; cities stay as the database has them): every
// region and city name in the databases' sources (data/ipv4_source.txt, ipv6_source.txt @
// 1bf6cabfb63c1a14af0971749c2120a3e5c77d72), and the network operators that cover nearly all
// addresses; an operator not listed is left out in other languages. Hong Kong, Macao and Taiwan
// come from the server as places of their own.
import { useEffect, useState } from 'react'
import type { IpPlace } from '@coltex/shared'

/**
 * One language's names: for the Chinese place and operator names (keyed by the simplified form;
 * none in simplified Chinese), and for other countries' first-level regions, keyed "US|Florida"
 * (from Wikidata, user's decision 2026-10-25: regions only, cities stay as the database has them).
 */
export type PlaceNames = { places: Record<string, string>; operators: Record<string, string>; regions: Record<string, string> }

const HAN = /\p{Script=Han}/u

const loaded = new Map<string, PlaceNames>()

/** The names for a language, loaded once. */
export async function loadPlaceNames(locale: string): Promise<PlaceNames | null> {
  const cached = loaded.get(locale)
  if (cached) return cached
  // Inside the function: Vite turns this into one lazy chunk per language; tests never call it.
  const tables = import.meta.glob<{ default: PlaceNames }>('./place-names/*.ts')
  const load = tables[`./place-names/${locale}.ts`] ?? tables['./place-names/en.ts']!
  const names = (await load()).default
  loaded.set(locale, names)
  return names
}

/** The current language's names, once loaded (undefined while loading). */
export function usePlaceNames(locale: string): PlaceNames | null | undefined {
  const [names, setNames] = useState<PlaceNames | null | undefined>(() => loaded.get(locale))
  useEffect(() => {
    let live = true
    loadPlaceNames(locale).then(
      n => live && setNames(n),
      () => live && setNames(null),
    )
    return () => {
      live = false
    }
  }, [locale])
  return names
}

/** One name from the database: as it is when not Chinese or in simplified Chinese, else from the table (null without). */
function localName(name: string | undefined, table: Record<string, string> | undefined, locale: string): string | null {
  if (!name || !HAN.test(name) || locale === 'zh-CN') return name ?? null
  return table?.[name] ?? null
}

const SAR: Record<string, [hongKong: string, macao: string]> = {
  en: ['Hong Kong SAR', 'Macao SAR'],
  'zh-CN': ['香港特别行政区', '澳门特别行政区'],
  'zh-TW': ['香港特別行政區', '澳門特別行政區'],
  ja: ['香港特別行政区', 'マカオ特別行政区'],
  ko: ['홍콩 특별행정구', '마카오 특별행정구'],
  es: ['RAE de Hong Kong', 'RAE de Macao'],
  fr: ['RAS de Hong Kong', 'RAS de Macao'],
  de: ['Sonderverwaltungszone Hongkong', 'Sonderverwaltungszone Macau'],
  'pt-BR': ['RAE de Hong Kong', 'RAE de Macau'],
  it: ['RAS di Hong Kong', 'RAS di Macao'],
  ru: ['САР Гонконг', 'САР Макао'],
  tr: ['Hong Kong ÖİB', 'Makao ÖİB'],
  vi: ['Đặc khu hành chính Hồng Kông', 'Đặc khu hành chính Ma Cao'],
  id: ['Daerah Administratif Khusus Hong Kong', 'Daerah Administratif Khusus Makau'],
}

/** A country or region's name in the interface's language (Hong Kong and Macao with "SAR", as the browser names them). */
function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * The parts of a public address's place, for an interface language (a ColTex locale id) and its
 * names (`loadPlaceNames`): the country, region and city, then the network operator; repeats
 * left out.
 */
export function placeNames(place: IpPlace, locale: string, names: PlaceNames | null): { where: string[]; operator: string | null } {
  const where: string[] = []
  // Taiwan: "中国 台湾省" in simplified Chinese, its own name elsewhere; Hong Kong and Macao as
  // special administrative regions, "中国 香港特别行政区" in simplified Chinese (user's decisions
  // 2026-10-25).
  const sars = SAR[locale] ?? SAR.en!
  const sar = place.country === 'HK' ? sars[0] : place.country === 'MO' ? sars[1] : undefined
  const country =
    place.country === 'TW' && locale === 'zh-CN' ? ['中国', '台湾省']
    : sar ? [...(locale === 'zh-CN' ? ['中国'] : []), sar]
    : [place.country ? countryName(place.country, locale) : null]
  const region = place.region && !HAN.test(place.region) ? (names?.regions[`${place.country}|${place.region}`] ?? place.region) : localName(place.region, names?.places, locale)
  for (const part of [...country, region, localName(place.city, names?.places, locale)]) {
    if (part && !where.includes(part)) where.push(part)
  }
  return { where, operator: localName(place.isp, names?.operators, locale) }
}
