import fs from 'fs';

import Request from 'request';
import Stream from 'stream';
import tus from 'tus-js-client';

/**
 * Upload the video at the provided filePath to Cloudflare Stream.
 * Returns a promise which resolves an object containing a stream property
 * which is an object containing the preview URL and uid.
 * After the upload, the function will periodically send requests
 * to track the encoding process (every 2 seconds). When the encoding process
 * completes, the promise is resolved or an error is thrown.
 * The encoding tracking will timeout after 100 requests (100x2s = 200s).
 *
 * @param filePath
 * @returns {Promise<any>}
 */
const upload = filePath => new Promise( ( resolve, reject ) => {
  const maxEncodingTracks = 300; // number of tracking requests before timeout
  const pass = new Stream.PassThrough();

  fs.createReadStream( filePath ).pipe( pass );
  const sizeStats = fs.statSync( filePath );
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${
    process.env.CF_STREAM_ZONE
  }/media`;
  const headers = {
    'X-Auth-Key': process.env.CF_STREAM_KEY || '',
    'X-Auth-Email': process.env.CF_STREAM_EMAIL || '',
    'Content-Type': 'application/json',
  };
  let uploadComplete = null;
  const uploadObj = new tus.Upload( pass, {
    endpoint,
    headers,
    chunkSize: 5242880 * 2, // 10 mb
    retryDelays: [
      0, 1000, 3000, 5000,
    ],
    uploadSize: sizeStats.size,
    onError: error => {
      console.log( 'cf error', `${error}` );
      reject( new Error( error ) );
    },
    onProgress: ( bytesUploaded, bytesTotal ) => {
      const uid = uploadObj.url.replace( endpoint, '' ).replace( '/', '' );
      // eslint-disable-next-line no-mixed-operators
      const percentage = bytesUploaded / bytesTotal * 100;

      if ( !uploadComplete || Math.round( percentage ) !== Math.round( uploadComplete ) ) {
        uploadComplete = percentage;
        console.log( `Uploading to Cloudflare [${uid}] - ${percentage.toFixed( 2 )}%` );
      }
    },
    onSuccess: () => {
      // The video has been uploaded and will now be encoded.
      // We will track the encoding process and resolve once/if it successfully completes.
      const streamUrl = uploadObj.url;
      const ret = { url: '', uid: '', thumbnail: '' };

      if ( streamUrl ) {
        let tracks = 0;
        let completed = null;
        let state = null;
        const trackEncoding = () => {
          tracks += 1;
          if ( tracks > maxEncodingTracks ) {
            return reject( new Error( 'Encoding track maximum reached.' ) );
          }
          Request.get(
            {
              url: streamUrl,
              headers,
              json: true,
            },
            ( error, response, body ) => {
              if ( error ) {
                reject( error );
              } else if ( !body.success ) {
                return reject( new Error( body.errors.join( '\n' ) ) );
              } else {
                const uid = body.result.uid; // eslint-disable-line prefer-destructuring
                const status = body.result.status; // eslint-disable-line prefer-destructuring

                if ( status.state === 'inprogress' ) {
                  const pctComplete = parseFloat( status.pctComplete );

                  if ( !completed || Math.round( pctComplete ) !== Math.round( completed ) ) {
                    completed = pctComplete.toFixed( 2 );
                    console.log( `Encoding on Cloudflare [${uid}] - ${completed}%` );
                  }
                } else if ( status.state === 'ready' ) {
                  console.log( `Encoding on Cloudflare [${uid}] - result`, body );
                  ret.uid = uid;
                  ret.url = body.result.preview;
                  ret.thumbnail = body.result.thumbnail;
                  ret.site = 'cloudflare';

                  return resolve( { stream: ret } );
                } else if ( status.state === 'queued' ) {
                  if ( !state ) {
                    state = 'queued';
                    console.log( `Encoding on Cloudflare [${uid}] - queued` );
                  }
                } else if ( status.state !== 'queued' ) {
                  return reject( new Error( `Error in encoding process: ${status.state}` ) );
                } else {
                  console.warn( `Unknown Cloudflare track status [${uid}]:`, status );
                }
                // Continue tracking requests every 2 seconds.
                setTimeout( trackEncoding, 2000 );
              }
            },
          );
        };

        trackEncoding();
      } else if ( !streamUrl ) {
        reject( new Error( 'No media URL returned.' ) );
      }
    },
  } );

  try {
    uploadObj.start();
  } catch ( err ) {
    console.error( 'Caught Cloudflare upload error', '\r\n', JSON.stringify( err, null, 2 ) );
    if ( uploadObj ) {
      uploadObj.abort();
      console.info( 'Aborted uploadObj' );
    } else {
      console.info( 'uploadObj could not be aborted due to null' );
    }
    reject( err );
  }
} );

const list = () => new Promise( ( resolve, reject ) => {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${
    process.env.CF_STREAM_ZONE
  }/media`;
  const headers = {
    'X-Auth-Key': process.env.CF_STREAM_KEY || '',
    'X-Auth-Email': process.env.CF_STREAM_EMAIL || '',
    'Content-Type': 'application/json',
  };

  Request.get(
    {
      url: endpoint,
      headers,
      json: true,
    },
    ( err, res, body ) => {
      console.log( JSON.stringify( body, null, 2 ) );
      if ( err ) return reject( err );
      resolve( body );
    },
  );
} );

const remove = uid => {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${
    process.env.CF_STREAM_ZONE
  }/media/${uid}`;
  const headers = {
    'X-Auth-Key': process.env.CF_STREAM_KEY || '',
    'X-Auth-Email': process.env.CF_STREAM_EMAIL || '',
    'Content-Type': 'application/json',
  };

  console.log( 'Deleting from Cloudflare: ', uid );
  Request(
    {
      url: endpoint,
      headers,
      json: true,
      method: 'DELETE',
    },
    err => {
      if ( err ) {
        console.log(
          'Error deleting from Cloudflare, UID: ',
          uid,
          '\r\n',
          JSON.stringify( err, null, 2 ),
        );
      }
    },
  );
};

const removeAll = () => new Promise( async ( resolve, reject ) => {
  const videos = await list().catch( err => {
    console.error( err );
    reject( err );

    return null;
  } );

  if ( !videos.success ) return reject( videos );
  if ( videos && videos.results && videos.results.length > 0 ) {
    videos.results.forEach( video => {
      remove( video.uid );
    } );
  }
  resolve( `${videos.results.length} videos deleted.` );
} );

const cloudflare = {
  upload,
  list,
  remove,
  removeAll,
};

export default cloudflare;
