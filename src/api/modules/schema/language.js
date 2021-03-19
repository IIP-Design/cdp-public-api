const schema = {
  type: 'object',
  properties: {
    language_code: { type: 'string' },
    locale: { type: 'string' },
    text_direction: {
      type: 'string',
      'default': 'ltr',
    },
    display_name: { type: 'string' },
    native_name: { type: 'string' },
  },
};

export default schema;
