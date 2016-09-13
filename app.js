"use strict";
/* global process */
/* global __dirname */
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved. 
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *******************************************************************************/
/////////////////////////////////////////
///////////// Setup Node.js /////////////
/////////////////////////////////////////
var express = require('express');

var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var url = require('url');
var async = require('async');
var setup = require('./setup');
var cors = require("cors");
var fs = require("fs");
var parseCookie =cookieParser('Somethignsomething1234!test');
var sessionStore = new session.MemoryStore();

//// Set Server Parameters ////
var host = setup.SERVER.HOST;
var port = setup.SERVER.PORT;

////////  Pathing and Module Setup  ////////
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('.html', require('jade').__express);
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded()); 
app.use(parseCookie);
app.use('/cc/summary', serve_static(path.join(__dirname, 'cc_summaries')) );												//for chaincode investigator
app.use( serve_static(path.join(__dirname, 'public'), {maxAge: '1d', setHeaders: setCustomCC}) );							//1 day cache
//app.use( serve_static(path.join(__dirname, 'public')) );
app.use(session({secret:'Somethignsomething1234!test', resave:true, saveUninitialized:true, store: sessionStore}));

function setCustomCC(res, path) {
	if (serve_static.mime.lookup(path) === 'image/jpeg')  res.setHeader('Cache-Control', 'public, max-age=2592000');		//30 days cache
	else if (serve_static.mime.lookup(path) === 'image/png') res.setHeader('Cache-Control', 'public, max-age=2592000');
	else if (serve_static.mime.lookup(path) === 'image/x-icon') res.setHeader('Cache-Control', 'public, max-age=2592000');
}
// Enable CORS preflight across the board.
app.options('*', cors());
app.use(cors());

///////////  Configure Webserver  ///////////
app.use(function(req, res, next){
	var keys;
	console.log('------------------------------------------ incoming request ------------------------------------------');
	console.log('New ' + req.method + ' request for', req.url);
	req.bag = {};											//create my object for my stuff
	req.session.count = eval(req.session.count) + 1;
	req.bag.session = req.session;
	
	var url_parts = url.parse(req.url, true);
	req.parameters = url_parts.query;
	keys = Object.keys(req.parameters);
	if(req.parameters && keys.length > 0) console.log({parameters: req.parameters});		//print request parameters
	keys = Object.keys(req.body);
	if (req.body && keys.length > 0) console.log({body: req.body});						//print request body
	next();
});

//// Router ////
app.use('/', require('./routes/site_router'));

////////////////////////////////////////////
////////////// Error Handling //////////////
////////////////////////////////////////////
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
app.use(function(err, req, res, next) {		// = development error handler, print stack trace
	console.log("Error Handeler -", req.url);
	var errorCode = err.status || 500;
	res.status(errorCode);
	req.bag.error = {msg:err.stack, status:errorCode};
	if(req.bag.error.status == 404) req.bag.error.msg = "Sorry, I cannot locate that file";
	res.render('template/error', {bag:req.bag});
});

// ============================================================================================================================
// 														Launch Webserver
// ============================================================================================================================
var server = http.createServer(app).listen(port, function() {});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.NODE_ENV = 'production';
server.timeout = 240000;																							// Ta-da.
console.log('------------------------------------------ Server Up - ' + host + ':' + port + ' ------------------------------------------');
if(process.env.PRODUCTION) console.log('Running using Production settings');
else console.log('Running using Developer settings');


// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================

// ============================================================================================================================
// 														Warning
// ============================================================================================================================

// ============================================================================================================================
// 														Entering
// ============================================================================================================================

// ============================================================================================================================
// 														Test Area
// ============================================================================================================================
var part2 = require('./utils/ws_part2');
var ws = require('ws');
var wss = {};
var Ibc1 = require('ibm-blockchain-js');
var ibc = new Ibc1();

