const AWS = require( 'aws-sdk' );

// Pulls in configs from .env
AWS.config.update( {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
} );

const s3 = new AWS.S3();

export const deleteAllS3Assets = async ( dir, bucket ) => {
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
  const params = {
    Bucket: bucket,
    Key: key
  };

  return s3.deleteObject( params ).promise();
};

// add throwing error here
export const copyS3Asset = async ( key, fromBucket, toBucket ) => {
  const copyParams = {
    Bucket: toBucket,
    CopySource: encodeURIComponent( `/${fromBucket}/${key}` ),
    Key: key
  };
  return s3.copyObject( copyParams ).promise();
};

export const copyS3AllAssets = async ( dir, fromBucket, toBucket ) => {
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
