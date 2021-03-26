import AbstractModel from '../../modules/abstractModel';
import Ajv from 'ajv';
import videoSchema from '../../modules/schema/video';

/**
 * Video Content Model helps in managing assets within JSON.
 */
class Video extends AbstractModel {
  constructor( index = 'videos', type = 'video' ) {
    super( index, type );
  }

  static validateSchema( body, useDefaults = true ) {
    Video.compileSchema( useDefaults );
    const valid = Video.validate( body );

    return {
      valid,
      errors: Video.validate.errors,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  static compileSchema( useDefaults = true ) {
    // 'useDefaults' adds a default value during validation if it is listed
    // 'removeAdditional' removes any properties during validation that are not in the schema
    // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
    const ajv = new Ajv( { useDefaults, removeAdditional: 'all', coerceTypes: true } );

    Video.validate = ajv.compile( videoSchema );
  }

  /**
   * Returns an array of asssets retrieved by iterating over the JSON
   * unit > sources.
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getAssets( json ) {
    // this could have urls to process from various nodes in json doc
    const assets = [];

    json.unit.forEach( ( unit, unitIndex ) => {
      unit.source.forEach( ( src, srcIndex ) => {
        assets.push( {
          downloadUrl: src.downloadUrl,
          stream: src.stream || {},
          md5: src.md5 || null,
          size: src.size || null,
          duration: src.duration || null,
          video_quality: src.video_quality || null,
          unitIndex,
          srcIndex,
          assetType: 'source',
        } );
      } );
      if ( unit.transcript ) {
        const trans = unit.transcript;

        assets.push( {
          downloadUrl: trans.srcUrl,
          md5: trans.md5 || null,
          unitIndex,
          srcIndex: -1,
          assetType: 'transcript',
        } );
      }
      if ( unit.srt ) {
        assets.push( {
          downloadUrl: unit.srt.srcUrl,
          md5: unit.srt.md5 || null,
          unitIndex,
          srcIndex: -1,
          assetType: 'srt',
        } );
      }
    } );
    if ( json.thumbnail && json.thumbnail.sizes ) {
      [
        'small', 'medium', 'large', 'full',
      ].forEach( size => {
        if ( json.thumbnail.sizes[size] ) {
          assets.push( {
            downloadUrl: json.thumbnail.sizes[size].url,
            md5: json.thumbnail.sizes[size].md5 || null,
            width: json.thumbnail.sizes[size].width,
            height: json.thumbnail.sizes[size].height,
            orientation: json.thumbnail.sizes[size].orientation,
            unitIndex: size,
            srcIndex: -1,
            assetType: 'thumbnail',
          } );
        }
      } );
    }

    return assets;
  }

  /**
   * Updates an asset's downloadUrl, streamUrl and md5 based on the unitIndex and srcIndex
   * stored in the asset object. This is okay since under all circumstances
   * the asset would have been iterated over using the objects obtained from
   * the getAssets method above.
   *
   * @param asset { downloadUrl, streamUrl, md5, unitIndex, srcIndex, assetType }
   */
  putAsset( asset ) {
    switch ( asset.assetType ) {
      case 'source':
        if ( asset.unitIndex !== null && asset.srcIndex !== null ) {
          const source = this.body.unit[asset.unitIndex].source[asset.srcIndex];

          source.downloadUrl = asset.downloadUrl;
          source.stream = asset.stream;
          source.md5 = asset.md5;
          source.size = asset.size;
          source.duration = asset.duration;
          source.video_quality = asset.video_quality;
        } else {
          console.log( 'attempting to update asset via hash' );
          this.body.unit.forEach( unit => {
            unit.source.forEach( src => {
              const temp = src;

              if ( src.md5 === asset.md5 ) {
                console.log( 'found match, updating stream', asset.stream );
                temp.stream = asset.stream;
              }
            } );
          } );
        }
        break;
      case 'thumbnail': {
        const source = this.body.thumbnail.sizes[asset.unitIndex];

        source.url = asset.downloadUrl;
        source.width = asset.width;
        source.height = asset.height;
        source.orientation = asset.orientation;
        source.md5 = asset.md5;
        break;
      }
      case 'transcript':
      case 'srt':
        this.body.unit[asset.unitIndex][asset.assetType].srcUrl = asset.downloadUrl;
        this.body.unit[asset.unitIndex][asset.assetType].md5 = asset.md5;
        break;
      default:
        break;
    }
  }

  /**
   * Returns an array of language units
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getUnits( json ) {
    return json.unit;
  }

  /**
   * Returns the title of the requested video in English or first available.
   *
   * @returns string
   */
  // eslint-disable-next-line class-methods-use-this
  getTitle() {
    let title = null;
    let lang = null;

    try {
      this.body.unit.forEach( unit => {
        if ( !title || ( unit.language && unit.language.language_code === 'en' ) ) {
          // Ensure we only take the first appearing English title
          if ( !lang || lang !== 'en' ) {
            lang = unit.language.language_code;
            title = unit.title; // eslint-disable-line prefer-destructuring
          }
        }
      } );
    } catch ( e ) {} // eslint-disable-line no-empty
    if ( !title ) return `Post #${this.body.post_id}`;

    return title;
  }
}

export default Video;
