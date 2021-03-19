import { Router } from 'express';
import controller from './controller';
import PostModel from './model';
import { validate } from '../../../middleware/validateSchema';
import { transferCtrl, deleteCtrl } from '../../../middleware/transfer';
import asyncResponse from '../../../middleware/asyncResponse';
import {
  translateCategories,
  tagCategories,
  synonymCategories,
} from '../../../middleware/categories';

const router = new Router();

router.param( 'uuid', controller.setRequestDoc );

// Route: /v1/post
router
  .route( '/' )
  .post(
    validate( PostModel ),
    asyncResponse(),
    transferCtrl( PostModel ),
    tagCategories,
    synonymCategories,
    translateCategories( PostModel ),
    controller.indexDocument,
  );

// Route: /v1/post/[uuid]
router
  .route( '/:uuid' )
  .put(
    validate( PostModel, false ),
    asyncResponse( false ),
    controller.setRequestDocWithRetry,
    controller.updateDocumentById,
  )
  .get( controller.getDocumentById )
  .delete( deleteCtrl( PostModel ), controller.deleteDocumentById );

export default router;
