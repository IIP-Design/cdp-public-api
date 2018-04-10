import { Router } from 'express';
import controller from './controller';
import PostModel from './model';
import { transferCtrl, deleteCtrl } from '../../../middleware/transfer';
import asyncResponse from '../../../middleware/asyncResponse';
import {
  translateCategories,
  keywordCategories,
  synonymCategories
} from '../../../middleware/categories';

const router = new Router();

router.param( 'uuid', controller.setRequestDoc );

// Route: /v1/post
router
  .route( '/' )
  .post(
    asyncResponse,
    transferCtrl( PostModel ),
    keywordCategories,
    synonymCategories,
    translateCategories( PostModel ),
    controller.indexDocument
  );

// Route: /v1/post/[uuid]
router
  .route( '/:uuid' )
  .put(
    asyncResponse,
    transferCtrl( PostModel ),
    keywordCategories,
    synonymCategories,
    translateCategories( PostModel ),
    controller.updateDocumentById
  )
  .get( controller.getDocumentById )
  .delete( deleteCtrl( PostModel ), controller.deleteDocumentById );

export default router;
