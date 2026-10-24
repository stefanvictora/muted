import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, matchesDomain, hostPatterns } from '../extension/core/domains.js';

test('Domainregeln kanonisieren Namen und treffen nur echte Subdomains', () => {
  assert.equal(normalizeDomain('  BÜCHER.Example. '), 'xn--bcher-kva.example');
  assert.equal(matchesDomain('old.reddit.com', 'reddit.com'), true);
  assert.equal(matchesDomain('reddit.com', 'reddit.com'), true);
  assert.equal(matchesDomain('notreddit.com', 'reddit.com'), false);
  assert.equal(matchesDomain('reddit.com.example.org', 'reddit.com'), false);
  assert.deepEqual(hostPatterns('reddit.com'), ['http://*.reddit.com/*', 'https://*.reddit.com/*']);
});

test('Hostregeln lehnen URLs und ungültige DNS-Namen ab; IPs und localhost sind exakt', () => {
  for (const invalid of [
    '',
    'https://example.com',
    'example.com/a',
    'a:80',
    'u@host',
    '*.example.com',
    'a?b',
    'a#b',
    'a\\b',
    'a..b',
    '-a.de',
    'a_.de',
    'a-.de',
    'a'.repeat(64) + '.de',
    Array(5).fill('a'.repeat(60)).join('.'),
    '<b>',
    'a b',
    '%61.de',
    '127.1',
    '0x7f000001',
  ]) {
    assert.throws(() => normalizeDomain(invalid), undefined, invalid);
  }
  assert.equal(normalizeDomain('[2001:0db8::1]'), '[2001:db8::1]');
  assert.equal(normalizeDomain('127.0.0.1'), '127.0.0.1');
  assert.deepEqual(hostPatterns('localhost'), ['http://localhost/*', 'https://localhost/*']);
  assert.deepEqual(hostPatterns('[::1]'), ['http://[::1]/*', 'https://[::1]/*']);
  assert.equal(matchesDomain('x.localhost', 'localhost'), false);
  assert.equal(matchesDomain('x.127.0.0.1', '127.0.0.1'), false);
});
