import parser from './parser';

// Pull controllers out to properly test
// It will make it easier to integrate a db if we decide to do so
export default {
  async indexDocument( model, req ) {
    req.indexed = true;
    if ( req.esDoc ) {
      return this.updateDocument( model, req.body, req.esDoc._id );
    }
    const doc = await this.findDocument( model, req.body );

    if ( doc && doc._id ) {
      return this.updateDocument( model, req.body, doc._id );
    }

    return model.indexDocument( req.body ).then( parser.parseCreateResult( req.body ) );
  },

  updateDocument( model, body, id ) {
    return model.updateDocument( id, body ).then( parser.parseUpdateResult( id, body ) );
  },

  updateDocumentById( model, req ) {
    req.indexed = true;
    if ( req.esDoc ) {
      return this.updateDocument( model, req.body, req.esDoc._id );
    }

    return this.updateDocument( model, req.body, req.params.id );
  },

  deleteDocument( model, id ) {
    return model.deleteDocument( id ).then( parser.parseDeleteResult( id ) );
  },

  async deleteDocumentByQuery( model, req ) {
    if ( req.esDoc ) {
      return this.deleteDocumentById( model, req.esDoc._id );
    }
    // could use client.deleteByQuery but that would delete all that match the query
    // prefer to have check for unique value before deleting
    const doc = await this.findDocument( model, req.body );

    if ( doc && doc._id ) {
      return this.deleteDocument( model, doc._id );
    }
    throw new Error( 'Document Not found.' );
  },

  deleteDocumentById( model, req ) {
    if ( req.esDoc && req.esDoc._id ) {
      return this.deleteDocument( model, req.esDoc._id );
    }
    throw new Error( `Document not found with UUID: ${req.params.uuid}` );
  },

  getDocument( model, query ) {
    return model.findDocumentByQuery( query ).then( parser.parseFindResult() );
  },

  getDocumentById( model, id ) {
    return model.findDocumentById( id ).then( parser.parseGetResult( id ) );
  },

  // Note, not using body id prop, if client has access to id prop use /:id route
  async findDocument( model, body ) {
    if ( body.site && body.post_id ) {
      const doc = await model.findDocumentByQuery( body ).then( parser.parseUniqueDocExists() );

      return doc;
    }
    throw new Error( 'Body must have both site and post_id props' );
  },

  async getAllDocuments( model ) {
    return model.getAllDocuments().then( parser.parseAllResult );
  },

  async findDocByTerm( model, name ) {
    return model.findDocByTerm( name ).then( parser.parseUniqueDocExists() );
  },

  async translateTermById( model, id, locale ) {
    return model.translateTermById( id, locale );
  },
};
