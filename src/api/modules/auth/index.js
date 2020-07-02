import { Router } from 'express';
import jwt from 'jsonwebtoken';
import cloneDeep from 'lodash.clonedeep';
import vimeoRoutes from './vimeo';

const router = new Router();

/**
 * Blocks access to a route using a JWT token
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export const requireAuth = ( req, res, next ) => {
  if ( req.headers && typeof req.headers.authorization !== 'undefined' ) {
    const token = req.headers.authorization.split( ' ' )[1];

    jwt.verify( token, process.env.ES_APP_SECRET, ( err, decoded ) => {
      if ( err || decoded.user !== process.env.ES_APP_USER ) {
        return next( { error: 1, message: 'Invalid user credentials' } );
      }
    } );
    if ( !req.headers.vimeo_token ) {
      req.headers.vimeo_token = process.env.VIMEO_TOKEN || null;
    }

    return next();
  }

  next( { error: 1, message: 'Unauthorized' } );
};

export const hasValidToken = req => {
  let hasToken = false;

  if ( req.headers && typeof req.headers.authorization !== 'undefined' ) {
    const token = req.headers.authorization.split( ' ' )[1];

    jwt.verify( token, process.env.ES_APP_SECRET, ( err, decoded ) => {
      if ( decoded && decoded.user === process.env.ES_APP_USER ) {
        hasToken = true;
      }
    } );
  }

  return hasToken;
};

/**
 * Walk the object tree and set known internal fields
 * to an epmty string ''.
 * TODO : This function should not hardcode internal
 * fields names but set the parent obj (or all siblings)
 * to empty.  Requires more robust testing so opted
 * for safer solution given time constraints
 * NOTE: Receiving cloned object as param so not cloning
 * in the function for perfomance reasons
 * @param {object} obj object to traverse
 */
const stripInternalFields = obj => {
  Object.keys( obj ).forEach( k => {
    if ( obj[k] && typeof obj[k] === 'object' ) {
      stripInternalFields( obj[k] );
    } else if ( k === 'visibility' && obj[k].toLowerCase() === 'internal' ) {
      if ( obj.content ) {
        obj.content = '';
      }
      if ( obj.url ) {
        obj.url = '';
      }
    }
  } );

  return obj;
};

/**
 * Strips any content marked as internal
 * @param {object} response Elastic search response
 */
export const stripInternalContent = response => {
  const _response = cloneDeep( response );

  // by-pass aggregations
  if ( !_response.aggregations ) {
    if ( _response.hits.total ) {
      const { hits } = _response.hits;
      const re = /^(taxonomy|language|owner)/;

      if ( re.test( hits[0]._index ) ) {
        // do not process content from static index, return
        return _response;
      }

      const originalHits = _response.hits.hits.length;

      // if visibility flag is not present, i.e. content coming
      // from WordPress OR visibility is not internal, add to array
      const _hits = hits
        // 1. Remove internal projects
        .filter( hit => {
          const { visibility } = hit._source;

          return !visibility || visibility.toLowerCase() !== 'internal';
        } )
        // 2. Set internal fields of public obj to empty
        .map( hit => {
          const source = stripInternalFields( hit._source );

          return { ...hit, _source: source };
        } );

      // if hits existed intially and were stripped due to internal visisiblity
      // flag, send internal indicator to the client
      if ( originalHits && !_hits.length ) {
        _response.internal = true;
      }

      // replace the hits prop with stripped content
      _response.hits.hits = _hits;
    }
  }

  return _response;
};


/**
 * Generates a JWT using the Subject set in the env vars
 */
const registerCtrl = ( req, res, next ) => {
  if ( !req.body.user ) {
    return res.status( 422 ).send( { error: 'You must provide a username' } );
  }

  jwt.sign( { user: req.body.user }, process.env.ES_APP_SECRET, ( err, token ) => {
    res.json( { token } );
  } );
};

if ( ( /^true/ ).test( process.env.ALLOW_AUTH_REGISTER || 'false' ) ) {
  router.route( '/register' ).post( registerCtrl );
}

router.use( '/vimeo', vimeoRoutes );

export default router;
