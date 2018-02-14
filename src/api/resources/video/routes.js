import { Router } from 'express';
import controller from './controller';
import VideoModel from './videoModel';
import { transferCtrl, deleteCtrl } from '../../../middleware/transfer';
import asyncResponse from '../../../middleware/asyncResponse';

const router = new Router();

router.param( 'uuid', controller.setRequestDoc );

// Route: /v1/video
router
  .route( '/' )
  .post( asyncResponse, transferCtrl( VideoModel ), controller.indexDocument )
  .get( controller.getDocument )
  .delete( deleteCtrl( VideoModel ), controller.deleteDocument );

// Route: /v1/video/[uuid]
router
  .route( '/:uuid' )
  .put( controller.updateDocumentById )
  .get( controller.getDocumentById )
  .delete( deleteCtrl( VideoModel ), controller.deleteDocumentById );

export default router;
