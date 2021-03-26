import AbstractModel from '../../modules/abstractModel';

class Owner extends AbstractModel {
  constructor( index = 'owners', type = 'owner' ) {
    super( index, type );
  }

  /**
   * Override getAllDocuments to return all owners sorted by name.
   */
  getAllDocuments() {
    return this.getSortedDocuments( 'name.keyword' );
  }

  /**
   * Searches Elasticsearch for an owner that has an exact match for the owner provided.
   *
   * @param name
   * @returns {Promise<*>}
   */
  async findDocByTerm( name ) {
    const result = await this.client
      .search( {
        index: this.index,
        type: this.type,
        body: {
          query: {
            term: {
              'name.keyword': name,
            },
          },
        },
      } )
      .catch( err => err );

    return result;
  }
}

export default Owner;
