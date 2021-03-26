const webpackNodeExternals = require( 'webpack-node-externals' );

const paths = require( './paths' );

module.exports = {
  target: 'node',
  entry: paths.appEntry,
  output: {
    path: paths.dist,
    filename: 'server.js',
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: ['babel-loader'],
        exclude: [/node_modules/, /workers/],
      },
    ],
  },
  externals: [webpackNodeExternals()],
};
