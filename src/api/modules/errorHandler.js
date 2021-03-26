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
          params: { ...req.params, ...req.queryArgs },
        },
        headers: { 'User-Agent': 'API' },
      },
      ( error, response, body ) => {
        if ( err ) {
          req.callbackSent = true;
          console.error( 'callback error error', '\r\n', JSON.stringify( err, null, 2 ) );
        } else if ( !body && req.callbackAttempt < 3 ) {
          console.warn( 'callback error response body is undefined' );
        } else {
          req.callbackSent = true;
          console.log( 'callback error response body', JSON.stringify( body, null, 2 ) );
        }
      },
    );
    req.callbackSent = true;
  }
  if ( !res.headersSent ) {
    console.log( 'no headers sent, sending error' );
    res.status( 200 ).json( err.message || err.toString() );
  }
};

export default apiErrorHandler;
