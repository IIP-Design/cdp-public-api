import { getSignedUrl } from 'workers/services/aws/s3';
import cloneDeep from 'lodash.clonedeep';

/**
 * Convert an S3 url into a signed URL
 *
 * @param {string} key Normal S3 URL for the asset
 */
const getSigned = async key => getSignedUrl( { bucket: 'prod', key } );

const replaceWithSignedUrls = async sizes => {
  const keys = Object.keys( sizes );

  // if sizes does not contain any size keys, i.e. small, mediun, just return
  if ( !keys.length ) {
    return sizes;
  }

  const path = `https://${process.env.AWS_S3_PRODUCTION_BUCKET}.s3.amazonaws.com`;

  const urls = await Promise.all(
    keys.map( async size => {
      const value = sizes[size];

      if ( value && value.url && value.url.includes( process.env.AWS_S3_PRODUCTION_BUCKET ) ) {
        const key = value.url.replace( `${path}/`, '' );
        const signed = await getSigned( key );

        return { [size]: { ...value, url: signed.url } };
      }

      return { [size]: value };
    } ),
  );

  return urls;
};

/**
 * Convert sizes array to sizes object
 * @param {array} urls
 * @return sizes object
 */
const normalizeUrls = ( urls = [] ) => urls.reduce( ( acc, cur ) => {
  const key = Object.keys( cur )[0];

  acc[key] = cur[key];

  return acc;
}, {} );

/**
 * Checks to see if response is aggregation or static index
 * @param {array} hits elastic search hits array
 */
const isStaticIndex = hits => {
  const re = /^(taxonomy|language|owner)/;

  return re.test( hits[0]._index );
};

/**
 * Checks to see if response is valid search. i.e. posts or videos
 * @param {object} response
 */
const isSearchIndex = response => {
  // By-pass aggregations and static indices
  if ( response.aggregations || !response.hits.total ) {
    return false;
  }

  return !isStaticIndex( response.hits.hits );
};

/**
 * Replace urls with signedUrls where applicable
 * @param {object} incoming response
 */
export const transformThumbnailUrls = async response => {
  // Do not process if this is an aggregation or a static index, i.e. languages
  if ( !isSearchIndex( response ) ) {
    return response;
  }

  // Use cloneDeep to ensure deep copy - shallow copy returns nested values by reference
  const _response = cloneDeep( response );
  const { hits } = _response.hits;

  const _hits = await Promise.all(
    hits.map( async hit => {
      // if not post, return
      if ( hit._type !== 'post' ) {
        return hit;
      }

      // Verify we have a valid sizes object
      if ( hit._source.thumbnail && hit._source.thumbnail.sizes ) {
        const sizes = await replaceWithSignedUrls( hit._source.thumbnail.sizes );

        hit._source.thumbnail.sizes = normalizeUrls( sizes );
      }

      return hit;
    } ),
  );

  // replace the hits prop with signed content
  _response.hits.hits = _hits;

  return _response;
};
