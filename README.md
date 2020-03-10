# cdp-public-api

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Getting Started](#getting-started)
  - [Configuration](#configuration)
  - [Using Docker](#using-docker)
  - [Scripts](#scripts)
- [Search Route](#search-route)
  - [`/v1/search`](#v1search)
    - [Request](#request)
    - [Response](#response)
    - [Search Properties](#search-properties)
- [Resource Routes](#resource-routes)
  - [`/v1/video/{site}_{post_id}`](#v1videosite_post_id)
    - [Request](#request-1)
    - [Response](#response-1)
  - [`/v1/post/{site}_{post_id}`](#v1postsite_post_id)
    - [Request](#request-2)
    - [Response](#response-2)
  - [`/v1/course`](#v1course)
  - [`/v1/language`](#v1language)
    - [Request](#request-3)
    - [Response](#response-3)
  - [`/v1/language/bulk`](#v1languagebulk)
    - [Request](#request-4)
  - [`/v1/taxonomy`](#v1taxonomy)
    - [Request](#request-5)
    - [Response](#response-4)
  - [`/v1/taxonomy/bulk`](#v1taxonomybulk)
    - [Request](#request-6)
  - [`/v1/owner`](#v1owner)
    - [Request](#request-7)
    - [Response](#response-5)
  - [`/v1/owner/bulk`](#v1ownerbulk)
    - [Request](#request-8)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Getting Started

- `npm install`
- `npm run dev`
- `npm run dev:worker` (Run worker in a separate console window)

### Configuration

Add a `.env` file to the root of your project and set the following environment variables:

```text
NODE_ENV=development
PORT=8080
TMP_DIR=

ELASTICSEARCH_HOST=localhost:9200

INDEXING_DOMAIN=localhost

AWS_REGION=us-east-1
AWS_S3_AUTHORING_ACCESS_KEY_ID=
AWS_S3_AUTHORING_SECRET=
AWS_S3_PRODUCTION_ACCESS_KEY_ID=
AWS_S3_PRODUCTION_SECRET=
AWS_ELASTIC_ACCESS_KEY_ID=
AWS_ELASTIC_SECRET=
AWS_S3_AUTHORING_BUCKET=
AWS_S3_PRODUCTION_BUCKET=

CF_STREAM_ASYNC=true
CF_STREAM_EMAIL=
CF_STREAM_KEY=
CF_STREAM_ZONE=
CF_MAX_SIZE=1024

ES_APP_USER=
ES_APP_SECRET=

ALLOW_REGISTER=false
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=
VIMEO_CALLBACK=
VIMEO_TOKEN=

NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=
NEW_RELIC_LOG=stdout

ALOW_AUTH_REGISTER=false

OPENNET_IPS=<IP.Range1.Start>:<IP.Range1.End> <IP.Range2.Start>:<IP.Range2.End>
```

**Important**: If you are connecting to AWS Elasticsearch, set the environment field to `production`. By default, the environment is set to `development`.

Follows the [airbnb javascript style guide](https://github.com/airbnb/javascript).

### Using Docker

The Dockerfiles bring up a multi container network housing a Node server for the API and an Elastic server housing the ELK stack. To get started:

- Install Docker if it is not already installed. [Docker for Mac](https://www.docker.com/docker-mac) is the fastest and most reliable way to run Docker on a Mac
- Ensure that you have alloted at least 4.0 GB RAM to Docker as Elasticsearch requires that amount to run. This can be set by going to the 'Preferences' menu of the Docker dropdown and selecting the 'Advanced' tab
- Follow the confguration instructions above but set the `AWS_HOST` as follows `AWS_HOST=elk:9200`
- Run `docker-compose up`

### Elasticsearch

#### Indices and Aliases

The following indices and aliases need to be added to the local development environment:

| Index                 | Alias     |
| --------------------- | --------- |
| posts\_[YYYYMMDD]     | posts     |
| videos\_[YYYYMMDD]    | videos    |
| documents\_[YYYYMMDD] | documents |
| packages\_[YYYYMMDD]  | packages  |
| languages\_[YYYYMMDD] | languages |
| owners\_[YYYYMMDD]    | owners    |
| taxonomy\_[YYYYMMDD]  | taxonomy  |

**From Kibana:**

Create an index:
`PUT /[index_name]`

Create an alias:
`PUT /[index_name]/alias/[alias_name]`

#### Creating a JWT for POST Authorization

A JWT is required in order to execute the following POST requests. [Create](https://jwt.io/) the appropriate token with the values from the environment variables:

```text
ES_APP_USER=
ES_APP_SECRET=
```

`JWT_SUBJECT`'s value should reflect `user`'s value in the decoded JWT payload. `JWT_SECRET_KEY`'s value should reflect the secret.

Copy the generated token and include it in the headers when making POST requests. Your cURL request should look similar to the following:

```text
$ curl --location --request POST 'http://localhost:8080/v1/[index]/bulk' \
--header 'Content-Type: text/csv' \
--header 'Authorization: Bearer <TOKEN>' \
--form 'csv=@/<path>/<to>/<csv>/<file.csv>'
```

#### Seeding the Static Indices

The owners, languages and taxonomy indices are populated with static data. To seed the data into your local Elasticsearch instance, execute the following POST requests against your local cdp api server and pass the applicable .csv file in the body of the request:

http://localhost:8080/v1/language/bulk

http://localhost:8080/v1/taxonomy/bulk

http://localhost:8080/v1/owner/bulk

csv files are located in the /imports directory

### Scripts

- `npm run start:main`: Starts the web server normally
- `npm run start:worker`: Starts the worker normally
- `npm run start`: Starts both the web server and worker normally
- `npm run clear:build`: Removes the build directory.
- `npm run build:main`: Generates build folder/files for main.
- `npm run build:worker`: Generates build folder/files for worker.
- `npm run build`: Generates build folder/files for both app and worker.
- `npm run dev`: Re-starts the server and re-complies the `build` folder after every change.
- `npm run dev:worker`: Starts worker in development mode.
- `npm run test`: Runs `npm run test:unit`. [todo]
- `npm run test:unit`: Executes test cases. [todo]

## Search Route

### `/v1/search`

Search request to CDP [`AWS`|`localhost`].

#### Request

```http
POST /v1/search
Content-Type: application/json
{
  "body": "",
  "defaultField": "",
  "exclude": "",
  "from": "",
  "include": "*",
  "index": "",
  "query": "language.locale:en-us",
  "size": 5,
  "sort": "",
  "type": "post"
}
```

#### Response

```json
{
  "took": 11,
  "timed_out": false,
  "_shards": {
    "total": 41,
    "successful": 41,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 0.2876821,
    "hits": [
      {
        "_index": "posts",
        "_type": "post",
        "_id": "AWLZj5ZMln4rDxbHa5IA",
        "_score": 0.2876821,
        "_source": {
          "owner": "Content Delivery Platform",
          "comment_count": 0,
          "thumbnail": {
            "name": "Image Title",
            "alt": "Image Alt",
            "caption": "Image caption",
            "longdesc": "Image description",
            "sizes": {
              "small": {
                "orientation": "landscape",
                "width": 300,
                "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo-300x200.jpg",
                "height": 200
              },
              "large": {
                "orientation": "landscape",
                "width": 2160,
                "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo.jpg",
                "height": 1440
              },
              "medium": {
                "orientation": "landscape",
                "width": 768,
                "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo-768x512.jpg",
                "height": 512
              },
              "full": {
                "orientation": "landscape",
                "width": 2160,
                "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo.jpg",
                "height": 1440
              }
            }
          },
          "languages": [
            {
              "post_id": 27,
              "language": {
                "id": 1,
                "language_code": "es",
                "locale": "es-mx",
                "text_direction": "ltr",
                "display_name": "Spanish",
                "native_name": "Español"
              }
            }
          ],
          "author": {
            "name": "thebenstreit",
            "id": 1
          },
          "link": "http://cdp.local/2018/02/05/the-state-of-affairs/",
          "language": {
            "language_code": "en",
            "text_direction": "ltr",
            "_id": "AWKNa7G1dOZTaU7CiFIq",
            "display_name": "English",
            "locale": "en",
            "native_name": "English"
          },
          "published": "2018-02-05T22:22:44+00:00",
          "type": "post",
          "title": "The State of Affairs",
          "content": "<p>Is grave.</p>\n",
          "tags": ["another tag", "test", "category 2", "subcat 1", "another tag"],
          "site": "cdp.local",
          "post_id": 17,
          "modified": "2018-04-18T16:26:15+00:00",
          "categories": [
            {
              "name": "About America",
              "id": "AWKr-4EuPjd8uXvEbbw0"
            }
          ],
          "excerpt": "",
          "slug": "the-state-of-affairs"
        }
      }
    ]
  }
}
```

#### Search Properties

| Params  | Description                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| body    | `JSON string, Object{}` - An optional request body, as either JSON or a JSON serializable object.                                       |
| exlcude | `String, String[]` -  A list of fields to exclude from the returned \_source field                                                      |
| from    | `number` — Starting offset (default: 0)                                                                                                 |
| include | `String, String[]` - A list of fields to extract and return from the \_source field                                                     |
| index   | `String, String[]` - A comma-separated list of index names to search; use \_all or empty string to perform the operation on all indices |
| query   | `String, String[]` - A comma-separated list of specific routing values                                                                  |
| size    | `Number` - Number of hits to return (default: 10)                                                                                       |
| sort    | `String, String[]` - A comma-separated list of : pairs                                                                                  |
| type    | `String, String[]` - A comma-separated list of document types to search; leave empty to perform the operation on all types              |

## Resource Routes

### `/v1/video/{site}_{post_id}`

#### Request

```http
GET /v1/video/cdp.local_12
```

#### Response

```json
{
  "_id": "AWLZ4Ie_ln4rDxbHa5IC",
  "post_id": 12,
  "site": "cdp.local",
  "type": "video",
  "published": "2018-02-02T18:31:33+00:00",
  "modified": "2018-04-18T17:55:12+00:00",
  "owner": "IIP Publications",
  "author": "Coffee Lover",
  "duration": 240,
  "unit": [
    {
      "transcript": {
        "srcUrl": "https://cdp-video-tst.s3.amazonaws.com/cdp.local/video/12/6efd8a36f86774e6ca088923b77a1e29.txt",
        "text": "",
        "md5": "6efd8a36f86774e6ca088923b77a1e29"
      },
      "srt": {
        "srcUrl": "https://cdp-video-tst.s3.amazonaws.com/cdp.local/video/12/be0948bd9ed9e20a55df874d3c7d6f7b.srt",
        "md5": "be0948bd9ed9e20a55df874d3c7d6f7b"
      },
      "language": {
        "language_code": "en",
        "text_direction": "ltr",
        "display_name": "English",
        "locale": "en",
        "native_name": "English"
      },
      "source": [
        {
          "streamUrl": [
            {
              "site": "youtube",
              "url": "https://youtu.be/OTVE5iPMKLg"
            }
          ],
          "duration": null,
          "filetype": "mp4",
          "burnedInCaptions": "false",
          "size": {
            "width": "1920",
            "bitrate": "15346707",
            "filesize": "174902588",
            "height": "1080"
          },
          "stream": {},
          "downloadUrl": "https://cdp-video-tst.s3.amazonaws.com/cdp.local/video/12/fc6ce5972a59935b31515578acd37695.mp4",
          "md5": "fc6ce5972a59935b31515578acd37695"
        }
      ],
      "categories": [],
      "title": "Coffee is Great!",
      "desc": "I love coffee yes I do, I love coffee how bout you?"
    }
  ],
  "thumbnail": {
    "name": "Image Title",
    "alt": "Image Alt",
    "caption": "Image caption",
    "longdesc": "Image description",
    "sizes": {
      "small": {
        "orientation": "landscape",
        "width": "384",
        "url": "http://cdp.local/wp-content/uploads/2018/02/picard.gif",
        "height": "288"
      },
      "medium": null,
      "large": null,
      "full": {
        "orientation": "landscape",
        "width": "384",
        "url": "http://cdp.local/wp-content/uploads/2018/02/picard.gif",
        "height": "288"
      }
    }
  }
}
```

### `/v1/post/{site}_{post_id}`

#### Request

```http
GET /v1/post/cdp.local_17
```

#### Response

```json
{
  "_id": "AWLZj5ZMln4rDxbHa5IA",
  "post_id": 17,
  "type": "post",
  "site": "cdp.local",
  "owner": "Content Delivery Platform",
  "published": "2018-02-05T22:22:44+00:00",
  "modified": "2018-04-18T16:26:15+00:00",
  "author": {
    "id": 1,
    "name": "thebenstreit"
  },
  "link": "http://cdp.local/2018/02/05/the-state-of-affairs/",
  "title": "The State of Affairs",
  "slug": "the-state-of-affairs",
  "content": "<p>Is grave.</p>\n",
  "excerpt": "",
  "language": {
    "_id": "AWKNa7G1dOZTaU7CiFIq",
    "language_code": "en",
    "display_name": "English",
    "native_name": "English",
    "locale": "en",
    "text_direction": "ltr"
  },
  "languages": [],
  "thumbnail": {
    "name": "Image Title",
    "alt": "Image Alt",
    "caption": "Image caption",
    "longdesc": "Image description",
    "sizes": {
      "small": {
        "height": 200,
        "width": 300,
        "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo-300x200.jpg",
        "orientation": "landscape"
      },
      "medium": {
        "height": 512,
        "width": 768,
        "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo-768x512.jpg",
        "orientation": "landscape"
      },
      "large": {
        "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo.jpg",
        "height": 1440,
        "width": 2160,
        "orientation": "landscape"
      },
      "full": {
        "url": "http://cdp.local/wp-content/uploads/2018/02/tyler_photo.jpg",
        "height": 1440,
        "width": 2160,
        "orientation": "landscape"
      }
    }
  },
  "comment_count": 0,
  "tags": ["another tag", "test", "category 2", "subcat 1", "another tag"],
  "categories": [
    {
      "name": "About America",
      "id": "AWKr-4EuPjd8uXvEbbw0"
    }
  ]
}
```

### `/v1/course`

TODO

### `/v1/language`

Retrieve list of languages.

#### Request

```http
GET /v1/language
```

#### Response

```JSON
[
    {
        "_id": "OFedlmIBBq4-jFm5c2rh",
        "language_code": "en",
        "display_name": "English",
        "native_name": "English",
        "locale": "en-us",
        "text_direction": "ltr"
    }
]
```

### `/v1/language/bulk`

Bulk import languages from a CSV file.

#### Request

Must include a CSV file in the POST keyed by `csv`.
CSV must contain a header with at least `Language Code`, `Display Name`, and `Native Name`. It may also include: `Locale` and `Text Direction` (ltr or rtl).

```http
POST /v1/language/bulk
csv=languages.csv
```

### `/v1/taxonomy`

Retrieve taxonomy terms in list or tree structure.

#### Request

Add URL parameter `tree` to format the response in a tree structure. Otherwise a one level array is returned.

```http
GET /v1/taxonomy?tree
```

#### Response

```JSON
[
    {
        "_id": "TMzEY2IB9sX6UOddUJVy",
        "primary": true,
        "parents": [],
        "synonymMapping": [],
        "language": {
            "en": "About America"
        },
        "children": [
            {
                "_id": "TczEY2IB9sX6UOddUJWY",
                "primary": false,
                "parents": [
                    "TMzEY2IB9sX6UOddUJVy"
                ],
                "synonymMapping": [],
                "language": {
                    "en": "American Culture"
                },
                "children": []
            },
            {
                "_id": "TszEY2IB9sX6UOddUJXL",
                "primary": false,
                "parents": [
                    "TMzEY2IB9sX6UOddUJVy",
                    "YszEY2IB9sX6UOddU5VV"
                ],
                "synonymMapping": [],
                "language": {
                    "en": "Diversity"
                },
                "children": []
            }
        ]
    }
]
```

### `/v1/taxonomy/bulk`

Bulk import of taxonomy terms.

#### Request

Must include a CSV file in the POST keyed by `csv`.
CSV must contain a header with at least `Parent` and `Child` columns. May also contain `Synonyms` which is a `|` delineated list of synonym mapping keywords. A `Skip` column may also be used to forcefully ignore the entire row.
Terms will be created in sequential order where children are associated with the last seen parent row above it.

```http
POST /v1/taxonomy/bulk
csv=taxonomy.csv
```

### `/v1/owner`

Retrieve owners list.

#### Request

```http
GET /v1/owner
```

#### Response

```JSON
[
    {
        "_id": "T1ctsWIBBq4-jFm5ZWqy",
        "name": "American Spaces"
    },
    {
        "_id": "TFctsWIBBq4-jFm5ZWqm",
        "name": "IIP Publications"
    },
    {
        "_id": "TVctsWIBBq4-jFm5ZWqy",
        "name": "IIP Interactive"
    }
]
```

### `/v1/owner/bulk`

Bulk import of owners.

#### Request

Must include a CSV file in the POST keyed by `csv`.
The CSV is simply a list of owner names.

```http
POST /v1/owner/bulk
csv=owners.csv
```
