const nodeExternals = require( 'webpack-node-externals' );
const path = require( 'path' );
const merge = require( 'webpack-merge' );
const baseConfig = require( './webpack.base' );

process.env.NODE_ENV = 'testing';

const config = {
  target: 'node',
  output: {
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
  },
  resolve: {
    alias: {
      '~/helpers.test': path.resolve( __dirname, 'test/helpers.test' ),
      '~helpers.test': path.resolve( __dirname, 'test/helpers.test' ),
      '~api.test': path.resolve( __dirname, 'test/api.test' ),
      '~/api.test': path.resolve( __dirname, 'test/api.test' ),
    },
  },
  devtool: 'cheap-module-source-map',
  externals: [nodeExternals()],
};

module.exports = merge( baseConfig, config );
