import LanguageModel from './model';
import { generateControllers, getAllDocuments } from '../../modules/controllers/generateList';
import parse from 'csv-parse/lib/sync';
import controllers from '../../modules/elastic/controller';
import parser from '../../modules/elastic/parser';

const langModel = new LanguageModel();

const bulkImport = model => async ( req, res, next ) => {
  if ( !req.files.length < 1 || !req.files.csv ) {
    return res.json( { error: 1, message: 'No CSV file provided.' } );
  }

  /**
   * Create a language document if it does not already exists.
   * Return the created or existing document.
   *
   * @param language
   * @returns {Promise<*>}
   */
  const createLanguage = async language => {
    let foundLang = await controllers.findDocByTerm( model, language.locale );

    // If term not found, then create one
    if ( !foundLang ) {
      foundLang = await model.indexDocument( language ).then( parser.parseCreateResult( language ) ); // eslint-disable-line max-len
    }

    return foundLang;
  };

  /**
   * Iterate the rows using reduce creating terms as needed. Store terms in an object
   * to check before creating new terms. Reuse term if found and update.
   * Property identify each column using the head object which contains indices
   * as the values.
   *
   * @param head
   * @param rows
   * @returns {Promise<*>}
   */
  const processRows = async ( head, rows ) => {
    // In order keep this synchronous, we have to get really tricky
    // with reduce and promises. Essentially, we return a promise on each reduce
    // iteration which we then extract content from using .then
    // The return from the result is a promise containing the accumulated
    // terms array which is accessed thanks to await
    const seen = await rows.reduce(
      async ( langsP, cols ) => langsP.then( async langs => {
        console.log( 'Processing:', JSON.stringify( cols, null, 2 ) );
        const lang = {
          language_code: cols[head.code] || null,
          display_name: cols[head.display] || null,
          native_name: cols[head.native] || null,
        };

        if ( !lang.language_code || !lang.display_name || !lang.native_name ) {
          console.error( 'Invalid lang', JSON.stringify( lang, null, 2 ) );

          return langs;
        }

        lang.language_code = lang.language_code.toLowerCase();

        if ( head.locale && cols[head.locale] ) lang.locale = cols[head.locale].toLowerCase();
        else lang.locale = lang.language_code;

        if ( head.text_direction && cols[head.text_direction] ) {
          lang.text_direction = cols[head.text_direction].toLowerCase();
        } else lang.text_direction = 'ltr';

        if ( lang.locale && lang.display_name && lang.native_name ) {
          // If this is a duplicate from a previous row, skip
          if ( langs[lang.locale] ) return langs;

          const language = await createLanguage( lang );

          return { ...langs, [language.locale]: language };
        }
        console.error( 'Invalid lang', JSON.stringify( lang, null, 2 ) );

        return langs;
      } ),
      Promise.resolve( {} ),
    );

    return seen;
  };

  const csv = req.files.csv.data;

  try {
    /** @type array */
    let rows = parse( csv );

    if ( rows instanceof Array !== true ) {
      return next( new Error( 'Error parsing CSV.' ) );
    }
    const first = rows[0];
    const head = {
      code: '',
      locale: null,
      text_direction: 'ltr',
      display_name: '',
      native_name: '',
    };

    first.forEach( ( col, idx ) => {
      const title = col.toLowerCase();

      console.log( 'title', title );
      if ( title.indexOf( 'locale' ) === 0 ) head.locale = idx;
      else if ( title.indexOf( 'display' ) === 0 ) head.display = idx;
      else if ( title.indexOf( 'native' ) === 0 ) head.native = idx;
      else if ( title.indexOf( 'code' ) !== -1 ) head.code = idx;
      else if ( title.indexOf( 'direction' ) !== -1 ) head.text_direction = idx;
    } );
    if ( head.code === null || head.display === null || head.native === null ) {
      return next( new Error( 'CSV is missing header or missing the required columns of Language Code, Display Name, and/or Native Name.' ) );
    }
    rows = rows.splice( 1 );
    await processRows( head, rows );
  } catch ( err ) {
    return next( err );
  }
  await getAllDocuments( model )( req, res, next );
};

const overrides = {
  bulkImport: bulkImport( langModel ),
};

export default generateControllers( langModel, overrides );
