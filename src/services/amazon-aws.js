import fs from 'fs';
import AWS from 'aws-sdk';
import URL from 'url';

AWS.config.update( {
  accessKeyId: process.env.AWS_S3_PRODUCTION_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_PRODUCTION_SECRET,
  region: process.env.AWS_REGION
} );

const s3 = new AWS.S3();

/**
 * Checks to see if key exists in bucket. Returns a promise
 * that resolves to true or false.
 *
 * @param bucket
 * @param key
 * @returns {Promise<any>}
 */
const checkExists = ( bucket = process.env.AWS_S3_PRODUCTION_BUCKET, key ) => new Promise( ( resolve ) => {
  s3.headObject( { Bucket: bucket, Key: key }, ( err ) => {
    if ( err && err.code === 'NotFound' ) resolve( false );
    else resolve( true );
  } );
} );

/**
 * Upload a file to Amazon S3.
 * If replace is false: checks for existing files first using title+ext and
 * increments the filename until finding a configuration that does not exist.
 *
 * @param title
 * @param ext
 * @param tempFile
 * @param bucket
 * @param replace
 * @returns {Promise<any>}
 */
const upload = ( {
  title,
  ext,
  filePath = null,
  bucket = process.env.AWS_S3_PRODUCTION_BUCKET,
  replace = true
} ) => new Promise( async ( resolve, reject ) => {
  let key = `${title}${ext}`;
  let exists = await checkExists( bucket, key );

  if ( !replace ) {
    let index = 0;
    while ( exists ) {
      index += 1;
      if ( index > 5 ) {
        reject( new Error( `S3 Upload: File already exists (attempted: ${index})` ) );
      }
      key = `${title}-${index}${ext}`;
      exists = await checkExists( bucket, key ); // eslint-disable-line no-await-in-loop
    }
  }

  const body = fs.createReadStream( filePath );

  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ACL: 'private' // TODO: Switch back to 'public-read' for any kind of non-test based functionality
  };

  let completed = null;
  const manager = s3.upload( params );
  manager
    .on( 'httpUploadProgress', ( progress ) => {
      // eslint-disable-next-line no-mixed-operators
      const percent = ( progress.loaded / progress.total * 100 ).toFixed( 0 );
      if ( !completed || percent !== completed ) {
        completed = percent;
        console.info( `Uploading to S3 - ${key}: ${percent}%` );
      }
    } )
    .promise()
    .then( ( data ) => {
      resolve( { filename: key, ...data } );
    } )
    .catch( ( err ) => {
      console.error( `S3 upload error [${key}]`, err );
      return reject( err );
    } );
  body.on( 'error', ( err ) => {
    console.error( 'Caught S3 upload file read error' );
    manager.abort();
    reject( err );
  } );
} );

/**
 * Remove (delete) an object from S3 given a path OR full URL.
 *
 * @param url
 * @param bucket (optional)
 */
const remove = ( { url, bucket = process.env.AWS_S3_PRODUCTION_BUCKET } ) => {
  const args = URL.parse( url );
  if ( args.hostname && args.hostname.indexOf( 'amazonaws' ) < 0 ) return;
  // Regex on path simply removes the preceeding '/' if any
  s3.deleteObject( { Key: args.path.replace( /^\/+(.*)$/g, '$1' ), Bucket: bucket }, ( err, data ) => {
    if ( err ) console.error( 'aws remove error', url, err );
    else console.log( 'aws remove', url, data );
  } );
};

export default {
  s3,
  upload,
  remove
};
