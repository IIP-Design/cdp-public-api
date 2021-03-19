import client from '../../services/elasticsearch';
import parser from './elastic/parser';

/**
 * Content Model abstraction ensures that the required methods
 * are implemented.
 */
class AbstractModel {
  constructor( index, type ) {
    this.index = index;
    this.type = type;
    this.client = client;
    this.requestId = -1;
  }

  // TODO: add correct signature, i.e. json param
  // need to disable eslint rule for this method
  // eslint-disable-next-line class-methods-use-this
  getAssets() {
    throw new Error( 'Method not implemented: getAssets' );
  }

  // TODO: add correct signature, i.e. asset param
  // need to disable eslint rule for this method
  // eslint-disable-next-line class-methods-use-this
  putAsset() {
    throw new Error( 'Method not implemented: putAsset' );
  }

  // TODO: add correct signature, i.e. asset param
  // need to disable eslint rule for this method
  // eslint-disable-next-line class-methods-use-this
  getUnits() {
    throw new Error( 'Method not implemented: getUnits' );
  }

  // need to disable eslint rule for this method
  // eslint-disable-next-line class-methods-use-this
  constructTree() {
    throw new Error( 'Method not implemented: constructTree' );
  }

  /**
   * Set instance body parameter with argument json.
   * Mainly needed for testing.
   *
   * @param json
   */
  setBody( json ) {
    this.body = json;
  }

  /**
   * Returns the request ID set from the original request by one of the prepare methods.
   *
   * @returns string
   */
  getRequestId() {
    return this.requestId;
  }

  // need to disable eslint rule for this method
  // eslint-disable-next-line class-methods-use-this
  getTitle() {
    throw new Error( 'Method not implemented: getTitle' );
  }

  putAsyncTransfer( transfer ) {
    this.asyncTransfers.push( transfer );
  }

  /**
   * Retrieves a particular language unit at the provided index.
   *
   * @param index
   * @returns {*}
   */
  getUnit( index ) {
    if ( !this.body ) return {};
    const units = this.getUnits( this.body );

    if ( units.length > index ) return units[index];

    return {};
  }

  async prepareDocumentForPatch( req ) {
    const docFromES = await this.findDocumentByQuery( req.body ).then( parser.parseUniqueDocExists() ); // eslint-disable-line max-len

    if ( docFromES ) {
      this.esAssets = this.getAssets( docFromES );
      req.esDoc = docFromES;
      req.body = docFromES;
    }

    this.reqAssets = this.getAssets( req.body );

    this.body = req.body;
    this.requestId = req.requestId;

    return this.reqAssets;
  }

  async prepareDocumentForUpdate( req ) {
    if ( req.esDoc ) {
      this.esAssets = this.getAssets( req.esDoc );
    } else {
      const docFromES = await this.findDocumentByQuery( req.body ).then( parser.parseUniqueDocExists() ); // eslint-disable-line max-len

      if ( docFromES ) {
        this.esAssets = this.getAssets( docFromES );
        req.esDoc = docFromES;
      }
    }

    this.reqAssets = this.getAssets( req.body );

    this.body = req.body;
    this.requestId = req.requestId;

    req.asyncTransfers = [];
    this.asyncTransfers = req.asyncTransfers;

    return this.reqAssets;
  }

  async prepareCategoriesForUpdate( req ) {
    this.body = req.body;
    // Obtain the category ID list if available
    const categoryIds
      = req.body.categories && req.body.categories.length > 0 ? req.body.categories.slice( 0 ) : [];

    // Remove the categories property so that we can replace it with translated version
    delete req.body.categories;
    // Set requestId for temp files (if needed in future)
    this.requestId = req.requestId;
    // Iterate the units and create a category translation array for each
    this.reqUnits = this.getUnits( req.body );
    this.reqUnits.forEach( u => {
      const unit = u;

      unit.categories = [];
      categoryIds.forEach( catId => {
        unit.categories.push( { id: catId, name: '' } );
      } );
    } );

    return this.reqUnits;
  }

