import { describe, expect, it } from 'vitest'
import { examples, parseAmount, run, type Out } from '../src/engine'
import { normalInverse } from '../src/defs/customers-ops'
import { CALCULATORS, CALCULATOR_SLUGS, calculatorBySlug } from '../src/registry'

/** Run a calculator from its example inputs, overriding some, keyed by output. */
function calc(slug: string, over: Record<string, string | number> = {}, set: 'en' | 'ar' = 'en') {
  const def = calculatorBySlug(slug)
  if (!def) throw new Error(`no calculator ${slug}`)
  const raw = { ...examples(def, set), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) }
  return Object.fromEntries(run(def, raw).map(o => [o.key, o])) as Record<string, Out>
}
const num = (o: Out) => o.value as number
/** Money outputs are minor units; compare in major units. */
const money = (o: Out) => num(o) / 100

describe('registry', () => {
  it('has unique slugs that end in -calculator', () => {
    expect(new Set(CALCULATOR_SLUGS).size).toBe(CALCULATOR_SLUGS.length)
    for (const s of CALCULATOR_SLUGS) expect(s).toMatch(/^[a-z0-9-]+-calculator$/)
  })

  it('links every calculator to three existing calculators', () => {
    for (const c of CALCULATORS) {
      expect(c.related, c.slug).toHaveLength(3)
      for (const r of c.related) expect(CALCULATOR_SLUGS, `${c.slug} → ${r}`).toContain(r)
    }
  })

  it.each(['en', 'ar'] as const)('gives every calculator a real first result with the %s examples', set => {
    for (const c of CALCULATORS) {
      const [first] = run(c, examples(c, set))
      expect(first.value, c.slug).not.toBeNull()
    }
  })
})

describe('engine', () => {
  it('parses Arabic-Indic digits and separators', () => {
    expect(parseAmount('١٢٬٣٤٥٫٥')).toBe(12345.5)
    expect(parseAmount('1,250')).toBe(1250)
  })

  it('turns an empty or zero denominator into null, never Infinity or NaN', () => {
    expect(calc('roas-calculator', { spend: 0 }).roas.value).toBeNull()
    expect(calc('ad-metrics-calculator', { orders: '' }).cpa.value).toBeNull()
  })

  it('keeps money in whole minor units', () => {
    const r = calc('margin-markup-calculator', { cost: '19.99', price: '49.99' })
    expect(num(r.profit)).toBe(3000)
    expect(Number.isInteger(num(r.priceForTarget))).toBe(true)
  })
})

// Worked examples published by the source tools.
describe('formulas match the source tools', () => {
  it('Landerlab: price 100, cost 25 → 75% margin, 1.33× break-even ROAS', () => {
    expect(num(calc('margin-markup-calculator', { cost: 25, price: 100 }).margin)).toBeCloseTo(0.75, 6)
    expect(num(calc('roas-calculator', { spend: 100, revenue: 200, margin: 75 }).breakEven)).toBeCloseTo(1.3333, 4)
  })

  it('Top Growth MER: 500k revenue, 120k marketing, 55% margin', () => {
    const r = calc('mer-calculator', { revenue: 500000, paid: 100000, email: 3000, agency: 15000, tools: 2000, margin: 55 })
    expect(num(r.mer)).toBeCloseTo(4.1667, 4)
    expect(num(r.breakEven)).toBeCloseTo(1.8182, 4)
  })

  it('Top Growth: 50% margin and a 15% net target need 2.86× ROAS', () => {
    expect(num(calc('roas-calculator', { margin: 50, netTarget: 15 }).targetRoas)).toBeCloseTo(2.8571, 4)
  })

  it('EasyApps and Top Growth: 20% off at 55% margin needs 57.1% more orders', () => {
    expect(num(calc('discount-calculator', { price: 100, cost: 45, discount: 20 }).liftNeeded)).toBeCloseTo(0.5714, 4)
  })

  it('Top Growth: free shipping at AOV 65, shipping 8, margin 55% → 80', () => {
    expect(money(calc('free-shipping-threshold-calculator', { aov: 65, shipping: 8, margin: 55 }).suggested)).toBe(80)
  })

  it('JeriCommerce: 85 × 2.8 × 2 years = 476 revenue CLV, 238 at 50% margin', () => {
    const r = calc('customer-lifetime-value-calculator', { aov: 85, frequency: 2.8, years: 2, margin: 50 })
    expect(money(r.revenueClv)).toBe(476)
    expect(money(r.profitClv)).toBe(238)
  })

  it('Profitly: max ad cost per placed order = margin × confirm × deliver', () => {
    const r = calc('max-cpa-calculator', { price: 3000, cogs: 1500, shipping: 500, fees: 0, confirm: 70, deliver: 80 })
    expect(money(r.ignoringReturns)).toBe(560)
  })

  it('Commmerce COD: 800 delivered × 240 − 200 returned × 100 = 172,000', () => {
    const r = calc('cod-profit-calculator', {
      placed: 1000, price: 500, cogs: 200, shipping: 60, returnFee: 40, codFee: 0, confirm: 100, deliver: 80, ads: 0, unsellable: 0,
    })
    expect(money(r.profit)).toBe(172000)
  })

  it('counts unsellable returned stock as a loss when asked', () => {
    const base = { placed: 1000, price: 500, cogs: 200, shipping: 60, returnFee: 40, codFee: 0, confirm: 100, deliver: 80, ads: 0 }
    const lost = money(calc('cod-profit-calculator', { ...base, unsellable: 0 }).profit) - money(calc('cod-profit-calculator', { ...base, unsellable: 50 }).profit)
    expect(lost).toBe(200 * 200 * 0.5)
  })

  it('EasyApps A/B: 2,000 visitors/day, 1.5% base, 20% lift → ~28.3k per variant', () => {
    expect(num(calc('ab-test-duration-calculator').perVariant)).toBe(28304)
    expect(normalInverse(0.975)).toBeCloseTo(1.96, 3)
  })

  it('Commmerce EOQ = √(2DS/H)', () => {
    const r = calc('reorder-point-calculator', { daily: 10, orderCost: 100, unitCost: 10, holding: 20 })
    expect(num(r.eoq)).toBeCloseTo(Math.sqrt((2 * 3650 * 100) / 2), 6)
  })

  it('Commmerce volumetric: 40 × 30 × 20 ÷ 5000 = 4.8 kg, billed on the box', () => {
    const r = calc('volumetric-weight-calculator')
    expect(num(r.volumetric)).toBeCloseTo(4.8, 6)
    expect(r.billedOn.value).toBe('box')
  })
})

describe("Analify's own rules", () => {
  it('ranks couriers by profit, not by the cheapest fee', () => {
    const r = calc('courier-cost-calculator')
    expect(r.cheapest.value).toBe('b')
    expect(r.best.value).toBe('c')
  })

  it('charges returned orders when working out max cost per placed order', () => {
    const r = calc('max-cpa-calculator')
    expect(num(r.maxPerOrder)).toBeLessThan(num(r.ignoringReturns))
  })

  it('does not count a refund as a cost when the goods come back to be resold', () => {
    const r = calc('returns-cost-calculator', { aov: 100, cogs: 40, out: 10, back: 10, handling: 0, resold: 100 })
    // Lost margin (100 − 40 − 10) + out-of-pocket shipping (10 + 10), not the 100 refund.
    expect(money(r.perReturn)).toBe(70)
  })
})

