import Ajv from 'ajv';

export const compileValidationErrors = errors => `Validation errors: [${errors.map(
  error => `${error.dataPath || error.keyword || 'root'}] ${error.message}`
)}`;


const compileSchema = ( schema, useDefaults ) => {
  // 'useDefaults' adds a default value during validation if it is listed
  // 'removeAdditional' removes any properties during validation that are not in the schema
  // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
  const ajv = new Ajv( { useDefaults, removeAdditional: 'all', coerceTypes: true } );
  return ajv.compile( schema );
};

const validate = ( body, schema, useDefaults = true ) => {
  const validateSchema = compileSchema( schema, useDefaults );
  const valid = validateSchema( body );
  return {
    valid,
    errors: validateSchema.errors
  };
};


/**
 * Validate the incoming data against expected schema.
 */
export const validateSchema = ( data, schema ) => {
  const result = validate( data, schema );
  if ( !result.valid ) {
    throw compileValidationErrors( result.errors );
  }
  return true;
};
