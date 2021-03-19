import languageSchema from './language';
import thumbnailSchema from './thumbnail';

const postSchema = {
  title: 'Post',
  type: 'object',
  properties: {
    post_id: { type: 'integer' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    author: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    },
    link: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    content: { type: 'string' },
    excerpt: { type: 'string' },
    thumbnail: thumbnailSchema,
    language: languageSchema,
    languages: {
      type: 'array',
      'default': [],
      items: {
        type: 'object',
        properties: {
          post_id: { type: 'integer' },
          language: languageSchema,
        },
      },
    },
    tags: {
      type: 'array',
      'default': [],
      items: { type: 'string' },
    },
    categories: {
      type: 'array',
      'default': [],
      items: { type: 'string' },
    },
    site_taxonomies: {
      type: 'object',
      'default': {},
      patternProperties: {
        '.*': {
          type: 'array',
          'default': [],
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    },
  },
};

export default postSchema;
