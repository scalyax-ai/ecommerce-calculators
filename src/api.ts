/**
 * Public, unit-friendly API over the engine.
 *
 *  - Money in and out is in normal currency units (45.5 = 45.50). Internally
 *    the engine works in integer cents and rounds money results to the cent.
 *  - Percentages in and out are whole percents (45 = 45%).
 *  - Multiples (ROAS, MER…) are plain numbers (3.25 = 3.25×).
 *  - A result that cannot be computed (divide by zero, no break-even point)
 *    is `null`, never NaN or Infinity.
 *
 * The calculators are currency-agnostic: pass every money value in one
 * currency and read the results in that currency.
 */
import { run, type CalcDef, type Out } from './engine'
import { calculatorBySlug } from './registry'

export type InputValue = number | string
export type ResultValue = number | string | number[] | null

/** Round away float noise from unit conversion (0.45 × 100 → 45, not 45.00000000000001). */
const clean = (x: number) => Math.round(x * 1e10) / 1e10

function toPublic(o: Out): ResultValue {
  if (o.value === null) return null
  if (o.kind === 'choice') return String(o.value)
  if (o.kind === 'series') return (o.value as number[]).map(v => v / 100)
  const v = o.value as number
  if (o.kind === 'money') return v / 100
  if (o.kind === 'pct') return clean(v * 100)
  return clean(v)
}

/** The definition for a slug, or an error naming the valid slugs. */
export function definition(slug: string): CalcDef {
  const def = calculatorBySlug(slug)
  if (!def) throw new Error(`Unknown calculator "${slug}".`)
  return def
}

/**
 * Run any calculator by slug. Missing inputs fall back to nothing: every
 * input is required, and a missing one makes the results that need it null.
 */
export function calculate(slug: string, inputs: Record<string, InputValue>): Record<string, ResultValue> {
  const def = definition(slug)
  const raw: Record<string, string> = {}
  for (const i of def.inputs) {
    const v = inputs[i.key]
    raw[i.key] = v === undefined ? '' : String(v)
  }
  return Object.fromEntries(run(def, raw).map(o => [o.key, toPublic(o)]))
}