  async prepareDocumentForDelete( req ) {
    this.esAssets = [];

    if ( req.esDoc ) {
      this.body = req.esDoc;
      this.esAssets = this.getAssets( this.body );
    }

    return this.esAssets;
  }

  updateIfNeeded( asset, md5 ) {
    if ( !this.esAssets ) return true;

    const esAsset = this.esAssets.find( ass => ass.md5 === md5 );

    if ( !esAsset ) return true;

    this.putAsset( {
      ...asset,
      downloadUrl: esAsset.downloadUrl,
      stream: esAsset.stream || null,
      size: esAsset.size || asset.size || null,
      md5: esAsset.md5,
    } );

    return false;
  }

  getFilesToRemove() {
    const filesToRemove = [];

    if ( !this.esAssets ) return filesToRemove;

    this.reqAssets = this.getAssets( this.body );
    this.esAssets.forEach( ass => {
      if ( !this.reqAssets.find( val => val.md5 === ass.md5 ) ) {
        if ( ass.downloadUrl || ass.stream ) {
          filesToRemove.push( { url: ass.downloadUrl, stream: ass.stream } );
        } // eslint-disable-line max-len
      }
    } );

    return filesToRemove;
  }

  async indexDocument( doc ) {
    const body = doc;

    delete body._id;
    console.log( 'indexing...', JSON.stringify( body, null, 2 ) );
    const result = await this.client.index( {
      index: this.index,
      type: this.type,
      body,
    } );

    return result;
  }

  async updateDocument( id, doc ) {
    const body = doc;

    delete body._id;
    console.log( 'updating...', JSON.stringify( body, null, 2 ) );
    const result = await this.client.update( {
      index: this.index,
      type: this.type,
      id,
      body: {
        doc: body,
      },
    } );

    return result;
  }

  async deleteDocument( id ) {
    // If there is no ID then we don't need to do anything.
    // Whatever document they tried to delete doesn't exist
    // and therefore is technically already 'deleted'
    if ( !id ) return {};
    const result = await this.client.delete( {
      index: this.index,
      type: this.type,
      id,
    } );

    return result;
  }

  async findDocumentById( id ) {
    const result = await this.client.get( {
      index: this.index,
      type: this.type,
      id,
    } );

    return result;
  }

  async findDocumentByQuery( query ) {
    const result = await client
      .search( {
        index: this.index,
        type: this.type,
        q: `site:${query.site} AND post_id:${query.post_id}`,
      } )
      .catch( err => err );

    return result;
  }

  /**
   * Retreive all available documents sorted by the provided argument.
   * Sort defaults to the document UID.
   * Append '.keyword' if the sort field is text based.
   * @param sort
   * @returns {Promise}
   */
  async getSortedDocuments( sort = '_uid' ) {
    const size = 100;
    let count = 0;
    const result = await client
      .search( {
        index: this.index,
        type: this.type,
        sort,
        size,
      } )
      .catch( err => err );

    // Since we can only fetch a max of 1000 docs at once
    // we have to collect them a chunk at a time.
    // NOTE: This may lose accuracy since we only have offset
    // available and not the search_from property.
    if ( result.hits && result.hits.total > size ) {
      count += result.hits.hits.length;
      const collectHits = async () => {
        const next = await client
          .search( {
            index: this.index,
            type: this.type,
            size,
            sort,
            from: count,
          } )
          .catch( err => err );

        if ( next.hits.hits.length > 0 ) {
          count += next.hits.hits.length;
          result.hits.hits = result.hits.hits.concat( next.hits.hits );
          if ( count < next.hits.total ) {
            await collectHits();
          }
        }
      };

      await collectHits();
    }

    return result;
  }

  /**
   * Retreive all documents sorted by UID.
   * @returns {Promise}
   */
  getAllDocuments() {
    return this.getSortedDocuments();
  }
}

export default AbstractModel;
