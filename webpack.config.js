const path = require( 'path' );
const webpackNodeExternals = require( 'webpack-node-externals' );

module.exports = {
  target: 'node',

  entry: './src/index.js',

  output: {
    path: path.join( __dirname, 'build' ),
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
