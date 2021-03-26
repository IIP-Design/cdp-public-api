import AbstractModel from '../../modules/abstractModel';

class Language extends AbstractModel {
  constructor( index = 'languages', type = 'language' ) {
    super( index, type );
  }

  /**
   * Override getAllDocuments to return all languages sorted by display_name.
   */
  getAllDocuments() {
    return this.getSortedDocuments( 'display_name.keyword' );
  }

  /**
   * Searches Elasticsearch for a language that has an exact match for the locale provided.
   *
   * @param locale
   * @returns {Promise<*>}
   */
  async findDocByTerm( locale ) {
    const result = await this.client
      .search( {
        index: this.index,
        type: this.type,
        body: {
          query: {
            term: {
              'locale.keyword': locale,
            },
          },
        },
      } )
      .catch( err => err );

    return result;
  }
}

export default Language;
