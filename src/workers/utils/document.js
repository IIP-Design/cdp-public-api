import { publishToChannel } from '../connection';
import { convertDocxContent, generateDocThumbnail } from './documentConversion';


async function handleConvert( channel, msg ) {
  console.log( '[√] Handle a util process document request' );

  const {
    env: { WORKER_GENERATE_THUMBNAIL }
  } = process;

  const createThumb = WORKER_GENERATE_THUMBNAIL !== 'no';

  const msgBody = msg.content.toString();
  const data = JSON.parse( msgBody );

  const {
    id, url, assetPath, thumbnailFilename
  } = data;

  let content = '';
  let thumbnailUrl = '';
  let error = null;

  try {
    if ( url ) {
      console.log( `Processing document : ${thumbnailFilename}` );

      // Extract html content
      content = await convertDocxContent( url );
      if ( createThumb && content ) {
        // Use extracted html to create thumbnail
        thumbnailUrl = await generateDocThumbnail( content.html, assetPath, thumbnailFilename );
      }
    }
  } catch ( err ) {
    error = err.toString();
  }

  // 4. publish results to channel
  await publishToChannel( {
    exchangeName: 'util',
    routingKey: 'convert.result',
    data: {
      id,
      title: thumbnailFilename,
      content,
      thumbnailUrl: createThumb ? thumbnailUrl : 'NONE',
      error
    }
  } );

  console.log( '[x] PUBLISHED util process convert result' );

  channel.ack( msg );
}

export default { handleConvert };