// ==================================
// load peers manually or from VCAP, VCAP will overwrite hardcoded list!
// ==================================
// var manual = {
//  		"credentials": {
//             "peers": [
//                {
//                   "discovery_host": "127.0.0.1",
//                   "discovery_port": "30303",
//                   "api_host": "127.0.0.1",
//                   "api_port": "3000",
//                   "type": "peer",
//                   "network_id": "97d80cea-6bdb-49e0-bf5c-02fc016b52d7",
//                   "id": "97d80cea-6bdb-49e0-bf5c-02fc016b52d7_vp1",
//                   "api_url": "http://127.0.0.1:3000"
//                }
//             ]
//          }
//     };

/* [cwng] 20160912 - remove the original hardcoded bluemix peers and replaced with local docker peers */
/*
var manual =  {
   "credentials": {
            "peers": [
               {
                  "discovery_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp1-discovery.blockchain.ibm.com",
                  "discovery_port": 30303,
                  "api_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp1-api.blockchain.ibm.com",
                  "api_port_tls": 443,
                  "api_port": 80,
                  "type": "peer",
                  "network_id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a",
                  "container_id": "c02320f5257a8a0ebcac1a7acdec1962c003fed47af6fc52c174a941db821d1b",
                  "id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp1",
                  "api_url": "http://e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp1-api.blockchain.ibm.com:80"
               },
               {
                  "discovery_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp2-discovery.blockchain.ibm.com",
                  "discovery_port": 30303,
                  "api_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp2-api.blockchain.ibm.com",
                  "api_port_tls": 443,
                  "api_port": 80,
                  "type": "peer",
                  "network_id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a",
                  "container_id": "7c67f1abce7e2a52a68af934a42b2a79e7d8207d4f81064753c44af6a0d13659",
                  "id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp2",
                  "api_url": "http://e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp2-api.blockchain.ibm.com:80"
               }
            ],
            "ca": {
               "e08fb9f9-d50e-4f08-8636-46a554c56a2a_ca": {
                  "url": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_ca-api.blockchain.ibm.com:30303",
                  "discovery_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_ca-discovery.blockchain.ibm.com",
                  "discovery_port": 30303,
                  "api_host": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_ca-api.blockchain.ibm.com",
                  "api_port_tls": 30303,
                  "api_port": 80,
                  "type": "ca",
                  "network_id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a",
                  "container_id": "efecc93a3c0fbe431a45ce1c28184a57119e8536c1edd85e213cfa7d2b78a60a"
               }
            },
            "users": [
               {
                  "username": "user_type0_74cde9dd37",
                  "secret": "a3ff691067",
                  "enrollId": "user_type0_74cde9dd37",
                  "enrollSecret": "a3ff691067"
               },
               {
                  "username": "user_type0_ee680b55ac",
                  "secret": "888c3ae680",
                  "enrollId": "user_type0_ee680b55ac",
                  "enrollSecret": "888c3ae680"
               },
               {
                  "username": "user_type1_a38e23f53c",
                  "secret": "8fde12af6a",
                  "enrollId": "user_type1_a38e23f53c",
                  "enrollSecret": "8fde12af6a"
               },
               {
                  "username": "user_type1_41bc38d424",
                  "secret": "919b7f14aa",
                  "enrollId": "user_type1_41bc38d424",
                  "enrollSecret": "919b7f14aa"
               },
               {
                  "username": "user_type2_a83e2a913d",
                  "secret": "642b895840",
                  "enrollId": "user_type2_a83e2a913d",
                  "enrollSecret": "642b895840"
               },
               {
                  "username": "user_type2_3b856a1348",
                  "secret": "0eb79ab5a1",
                  "enrollId": "user_type2_3b856a1348",
                  "enrollSecret": "0eb79ab5a1"
               },
               {
                  "username": "user_type3_0100b664f0",
                  "secret": "941d9470e0",
                  "enrollId": "user_type3_0100b664f0",
                  "enrollSecret": "941d9470e0"
               },
               {
                  "username": "user_type3_0043740d68",
                  "secret": "6661fc8a57",
                  "enrollId": "user_type3_0043740d68",
                  "enrollSecret": "6661fc8a57"
               },
               {
                  "username": "user_type4_d1ecde81dd",
                  "secret": "43732d43b4",
                  "enrollId": "user_type4_d1ecde81dd",
                  "enrollSecret": "43732d43b4"
               },
               {
                  "username": "user_type4_d7de79bfb5",
                  "secret": "d69c2ff6a5",
                  "enrollId": "user_type4_d7de79bfb5",
                  "enrollSecret": "d69c2ff6a5"
               }
            ]
    }
}*/
var manual =  {
		   "credentials": {
		            "peers": [
		               {
		                  "discovery_host": "172.17.0.3",
		                  "discovery_port": 7051,
		                  "api_host": "172.17.0.3",
		                  "api_port_tls": 443,
		                  "api_port": 7050,
		                  "type": "peer",
		                  "network_id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a",
		                  "container_id": "c02320f5257a8a0ebcac1a7acdec1962c003fed47af6fc52c174a941db821d1b",
		                  "id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a_vp1",
		                  "api_url": "http://172.17.0.3:80"
		               }
		            ],
		            "ca": {
		               "e08fb9f9-d50e-4f08-8636-46a554c56a2a_ca": {
		                  "url": "172.17.0.2:7054",
		                  "discovery_host": "172.17.0.2",
		                  "discovery_port": 7054,
		                  "api_host": "172.17.0.2",
		                  "api_port_tls": 7054,
		                  "api_port": 80,
		                  "type": "ca",
		                  "network_id": "e08fb9f9-d50e-4f08-8636-46a554c56a2a",
		                  "container_id": "efecc93a3c0fbe431a45ce1c28184a57119e8536c1edd85e213cfa7d2b78a60a"
		               }
		            },
		            "users": [
		               {
		                  "username": "user_type0_74cde9dd37",
		                  "secret": "a3ff691067",
		                  "enrollId": "user_type0_74cde9dd37",
		                  "enrollSecret": "a3ff691067"
		               },
		               {
		                  "username": "user_type0_ee680b55ac",
		                  "secret": "888c3ae680",
		                  "enrollId": "user_type0_ee680b55ac",
		                  "enrollSecret": "888c3ae680"
		               },
/*		               {
		                  "username": "user_type1_a38e23f53c",
		                  "secret": "8fde12af6a",
		                  "enrollId": "user_type1_a38e23f53c",
		                  "enrollSecret": "8fde12af6a"
		               },*/
		               {
			                  "username": "admin",
			                  "secret": "Xurw3yU9zI0l",
			                  "enrollId": "admin",
			                  "enrollSecret": "Xurw3yU9zI0l"
			           }
		            ]
		    }
		}

