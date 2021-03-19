import languageSchema from '../../../api/modules/schema/language';

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    site: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    language: languageSchema,
    filetype: { type: 'string' },
    filename: { type: 'string' },
    content: {
      type: 'object',
      properties: {
        rawText: { type: 'string' },
        html: { type: 'string' },
        markdown: { type: 'string' },
      },
    },
    excerpt: { type: 'string' },
    url: { type: 'string' },
    use: { type: 'string' },
    bureaus: {
      type: 'array',
      'default': [],
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          abbr: { type: 'string' },
        },
      },
    },
    categories: {
      type: 'array',
      items: { type: 'string' },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['id', 'site'],
};

export default schema;
