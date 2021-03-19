import TaxonomyModel from './model';
import controllers from '../../modules/elastic/controller';
import { generateControllers, getAllDocuments } from '../../modules/controllers/generateList';
import parse from 'csv-parse/lib/sync';
import parser from '../../modules/elastic/parser';

const taxModel = new TaxonomyModel();

const findDocByTerm = model => async ( req, res, next ) => controllers
  .findDocByTerm( model, req.params.name )
  .then( term => res.json( term ) )
  .catch( err => next( err ) );

const translateTermById = model => async ( req, res, next ) => controllers
  .translateTermById( model, req.params.id, req.params.locale )
  .then( name => {
    res.json( name );
  } )
  .catch( err => next( err ) );

/**
 * Create the language object containing the locale:translation pairs of the taxonomy term.
 *
 * @param termName
 * @param existingTerm
 * @param languageCols
 * @returns object
 */
const createLanguage = ( termName, existingTerm = { language: {} }, languageCols = null ) => {
  const existingLanguage = { language: {} };

  if ( existingTerm ) existingLanguage.language = existingTerm.language;
  const language = {
    en: termName.toLowerCase(),
    'en-us': termName.toLowerCase(),
    ...existingLanguage.language,
  };

  languageCols.indices.forEach( localeIndex => {
    language[localeIndex.locale] = languageCols.cols[localeIndex.index] || null;
  } );

  return language;
};

/**
 * Allows the bulk import of taxonomy terms.
 * A CSV is required in the post keyed with name 'csv'.
 * A header is assumed.
 * The CSV has 1 term per row. A name in col 1 is primary.
 * A name in col 2 is a child of the last seen primary (parent).
 * Col 3 are synonyms.
 *
 * @param model
 * @returns {function(*=, *=, *=)}
 */
const bulkImport = model => async ( req, res, next ) => {
  if ( !req.files.length < 1 || !req.files.csv ) {
    return res.json( { error: 1, message: 'No CSV file provided.' } );
  }
  let parent = null;

  /**
   * Indexes a taxonomy term.
   * If the term was previously indexed it is represented by existingTerm.
   * If not, we will try to find an existing term in ES.
   * Finally, we will update the existing or create a new term with the
   * provided synonyms and potential [new] parent.
   *
   * @param name
   * @param syns
   * @param language
   * @param isParent
   * @param existingTerm
   * @returns {Promise<*>}
   */
  const createUpdateTerm = async ( name, syns, language, isParent, existingTerm ) => {
    console.log( 'createUpdateTerm', name, syns, language, isParent, existingTerm );
    let term = existingTerm;

    // If no existingTerm provided, search ES
    if ( !term ) term = await controllers.findDocByTerm( model, name );
    // If still no term, then create one
    if ( !term ) {
      const body = {
        primary: isParent,
        parents: isParent ? [] : [parent._id],
        synonymMapping: syns,
        language,
      };

      term = await model.indexDocument( body ).then( parser.parseCreateResult( body ) );

      return term;
    }
    // We DO have an existing term so let's update the parents, synonyms, and language
    if ( !isParent && !term.parents.includes( parent._id ) ) term.parents.push( parent._id );
    syns.forEach( syn => {
      if ( !term.synonymMapping.includes( syn ) ) term.synonymMapping.push( syn );
    } );
    term.language = { ...term.language, ...language };
    term = await controllers.updateDocument( model, term, term._id );

    return term;
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
      async ( termsP, cols ) => termsP.then( async terms => {
        // If this is a skip row, then just return the accumulated terms
        if ( head.skip && cols[head.skip] ) return { ...terms };

        const syns = [];

        if ( head.synonyms && cols[head.synonyms] ) {
          // Add synonyms to the synonyms array if they don't already exist
          cols[head.synonyms]
            .toLowerCase()
            .replace( /[\r\n]+/g, '' )
            .split( ' | ' )
            .forEach( syn => {
              if ( !syns.includes( syn ) ) syns.push( syn );
            } );
        }
        let existingTerm = null;
        let termName = '';

        if ( cols[head.parent] ) {
          // This is a primary category
          termName = cols[head.parent].toLowerCase();
          if ( terms[termName] ) {
            existingTerm = terms[termName];
          }
          const language = createLanguage(
            termName,
            existingTerm,
            head.translations ? { indices: head.translations, cols } : null,
          );
          const term = await createUpdateTerm( termName, syns, language, true, existingTerm );

          parent = term;

          return { ...terms, [termName]: term };
        } if ( cols[head.child] ) {
          // This is a child category
          termName = cols[head.child].toLowerCase();
          if ( terms[termName] ) {
            existingTerm = terms[termName];
          }
          const language = createLanguage(
            termName,
            existingTerm,
            head.translations ? { indices: head.translations, cols } : null,
          );
          const term = await createUpdateTerm( termName, syns, language, false, existingTerm );
          const ret = { ...terms };

          ret[termName] = term;

          return { ...terms, [termName]: term };
        }

        return { ...terms };
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
      parent: null,
      child: null,
      synonyms: null,
      skip: null,
      translations: null,
    };

    first.forEach( ( col, idx ) => {
      const title = col.toLowerCase();

      console.log( 'title', title );
      if ( title.indexOf( 'parent' ) === 0 ) head.parent = idx;
      else if ( title.indexOf( 'child' ) === 0 ) head.child = idx;
      else if ( title.indexOf( 'synonyms' ) === 0 ) head.synonyms = idx;
      else if ( title.indexOf( 'skip' ) === 0 ) head.skip = idx;
      else if ( title.indexOf( 'lang:' ) === 0 ) {
        const args = col.split( ' | ' ).map( val => val.trim() );

        if ( args.length > 1 ) {
          if ( !head.translations ) head.translations = [];
          head.translations.push( { locale: args[1], index: idx } );
        }
      }
    } );
    if ( head.parent === null || head.child === null ) {
      return next( new Error( 'CSV is missing header or missing the required columns of Parent and Child.' ) );
    }
    rows = rows.splice( 1 );
    await processRows( head, rows );
  } catch ( err ) {
    return next( err );
  }
  getAllDocuments( model )( req, res, next );
};

const overrides = {
  findDocByTerm: findDocByTerm( taxModel ),
  translateTermById: translateTermById( taxModel ),
  bulkImport: bulkImport( taxModel ),
};

// taxonomy/controller
export default generateControllers( taxModel, overrides );
