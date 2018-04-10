import { Router } from 'express';
import controller from './controller';
import CourseModel from './model';
import { transferCtrl, deleteCtrl } from '../../../middleware/transfer';
import asyncResponse from '../../../middleware/asyncResponse';
import {
  translateCategories,
  keywordCategories,
  synonymCategories
} from '../../../middleware/categories';

const router = new Router();

router.param( 'uuid', controller.setRequestDoc );

// Route: /v1/course
router
  .route( '/' )
  .post(
    asyncResponse,
    transferCtrl( CourseModel ),
    keywordCategories,
    synonymCategories,
    translateCategories( CourseModel ),
    controller.indexDocument
  );

// Route: /v1/course/[uuid]
router
  .route( '/:uuid' )
  .put(
    asyncResponse,
    transferCtrl( CourseModel ),
    keywordCategories,
    synonymCategories,
    translateCategories( CourseModel ),
    controller.updateDocumentById
  )
  .get( controller.getDocumentById )
  .delete( deleteCtrl( CourseModel ), controller.deleteDocumentById );

export default router;
