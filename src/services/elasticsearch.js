require( 'dotenv' ).config();

import { Client } from 'elasticsearch';

// http-aws-es module needs to be updated as it is 3 versions behind
const httpAwsEs = require( 'http-aws-es' );

let connection;

if ( process.env.NODE_ENV === 'production' ) {
  connection = {
    hosts: process.env.ELASTICSEARCH_HOST,
    connectionClass: httpAwsEs,
    apiVersion: process.env.ES_API_VERSION,
    amazonES: {
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ELASTIC_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  };
} else {
  connection = {
    host: process.env.ELASTICSEARCH_HOST,
    apiVersion: process.env.ES_API_VERSION,
    connectionClass: 'http',
    log: ['error']
  };
}

export default new Client( connection );
