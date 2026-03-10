const path = require('path');

module.exports = function (api) {
  api.cache(true);

  const mobileNodeModules = path.join(__dirname, 'synthetic_life', 'mobile', 'node_modules');

  return {
    presets: ['babel-preset-expo'],
    plugins: [require.resolve('expo-router/babel', { paths: [mobileNodeModules] })],
  };
};
