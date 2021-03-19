const path = require( 'path' );
const fs = require( 'fs' );

/**
 * Gets the root directory for the application.
 */
const appDirectory = fs.realpathSync( process.cwd() );

/**
 * Resolves relative paths from the app root.
 *
 * @param {string} relativePath  A relative path to a given directory or file.
 */
const resolvePlugin = relativePath => path.resolve( appDirectory, relativePath );

module.exports = {
  appEntry: resolvePlugin( 'src/index.js' ),
  dist: resolvePlugin( 'build' ),
  workersEntry: resolvePlugin( 'src/workers/consumer.js' ),
};
