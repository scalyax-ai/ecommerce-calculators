/** COD, delivery, returns and offer calculators. */
import { type CalcDef, div, n, sign } from '../engine'

const INF = Number.POSITIVE_INFINITY

type Courier = { id: string; cps: number; cpd: number; pps: number }

export const DELIVERY_OFFERS: CalcDef[] = [
  {
    slug: 'cod-profit-calculator',
    group: 'delivery',
    related: ['max-cpa-calculator', 'courier-cost-calculator', 'returns-cost-calculator'],
    inputs: [
      { key: 'placed', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cogs', unit: 'money', ex: [22, 180], fill: 'shopify' },
      { key: 'shipping', unit: 'money', ex: [7, 60], fill: 'courier' },
      { key: 'returnFee', unit: 'money', ex: [4, 30], fill: 'courier' },
      { key: 'codFee', unit: 'pct', ex: 1, fill: 'courier' },
      { key: 'confirm', unit: 'pct', ex: [80, 75], fill: 'shopify' },
      { key: 'deliver', unit: 'pct', ex: [75, 70], fill: 'courier' },
      { key: 'ads', unit: 'money', ex: [12000, 80000], fill: 'ads' },
      { key: 'unsellable', unit: 'pct', ex: 0 },
    ],
    compute: v => {
      const confirmed = n(v, 'placed') * n(v, 'confirm')
      const delivered = confirmed * n(v, 'deliver')
      const returned = confirmed - delivered
      const revenue = delivered * n(v, 'price')
      const returnsCost =
        returned * (n(v, 'shipping') + n(v, 'returnFee')) + returned * n(v, 'cogs') * n(v, 'unsellable')
      const profit =
        revenue - revenue * n(v, 'codFee') - delivered * (n(v, 'cogs') + n(v, 'shipping')) - returnsCost - n(v, 'ads')
      return [
        { key: 'profit', kind: 'money', value: profit, tone: sign(profit) },
        { key: 'delivered', kind: 'count', value: delivered },
        { key: 'returned', kind: 'count', value: returned },
        { key: 'revenue', kind: 'money', value: revenue },
        { key: 'returnsCost', kind: 'money', value: returnsCost, tone: 'bad' },
        { key: 'perDelivered', kind: 'money', value: div(profit, delivered) },
        { key: 'adsPerDelivered', kind: 'money', value: div(n(v, 'ads'), delivered) },
      ]
    },
  },
  {
    slug: 'courier-cost-calculator',
    group: 'delivery',
    related: ['cod-profit-calculator', 'volumetric-weight-calculator', 'returns-cost-calculator'],
    inputs: [
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cogs', unit: 'money', ex: [22, 180], fill: 'shopify' },
      { key: 'shipments', unit: 'count', ex: 1000, fill: 'courier' },
      { key: 'aFee', unit: 'money', ex: [7.5, 55], fill: 'courier' },
      { key: 'aReturn', unit: 'money', ex: [3, 25], fill: 'courier' },
      { key: 'aRate', unit: 'pct', ex: 72, fill: 'courier' },
      { key: 'bFee', unit: 'money', ex: [6, 45], fill: 'courier' },
      { key: 'bReturn', unit: 'money', ex: [4, 30], fill: 'courier' },
      { key: 'bRate', unit: 'pct', ex: 64, fill: 'courier' },
      { key: 'cFee', unit: 'money', ex: [8, 60], fill: 'courier' },
      { key: 'cReturn', unit: 'money', ex: [2.5, 20], fill: 'courier' },
      { key: 'cRate', unit: 'pct', ex: 78, fill: 'courier' },
    ],
    compute: v => {
      const margin = n(v, 'price') - n(v, 'cogs')
      const cs: Courier[] = ['a', 'b', 'c'].map(id => {
        const d = n(v, `${id}Rate`)
        const cps = n(v, `${id}Fee`) + (1 - d) * n(v, `${id}Return`)
        return { id, cps, cpd: div(cps, d), pps: d * margin - cps }
      })
      const cheapest = [...cs].sort((a, b) => a.cps - b.cps)[0]
      const best = [...cs].sort((a, b) => b.pps - a.pps)[0]
      return [
        { key: 'best', kind: 'choice', value: best.id, tone: 'good' },
        { key: 'cheapest', kind: 'choice', value: cheapest.id },
        { key: 'gap', kind: 'money', value: (best.pps - cheapest.pps) * n(v, 'shipments') },
        ...cs.flatMap(c => [
          { key: `${c.id}PerDelivered`, kind: 'money' as const, value: c.cpd },
          { key: `${c.id}Profit`, kind: 'money' as const, value: c.pps, tone: c === best ? ('good' as const) : undefined },
        ]),
      ]
    },
  },
  {
    slug: 'returns-cost-calculator',
    group: 'delivery',
    related: ['cod-profit-calculator', 'roas-calculator', 'courier-cost-calculator'],
    inputs: [
      { key: 'orders', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'rate', unit: 'pct', ex: [12, 8], fill: 'shopify' },
      { key: 'aov', unit: 'money', ex: [70, 450], fill: 'shopify' },
      { key: 'cogs', unit: 'money', ex: [25, 180], fill: 'shopify' },
      { key: 'out', unit: 'money', ex: [7, 60], fill: 'courier' },
      { key: 'back', unit: 'money', ex: [6, 40], fill: 'courier' },
      { key: 'handling', unit: 'money', ex: [2, 10] },
      { key: 'resold', unit: 'pct', ex: 70 },
    ],
    compute: v => {
      const r = n(v, 'rate'), aov = n(v, 'aov')
      const margin = aov - n(v, 'cogs') - n(v, 'out')
      const oop = n(v, 'out') + n(v, 'back') + n(v, 'handling') + n(v, 'cogs') * (1 - n(v, 'resold'))
      const kept = (1 - r) * margin - r * oop
      const perReturn = margin + oop
      return [
        { key: 'monthly', kind: 'money', value: n(v, 'orders') * r * perReturn, tone: 'bad' },
        { key: 'perReturn', kind: 'money', value: perReturn },
        { key: 'roasBefore', kind: 'x', value: margin > 0 ? aov / margin : INF },
        { key: 'roasAfter', kind: 'x', value: kept > 0 ? aov / kept : INF },
        { key: 'maxRate', kind: 'pct', value: div(margin, margin + oop) },
      ]
    },
  },
  {
    slug: 'discount-calculator',
    group: 'offers',
    related: ['bogo-calculator', 'quantity-discount-calculator', 'free-shipping-threshold-calculator'],
    inputs: [
      { key: 'price', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'cost', unit: 'money', ex: [22, 180], fill: 'shopify' },
      { key: 'discount', unit: 'pct', ex: 20 },
      { key: 'orders', unit: 'count', ex: 500, fill: 'shopify' },
      { key: 'lift', unit: 'pct', ex: 30 },
    ],
    compute: v => {
      const p = n(v, 'price'), c = n(v, 'cost'), d = n(v, 'discount'), o = n(v, 'orders')
      const m = div(p - c, p)
      const need = d < m ? d / (m - d) : INF
      const full = (p - c) * o
      const promoOrders = o * (1 + n(v, 'lift'))
      const promo = (p * (1 - d) - c) * promoOrders
      return [
        { key: 'liftNeeded', kind: 'pct', value: need, tone: n(v, 'lift') >= need ? 'good' : 'bad' },
        { key: 'change', kind: 'money', value: promo - full, tone: sign(promo - full) },
        { key: 'fullProfit', kind: 'money', value: full },
        { key: 'promoProfit', kind: 'money', value: promo },
        { key: 'costPerExtra', kind: 'money', value: div(promoOrders * p * d, promoOrders - o) },
      ]
    },
  },
  {
    slug: 'free-shipping-threshold-calculator',
    group: 'offers',
    related: ['discount-calculator', 'upsell-calculator', 'free-gift-vs-discount-calculator'],
    inputs: [
      { key: 'aov', unit: 'money', ex: [55, 450], fill: 'shopify' },
      { key: 'shipping', unit: 'money', ex: [7, 60], fill: 'courier' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'orders', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'threshold', unit: 'money', ex: [75, 600] },
      { key: 'reach', unit: 'pct', ex: 30, fill: 'shopify' },
    ],
    compute: v => {
      const aov = n(v, 'aov'), m = n(v, 'margin'), reach = n(v, 'reach'), o = n(v, 'orders')
      // Rounded up to a whole 5 of the currency (500 minor units).
      const suggested = Math.ceil((aov + div(n(v, 'shipping'), m)) / 500) * 500
      const lift = (n(v, 'threshold') - aov) * reach
      const absorbed = o * reach * n(v, 'shipping')
      const extra = o * lift * m
      return [
        { key: 'suggested', kind: 'money', value: suggested },
        { key: 'newAov', kind: 'money', value: aov + lift },
        { key: 'absorbed', kind: 'money', value: absorbed },
        { key: 'extraProfit', kind: 'money', value: extra },
        { key: 'net', kind: 'money', value: extra - absorbed, tone: sign(extra - absorbed) },
      ]
    },
  },
  {
    slug: 'upsell-calculator',
    group: 'offers',
    related: ['free-shipping-threshold-calculator', 'quantity-discount-calculator', 'customer-lifetime-value-calculator'],
    inputs: [
      { key: 'orders', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'aov', unit: 'money', ex: [60, 450], fill: 'shopify' },
      { key: 'price', unit: 'money', ex: [20, 150] },
      { key: 'take', unit: 'pct', ex: 10 },
      { key: 'margin', unit: 'pct', ex: 50 },
    ],
    compute: v => {
      const rev = n(v, 'orders') * n(v, 'take') * n(v, 'price')
      const add = n(v, 'take') * n(v, 'price')
      return [
        { key: 'profit', kind: 'money', value: rev * n(v, 'margin'), tone: 'good' },
        { key: 'revenue', kind: 'money', value: rev },
        { key: 'newAov', kind: 'money', value: n(v, 'aov') + add },
        { key: 'aovLift', kind: 'pct', value: div(add, n(v, 'aov')) },
        { key: 'yearly', kind: 'money', value: rev * n(v, 'margin') * 12 },
      ]
    },
  },
  {
    slug: 'bogo-calculator',
    group: 'offers',
    related: ['discount-calculator', 'quantity-discount-calculator', 'free-gift-vs-discount-calculator'],
    inputs: [
      { key: 'buy', unit: 'count', ex: 1 },
      { key: 'free', unit: 'count', ex: 1 },
      { key: 'price', unit: 'money', ex: [40, 300], fill: 'shopify' },
      { key: 'cost', unit: 'money', ex: [14, 120], fill: 'shopify' },
    ],
    compute: v => {
      const set = n(v, 'buy') + n(v, 'free'), pays = n(v, 'buy') * n(v, 'price')
      const profit = pays - set * n(v, 'cost')
      return [
        { key: 'discount', kind: 'pct', value: div(n(v, 'free'), set) },
        { key: 'pays', kind: 'money', value: pays },
        { key: 'perUnit', kind: 'money', value: div(pays, set) },
        { key: 'profit', kind: 'money', value: profit, tone: sign(profit) },
        { key: 'margin', kind: 'pct', value: div(profit, pays) },
        { key: 'singleProfit', kind: 'money', value: n(v, 'price') - n(v, 'cost') },
      ]
    },
  },
  {
    slug: 'quantity-discount-calculator',
    group: 'offers',
    related: ['bogo-calculator', 'discount-calculator', 'upsell-calculator'],
    inputs: [
      { key: 'price', unit: 'money', ex: [40, 300], fill: 'shopify' },
      { key: 'cost', unit: 'money', ex: [14, 120], fill: 'shopify' },
      { key: 'orderCost', unit: 'money', ex: [8, 60], fill: 'courier' },
      { key: 'feePct', unit: 'pct', ex: [2.9, 2.5] },
      { key: 'qty', unit: 'count', ex: 3 },
      { key: 'discount', unit: 'pct', ex: 15 },
    ],
    compute: v => {
      const p = n(v, 'price'), c = n(v, 'cost'), F = n(v, 'orderCost'), f = n(v, 'feePct'), q = n(v, 'qty')
      const total = q * p * (1 - n(v, 'discount'))
      const tier = total - q * c - F - f * total
      const single = p - c - F - f * p
      const fullTier = q * p - q * c - F - f * q * p
      const gain = tier - single
      const loss = Math.max(0, fullTier - tier)
      return [
        { key: 'tierProfit', kind: 'money', value: tier, tone: sign(gain) },
        { key: 'singleProfit', kind: 'money', value: single },
        { key: 'gain', kind: 'money', value: gain, tone: sign(gain) },
        { key: 'unitPrice', kind: 'money', value: div(total, q) },
        { key: 'paysOffShare', kind: 'pct', value: gain > 0 ? loss / (gain + loss) : INF },
      ]
    },
  },
  {
    slug: 'free-gift-vs-discount-calculator',
    group: 'offers',
    related: ['free-shipping-threshold-calculator', 'discount-calculator', 'upsell-calculator'],
    inputs: [
      { key: 'aov', unit: 'money', ex: [55, 400], fill: 'shopify' },
      { key: 'threshold', unit: 'money', ex: [75, 500] },
      { key: 'orders', unit: 'count', ex: 1000, fill: 'shopify' },
      { key: 'margin', unit: 'pct', ex: 45, fill: 'shopify' },
      { key: 'gift', unit: 'money', ex: [5, 40], fill: 'shopify' },
      { key: 'discount', unit: 'pct', ex: 10 },
    ],
    compute: v => {
      const o = n(v, 'orders'), t = n(v, 'threshold')
      const extra = Math.max(0, t - n(v, 'aov')) * o * n(v, 'margin')
      const gift = extra - n(v, 'gift') * o
      const disc = extra - t * n(v, 'discount') * o
      return [
        { key: 'winner', kind: 'choice', value: gift >= disc ? 'gift' : 'discount', tone: 'good' },
        { key: 'giftProfit', kind: 'money', value: gift, tone: sign(gift) },
        { key: 'discountProfit', kind: 'money', value: disc, tone: sign(disc) },
        { key: 'difference', kind: 'money', value: Math.abs(gift - disc) },
        { key: 'jump', kind: 'pct', value: div(t - n(v, 'aov'), n(v, 'aov')) },
      ]
    },
  },
]
