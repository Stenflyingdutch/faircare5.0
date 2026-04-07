const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const mailServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/server/mail.service.ts'), 'utf8');

test('partner invite fallback is also enabled for production callable transport failures', () => {
  assert.match(partnerFlowSrc, /const fallbackEligible = shouldUseCallableInviteFallback\(callableError\)/);
  assert.match(partnerFlowSrc, /if \(fallbackEligible\) \{/);
  assert.match(partnerFlowSrc, /mail\.invite\.callable_fallback/);
});

test('partner invite maps mail categories to user-facing error buckets', () => {
  assert.match(partnerFlowSrc, /error\.category === 'validation_error'/);
  assert.match(partnerFlowSrc, /error\.category === 'config_error'/);
  assert.match(partnerFlowSrc, /error\.category === 'provider_error'/);
  assert.match(partnerFlowSrc, /mail\.invite\.validation_failed/);
  assert.match(partnerFlowSrc, /mail\.invite\.config_error/);
  assert.match(partnerFlowSrc, /mail\.invite\.provider_error/);
});

test('mail service provides centralized validateMailConfig helper and structured invite logs', () => {
  assert.match(mailServiceSrc, /export function validateMailConfig\(\)/);
  assert.match(mailServiceSrc, /MAIL_PROVIDER ist ungültig oder nicht gesetzt/);
  assert.match(mailServiceSrc, /input\.type === 'partner_invitation' \? 'mail\.invite' : 'mail\.dispatch'/);
  assert.match(mailServiceSrc, /\$\{inviteLogPrefix\}\.provider_error/);
  assert.match(mailServiceSrc, /\$\{inviteLogPrefix\}\.success/);
});

test('mail config validates provider-specific keys and MAIL_FROM', () => {
  assert.match(mailServiceSrc, /mail_config_missing_resend_key/);
  assert.match(mailServiceSrc, /mail_config_missing_sendgrid_key/);
  assert.match(mailServiceSrc, /mail_config_missing_from/);
  assert.match(mailServiceSrc, /mail_config_resend_domain_invalid/);
});
