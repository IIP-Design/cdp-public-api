/**
 * The stuff in the workers directory may go into a separate contianer.
 * Puting within the api codebase for testing purposes
 *
 */

import {} from 'dotenv/config';
import amqp from 'amqplib';
import { createDocument, updateDocument, deleteDocument } from './controller';
import { copyS3AllAssets, deleteAllS3Assets } from '../../services/aws/s3';

// RabbitMQ connection string
const RABBITMQ_CONNECTION = process.env.RABBITMQ_ENDPOINT;
const AUTHORING_BUCKET = process.env.AWS_S3_AUTHORING_BUCKET;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;
let consumerConnection = null;
let publisherConnection = null;

const connect = async () => amqp.connect( RABBITMQ_CONNECTION );

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

const createChannel = async () => {
  const connection = await getConnection( 'publisher' );
  const channel = await connection.createConfirmChannel();
  return channel;
};

const handleConnectionEvents = ( connection ) => {
  // handle connection closed
  connection.on( 'close', () => console.log( 'Connection has been closed' ) );
  // handle errors
  connection.on( 'error', err => console.log( `Error: Connection error: ${err.toString()}` ) );
};

// utility function to publish messages to a channel
const publishToChannel = ( channel, {
  routingKey,
  exchangeName,
  data
} ) => new Promise( ( resolve, reject ) => {
  channel.publish(
    exchangeName,
    routingKey,
    Buffer.from( JSON.stringify( data ), 'utf-8' ), {
      persistent: true
    }, ( err ) => {
      if ( err ) {
        return reject( err );
      }

      resolve();
    }
  );
} );

async function handleCreate( data ) {
  console.log( '[√] Handle a publish create request' );

  let projectId;
  let projectJson;
  let projectDirectory;
  let creation;

  try {
    ( { projectId, projectJson, projectDirectory } = data );
    const projectData = JSON.parse( projectJson );

    // create ES document
    creation = await createDocument( projectId, projectData );

    // if doc is created, copy assets if valid projectDirectory exists
    if ( creation.result === 'created' ) {
      if ( typeof projectDirectory === 'string' && projectDirectory ) {
        // what if this fails? add remove doc?
        await copyS3AllAssets( projectDirectory, AUTHORING_BUCKET, PRODUCTION_BUCKET );
      }
    }
  } catch ( err ) {
    throw new Error( err );
  }

  const resultsChannel = await createChannel();

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.create.video',
    data: {
      projectId
    }
  } );

  resultsChannel.close();

  console.log( '[x] PUBLISHED publish create result' );
}

async function handleUpdate( data ) {
  console.log( '[√] Handle a publish update request' );

  const { projectId, projectJson, projectDirectory } = data;
  const projectData = JSON.parse( projectJson );

  // 1. update ES document
  const update = await updateDocument( projectId, projectData );

  // 2. if ES document not found, abort
  if ( update.error ) {
    throw new Error( `Update Error: ${update.error} for project with id: ${projectId}` );
  }

  // 3. copy assets to s3
  if ( update.result === 'updated' ) {
    if ( typeof projectDirectory === 'string' && projectDirectory ) {
      // what if this to update? add remove doc?
      await copyS3AllAssets( projectDirectory, AUTHORING_BUCKET, PRODUCTION_BUCKET );
    }
  }

  const resultsChannel = await createChannel();

  // 4. publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.update.video',
    data: {
      projectId
    }
  } );

  resultsChannel.close();

  console.log( '[x] PUBLISHED publish update result' );
}

async function handleDelete( data ) {
  console.log( '[√] Handle a publish delete request' );

  const { projectId, projectDirectory } = data;

  // 1. Delete ES documents
  const deletion = await deleteDocument( projectId );

  // 2. Delete s3 assets if valid projectDirectory exists
  // continue with assets deletion even if error thrown in elastic
  // if doc doesn't exist in elastic, there should not be corresponding assets
  if ( typeof projectDirectory === 'string' && projectDirectory ) {
    // what if this fails? add doc back?
    await deleteAllS3Assets( projectDirectory, PRODUCTION_BUCKET );
  }

  // 3. Log any errors
  if ( deletion.error ) {
    console.log( `Deletion Error: ${deletion.error} for project with id: ${projectId}` );
    if ( deletion.failures && deletion.failures.length > 0 ) {
      console.log( deletion.failures );
    }
  }

  const resultsChannel = await createChannel();

  // 4. publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.delete.video',
    data: {
      projectId
    }
  } );

  resultsChannel.close();

  console.log( '[x] PUBLISHED publish delete result' );
}

async function processRequest( channel, resultsChannel, msg, processFunc ) {
  try {
    // parse message
    const msgBody = msg.content.toString();
    const data = JSON.parse( msgBody );
    await processFunc( data, resultsChannel );

    // acknowledge message as processed successfully
    channel.ack( msg );
  } catch ( error ) {
    // acknowledge error occurred, send to dead letter queue -- should we log to file?
    console.log( `Error, send to dlq ${error.toString()}` );
    channel.reject( msg, false );
  }
}

const consumePublishCreate = async ( resultsChannel ) => {
  const connection = await getConnection( 'consumer' );
  handleConnectionEvents( connection );

  const channel = await connection.createChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.create', async ( msg ) => {
    processRequest( channel, resultsChannel, msg, handleCreate );
  } );
};

const consumePublishUpdate = async ( resultsChannel ) => {
  const connection = await getConnection( 'consumer' );
  handleConnectionEvents( connection );

  const channel = await connection.createChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.update', async ( msg ) => {
    processRequest( channel, resultsChannel, msg, handleUpdate );
  } );
};

const consumePublishDelete = async ( resultsChannel ) => {
  const connection = await getConnection( 'consumer' );
  handleConnectionEvents( connection );

  const channel = await connection.createChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.delete', async ( msg ) => {
    processRequest( channel, resultsChannel, msg, handleDelete );
  } );
};

const listenForMessages = async () => {
  // start consuming messages
  consumePublishCreate();
  consumePublishUpdate();
  consumePublishDelete();

  console.log( '[...] LISTENING for publish requests' );
};


listenForMessages();
