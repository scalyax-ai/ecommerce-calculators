/**
 * Profit, unit-economics and ads calculators. Formulas were checked against
 * the worked examples of widely used free calculators; where those sources
 * disagree, the more complete formula is used (see the README).
 */
import { type CalcDef, div, n, sign } from '../engine'

const INF = Number.POSITIVE_INFINITY

export const PROFIT_ADS: CalcDef[] = [
  {
    slug: 'margin-markup-calculator',
    group: 'profit',
    related: ['product-pricing-calculator', 'contribution-margin-calculator', 'wholesale-margin-calculator'],
    inputs: [
      { key: 'cost', unit: 'money', ex: [24, 200], fill: 'shopify' },
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'target', unit: 'pct', ex: 50 },
    ],
    compute: v => {
      const c = n(v, 'cost'), p = n(v, 'price'), t = n(v, 'target'), profit = p - c
      return [
        { key: 'margin', kind: 'pct', value: div(profit, p), tone: sign(profit) },
        { key: 'profit', kind: 'money', value: profit },
        { key: 'markup', kind: 'pct', value: div(profit, c) },
        { key: 'priceForTarget', kind: 'money', value: t < 1 ? c / (1 - t) : INF },
        { key: 'maxCost', kind: 'money', value: p * (1 - t) },
      ]
    },
  },
  {
    slug: 'break-even-calculator',
    group: 'profit',
    related: ['contribution-margin-calculator', 'cod-profit-calculator', 'roas-calculator'],
    inputs: [
      { key: 'fixed', unit: 'money', ex: [8000, 60000], fill: 'finance' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'variable', unit: 'money', ex: [28, 220], fill: 'shopify' },
      { key: 'adCost', unit: 'money', ex: [14, 80], fill: 'ads' },
      { key: 'orders', unit: 'count', ex: [450, 400], fill: 'shopify' },
      { key: 'target', unit: 'money', ex: [3000, 20000] },
    ],
    compute: v => {
      const cm = n(v, 'aov') - n(v, 'variable') - n(v, 'adCost')
      const be = cm > 0 ? Math.ceil(n(v, 'fixed') / cm) : INF
      const profit = n(v, 'orders') * cm - n(v, 'fixed')
      return [
        { key: 'breakEvenOrders', kind: 'count', value: be },
        { key: 'perDay', kind: 'num', value: be / 30 },
        { key: 'breakEvenRevenue', kind: 'money', value: be * n(v, 'aov') },
        { key: 'ordersForTarget', kind: 'count', value: cm > 0 ? Math.ceil((n(v, 'fixed') + n(v, 'target')) / cm) : INF },
        { key: 'profitNow', kind: 'money', value: profit, tone: sign(profit) },
        { key: 'safety', kind: 'pct', value: div(n(v, 'orders') - be, n(v, 'orders')), tone: sign(n(v, 'orders') - be) },
        { key: 'contribution', kind: 'money', value: cm },
      ]
    },
  },
  {
    slug: 'product-pricing-calculator',
    group: 'profit',
    related: ['margin-markup-calculator', 'landed-cost-calculator', 'payment-fee-calculator'],
    inputs: [
      { key: 'cogs', unit: 'money', ex: [18, 180], fill: 'shopify' },
      { key: 'shipping', unit: 'money', ex: [7, 60], fill: 'courier' },
      { key: 'fixed', unit: 'money', ex: [4000, 30000], fill: 'finance' },
      { key: 'units', unit: 'count', ex: 600, fill: 'shopify' },
      { key: 'feePct', unit: 'pct', ex: [2.9, 2.5] },
      { key: 'feeFixed', unit: 'money', ex: [0.3, 3] },
      { key: 'margin', unit: 'pct', ex: 25 },
      { key: 'tax', unit: 'pct', ex: [0, 14] },
    ],
    compute: v => {
      const perUnit = div(n(v, 'fixed'), n(v, 'units'))
      const den = 1 - n(v, 'feePct') - n(v, 'margin')
      const price = den > 0 ? (n(v, 'cogs') + n(v, 'shipping') + perUnit + n(v, 'feeFixed')) / den : INF
      return [
        { key: 'price', kind: 'money', value: price },
        { key: 'priceWithTax', kind: 'money', value: price * (1 + n(v, 'tax')) },
        { key: 'fixedPerUnit', kind: 'money', value: perUnit },
        { key: 'feesPerUnit', kind: 'money', value: price * n(v, 'feePct') + n(v, 'feeFixed') },
        { key: 'profitPerUnit', kind: 'money', value: price * n(v, 'margin'), tone: 'good' },
      ]
    },
  },
  {
    slug: 'contribution-margin-calculator',
    group: 'profit',
    related: ['break-even-calculator', 'roas-calculator', 'max-cpa-calculator'],
    inputs: [
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cogs', unit: 'money', ex: [22, 180], fill: 'shopify' },
      { key: 'shipping', unit: 'money', ex: [7, 60], fill: 'courier' },
      { key: 'feePct', unit: 'pct', ex: [2.9, 2.5] },
      { key: 'adCost', unit: 'money', ex: [15, 90], fill: 'ads' },
      { key: 'orders', unit: 'count', ex: 500, fill: 'shopify' },
    ],
    compute: v => {
      const p = n(v, 'price')
      const beforeAds = p - n(v, 'cogs') - n(v, 'shipping') - p * n(v, 'feePct')
      const cm = beforeAds - n(v, 'adCost')
      return [
        { key: 'contribution', kind: 'money', value: cm, tone: sign(cm) },
        { key: 'ratio', kind: 'pct', value: div(cm, p) },
        { key: 'monthly', kind: 'money', value: cm * n(v, 'orders') },
        { key: 'maxAdCost', kind: 'money', value: beforeAds },
        { key: 'breakEvenRoas', kind: 'x', value: beforeAds > 0 ? p / beforeAds : INF },
      ]
    },
  },
  {
    slug: 'landed-cost-calculator',
    group: 'profit',
    related: ['product-pricing-calculator', 'margin-markup-calculator', 'reorder-point-calculator'],
    inputs: [
      { key: 'supplier', unit: 'money', ex: [12, 120] },
      { key: 'units', unit: 'count', ex: 500 },
      { key: 'freight', unit: 'money', ex: [1500, 15000] },
      { key: 'duty', unit: 'pct', ex: 10 },
      { key: 'basis', unit: 'select', ex: 'cif', options: ['cif', 'fob'] },
      { key: 'clearance', unit: 'money', ex: [300, 3000] },
      { key: 'local', unit: 'money', ex: [250, 2000] },
      { key: 'price', unit: 'money', ex: [45, 450], fill: 'shopify' },
      { key: 'feePct', unit: 'pct', ex: [2.9, 2.5] },
      { key: 'target', unit: 'pct', ex: 30 },
    ],
    compute: v => {
      const units = n(v, 'units'), cif = v.basis === 'cif', duty = n(v, 'duty'), sup = n(v, 'supplier')
      const fr = div(n(v, 'freight'), units), cl = div(n(v, 'clearance'), units), lo = div(n(v, 'local'), units)
      const dutyUnit = (cif ? sup + fr : sup) * duty
      const landed = sup + fr + dutyUnit + cl + lo
      const room = n(v, 'price') * (1 - n(v, 'feePct') - n(v, 'target'))
      const maxSupplier = (room - fr * (1 + (cif ? duty : 0)) - cl - lo) / (1 + duty)
      return [
        { key: 'landed', kind: 'money', value: landed },
        { key: 'load', kind: 'pct', value: div(landed, sup) - 1 },
        { key: 'dutyPerUnit', kind: 'money', value: dutyUnit },
        { key: 'freightPerUnit', kind: 'money', value: fr },
        { key: 'maxSupplier', kind: 'money', value: maxSupplier, tone: sign(maxSupplier - sup) },
      ]
    },
  },
  {
    slug: 'payment-fee-calculator',
    group: 'profit',
    related: ['product-pricing-calculator', 'margin-markup-calculator', 'contribution-margin-calculator'],
    inputs: [
      { key: 'revenue', unit: 'money', ex: [40000, 300000], fill: 'shopify' },
      { key: 'orders', unit: 'count', ex: 700, fill: 'shopify' },
      { key: 'rate', unit: 'pct', ex: [2.9, 2.5] },
      { key: 'fixed', unit: 'money', ex: [0.3, 2] },
      { key: 'taxOnFees', unit: 'pct', ex: [0, 14] },
      { key: 'marketplace', unit: 'money', ex: [15000, 100000] },
      { key: 'commission', unit: 'pct', ex: 15 },
      { key: 'moved', unit: 'pct', ex: 40 },
      { key: 'siteCost', unit: 'money', ex: [3000, 24000], fill: 'finance' },
    ],
    compute: v => {
      const fee = n(v, 'revenue') * n(v, 'rate') + n(v, 'orders') * n(v, 'fixed')
      const tax = fee * n(v, 'taxOnFees')
      const moved = n(v, 'marketplace') * 12 * n(v, 'moved')
      const saved = moved * n(v, 'commission')
      const net = saved - moved * n(v, 'rate') - n(v, 'siteCost')
      return [
        { key: 'monthlyFees', kind: 'money', value: fee + tax },
        { key: 'effectiveRate', kind: 'pct', value: div(fee + tax, n(v, 'revenue')) },
        { key: 'taxOnFees', kind: 'money', value: tax },
        { key: 'commissionSaved', kind: 'money', value: saved },
        { key: 'yearlySaving', kind: 'money', value: net, tone: sign(net) },
      ]
    },
  },
  {
    slug: 'wholesale-margin-calculator',
    group: 'profit',
    related: ['margin-markup-calculator', 'product-pricing-calculator', 'quantity-discount-calculator'],
    inputs: [
      { key: 'cost', unit: 'money', ex: [15, 150], fill: 'shopify' },
      { key: 'wholesale', unit: 'money', ex: [26, 260] },
      { key: 'retail', unit: 'money', ex: [45, 450], fill: 'shopify' },
    ],
    compute: v => {
      const c = n(v, 'cost'), w = n(v, 'wholesale'), r = n(v, 'retail')
      return [
        { key: 'wholesaleMargin', kind: 'pct', value: div(w - c, w), tone: sign(w - c) },
        { key: 'profitPerUnit', kind: 'money', value: w - c },
        { key: 'markup', kind: 'pct', value: div(w - c, c) },
        { key: 'retailerMargin', kind: 'pct', value: div(r - w, r) },
        { key: 'directMargin', kind: 'pct', value: div(r - c, r) },
      ]
    },
  },
  {
    slug: 'roas-calculator',
    group: 'ads',
    related: ['max-cpa-calculator', 'mer-calculator', 'ad-budget-calculator'],
    inputs: [
      { key: 'spend', unit: 'money', ex: [8000, 50000], fill: 'ads' },
      { key: 'revenue', unit: 'money', ex: [26000, 160000], fill: 'shopify' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'netTarget', unit: 'pct', ex: 10 },
    ],
    compute: v => {
      const roas = div(n(v, 'revenue'), n(v, 'spend')), m = n(v, 'margin'), net = n(v, 'netTarget')
      const be = div(1, m), target = m > net ? 1 / (m - net) : INF
      const profit = n(v, 'revenue') * m - n(v, 'spend')
      return [
        { key: 'roas', kind: 'x', value: roas, tone: roas >= target ? 'good' : roas >= be ? 'warn' : 'bad' },
        { key: 'breakEven', kind: 'x', value: be },
        { key: 'targetRoas', kind: 'x', value: target },
        { key: 'profit', kind: 'money', value: profit, tone: sign(profit) },
        { key: 'poas', kind: 'x', value: div(profit, n(v, 'spend')) },
        { key: 'adShare', kind: 'pct', value: div(n(v, 'spend'), n(v, 'revenue')) },
      ]
    },
  },
  {
    slug: 'max-cpa-calculator',
    group: 'ads',
    related: ['cod-profit-calculator', 'roas-calculator', 'contribution-margin-calculator'],
    inputs: [
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cogs', unit: 'money', ex: [22, 180], fill: 'shopify' },
      { key: 'shipping', unit: 'money', ex: [8, 60], fill: 'courier' },
      { key: 'fees', unit: 'money', ex: [2, 15] },
      { key: 'confirm', unit: 'pct', ex: [80, 75], fill: 'shopify' },
      { key: 'deliver', unit: 'pct', ex: [75, 70], fill: 'courier' },
      { key: 'returnFee', unit: 'money', ex: [5, 30], fill: 'courier' },
      { key: 'cvr', unit: 'pct', ex: [2, 1.5], fill: 'analytics' },
    ],
    compute: v => {
      const m = n(v, 'price') - n(v, 'cogs') - n(v, 'shipping') - n(v, 'fees')
      const d = n(v, 'deliver'), c = n(v, 'confirm')
      const withReturns = c * (d * m - (1 - d) * (n(v, 'shipping') + n(v, 'returnFee')))
      return [
        { key: 'maxPerOrder', kind: 'money', value: withReturns, tone: sign(withReturns) },
        { key: 'ignoringReturns', kind: 'money', value: m * c * d },
        { key: 'prepaid', kind: 'money', value: m },
        { key: 'maxCpc', kind: 'money', value: withReturns * n(v, 'cvr') },
        { key: 'maxCpcPrepaid', kind: 'money', value: m * n(v, 'cvr') },
      ]
    },
  },
  {
    slug: 'ad-budget-calculator',
    group: 'ads',
    related: ['roas-calculator', 'ad-metrics-calculator', 'sales-forecast-calculator'],
    inputs: [
      { key: 'goal', unit: 'money', ex: [60000, 500000] },
      { key: 'roas', unit: 'x', ex: 3 },
      { key: 'cpm', unit: 'money', ex: [12, 60], fill: 'ads' },
      { key: 'ctr', unit: 'pct', ex: 1.2, fill: 'ads' },
      { key: 'cvr', unit: 'pct', ex: [2, 1.5], fill: 'analytics' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
    ],
    compute: v => {
      const budget = div(n(v, 'goal'), n(v, 'roas'))
      const clicks = div(budget, n(v, 'cpm')) * 1000 * n(v, 'ctr')
      const orders = clicks * n(v, 'cvr')
      const revenue = orders * n(v, 'aov')
      const reach = div(revenue, n(v, 'goal'))
      return [
        { key: 'budget', kind: 'money', value: budget },
        { key: 'daily', kind: 'money', value: budget / 30.4 },
        { key: 'funnelRevenue', kind: 'money', value: revenue },
        { key: 'goalReached', kind: 'pct', value: reach, tone: reach >= 1 ? 'good' : 'warn' },
        { key: 'orders', kind: 'count', value: orders },
        { key: 'costPerOrder', kind: 'money', value: div(budget, orders) },
        { key: 'clicks', kind: 'count', value: clicks },
      ]
    },
  },
  {
    slug: 'mer-calculator',
    group: 'ads',
    related: ['roas-calculator', 'ad-budget-calculator', 'customer-acquisition-cost-calculator'],
    inputs: [
      { key: 'revenue', unit: 'money', ex: [80000, 500000], fill: 'shopify' },
      { key: 'paid', unit: 'money', ex: [18000, 120000], fill: 'ads' },
      { key: 'email', unit: 'money', ex: [800, 5000], fill: 'finance' },
      { key: 'agency', unit: 'money', ex: [2500, 15000], fill: 'finance' },
      { key: 'tools', unit: 'money', ex: [600, 4000], fill: 'finance' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'metaSpend', unit: 'money', ex: [12000, 80000], fill: 'ads' },
      { key: 'metaRevenue', unit: 'money', ex: [45000, 300000], fill: 'ads' },
    ],
    compute: v => {
      const total = n(v, 'paid') + n(v, 'email') + n(v, 'agency') + n(v, 'tools')
      const mer = div(n(v, 'revenue'), total), be = div(1, n(v, 'margin'))
      const after = n(v, 'revenue') * n(v, 'margin') - total
      const over = n(v, 'metaRevenue') - n(v, 'revenue') * div(n(v, 'metaSpend'), n(v, 'paid'))
      return [
        { key: 'mer', kind: 'x', value: mer, tone: mer >= be ? 'good' : 'bad' },
        { key: 'breakEven', kind: 'x', value: be },
        { key: 'paidRoas', kind: 'x', value: div(n(v, 'revenue'), n(v, 'paid')) },
        { key: 'share', kind: 'pct', value: div(total, n(v, 'revenue')) },
        { key: 'profitAfter', kind: 'money', value: after, tone: sign(after) },
        { key: 'metaRoas', kind: 'x', value: div(n(v, 'metaRevenue'), n(v, 'metaSpend')) },
        { key: 'overClaim', kind: 'money', value: over },
      ]
    },
  },
  {
    slug: 'ad-metrics-calculator',
    group: 'ads',
    related: ['roas-calculator', 'ad-frequency-calculator', 'ad-budget-calculator'],
    inputs: [
      { key: 'spend', unit: 'money', ex: [3000, 20000], fill: 'ads' },
      { key: 'impressions', unit: 'count', ex: [250000, 400000], fill: 'ads' },
      { key: 'clicks', unit: 'count', ex: [3000, 5000], fill: 'ads' },
      { key: 'orders', unit: 'count', ex: 60, fill: 'ads' },
      { key: 'revenue', unit: 'money', ex: [4200, 27000], fill: 'ads' },
    ],
    compute: v => [
      { key: 'cpa', kind: 'money', value: div(n(v, 'spend'), n(v, 'orders')) },
      { key: 'cpm', kind: 'money', value: div(n(v, 'spend'), n(v, 'impressions')) * 1000 },
      { key: 'ctr', kind: 'pct', value: div(n(v, 'clicks'), n(v, 'impressions')) },
      { key: 'cpc', kind: 'money', value: div(n(v, 'spend'), n(v, 'clicks')) },
      { key: 'cvr', kind: 'pct', value: div(n(v, 'orders'), n(v, 'clicks')) },
      { key: 'roas', kind: 'x', value: div(n(v, 'revenue'), n(v, 'spend')) },
    ],
  },
  {
    slug: 'ad-frequency-calculator',
    group: 'ads',
    related: ['ad-metrics-calculator', 'roas-calculator', 'ad-budget-calculator'],
    inputs: [
      { key: 'impressions', unit: 'count', ex: 500000, fill: 'ads' },
      { key: 'reach', unit: 'count', ex: 150000, fill: 'ads' },
      { key: 'days', unit: 'days', ex: 30 },
      { key: 'spend', unit: 'money', ex: [6000, 20000], fill: 'ads' },
      { key: 'creatives', unit: 'count', ex: 3, fill: 'ads' },
      { key: 'limit', unit: 'x', ex: 3 },
    ],
    compute: v => {
      const f = div(n(v, 'impressions'), n(v, 'reach'))
      const dailyPerCreative = div(div(f, n(v, 'days')), n(v, 'creatives'))
      return [
        { key: 'frequency', kind: 'x', value: f, tone: f <= n(v, 'limit') ? 'good' : 'warn' },
        { key: 'weekly', kind: 'x', value: div(f, n(v, 'days')) * 7 },
        { key: 'perCreative', kind: 'x', value: div(f, n(v, 'creatives')) },
        { key: 'daysToLimit', kind: 'days', value: div(n(v, 'limit'), dailyPerCreative) },
        { key: 'cpm', kind: 'money', value: div(n(v, 'spend'), n(v, 'impressions')) * 1000 },
        { key: 'costPerPerson', kind: 'money', value: div(n(v, 'spend'), n(v, 'reach')) },
      ]
    },
  },
  {
    slug: 'influencer-roi-calculator',
    group: 'ads',
    related: ['roas-calculator', 'ad-metrics-calculator', 'mer-calculator'],
    inputs: [
      { key: 'fee', unit: 'money', ex: [2000, 15000] },
      { key: 'product', unit: 'money', ex: [300, 3000] },
      { key: 'impressions', unit: 'count', ex: 200000 },
      { key: 'clicks', unit: 'count', ex: 2500, fill: 'analytics' },
      { key: 'orders', unit: 'count', ex: 60, fill: 'shopify' },
      { key: 'revenue', unit: 'money', ex: [3900, 27000], fill: 'shopify' },
      { key: 'cpm', unit: 'money', ex: [12, 50], fill: 'ads' },
    ],
    compute: v => {
      const cost = n(v, 'fee') + n(v, 'product'), profit = n(v, 'revenue') - cost
      return [
        { key: 'roi', kind: 'pct', value: div(profit, cost), tone: sign(profit) },
        { key: 'roas', kind: 'x', value: div(n(v, 'revenue'), cost) },
        { key: 'costPerOrder', kind: 'money', value: div(cost, n(v, 'orders')) },
        { key: 'costPerClick', kind: 'money', value: div(cost, n(v, 'clicks')) },
        { key: 'ctr', kind: 'pct', value: div(n(v, 'clicks'), n(v, 'impressions')) },
        { key: 'mediaValue', kind: 'money', value: (n(v, 'impressions') * n(v, 'cpm')) / 1000 },
      ]
    },
  },
]
