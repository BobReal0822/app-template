const sharedConfig = require('eslint-config-molindo/.prettierrc.json');

module.exports = {
  ...sharedConfig,
  // Keep spaces inside braces: import { foo } from 'bar'
  bracketSpacing: true,
  // Keep trailing commas in multiline structures (imports/objects/arrays/etc.)
  trailingComma: 'all',
};