var peers = manual.credentials.peers;
console.log('loading hardcoded peers');
var users = null;																		//users are only found if security is on
if(manual.credentials.users) users = manual.credentials.users;
console.log('loading hardcoded users');

if(process.env.VCAP_SERVICES){															//load from vcap, search for service, 1 of the 3 should be found...
	var servicesObject = JSON.parse(process.env.VCAP_SERVICES);
	for(var i in servicesObject){
		if(i.indexOf('ibm-blockchain') >= 0){											//looks close enough
			if(servicesObject[i][0].credentials.error){
				console.log('!\n!\n! Error from Bluemix: \n', servicesObject[i][0].credentials.error, '!\n!\n');
				peers = null;
				users = null;
				process.error = {type: 'network', msg: "Due to overwhelming demand the IBM Blockchain Network service is at maximum capacity.  Please try recreating this service at a later date."};
			}
			if(servicesObject[i][0].credentials && servicesObject[i][0].credentials.peers){
				console.log('overwritting peers, loading from a vcap service: ', i);
				peers = servicesObject[i][0].credentials.peers;
				if(servicesObject[i][0].credentials.users){
					console.log('overwritting users, loading from a vcap service: ', i);
					users = servicesObject[i][0].credentials.users;
				} 
				else users = null;														//no security
				break;
			}
		}
	}
}

