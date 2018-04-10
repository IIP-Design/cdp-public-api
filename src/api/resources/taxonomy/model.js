import AbstractModel from '../../modules/abstractModel';
import parser from '../../modules/elastic/parser';

class Taxonomy extends AbstractModel {
  constructor( index = 'taxonomy', type = 'term' ) {
    super( index, type );
  }

  /**
   * Construct a taxonomy tree from a flat array of terms where each term has a parent
   * and an array of child terms (children).
   *
   * @param terms
   * @param root
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  constructTree( terms, root = null ) {
    const tree = [];
    let ret = tree;
    if ( !terms || terms instanceof Array !== true ) return ret;
    terms.sort( ( a, b ) => a.language.en.localeCompare( b.language.en ) );
    terms.forEach( ( term ) => {
      // eslint doesn't allow us to add the children property directly
      // so we have to use a temp variable
      const temp = term;
      temp.children = [];
      if ( root ) {
        if ( root === term._id ) ret = term;
      } else if ( term.primary ) tree.push( term );
    } );
    terms.filter( term => !term.primary ).forEach( ( term ) => {
      const found = terms.find( val => term.parents.includes( val._id ) );
      if ( found ) found.children.push( term );
    } );
    return ret;
  }

  /**
   * Searches Elasticsearch for a term that has an exact match for the
   * name provided. It will default to language.en (english) unless a different
   * locale is provided.
   *
   * @param name
   * @param locale
   * @returns {Promise<*>}
   */
  async findDocByTerm( name, locale = 'en' ) {
    const result = await this.client
      .search( {
        index: this.index,
        type: this.type,
        body: {
          query: {
            term: {
              [`language.${locale}.keyword`]: name.toLowerCase()
            }
          }
        }
      } )
      .catch( err => err );
    return result;
  }

  /**
   * Searches Elasticsearch for a terms that have a loose match in the
   * synonymMapping property.
   *
   * @param name
   * @returns {Promise<*>}
   */
  async findDocsBySynonym( name ) {
    const result = await this.client
      .search( {
        index: this.index,
        type: this.type,
        body: {
          query: {
            match: {
              synonymMapping: {
                query: name
              }
            }
          }
        }
      } )
      .catch( err => err );
    return result;
  }

  async translateTermById( id, locale = 'en' ) {
    const result = await this.findDocumentById( id ).then( parser.parseGetResult( id ) );
    if ( result.language[locale] ) return result.language[locale];
    return result.language.en;
  }
}

export default Taxonomy;
