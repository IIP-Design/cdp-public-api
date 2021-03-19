import controllers from '../elastic/controller';
import * as utils from '../utils';

// POST v1/[resource]
export const indexDocument = model => ( req, res, next ) => controllers
  .indexDocument( model, req )
  .then( doc => {
    res.status( 201 ).json( doc );
    next();
  } )
  .catch( error => next( error ) );

export const getAllDocuments = model => async ( req, res, next ) => controllers
  .getAllDocuments( model )
  .then( docs => {
    let ret = docs;

    if ( 'tree' in req.query ) ret = model.constructTree( docs );
    if ( !utils.callback( req, ret ) ) res.status( 201 ).json( ret );
  } )
  .catch( err => next( err ) );

export const getDocumentById = model => async ( req, res, next ) => {
  if ( 'tree' in req.query ) {
    return controllers
      .getAllDocuments( model )
      .then( docs => {
        const tree = model.constructTree( docs, req.params.id );

        if ( !utils.callback( req, tree ) ) res.status( 201 ).json( tree );
      } )
      .catch( err => next( err ) );
  }

  return controllers
    .getDocumentById( model, req.params.id )
    .then( doc => {
      if ( !utils.callback( req, doc ) ) res.status( 201 ).json( doc );
    } )
    .catch( err => next( err ) );
};

export const generateControllers = ( model, overrides = {} ) => {
  const defaults = {
    indexDocument: indexDocument( model ),
    getAllDocuments: getAllDocuments( model ),
    getDocumentById: getDocumentById( model ),
  };

  return { ...defaults, ...overrides };
};
