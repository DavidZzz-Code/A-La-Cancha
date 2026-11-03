const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  globalIgnores(['**/dist/**', '**/dist-auth/**', '**/dist-native/**', '**/.expo/**', '**/node_modules/**']),
  expoConfig,
]);
