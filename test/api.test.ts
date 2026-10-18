import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as lib from '../src'
import { calculate, codProfit, courierCost, discount, roas, salesForecast, volumetricWeight } from '../src'
import { fnName, generateSource, withReference } from '../scripts/generate'

describe('public units', () => {
  it('takes money in normal units and percents as whole numbers', () => {
    const r = roas({ spend: 8000, revenue: 26000, margin: 45, netTarget: 10 })
    expect(r.roas).toBe(3.25)
    expect(r.profit).toBe(3700)
    expect(r.breakEven).toBeCloseTo(2.2222, 4)
    expect(r.adShare).toBeCloseTo(30.7692, 4)
  })

  it('returns percents as whole numbers without float noise', () => {
    expect(discount({ price: 100, cost: 45, discount: 20, orders: 500, lift: 30 }).liftNeeded).toBeCloseTo(57.142857, 5)
    expect(lib.marginMarkup({ cost: 55, price: 100, target: 50 }).margin).toBe(45)
  })

  it('rounds money to the cent', () => {
    const r = lib.marginMarkup({ cost: 19.99, price: 49.99, target: 50 })
    expect(r.profit).toBe(30)
    const price = r.priceForTarget ?? Number.NaN
    expect(price).toBe(Math.round(price * 100) / 100)
    expect(price).toBe(39.98)
  })

  it('gives null, never NaN or Infinity, when a result cannot be computed', () => {
    const r = roas({ spend: 0, revenue: 26000, margin: 45, netTarget: 10 })
    expect(r.roas).toBeNull()
    expect(r.poas).toBeNull()
    expect(calculate('ad-metrics-calculator', {}).cpa).toBeNull()
  })

  it('returns choices as their keys and series as money values', () => {
    expect(courierCost({ price: 60, cogs: 22, shipments: 1000, aFee: 7.5, aReturn: 3, aRate: 72, bFee: 6, bReturn: 4, bRate: 64, cFee: 8, cReturn: 2.5, cRate: 78 }).best).toBe('c')
    expect(volumetricWeight({ length: 40, width: 30, height: 20, actual: 2, divisor: 5000 }).billedOn).toBe('box')
    const f = salesForecast({ base: 40000, growth: 5, months: 2 })
    expect(f.trend).toEqual([42000, 44100])
    expect(f.final).toBe(44100)
  })

  it('matches the Commmerce COD worked example through the public API', () => {
    const r = codProfit({ placed: 1000, price: 500, cogs: 200, shipping: 60, returnFee: 40, codFee: 0, confirm: 100, deliver: 80, ads: 0, unsellable: 0 })
    expect(r.profit).toBe(172000)
  })

  it('rejects an unknown slug with a clear error', () => {
    expect(() => calculate('nope', {})).toThrow('Unknown calculator "nope".')
  })
})

describe('generated API', () => {
  it('exports one function per calculator', () => {
    for (const slug of lib.CALCULATOR_SLUGS) expect(typeof (lib as Record<string, unknown>)[fnName(slug)], slug).toBe('function')
  })

  it('is up to date with the definitions (run `npm run generate`)', () => {
    const root = join(__dirname, '..')
    expect(readFileSync(join(root, 'src', 'calculators.ts'), 'utf8')).toBe(generateSource())
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    expect(readme).toBe(withReference(readme))
  })
})
