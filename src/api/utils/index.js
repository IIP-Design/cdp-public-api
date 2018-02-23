import Request from 'request';

export const getQueryFromUuid = ( uuid = '' ) => {
  let obj = {};
  const args = uuid.split( '_' );
  if ( args.length === 2 ) {
    obj = {
      site: args[0],
      post_id: args[1]
    };
  }
  return obj;
};

export const callback = ( req, data ) => {
  if ( req.headers.callback ) {
    console.log( 'sending callback', req.headers.callback );
    Request.post(
      {
        url: req.headers.callback,
        json: true,
        form: {
          error: 0,
          ...data
        }
      },
      () => {}
    );
    return true;
  }
  return false;
};
