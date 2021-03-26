const compileValidationErrors = errors => `Validation errors: ${errors.map( error => `${error.dataPath} : ${error.message}` )}`;

export const validate = ( Model, useDefaults = true ) => async ( req, res, next ) => {
  const result = Model.validateSchema( req.body, useDefaults );

  if ( !result.valid ) {
    return next( new Error( compileValidationErrors( result.errors ) ) );
  }
  if ( !req.body.thumbnail || !req.body.thumbnail.sizes ) {
    console.log( 'Missing thumbnail', '\r\n', JSON.stringify( req.body, null, 2 ) );
  }
  next();
};
