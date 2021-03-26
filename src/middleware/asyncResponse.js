/** If there is a callback URL then we want to send a response immediately
 *  and handle any errors in a separate callback further down the line.
 */
const asyncResponse = ( throwNotFound = true ) => ( req, res, next ) => {
  // if this is a PUT, we need to operate on an existing doc
  // return if one does not exist.
  if ( throwNotFound && req.method === 'PUT' && !req.esDoc ) {
    return next( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
  }
  if ( req.headers.callback ) {
    console.log( 'sending async response' );
    res.json( { message: 'Sync in progress.', req: req.body } );
  }
  next();
};

export default asyncResponse;
