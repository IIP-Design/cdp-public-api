import path from 'path';

import axios from 'axios';
import getStream from 'get-stream';
import mammoth from 'mammoth';
import nodeHtmlToImage from 'node-html-to-image';
import tmp from 'tmp';
import xss from 'xss';

import { getSignedUrl, uploadAsset } from '../services/aws/s3';

tmp.setGracefulCleanup( { unsafeCleanup: true } );

/**
 * Strips tags and multiple spaces from a string of html
 * @param {string} string
 */
const htmlToText = ( string = '' ) => string
  .replace( /<[\s\S]*?>/g, ' ' )
  .replace( /\t/g, ' ' )
  .replace( /\s{2,}/g, ' ' )
  .trim();


/**
 * Gets a remote docx as a Buffer
 * @param {string} url
 */
const getDocxBuffer = url => axios
  .get( url, { responseType: 'stream' } )
  .then( async res => {
    if ( res.status === 200 ) {
      try {
        return await getStream.buffer( res.data );
      } catch ( error ) {
        console.log( error.bufferedData );
      }
    }

    return Buffer.from( [] );
  } )
  .then( buf => buf )
  .catch( err => console.log( err ) );

/**
 * Generates document.content & document.excerpt w/ converted docx content
 * @param {object <Buffer>} input document file buffer
 * @see https://github.com/mwilliamson/mammoth.js
 */
const getDocumentContent = async input => {
  const response = await mammoth.convertToHtml( input );

  if ( response ) {
    const { value, messages } = response;

    if ( messages && messages.length ) {
      messages.forEach( msg => console.log( msg ) );
    }

    if ( value ) {
      return {
        rawText: htmlToText( value ),
        html: xss( value ),
        markdown: '', // omit md since not used by client
      };
    }
  }

  return null;
};

const getCleanFileName = filename => {
  const _filename = filename
    .replace( /[&/\\#,+$~%'"`=:;*?^<>@(){}|[\]]/g, '' )
    .replace( /\s/g, '_' )
    .toLowerCase();

  return `/${_filename}.png`;
};

export const generateDocThumbnail = async ( html, assetPath, outputName ) => {
  const tmpDir = tmp.dirSync( { unsafeCleanup: true } );
  const filename = getCleanFileName( outputName );
  const tmpSavePath = path.join( tmpDir.name, filename );

  await nodeHtmlToImage( {
    output: tmpSavePath,
    puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    html: `<html
        <head>
          <style>
            body {
              width: 225px;
              height: 300px;
              padding-top: 40px;  
              padding-bottom: 60px;  
              padding-left: 40px;  
              padding-right: 40px;  
              font-size: 6px;
            }
            a {
              color: #2964bb;
            }
          <style>
          </style>
        </head>
        <body>${html}</body>
      </html>
      `,
  } ).catch( err => console.log( err ) );

  // upload to aws
  const res = await uploadAsset( tmpSavePath, `${assetPath}${filename}` );

  // Clean up tmp folder
  tmpDir.removeCallback();

  return res.key;
};

/**
 * Converts docx content
 * @param {object} document DocumentFile object
 */
export const convertDocxContent = async url => {
  let content = null;

  if ( url ) {
    const signed = await getSignedUrl( { key: url } );
    const buffer = await getDocxBuffer( signed.url );

    if ( buffer ) {
      content = await getDocumentContent( { buffer } );
    }
  }

  return content;
};
