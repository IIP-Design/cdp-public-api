const thumbnailSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    alt: { type: 'string' },
    caption: { type: 'string' },
    longdesc: { type: 'string' },
    visibility: {
      type: 'string',
      default: 'PUBLIC'
    },
    sizes: {
      type: 'object',
      properties: {
        small: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            orientation: { type: 'string' }
          }
        },
        medium: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            orientation: { type: 'string' }
          }
        },
        large: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            orientation: { type: 'string' }
          }
        },
        full: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            orientation: { type: 'string' }
          }
        }
      }
    }
  }
};

export default thumbnailSchema;
