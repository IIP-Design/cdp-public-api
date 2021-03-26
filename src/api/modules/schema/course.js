import languageSchema from './language';
import thumbnailSchema from './thumbnail';

const courseSchema = {
  title: 'Course',
  type: 'object',
  properties: {
    post_id: { type: 'integer' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    excerpt: { type: 'string' },
    branded: { type: 'boolean' },
    author: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    },
    thumbnail: thumbnailSchema,
    language: languageSchema,
    lessons: {
      type: 'array',
      'default': [],
      items: {
        type: 'object',
        properties: {
          post_id: { type: 'integer' },
          title: { type: 'string' },
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

export default courseSchema;
