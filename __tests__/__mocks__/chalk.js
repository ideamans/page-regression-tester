/**
 * Mock for chalk (CommonJS)
 */

const mockChalk = {
  blue: (text) => text,
  green: (text) => text,
  yellow: (text) => text,
  red: (text) => text,
  gray: (text) => text,
}

module.exports = mockChalk
module.exports.default = mockChalk
