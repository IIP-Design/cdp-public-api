/**
 * The stuff in the workers directory may go into a separate container.
 */

import {} from 'dotenv/config';
import { getConsumerChannel } from './connection';
import video from './publish/video/video';
import pkg from './publish/package/package';
import document from './utils/document';

async function processRequest( channel, msg, processFunc ) {
  let data = null;
  try {
    // parse message
    const msgBody = msg.content.toString();
    data = JSON.parse( msgBody );

    await processFunc( data );

    // acknowledge message as processed successfully
    channel.ack( msg );
  } catch ( error ) {
    // acknowledge error occurred, send to dead letter queue -- should we log to file?
    console.log( `Error, send to dlq ${error.toString()}` );
    channel.reject( msg, false );
  }
}

const consumePublishCreate = async () => {
  const channel = await getConsumerChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.create', async ( msg ) => {
    // Better error handling here, check for msg and msg fields
    const { routingKey } = msg.fields;

    let createFn = null;
    switch ( routingKey ) {
      case 'create.video':
        createFn = video.handleCreate;
        break;

      case 'create.package':
        createFn = pkg.handleCreate;
        break;

      default:
        console.log( 'Default' );
    }

    processRequest( channel, msg, createFn );
  } );
};

const consumePublishUpdate = async () => {
  const channel = await getConsumerChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.update', async ( msg ) => {
    // Better error handling here, check for msg and msg fields
    const { routingKey } = msg.fields;

    let updateFn = null;
    switch ( routingKey ) {
      case 'update.video':
        updateFn = video.handleUpdate;
        break;

      case 'update.package':
        updateFn = pkg.handleUpdate;
        break;

      default:
        console.log( 'Default' );
    }

    processRequest( channel, msg, updateFn );
  } );
};

const consumePublishDelete = async () => {
  const channel = await getConsumerChannel();
  await channel.prefetch( 1 );

  channel.consume( 'publish.delete', async ( msg ) => {
    // Better error handling here, check for msg and msg fields
    const { routingKey } = msg.fields;

    let deleteFn = null;
    switch ( routingKey ) {
      case 'delete.video':
        deleteFn = video.handleDelete;
        break;

      case 'delete.package':
        deleteFn = pkg.handleDelete;
        break;

      default:
        console.log( 'Could not find a matching handler for the supplied routing key' );
    }

    processRequest( channel, msg, deleteFn );
  } );
};

const consumeUtilProcessDocument = async () => {
  const channel = await getConsumerChannel();
  await channel.prefetch( 1 );

  channel.consume( 'util.process', async ( msg ) => {
    const { routingKey } = msg.fields;
    if ( routingKey === 'convert.document' ) {
      document.handleConvert( channel, msg );
    }
  } );
};

// add error handling
const listenForMessages = async () => {
  // start consuming messages
  consumePublishCreate();
  consumePublishUpdate();
  consumePublishDelete();
  consumeUtilProcessDocument();

  console.log( '[...] LISTENING for publish requests' );
};

listenForMessages();
