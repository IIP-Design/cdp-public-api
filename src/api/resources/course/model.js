import Ajv from 'ajv';

import AbstractModel from 'api/modules/abstractModel';
import courseSchema from 'api/modules/schema/course';

/**
 * Course Content Model helps in managing assets within JSON.
 */
class Course extends AbstractModel {
  constructor( index = 'courses', type = 'course' ) {
    super( index, type );
  }

  static validateSchema( body, useDefaults = true ) {
    Course.compileSchema( useDefaults );
    const valid = Course.validate( body );

    return {
      valid,
      errors: Course.validate.errors,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  static compileSchema( useDefaults = true ) {
    // 'useDefaults' adds a default value during validation if it is listed
    // 'removeAdditional' removes any properties during validation that are not in the schema
    // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
    const ajv = new Ajv( { useDefaults, removeAdditional: 'all', coerceTypes: true } );

    Course.validate = ajv.compile( courseSchema );
  }

  /**
   * Returns an array of assets (just thumbnail for now).
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getAssets( json ) {
    const assets = [];

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
   * Updates an asset's downloadUrl and md5 based on the unitIndex and srcIndex
   * stored in the asset object. This is okay since under all circumstances
   * the asset would have been iterated over using the objects obtained from
   * the getAssets method above.
   *
   * @param asset
   */
  // eslint-disable-next-line class-methods-use-this
  putAsset( asset ) {
    if ( asset.assetType === 'thumbnail' ) {
      const source = this.body.thumbnail.sizes[asset.unitIndex];

      source.url = asset.downloadUrl;
      source.width = asset.width;
      source.height = asset.height;
      source.orientation = asset.orientation;
      source.md5 = asset.md5;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getUnits( json ) {
    return [json];
  }

  getTitle() {
    return this.body.title;
  }
}

export default Course;
