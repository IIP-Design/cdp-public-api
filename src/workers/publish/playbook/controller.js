import client from '../../../services/elasticsearch';
import { validateSchema } from '../validate';
import schema from './schema';
import { convertCategories, convertTags } from '../../utils/taxonomy';
import { getElasticHitTotal } from '../../utils/elastic';

const INDEXING_DOMAIN = process.env.INDEXING_DOMAIN || 'commons.america.gov';

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns object  elasticsearch doc
 */
const parseFindResult = result => {
  if ( result && result.hits && getElasticHitTotal( result ) === 1 ) {
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
    index: 'playbooks',
    type: 'playbook',
    q: `site:${INDEXING_DOMAIN} AND id:${projectId}`,
  } );

  const foundDoc = parseFindResult( doc );

  return foundDoc || null;
};

/**
 * Index/create a new playbook doc in ES
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async body => client.index( {
  index: 'playbooks',
  type: 'playbook',
  body,
} );

/**
 * Update the playbook in ES specified by id from ES.
 * @param {string} index Elastic search index
 * @param {string} type  Elasticsearch document type
 * @param body updated data
 * @param esid elasticsearch id
 * @returns Promise
 */

const _updateDocument = async ( body, esId ) => client.update( {
  index: 'playbooks',
  type: 'playbook',
  id: esId,
  body: {
    doc: body,
  },
} );

/**
 * Delete the playbook specified by projectId from publisher.
 * @param {string} index Elastic search index
 * @param {string} type  Elasticsearch document type
 * @param {string} id  id from publisher
 * @returns Promise
 */
const _deleteDocument = async id => client.deleteByQuery( {
  index: 'playbooks',
  type: 'playbook',
  q: `site:${INDEXING_DOMAIN} AND id:${id}`,
} );

/**
 * Update a playbook for the supplied id (id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData, schema );

  const esPlaybook = await findDocument( projectId );

  if ( !esPlaybook ) {
    return { error: 'EsDocNotFound' };
  }

  const { categories, policy, tags } = projectData;
  const _projectData = { ...projectData };

  if ( categories ) {
    _projectData.categories = await convertCategories( categories, { locale: 'en-us' } );
  }

  if ( tags ) {
    _projectData.tags = await convertTags( tags, { locale: 'en-us' } );
  }

  // Explicitly set policy to null if not provided,
  // otherwise value will not update when a policy is removed.
  if ( !policy ) {
    _projectData.policy = null;
  }

  return _updateDocument( _projectData, esPlaybook._id );
};

/**
 * Create a graphic for the supplied id (id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const createDocument = async ( projectId, projectData ) => {
  console.log( 'Index new content', projectId, projectData );

  validateSchema( projectData, schema );

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

  // delete all documents with a matching site and projectId
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
