import { Router } from 'express';
import * as controller from './controller';

const routes = new Router();

routes.post( '/', controller.search );
routes.post( '/scroll', controller.scroll );

export default routes;
