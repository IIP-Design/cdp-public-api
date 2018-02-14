import Request from 'request';

const apiErrorHandler = ( err, req, res, next ) => {
  // Send different messages based on error type (err.status)
  console.error( 'errorHandler', err );
  if ( req.headers.callback ) {
    console.log( 'sending callback error' );
    Request.post(
      {
        url: req.headers.callback,
        json: true,
        form: {
          error: 1,
          message: err.message || err.toString(),
          request: req.body,
          params: req.params
        }
      },
      () => {}
    );
  }
  if ( !res.headersSent ) {
    console.log( 'no headers sent, sending error' );
    res.status( 200 ).json( err.message || err.toString() );
  }
};

export default apiErrorHandler;
