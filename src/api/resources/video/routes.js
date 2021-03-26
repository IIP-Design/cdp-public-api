import { Router } from 'express';
import controller from './controller';
import VideoModel from './model';
import { validate } from '../../../middleware/validateSchema';
import { transferCtrl, deleteCtrl, asyncTransferCtrl } from '../../../middleware/transfer';
import { translateCategories } from '../../../middleware/categories';
import asyncResponse from '../../../middleware/asyncResponse';

const router = new Router();

router.param( 'uuid', controller.setRequestDoc );

// Route: /v1/video
router
  .route( '/' )
  .post(
    validate( VideoModel ),
    asyncResponse(),
    transferCtrl( VideoModel ),
    translateCategories( VideoModel ),
    controller.indexDocument,
    asyncTransferCtrl( VideoModel ),
    controller.indexDocument,
  );

// Route: /v1/video/[uuid]
router
  .route( '/:uuid' )
  .put(
    validate( VideoModel ),
    asyncResponse(),
    transferCtrl( VideoModel ),
    translateCategories( VideoModel ),
    controller.updateDocumentById,
  )
  .get( controller.getDocumentById )
  .delete( deleteCtrl( VideoModel ), controller.deleteDocumentById );

export default router;
