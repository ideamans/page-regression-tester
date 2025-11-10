/**
 * Mock for ora (CommonJS)
 */

const mockOra = () => ({
  start: () => mockOra(),
  succeed: () => mockOra(),
  fail: () => mockOra(),
  warn: () => mockOra(),
  info: () => mockOra(),
  stop: () => mockOra(),
  text: '',
})

module.exports = mockOra
module.exports.default = mockOra
