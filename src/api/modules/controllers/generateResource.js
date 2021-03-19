/*
  The Data Access Layer (DAL) provides the controllers for making
  requests against the database (currently ElasticSearch).
 */

import controllers from '../elastic/controller';
import * as utils from '../utils';

// POST v1/[resource]
export const indexDocument = model => ( req, res, next ) => {
  console.log( 'INDEX DOCUMENT', req.requestId );

  return controllers
    .indexDocument( model, req )
    .then( doc => {
      req.esDoc = doc;
      if ( !utils.callback( req, { doc } ) && !res.headersSent ) res.status( 201 ).json( doc );
      next();
    } )
    .catch( error => next( error ) );
};

// PUT v1/[resource]/:uuid
export const updateDocumentById = model => async ( req, res, next ) => controllers
  .updateDocumentById( model, req )
  .then( doc => {
    if ( req.esDoc ) req.esDoc = { ...req.esDoc, ...doc };
    else req.esDoc = doc;
    if ( !utils.callback( req, { doc: req.esDoc } ) && !res.headersSent ) {
      res.status( 201 ).json( req.esDoc );
    }
    next();
  } )
  .catch( err => next( err ) );

// DELETE v1/[resource]/:uuid
export const deleteDocumentById = model => ( req, res, next ) => controllers
  .deleteDocumentById( model, req )
  .then( doc => res.status( 200 ).json( doc ) )
  .catch( err => next( err ) );

// GET v1/[resource]/:uuid
export const getDocumentById = () => ( req, res, next ) => {
  if ( req.esDoc ) {
    res.status( 200 ).json( req.esDoc );
  } else {
    return next( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
  }
};

export const setRequestDoc = model => ( req, res, next, uuid ) => {
  const query = utils.getQueryFromUuid( uuid );

  req.queryArgs = query;

  return controllers
    .findDocument( model, query )
    .then( doc => {
      if ( doc ) req.esDoc = doc;
      next();
    } )
    .catch( error => {
      next( error );
    } );
};

export const setRequestDocWithRetry = model => async ( req, res, next ) => {
  const query = utils.getQueryFromUuid( req.params.uuid );

  req.queryArgs = query;
  let attempts = 0;
  const findDoc = () => {
    attempts += 1;
    console.log( `attempting to find document ${req.params.uuid} attempt: `, attempts );
    controllers
      .findDocument( model, utils.getQueryFromUuid( req.params.uuid ) )
      .then( doc => {
        if ( doc ) {
          console.log( `Found document for ${req.params.uuid}, passing along...` );
          req.esDoc = doc;

          return next();
        }
        if ( attempts < 6 ) {
          console.log( 'No document found, attempting retry for ', req.params.uuid );
          setTimeout( findDoc, 10000 );
        } else return next( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
      } )
      .catch( error => next( error ) );
  };

  await findDoc();
};

export const generateControllers = ( model, overrides = {} ) => {
  const defaults = {
    indexDocument: indexDocument( model ),
    updateDocumentById: updateDocumentById( model ),
    deleteDocumentById: deleteDocumentById( model ),
    getDocumentById: getDocumentById( model ),
    setRequestDoc: setRequestDoc( model ),
  };

  return { ...defaults, ...overrides };
};
