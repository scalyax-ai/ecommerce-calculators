/** Every calculator definition, keyed by its slug. */
import { CUSTOMERS_OPS } from './defs/customers-ops'
import { DELIVERY_OFFERS } from './defs/delivery-offers'
import { PROFIT_ADS } from './defs/profit-ads'
import type { CalcDef, Group } from './engine'

export const CALCULATORS: CalcDef[] = [...PROFIT_ADS, ...DELIVERY_OFFERS, ...CUSTOMERS_OPS]

export const CALCULATOR_SLUGS: string[] = CALCULATORS.map(c => c.slug)

export const GROUP_ORDER: Group[] = ['profit', 'ads', 'delivery', 'offers', 'customers', 'conversion', 'inventory']

export function calculatorBySlug(slug: string): CalcDef | undefined {
  return CALCULATORS.find(c => c.slug === slug)
}
