import documentSchema from '../document/schema';
import languageSchema from '../../../api/modules/schema/language';

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    site: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    desc: { type: 'string' },
    visibility: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    language: languageSchema,
    documents: {
      type: 'array',
      default: [],
      items: {
        documentSchema
      }
    }
  },
  required: ['id', 'site']
};

export default schema;
