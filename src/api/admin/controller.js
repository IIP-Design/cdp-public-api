// All admin functions should be behind security

import * as mappings from './mappings';
import client from '../../services/elasticsearch';

const MAPPINGS = {
  videos: mappings.getVideoMapping(),
};

const getDateStamp = () => {
  const now = new Date();
  const _month = now.getMonth();
  const month = _month < 10 ? `0${_month}` : _month;

  return `${now.getFullYear()}${month}${now.getDate()}`;
};

const _exists = index => client.indices.exists( { index } );

// eslint-disable-next-line max-len
const _create = ( index, mapping = {} ) => client.indices.create( { index, body: { mappings: mapping } } );

const _remove = index => client.indices.delete( { index } );

const _getAlias = index => client.indices.getAlias( { index } );

/**
 * version_type internal  (default) will cause Elasticsearch to
  blindly dump documents into the target, overwriting any that
  happen to have the same type and id

  version_type external will cause Elasticsearch to preserve the
  version from the source, create any documents that are missing,
  and update any documents that have an older version in the
  destination index than they do in the source index

 * @param {string} oldIndex
 * @param {string} newIndex
 * @param {size} number
 * @param {object} script
 * @param {object} query
 */
const _reindex = ( oldIndex, newIndex, size, script, query ) => {
  const body = {
    source: {
      index: oldIndex,
    },
    dest: {
      index: newIndex,
      version_type: 'external',
    },
  };

  if ( size ) {
    body.size = size;
  }
  if ( script ) {
    body.script = { source: script };
  }
  if ( query ) {
    body.source.query = query;
  }

  return client.reindex( { body } );
};

export const updateAlias = ( req, res, next ) => {
  const addIndex = req.body.add;
  const removeIndex = req.body.deleteVideo;
  const indexAlias = req.body.alias;

  return client.indices
    .updateAliases( {
      body: {
        actions: [
          { remove: { index: removeIndex, alias: indexAlias } },
          { add: { index: addIndex, alias: indexAlias } },
        ],
      },
    } )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );
};

export const exists = ( req, res, next ) => _exists( req.body.index )
  .then( doc => res.status( 200 ).json( doc ) )
  .catch( err => next( err ) );

export const create = ( req, res, next ) => {
  _create( req.body.index, req.body.mapping )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );
};

export const remove = ( req, res, next ) => _remove( req.body.index )
  .then( doc => res.status( 200 ).json( doc ) )
  .catch( err => next( err ) );

/*
  NOTE: Need to explore using the ingest node with and pipelines
  https://cinhtau.net/2017/05/01/reindex-data-with-pipeline/

  Depending on what is changing, a script may need to be included
  to properly update old index. For example, if we are changing a property
  name, a script could be included to update the affected property

  To reindex:
    1. Update mapping for applicable content type
    2. Create a new index, index_[datestamp], using the updated mapping if applicable
    3. Execute reindex into new index
    4. Point alias to new index: updateAlias() -- execute call if reindex is correct
    5. Delete old index: remove() - -- execute call if not storing

    Things to consider:
    1. Do we need to keep both indices synced during reindexing in the event the old
       index is updated?

    Usage:
    Request body:
    {
      "index": "videos",
      "script":  "ctx._source.id = ctx._source.remove(\"post_id\")",
      "query": {
          "term": {
            "post_id": 456
          }
        },
      "size": 1
    }
  */
export const reindex = async ( req, res, next ) => {
  const indexAlias = req.body.index;
  const indexSize = req.body.size;
  const indexScript = req.body.script;
  const indexQuery = req.body.query;

  try {
    // get alias that points to the current index
    // i.e. videos points to videos_20180319
    const aliasToOldIndex = await _getAlias( indexAlias );

    // create new index using datestamp
    const newIndex = `${indexAlias}_${getDateStamp()}`;

    // get the name of the index to which the alias is pointing
    // an array is returned with index objects. Currently on 1 alias
    // points to 1 index, i.e. videos points to videos_20180319
    // this index should be the current index in production
    const oldIndex = Object.keys( aliasToOldIndex )[0];

    // check to see if the new index already exists and delete id it does
    // this is here so that multiple redexing can occur into same
    // new index and tthe indexing operation can be checked
    // to ensure it executed correctly
    const indexExists = await _exists( newIndex );

    if ( indexExists ) {
      await _remove( newIndex );
    }

    // create new index
    await _create( newIndex, MAPPINGS[indexAlias] );
    // reindex
    const reIndexResult = await _reindex( oldIndex, newIndex, indexSize, indexScript, indexQuery );

    res.status( 200 ).json( reIndexResult );
  } catch ( err ) {
    next( err );
  }
};
