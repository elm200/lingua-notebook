import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInterceptableLink } from '../public/js/routerLink.js';

const ORIGIN = 'https://example.com';

test('isInterceptableLink: 同一オリジンの.htmlリンクは横取り対象', () => {
  assert.equal(isInterceptableLink({ href: 'https://example.com/words.html' }, ORIGIN), true);
});

test('isInterceptableLink: 相対パスも同一オリジンとして扱われる', () => {
  assert.equal(isInterceptableLink({ href: '/history.html?q=abc' }, ORIGIN), true);
});

test('isInterceptableLink: 別オリジンへのリンクは対象外', () => {
  assert.equal(isInterceptableLink({ href: 'https://other.example.com/words.html' }, ORIGIN), false);
});

test('isInterceptableLink: .html以外のパス(APIなど)は対象外', () => {
  assert.equal(isInterceptableLink({ href: 'https://example.com/api/words' }, ORIGIN), false);
});

test('isInterceptableLink: target指定のあるリンクは対象外', () => {
  assert.equal(isInterceptableLink({ href: 'https://example.com/words.html', target: '_blank' }, ORIGIN), false);
});

test('isInterceptableLink: target="_self"は対象', () => {
  assert.equal(isInterceptableLink({ href: 'https://example.com/words.html', target: '_self' }, ORIGIN), true);
});

test('isInterceptableLink: download属性付きリンクは対象外', () => {
  assert.equal(isInterceptableLink({ href: 'https://example.com/words.html', download: true }, ORIGIN), false);
});

test('isInterceptableLink: 不正なURLは対象外', () => {
  assert.equal(isInterceptableLink({ href: 'not a url' }, ORIGIN), false);
});
