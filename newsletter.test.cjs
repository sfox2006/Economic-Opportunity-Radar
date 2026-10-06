const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const code = readFileSync('dist/newsletter.js', 'utf8');
function signupFor(url) {
  const signup = { removeAttribute(key) { delete this[key]; } };
  const footer = { removeAttribute(key) { delete this[key]; } };
  const status = {};
  vm.runInNewContext(code, { URL, radarConfig: { newsletterSignupUrl: url }, document: {
    getElementById: id => id === 'newsletter-signup' ? signup : id === 'footer-newsletter-signup' ? footer : status
  }});
  return { signup, footer, status };
}
test('missing or invalid newsletter configuration never links the political form', () => {
  for (const url of ['', 'not a URL', 'http://docs.google.com/forms/d/e/example/viewform', 'https://example.org/forms/d/e/example/viewform']) {
    const { signup, status } = signupFor(url);
    assert.equal(signup.hidden, true); assert.equal(signup.href, undefined); assert.equal(status.hidden, false);
  }
  const config = vm.createContext({});
  vm.runInContext(readFileSync('dist/config.js', 'utf8'), config);
  assert.equal(vm.runInContext('radarConfig.newsletterSignupUrl', config), 'https://docs.google.com/forms/d/e/1FAIpQLScxxkzrxDvpnakIf5395skcU5-BvKPxx9aIkjm4kR8XNpPwSw/viewform');
  assert.doesNotMatch(readFileSync('dist/index.html', 'utf8'), /1FAIpQLSdhSlAeNGTWPpnG3ZrEx8mASD/);
});
test('configured economics signup opens its form safely', () => {
  const url = 'https://docs.google.com/forms/d/e/example-economics-form/viewform';
  const { signup, footer, status } = signupFor(url);
  assert.equal(signup.href, url); assert.equal(signup.hidden, false); assert.equal(status.hidden, true);
  assert.equal(signup.target, '_blank'); assert.equal(signup.rel, 'noopener noreferrer');
  assert.equal(footer.href,url); assert.equal(footer.hidden,false);
  assert.equal(footer.target,'_blank'); assert.equal(footer.rel,'noopener noreferrer');
});
