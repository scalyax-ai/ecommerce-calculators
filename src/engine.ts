/**
 * Calculator engine. Pure: no I/O, no UI, no dependencies. Each calculator
 * is a definition (inputs + compute) in defs/*.ts; the typed functions in
 * calculators.ts wrap them with named inputs and results.
 *
 * Units at the boundary (internal API):
 *  - money inputs become integer minor units (cents) once, in `run`;
 *    money outputs stay in minor units and are rounded to integers here,
 *  - percentage inputs become fractions (12.5 → 0.125),
 *  - any non-finite result becomes null.
 */

export type Unit = 'money' | 'pct' | 'count' | 'num' | 'x' | 'days' | 'kg' | 'cm' | 'select'

/** Where this number usually comes from in a store's stack. */
export type Fill = 'shopify' | 'ads' | 'courier' | 'finance' | 'analytics'

/** Example value: one number for every locale, or [en, ar] when money scale differs. */
export type Example = number | string | [number, number]

export type InputDef = {
  key: string
  unit: Unit
  ex: Example
  fill?: Fill
  /** Option keys for `select` inputs (labels in messages). */
  options?: string[]
}

export type OutKind =
  | 'money'
  | 'pct'
  | 'x'
  | 'count'
  | 'num'
  | 'days'
  | 'months'
  | 'kg'
  | 'choice'
  | 'series'

export type Tone = 'good' | 'bad' | 'warn'

export type Out = {
  key: string
  kind: OutKind
  value: number | string | number[] | null
  tone?: Tone
}

export type Group =
  | 'profit'
  | 'ads'
  | 'delivery'
  | 'offers'
  | 'customers'
  | 'conversion'
  | 'inventory'

export type Values = Record<string, number | string>

export type CalcDef = {
  slug: string
  group: Group
  inputs: InputDef[]
  compute: (v: Values) => Out[]
  related: string[]
}

export type ExampleSet = 'en' | 'ar'

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Parse a typed amount: accepts Arabic-Indic digits and thousands separators. */
export function parseAmount(x: string): number {
  const s = x
    .replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))
    .replace(/[,\s٬]/g, '')
    .replace('٫', '.')
  return s === '' ? Number.NaN : Number(s)
}

/** a ÷ b, or NaN when b is 0 (cleaned to null by `run`). */
export const div = (a: number, b: number) => (b ? a / b : Number.NaN)

/** Read a numeric input inside compute. */
export const n = (v: Values, k: string) => Number(v[k])

export function exampleValue(i: InputDef, set: ExampleSet): string {
  const e = Array.isArray(i.ex) ? i.ex[set === 'ar' ? 1 : 0] : i.ex
  return String(e)
}

export function examples(def: CalcDef, set: ExampleSet): Record<string, string> {
  return Object.fromEntries(def.inputs.map(i => [i.key, exampleValue(i, set)]))
}

/** Raw text inputs → typed values → finished, cleaned outputs. */
export function run(def: CalcDef, raw: Record<string, string>): Out[] {
  const v: Values = {}
  for (const i of def.inputs) {
    const r = raw[i.key] ?? ''
    if (i.unit === 'select') {
      v[i.key] = i.options?.includes(r) ? r : (i.options?.[0] ?? '')
      continue
    }
    const x = parseAmount(r)
    v[i.key] =
      i.unit === 'money' ? Math.round(x * 100) : i.unit === 'pct' ? x / 100 : x
  }
  return def.compute(v).map(clean)
}

function clean(o: Out): Out {
  if (o.kind === 'choice') return o
  if (o.kind === 'series') {
    const s = o.value as number[]
    return s.every(Number.isFinite) ? { ...o, value: s.map(Math.round) } : { ...o, value: null }
  }
  const x = o.value as number | null
  if (x === null || !Number.isFinite(x)) return { key: o.key, kind: o.kind, value: null }
  return { ...o, value: o.kind === 'money' ? Math.round(x) : x }
}

/** Tone by sign: profit ≥ 0 is good, below 0 is bad. */
export const sign = (x: number): Tone => (x >= 0 ? 'good' : 'bad')
