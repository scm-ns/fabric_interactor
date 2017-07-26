
// use fcw to get a admin user
const winston = require("winston");
const logger = new (winston.Logger)({
	level: 'debug',
	transports: [ new(winston.transports.Console)({ colorize : "true" }) , ]
});


const fcw_helper  = require("./utils/helper.js")(__dirname + "/config.json" , logger);
const fcw     = require("./utils/fc_wrangler/index.js")( {} , logger);
const hfc_utils     = require('fabric-client/lib/utils.js');
const hfc_eventhub  = require('fabric-client/lib/EventHub.js');


// Do create user to talk to the blockchain using the admin

// 1 get the admin 
const opt = fcw_helper.makeEnrollmentOptions(0);

const enroll_promise = new Promise((resolve , reject) => 
{
	fcw.enroll(opt , (err, submitter_chain_obj) => 
	{
		if(err)
			reject(err);

		resolve(submitter_chain_obj);
	});
});

var chain = null;
var admin = null;
var eventhub = null;
var txID = null;

// 2 enroll the admin
// enrollment gives back a user and a chain
enroll_promise
.then((submitter_chain_obj) => 
{
	return {"admin" : submitter_chain_obj.submitter , "chain" : submitter_chain_obj.chain};
})
.then((obj) => 
{
	// use the chain to invoke a transaction directly
	chain = obj.chain;
	admin = obj.admin;

	// get the options for invoking a trasaction
	var options = fcw_helper.make_cc_lib_opt();

	eventhub = new hfc_eventhub();
	// Setup EventHub
	
	logger.debug('[fcw] listening to event url', options.event_url);
	eventhub.setPeerAddr(options.event_url, {
		pem: options.peer_tls_opts.pem,
		'ssl-target-name-override': options.peer_tls_opts.common_name		//can be null if cert matches hostname
	});
	eventhub.connect();

	var nonce = hfc_utils.getNonce();
	txID = chain.buildTransactionID(nonce, admin);

	// Send proposal to endorser
	var request = 
	{
		chainId: options.channel_id,
		chaincodeId: options.chaincode_id,
		chaincodeVersion: options.chaincode_version,
		fcn: "put",
		args: ["test_input" , "orca_test_hsbn_2" ],
		txId: txID,
		nonce: nonce
	};

	// Send Proposal
	return chain.sendTransactionProposal(request);
})
.then((response)  => 
{
	var proposalResponses = response[0];	
	if(proposalResponses[0].response.status !== 200)
	{
		throw "endorsement failed";
	}

	// create a transaction from the response
	var request =
	{
		proposalResponses : response[0],
		proposal : response[1],
		header : response[2]
	};

	return chain.sendTransaction(request);
})
.then((response) => 
{
	if(response.status === "SUCCESS") 
	{
		console.log("successfully send transaction");
	}

	// get response from event hub from commiting of the block
	return new Promise((resolve , reject ) => 
	{
		eventhub.registerTxEvent(txID.toString() , (tx , code) =>
		{
			if (code === "VALID")
			{
				console.log("transaction has been created ");
				return resolve();
			}
			reject(code);
		});
	});
})
.then(() =>
{
	// get the options for invoking a trasaction
	var options = fcw_helper.make_cc_lib_opt();

	// use the chain to invoke a transaction directly

	eventhub = new hfc_eventhub();
	// Setup EventHub
	
	eventhub.setPeerAddr(options.event_url, {
		pem: options.peer_tls_opts.pem,
		'ssl-target-name-override': options.peer_tls_opts.common_name		//can be null if cert matches hostname
	});
	eventhub.connect();

	var nonce = hfc_utils.getNonce();
	var query_txID = chain.buildTransactionID(nonce, admin);

	// Send proposal to endorser
	var request = 
	{
		chainId: options.channel_id,
		chaincodeId: options.chaincode_id,
		chaincodeVersion: options.chaincode_version,
		fcn: "get",
		args: ["test_input"],
		txId: query_txID,
		nonce: nonce
	};

	return chain.queryByChaincode(request);
})
.then((response) =>
{
	console.log(" response " , response);		
	for( var i in response)
	{
		var string_conv = response[i].toString('utf8');
		console.log("string : " , string_conv);
	}

})
.then(() =>
{
	// create a new verifier using the admin object

	var fs      = require("fs");
	var path    = require("path");
	var os 	    = require("os");

	// Extract data from the config files for the network

	helper = {};
	// read the creds file
	const creds_name = "config.json";
	const creds_path = path.join(__dirname, creds_name);
	helper.creds = require(creds_path);
	function get_ca_url()
	{
		return helper.creds.credentials.cas[0].api;
	}



	// Orderers, Peers , Ca all have the same tls cert
	function get_tls_cert()
	{
		return helper.creds.credentials.tls_certificates.cert_1.pem;
	}


	var ca_service = require("fabric-ca-client/lib/FabricCAClientImpl.js");
	var hfc = require("fabric-client");
	var hfc_user = require("fabric-client/lib/User.js");



})
.catch((err) =>
{
	console.log(err);
});


