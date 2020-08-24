import client from '../../../services/elasticsearch';
import { validateSchema } from '../validate';
import videoSchema from './schema';

import { convertProjectTaxonomies } from '../../utils/taxonomy';

const INDEXING_DOMAIN = process.env.INDEXING_DOMAIN || 'commons.america.gov';

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns string  esId
 */
const parseFindResult = result => {
  if ( result && result.hits && result.hits.total === 1 ) { // should return only 1 unique result
    const [hit] = result.hits.hits;

    return hit._id;
  }
};

/**
 * Retrieve es project id from ES if it exists.
 */
const findDocumentId = async projectId => {
  const doc = await client
    .search( {
      index: 'videos',
      type: 'video',
      q: `site:${INDEXING_DOMAIN} AND post_id:${projectId}`,
    } );

  const id = parseFindResult( doc );

  return id || null;
};

/**
 * Index/create a new video doc
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async body => client.index( {
  index: 'videos',
  type: 'video',
  body,
} );

/**
 * Update the video specified by id from ES.
 * @param id elasticsearch id
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _updateDocument = async ( body, esId ) => client.update( {
  index: 'videos',
  type: 'video',
  id: esId,
  body: {
    doc: body,
  },
} );

/**
 * Delete the video specified by projectId from publisher.
 * @param projectId
 * @returns Promise
 */
const _deleteDocuments = async projectId => client.deleteByQuery( {
  index: 'videos',
  type: 'video',
  q: `site:${INDEXING_DOMAIN} AND post_id:${projectId}`,
} );


/**
 * Update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData, videoSchema );

  const esId = await findDocumentId( projectId );

  if ( !esId ) {
    return { error: 'EsDocNotFound' };
  }

  const convertedProject = await convertProjectTaxonomies( projectData );

  return _updateDocument( convertedProject, esId );
};

/**
 * Create/update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const createDocument = async ( projectId, projectData ) => {
  console.log( 'Index new content', projectId, projectData );

  validateSchema( projectData, videoSchema );

  const convertedProject = await convertProjectTaxonomies( projectData );

  return _createDocument( convertedProject );
};

/**
 * Delete a video from ES witht he specified projectId (post_id)
 * @param projectId
 * @returns Promise
 */
export const deleteDocument = async projectId => {
  console.log( 'Delete content', projectId );

  // delete all documents with a matching site and post_id (projectId)
  return _deleteDocuments( projectId )
    .then( result => {
      if ( result.failures && result.failures.length > 0 ) {
        return {
          error: 'EsShardFailure',
          failures: result.failures,
        };
      }
      if ( !result.deleted ) {
        return { error: 'EsDocNotFound' };
      }

      return {
        deleted: result.deleted,
      };
    } );
};
