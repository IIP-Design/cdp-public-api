import AbstractModel from '../../modules/abstractModel';

/**
 * Video Content Model helps in managing assets within JSON.
 */
class Course extends AbstractModel {
  constructor( index = 'courses', type = 'course' ) {
    super( index, type );
  }

  // eslint-disable-next-line class-methods-use-this
  validateSchema() {}

  /**
   * Returns an array of asssets (just thumbnail for now).
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getAssets( json ) {
    const assets = [];
    if ( json.thumbnail ) {
      [
        'small', 'medium', 'large', 'full'
      ].forEach( ( size ) => {
        if ( json.thumbnail[size] ) {
          assets.push( {
            downloadUrl: json.thumbnail[size].url,
            md5: json.thumbnail[size].md5 || null,
            width: json.thumbnail[size].width,
            height: json.thumbnail[size].height,
            orientation: json.thumbnail[size].orientation,
            unitIndex: size,
            srcIndex: -1,
            assetType: 'thumbnail'
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
      const source = this.body.thumbnail[asset.unitIndex];
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
}

export default Course;
