import languageSchema from '../../../api/modules/schema/language';

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    site: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    desc: { type: 'string' },
    copyright: { type: 'string' },
    visibility: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    created: { type: 'string' },
    owner: { type: 'string' },
    language: languageSchema,
    supportFiles: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          visibility: { type: 'string' },
          editable: { type: 'boolean' },
          filename: { type: 'string' },
          url: { type: 'string' },
          language: languageSchema
        }
      }
    },
    images: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          visibility: { type: 'string' },
          filename: { type: 'string' },
          filetype: { type: 'string' },
          filesize: { type: 'number' },
          alt: { type: 'string' },
          url: { type: 'string' },
          height: { type: 'number' },
          width: { type: 'number' },
          language: languageSchema
        },
        style: { type: 'string' },
        social: {
          type: 'array',
          default: [],
          items: { type: 'string' }
        }
      }
    },
    categories: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    },
    tags: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    }
  },
  required: ['id', 'site']
};

export default schema;
