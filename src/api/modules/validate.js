/**
 *  Verify the state object is in the correct state before going into any logic
 *
 * @param {object} object
 * @param {object} state
 */
const baselineValidation = ( object, state ) => {
  if ( typeof object !== 'object' ) {
    throw new Error( '1st param must be an object' );
  }

  if ( typeof state === 'object' ) {
    if ( Object.keys( state ).length === 2 ) {
      const { hasOwnProperty } = Object.prototype;
      const options = !hasOwnProperty.call( state, 'options' );
      const error = !hasOwnProperty.call( state, 'error' );

      if ( options && error ) {
        throw new Error( '2nd param object must have options and error key/pair' );
      }
    } else {
      throw new Error( '2nd param must only contain two key/pairs' );
    }
  } else {
    throw new Error( '2nd param must be an object' );
  }

  const data = { ...state };

  return data;
};

export const string = ( object, state ) => {
  const data = baselineValidation( object, state );

  Object.keys( object ).forEach( key => {
    const value = object[key];

    if ( !value ) {
      return;
    }

    if ( typeof value === 'string' ) {
      data.options[key] = value;
    } else {
      data.error[key] = 'Value must be a string';
    }
  } );

  return data;
};

export const array = ( object, state ) => {
  const data = baselineValidation( object, state );

  Object.keys( object ).forEach( key => {
    const value = object[key];

    if ( !value ) {
      return;
    }

    if ( value instanceof Array ) {
      // Not allowed to give empty array
      if ( value.length === 0 ) {
        data.error[key] = 'Value must be String or String[]';
      }
      // should an elase clause be here to disallow empty arrays as prop values?
      // Every value in the array must be a string
      const isArrayString = value.every( item => typeof item === 'string' );

      if ( isArrayString ) {
        data.options[key] = value;
      }
    } else {
      data.error[key] = 'Value must be a String[]';
    }
  } );

  return data;
};

/**
 * Verify params: query, include, exclude, type, index and sort are strings. If an array passed in,
 * all array values are strings
 * @param {object} object
 * @param {object} state
 */
export const stringOrStringArray = ( object, state ) => {
  const data = baselineValidation( object, state );

  Object.keys( object ).forEach( key => {
    const value = object[key];

    // return quickly if value is undefined
    if ( !value ) {
      return;
    }

    if ( typeof value === 'string' ) {
      data.options[key] = value;
    } else if ( value instanceof Array ) {
      // Not allowed to give empty array
      if ( value.length === 0 ) {
        data.error[key] = 'Value must be String or String[]';
      }
      // should an elase clause be here to disallow empty arrays as prop values?
      // Every value in the array must be a string
      const isArrayString = value.every( item => typeof item === 'string' );

      if ( isArrayString ) {
        data.options[key] = value;
      }
    } else {
      data.error[key] = 'Value must be String or String[]';
    }
  } );

  return data;
};

/**
 * Validate that body.body prop is JSON or a JSON serializable object
 * @param {object} object
 * @param {object} state
 */
export const jsonString = ( object, state ) => {
  const data = baselineValidation( object, state );

  Object.keys( object ).forEach( key => {
    const value = object[key];

    if ( !value ) {
      return;
    }

    try {
      data.options[key] = JSON.parse( value );
    } catch ( e ) {
      if ( typeof value !== 'object'
        // error if not a proper object
        && Object.prototype.toString.call( value ) !== '[object Object]' ) {
        data.error[key] = 'Value must be valid JSON string or Object';
      } else {
        data.options[key] = value;
      }
    }
  } );

  return data;
};

/**
 * Validate that from and size props are of number type
 * @param {object} object
 * @param {object} state
 */
export const number = ( object, state ) => {
  const data = baselineValidation( object, state );

  Object.keys( object ).forEach( key => {
    const value = object[key];

    if ( !value ) {
      return;
    }

    if ( typeof value === 'number' ) {
      data.options[key] = value;
    } else {
      data.error[key] = 'Value must be a number';
    }
  } );

  return data;
};
