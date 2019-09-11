import Request from 'request';
import Mime from 'mime-types';

export const download = ( req, res ) => {
  let filename;
  let url;
  if ( req.body.url && req.body.filename ) {
    ( { url } = req.body );
  } else if ( req.params.opts && !req.params.filename ) {
    // This is mainly kept for backwards compatability but should be removed eventually
    const opts = JSON.parse( Buffer.from( req.params.opts, 'base64' ).toString() );
    ( { filename, url } = opts );
  } else {
    // filename is at the end of the URL so we don't need it as the browser will handle it
    let opts = null;
    if ( req.params.opts ) {
      ( { opts } = req.params );
    } else if ( req.params['0'] ) {
      // some base64 encodings for non-latin filenames have slashes forcing us to use regex
      // in the route which prevents the use of named parameters
      opts = req.params['0'];
    }
    if ( !opts ) {
      return res.status( 404 ).send( 'Invalid download URL.' );
    }
    url = encodeURI( Buffer.from( opts, 'base64' ).toString() );
  }
  const mimeType = Mime.lookup( url ) || 'application/octet-stream';
  const reqHead = Request.head( { url }, ( error, response ) => {
    if ( error ) {
      reqHead.abort();
      return res.status( 404 ).json( error );
    }
    if ( response.statusCode !== 200 ) {
      reqHead.abort();
      return res.status( 404 ).send( 'File not found.' );
    }
    const fileSize = response.headers['content-length'];
    // Chunks based streaming
    if ( req.headers.range ) {
      const { range } = req.headers;
      const parts = range.replace( /bytes=/, '' ).split( '-' );
      const start = parseInt( parts[0], 10 );
      const end = parts[1] ? parseInt( parts[1], 10 ) : fileSize - 1;
      const chunksize = end - start + 1; // eslint-disable-line no-mixed-operators

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType
      };
      res.writeHead( 206, head );
      Request.get( url, {
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          connection: 'keep-alive',
          range,
          'accept-ranges': 'bytes'
        }
      } ).pipe( res );
    } else {
      if ( fileSize ) res.setHeader( 'Content-Length', fileSize );
      res.setHeader( 'Content-Type', mimeType );
      // if the filename is null then
      res.setHeader( 'Content-Disposition', `attachment${filename ? `; filename=${filename}` : ''}` );
      Request.get( url ).pipe( res );
    }
  } );
};

/**
 * Converts a string IP address (#.#.#.#) to an integer.
 *
 * @param ip
 * @returns {number}
 */
const ipToNum = ip => Number( ip.split( '.' )
  .map( d => `000${d}`.substr( -3 ) )
  .join( '' ) );

/**
 * Compares the given IP to the given range to determine if falls within it (inclusively).
 *
 * @param ip
 * @param range
 * @returns {boolean}
 */
const checkRange = ( ip, range ) => {
  let { start, end } = range;
  start = ipToNum( start );
  if ( end ) end = ipToNum( end );
  else end = start;
  return ip >= start && ip <= end;
};

/**
 * Retrieves and parses OpenNet IP ranges from the env file.
 *
 * @returns []
 */
const getOpenNetIPs = () => {
  const rangesStr = process.env.OPENNET_IPS || '';
  const ranges = [];
  rangesStr.split( ' ' ).forEach( ( rangeStr ) => {
    const rangeArgs = rangeStr.split( ':' );
    ranges.push( {
      start: rangeArgs[0],
      end: rangeArgs[1]
    } );
  } );
  return ranges;
};

/**
 * Determines if the client's IP address is within the range of
 * OpenNet IP addresses.
 *
 * @param req
 * @param res
 * @returns {*}
 */
export const isOpenNet = ( req, res ) => {
  const ip = ( req.headers['x-forwarded-for'] || '' ).split( ',' ).shift()
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || req.connection.socket.remoteAddress;
  if ( !ip ) return res.json( { error: 1, message: 'IP Address not found.', isOpenNet: false } );
  const ipnum = ipToNum( ip );
  const OpenNetIPs = getOpenNetIPs();
  let openNet = false;
  OpenNetIPs.forEach( ( range ) => {
    if ( checkRange( ipnum, range ) ) openNet = true;
  } );
  console.log( 'Found IP: ', ip, ' OpenNet: ', openNet );
  return res.json( {
    error: 0,
    isOpenNet: openNet
  } );
};
