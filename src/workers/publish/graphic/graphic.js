/**
 * The stuff in the workers directory may go into a separate container.
 * Puting within the api codebase for testing purposes
 */

import {} from 'dotenv/config';
import { publishToChannel } from '../../connection';
import { createDocument, updateDocument, deleteDocument } from './controller';
import { copyS3AllAssets, deleteAllS3Assets } from '../../services/aws/s3';

const AUTHORING_BUCKET = process.env.AWS_S3_AUTHORING_BUCKET;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;

async function handleCreate( data ) {
  console.log( '[√] Handle a publish GRAPHIC create request' );

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
        await copyS3AllAssets( projectDirectory, AUTHORING_BUCKET, PRODUCTION_BUCKET ).catch( err => console.log( err ) );
      }
    }
  } catch ( err ) {
    throw new Error( err );
  }

  // publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.create.graphic',
    data: {
      projectId,
    },
  } );

  console.log( '[x] PUBLISHED publish GRAPHIC create result' );
}

async function handleUpdate( data ) {
  console.log( '[√] Handle a publish GRAPHIC update request' );

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

  // 4. publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.update.graphic',
    data: {
      projectId,
    },
  } );

  console.log( '[x] PUBLISHED publish GRAPHIC update result' );
}

async function handleDelete( data ) {
  console.log( '[√] Handle a publish GRAPHIC delete request' );

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

  // 4. publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.delete.graphic',
    data: {
      projectId,
    },
  } );

  console.log( '[x] PUBLISHED publish GRAPHIC delete result' );
}

export default {
  handleCreate,
  handleUpdate,
  handleDelete,
};
