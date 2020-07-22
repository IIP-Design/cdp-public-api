import client from '../../services/elasticsearch';
import * as validate from '../modules/validate';
import { hasValidToken, stripInternalContent } from '../modules/auth';
import { transformThumbnailUrls } from './utils';

// TO DO: implement multisearch query
const multiSearch = async ( req, res ) => {
  console.log( `EXECUTE msearch ${res}` );
};

const singleSearch = async ( req, res ) => {
  let data = {
    options: {
      ignoreUnavailable: true,
      allowNoIndices: true,
      requestCache: true,
    },
    error: {},
  };

  data = validate.stringOrStringArray(
    {
      q: req.body.query,
      _sourceExclude: req.body.exclude,
      _sourceInclude: req.body.include,
      type: req.body.type,
      index: req.body.index,
      sort: req.body.sort,
      scroll: req.body.scroll,
    },
    data,
  );

  if ( req.body.body ) {
    data = validate.jsonString( { body: req.body.body }, data );
  }

  data = validate.number(
    {
      from: req.body.from,
      size: req.body.size,
    },
    data,
  );

  if ( Object.keys( data.error ).length > 0 ) {
    return res.status( 400 ).json( {
      error: true,
      message: data.error,
    } );
  }

  try {
    const esResponse = await client.search( data.options );
    let filtered;

    if ( !hasValidToken( req ) ) {
      filtered = stripInternalContent( esResponse );
    } else {
      filtered = { ...esResponse };
    }

    const transformed = await transformThumbnailUrls( filtered );

    res.json( transformed );
  } catch ( err ) {
    // const message = JSON.parse( err.response ).error.caused_by.reason;
    console.error( 'search error', '\r\n', JSON.stringify( err, null, 2 ) );
    let message;

    if ( err.response ) {
      message = JSON.parse( err.response );
      if ( message.error ) message = message.error;
      if ( message.reason ) message = message.reason;
      else message = err;
    } else message = err;

    // const message = JSON.parse( err.response ).error.reason;
    return res.status( 400 ).json( {
      error: true,
      message,
    } );
  }
};

export const search = async ( req, res ) => {
  if ( req.query.m ) {
    return multiSearch( req, res );
  }

  return singleSearch( req, res );
};

export const scroll = async ( req, res ) => {
  if ( !req.body.scrollId ) {
    return res.status( 400 ).json( {
      error: true,
      message: 'Body must contain scrollId.',
    } );
  }
  try {
    res.json(
      await client
        .scroll( { scrollId: req.body.scrollId, scroll: req.body.scroll || '30s' } )
        .then( esResponse => esResponse ),
    );
  } catch ( err ) {
    console.error( 'scroll error', '\r\n', JSON.stringify( err, null, 2 ) );
    let message;

    if ( err.response ) {
      message = JSON.parse( err.response );
      if ( message.error ) message = message.error;
      if ( message.reason ) message = message.reason;
      else message = err;
    } else message = err;

    // const message = JSON.parse( err.response ).error.reason;
    return res.status( 400 ).json( {
      error: true,
      message,
    } );
  }
};
