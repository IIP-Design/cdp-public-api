import Taxonomy from '../../api/resources/taxonomy/model';
import parser from '../../api/modules/elastic/parser';

const taxonomy = new Taxonomy();

/**
 * Parse taxonomy term find result using the provided locale.
 * Returns an object with the doc ID and translated term name based on the provided locale
 * or null if not found.
 * @param promise
 * @param locale
 */
export const parseTermWithLocale = ( promise, locale = 'en-us' ) => promise
  .then( parser.parseFindResult() )
  .catch( () => [] )
  .then( ( [term] ) => {
    if ( term && term.language && locale in term.language ) {
      return {
        id: term._id,
        name: term.language[locale],
      };
    }

    return null;
  } )
  .catch( () => null );

/**
 * Find a taxonomy term based on language based name string.
 * @param termName
 * @param locale
 * @returns {Promise}
 */
export const findCategoryTerm = ( termName, locale = 'en-us' ) => parseTermWithLocale(
  taxonomy.findDocByTerm( termName, locale ),
  locale,
);

/**
 * Find a taxonomy term via synonym matching and language name match
 * @param tag
 * @param locale
 * @returns {Promise}
 */
export const findTagTerm = ( tag, locale = 'en-us' ) => parseTermWithLocale(
  taxonomy.findDocsBySynonymOrName( tag ),
  locale,
);

/**
 * Convert an array of category name strings into objects containing the ES doc ID and the
 * translated name of the taxonomy term based ont he provided language.
 * @param termNames
 * @param language
 * @returns []
 */
export const convertCategories = async ( termNames, language ) => {
  const promises = termNames.map( termName => findCategoryTerm( termName, language.locale ) );
  const terms = await Promise.all( promises )
    .then( results => results.filter( result => result ) );

  return terms;
};

/**
 * Attempt to retrieve taxonomy terms from tags based on
 * synonym mathcing & language name match
 * @param tags
 * @param language
 * @returns []
 */
export const convertTags = async ( tags, language ) => {
  const promises = tags.map( termName => findTagTerm( termName, language.locale ) );
  const terms = await Promise.all( promises )
    .then( results => results.filter( result => result ) );

  return terms;
};

/**
 * Convert and consolidate the categories of a project unit into the apporpriate ES terms.
 * @param unit
 * @returns {unit}
 */
export const convertUnitTaxonomy = async unit => {
  const unitData = { ...unit };

  unitData.categories = await convertCategories( unitData.categories, unit.language );
  unitData.tags = await convertCategories( unitData.tags, unit.language );

  return unitData;
};

/**
 * Convert the taxonomies of each unit in the project returning a new updated project data object.
 * @param project
 * @returns {project}
 */
export const convertProjectTaxonomies = async project => {
  const unitPromises = project.unit.map( convertUnitTaxonomy );
  const unit = await Promise.all( unitPromises ).catch( err => {
    console.error( err );

    return [];
  } );

  return {
    ...project,
    unit,
  };
};
