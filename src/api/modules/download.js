import URL from 'url';
import Mime from 'mime-types';
import Path from 'path';
import Request from 'request';
import fs from 'fs';
import crypto from 'crypto';
import tempFiles from '../../services/tempfiles';

const md5hash = path => new Promise( ( resolve, reject ) => {
  const hash = crypto.createHash( 'md5' );
  const rs = fs.createReadStream( path );

  rs.on( 'error', reject );
  rs.on( 'data', chunk => hash.update( chunk ) );
  rs.on( 'end', () => resolve( hash.digest( 'hex' ) ) );
} );

/**
 * Downloads content for the given URL.  Returns an object containing
 * properties inferred from the URL and the response's Content Type.
 * Must include requestId so that temp files can be tracked.
 *
 * Remember to add the cleanTempFiles middelware so that temp files are deleted.
 *
 * @param url
 * @param requestId
 * @returns {Promise<any>}
 */
export default function download( url, requestId ) {
  return new Promise( ( resolve, reject ) => {
    const args = URL.parse( url );
    const props = {};

    const tmpObj = tempFiles.createTempFile( requestId );
    let cur = 0;
    let len = 0;
    let total = 0;
    let lastUpdate = 0;

    Request.get( {
      url: encodeURI( url ),
      gzip: true,
      headers: { 'User-Agent': 'API' },
    } )
      .on( 'timeout', () => {
        console.error( `Timeout downloading [${url}]` );
      } )
      .on( 'data', chunk => {
        const now = new Date();

        cur += chunk.length;
        if ( now - lastUpdate > 10 * 1000 ) {
          // eslint-disable-next-line no-mixed-operators
          console.log( `Downloading ${props.basename}: ${( 100.0 * cur / len ).toFixed( 0 )}% ${(
            cur / 1048576
          ).toFixed( 2 )} mb. Total size: ${total.toFixed( 2 )} mb` );
          lastUpdate = now;
        }
      } )
      .on( 'error', error => {
        console.error( `Error downloading [${url}]`, error );

        return reject( error );
      } )
      .on( 'uncaughtException', error => {
        console.error( `Unhandled error downloading [${url}]`, error );

        return reject( error );
      } )
      .on( 'response', response => {
        len = parseInt( response.headers['content-length'], 10 );
        total = len / 1048576; // 1048576 - bytes in  1Megabyte

        props.basename = args.path.split( '/' ).pop();
        props.contentType = response.headers['content-type'];
        // Getting the extension this way could be erroneous
        props.ext = Path.extname( props.basename );
        // Cross check ext against known extensions for this content type
        const typeExts = Mime.extensions[props.contentType];

        if ( typeExts ) {
          if (
            props.ext.replace( '.', '' ) !== 'srt' // do not remove srt extension
            && typeExts.indexOf( props.ext.replace( '.', '' ) ) < 0
          ) {
            // extension does not exist so use the default extension
            props.ext = `.${Mime.extension( props.contentType )}`;
          }
        }
      } )
      .on( 'end', () => {
        const exists = fs.existsSync( tmpObj.name );

        console.log( `download complete and ${tmpObj.name} exists:`, exists );
        if ( !exists ) {
          return reject( new Error( 'File created from download does not exist.' ) );
        }
        md5hash( tmpObj.name )
          .then( result => {
            props.md5 = result;
            resolve( { props, filePath: tmpObj.name } );
          } )
          .catch( err => reject( err ) );
      } )
      .pipe( fs.createWriteStream( tmpObj.name ) );
  } );
}
