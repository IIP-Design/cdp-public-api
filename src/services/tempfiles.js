import tmp from 'tmp';

tmp.setGracefulCleanup();

const files = [];

const createTempFile = requestId => {
  if ( !requestId ) {
    throw new Error( 'Request ID not provided when attempting to create new temp file.' );
  }
  const tmpObj = tmp.fileSync( { dir: process.env.TMP_DIR } );
  // try to find an existing reference to this request ID
  const reqFiles = files.find( val => val.requestId === requestId );

  // if there isn't one, create it
  if ( !reqFiles ) files.push( { requestId, tempFiles: [tmpObj] } );
  else reqFiles.tempFiles.push( tmpObj );

  return tmpObj;
};

const deleteTempFiles = requestId => {
  if ( !requestId ) {
    throw new Error( 'Request ID not provided when attempting to delete temp files.' );
  }
  const filesIndex = files.findIndex( val => val.requestId === requestId );

  if ( filesIndex < 0 ) return;
  const reqFiles = files[filesIndex];

  files.splice( filesIndex, 1 );
  const totalFiles = reqFiles.tempFiles.length;

  while ( reqFiles.tempFiles.length > 0 ) {
    const tmpObj = reqFiles.tempFiles.pop();

    try {
      tmpObj.removeCallback();
    } catch ( err ) {
      console.warn( 'Catch temp file delete error' );
    }
  }
  console.log( `deleted ${requestId} - ${totalFiles} files` );
};

const tempFiles = {
  createTempFile,
  deleteTempFiles,
};

export default tempFiles;
