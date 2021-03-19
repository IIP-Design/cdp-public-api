/*
  Parser is responsible for formatting the raw ElasticSearch data
  in an easier to manage format
 */

// Need to determin is the result prop should be sent back
export default {
  parseUniqueDocExists() {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.hits ) {
        const { total } = result.hits;

        if ( !total ) {
          return resolve( null );
        }
        if ( total === 1 ) {
          const hit = result.hits.hits[0];

          return resolve( { _id: hit._id, ...hit._source } );
        }
        reject( new Error( `Multiple results exist. Results:\r\n${JSON.stringify( result.hits, null, 2 )}` ) );
      } else {
        resolve( null );
      }
    } );
  },

  parseFindResult() {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.hits && result.hits.total > 0 ) {
        const hits = result.hits.hits.map( hit => ( { _id: hit._id, ...hit._source } ) );

        return resolve( hits );
      }
      reject( new Error( 'Not found.' ) );
    } );
  },

  parseGetResult( id ) {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.found ) {
        return resolve( { _id: result._id, ...result._source } );
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
        return resolve( { _id: result._id, ...doc } );
      }
      reject( id );
    } );
  },

  parseDeleteResult( id ) {
    return result => new Promise( ( resolve, reject ) => {
      if ( result.found ) {
        return resolve( { id } );
      }
      reject( id );
    } );
  },

  parseAllResult( result ) {
    return new Promise( resolve => {
      if ( result.hits && result.hits.total > 0 ) {
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
