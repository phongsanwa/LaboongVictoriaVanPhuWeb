// webpack.extra.js — nội dung đúng, không thêm gì khác
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { join } = require('path');

const appName = process.env.APP_NAME;
const appRoot = join(__dirname, 'apps', appName);

const imgSrc = join(appRoot, 'src/assets/img');

module.exports = {
  output: {
    libraryTarget: 'umd',
    globalObject: 'this',
    filename: '[name].js',
  },
  experiments: {
    outputModule: false,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: imgSrc,
          to: 'assets/img',
          noErrorOnMissing: true
        }
      ]
    })
  ]
};
