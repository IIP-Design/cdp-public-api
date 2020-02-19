/**
 * The stuff in the workers directory may go into a separate contianer.
 * Puting within the api codebase for testing purposes
 *
 */

import {} from 'dotenv/config';
import { publishToChannel } from '../connection';
import { createDocument, updateDocument, deleteDocuments } from './controller';
import { copyS3AllAssets, deleteAllS3Assets } from '../../services/aws/s3';

const AUTHORING_BUCKET = process.env.AWS_S3_AUTHORING_BUCKET;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;

async function handleCreate( data ) {
  console.log( '[√] Handle a publish PACKAGE create request' );

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

  // publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.create.package',
    data: {
      projectId
    }
  } );

  console.log( '[x] PUBLISHED publish package create result' );
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

  // 4. publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.update.package',
    data: {
      projectId
    }
  } );

  console.log( '[x] PUBLISHED publish package update result' );
}

async function handleDelete( data ) {
  console.log( '[√] Handle a publish delete request' );

  const {
    projectIds,
    projectDirectory
  } = data;

  // 1. Delete package and each document type ES document
  const deletion = await deleteDocuments( projectIds );

  // 3. Delete s3 assets if valid projectDirectory exists
  // continue with assets deletion even if error thrown in elastic
  // if doc doesn't exist in elastic, there should not be corresponding assets
  if ( typeof projectDirectory === 'string' && projectDirectory ) {
    // what if this fails? add doc back?
    await deleteAllS3Assets( projectDirectory, PRODUCTION_BUCKET );
  }

  // 3. Log any errors
  if ( deletion.error ) {
    console.log(
      `Deletion Error: ${deletion.error} for package with id: ${projectIds.id} or documents with ids  ${projectIds.documentIds}`
    );
    if ( deletion.failures && deletion.failures.length > 0 ) {
      console.log( deletion.failures );
    }
  }

  // 4. publish results to channel
  await publishToChannel( {
    exchangeName: 'publish',
    routingKey: 'result.delete.package',
    data: { projectId: projectIds.id }
  } );

  console.log(
    '[x] PUBLISHED publish package delete result'
  );
}

export default {
  handleCreate,
  handleUpdate,
  handleDelete
};
