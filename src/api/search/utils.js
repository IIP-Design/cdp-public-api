import { getSignedUrl } from 'workers/services/aws/s3';

/**
 * Convert an S3 url into a signed URL
 *
 * @param {string} key Normal S3 URL for the asset
 */
const getSigned = async key => getSignedUrl( { bucket: 'prod', key } );

/**
 * Iterate through thumbnail sizes getting signed URLs
 *
 * @param {string[]} sizes List of sizes to check against
 * @param {Object} thumbnail The thumbnail data pull off of a post source
 */
const getData = async ( sizes, thumbnail ) => Promise.all( sizes.map( async size => {
  let { url } = thumbnail.sizes[size];

  // Make sue that URL is in the production bucket
  if ( url.includes( process.env.AWS_S3_PRODUCTION_BUCKET ) ) {
    // Get the key from the full url (i.e. - remove the path)
    const path = `https://${process.env.AWS_S3_PRODUCTION_BUCKET}.s3.amazonaws.com`;
    const key = url.replace( `${path}/`, '' );

    const signed = await getSigned( key );

    url = signed.url;
  }

  // Create new object for the given size
  const newSize = {
    ...thumbnail.sizes[size],
    url,
  };

  return { [size]: newSize };
} ) );

/**
 * Rebuild a thumbnails object from an array of size objects
 *
 * @param {Object[]} arr List of thumbnail sizes and their data
 */
const reconstruct = arr => {
  const reconstructed = {};

  arr.forEach( item => {
    const key = Object.keys( item )[0];
    const val = Object.values( item )[0];

    reconstructed[key] = val;
  } );

  return reconstructed;
};

/**
 * Convert thumbnail urls for posts to signed URLs
 *
 * @param {Object} res ElasticSearch search response object
 */
export const transformThumbnailUrls = async res => {
  const getHits = async () => Promise.all( res.hits.hits.map( async hit => {
    // Get hit type and thumbnail object
    const { thumbnail, type } = hit._source;

    // List of sizes to check against
    const sizes = [
      'small', 'medium', 'large', 'full',
    ];

    if ( type !== 'post' ) {
      // If not a post, immediately add to temp hits array
      return hit;
    }

    // if it is a post, transform the thumbnail URLs before adding to temp hits array
    return getData( sizes, thumbnail ).then( data => ( {
      ...hit,
      _source: {
        ...hit._source,
        thumbnail: {
          ...thumbnail,
          sizes: reconstruct( data ),
        },
      },
    } ) );
  } ) );

  // Rebuild the response replacing the received hits array, with the transformed one
  return {
    ...res,
    hits: {
      ...res.hits,
      hits: await getHits(),
    },
  };
};

