import { Router } from 'express';
import vimeo from '../../../services/vimeo';

const router = new Router();

router.get( '/', async ( req, res ) => {
  const url = vimeo.getAuthUrl( req.query.callback );

  res.redirect( url );
} );

router.get( '/callback', async ( req, res, next ) => {
  const tokens = await vimeo.getTokenFromCode( req.query.code ).catch( err => err );
  let error = null;

  if ( tokens instanceof Error ) {
    error = tokens.message;
    console.error( tokens );
  }
  if ( req.query.state ) {
    let redirect = req.query.state;

    if ( redirect.indexOf( '?' ) !== -1 ) redirect += '&';
    else redirect += '?';
    if ( error ) redirect += `error=${encodeURIComponent( error )}`;
    else redirect += `token=${tokens.access_token}`;
    console.log( 'redirect', redirect );
    res.redirect( redirect );
  } else if ( error ) {
    next( error );
  } else res.json( tokens );
} );

router.route( '/:vimeoId' ).get( async ( req, res ) => {
  res.json( await vimeo.getVideo( req.params.vimeoId, req.headers.vimeo_token ) );
} );

export default router;
