import client from '../../../services/elasticsearch';
import { validateSchema } from '../validate';
import packageSchema from './schema';
import { convertCategories } from '../../utils/taxonomy';

const INDEXING_DOMAIN = process.env.INDEXING_DOMAIN || 'commons.america.gov';

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns string  esId
 */
const parseFindResult = ( result ) => {
  if ( result && result.hits && result.hits.total === 1 ) { // should return only 1 unique result
    const [hit] = result.hits.hits;
    return hit._id;
  }
};

/**
 * Retrieve es project id from ES if it exists.
 */
const findDocumentId = async ( projectId ) => {
  const doc = await client
    .search( {
      index: 'videos',
      type: 'video',
      q: `site:${INDEXING_DOMAIN} AND post_id:${projectId}`
    } );

  const id = parseFindResult( doc );
  return id || null;
};


/**
 * Index/create a new video doc
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async ( index, type, body ) => client.index( {
  index,
  type,
  body
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
    doc: body
  }
} );

/**
 * Delete the video specified by projectId from publisher.
 * @param projectId
 * @returns Promise
 */
const _deleteDocuments = async ( index, type, id ) => client.deleteByQuery( {
  index,
  type,
  q: `site:${INDEXING_DOMAIN} AND id:${id}`
} );


/**
 * Update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData );

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

  validateSchema( projectData, packageSchema );

  const { documents } = projectData;

  // Index each individual document
  const items = await Promise.all( documents.map( async ( document ) => {
    // If doc has tags, convert to elastic tags using elastic tag ids
    const _document = { ...document };
    if ( document.tags ) {
      _document.tags = await convertCategories( document.tags, document.language );
    }

    await _createDocument( 'documents', 'document', _document );
    // todo: check for success, error
    return { id: document.id, type: 'document' };
  } ) );

  // Index package
  const {
    id, site, type, published, modified, owner
  } = projectData;

  const pkgDoc = {
    id,
    site,
    type,
    published,
    modified,
    owner,
    items
  };

  return _createDocument( 'packages', 'package', pkgDoc );
};

/**
 * Delete a package and its associated documents from ES with specified package and dcuments ids
 * @param {object} ids Package and associated document id
 *  { id: <package id, documentIds: <array of document ids>}
 * @returns Promise
 */
export const deleteDocuments = async ( ids ) => {
  console.log( 'Delete content', ids );
  const _result = {
    failures: [],
    deleted: 0
  };

  const { id, documentIds } = ids;

  // 1. Delete all document type ES documents matching supplied query
  const results = await Promise.all(
    documentIds.map( documentId => _deleteDocuments(
      'documents',
      'document',
      documentId
    ) )
  );

  // 2. Collect deletion results for documents
  results.forEach( ( result ) => {
    _result.failures = [..._result.failures, ...result.failures];
    _result.deleted += result.deleted;
  } );

  // 3. Delete containing packages matching query
  const deletion = await _deleteDocuments( 'packages', 'package', id );

  // 4. Collect deletion results for package
  _result.failures = [..._result.failures, ...deletion.failures];
  _result.deleted += deletion.deleted;

  // 5. Return status of delete operation
  if ( _result.failures && _result.failures.length > 0 ) {
    return {
      error: 'EsShardFailure',
      failures: _result.failures
    };
  }
  if ( !_result.deleted ) {
    return { error: 'EsDocsNotFound' };
  }
  return {
    deleted: _result.deleted
  };
};
