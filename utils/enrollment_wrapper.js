//-------------------------------------------------------------
// Module handles all the details about enrolling the admin for a particular channel 
// So the user just has to call enroll on this module and 
// will get back a chaincode library (cc_lib) instance configured for communicating with the chaincode
//-------------------------------------------------------------
module.exports = function(logger){
    const helper = require("./helper.js")(process.env.creds_filename, logger);
    const fcw = require("./fc_wrangler/index.js")( { block_delay : helper.getBlockDelay() } , logger);

    //-------------------------------------------------------------
    //                      INITIALIZATION PHASE
    //-------------------------------------------------------------
    var wrapper = {};
    wrapper.get_cc_lib = function() {

        //enroll an admin with the CA for this peer/channel
        var enrollObj = null; // object where the enrollment details are stored
        function enroll_admin(attempt, cb) {
                const opt = helper.makeEnrollmentOptions(0);
                logger.info(opt);
                fcw.enroll(opt, function (errCode, obj) {
                        if (errCode != null) {
                                logger.error("could not enroll...");
                                // --- Try Again ---  //
                                if (attempt >= 2) {
                                        if (cb) cb(errCode);
                                } else {
                                        try {
                                                logger.warn("removing older kvs and trying to enroll again");
                                                rmdir(makeKVSpath());                           //delete old kvs folder
                                                logger.warn("removed older kvs");
                                                enroll_admin(++attempt, cb);
                                        } catch (e) {
                                                logger.error("could not delete old kvs", e);
                                        }
                                }
                        } else {
                                logger.info("Successfully Enrolled admin with CA");
                                enrollObj = obj;
                                if (cb) cb(null);
                        }
                });
        }
        
        // create the chain code lib with the obtained enrollment object
        var cc_lib = null;
        let enroll_promise = new Promise(function(resolve , reject){
                enroll_admin(1 , function(err){
                        var opts = helper.make_cc_lib_opt();  
                        cc_lib = require('./cc_lib.js')(enrollObj , opts , fcw, logger); // cc_lib can only be created after the enrollObj is created
                        if(!err) resolve();
                        reject();
                });
        });

        // Tests out if simple put and get works.  // Is this really needed ? 
        // After the cc_lib has been used for a sample put and get the object is returned. 
        // This way if something's wrong the user will be warned
        return enroll_promise
        .then(function(){
            return cc_lib; // return the cc lib created by the module
        });

    }

    return wrapper;
}
