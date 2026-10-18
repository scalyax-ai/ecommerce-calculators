# Publishing checklist

Nothing here is public yet. These steps create a public GitHub repo and an npm package; run them only when you're ready.

## 1. GitHub

- **Name:** `ecommerce-calculators`
- **Description:** 35 tested ecommerce calculators in TypeScript: ROAS and break-even ROAS, COD profit after RTO, max CPA, MER, contribution margin, CLV, CAC payback, discount impact and more. Zero dependencies.
- **Website:** https://analify-ai.scalyax.ai/tools
- **Topics:** `ecommerce` `calculator` `roas` `break-even` `cash-on-delivery` `rto` `unit-economics` `shopify` `cac` `ltv` `typescript` `marketing-analytics`

```bash
git add -A
git commit -m "ecommerce-calculators 0.1.0"
gh repo create scalyax-ai/ecommerce-calculators --public --source . --push --description "35 tested ecommerce calculators in TypeScript: ROAS, break-even ROAS, COD profit after RTO, max CPA, MER, CLV, CAC payback and more. Zero dependencies." --homepage "https://analify-ai.scalyax.ai/tools"
gh repo edit scalyax-ai/ecommerce-calculators --add-topic ecommerce,calculator,roas,break-even,cash-on-delivery,rto,unit-economics,shopify,cac,ltv,typescript,marketing-analytics
```

`repository` and `bugs` are already set in package.json.

## 2. npm

The name `ecommerce-calculators` was free on 2026-10-18. Check again right before publishing.

```bash
npm view ecommerce-calculators   # should 404
npm login
npm publish --access public      # runs typecheck, tests and build first (prepublishOnly)
```

## 3. Link it back

- Marketing site: link the GitHub repo from the /tools hub and from llms.txt / llms-full.txt.
- GitHub README already links every calculator to its free page.

## Keeping it in sync

The formulas live in the marketing site at `components/marketing/tools/calculators/` (engine.ts, defs-*.ts). When a formula changes there:

1. Copy the changed file into `src/` (defs files go to `src/defs/`, imports become `../engine`).
2. If labels or formulas changed, refresh `scripts/labels.en.json` from `messages/en/tools.json`.
3. `npm run generate && npm test`, bump the version, publish.
