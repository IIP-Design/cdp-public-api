import Request from 'request';
import Mime from 'mime-types';

export const getQueryFromUuid = ( uuid = '' ) => {
  let obj = {};
  const args = uuid.split( '_' );

  if ( args.length === 2 ) {
    obj = {
      site: args[0],
      post_id: args[1],
    };
  }

  return obj;
};

/**
 * Sends a POST with the provided data if a callback URL is present
 * in the header. Returns true/false depending on if the callback was
 * sent or not.
 *
 * @param req
 * @param data
 * @returns {boolean}
 */
export const callback = ( req, data ) => {
  if ( req.headers.callback && !req.callbackSent ) {
    if ( !req.headers.callback_errors || req.headers.callback_errors === '0' ) {
      if ( !req.callbackAttempt ) req.callbackAttempt = 1;
      else req.callbackAttempt += 1;
      console.log( 'sending callback', req.headers.callback );
      Request.post(
        {
          url: req.headers.callback,
          json: true,
          form: {
            error: 0,
            params: { ...req.params, ...req.queryArgs },
            ...data,
          },
          headers: { 'User-Agent': 'API' },
        },
        ( err, res, body ) => {
          if ( err ) {
            req.callbackSent = true;
            console.error( 'callback error', '\r\n', JSON.stringify( err, null, 2 ), JSON.stringify( body, null, 2 ) );
          } else if ( !body && req.callbackAttempt < 3 ) {
            console.warn( 'callback response body is undefined, retrying...' );
            setTimeout( () => {
              callback( req, data );
            }, 5000 );
          } else {
            req.callbackSent = true;
            console.log( 'callback response body', JSON.stringify( body, null, 2 ) );
          }
        },
      );
    } else {
      console.log( 'callback not sent due to errors only requested' );
    }

    return true;
  }

  return false;
};

/**
 * Returns an array of content types which are allowed in the API.
 * Based off of a list of image extensions and then any content
 * type with a prefix of audio/ or video/.
 */
export const getContentTypes = () => {
  const types = Object.values( Mime.types ).filter( type => type.indexOf( 'audio/' ) === 0 || type.indexOf( 'video/' ) === 0 );

  const allowedExts = [
    // image extensions
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    // video extensions
    'mp4',
    'mov',
    // audio extension
    'mp3',
    // captions extension
    'srt',
    // document extensions
    'pdf',
    'txt',
    'doc',
    'docx',
    'odt',
    'rtf',
    'wks',
    'wps',
    'wpd',
    'html',
  ];

  allowedExts.forEach( ext => {
    types.push( Mime.types[ext] );
  } );

  return types;
};

/**
 * Retrieves the Content-Type using a HEAD request.
 *
 * @param url
 * @return string
 */
export const getTypeFromUrl = async url => {
  const result = await new Promise( resolve => {
    const encodedURI = encodeURI( url );

    if ( !encodedURI ) {
      resolve( null );

      return;
    }
    Request.head(
      {
        url: encodedURI,
        headers: { 'User-Agent': 'API' },
      },
      ( error, response ) => {
        if ( !error && response && response.headers && response.headers['content-type'] ) {
          if ( response.headers['content-type'].toLowerCase() === 'application/octet-stream' ) {
            // Missing legitimate content type so use extension instead
            return resolve( Mime.lookup( encodedURI ) || null );
          }

          return resolve( response.headers['content-type'] );
        }
        if ( error ) console.error( error );
        resolve( null );
      },
    );
  } );

  return result;
};
