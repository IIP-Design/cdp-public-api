import morgan from 'morgan';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';

// var compression = require('compression')

const middlewareSetup = ( app ) => {
  // app.use(compression())
  app.use( helmet() );
  app.use( cors() );
  app.use( bodyParser.json() );
  app.use( bodyParser.urlencoded( { extended: true } ) );

  if ( process.env.NODE_ENV !== 'local' ) {
    app.use( morgan( 'dev' ) );
  }
};

export default middlewareSetup;
