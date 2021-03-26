import {
  generateControllers,
  setRequestDocWithRetry,
  setRequestDoc,
} from '../../modules/controllers/generateResource';
import PostModel from './model';

const model = new PostModel();

const setRequestDocBypass = ( req, res, next, uuid ) => {
  if ( req.method === 'PUT' ) return next(); // bypass for PUT on post type route

  return setRequestDoc( model )( req, res, next, uuid );
};

const overrides = {
  setRequestDoc: setRequestDocBypass,
  setRequestDocWithRetry: setRequestDocWithRetry( model ),
};

export default generateControllers( model, overrides );

/*
  NOTE: Generic controller methods can be overidden:
    const getDocumentById = ( req, res, next ) => {
    res.json( { prop: 'example' } );
  };
  export default generateControllers( new VideoModel(), { getDocumentById } );
*/
