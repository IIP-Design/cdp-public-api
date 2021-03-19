import Mime from 'mime-types';
import request from 'request';
import s3Zip from 's3-zip';

import { getS3BucketAssets, getSignedUrl } from 'workers/services/aws/s3';
import { hasValidToken } from 'api/modules/auth';

/**
 * Returns file extension of filename
 * @param {string} filename
 */
const getFileExt = filename => {
  if ( typeof filename !== 'string' ) return '';

  const index = filename.lastIndexOf( '.' );
  const hasExt = index !== -1;

  return hasExt ? filename.substr( index + 1 ) : '';
};


const getValidFilename = filename => {
  if ( filename && typeof filename === 'string' ) {
    const ext = getFileExt( filename );
    const fn = filename.replace( ext, '' ).replace( /[^A-Za-z0-9\s]+/g, '' );

    return `${fn}.${ext}`;
  }

  return '';
};

const getParams = ( req, res ) => {
  let filename;
  let key;
  let url;

  if ( req.body.url && req.body.filename ) {
    ( { filename, url } = req.body );
  } else if ( req.params.opts && !req.params.filename ) {
    // This is mainly kept for backwards compatibility but should be removed eventually
    const opts = JSON.parse( Buffer.from( req.params.opts, 'base64' ).toString() );

    ( { filename, url, key } = opts );
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

  return { filename, key, url };
};

export const download = async ( req, res ) => {
  const { filename, key, url } = getParams( req, res );

  const fn = getValidFilename( filename );

  const mimeType = Mime.lookup( url ) || 'application/octet-stream';

  let getReq;

  if ( key ) {
    const signedGet = await getSignedUrl( { bucket: 'prod', key } );

    getReq = signedGet.url;
  } else {
    getReq = url;
  }

  request
    .get( getReq )
    .on( 'error', err => res.status( 404 ).json( err ) )
    .on( 'response', response => {
      if ( response.statusCode !== 200 ) return res.status( 404 ).send( 'File not found.' );

      const fileSize = response.headers['content-length'];

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
          'Content-Type': mimeType,
        };

        res.writeHead( 206, head );

        request
          .get( getReq, {
            Accept: '*/*',
            'Accept-Encoding': 'identity',
            connection: 'keep-alive',
            range,
            'accept-ranges': 'bytes',
          } )
          .pipe( res );
      } else {
        if ( fileSize ) res.setHeader( 'Content-Length', fileSize );
        res.setHeader( 'Content-Type', mimeType );
        res.setHeader( 'Content-Disposition', `attachment${filename ? `; filename=${fn}` : ''}` );
        request.get( getReq ).pipe( res );
      }
    } );
};

/**
 * Zips S3 assets in an applicable s3 folder.
 * Requires header bearer token for authentication
 * Request body expects:
 * {
 *  folder: S3 directory
 *  title: Name of zip package
 *  fileTypes: File extensions to include in zip
 * }
 * @param {object} req
 * @param {object} res
 */
export const zip = async ( req, res ) => {
  // 1. Authenticate
  if ( !hasValidToken( req ) ) {
    res.status( 401 ).json( { error: 'Unauthorized' } );
  }

  const { folder, title, fileTypes } = req.body;

  res.set( 'content-type', 'application/zip' );
  res.setHeader( 'Content-Disposition', `attachment; filename=${title}.zip` );

  // 2. Fetch files form applicable S3 dir
  const files = await getS3BucketAssets( process.env.AWS_S3_PRODUCTION_BUCKET, folder, fileTypes );

  // 3. Pipe zip stream to client
  s3Zip.archive( {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_PRODUCTION_BUCKET,
  }, '', files ).pipe( res );
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

  rangesStr.split( ' ' ).forEach( rangeStr => {
    const rangeArgs = rangeStr.split( ':' );

    ranges.push( {
      start: rangeArgs[0],
      end: rangeArgs[1],
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

  OpenNetIPs.forEach( range => {
    if ( checkRange( ipnum, range ) ) openNet = true;
  } );
  console.log( 'Found IP: ', ip, ' OpenNet: ', openNet );

  return res.json( {
    error: 0,
    isOpenNet: openNet,
  } );
};
