import languageSchema from './language';
import thumbnailSchema from './thumbnail';

const videoSchema = {
  title: 'Video',
  type: 'object',
  properties: {
    post_id: { type: 'string' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    author: { type: 'string' },
    duration: { type: 'number' },
    thumbnail: thumbnailSchema,
    categories: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    },
    site_taxonomies: {
      type: 'object',
      default: {},
      patternProperties: {
        '.*': {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            },
            required: ['name']
          }
        }
      }
    },
    unit: {
      type: 'array',
      default: [{ source: [] }],
      items: {
        type: 'object',
        properties: {
          language: languageSchema,
          title: { type: 'string' },
          desc: { type: 'string' },
          categories: {
            type: 'array',
            items: { type: 'string' }
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          thumbnail: thumbnailSchema,
          source: {
            type: 'array',
            default: [],
            items: {
              type: 'object',
              properties: {
                burnedInCaptions: { type: 'string' },
                downloadUrl: { type: 'string' },
                streamUrl: {
                  type: 'array',
                  default: [],
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      site: { type: 'string' },
                      link: { type: 'string' },
                      uid: { type: 'string' }
                    }
                  }
                },
                stream: {
                  type: 'object',
                  default: {
                    url: '',
                    uid: ''
                  },
                  properties: {
                    site: { type: 'string' },
                    url: { type: 'string' },
                    uid: { type: 'string' },
                    link: { type: 'string' },
                    thumbnail: { type: 'string' }
                  }
                },
                duration: {
                  type: 'string'
                },
                filetype: { type: 'string' },
                video_quality: { type: 'string' },
                visibility: {
                  type: 'string',
                  default: 'PUBLIC'
                },
                md5: { type: 'string' },
                size: {
                  type: ['object', 'null'],
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                    filesize: { type: 'number' },
                    bitrate: { type: 'number' }
                  }
                }
              }
            }
          },
          transcript: {
            type: 'object',
            properties: {
              srcUrl: { type: 'string' },
              visibility: {
                type: 'string',
                default: 'PUBLIC'
              },
              md5: { type: 'string' },
              text: { type: 'string' }
            }
          },
          srt: {
            type: 'object',
            properties: {
              srcUrl: { type: 'string' },
              visibility: {
                type: 'string',
                default: 'PUBLIC'
              },
              md5: { type: 'string' }
            }
          }
        }
      }
    },
    supportFiles: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          language: languageSchema,
          supportFileType: { type: 'string' },
          visibility: {
            type: 'string',
            default: 'PUBLIC'
          },
          srcUrl: { type: 'string' },
          text: { type: 'string' }
        }
      }
    }
  },
  required: ['post_id', 'site']
};

export default videoSchema;
