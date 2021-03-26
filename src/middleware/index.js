import morgan from 'morgan';
import compression from 'compression';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import cuid from 'cuid';
import fileUpload from 'express-fileupload';

const addRequestId = ( req, res, next ) => {
  req.requestId = cuid();
  next();
};

const addQueryArgsProperty = ( req, res, next ) => {
  req.queryArgs = {};
  next();
};

const middlewareSetup = app => {
  app.use( compression() );
  app.use( addRequestId );
  app.use( addQueryArgsProperty );
  app.use( helmet( {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  } ) );
  app.use( cors() );
  app.use( fileUpload() );
  app.use( bodyParser.json( { limit: '100mb' } ) );
  app.use( bodyParser.urlencoded( { extended: true } ) );

  if ( process.env.NODE_ENV === 'development' ) {
    app.use( morgan( 'dev' ) );
  } else {
    app.use( morgan( 'combined' ) );
  }
};

export default middlewareSetup;
