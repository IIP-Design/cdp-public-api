import { Router } from 'express';
import download from '../modules/download';
import aws from '../../services/amazon-aws';
// import client from '../../services/elasticsearch';
// import controllers from '../modules/elastic/controller';

const router = new Router();

// List files in cdp-video-tst bucket
router.get( '/', async ( req, res ) => {
  // await aws.s3.listObjects( { Bucket: 'cdp-video-tst' }, ( err, data ) => {
  //   if ( err ) throw new Error( err.message );
  //   else res.status( 201 ).json( data );
  // } );
  // const esQuery = esQueryFactory( client, 'videos', 'video' );
  //
  // const result = await controllers
  //   .findDocument( esQuery, {
  //     post_id: 1500,
  //     type: 'video',
  //     site: 'cdp.local'
  //   } )
  //   .catch( () => null );
  // // .then( result => res.json( result ) )
  // // .catch( err => res.status( 500 ).json( { error: true, message: err.message } ) );
  // console.log( 'result', result );
  // res.json( result );
  aws.remove( { url: 'imagetest.jpg' } );
  res.json( { message: 'cool' } );
} );

// Post {url: '', title: ''} to upload the file located at URL to S3
router.post( '/', async ( req, res ) => {
  const file = await download( req.body.url ).catch( err =>
    res.status( 500 ).send( err.message || err.toString() ) );

  // if ( file.tmpObj ) file.tmpObj.removeCallback();
  // res.json( file );
  const filename = req.body.title;

  const result = await aws
    .upload( { title: filename, ext: file.props.ext, tmpobj: file.tmpobj } )
    .catch( err => err );
  res.json( { props: file.props, ...result } );
  // res.json( file.props );
} );

export default router;
