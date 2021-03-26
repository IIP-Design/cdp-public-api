import {} from 'dotenv/config';

import http from 'http';
import app from './server';

// Used for module hot reloading, will maintain state
const server = http.createServer( app );
const PORT = process.env.PORT || 8080;

server.listen( PORT, () => {
  console.log( `CDP service listening on port: ${PORT}` );
} );
