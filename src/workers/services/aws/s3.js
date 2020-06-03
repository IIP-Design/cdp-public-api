const fs = require( 'fs' );
const AWS = require( 'aws-sdk' );

const AUTHORING_BUCKET = process.env.AWS_S3_AUTHORING_BUCKET;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;

// Pulls in configs from .env
const setAccessKeys = env => {
  AWS.config.update( {
    accessKeyId: env === 'prod' ? process.env.AWS_S3_PRODUCTION_ACCESS_KEY_ID : process.env.AWS_S3_AUTHORING_ACCESS_KEY_ID,
    secretAccessKey: env === 'prod' ? process.env.AWS_S3_PRODUCTION_SECRET : process.env.AWS_S3_AUTHORING_SECRET,
    region: process.env.AWS_REGION
  } );
}

const s3 = new AWS.S3();

export const deleteAllS3Assets = async ( dir, bucket ) => {
  setAccessKeys();

  const listParams = {
    Bucket: bucket,
    Prefix: dir
  };

  const listedObjects = await s3.listObjectsV2( listParams ).promise();
  if ( listedObjects.Contents.length === 0 ) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] }
  };

  listedObjects.Contents.forEach( ( { Key } ) => {
    deleteParams.Delete.Objects.push( { Key } );
  } );

  await s3.deleteObjects( deleteParams ).promise();

  // If more than a page of files, delete next batch
  if ( listedObjects.IsTruncated ) await deleteAllS3Assets( dir, bucket );
};

export const deleteS3Asset = ( key, bucket ) => {
  setAccessKeys();

  const params = {
    Bucket: bucket,
    Key: key
  };

  return s3.deleteObject( params ).promise();
};

// add throwing error here
export const copyS3Asset = async ( key, fromBucket, toBucket ) => {
  setAccessKeys();
  
  const copyParams = {
    Bucket: toBucket,
    CopySource: encodeURIComponent( `/${fromBucket}/${key}` ),
    Key: key
  };
  return s3.copyObject( copyParams ).promise();
};

export const copyS3AllAssets = async ( dir, fromBucket, toBucket ) => {
  setAccessKeys();

  const listParams = {
    Bucket: fromBucket,
    Prefix: dir
  };

  const listedObjects = await s3.listObjectsV2( listParams ).promise();
  if ( listedObjects.Contents.length === 0 ) return;

  listedObjects.Contents.forEach( ( { Key } ) => {
    copyS3Asset( Key, fromBucket, toBucket );
  } );

  // If more than a page of files, copy next batch
  if ( listedObjects.IsTruncated ) await copyS3AllAssets( dir, fromBucket, toBucket );
};


export const uploadAsset = ( file, key ) => {
  setAccessKeys();

  const fileContent = fs.readFileSync( file );
  // Setting up S3 upload parameters
  const params = {
    Bucket: AUTHORING_BUCKET,
    Key: key,
    Body: fileContent
  };

  // Upload files to the bucket
  return s3.upload( params ).promise();
};

export const getSignedUrl = params => new Promise( ( resolve, reject ) => {
  const { bucket, key, expires, type } = params;
  
  setAccessKeys( bucket );

  const objectType = type === 'head' ? 'headObject' : 'getObject';

  s3.getSignedUrl( 'getObject', {
    Bucket: bucket === 'prod' ? PRODUCTION_BUCKET : AUTHORING_BUCKET,
    Key: key,
    Expires: expires || 900 // default 15 minutes
  },
  ( err, url ) => {
    if ( err ) {
      reject( err );
    } else {
      resolve( { key, url } );
    }
  } );
} );
