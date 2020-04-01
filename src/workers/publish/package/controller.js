import url from 'url';
import client from '../../../services/elasticsearch';
import { validateSchema } from '../validate';
import packageSchema from './schema';
import { convertCategories } from '../../utils/taxonomy';
import { deleteS3Asset } from '../../services/aws/s3';

const INDEXING_DOMAIN = process.env.INDEXING_DOMAIN || 'commons.america.gov';
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns object  elasticsearch doc
 */
const parseFindResult = ( result ) => {
  if ( result && result.hits && result.hits.total === 1 ) { // should return only 1 unique result
    const [hit] = result.hits.hits;
    return hit;
  }
};


/**
 *  Retrieve es doc from ES if it exists.
 * @param {*} projectId id coming from publisher
 * @param {*} index Elastic search index
 * @param {*} type  Elasticsearch document type
 * @returns {object} Elasticsearch document
 */
const findDocument = async ( projectId, index, type ) => {
  const doc = await client
    .search( {
      index,
      type,
      q: `site:${INDEXING_DOMAIN} AND id:${projectId}`
    } );

  const foundDoc = parseFindResult( doc );
  return foundDoc || null;
};


/**
 * Index/create a new package or document doc in ES
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async ( index, type, body ) => client.index( {
  index,
  type,
  body
} );

/**
 * Update the package or document in ES specified by id from ES.
 * @param {*} index Elastic search index
 * @param {*} type  Elasticsearch document type
 * @param body updated data
 * @param esid elasticsearch id
 * @returns Promise
 */

const _updateDocument = async ( index, type, body, esId ) => client.update( {
  index,
  type,
  id: esId,
  body: {
    doc: body
  }
} );

/**
  * Delete the package or document specified by projectId from publisher.
  * @param {*} index Elastic search index
  * @param {*} type  Elasticsearch document type
  * @param {*} id  id from publisher
  * @returns Promise
  */
const _deleteDocument = async ( index, type, id ) => client.deleteByQuery( {
  index,
  type,
  q: `site:${INDEXING_DOMAIN} AND id:${id}`
} );


/**
 * Compare existing docs against incoming docs
 * If existing doc is not present in the incoming
 * docd, remove
 * @param {array} publisherDocuments incoming documents
 * @param {array} esDocuments exisiting documents in ES
 * @return promise
 */
const deletePackageDocuments = async ( publisherDocuments, esDocuments ) => {
  const publisherIds = publisherDocuments.map( document => document.id );
  const esIds = esDocuments.map( item => item.id );
  const esItemsToDelete = esIds.filter( esId => !publisherIds.includes( esId ) );

  if ( esItemsToDelete.length ) {
    return Promise.all(
      esItemsToDelete.map( async ( itemId ) => {
        // delete doc from ES
        await _deleteDocument( 'documents', 'document', itemId );

        // delete doc S3
        const document = esDocuments.find( item => item.id === itemId );
        const _document = await findDocument( document.id, 'documents', 'document' );

        if ( _document && _document._source && _document._source.url ) {
          const path = url.parse( _document._source.url ).pathname.substr( 1 );
          return deleteS3Asset( path, PRODUCTION_BUCKET );
        }
      } )
    );
  }

  // explicity return resolved promise
  return Promise.resolve();
};

/**
 * Either create a new document or update an exisiting one
 * @param {array} documents Incoming documents array
 * @return promise
 */
const createOrUpdatePackageDocuments = async documents => Promise.all(
  documents.map( async ( document ) => {
    const _document = { ...document };
    if ( document.tags ) {
      _document.tags = await convertCategories( document.tags, document.language );
    }
    const esDoc = await findDocument( document.id, 'documents', 'document' );
    if ( esDoc ) {
      // update
      return _updateDocument( 'documents', 'document', _document, esDoc._id );
    }
    // create
    return _createDocument( 'documents', 'document', _document );
  } )
);

/**
 * Update a package or document for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData, packageSchema );

  // Find package
  const esPackage = await findDocument( projectId, 'packages', 'package' );
  if ( !esPackage ) {
    return { error: 'EsDocNotFound' };
  }

  const { documents } = projectData;
  const { items } = esPackage._source;

  // Delete docs
  await deletePackageDocuments( documents, items );

  // Create new doc or update existing on
  await createOrUpdatePackageDocuments( documents );

  // Get new doc ids to connect to package
  const updatedItems = documents.map( document => ( { id: document.id, type: 'document' } ) );

  const {
    title, desc, type, published, modified, visibility, language, owner
  } = projectData;

  const pkgDoc = {
    title,
    desc,
    type,
    published,
    modified,
    visibility,
    language,
    owner,
    items: updatedItems
  };

  return _updateDocument( 'packages', 'package', pkgDoc, esPackage._id );
};

/**
 * Create/update a package or document for the supplied id (post_id in ES) and data
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
    id, site, title, desc, type, published, modified, language, visibility, owner
  } = projectData;

  const pkgDoc = {
    id,
    site,
    title,
    desc,
    type,
    published,
    modified,
    language,
    visibility,
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
    documentIds.map( documentId => _deleteDocument( 'documents', 'document', documentId ) )
  );

  // 2. Collect deletion results for documents
  results.forEach( ( result ) => {
    _result.failures = [..._result.failures, ...result.failures];
    _result.deleted += result.deleted;
  } );

  // 3. Delete containing packages matching query
  const deletion = await _deleteDocument( 'packages', 'package', id );

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
