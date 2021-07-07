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
    initialPublished: { type: 'string' },
    modified: { type: 'string' },
    created: { type: 'string' },
    owner: { type: 'string' },
    policy: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        theme: { type: 'string' },
      },
    },
    content: {
      type: 'object',
      properties: {
        rawText: { type: 'string' },
        html: { type: 'string' },
        markdown: { type: 'string' },
      },
    },
    language: languageSchema,
    supportFiles: {
      type: 'array',
      'default': [],
      items: {
        type: 'object',
        properties: {
          visibility: { type: 'string' },
          editable: { type: 'boolean' },
          filename: { type: 'string' },
          url: { type: 'string' },
          language: languageSchema,
        },
      },
    },
    categories: {
      type: 'array',
      'default': [],
      items: { type: 'string' },
    },
    tags: {
      type: 'array',
      'default': [],
      items: { type: 'string' },
    },
  },
  required: ['id', 'site'],
};

export default schema;
