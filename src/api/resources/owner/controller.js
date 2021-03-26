import OwnerModel from './model';
import { generateControllers, getAllDocuments } from '../../modules/controllers/generateList';
import controllers from '../../modules/elastic/controller';
import parse from 'csv-parse/lib/sync';
import parser from '../../modules/elastic/parser';

const ownerModel = new OwnerModel();

const indexDocument = model => async ( req, res, next ) => {
  const found = await controllers.findDocByTerm( model, req.body.name );

  if ( found ) {
    return next( new Error( 'Owner already exists.' ) );
  }
  const created = await model.indexDocument( req.body )
    .then( parser.parseCreateResult( req.body ) );

  res.json( created );
  next();
};

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
  const createOwner = async owner => {
    let foundOnwer = await controllers.findDocByTerm( model, owner.name );

    // If term not found, then create one
    if ( !foundOnwer ) {
      foundOnwer = await model.indexDocument( owner ).then( parser.parseCreateResult( owner ) ); // eslint-disable-line max-len
    }

    return foundOnwer;
  };

  /**
   * Iterate the rows using reduce creating terms as needed. Store terms in an object
   * to check before creating new terms. Reuse term if found and update.
   * Property identify each column using the head object which contains indices
   * as the values.
   *
   * @param rows
   * @returns {Promise<*>}
   */
  const processRows = async rows => {
    // In order keep this synchronous, we have to get really tricky
    // with reduce and promises. Essentially, we return a promise on each reduce
    // iteration which we then extract content from using .then
    // The return from the result is a promise containing the accumulated
    // terms array which is accessed thanks to await
    const seen = await rows.reduce(
      async ( ownersP, cols ) => ownersP.then( async owners => {
        console.log( 'Processing:', JSON.stringify( cols, null, 2 ) );
        const created = createOwner( { name: cols[0] } );

        if ( created ) {
          return { ...owners, [cols[0].toLowerCase()]: created };
        }

        return owners;
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
    rows = rows.splice( 1 );
    await processRows( rows );
  } catch ( err ) {
    return next( err );
  }
  await getAllDocuments( model )( req, res, next );
};

const overrides = {
  indexDocument: indexDocument( ownerModel ),
  bulkImport: bulkImport( ownerModel ),
};

export default generateControllers( ownerModel, overrides );
