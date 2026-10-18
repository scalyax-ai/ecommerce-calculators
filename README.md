# ecommerce-calculators

The numbers an online store decides with, as tested TypeScript functions. Is this ROAS profitable? How many orders until break-even? What does cash on delivery leave after returned orders? Can a 20% discount pay for itself?

35 calculators, zero dependencies, money handled in integer cents. Each one is also a free page you can use in the browser: [analify-ai.scalyax.ai/tools](https://analify-ai.scalyax.ai/tools).

```ts
import { roas, codProfit, discount } from 'ecommerce-calculators'

roas({ spend: 8000, revenue: 26000, margin: 45, netTarget: 10 })
// → { roas: 3.25, breakEven: 2.22…, targetRoas: 2.86…, profit: 3700, poas: 0.46…, adShare: 30.77… }

discount({ price: 60, cost: 22, discount: 20, orders: 500, lift: 30 })
// → liftNeeded: 46.15… (% more orders needed just to break even)
```

## Install

```bash
npm install ecommerce-calculators
```

## Units

- **Money** in and out is in normal currency units: `45.5` means 45.50. Internally the math runs in integer cents and money results are rounded to the cent. The calculators don't care which currency you use, as long as every money input is in the same one.
- **Percent** in and out is a whole percent: `45` means 45%.
- **Multiples** such as ROAS and MER are plain numbers: `3.25` means 3.25×.
- A result that can't be computed (dividing by zero, no break-even point) is `null`. You never get `NaN` or `Infinity`.

Every function has a typed input and result, and each field's JSDoc states its unit. To run a calculator by its slug instead, use `calculate('roas-calculator', { … })`.

## Where these formulas come from, and where they differ

The formulas were collected from 120 widely used free ecommerce calculators and checked against those tools' own worked examples (the tests include them). Where the tools disagree, the more complete formula wins, and a few calculators go further than most free tools:

- **Max cost per order for cash on delivery** charges returned orders their shipping and return fee. Most COD calculators only multiply by confirmation and delivery rate, which overstates what you can pay per order.
- **Courier comparison** ranks couriers by profit per shipment, not by the cheapest fee. A cheaper courier that delivers fewer orders often earns you less.
- **COD profit** can count returned stock you can't resell. Most calculators assume every return goes back on the shelf.
- **Returns cost** counts the margin you lose plus what you pay out, not the whole refund, when the goods come back to be sold again.
- **Break-even and target ROAS** take the margin you give them. Pass the margin after product cost, shipping, fees and returns, not product margin alone, or the break-even line will be too low.

## Calculators

<!-- calculators:start -->

### Profit and pricing

#### `marginMarkup()` — Margin and markup calculator

Margin and markup use the same two numbers and give different answers. Enter your cost and price to see both, plus the price you need to hit a target margin.

```text
Margin = (Price − Cost) ÷ Price
Markup = (Price − Cost) ÷ Cost
Price for a target margin = Cost ÷ (1 − margin)
Max cost at a target margin = Price × (1 − margin)
```

```ts
marginMarkup({cost: 24, price: 60, target: 50})
// → margin: 60, profit: 36, markup: 150, priceForTarget: 48, maxCost: 30
```

Free online version: https://analify-ai.scalyax.ai/tools/margin-markup-calculator

#### `breakEven()` — Break-even calculator

Find how many orders a month you need before the business stops losing money, how many you need for a profit target, and where you stand today.

```text
Contribution = AOV − variable cost − ad cost per order
Break-even orders = ⌈Fixed costs ÷ Contribution⌉
Orders for a profit target = ⌈(Fixed + target) ÷ Contribution⌉
Margin of safety = (Current orders − Break-even) ÷ Current orders
```

```ts
breakEven({fixed: 8000, aov: 60, variable: 28, adCost: 14, orders: 450, target: 3000})
// → breakEvenOrders: 445, perDay: 14.83, breakEvenRevenue: 26700, ordersForTarget: 612, profitNow: 100, safety: 1.11, contribution: 18
```

Free online version: https://analify-ai.scalyax.ai/tools/break-even-calculator

#### `productPricing()` — Product pricing calculator

Work back from your costs to the price that keeps the margin you want, after shipping, payment fees and your share of fixed costs.

```text
Fixed per unit = Fixed costs ÷ units per month
Price = (COGS + shipping + fixed per unit + fixed fee)
        ÷ (1 − fee % − target margin)
Price with tax = Price × (1 + tax rate)
```

```ts
productPricing({cogs: 18, shipping: 7, fixed: 4000, units: 600, feePct: 2.9, feeFixed: 0.3, margin: 25, tax: 0})
// → price: 44.34, priceWithTax: 44.34, fixedPerUnit: 6.67, feesPerUnit: 1.59, profitPerUnit: 11.08
```

Free online version: https://analify-ai.scalyax.ai/tools/product-pricing-calculator

#### `contributionMargin()` — Contribution margin calculator

See what one order really leaves after product cost, shipping, payment fees and the ad cost to get it, and how much ad cost an order can carry.

```text
Contribution = Price − COGS − shipping − Price × fee % − ad cost
Contribution ratio = Contribution ÷ Price
Max ad cost per order = Price − COGS − shipping − fees
Break-even ROAS = Price ÷ max ad cost per order
```

```ts
contributionMargin({price: 60, cogs: 22, shipping: 7, feePct: 2.9, adCost: 15, orders: 500})
// → contribution: 14.26, ratio: 23.77, monthly: 7130, maxAdCost: 29.26, breakEvenRoas: 2.05
```

Free online version: https://analify-ai.scalyax.ai/tools/contribution-margin-calculator

#### `landedCost()` — Landed cost calculator

Your supplier price is not your product cost. Add freight, customs duty, clearance and local delivery to see what each unit costs when it reaches your shelf.

```text
Freight per unit = Freight ÷ units
Duty per unit = (Supplier price + freight per unit) × duty %   (CIF)
             = Supplier price × duty %                        (FOB)
Landed = Supplier price + freight + duty + clearance + local delivery (per unit)
Max supplier price = (Price × (1 − fee % − target) − freight × (1 + duty if CIF)
                     − clearance − local) ÷ (1 + duty %)
```

```ts
landedCost({supplier: 12, units: 500, freight: 1500, duty: 10, basis: "cif", clearance: 300, local: 250, price: 45, feePct: 2.9, target: 30})
// → landed: 17.6, load: 46.67, dutyPerUnit: 1.5, freightPerUnit: 3, maxSupplier: 23.45
```

Free online version: https://analify-ai.scalyax.ai/tools/landed-cost-calculator

#### `paymentFee()` — Payment fee calculator

See what your payment gateway takes each month, the rate you really pay once fixed fees are added, and what moving sales off a marketplace would save.

```text
Gateway fees = Revenue × rate + Orders × fixed fee
Tax on fees = Gateway fees × tax rate
Effective rate = (Fees + tax) ÷ Revenue
Moved sales = Marketplace sales × 12 × share moved
Yearly saving = Moved × commission − Moved × gateway rate − site cost
```

```ts
paymentFee({revenue: 40000, orders: 700, rate: 2.9, fixed: 0.3, taxOnFees: 0, marketplace: 15000, commission: 15, moved: 40, siteCost: 3000})
// → monthlyFees: 1370, effectiveRate: 3.43, taxOnFees: 0, commissionSaved: 10800, yearlySaving: 5712
```

Free online version: https://analify-ai.scalyax.ai/tools/payment-fee-calculator

#### `wholesaleMargin()` — Wholesale margin calculator

Check that your wholesale price leaves enough for you and for the retailer, and compare it with selling the same product yourself.

```text
Your wholesale margin = (Wholesale − Cost) ÷ Wholesale
Wholesale markup = (Wholesale − Cost) ÷ Cost
Retailer margin = (Retail − Wholesale) ÷ Retail
Direct margin = (Retail − Cost) ÷ Retail
```

```ts
wholesaleMargin({cost: 15, wholesale: 26, retail: 45})
// → wholesaleMargin: 42.31, profitPerUnit: 11, markup: 73.33, retailerMargin: 42.22, directMargin: 66.67
```

Free online version: https://analify-ai.scalyax.ai/tools/wholesale-margin-calculator

### Ads

#### `roas()` — ROAS calculator

A ROAS number means nothing until you know the line it has to beat. Enter spend, revenue and margin to see your ROAS next to your break-even and target ROAS.

```text
ROAS = Revenue ÷ Ad spend
Break-even ROAS = 1 ÷ margin
Target ROAS = 1 ÷ (margin − target net margin)
Profit after ads = Revenue × margin − Ad spend
POAS = Profit after ads ÷ Ad spend
```

```ts
roas({spend: 8000, revenue: 26000, margin: 45, netTarget: 10})
// → roas: 3.25, breakEven: 2.22, targetRoas: 2.86, profit: 3700, poas: 0.46, adShare: 30.77
```

Free online version: https://analify-ai.scalyax.ai/tools/roas-calculator

#### `maxCpa()` — Max cost per order calculator

Find the most you can pay for one order on Meta or TikTok and still make money, for cash on delivery with returns and for prepaid orders.

```text
Profit per delivered = Price − COGS − shipping − fees
Prepaid max CPA = Profit per delivered
COD max per placed order = confirm % × (deliver % × profit per delivered
                           − (1 − deliver %) × (shipping + return fee))
Max CPC = Max per order × click → order rate
```

```ts
maxCpa({price: 60, cogs: 22, shipping: 8, fees: 2, confirm: 80, deliver: 75, returnFee: 5, cvr: 2})
// → maxPerOrder: 14.2, ignoringReturns: 16.8, prepaid: 28, maxCpc: 0.28, maxCpcPrepaid: 0.56
```

Free online version: https://analify-ai.scalyax.ai/tools/max-cpa-calculator

#### `adBudget()` — Ad budget calculator

Start from the revenue you want, get the ad budget it takes, then check whether your CPM, click rate and conversion rate can actually deliver it.

```text
Budget = Revenue goal ÷ target ROAS
Daily budget = Budget ÷ 30.4
Clicks = Budget ÷ CPM × 1,000 × CTR
Orders = Clicks × conversion rate
Funnel revenue = Orders × AOV
```

```ts
adBudget({goal: 60000, roas: 3, cpm: 12, ctr: 1.2, cvr: 2, aov: 60})
// → budget: 20000, daily: 657.89, funnelRevenue: 24000, goalReached: 40, orders: 400, costPerOrder: 50, clicks: 20000
```

Free online version: https://analify-ai.scalyax.ai/tools/ad-budget-calculator

#### `mer()` — MER calculator

MER (marketing efficiency ratio) checks all your marketing against all your revenue, so no platform can take credit for sales it didn't make.

```text
Marketing = Paid ads + email + agency + tools
MER = Total revenue ÷ Marketing
Break-even MER = 1 ÷ margin
Profit after marketing = Revenue × margin − Marketing
Over-claim = Platform revenue − Total revenue × (platform spend ÷ paid spend)
```

```ts
mer({revenue: 80000, paid: 18000, email: 800, agency: 2500, tools: 600, margin: 45, metaSpend: 12000, metaRevenue: 45000})
// → mer: 3.65, breakEven: 2.22, paidRoas: 4.44, share: 27.38, profitAfter: 14100, metaRoas: 3.75, overClaim: -8333.33
```

Free online version: https://analify-ai.scalyax.ai/tools/mer-calculator

#### `adMetrics()` — CPA, CPM, CPC and CTR calculator

Turn five numbers from any ad account into the six metrics that explain a campaign: CPA, CPM, CTR, CPC, conversion rate and ROAS.

```text
CPM = Spend ÷ Impressions × 1,000
CTR = Clicks ÷ Impressions
CPC = Spend ÷ Clicks
Conversion rate = Orders ÷ Clicks
CPA = Spend ÷ Orders
ROAS = Revenue ÷ Spend
```

```ts
adMetrics({spend: 3000, impressions: 250000, clicks: 3000, orders: 60, revenue: 4200})
// → cpa: 50, cpm: 12, ctr: 1.2, cpc: 1, cvr: 2, roas: 1.4
```

Free online version: https://analify-ai.scalyax.ai/tools/ad-metrics-calculator

#### `adFrequency()` — Ad frequency calculator

See how often the same people see your ads, per week and per creative, and how many days each creative has before it hits the limit you set.

```text
Frequency = Impressions ÷ Reach
Weekly frequency = Frequency ÷ days × 7
Per creative = Frequency ÷ active creatives
Days to limit = Limit ÷ (Frequency ÷ days ÷ creatives)
```

```ts
adFrequency({impressions: 500000, reach: 150000, days: 30, spend: 6000, creatives: 3, limit: 3})
// → frequency: 3.33, weekly: 0.78, perCreative: 1.11, daysToLimit: 81, cpm: 12, costPerPerson: 0.04
```

Free online version: https://analify-ai.scalyax.ai/tools/ad-frequency-calculator

#### `influencerRoi()` — Influencer ROI calculator

Check whether a creator paid back: ROI, ROAS and cost per order from the fee and product you sent, plus what the same reach would cost in ads.

```text
Cost = Fee + product sent
ROI = (Revenue − Cost) ÷ Cost
ROAS = Revenue ÷ Cost
Cost per order = Cost ÷ Orders
Media value = Impressions × your CPM ÷ 1,000
```

```ts
influencerRoi({fee: 2000, product: 300, impressions: 200000, clicks: 2500, orders: 60, revenue: 3900, cpm: 12})
// → roi: 69.57, roas: 1.7, costPerOrder: 38.33, costPerClick: 0.92, ctr: 1.25, mediaValue: 2400
```

Free online version: https://analify-ai.scalyax.ai/tools/influencer-roi-calculator

### Cash on delivery, shipping and returns

#### `codProfit()` — COD profit calculator

Cash on delivery profit is decided after the order: by how many orders get confirmed and how many the courier delivers. Enter your funnel and costs to see what you keep after returns and ads.

```text
Confirmed = Placed × confirmation rate
Delivered = Confirmed × delivery rate
Returned = Confirmed − Delivered
Revenue = Delivered × order value
Profit = Revenue − COD fee
  − Delivered × (COGS + shipping)
  − Returned × (shipping + return fee)
  − Returned × COGS × unsellable share
  − Ad spend
```

```ts
codProfit({placed: 1000, price: 60, cogs: 22, shipping: 7, returnFee: 4, codFee: 1, confirm: 80, deliver: 75, ads: 12000, unsellable: 0})
// → profit: 4040, delivered: 600, returned: 200, revenue: 36000, returnsCost: 2200, perDelivered: 6.73, adsPerDelivered: 20
```

Free online version: https://analify-ai.scalyax.ai/tools/cod-profit-calculator

#### `courierCost()` — Courier cost calculator

The cheapest courier is not always the one that earns you the most. Compare three couriers by cost per delivered order and profit per shipment, with returns included.

```text
Cost per shipment = Fee + (1 − delivery rate) × return fee
Cost per delivered order = Cost per shipment ÷ delivery rate
Profit per shipment = Delivery rate × (order value − COGS) − cost per shipment
Monthly gap = (Best − cheapest profit per shipment) × shipments
```

```ts
courierCost({price: 60, cogs: 22, shipments: 1000, aFee: 7.5, aReturn: 3, aRate: 72, bFee: 6, bReturn: 4, bRate: 64, cFee: 8, cReturn: 2.5, cRate: 78})
// → best: 'c', cheapest: 'b', gap: 4210, aPerDelivered: 11.58, aProfit: 19.02, bPerDelivered: 11.63, bProfit: 16.88, cPerDelivered: 10.96, cProfit: 21.09
```

Free online version: https://analify-ai.scalyax.ai/tools/courier-cost-calculator

#### `returnsCost()` — Returns cost calculator

A return costs more than the refund suggests and less than many calculators claim. See the real cost per return and what your return rate does to break-even ROAS.

```text
Margin per order = AOV − COGS − shipping out
Out of pocket per return = shipping out + return shipping + handling
                           + COGS × (1 − resold %)
Cost per return = Margin + out of pocket
Kept per order = (1 − rate) × margin − rate × out of pocket
Break-even ROAS = AOV ÷ kept per order
Max return rate = Margin ÷ (margin + out of pocket)
```

```ts
returnsCost({orders: 1000, rate: 12, aov: 70, cogs: 25, out: 7, back: 6, handling: 2, resold: 70})
// → monthly: 7260, perReturn: 60.5, roasBefore: 1.84, roasAfter: 2.28, maxRate: 62.81
```

Free online version: https://analify-ai.scalyax.ai/tools/returns-cost-calculator

### Offers and order value

#### `discount()` — Discount impact calculator

Before you run a sale, see how many extra orders the discount needs just to earn the same profit, and what happens at the lift you expect.

```text
Margin m = (Price − Cost) ÷ Price
Orders needed = d ÷ (m − d)
Profit at full price = (Price − Cost) × Orders
Profit with discount = (Price × (1 − d) − Cost) × Orders × (1 + lift)
Discount cost per extra order = Discount given ÷ extra orders
```

```ts
discount({price: 60, cost: 22, discount: 20, orders: 500, lift: 30})
// → liftNeeded: 46.15, change: -2100, fullProfit: 19000, promoProfit: 16900, costPerExtra: 52
```

Free online version: https://analify-ai.scalyax.ai/tools/discount-calculator

#### `freeShippingThreshold()` — Free shipping threshold calculator

Set free shipping where the extra order value pays for the shipping you absorb. See the threshold your margin supports and test any threshold against it.

```text
Suggested threshold = AOV + shipping ÷ margin (rounded up to 5)
AOV lift = (Threshold − AOV) × share reaching it
Shipping absorbed = Orders × share × shipping
Extra profit = Orders × AOV lift × margin
Net = Extra profit − shipping absorbed
```

```ts
freeShippingThreshold({aov: 55, shipping: 7, margin: 45, orders: 1000, threshold: 75, reach: 30})
// → suggested: 75, newAov: 61, absorbed: 2100, extraProfit: 2700, net: 600
```

Free online version: https://analify-ai.scalyax.ai/tools/free-shipping-threshold-calculator

#### `upsell()` — Upsell calculator

See what an upsell or cross-sell is worth: extra revenue and profit, the new average order value, and the effect over a year.

```text
Extra revenue = Orders × take rate × upsell price
Extra profit = Extra revenue × upsell margin
New AOV = AOV + take rate × upsell price
```

```ts
upsell({orders: 1000, aov: 60, price: 20, take: 10, margin: 50})
// → profit: 1000, revenue: 2000, newAov: 62, aovLift: 3.33, yearly: 12000
```

Free online version: https://analify-ai.scalyax.ai/tools/upsell-calculator

#### `bogo()` — Buy X get Y calculator

See what a buy X get Y offer really costs you: the effective discount, the price per unit and your profit on the whole set.

```text
Effective discount = Y ÷ (X + Y)
Customer pays = X × price
Profit on the set = X × price − (X + Y) × cost
Margin after offer = Profit ÷ customer pays
```

```ts
bogo({buy: 1, free: 1, price: 40, cost: 14})
// → discount: 50, pays: 40, perUnit: 20, profit: 12, margin: 30, singleProfit: 26
```

Free online version: https://analify-ai.scalyax.ai/tools/bogo-calculator

#### `quantityDiscount()` — Quantity discount calculator

Check whether a 'buy 3, save 15%' tier earns more than selling one unit, and how many tier buyers need to be real upgrades for it to pay off.

```text
Tier total = Qty × price × (1 − discount)
Tier profit = Tier total − qty × cost − order cost − fee % × tier total
Single profit = Price − cost − order cost − fee % × price
Pays off when upgraded share ≥ loss ÷ (gain + loss)
```

```ts
quantityDiscount({price: 40, cost: 14, orderCost: 8, feePct: 2.9, qty: 3, discount: 15})
// → tierProfit: 49.04, singleProfit: 16.84, gain: 32.2, unitPrice: 34, paysOffShare: 35.18
```

Free online version: https://analify-ai.scalyax.ai/tools/quantity-discount-calculator

#### `freeGiftVsDiscount()` — Free gift vs discount calculator

Both offers push customers to spend more. Compare a free gift and a percentage discount at the same threshold and see which one keeps more profit.

```text
Extra profit = (Threshold − AOV) × orders × margin
With gift = Extra profit − gift cost × orders
With discount = Extra profit − threshold × discount × orders
```

```ts
freeGiftVsDiscount({aov: 55, threshold: 75, orders: 1000, margin: 45, gift: 5, discount: 10})
// → winner: 'gift', giftProfit: 4000, discountProfit: 1500, difference: 2500, jump: 36.36
```

Free online version: https://analify-ai.scalyax.ai/tools/free-gift-vs-discount-calculator

### Customers

#### `customerLifetimeValue()` — Customer lifetime value calculator

Work out what one customer is worth over the time they buy from you, in revenue and in profit, and the most you can pay to win one.

```text
Revenue CLV = AOV × orders per year × years
Profit CLV = Revenue CLV × margin
LTV:CAC = Profit CLV ÷ CAC
Max CAC = Profit CLV ÷ target ratio
```

```ts
customerLifetimeValue({aov: 60, frequency: 2.2, years: 2, margin: 45, cac: 25, ratio: 3})
// → profitClv: 118.8, revenueClv: 264, ltvCac: 4.75, maxCac: 39.6, perYear: 132
```

Free online version: https://analify-ai.scalyax.ai/tools/customer-lifetime-value-calculator

#### `customerAcquisitionCost()` — Customer acquisition cost calculator

See what a new customer costs you, whether the first order pays it back, and how many months it takes to earn it back if not.

```text
CAC = Marketing spend ÷ new customers
Profit per order = AOV × margin
First-order profit = Profit per order − CAC
Payback months = CAC ÷ (Profit per order × orders per year ÷ 12)
LTV:CAC = Profit per order × orders per year × years ÷ CAC
```

```ts
customerAcquisitionCost({spend: 15000, customers: 600, aov: 60, margin: 45, frequency: 2.2, years: 2})
// → payback: 5.05, cac: 25, firstOrder: 2, ordersToPayback: 0.93, ltvCac: 4.75
```

Free online version: https://analify-ai.scalyax.ai/tools/customer-acquisition-cost-calculator

#### `retentionRate()` — Retention and churn calculator

See how many customers you keep and lose in a period, how long an average customer stays, and the right way to turn yearly churn into monthly.

```text
Lost = Start + New − End
Retention = (End − New) ÷ Start
Churn = Lost ÷ Start
Average lifetime = 1 ÷ churn (in periods)
Monthly churn from annual = 1 − (1 − annual)^(1/12)
```

```ts
retentionRate({start: 2000, end: 2100, new: 400, annual: 50})
// → retention: 85, churn: 15, lost: 300, lifetime: 6.67, monthlyFromAnnual: 5.61, naive: 4.17
```

Free online version: https://analify-ai.scalyax.ai/tools/retention-rate-calculator

#### `loyaltyProgramRoi()` — Loyalty program ROI calculator

Before you launch a loyalty program, see what a higher repeat rate is worth in extra customers, revenue and profit over a year.

```text
Extra repeat customers = Customers × (rate with program − rate now)
Extra revenue per month = Extra customers × AOV
Extra revenue per year = Extra customers × AOV × repeat orders per year
Extra profit per year = Extra revenue per year × margin
```

```ts
loyaltyProgramRoi({customers: 1000, aov: 60, now: 20, with: 25, repeats: 3, margin: 45})
// → profit: 4050, extraCustomers: 50, monthly: 3000, yearly: 9000
```

Free online version: https://analify-ai.scalyax.ai/tools/loyalty-program-roi-calculator

### Conversion and email

#### `conversionRate()` — Conversion rate calculator

See your conversion rate and revenue per visitor, and what reaching a target conversion rate would add to revenue with the same traffic.

```text
Conversion rate = Orders ÷ Sessions
RPV = Revenue ÷ Sessions
AOV = Revenue ÷ Orders
Orders at target = Sessions × target rate
Extra revenue = (Orders at target − orders) × AOV
```

```ts
conversionRate({sessions: 50000, orders: 900, revenue: 54000, target: 2.5})
// → rate: 1.8, rpv: 1.08, aov: 60, ordersAtTarget: 1250, extra: 21000
```

Free online version: https://analify-ai.scalyax.ai/tools/conversion-rate-calculator

#### `cartAbandonment()` — Cart abandonment calculator

See how much revenue is left in checkouts people start and don't finish, and what a recovery message on WhatsApp or email could bring back.

```text
Abandonment rate = 1 − completed ÷ started
Revenue left = (Started − completed) × AOV
Recoverable = Revenue left × recovery rate
```

```ts
cartAbandonment({started: 3000, completed: 900, aov: 60, recovery: 10})
// → rate: 70, lost: 126000, recoverable: 12600, carts: 2100
```

Free online version: https://analify-ai.scalyax.ai/tools/cart-abandonment-calculator

#### `abTestDuration()` — A/B test duration calculator

Find out how many visitors each version needs and how many days your test must run before you can trust the result.

```text
p₂ = p₁ × (1 + lift)
n per variant = (z_α × √(2p̄(1 − p̄)) + z_β × √(p₁(1 − p₁) + p₂(1 − p₂)))²
                ÷ (p₂ − p₁)²
Days = n ÷ (daily visitors ÷ 2), at least 7
```

```ts
abTestDuration({daily: 2000, rate: 1.5, lift: 20, confidence: "95"})
// → days: 29, perVariant: 28304, total: 56608, conversions: 425
```

Free online version: https://analify-ai.scalyax.ai/tools/ab-test-duration-calculator

#### `emailListValue()` — Email list value calculator

See what your email list earns each month, what each subscriber is worth over a year, and whether email pays for its cost.

```text
Revenue per send = Open rate × click-to-open × conversion × AOV
Monthly revenue = Revenue per send × sends × subscribers
Profit = Monthly revenue × margin − email cost
Value per subscriber per year = Revenue per send × sends × 12
```

```ts
emailListValue({subscribers: 20000, sends: 8, open: 35, click: 8, cvr: 3, aov: 60, cost: 400, margin: 45})
// → monthly: 8064, profit: 3228.8, roi: 807.2, perSubscriber: 4.84, perSend: 0.05
```

Free online version: https://analify-ai.scalyax.ai/tools/email-list-value-calculator

### Inventory and shipping

#### `reorderPoint()` — Reorder point calculator

Know when to reorder and how much: reorder point and safety stock by two methods, plus the order size that keeps ordering and holding costs lowest.

```text
Reorder point = Daily sales × lead time + safety stock
Safety (max method) = Peak daily × longest lead − daily × lead
Safety (statistical) = z × √(lead × σ_demand² + daily² × σ_lead²)
EOQ = √(2 × yearly demand × order cost ÷ (unit cost × holding %))
```

```ts
reorderPoint({daily: 20, lead: 10, peak: 30, longest: 14, demandSd: 6, leadSd: 2, service: "95", orderCost: 60, unitCost: 9, holding: 25})
// → rop: 272.82, safety: 72.82, ropMax: 420, safetyMax: 220, eoq: 623.97, ordersPerYear: 11.7
```

Free online version: https://analify-ai.scalyax.ai/tools/reorder-point-calculator

#### `inventoryTurnover()` — Inventory turnover calculator

See how fast your stock sells, what it earns for every unit of money tied up in it, and how many days you have left before you run out.

```text
Turnover = COGS ÷ average inventory value
Days to sell = 365 ÷ turnover
GMROI = (Revenue − COGS) ÷ average inventory value
Days left = Units in stock ÷ units sold per day
Reorder in = Days left − lead time
```

```ts
inventoryTurnover({cogs: 600000, inventory: 100000, revenue: 1400000, stock: 800, daily: 20, lead: 10})
// → daysLeft: 40, reorderIn: 30, turnover: 6, daysToSell: 60.83, gmroi: 8
```

Free online version: https://analify-ai.scalyax.ai/tools/inventory-turnover-calculator

#### `salesForecast()` — Sales forecast calculator

Project where steady monthly growth takes your revenue: month by month, the final month and the total for the period.

```text
Month n revenue = Base × (1 + growth)^n
Total = sum of months 1 to n
Growth vs today = Final month ÷ base − 1
```

```ts
salesForecast({base: 40000, growth: 5, months: 12})
// → final: 71834.25, total: 668519.31, growth: 79.59, trend: [42000, 44100, 46305, …]
```

Free online version: https://analify-ai.scalyax.ai/tools/sales-forecast-calculator

#### `volumetricWeight()` — Volumetric weight calculator

Couriers bill the bigger of the actual weight and the space a parcel takes. See which one you are paying for.

```text
Volumetric weight = L × W × H (cm) ÷ divisor
Chargeable weight = max(actual, volumetric)
```

```ts
volumetricWeight({length: 40, width: 30, height: 20, actual: 2, divisor: 5000})
// → chargeable: 4.8, volumetric: 4.8, billedOn: 'box'
```

Free online version: https://analify-ai.scalyax.ai/tools/volumetric-weight-calculator

<!-- calculators:end -->

## Use your real numbers

These functions take numbers you type. [Analify](https://analify-ai.scalyax.ai) reads most of them live from Shopify, your ad accounts and your courier, and tracks results such as Blended Profit and break-even ROAS every day.

## Contributing

Formula changes need a test with a worked example: the numbers in, the result out, and where the example comes from. After changing a definition or label, run `npm run generate` to refresh `src/calculators.ts` and the reference above.

## License

MIT
