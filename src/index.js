require( 'dotenv' ).config();

import express from 'express';
import middlewareSetup from './middleware';

import searchRoutes from './modules/search/routes';
import getRoutes from './modules/get/routes';
import getSourceRoutes from './modules/getSource/routes';

const app = express();

middlewareSetup( app );

app.use( '/v1', [
  searchRoutes,
  getRoutes,
  getSourceRoutes
] );

app.listen( process.env.PORT, () => {
  console.log( `CDP service listening on port: ${process.env.PORT}` );
} );
