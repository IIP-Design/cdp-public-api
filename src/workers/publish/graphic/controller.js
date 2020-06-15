import client from '../../../services/elasticsearch';
import { validateSchema } from '../validate';
import graphicSchema from './schema';
import { convertCategories, convertTags } from '../../utils/taxonomy';

const INDEXING_DOMAIN = process.env.INDEXING_DOMAIN || 'commons.america.gov';

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns object  elasticsearch doc
 */
const parseFindResult = result => {
  if ( result && result.hits && result.hits.total === 1 ) {
    // should return only 1 unique result
    const [hit] = result.hits.hits;

    return hit;
  }
};

/**
 *  Retrieve es doc from ES if it exists.
 * @param {string} projectId id coming from publisher
 * @param {string} index Elastic search index
 * @param {string} type  Elasticsearch document type
 * @returns {object} Elasticsearch document
 */
const findDocument = async projectId => {
  const doc = await client.search( {
    index: 'graphics',
    type: 'graphic',
    q: `site:${INDEXING_DOMAIN} AND id:${projectId}`,
  } );

  const foundDoc = parseFindResult( doc );

  return foundDoc || null;
};

/**
 * Index/create a new package or document doc in ES
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async body => client.index( {
  index: 'graphics',
  type: 'graphic',
  body,
} );

/**
 * Update the package or document in ES specified by id from ES.
 * @param {string} index Elastic search index
 * @param {string} type  Elasticsearch document type
 * @param body updated data
 * @param esid elasticsearch id
 * @returns Promise
 */

const _updateDocument = async ( body, esId ) => client.update( {
  index: 'graphics',
  type: 'graphic',
  id: esId,
  body: {
    doc: body,
  },
} );

/**
 * Delete the package or document specified by projectId from publisher.
 * @param {string} index Elastic search index
 * @param {string} type  Elasticsearch document type
 * @param {string} id  id from publisher
 * @returns Promise
 */
const _deleteDocument = async id => client.deleteByQuery( {
  index: 'graphics',
  type: 'graphic',
  q: `site:${INDEXING_DOMAIN} AND id:${id}`,
} );

/**
 * Update a graphic for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData, graphicSchema );

  const esGraphicProject = await findDocument( projectId );

  if ( !esGraphicProject ) {
    return { error: 'EsDocNotFound' };
  }

  const { categories, tags } = projectData;
  const _projectData = { ...projectData };

  if ( categories ) {
    _projectData.categories = await convertCategories( categories, { locale: 'en-us' } );
  }

  if ( tags ) {
    _projectData.tags = await convertTags( tags, { locale: 'en-us' } );
  }

  return _updateDocument( _projectData, esGraphicProject._id );
};

/**
 * Create a graphic for the supplied id (id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const createDocument = async ( projectId, projectData ) => {
  console.log( 'Index new content', projectId, projectData );

  validateSchema( projectData, graphicSchema );

  const { categories, tags } = projectData;
  const _projectData = { ...projectData };

  if ( categories ) {
    _projectData.categories = await convertCategories( categories, { locale: 'en-us' } );
  }

  if ( tags ) {
    _projectData.tags = await convertTags( tags, { locale: 'en-us' } );
  }

  return _createDocument( _projectData );
};

/**
 * Delete a video from ES witht he specified projectId (post_id)
 * @param projectId
 * @returns Promise
 */
export const deleteDocument = async projectId => {
  console.log( 'Delete content', projectId );

  // delete all documents with a matching site and post_id (projectId)
  return _deleteDocument( projectId )
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
