/** Customer, conversion, retention-channel and inventory calculators. */
import { type CalcDef, div, n, sign } from '../engine'

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normalInverse(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const tail = (q: number) =>
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)))
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)))
  const q = p - 0.5, r = q * q
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  )
}

const Z: Record<string, number> = { '90': 1.2816, '95': 1.6449, '99': 2.3263 }

export const CUSTOMERS_OPS: CalcDef[] = [
  {
    slug: 'customer-lifetime-value-calculator',
    group: 'customers',
    related: ['customer-acquisition-cost-calculator', 'retention-rate-calculator', 'loyalty-program-roi-calculator'],
    inputs: [
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'frequency', unit: 'num', ex: 2.2, fill: 'shopify' },
      { key: 'years', unit: 'num', ex: 2, fill: 'shopify' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'cac', unit: 'money', ex: [25, 150], fill: 'ads' },
      { key: 'ratio', unit: 'x', ex: 3 },
    ],
    compute: v => {
      const revenue = n(v, 'aov') * n(v, 'frequency') * n(v, 'years')
      const profit = revenue * n(v, 'margin'), ratio = div(profit, n(v, 'cac'))
      return [
        { key: 'profitClv', kind: 'money', value: profit },
        { key: 'revenueClv', kind: 'money', value: revenue },
        { key: 'ltvCac', kind: 'x', value: ratio, tone: ratio >= n(v, 'ratio') ? 'good' : 'warn' },
        { key: 'maxCac', kind: 'money', value: div(profit, n(v, 'ratio')) },
        { key: 'perYear', kind: 'money', value: n(v, 'aov') * n(v, 'frequency') },
      ]
    },
  },
  {
    slug: 'customer-acquisition-cost-calculator',
    group: 'customers',
    related: ['customer-lifetime-value-calculator', 'roas-calculator', 'mer-calculator'],
    inputs: [
      { key: 'spend', unit: 'money', ex: [15000, 120000], fill: 'ads' },
      { key: 'customers', unit: 'count', ex: 600, fill: 'shopify' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'frequency', unit: 'num', ex: 2.2, fill: 'shopify' },
      { key: 'years', unit: 'num', ex: 2, fill: 'shopify' },
    ],
    compute: v => {
      const cac = div(n(v, 'spend'), n(v, 'customers'))
      const perOrder = n(v, 'aov') * n(v, 'margin')
      const ltv = perOrder * n(v, 'frequency') * n(v, 'years')
      return [
        { key: 'payback', kind: 'months', value: div(cac, (perOrder * n(v, 'frequency')) / 12) },
        { key: 'cac', kind: 'money', value: cac },
        { key: 'firstOrder', kind: 'money', value: perOrder - cac, tone: sign(perOrder - cac) },
        { key: 'ordersToPayback', kind: 'num', value: div(cac, perOrder) },
        { key: 'ltvCac', kind: 'x', value: div(ltv, cac) },
      ]
    },
  },
  {
    slug: 'retention-rate-calculator',
    group: 'customers',
    related: ['customer-lifetime-value-calculator', 'loyalty-program-roi-calculator', 'email-list-value-calculator'],
    inputs: [
      { key: 'start', unit: 'count', ex: 2000, fill: 'shopify' },
      { key: 'end', unit: 'count', ex: 2100, fill: 'shopify' },
      { key: 'new', unit: 'count', ex: 400, fill: 'shopify' },
      { key: 'annual', unit: 'pct', ex: 50 },
    ],
    compute: v => {
      const lost = n(v, 'start') + n(v, 'new') - n(v, 'end'), churn = div(lost, n(v, 'start'))
      return [
        { key: 'retention', kind: 'pct', value: div(n(v, 'end') - n(v, 'new'), n(v, 'start')) },
        { key: 'churn', kind: 'pct', value: churn },
        { key: 'lost', kind: 'count', value: lost },
        { key: 'lifetime', kind: 'num', value: div(1, churn) },
        { key: 'monthlyFromAnnual', kind: 'pct', value: 1 - Math.pow(1 - n(v, 'annual'), 1 / 12) },
        { key: 'naive', kind: 'pct', value: n(v, 'annual') / 12 },
      ]
    },
  },
  {
    slug: 'loyalty-program-roi-calculator',
    group: 'customers',
    related: ['retention-rate-calculator', 'customer-lifetime-value-calculator', 'email-list-value-calculator'],
    inputs: [
      { key: 'customers', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'now', unit: 'pct', ex: 20, fill: 'shopify' },
      { key: 'with', unit: 'pct', ex: 25 },
      { key: 'repeats', unit: 'num', ex: 3, fill: 'shopify' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
    ],
    compute: v => {
      const extra = n(v, 'customers') * (n(v, 'with') - n(v, 'now'))
      const yearly = extra * n(v, 'aov') * n(v, 'repeats')
      return [
        { key: 'profit', kind: 'money', value: yearly * n(v, 'margin'), tone: sign(yearly) },
        { key: 'extraCustomers', kind: 'count', value: extra },
        { key: 'monthly', kind: 'money', value: extra * n(v, 'aov') },
        { key: 'yearly', kind: 'money', value: yearly },
      ]
    },
  },
  {
    slug: 'conversion-rate-calculator',
    group: 'conversion',
    related: ['cart-abandonment-calculator', 'ab-test-duration-calculator', 'ad-budget-calculator'],
    inputs: [
      { key: 'sessions', unit: 'count', ex: 50000, fill: 'analytics' },
      { key: 'orders', unit: 'count', ex: [900, 750], fill: 'shopify' },
      { key: 'revenue', unit: 'money', ex: [54000, 337500], fill: 'shopify' },
      { key: 'target', unit: 'pct', ex: [2.5, 2] },
    ],
    compute: v => {
      const aov = div(n(v, 'revenue'), n(v, 'orders')), at = n(v, 'sessions') * n(v, 'target')
      return [
        { key: 'rate', kind: 'pct', value: div(n(v, 'orders'), n(v, 'sessions')) },
        { key: 'rpv', kind: 'money', value: div(n(v, 'revenue'), n(v, 'sessions')) },
        { key: 'aov', kind: 'money', value: aov },
        { key: 'ordersAtTarget', kind: 'count', value: at },
        { key: 'extra', kind: 'money', value: (at - n(v, 'orders')) * aov, tone: sign((at - n(v, 'orders')) * aov) },
      ]
    },
  },
  {
    slug: 'cart-abandonment-calculator',
    group: 'conversion',
    related: ['conversion-rate-calculator', 'email-list-value-calculator', 'free-shipping-threshold-calculator'],
    inputs: [
      { key: 'started', unit: 'count', ex: 3000, fill: 'analytics' },
      { key: 'completed', unit: 'count', ex: 900, fill: 'shopify' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'recovery', unit: 'pct', ex: 10 },
    ],
    compute: v => {
      const left = n(v, 'started') - n(v, 'completed'), lost = left * n(v, 'aov')
      return [
        { key: 'rate', kind: 'pct', value: Math.max(0, 1 - div(n(v, 'completed'), n(v, 'started'))) },
        { key: 'lost', kind: 'money', value: lost, tone: 'bad' },
        { key: 'recoverable', kind: 'money', value: lost * n(v, 'recovery'), tone: 'good' },
        { key: 'carts', kind: 'count', value: left },
      ]
    },
  },
  {
    slug: 'ab-test-duration-calculator',
    group: 'conversion',
    related: ['conversion-rate-calculator', 'cart-abandonment-calculator', 'discount-calculator'],
    inputs: [
      { key: 'daily', unit: 'count', ex: 2000, fill: 'analytics' },
      { key: 'rate', unit: 'pct', ex: 1.5, fill: 'analytics' },
      { key: 'lift', unit: 'pct', ex: 20 },
      { key: 'confidence', unit: 'select', ex: '95', options: ['95', '99'] },
    ],
    compute: v => {
      const p1 = n(v, 'rate'), p2 = p1 * (1 + n(v, 'lift')), avg = (p1 + p2) / 2
      const za = normalInverse(1 - (v.confidence === '99' ? 0.01 : 0.05) / 2), zb = normalInverse(0.8)
      const top = za * Math.sqrt(2 * avg * (1 - avg)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
      const per = Math.ceil((top * top) / ((p2 - p1) * (p2 - p1)))
      return [
        { key: 'days', kind: 'days', value: Math.max(7, Math.ceil(per / (n(v, 'daily') / 2))) },
        { key: 'perVariant', kind: 'count', value: per },
        { key: 'total', kind: 'count', value: per * 2 },
        { key: 'conversions', kind: 'count', value: Math.ceil(per * p1) },
      ]
    },
  },
  {
    slug: 'email-list-value-calculator',
    group: 'conversion',
    related: ['cart-abandonment-calculator', 'retention-rate-calculator', 'loyalty-program-roi-calculator'],
    inputs: [
      { key: 'subscribers', unit: 'count', ex: 20000 },
      { key: 'sends', unit: 'count', ex: 8 },
      { key: 'open', unit: 'pct', ex: 35 },
      { key: 'click', unit: 'pct', ex: 8 },
      { key: 'cvr', unit: 'pct', ex: 3 },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cost', unit: 'money', ex: [400, 3000], fill: 'finance' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
    ],
    compute: v => {
      const per = n(v, 'open') * n(v, 'click') * n(v, 'cvr') * n(v, 'aov')
      const monthly = per * n(v, 'sends') * n(v, 'subscribers')
      const profit = monthly * n(v, 'margin') - n(v, 'cost')
      return [
        { key: 'monthly', kind: 'money', value: monthly },
        { key: 'profit', kind: 'money', value: profit, tone: sign(profit) },
        { key: 'roi', kind: 'pct', value: div(profit, n(v, 'cost')) },
        { key: 'perSubscriber', kind: 'money', value: per * n(v, 'sends') * 12 },
        { key: 'perSend', kind: 'money', value: per },
      ]
    },
  },
  {
    slug: 'reorder-point-calculator',
    group: 'inventory',
    related: ['inventory-turnover-calculator', 'sales-forecast-calculator', 'landed-cost-calculator'],
    inputs: [
      { key: 'daily', unit: 'count', ex: 20, fill: 'shopify' },
      { key: 'lead', unit: 'days', ex: 10 },
      { key: 'peak', unit: 'count', ex: 30, fill: 'shopify' },
      { key: 'longest', unit: 'days', ex: 14 },
      { key: 'demandSd', unit: 'count', ex: 6, fill: 'shopify' },
      { key: 'leadSd', unit: 'days', ex: 2 },
      { key: 'service', unit: 'select', ex: '95', options: ['90', '95', '99'] },
      { key: 'orderCost', unit: 'money', ex: [60, 500] },
      { key: 'unitCost', unit: 'money', ex: [9, 180], fill: 'shopify' },
      { key: 'holding', unit: 'pct', ex: 25 },
    ],
    compute: v => {
      const d = n(v, 'daily'), l = n(v, 'lead'), z = Z[String(v.service)] ?? Z['95']
      const ssMax = n(v, 'peak') * n(v, 'longest') - d * l
      const ssStat = z * Math.sqrt(l * n(v, 'demandSd') ** 2 + d * d * n(v, 'leadSd') ** 2)
      const yearly = d * 365
      const eoq = Math.sqrt(div(2 * yearly * n(v, 'orderCost'), n(v, 'unitCost') * n(v, 'holding')))
      return [
        { key: 'rop', kind: 'count', value: d * l + ssStat },
        { key: 'safety', kind: 'count', value: ssStat },
        { key: 'ropMax', kind: 'count', value: d * l + ssMax },
        { key: 'safetyMax', kind: 'count', value: ssMax },
        { key: 'eoq', kind: 'count', value: eoq },
        { key: 'ordersPerYear', kind: 'num', value: div(yearly, eoq) },
      ]
    },
  },
  {
    slug: 'inventory-turnover-calculator',
    group: 'inventory',
    related: ['reorder-point-calculator', 'sales-forecast-calculator', 'landed-cost-calculator'],
    inputs: [
      { key: 'cogs', unit: 'money', ex: [600000, 1200000], fill: 'shopify' },
      { key: 'inventory', unit: 'money', ex: [100000, 200000], fill: 'shopify' },
      { key: 'revenue', unit: 'money', ex: [1400000, 2500000], fill: 'shopify' },
      { key: 'stock', unit: 'count', ex: 800, fill: 'shopify' },
      { key: 'daily', unit: 'count', ex: 20, fill: 'shopify' },
      { key: 'lead', unit: 'days', ex: 10 },
    ],
    compute: v => {
      const t = div(n(v, 'cogs'), n(v, 'inventory')), left = div(n(v, 'stock'), n(v, 'daily'))
      return [
        { key: 'daysLeft', kind: 'days', value: left, tone: sign(left - n(v, 'lead')) },
        { key: 'reorderIn', kind: 'days', value: Math.max(0, left - n(v, 'lead')) },
        { key: 'turnover', kind: 'x', value: t },
        { key: 'daysToSell', kind: 'days', value: div(365, t) },
        { key: 'gmroi', kind: 'x', value: div(n(v, 'revenue') - n(v, 'cogs'), n(v, 'inventory')) },
      ]
    },
  },
  {
    slug: 'sales-forecast-calculator',
    group: 'inventory',
    related: ['ad-budget-calculator', 'inventory-turnover-calculator', 'reorder-point-calculator'],
    inputs: [
      { key: 'base', unit: 'money', ex: [40000, 300000], fill: 'shopify' },
      { key: 'growth', unit: 'pct', ex: 5 },
      { key: 'months', unit: 'count', ex: 12 },
    ],
    compute: v => {
      const months = Math.max(1, Math.min(60, Math.round(n(v, 'months'))))
      const series: number[] = []
      let r = n(v, 'base'), total = 0
      for (let i = 0; i < months; i++) {
        r *= 1 + n(v, 'growth')
        series.push(r)
        total += r
      }
      return [
        { key: 'final', kind: 'money', value: r },
        { key: 'total', kind: 'money', value: total },
        { key: 'growth', kind: 'pct', value: div(r, n(v, 'base')) - 1 },
        { key: 'trend', kind: 'series', value: series },
      ]
    },
  },
  {
    slug: 'volumetric-weight-calculator',
    group: 'inventory',
    related: ['courier-cost-calculator', 'cod-profit-calculator', 'landed-cost-calculator'],
    inputs: [
      { key: 'length', unit: 'cm', ex: 40 },
      { key: 'width', unit: 'cm', ex: 30 },
      { key: 'height', unit: 'cm', ex: 20 },
      { key: 'actual', unit: 'kg', ex: 2 },
      { key: 'divisor', unit: 'count', ex: 5000, fill: 'courier' },
    ],
    compute: v => {
      const vol = div(n(v, 'length') * n(v, 'width') * n(v, 'height'), n(v, 'divisor'))
      return [
        { key: 'chargeable', kind: 'kg', value: Math.max(vol, n(v, 'actual')) },
        { key: 'volumetric', kind: 'kg', value: vol },
        { key: 'billedOn', kind: 'choice', value: vol > n(v, 'actual') ? 'box' : 'actual', tone: vol > n(v, 'actual') ? 'warn' : undefined },
      ]
    },
  },
]
