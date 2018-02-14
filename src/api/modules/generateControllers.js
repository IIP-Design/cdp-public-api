/*
  The Data Access Layer (DAL) provides the controllers for making
  requests against the database (currently ElasticSearch).
 */

import controllers from './elastic/controller';
import Request from 'request';

// POST v1/[resource]
export const indexDocument = model => ( req, res, next ) => {
  controllers
    .indexDocument( model, req )
    .then( ( doc ) => {
      // TODO: Perhaps find a better way to handle the callback?
      if ( req.headers.callback ) {
        console.log( 'sending callback', req.headers.callback );
        Request.post(
          {
            url: req.headers.callback,
            json: true,
            form: {
              error: 0,
              doc
            }
          },
          () => {}
        );
      } else res.status( 201 ).json( doc );
    } )
    .catch( error => next( error ) );
};

// DELETE v1/[resource]/
export const deleteDocument = model => ( req, res, next ) => {
  controllers
    .deleteDocumentByQuery( model, req )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );
};

// GET v1/[resource]/?site-[site]&post_id=[post_id]
export const getDocument = model => ( req, res, next ) => {
  controllers
    .getDocument( model, req.query )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );
};

// PUT v1/[resource]/:uuid
export const updateDocumentById = model => async ( req, res, next ) => {
  controllers
    .updateDocumentById( model, req.body, req.params.id )
    .then( doc => res.status( 201 ).json( doc ) )
    .catch( err => next( err ) );
};

// DELTE v1/[resource]/:uuid
export const deleteDocumentById = model => async ( req, res, next ) => {
  const id = req.esDoc ? req.esDoc.id : null;
  return controllers
    .deleteDocumentById( model, id )
    .then( doc => res.status( 200 ).json( doc || req.esDoc ) )
    .catch( err => next( err ) );
};

// GET v1/[resource]/:uuid
export const getDocumentById = model => ( req, res, next ) => {
  if ( req.esDoc ) {
    res.status( 200 ).json( req.esDoc );
  } else {
    return next( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
  }
  // controllers
  //   .getDocumentById( model, req.params.id )
  //   .then( doc => res.status( 200 ).json( doc ) )
  //   .catch( err => next( err ) );
};

// Populates req.esDoc with the document specified by /:uuid if any.
export const setRequestDoc = model => async ( req, res, next, uuid ) => {
  if ( uuid ) await model.prepareDocument( req ).catch( err => next( err ) );
  next();
};

export const generateControllers = ( model, overrides = {} ) => {
  const defaults = {
    indexDocument: indexDocument( model ),
    updateDocumentById: updateDocumentById( model ),
    deleteDocument: deleteDocument( model ),
    deleteDocumentById: deleteDocumentById( model ),
    getDocument: getDocument( model ),
    getDocumentById: getDocumentById( model ),
    setRequestDoc: setRequestDoc( model )
  };

  return { ...defaults, ...overrides };
};
