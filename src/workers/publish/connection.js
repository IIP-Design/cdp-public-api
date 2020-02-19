/**
 * The stuff in the workers directory may go into a separate contianer.
 * Puting within the api codebase for testing purposes
 *
 */

import {} from 'dotenv/config';
import amqp from 'amqplib';

// RabbitMQ connection string
const RABBITMQ_CONNECTION = process.env.RABBITMQ_ENDPOINT;

let consumerConnection = null;
let publisherConnection = null;
let consumerChannel = null;
let publishChannel = null;

const connect = async () => amqp.connect( RABBITMQ_CONNECTION );

const handleConnectionEvents = ( connection ) => {
  // handle connection closed
  connection.on( 'close', () => console.log( 'Connection has been closed' ) );
  // handle errors
  connection.on( 'error', err => console.log( `Error: Connection error: ${err.toString()}` ) );
};

const getConnection = async ( type ) => {
  if ( type === 'consumer' ) {
    if ( consumerConnection ) {
      return consumerConnection;
    }
    consumerConnection = connect();
    return consumerConnection;
  }

  if ( publisherConnection ) {
    return publisherConnection;
  }

  publisherConnection = connect();
  return publisherConnection;
};

export const getPublishChannel = async () => {
  if ( publishChannel ) {
    return publishChannel;
  }

  const connection = await getConnection( 'publish' ).catch(
    err => `[getPublishChannel] Unable to connect to RabbitMQ: ${err.toString()}`
  );

  if ( connection ) {
    handleConnectionEvents( connection );
    publishChannel = await connection.createConfirmChannel();
    return publishChannel;
  }
};

// Use separate publish and consumer channels for each thread (should we only be using 1 channel?)
export const getConsumerChannel = async () => {
  if ( consumerChannel ) {
    return consumerChannel;
  }

  const connection = await getConnection( 'consumer' ).catch(
    err => `[getConsumerChannel] Unable to connect to RabbitMQ ${err.toString()}`
  );

  if ( connection ) {
    handleConnectionEvents( connection );
    consumerChannel = await connection.createChannel();
    return consumerChannel;
  }
};

// utility function to publish messages to a channel
export const publishToChannel = async ( { routingKey, exchangeName, data } ) => {
  const channel = await getPublishChannel();

  return new Promise( ( resolve, reject ) => {
    channel.publish(
      exchangeName,
      routingKey,
      Buffer.from( JSON.stringify( data ), 'utf-8' ),
      {
        persistent: true
      },
      ( err ) => {
        if ( err ) {
          return reject( err );
        }

        resolve();
      }
    );
  } );
};
