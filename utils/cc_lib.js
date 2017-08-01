//--------------------------------------------------------
// 	Chaincode Library
//--------------------------------------------------------


module.exports = function(enrollObj , g_options , fcw , logger){
	var chaincode = {};

	chaincode.put = function (key , value , cb) {
		logger.info("Putting value ...");	

                var opts = {
                        channel_id: g_options.channel_id,
                        chaincode_id: g_options.chaincode_id,
                        chaincode_version: g_options.chaincode_version,
                        event_url: g_options.event_url,
                        cc_function: 'put',
                        cc_args: [ key , value ],
                        peer_tls_opts: g_options.peer_tls_opts,
                };

                fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
                        if (cb) {
                                if(!resp) resp = {};
                                resp.id = opts.cc_args[0];                      //pass marble id back
                                cb(err, resp);
                        }
                });
        };

	chaincode.get = function (key , cb){
		logger.info("Getting value ...");

                var opts = {
                        channel_id: g_options.channel_id,
                        chaincode_version: g_options.chaincode_version,
                        chaincode_id: g_options.chaincode_id,
                        cc_function: 'get',
                        cc_args: [key]
                };

                return fcw.query_chaincode(enrollObj, opts, cb);
	};


	return chaincode;
}

