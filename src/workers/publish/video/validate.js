import Ajv from 'ajv';
import videoSchema from '../../../api/modules/schema/video';

// TODO -  use shared validator

export const compileValidationErrors = errors => `Validation errors: [${errors.map( error => `${error.dataPath || error.keyword || 'root'}] ${error.message}` )}`;

const compileSchema = ( useDefaults ) => {
  // 'useDefaults' adds a default value during validation if it is listed
  // 'removeAdditional' removes any properties during validation that are not in the schema
  // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
  const ajv = new Ajv( { useDefaults, removeAdditional: 'all', coerceTypes: true } );
  return ajv.compile( videoSchema );
};

const validate = ( body, useDefaults = true ) => {
  const validateSchema = compileSchema( useDefaults );
  const valid = validateSchema( body );
  return {
    valid,
    errors: validateSchema.errors
  };
};

export default validate;
