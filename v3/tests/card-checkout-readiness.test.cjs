const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

const onboarding=read('v3/onboarding.js');
const panel=read('v3/subscription-panel.js');
const readiness=read('supabase/functions/xrmovi-billing-readiness/index.ts');
const checkout=read('supabase/functions/xrmovi-create-subscription/index.ts');
const diagnostics=read('supabase/functions/xrmovi-billing-diagnostics/index.ts');

test('card onboarding does not silently ignore disabled checkout', () => {
 assert.match(onboarding, /reason==='pilot_only'/);
 assert.match(onboarding, /Nenhuma cobrança foi iniciada/);
 assert.match(onboarding, /xrm-bill-plan-feedback/);
 assert.doesNotMatch(onboarding, /if\(readiness\.error\|\|readiness\.data\?\.enabled!==true\)return;/);
});
test('billing controls are disabled until readiness is verified, with safe retry', () => {
 assert.match(panel, /checkoutButton\.disabled=!billingReady/);
 assert.match(panel, /pixButton\.disabled=!billingReady/);
 assert.match(panel, /xrm-bill-retry-readiness/);
 assert.match(panel, /reason==='pilot_only'/);
 assert.match(panel, /Nenhuma cobrança foi criada/);
});
test('server readiness requires valid provider config and does not bypass pilot', () => {
 assert.match(readiness, /XRMOVI_BILLING_ENABLED/);
 assert.match(readiness, /XRMOVI_BILLING_PILOT_ONLY/);
 assert.match(readiness, /xrmovi_billing_pilot_allowed/);
 assert.match(readiness, /provider_not_ready/);
 assert.match(readiness, /pilot_only/);
 assert.match(checkout, /xrmovi_billing_pilot_allowed/);
 assert.match(checkout, /status:"pending"/);
});
test('admin makes pilot-only launch risk visible',()=>{
 assert.match(diagnostics, /billing_pilot_only/);
 assert.match(read('admin/index.html'), /HOMOLOGAÇÃO RESTRITA/);
});
