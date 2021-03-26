import TaxonomyModel from '../api/resources/taxonomy/model';
import controllers from '../api/modules/elastic/controller';
import parser from '../api/modules/elastic/parser';

/**
 * Adds a categories array property to each locale unit by translating
 * based on the category IDs in the category array on the body root.
 * The function has several layers of promise nesting so that each unit
 * is iterated over and then each category within that unit allowing each
 * to be translated at the same time.
 *
 * @param Model
 * @returns {function(*=, *, *)}
 */
export const translateCategories = Model => async ( req, res, next ) => {
  console.log( 'TRANSLATING CATEGORIES INIT', req.requestId );
  const model = new Model();

  const taxonomy = new TaxonomyModel();

  // Nested 3
  const translateCategory = async ( unit, id ) => {
    const name = await taxonomy.translateTermById( id, unit.language.locale );

    return { id, name };
  };

  // Nested 2
  const translateUnit = unit => new Promise( resolve => {
    const catPromises = [];

    unit.categories.forEach( cat => {
      catPromises.push( translateCategory( unit, cat.id ) );
    } );
    Promise.all( catPromises ).then( results => {
      results.forEach( result => {
        if ( result.name ) {
          const cat = unit.categories.find( val => val.id === result.id );

          if ( cat ) cat.name = result.name;
        }
      } );
      resolve();
    } );
  } );

  const promises = [];
  const units = await model.prepareCategoriesForUpdate( req );

  // Nested 1 (root)
  units.forEach( unit => {
    promises.push( translateUnit( unit ) );
  } );
  Promise.all( promises )
    .then( () => {
      next();
    } )
    .catch( err => {
      console.error( err );
      next( err );
    } );
};

/**
 * Searches for terms that match the provided tags and categories in the provided locale.
 * If a term is matched, the term ID is added to the categories property.
 * If a category is not matched, the category is added to the tags property.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
export const tagCategories = async ( req, res, next ) => {
  const model = new TaxonomyModel();
  const body = req.body; // eslint-disable-line prefer-destructuring

  if ( 'site_taxonomies' in body !== true ) return next();
  const tags = [];
  const terms = body.categories || [];

  if ( 'tags' in body.site_taxonomies ) {
    await body.site_taxonomies.tags.reduce( async ( accumP, tagData ) => {
      const tag = tagData.name.toLowerCase();

      return accumP.then( async () => {
        await controllers
          .findDocByTerm( model, tag )
          .then( result => {
            if ( !terms.includes( result._id ) ) {
              terms.push( result._id );
            }
          } )
          .catch( () => {} );

        return {};
      } );
    }, Promise.resolve( {} ) );
  }

  if ( 'categories' in body.site_taxonomies ) {
    await body.site_taxonomies.categories.reduce(
      async ( accumP, catData ) => accumP.then( async () => {
        await controllers
          .findDocByTerm( model, catData.name )
          .then( result => {
            const tag = catData.name.toLowerCase();

            if ( !result ) {
              if ( !tags.includes( tag ) ) tags.push( tag );
            } else if ( !terms.includes( result._id ) ) {
              terms.push( result._id );
            }
          } )
          .catch( () => {
            const tag = catData.name.toLowerCase();

            if ( !tags.includes( tag ) ) tags.push( tag );
          } );

        return {};
      } ),
      Promise.resolve( {} ),
    );
  }
  body.tags = tags;
  body.categories = terms;
  next();
};

/**
 * Searches for taxonomy terms that have a match for a tag in the synonymMapping
 * property. If a match is found, the term ID is added to the
 * categories property. If it is a category, the term is not matched, AND the category
 * is not in the root tags property then it is added to the tags property.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
export const synonymCategories = async ( req, res, next ) => {
  const model = new TaxonomyModel();
  const body = req.body; // eslint-disable-line prefer-destructuring

  if ( 'site_taxonomies' in body !== true ) return next();
  const tags = [];
  const terms = body.categories || [];

  if ( 'tags' in body.site_taxonomies ) {
    await body.site_taxonomies.tags.reduce( async ( accumP, tagData ) => {
      const tag = tagData.name.toLowerCase();

      return accumP.then( async () => {
        const results = await model
          .findDocsBySynonym( tag )
          .then( parser.parseFindResult() )
          .catch( () => {} );

        if ( results ) {
          const result = results[0];

          if ( !terms.includes( result._id ) ) {
            console.log( `matched ${tag} with ${result.language.en}` );
            terms.push( result._id );
          }
        }

        return {};
      } );
    }, Promise.resolve( {} ) );
  }
  if ( 'categories' in body.site_taxonomies ) {
    await body.site_taxonomies.categories.reduce( async ( accumP, catData ) => {
      const cat = catData.name.toLowerCase();

      return accumP.then( async () => {
        const results = await model
          .findDocsBySynonym( cat )
          .then( parser.parseFindResult() )
          .catch( () => {
            if ( !tags.includes( cat ) ) tags.push( cat );
          } );

        if ( results ) {
          const result = results[0];

          if ( !terms.includes( result._id ) ) {
            console.log( `matched ${cat} with ${result.language.en}` );
            terms.push( result._id );
          }
        }

        return {};
      } );
    }, Promise.resolve( {} ) );
  }
  body.tags = tags;
  body.categories = terms;
  next();
};
