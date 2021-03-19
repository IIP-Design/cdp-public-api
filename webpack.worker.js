const path = require( 'path' );
const webpackNodeExternals = require( 'webpack-node-externals' );

module.exports = {
  target: 'node',

  entry: './src/workers/consumer.js',

  output: {
    path: path.join( __dirname, 'build' ),
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
