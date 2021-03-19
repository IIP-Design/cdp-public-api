const webpackNodeExternals = require( 'webpack-node-externals' );

const paths = require( './paths' );

module.exports = {
  target: 'node',
  entry: paths.workersEntry,
  output: {
    path: paths.dist,
    filename: 'consumer.js',
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: ['babel-loader'],
      },
    ],
  },
  externals: [webpackNodeExternals()],
};
