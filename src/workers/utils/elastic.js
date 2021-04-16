/**
 * Elastic 7.9 changes the Elastic total property on the 'hits' props
 * from a number to an object with 'value' & 'eq' props
 * @param {Object} response elasticsearch de-structured response object
 * @returns result total
 */
export const getElasticHitTotal = ( { hits } ) => ( ( typeof hits.total === 'object' )
  ? hits.total.value
  : hits.total );
