const webpack = require( 'webpack' );
const path = require( 'path' );
const merge = require( 'webpack-merge' );
const nodeExternals = require( 'webpack-node-externals' );
const StartServerPlugin = require( 'start-server-webpack-plugin' );
const baseConfig = require( './webpack.base' );

const config = {
  entry: ['webpack/hot/poll?1000', './src/index'],
  watch: true,
  devtool: 'sourcemap',
  target: 'node',
  node: {
    __filename: true,
    __dirname: true,
  },
  externals: [nodeExternals( { whitelist: ['webpack/hot/poll?1000'] } )],
  plugins: [
    new StartServerPlugin( 'server.js' ),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    // new webpack.DefinePlugin( { 'process.env': { BUILD_TARGET: JSON.stringify( 'server' ) } } ),
    new webpack.BannerPlugin( {
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false,
    } ),
  ],
  output: {
    path: path.join( __dirname, 'build' ),
    filename: 'server.js',
  },
};

module.exports = merge( baseConfig, config );