// 2 use fcw to register a user using the admin
// use the enrolled admin to add verifiers and certifiers

// create verifiers


/*
var fs      = require("fs");
var path    = require("path");
var os 	    = require("os");

// Extract data from the config files for the network

helper = {};
// read the creds file
const creds_name = "config.json";
const creds_path = path.join(__dirname, creds_name);
helper.creds = require(creds_path);

// ca info
function get_ca_url()
{
	return helper.creds.credentials.cas[0].api;
}

function get_ca_admin_user()
{
	return helper.creds.credentials.cas[0].users;
}

// orderer info
function get_ordered_url()
{
	return helper.creds.credentials.orderers[0].discovery;
}

// peer info
function get_peer_url()
{
	return helper.creds.credentials.peers[0].discovery;
}

// peer events info
function get_peer_events_url()
{
	return helper.creds.credentials.peers[0].events;
}


// Orderers, Peers , Ca all have the same tls cert
function get_tls_cert()
{
	return helper.creds.credentials.tls_certificates.cert_1.pem;
}


var ca_service = require("fabric-ca-client/lib/FabricCAClientImpl.js");
var hfc = require("fabric-client");
var hfc_user = require("fabric-client/lib/User.js");


// tls options used to talk to the fabric ca
var tls_options = 
{
	trustedRoots: [ get_tls_cert() ],
	verify: false
};

var client = new hfc();

const admin_json = get_ca_admin_user()[0];
const admin_enroll_param = {
	enrollmentID: admin_json.enrollId,
	enrollmentSecret: admin_json.enrollSecret
};


const channel_name = "bcid";
var chain = null;
var channel = null;

var ca_client = new ca_service(get_ca_url() , tls_options);

// admin is already enrolled , but spit the promises better to get access to the admin
// enroll promise
// 	-> put values promise
// 	-> create user promies

var admin_ca, e_results;
///*
var hfc_local_msp = require('fabric-ca-client/lib/msp/msp.js');
var hfc_id_module = require('fabric-ca-client/lib/msp/identity.js');
var hfc_signing_idenity  = idModule.SigningIdentity;
var hfc_signer = idModule.Signer;
//

ca_client.enroll(admin_enroll_param) 
.then((enrollment) =>
{
	e_results = enrollment;
	console.log("admin enrolled");

	var user_param = 
	{
                    "affiliation": "group1",
                    "enrollId": "admin",
                    "enrollSecret": "806afbbfde",
                    "group": "bank_a",
                    "attrs": [
                        {
                            "name": "hf.Registrar.Roles",
                            "value": "client,peer,validator,auditor"
                        },
                        {
                            "name": "hf.Registrar.DelegateRoles",
                            "value": "client"
                        }
                    ]
                } 

	admin_ca = new hfc_user(user_param); // got group 1 from the service credentials 
	return admin_ca.setEnrollment(enrollment.key, enrollment.certificate, "PeerOrg1")
})
.then(() =>
{


/*	
	var msp = new hfc_local_msp(
		      {
		     	id: "PeerOrg1",
		        cryptoSuite: ca_client.getCryptoSuite()	
		      });

	var signing_identity = hfc_signing_idenity(e_results.certificate , pub_key , msp.getId() , msp.cryptoSuite, new hfc_signer(msp.cryptoSuite , e_results.key));
	var req = { "enrollmentID" : "verifiers1" , "enrollmentSecret" : null, "role" : "client" ,  "affiliation" : "group_1"};
	// use this client to register a user
	return ca_client.register(req , admin_ca);
})
.then((enrollmentSecret) =>
{
	console.log(enrollSecret);
})
.catch((err) =>
{
	console.log(err);
})


// 
*/

