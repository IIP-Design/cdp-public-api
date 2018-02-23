/*
  The Data Access Layer (DAL) provides the controllers for making
  requests against the database (currently ElasticSearch).
 */

import controllers from './elastic/controller';
import * as utils from '../utils';

// POST v1/[resource]
export const indexDocument = model => ( req, res, next ) => {
  controllers
    .indexDocument( model, req )
    .then( ( doc ) => {
      if ( !utils.callback( req, { doc } ) ) res.status( 201 ).json( doc );
    } )
    .catch( error => next( error ) );
};

// PUT v1/[resource]/:uuid
export const updateDocumentById = model => async ( req, res, next ) =>
  controllers
    .updateDocumentById( model, req )
    .then( ( doc ) => {
      if ( !utils.callback( req, { doc } ) ) res.status( 201 ).json( doc );
    } )
    .catch( err => next( err ) );

// DELETE v1/[resource]/:uuid
export const deleteDocumentById = model => ( req, res, next ) =>
  controllers
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

export const setRequestDoc = model => ( req, res, next, uuid ) =>
  controllers
    .findDocument( model, utils.getQueryFromUuid( uuid ) )
    .then( ( doc ) => {
      if ( doc ) req.esDoc = doc;
      next();
    } )
    .catch( ( error ) => {
      next( error );
    } );

export const generateControllers = ( model, overrides = {} ) => {
  const defaults = {
    indexDocument: indexDocument( model ),
    updateDocumentById: updateDocumentById( model ),
    deleteDocumentById: deleteDocumentById( model ),
    getDocumentById: getDocumentById( model ),
    setRequestDoc: setRequestDoc( model )
  };

  return { ...defaults, ...overrides };
};
