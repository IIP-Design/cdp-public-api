import { Router } from 'express';
import * as controller from './controller';

const router = new Router();

// Some non-latin base64 encodings use slashes which break the route matching.
// The regex route allows us to capture the base64 encoded opts object even with slashes.
// Whatever follows the LAST trailing slash will be the filename.
router.route( /^\/download\/(.*)\/([^/]+)$/ ).get( controller.download );
// Below is only kept for backwards compatability but should be reomved eventually
router.route( '/download/:opts' ).get( controller.download );
router.route( '/download' ).post( controller.download );
router.route( '/opennet' ).get( controller.isOpenNet );

export default router;
