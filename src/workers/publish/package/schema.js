import documentSchema from '../document/schema';

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    site: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
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