// ==================================
// configure ibm-blockchain-js sdk
// ==================================
var options = 	{
					network:{
						peers: peers,
						users: users,
					},
					chaincode:{
						zip_url: 'https://github.com/mcenatie/nv-chaincode/archive/master.zip',
						unzip_dir: 'nv-chaincode-master',									//subdirectroy name of chaincode after unzipped
						git_url: 'https://github.com/mcenatie/nv-chaincode',			//GO git http url
					
						//hashed cc name from prev deployment
						//deployed_name: 'mycc'
						deployed_name: '4f1bf6581ebe31326cf8ae669859225f1ef65ec6b718142f1e30a4dc9c9dbd51c3ddcc2ff070542c8c3d38e82d81c7690da5db7a0fbc3383874787816e2a4017'
					}
				};
if(process.env.VCAP_SERVICES){
	console.log('\n[!] looks like you are in bluemix, I am going to clear out the deploy_name so that it deploys new cc.\n[!] hope that is ok budddy\n');
	options.chaincode.deployed_name = "";
}
ibc.load(options, cb_ready);																//parse/load chaincode

var chaincode = null;
function cb_ready(err, cc){																	//response has chaincode functions
	if(err != null){
		console.log('! looks like an error loading the chaincode, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		chaincode = cc;
		part2.setup(ibc, cc);
		if(!cc.details.deployed_name || cc.details.deployed_name === ""){												//decide if i need to deploy
			cc.deploy('init', [], './cc_summaries', cb_deployed);
		}
		else{
			console.log('chaincode summary file indicates chaincode has been previously deployed');
			cb_deployed();
		}
	}
}

// ============================================================================================================================
// 												WebSocket Communication Madness
// ============================================================================================================================
function cb_deployed(e, d){
	if(e != null){
		console.log('! looks like a deploy error, holding off on the starting the socket\n', e);
		if(!process.error) process.error = {type: 'deploy', msg: e.details};
	}
	else{
		console.log('------------------------------------------ Websocket Up ------------------------------------------');
		ibc.save('./cc_summaries');															//save it here for chaincode investigator
		wss = new ws.Server({server: server});												//start the websocket now
		wss.on('connection', function connection(ws) {
			ws.on('message', function incoming(message) {
				console.log('received ws msg:', message);
				var data = JSON.parse(message);
				var finInst = null
				parseCookie(ws.upgradeReq, null, function(err) {
			        var sessionID = ws.upgradeReq.signedCookies['connect.sid'];
			        sessionStore.get(sessionID, function(err, sess) {
				    	if(sess){
				    		part2.process_msg(ws, data, sess.username);
				    	}
				    });
			    }); 
			});
			
			ws.on('close', function(){});
		});
		
		wss.broadcast = function broadcast(data) {											//send to all connections
			wss.clients.forEach(function each(client) {
				try{
					data.v = '2';
					client.send(JSON.stringify(data));
				}
				catch(e){
					console.log('error broadcast ws', e);
				}
			});
		};
		
		// ========================================================
		// Part 2 Code - Monitor the height of the blockchain
		// =======================================================
		ibc.monitor_blockheight(function(chain_stats){										//there is a new block, lets refresh everything that has a state
			if(chain_stats && chain_stats.height){
				console.log('hey new block, lets refresh and broadcast to all');
				ibc.block_stats(chain_stats.height - 1, cb_blockstats);
				wss.broadcast({msg: 'reset'});
				// chaincode.read('GetAllCPs', cb_got_papers);
			}
			
			//got the block's stats, lets send the statistics
			function cb_blockstats(e, stats){
				if(chain_stats.height) stats.height = chain_stats.height - 1;
				wss.broadcast({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
			}
			

		});
	}
}
