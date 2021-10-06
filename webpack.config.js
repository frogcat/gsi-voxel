const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/sw.js',
  mode: 'development', //'production',
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'sw.js'
  },
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })],
  }
};
