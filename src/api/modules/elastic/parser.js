/*
  Parser is responsible for formatting the raw ElasticSearch data
  in an easier to manage format
 */

// Need to determine is the result prop should be sent back
const parser = {
  /**
   * Elastic 7.9 changes the Elastic total property on the 'hits' props
   * from a number to an object with 'value' & 'eq' props
   * @param {Object} response elasticsearch de-structured response object
   * @returns result total
   */
  getElasticHitTotal( { hits } ) {
    return ( typeof hits.total === 'object' )
      ? hits.total.value
      : hits.total;
  },

  parseUniqueDocExists() {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.hits ) {
        const total = this.getElasticHitTotal( result );

        if ( !total ) {
          resolve( null );

          return;
        }
        if ( total === 1 ) {
          const hit = result.hits.hits[0];

          resolve( { _id: hit._id, ...hit._source } );

          return;
        }
        reject( new Error( `Multiple results exist. Results:\r\n${JSON.stringify( result.hits, null, 2 )}` ) );
      } else {
        resolve( null );
      }
    } );
  },

  parseFindResult() {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.hits && this.getElasticHitTotal( result ) > 0 ) {
        const hits = result.hits.hits.map( hit => ( { _id: hit._id, ...hit._source } ) );

        resolve( hits );

        return;
      }
      reject( new Error( 'Not found.' ) );
    } );
  },

  parseGetResult( id ) {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.found ) {
        resolve( { _id: result._id, ...result._source } );

        return;
      }
      reject( id );
    } );
  },

  parseCreateResult( doc ) {
    return result => ( { _id: result._id, ...doc } );
  },

  parseUpdateResult( id, doc ) {
    return result => new Promise( ( resolve, reject ) => {
      if ( result._id ) {
        resolve( { _id: result._id, ...doc } );

        return;
      }
      reject( id );
    } );
  },

  parseDeleteResult( id ) {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.found ) {
        resolve( { id } );

        return;
      }
      reject( id );
    } );
  },

  parseAllResult( result ) {
    return new Promise( resolve => {
      if ( result.hits && this.getElasticHitTotal( result ) > 0 ) {
        const terms = result.hits.hits.reduce( ( acc, val ) => {
          acc.push( { _id: val._id, ...val._source } );

          return acc;
        }, [] );

        resolve( terms );
      }
      resolve( {} );
    } );
  },
};

export default parser;
