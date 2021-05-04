// @ts-check
// Modified on Sep 27, 2020
//
const fs = require("fs"),
  http = require("http"),
  https = require("https")
const express = require('express');
const bodyParser = require('body-parser');

const banc = require('./banc_class_pg.js');
const outputConvertor = require('./output_convertor_FF.js');
const { Pool } = require("pg");
const app = express();
var port = 8000;
//
var calledServiceURL = "";
const verbose = true;
const useHeader = true;
const dHelper = new banc.setupDataHelper(verbose);
const validator = new banc.DataValidator(verbose);
//const json2json = new jsonConvert.Convert_Json2Json(verbose);
const respConvertor = new outputConvertor.OutputConvertor(verbose);
//
// Define the pool connection
const pool = new Pool(dHelper.getDbConfig());
//
function execute1SqlsWithCommit(data_json, aCallback) {
  const name = data_json.name;
  const sql1 = data_json.sql1;
  const args1 = data_json.args1;
  const cond = data_json.cond; // true with commit & false no commit

  //console.log(data_json);
  var output = {
    "sql1_result": null,
    "err": null,
    "err_msg": null
  };
  pool.connect((err, client, done) => {
    const shouldAbort = err => {
      if (err) {
        output.err = err;
        output.msg = "Error in transaction: " + name;
        console.error('Error in transaction', err.stack);
        if (cond) {
          client.query('ROLLBACK', err => {
            if (err) {
              console.error('Error rolling back client', err.stack)
            }
          })
        }
        // release the client back to the pool
        client.release();
        //done()
      }
      console.log(output);
      return !!err;
    }
    // Output sent to callback;

    console.log("Transaction - Begin", sql1);
    client.query('BEGIN', err => {
      if (shouldAbort(err)) return aCallback(output);
      //const queryText = 'INSERT INTO users(name) VALUES($1) RETURNING id'
      // Calling the first sql1 -- It has to be provided all the time
      //  console.log(sql1, args1);
      client.query(sql1, args1, (err, res) => {
        console.log("Executed Transaction Sql1 for name: " + name);
        //  console.log(err);
        if (shouldAbort(err)) return aCallback(output);
        if (res) {
          output.sql1_result = JSON.stringify(res);
        }
        //console.log("res: ", res.rows);
        //console.log("output: ", output);
        //
        if (cond) {
          client.query('COMMIT', err => {
            console.log("No Transaction Sql2 for name: " + name + ". Executed COMMIT. ");

            if (err) {
              console.error('Error committing transaction', err.stack);
            }

          })
        }
        client.release();
        // done();
        //console.log("After Commit: ", output);
        return aCallback(output);
      })
    })
  })
}
//
function execute2SqlTxn(data_json, aCallback) {
  const name = data_json.name;
  const sql1 = data_json.sql1;
  const args1 = data_json.args1;
  const sql2 = data_json.sql2;
  var is2assoc = data_json.cond;

  //console.log(data_json);
  var output = {
    "sql1_result": null,
    "sql2_result": null,
    "err": null,
    "err_msg": null
  };
  pool.connect((err, client, done) => {
    const shouldAbort = err => {
      if (err) {
        output.err = err;
        output.msg = "Error in transaction: " + name;
        console.error('Error in transaction', err.stack)
        client.query('ROLLBACK', err => {
          if (err) {
            console.error('Error rolling back client', err.stack)
          }
          // release the client back to the pool
          client.release();
          //done()
        })
        console.log(output);
      }
      return !!err;
    }
    // Output sent to callback;

    console.log("Transaction - Begin");
    //console.log("Before begin: ", output);
    client.query('BEGIN', err => {
      if (shouldAbort(err)) return aCallback(output);
      //const queryText = 'INSERT INTO users(name) VALUES($1) RETURNING id'
      // Calling the first sql1 -- It has to be provided all the time
      console.log(sql1, args1);
      client.query(sql1, args1, (err, res) => {
        console.log("Executed Transaction Sql1 for name: " + name);
        console.log(err);
        if (shouldAbort(err)) return aCallback(output);
        if (res) {
          output.sql1_result = JSON.stringify(res);
        }
        //  console.log("res: ", res.rows);
        // console.log("output: ", output);
        //
        if (sql2 != null) {
          var args2;
          if (is2assoc) {
            //const insertPhotoText = 'INSERT INTO photos(user_id, photo_url) VALUES ($1, $2)'
            args2 = [res.rows[0].entity_id];
          } else {
            args2 = data_json.args2;
          }
          //
          //  if Second sql present
          client.query(sql2, args2, (err, res) => {
            console.log("Executed Transaction Sql2 for name: " + name);

            output.sql2_result = JSON.stringify(res);
            if (shouldAbort(err)) return aCallback(output);
            client.query('COMMIT', err => {
              if (err) {
                output.err = err;
                output.err_msg = 'Error committing transaction';
                console.error('Error committing transaction', err.stack);
              }
              client.release();
              //done();
              return aCallback(output);
            })
          })
        } else {

          client.query('COMMIT', err => {
            console.log("No Transaction Sql2 for name: " + name + ". Executed COMMIT. ");

            if (err) {
              console.error('Error committing transaction', err.stack);
            }
            client.release();
            // done();
            //   console.log("After Commit: ", output);
            return aCallback(output);
          })
        }
      })
    })
  })
}
//
// Initial setup calls
dHelper.setTransactionTypeInfo();
dHelper.setEventInfo();
dHelper.setAffiliationTypeInfo();
dHelper.setLinkInfo();

//
// var output = dHelper.printData();
/*
*  APIs with embedded callbacks starts from here
*/

//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

/**
 * The security configuration file that sets up HTTP or HTTPS
 */
const securityConfig = JSON.parse(fs.readFileSync("security-config.json", "utf8"));

/**
 * Make the server use HTTPS if the configuration file demands it
 */
let server;
if (securityConfig.https) {
  // Secure connection
  const options = {
    key: fs.readFileSync(securityConfig.keyFileName),
    cert: fs.readFileSync(securityConfig.certificateFileName),
    ca: fs.readFileSync(securityConfig.certificateAuthorityFileName),
    passphrase: securityConfig.keyPassphrase,
    requestCert: true,
    rejectUnauthorized: false
  };
  // get https port
  port = dHelper.getConfig().https_port;

  app.use((req, res, next) => {
    const clientUnauthorized = () => res.status(401).send("Client is not authorized");
    if (!req.client.authorized) {
      return clientUnauthorized();
    }

    const cert = req.socket.getPeerCertificate();

    if (!cert.subject || cert.subject.CN !== securityConfig.gatewayCN) {
      return clientUnauthorized();
    }

    next();
  });

  server = https.createServer(options, app);
} else {
  // Insecure connection
  // get http port
  port = dHelper.getConfig().http_port;
  server = http.createServer(app);
}
//
// Check for api authorization
function isAuthorized(Res, api, authgroup) {
  let outRes = {
    "msg": "Unauthorized to execute",
    "error": "UNAUTHORIZED",
    "statusCode": 403
  }
  let authOK = dHelper.verifyApi2Execute(api, authgroup);
  if (!authOK) {
    sendJsonResponse(Res, outRes, null, null);
  }
  return authOK;
}

// Send response
function sendJsonResponse(Res, outResult, type1 = null, type2 = null) {
  //console.log("In sendJsonResponse: ", outResult);
  var conv_res = respConvertor.transform(outResult, type1, type2);
  if ("statusCode" in outResult) {
    Res.status(outResult.statusCode);
  }
  Res.setHeader("Access-Control-Allow-Origin", "*");
  console.log("Sending output: ", conv_res);
  Res.send(conv_res);
}

app.get("/banc/testFunction", (req, Res) => {
  let jData = {
      "firstname": "Subroto",
      "lastname": "Bhattacharji",
      "middlename": "",
      "email": "subroto@computer.org",
      "telephone": "9194607990",
      "mobile": "9193451714"
  }
  //dHelper.testFunction(req, Res);
  dHelper.executePersonSQL(jData,0,true,false,false,null, testCallCB);
  function testCallCB(output) {
    sendJsonResponse(Res,output, null, null);
    return
  }

});
/*
 setpersoninfo allows an ordinary user to insert spouse, deps, address and primary comm information and update all
 including prime 
 A priv user can insert and update prime, spouse, etc.
*/
app.post("/banc/setpersoninfo", (req, Res) => {
  //
  console.log("====== /setpersoninfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  // console.log(req.body);
  const personInfo = req.body;
  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes = {
    "msg": null,
    "err": true,
    "err_msg": "Error Occurred",
    "statusCode": 403
  };
  var loginInfo = {
    "uid": uid,
    "email": email,
    "personid": 0,
    "primeid": 0,
    "authgroup": 0,
    "primeid_fromData": 0,
    "isValid": false
  };
  var primeInfo = personInfo["prime"];
  var spouseInfo = personInfo.spouse;
  var depInfo = personInfo.deps;
  var address = personInfo.address;
  var primarycomm = personInfo.primarycomm;
  //var validtoken = false;

  //
  if (primeInfo === null || typeof primeInfo === 'undefined') {
    outRes.msg = "Prime person information is a mandatory input -- cannot be null or undefined.";
    sendJsonResponse(Res, outRes);
    return;
  }
  if ("update" in personInfo) {
    let update = primeInfo.update;
    if (!(validator.personData(primeInfo, update))) {
      outRes.msg = "Prime person information is incomplete or undefined.";
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  if (spouseInfo != null) {
    console.log("spouse: ", spouseInfo);
    if ("update" in spouseInfo) {
      let update = spouseInfo.update;
      if (!(validator.personData(spouseInfo, update))) {
        outRes.msg = "Spouse person information is incomplete or undefined.";
        sendJsonResponse(Res, outRes);
        return;
      }
    }
    if (address != null) {
      if ("update" in spouseInfo) {
        let update = spouseInfo.update;
        if (!(validator.address(address, update))) {
          outRes.msg = "Address information is incomplete or undefined.";
          sendJsonResponse(Res, outRes);
          return;
        }
      }
      let state = validator.abbrState(address.state, "abbr");
      address.state = state;
      console.log(address);
    }
  }
  var resultSeq = "prime";
  var primeId = 0;
  var row;
  var spouseId = 0;
  var assocData = [];
  var depLen = depInfo.length;
  var depProc = 0;
  /*
    if (!validator.tokeData(uid, email, token)) {
      outRes.msg = "Login failed.";
      outRes.err = true;
      outRes.err_msg = "Set Person Info aborted - incorrect login data";
      sendJsonResponse(Res, outRes);
      return;
    }
    */
  var flow_step = 0;
  dHelper.isTokenValid(uid, email, token, setPersonsCB);
  console.log("flow_step: ", flow_step);
  //
  function setPersonsCB(output) {
    console.log("===== set Member CB ---");
    var sql1_result = null;
    var api;
    console.log("setPersonsCB - ", flow_step, " - ", output);


    if (output.err) { // Error occurred in DB
      outRes.err = output.err;
      outRes.err_msg = output.msg;
      sendJsonResponse(Res, outRes);
      return;
    }
    if (flow_step == 0) {
      if (output.token_valid) {
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.token_valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        //
      } else {
        outRes.msg = output.msg;
        sendJsonResponse(Res, outRes);
        return;
      }
      // get the prime and person Info
      flow_step = 1;
      dHelper.getPersonWithPrime(primeInfo.firstname, primeInfo.middlename, primeInfo.lastname, primeInfo.email, null, null, setPersonsCB);
      return;
    }
    //
    if (flow_step == 1) {
      if (output.found) {
        let prime = JSON.parse(output.prime);
        loginInfo.primeid_fromData = prime.entity_id;
      }

      if (loginInfo.primeid_fromData == loginInfo.primeid) {
        api = "/banc/setpersoninfo?update=own";
      } else if (loginInfo.primeid_fromData != loginInfo.primeid) {
        api = "/banc/setpersoninfo?update=other";
      }
      if (isAuthorized(Res, api, loginInfo.authgroup)) {
        flow_step = 2;
        dHelper.processPersonsInfo(primeInfo, spouseInfo, depInfo, address, primarycomm, loginInfo, setPersonsCB);
        return;
      }
    }
    if (flow_step == 2) {
      outRes = output;
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  //
});
//
// setpersoninfo2 -- delete afterward
app.post("/banc/setpersoninfo2", (req, Res) => {
  //
  console.log("====== /setpersoninfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  // console.log(req.body);
  const memberInfo = req.body;
  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes = {
    "msg": null,
    "err": true,
    "err_msg": "Error Occurred"
  };
  var loginInfo = {
    "uid": uid,
    "email": email,
    "personid": 0,
    "primeid": 0,
    "authgroup": 0,
    "primeid_fromData": 0,
    "isValid": false,
    "update": false
  };
  var primeInfo = memberInfo["prime"];
  var spouseInfo = memberInfo.spouse;
  var depInfo = memberInfo.deps;
  var address = memberInfo.address;
  var primecomm = memberInfo.primecomm;
  //var validtoken = false;
  if ("update" in memberInfo) {
    loginInfo.update = memberInfo.update;
  }
  //
  let update = loginInfo.update;
  if (!update) {
    if (primeInfo === null || typeof primeInfo === 'undefined') {
      outRes.msg = "Prime person information is a mandatory input -- cannot be null or undefined.";
      sendJsonResponse(Res, outRes);
      return;
    }
    if (!(validator.personData(primeInfo, update))) {
      outRes.msg = "Prime person information is incomplete or undefined.";
      sendJsonResponse(Res, outRes);
      return;
    }
  } else {
    if (primeInfo != null) {
      if (!(validator.personData(primeInfo, update))) {
        outRes.msg = "Prime person information is incomplete or undefined.";
        sendJsonResponse(Res, outRes);
        return;
      }
      if ("entity_id" in primeInfo) {
        loginInfo.primeid_fromData = primeInfo.entity_id;
      } else {
        outRes.msg = "Prime person information -- entity_id is mandatory for update.";
        sendJsonResponse(Res, outRes);
        return;
      }
    }
    if (spouseInfo != null) {
      console.log("spouse: ", spouseInfo);
      if (!(validator.personData(spouseInfo, update))) {
        outRes.msg = "Spouse person information is incomplete or undefined.";
        sendJsonResponse(Res, outRes);
        return;
      }
      if (!("entity_id" in spouseInfo)) {
        outRes.msg = "Spouse person information -- entity_id is mandatory for update.";
        sendJsonResponse(Res, outRes);
        return;
      }
    }
    if (address != null) {
      if (!(validator.address(address, update))) {
        outRes.msg = "Address information is incomplete or undefined.";
        sendJsonResponse(Res, outRes);
        return;
      }
      let state = validator.abbrState(address.state, "abbr");
      address.state = state;
      console.log(address);
    }
  }
  var resultSeq = "prime";
  var primeId = 0;
  var row;
  var spouseId = 0;
  var assocData = [];
  var depLen = depInfo.length;
  var depProc = 0;
  /*
    if (!validator.tokeData(uid, email, token)) {
      outRes.msg = "Login failed.";
      outRes.err = true;
      outRes.err_msg = "Set Person Info aborted - incorrect login data";
      sendJsonResponse(Res, outRes);
      return;
    }
    */
  var flow_step = 0;
  //var cond = true;

  if (loginInfo.update) {
    flow_step = 1;
    dHelper.isTokenValid(uid, email, token, setPersonsCB);
  } else {
    flow_step = 0;
    dHelper.getPersonWithPrime(primeInfo.firstname, primeInfo.middlename, primeInfo.lastname, primeInfo.email, null, null, setPersonsCB);
  }
  console.log("flow_step: ", flow_step);
  //
  function setPersonsCB(output) {
    console.log("===== set Member CB ---");
    var sql1_result = null;
    var api;
    console.log("setPersonsCB - ", flow_step, " - ", output);

    if (flow_step == 0) {
      if (output.err) {  // Error occurred in DB
        outRes.err = output.err;
        outRes.err_msg = output.msg;
        sendJsonResponse(Res, outRes);
        return;
      }
      if (output.found) {
        outRes.err = true;
        outRes.msg = "Name not added, the prime name found in the repository!";
        sendJsonResponse(Res, outRes);
        return;
      }
      flow_step = 2;
      dHelper.processPersonsInfo(primeInfo, spouseInfo, depInfo, address, primecomm, loginInfo, setPersonsCB);
      return;
    }
    //
    if (flow_step = 1) {
      if (output.token_valid) {
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.token_valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        //
        if (loginInfo.primeid_fromData == loginInfo.primeid) {
          api = "/banc/setpersoninfo?update=own";
        } else if (loginInfo.primeid_fromData != loginInfo.primeid) {
          api = "/banc/setpersoninfo?update=other";
        }
        if (isAuthorized(Res, api, loginInfo.authgroup)) {
          flow_step = 2;
          dHelper.processPersonsInfo(primeInfo, spouseInfo, depInfo, address, primecomm, loginInfo, setPersonsCB);
        }
      } else {
        sendJsonResponse(Res, outRes);
      }
      return;
    }

    if (flow_step == 2) {
      outRes = output;
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  //
});
//

/*
 * This is a test example for calling an external api
 * You have to define a Callback function inside this function because
 * you have to get access to the req, lRes objects.
 * The Callback function also contains a response object (rRes) from the remote server.
 */

/*
*  Login protected AP -- It gets the person informaion based on the login id
*/
app.get("/banc/getPrime", (req, Res) => {
  //
  //
  console.log("====== API Called: ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, fname, lname, mname, uid, email;
  var flow_step = 0;
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
  }

  dHelper.isTokenValid(uid, email, token, aPrimeCB)
  //
  //
  function aPrimeCB(output) {
    console.log("aPrimeCB - ", flow_step, " - ", output);
    if (output.err) {
      sendJsonResponse(Res, output);
      return;
    }
    //
    console.log(output.sq11_result);
    if (flow_step == 0) {
      if (output.token_valid) {
        flow_step = 1;
        let primeid = output.primeid;
        dHelper.getPrimeMember(null, null, null, email, primeid, aPrimeCB);
        return;
      }
      sendJsonResponse(Res, output); // Invalid token found.
      return

    } else {

      sendJsonResponse(Res, output);
      return;

    }
  }
  //
  //dHelper.getPrimeMember(fname, mname, lname, email, null, aPrimeCB);
});
/*
*  Login protected AP -- It gets the person informaion based on the login id
*/
app.get("/banc/getPersonAndPrime", (req, Res) => {
  //
  //
  console.log("====== API Called: ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, fname, lname, mname, uid, email;
  var flow_step = 0;
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
  }

  dHelper.isTokenValid(uid, email, token, aPrimeCB)
  //
  //
  function aPrimeCB(output) {
    console.log("aPrimeCB - ", flow_step, " - ", output);
    if (output.err) {
      sendJsonResponse(Res, output);
      return;
    }
    //
    console.log(output.sq11_result);
    if (flow_step == 0) {
      if (output.token_valid) {
        flow_step = 1;
        let primeid = output.primeid;
        dHelper.getPrimeMember(null, null, null, email, primeid, aPrimeCB);
        return;
      }
      sendJsonResponse(Res, output); // Invalid token found.
      return

    } else {

      sendJsonResponse(Res, output);
      return;

    }
  }
});
/**
 * PAY Membership / event 
 */

app.post("/banc/topaymembership", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.token;
  const email_token = req.query.email;
  const prime = req.body.entity_id;
  const txnId = req.body.transaction_id;
  const mType = req.body.membership_type;
  const year = req.body.year;
  const fname = req.body.firstname;
  const lname = req.body.lastname;
  const mname = req.body.middlename;
  const email = req.body.email;
  let mTypeInfo = dHelper.getAffiliationInfo(mType);
  let type = mTypeInfo[1];
  let mId = mTypeInfo[0];
  //
  var sqlStmt = "CALL renewMembership(" + `${prime}, '${fname}', '${mname}', '${lname}','${email}','${type}', ${mId}, ${year});`;
  console.log(sqlStmt);

  function aPayMemCB(result, err) {
    var output = {
      "prime": "Payment done!",
      "token": token
    };
    sendJsonResponse(Res, output);
  }
  //
  dHelper.executeStoreProc(sqlStmt, aPayMemCB);

});
//
/**
 * Get Link Info API 
 */
app.get("/banc/getAssociationTypeInfo", (req, Res) => {
  var output = {
    "affiliation": null,
    "msg": null
  };
  output.affiliation = dHelper.getAffiliationTypeInfo();
  sendJsonResponse(Res, output);
});
/**
 * Get Event Info API 
 */
app.get("/banc/getEventInfo", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  const fromType = calledServiceURL.split("?");
  //
  var events = dHelper.getEventInfo();
  var year = req.query.year;
  const toType = (req.query.formatType) ? req.query.formatType : "arrayFormat";
  var outRes = {
    "events": {},
    "year": null,
    "msg": null
  };
  if (events[year] === undefined) {
    outRes.events = events;
  } else {
    outRes.events[year] = events[year];
    outRes.year = year;
  }
  //console.log("Requested year: ", year);
  sendJsonResponse(Res, outRes, fromType[0], toType);
});
//
/**
 * Get Event Info API 
 */
app.get("/banc/getTransactionType", (req, Res) => {
  var output = {
    "transaction_type": null,
    "msg": null
  };
  output.transaction_type = dHelper.getTransactionType();
  sendJsonResponse(Res, output);
});
//
/**
 * Get Member Info API 
 */
app.get("/banc/getmemberinfo", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email;
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
    formatType = req.header("formatType");
    const fname = req.header("fname");
    const lname = req.header("lname");
    const mname = req.header("mname");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if ((req.query).hasOwnProperty('fname') && (req.query).hasOwnProperty('lname') && (req.query).hasOwnProperty('mname')) {
      const fname = req.query.fname;
      const lname = req.query.lname;
      const mname = req.query.mname;
    }
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var outRes = {
    "prime": null,
    "spouse": null,
    "deps": [],
    "address": null,
    "primecomm": null,
    "msg": null,
    "err": null
  };

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.token_valid) {
        personid = output.personid;
        primeId = output.primeid;
        console.log(primeId, personid);
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        dHelper.getPrimeMember(null, null, null, null, primeId, aMembersCB);
      } else {
        resultSeq = -1;
        outRes.msg = "Session token could not be validated!";
        sendJsonResponse(Res, outRes);
      }
    } else {
      resultSeq = -1;
      outRes.msg = output.err;
      sendJsonResponse(Res, outRes);
    }
  }
  //
  function aMembersCB(output) {
    var sql1_result = null;
    var sql2_result = null;

    var result, row;
    if (output.err) {
      outRes.err = output.err;
      outRes.msg = "SQL Error occurred!";
    }
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);

    if (resultSeq == 0) {
      if (output.found) {

        console.log("resultSeq=0", output.prime);
        resultSeq = 1;
        primeId = output.prime.entity_id;
        console.log(primeId);
        outRes["prime"] = output.prime;
        //console.log(outRes);
        dHelper.associatedPersons(primeId, aMembersCB);
        return;
      } else {
        outRes.msg = output.err_msg;
        outRes.err = output.err;
        resultSeq = 4;
      }
    } else if (resultSeq == 1) {
      /*
      result = sql1_result.rows;
      resultSeq = 2;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          if (row.dependent == 1) {
            outRes.deps.push(row);
          } else {
            outRes["spouse"] = row;
          }
        });
      } */
      resultSeq = 2;
      if (output.depsCount > 0) outRes.deps = output.deps;
      outRes["spouse"] = output.spouse;
//
      dHelper.associatedAddress(primeId, aMembersCB);
      dHelper.associatedFamilyComm(primeId, aMembersCB);
    } else if (resultSeq > 1) {
      result = sql1_result.rows;
      resultSeq = resultSeq + 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          if (row.street) {
            outRes["address"] = row;
          } else {
            outRes["primecomm"] = row;
          }
        });
      }
    }
    console.log(outRes);
    if (resultSeq > 3) {
      sendJsonResponse(Res, outRes, calledServiceURL, formatType);
    }
    return;
  }
  //
  dHelper.isTokenValid(uid, email, token, aValidateCB);

});
/**
 * Get registered events by a member API 
 */
app.get("/banc/getRegisteredEvents", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email, year;
  year = (new Date()).getFullYear();
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
    year = req.header("year");
    formatType = req.header("formatType");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if ((req.query).hasOwnProperty('year')) {
      year = req.query.year;
    }
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  var row;
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var auth = 0;
  var outRes = {
    "events": [],
    "msg": null
  };

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.token_valid) {
        personid = output.personid;
        primeId = output.primeid;
        console.log(primeId, personid);
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        dHelper.getRegisteredEvents(primeId, year, anEventCB);
      } else {
        resultSeq = -1;
        outRes.msg = "Session token could not be validated!";
        sendJsonResponse(Res, outRes);
      }
    } else {
      resultSeq = -1;
      outRes.msg = output.err;
      sendJsonResponse(Res, outRes);
    }
  }
  function anEventCB(output) {
    var sql1_result = null;
    var sql2_result = null;
    if (output.err) {
      outRes.err = output.err;
      outRes.msg = "SQL Error occurred!";
    }
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
    if (resultSeq == 0) {
      outRes.events = sql1_result.rows;
      //console.log(outRes);
      resultSeq = 1;
      sendJsonResponse(Res, outRes, calledServiceURL, formatType);
      return;
    }
  }
  //
  dHelper.isTokenValid(uid, email, token, aValidateCB);
  return;
});
//
/**
 * Get transactions by a member or all members API 
 */
app.get("/banc/getTransactions", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email;
  var dateFrom = null;
  var dateTo = null;
  //
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
    formatType = req.header("formatType");
    dateFrom = req.header("dateFrom");
    dateTo = req.header("dateTo");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if ((req.query).hasOwnProperty('dateFrom')) {
      dateFrom = req.query.dateFrom;
    }
    if ((req.query).hasOwnProperty('dateTo')) {
      dateTo = req.query.dateTo;
    }
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var outRes = {
    "transactions": [],
    "msg": null
  };

  function aValidateCB(output) {

    if (output.err === null) {
      if (output.token_valid) {
        personid = output.personid;
        primeId = output.primeid;
        console.log(primeId, personid);
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        dHelper.getTransactions(primeId, dateFrom, dateTo, null, aTxnCB);
      } else {
        resultSeq = -1;
        outRes.msg = "Session token could not be validated!";
        sendJsonResponse(Res, outRes);
      }
    } else {
      resultSeq = -1;
      outRes.msg = output.err;
      sendJsonResponse(Res, outRes);
    }
  }

  function aTxnCB(output) {
    var sql1_result = null;
    var sql2_result = null;
    if (output.err) {
      outRes.err = output.err;
      outRes.msg = "SQL Error occurred!";
    }
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
    if (resultSeq == 0) {
      outRes.transactions = sql1_result.rows;
      //console.log(outRes);
      resultSeq = 1;
      sendJsonResponse(Res, outRes, calledServiceURL, formatType);
      return;
    }
  }
  //
  dHelper.isTokenValid(uid, email, token, aValidateCB);

});
/**
 * Get transactions by a member or all members API 
 */
app.get("/banc/getMembershipPaid", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email;
  var yearFrom = null;
  var yearTo = null;
  //
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
    formatType = req.header("formatType");
    yearFrom = req.header("yearFrom");
    yearTo = req.header("yearTo");
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if ((req.query).hasOwnProperty('yearFrom')) {
      yearFrom = req.query.dateFrom;
    }
    if ((req.query).hasOwnProperty('yearTo')) {
      yearTo = req.query.dateTo;
    }
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var outRes = {
    "membership": [],
    "msg": null
  };
  //

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.token_valid) {
        personid = output.personid;
        primeId = output.primeid;
        console.log(primeId, personid);
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        dHelper.getBANCMembershipPaid(primeId, yearFrom, yearTo, null, aMemCB);
      } else {
        resultSeq = -1;
        outRes.statusCode = 401;
        outRes.msg = "Session token could not be validated!";
        sendJsonResponse(Res, outRes);
      }
    } else {
      resultSeq = -1;
      outRes.msg = output.err;
      sendJsonResponse(Res, outRes);
    }
  }
  function aMemCB(output) {
    var sql1_result = null;
    var sql2_result = null;
    if (output.err) {
      outRes.err = output.err;
      outRes.msg = "SQL Error occurred!";
    }
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
    if (resultSeq == 0) {
      outRes.membership = sql1_result.rows;
      //console.log(outRes);
      resultSeq = 1;
      sendJsonResponse(Res, outRes, calledServiceURL, formatType);
      return;
    }
  }
  //
  dHelper.isTokenValid(uid, email, token, aValidateCB);
  return;
});

//
/**
 * Member Is Member api ==> /banc/findPerson (Open to all)
 */
app.post("/banc/findPerson", (req, Res) => {
  //
  //
  console.log("====== Request FindPerson API ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var flow_step = 0;
  var sqlStmt;
  var dt, prime, entity_id;
  var currentYear = (new Date()).getFullYear();
  //  
  const email = req.body.email;
  const fname = req.body.firstname;
  const lname = req.body.lastname;
  const mname = req.body.middlename;
  const strict = req.body.strict;
  const year = req.body.year || null;
  var outRes = {
    "spouse": false,
    "deps": 0,
    "address": false,
    "primecomm": false,
    "membership": {
      "status": "unknown",
      "year_request": year,
      "paid": []
    },
    "found": false,
    "primeid": 0,
    "person": {
      "firstname": fname,
      "middlename": mname,
      "lastname": lname,
      "email": email,
      "prime": false
    },
    "event": {
      "paid": [],
      "current_year": currentYear
    }
  };
  // Test validity of input params
  if (validator.findPersonData(fname, mname, lname, email, year) == false) {
    console.log("validation failed!")
    sendJsonResponse(Res, outRes);
    return;
  }
  if (strict) {
    sqlStmt = "SELECT * FROM banc.person WHERE firstname=$1 and lastname=$2 and middlename=$3 and email=$4;";
  } else {
    sqlStmt = "SELECT * FROM banc.person WHERE (firstname=$1 and lastname=$2 and middlename=$3) or (email=$4);";
  }
  dt = [fname, lname, mname, email];
  //console.log("=== ", sqlStmt, dt);
  execute1SqlsWithCommit(dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false), aFindPersonCB);

  // This function manages the business flow for the work
  //
  function aFindPersonCB(output) {
    //
    var i;
    var row;
    var name;
    let err = output.err;
    let err_msg = output.err_msg;
    var sql1_res = JSON.parse(output.sql1_result);
    let rowCount = sql1_res.rowCount;

    console.log("aFindPersonCB/flow_step: ", flow_step);
    //console.log("SQL1 -->", output);
    //console.log(sql1_res.rows[0], " Rows returned; ", rowCount);
    //
    if (err != null) {
      flow_step = -1;
      console.log("flow_step - set: ", flow_step);
    }
    //
    switch (flow_step) {
      //
      // Process person and find if prime
      case 0:

        if (rowCount == 0) {
          sendJsonResponse(Res, outRes);
          return;
        }


        // let prime= dHelper.getValueFromJSON("prime", sql1_res.rows[0], null);
        // let entity_id = dHelper.getValueFromJSON("entity_id", sql1_res.rows[0], "int");
        prime = sql1_res.rows[0].prime;
        entity_id = sql1_res.rows[0].entity_id;
        console.log("PRIME ", prime, entity_id);

        outRes.found = true;
        outRes.person.prime = prime;
        //
        if (prime == true) {

          sqlStmt = "Select entity2_id, entity1, entity2, name, link_type_id from banc.association_link where entity1_id=$1";
          dt = [entity_id];
          outRes.primeid = entity_id;
          flow_step = 2;
        } else {
          sqlStmt = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
            "where entity1='person' and entity2='person' and entity2_id=$1);";
          dt = [entity_id];
          flow_step = 1;
        }
        //console.log(outRes);
        //console.log(sqlStmt);
        execute1SqlsWithCommit(dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false), aFindPersonCB);
        return;
      //
      // Case process prime person
      case 1:
        //console.log(sql1_res.rows[0], sql1_res.rows[0].prime);
        //entity_id = sql1_res.rows[0]["entity_id"];
        //prime = sql1_res.rows[0].prime;

        entity_id = dHelper.getValueFromJSON("entity_id", sql1_res.rows[0], "int");
        prime = dHelper.getValueFromJSON("prime", sql1_res.rows[0], null);
        sqlStmt = "Select entity2_id, entity1, entity2, name, link_type_id from banc.association_link where entity1_id=$1";
        dt = [entity_id];
        outRes.primeid = entity_id;
        flow_step = 2;
        execute1SqlsWithCommit(dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false), aFindPersonCB);
        return;
      //
      // Process associations of a prime person
      case 2:

        for (i = 0; i < sql1_res.rowCount; i++) {
          row = sql1_res.rows[i];
          // name = dHelper.getValueFromJSON("name", row, null);
          name = row.name;
          console.log(name, row);
          if (name == "spouse") {
            outRes.spouse = true;
          }
          if (name == "child") {
            outRes.deps = outRes.deps + 1;
          }
          if (name == "address Of") {
            outRes.address = true;
          }
          if (name == "primary_communication") {
            outRes.primecomm = true
          }
        }
        sqlStmt = "Select entity2_id, name, year, renewal_date, entity1, entity2 from banc.community_link where entity1_id=$1"
        dt = [outRes.primeid];
        flow_step = 3;
        execute1SqlsWithCommit(dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false), aFindPersonCB);
        return;
      //
      // Process Membership
      case 3:
        var yr;
        for (i = 0; i < sql1_res.rowCount; i++) {
          row = sql1_res.rows[i];
          // name = dHelper.getValueFromJSON("name", row, null);
          yr = row.year;
          outRes.membership["paid"].push(yr);

          if (yr == year) {
            outRes.membership["status"] = "current";
          }

        }

        sqlStmt = "Select al.name, e.eventname, e.event_year from banc.event e, banc.association_link al where " +
          "al.entity1_id=$1 and al.entity2_id=e.entity_id and entity1='person' and entity2='event' and event_year=$2;";
        dt = [outRes.primeid, currentYear];
        flow_step = 4;
        execute1SqlsWithCommit(dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false), aFindPersonCB);
        return;
      //
      case 4:
        for (i = 0; i < sql1_res.rowCount; i++) {
          row = sql1_res.rows[i];
          var ev = {
            "registered": row.name,
            "eventname": row.eventname,
            "event_year": row.event_year
          };

          outRes.event["paid"].push(ev);
        }
        // remove primeid -- stored for query
        outRes.primeid = -1;
        sendJsonResponse(Res, outRes);
        return;
      // Process error
      default:
        console.log("Default -- why?")
        console.log(err);
        console.log(err_msg);
        outRes.err = err;
        sendJsonResponse(Res, outRes);
        return;
    }
  }
});
//
//
/**
 * Member Is Member api ==> /banc/ismember query:{userid, stoken, email} 
 */
app.get("/banc/ismember", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email, year, primeid;
  var fname, lname, mname, personemail;
  if (useHeader) {
    token = req.header("stoken");
    email = req.header("email");
    uid = req.header("userid");
    formatType = req.header("formatType");
    fname = req.header("fname");
    lname = req.header("lname");
    mname = req.header("mname");
    personemail = req.header("personemail");
    year = req.header("year") || null;
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    year = req.query.year || null;
    if ((req.query).hasOwnProperty('fname') && (req.query).hasOwnProperty('lname') && (req.query).hasOwnProperty('mname')) {
      fname = req.query.fname;
      lname = req.query.lname;
      mname = req.query.mname;
      personemail = req.query.personemail;
    }
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  var flow_step = 0;
  var outRes = {
    "membership": [],
    "status": "unknown",
    "year": year,
    "found": false,
    "isPersonPrime": false,
    "prime": {},
    "person": {},
    "error": null,
    "err_msg": null
  };
  var flow_step = 0;
  //
  dHelper.isTokenValid(uid, email, token, aMembershipCB);
  //
  function aMembershipCB(output) {
    if (output.err) {
      outRes.err = output.err;
      outRes.err_msg = "Ismember error."
      sendJsonResponse(Res, outRes);
      return;
    } else {
      if (flow_step == 0) {
        if (!output.token_valid) {
          outRes.err_msg = "Invalid token sent!"
          outRes.statusCode = 401;
          sendJsonResponse(Res, output);
          return;
        }
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 1;
        dHelper.getPersonWithPrime(fname, mname, lname, personemail, 0, 0, aMembershipCB);
        //
      } else if (flow_step == 1) {
        flow_step = 2;
        outRes.prime = JSON.parse(output.prime).rows[0];
        outRes.person = JSON.parse(output.person).rows[0];
        outRes.isPersonPrime = output.isPersonPrime;
        outRes.found = output.found;
        console.log(outRes);
        primeid = outRes.prime.entity_id;
        dHelper.ismember(primeid, year, aMembershipCB);
        return;
      } else {
        var result = dHelper.getRowsFrom(output, 1);
        if (Array.isArray(result) && result.length) {
          Object.keys(result).forEach(function (key) {
            var row = result[key];
            if (row.year == year) {
              outRes.status = "current";
            }
            outRes["membership"].push(row);
          });
        }
        sendJsonResponse(Res, outRes);
      }
    }

  }
});
//
/**
 * Member Login api ==> /banc/login body:{userid, pwd, email, cell(opt)}, output:{msg, sessiontoken, primeid, personid}
 */
app.post("/banc/login", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var flow_step = 0;
  var outRes = {
    "msg": "You could not be logged in.  Wrong with userid, email or password!",
    "auth": false,
    "primid": -1,
    "stoken": null,
    "persnid": -1,
    "error": null
  };
  //
  // read input data
  var mail = req.body.email;
  var uid = req.body.userid;
  var pwd = req.body.pwd;
  var cell = req.body.cell;
  // Test validity of input params
  if (validator.loginData(uid, mail, cell) == false) {
    sendJsonResponse(Res, outRes);
    return;
  }

  //
  var sqlStmt = "select * from banc.getauthtoken(" + `'${uid}', '${pwd}', '${mail}', '${cell}');`;
  console.log(sqlStmt);
  execute2SqlTxn(dHelper.setDbCallData("login", sqlStmt, null, null, null, false), aLoginCB);

  function aLoginCB(output) {
    //
    let err = output.err;
    let err_msg = output.err_msg;
    var sql1_res = JSON.parse(output.sql1_result);
    var sql2_res = JSON.parse(output.sql2_result);

    console.log("aLoginCB/flow_step: ", flow_step);
    console.log("SQL1 -->", sql1_res.rows);
    if (err != null) {
      flow_step = -1;
      console.log("flow_step - set: ", flow_step);
    }
    switch (flow_step) {
      case 0:
        outRes.auth = sql1_res.rows[0].auth;
        outRes.persnid = sql1_res.rows[0].persnid;
        outRes.primid = sql1_res.rows[0].primid;
        outRes.stoken = sql1_res.rows[0].stoken;
        outRes.msg = "You're successfully logged in!";
        // Send response
        sendJsonResponse(Res, outRes);
        return;
      default:
        outRes.msg = "You're not logged in: " + err_msg;
        outRes.error = output.err;
        sendJsonResponse(Res, outRes);
    }

  }
});

/*
*  registering an account with banc.  
*/

app.post("/banc/register", (req, Res) => {
  //
  console.log("====== API Called ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  // read input data
  var fname = req.body.firstname;
  var mname = req.body.middlename;
  var lname = req.body.lastname
  var email = req.body.email;
  var uid = req.body.userid;
  var pwd = req.body.pwd;
  var cell = req.body.cell;
  var outRes;
  if (!validator.registrationData(fname, mname, lname, uid, email, cell)) {
    outRes = {
      "msg": "Registration failed.",
      "err": true,
      "err_msg": "Registration aborted - incorrect data"
    };
    sendJsonResponse(Res, outRes, null, null);
    return;
  }
  var flow_step = 0;
  var cond = 0;
  var personid = -1;
  var primeid = -1;
  //
  dHelper.getPersonWithPrime(fname, mname, lname, email, 0, 0, aSetCredsCB);
  //
  function aSetCredsCB(output) {
    console.log("aSetCredsCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes = {
        "msg": "Error: Registration failied. Systemic error.",
        "err": output.err,
        "err_msg": output.msg
      };
      sendJsonResponse(Res, outRes);
      return;
    }
    //
    if (flow_step == 0) {
      let prime = JSON.parse(output.prime);
      let person = JSON.parse(output.person);
      if (prime.rowCount == 0 && person.rowCount == 0) {
        let msg1 = { "msg": "Could not find person or prime of the person or the person is not a member. Registration Failed." };
        sendJsonResponse(Res, msg1);
        return;
      }
      flow_step = 1;
      primeid = prime.rows[0].entity_id;
      personid = person.rows[0].entity_id;
      //
      var data_json = {
        "sql1": "SELECT banc.setupcredential(" + `'${uid}', '${pwd}', '${email}', ${personid}, ${primeid},'${cell}', ${cond});`,
        "name": "Executing register/setupcredentail",
        "args1": null,
        "cond": true
      }
      //
      execute1SqlsWithCommit(data_json, aSetCredsCB);
      return;
      //
    } else {
      var res = JSON.parse(output.sql1_result);
      //console.log(res);

      outRes = {
        "msg": null,
        "err": output.err,
        "err_msg": output.err_msg
      };
      if (res.rowCount > 0) {
        outRes.msg = res.rows[0].setupcredential;
      }
      sendJsonResponse(Res, outRes);
    }

  }
});
/*
*  pay for membership/event/donation
*/
app.post("/banc/pay", (req, Res) => {
  //
  console.log("====== API Called ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var test = {};
  //var execute1SqlsWithCommit = execute1SqlsWithCommit.bind(this);
  // read input data
  var payData = req.body.pay_data;
  var form_ref_id = req.body.form_ref_id;
  var form_memo = req.body.form_memo;
  var form_date = req.body.form_date;

  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes;
  var loginInfo = {
    "uid": null,
    "email": null,
    "personid": 0,
    "primeid": 0,
    "isValid": false
  };
  console.log(payData);
  //
  test = validator.payRawData(payData.person, payData.event, payData.membership,
    payData.transactions, form_ref_id, form_date);
  console.log(test);
  if (!test.valid) {
    outRes = {
      "msg": "Verifying banc transaction data. Inalid Pay Data submitted. " + test.msg,
      "err": true,
      "err_msg": "payData aborted - incorrect data"
    };
    sendJsonResponse(Res, outRes);
    return;
  }
  var flow_step = 0;
  dHelper.isTokenValid(uid, email, token, aPaySubmitCB);
  //
  function aPaySubmitCB(output) {
    var sql1_result = null;        //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    console.log("aPaySubmitCB - ", flow_step, " - ", output);
    if (flow_step == 0) {
      if (output.err) {
        outRes = {
          "msg": "Error Token validation failied! ",
          "err": output.err,
          "err_msg": output.msg
        };
        let validPersonData = {};
        validPersonData = validator.personData(payData.person, null);
        if (!validPersonData.valid) {
          outRes.msg = outRes.msg + "person data supplied not valid!  Pay submission aborted! " + validPersonData.msg;
          sendJsonResponse(Res, outRes);
          return;
        }
        flow_step = 1;

      } else {
        //
        if (output.token_valid) {
          loginInfo.uid = uid;
          loginInfo.email = email;
          loginInfo.personid = output.personid;
          loginInfo.primeid = output.primeid;
          loginInfo.isValid = true;
        }
        flow_step = 1;
      }
    }
    //
    if (flow_step == 1) {
      var rdata = {
        "loginInfo": loginInfo,
        "pay_data": payData,
        "form_date": form_date,
        "form_ref": form_ref_id,
        "form_memo": form_memo
      };
      flow_step = 2;
      let email;
      if (output.token_valid) {
        email = loginInfo.email;
      } else {
        email = payData.person.email;
      }
      console.log("Rdata: ", rdata);
      let sql1 = "INSERT INTO banc.unprocessed_data (form_ref_id, banc_transaction_data, email) " +
        "VALUES ($1, $2, $3) RETURNING form_ref_id, created_date;";

      let mydata = {
        "name": "pay api: unprocessed data",
        "cond": true,
        "sql1": sql1,
        "args1": [form_ref_id, rdata, email]
      }
      execute1SqlsWithCommit(mydata, aPaySubmitCB);
      return;
      //
    }
    if (flow_step == 2) {
      outRes = {
        "msg": "Pay data stored for processing after Payment.",
        "err": null,
        "result": null,
        "err_msg": null
      };
      if (output.err) {
        outRes.msg = "Pay data storing task failed and Payment is blocked!"
      } else {
        if (sql1_result.rowCount > 0) {
          outRes.result = sql1_result.rows[0];
        } else {
          outRes.msg = "Unknown error is submission";
        }
        sendJsonResponse(Res, outRes);
      }
    }
  }
});
/*
*  pay pal confirmation received
*/
app.post("/banc/ppalconfirmed", (req, Res) => {
  //
  console.log("====== API Called ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var ppalrcpt = req.body;
  //
  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes;

  console.log(ppalrcpt);
  outRes = {
    "msg": "Received Pay Pal confirmation.  Not yet Processed.",
    "ppal_receipt": ppalrcpt,
    "err": false,
    "err_msg": "None"
  };
  sendJsonResponse(Res, outRes);
  return;

});
/*
*  process "unprocessed data"
*  structure of the body is
*  body = {
            form_ref_id:value, form_memo:value, form_date:value, payData: { person:{}, membership:{}, 
            events:{}, transactions:[transaction object]},
            paypal:[], cash:[]
          }
*/
app.post("/banc/processPayData", (req, Res) => {
  //
  console.log("====== API Called ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var form_ref_id = req.header("form_ref_id");
  let clientid = req.header("clientid");
  let apikey = req.header("apikey");
  var outRes = {
    "prime": null,
    "form_ref_id": null,
    "membership": null,
    "events": null,
    "summary": null,
    "settlement": null,
    "msg": "",
    "err": null,
    "statusCode": 200,
    "err_msg": null
  };
  // Verifiy if this can be called
  if (!dHelper.verifyClientIdAccess(calledServiceURL,clientid, apikey)){
    outRes.msg="Unauthorized to call!";
    outRes.statusCode = 403;
    sendJsonResponse(Res, outRes, calledServiceURL, null);
    return;    
  }
  /*
  *  INSERT code to block REMOTE CALL. (write this code when functioning)
  */
  var sql1;
  if (form_ref_id != null || typeof form_ref_id != 'undefined') {
    sql1 = "SELECT form_ref_id, banc_transaction_data, settlement_data, banc_data_processed, settlement_data_processed " +
      ` FROM banc.unprocessed_data WHERE banc_data_processed=false and settlement_data_processed=false and form_ref_id='${form_ref_id}';`;
  } else {
    sql1 = "SELECT form_ref_id, banc_transaction_data, settlement_data, banc_data_processed, settlement_data_processed " +
      ` FROM banc.unprocessed_data WHERE banc_data_processed=false and settlement_data_processed=false FETCH FIRST 1 ROW ONLY;`;
  }
  //
  var raw_data;
  var flow_step = 0;
  var cond = true;
  execute1SqlsWithCommit(dHelper.setDbCallData("Processing unprocessed data", sql1, null, null, null, cond), aProcessDataCB);
  //
  function aProcessDataCB(output) {
    var sql1_result = null;
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
   // console.log("aPaySubmitCB - ", flow_step, " - ", sql1_result);
    if (output.err) {
      outRes.msg = "Error: Database execution error!";
      outRes.err = output.err;
      outRes.err_msg = output.msg;
      sendJsonResponse(Res, outRes, calledServiceURL, null);
      return;
    }
    // flow_step = 0
    if (flow_step == 0) {
      if (sql1_result.rowCount == 0) {
        outRes.msg = "No Pay data retrived with condition - banc_data_processed=false. & form_ref_id =" + form_ref_id;
        outRes.raw_data = null;
        outRes.settlement_data = null;
        sendJsonResponse(Res, outRes, calledServiceURL, null);
        return;
      }
      // Found a row -- contain banc_transaction data unprocessed.  Now find the prime and person entity id for the submitter
      flow_step = 1;
      let row = sql1_result.rows[0];
      raw_data = JSON.parse(row["banc_transaction_data"]);
      outRes.form_ref_id = row.form_ref_id;
      let jData = raw_data.pay_data.person;
      dHelper.getPersonWithPrime(jData.firstname, jData.middlename, jData.lastname, jData.email, null, null, aProcessDataCB);
      return;
    }
    // Process prime and person info if found -- got to step 4. Otherwise, go to step 2 to insert the person as prime
    if (flow_step == 1) {
      flow_step = 2;
      if (output.found) {
        let prime = JSON.parse(output.prime);
        outRes.prime = prime.rows[0];
        outRes.found = true;
        flow_step = 4;
      }
    }
    //  Step 2 to insert the person as prime then go to step 3
    if (flow_step == 2) {
      let jData = raw_data.pay_data.person;
      jData.affiliationid = 0;
      let key = null;
      let primeid = 0;
      let prime = 1;
      let dep = 0;
      let isMinor = 0;
      flow_step = 3;
      dHelper.executePersonSQL(jData, primeid, prime, dep, isMinor, key, aProcessDataCB);
    }
    //  Process prime information from step 2 and proceed to step 4
    if (flow_step == 3) {
      if (sql1_result.rowCount == 0) {
        outRes.msg = "Systemic error: Could not insert prime person but verified no such person for form_ref_id: " + form_ref_id;
        outRes.err = true;
        sendJsonResponse(Res, outRes, calledServiceURL, null);
        return;
      }
      outRes.prime = sql1_result.rows[0];
//      console.log("Prime inserted: ", outRes.prime);
      flow_step = 4;
    }
    if (flow_step == 4) {
      let primeid2Use = outRes.prime.entity_id;
      flow_step = 5;
      //let payData = raw_data.payData;
//      console.log(raw_data);
      dHelper.processPayData(raw_data, primeid2Use, aProcessDataCB);
      return;
    }
    if (flow_step == 5) {
      outRes.membership = output.membership;
      outRes.events = output.events;
      outRes.summary = output.summary;
      outRes.msg = "Banc Pay Data processed for id: " + outRes.form_ref_id;
      flow_step = 6;
      let banc_transaction = true;
      let settlement = false;
      dHelper.updateUnprocessedDataTable(outRes, banc_transaction, settlement, aProcessDataCB);
      return;
    }
    if (flow_step == 6) {
      sendJsonResponse(Res, outRes, calledServiceURL, null);
      return;
    }
  }
});
/**
 * Start the server 
 */
const PORT = process.env.PORT || port;
server.listen(PORT, () => {
  console.log("BANC Server Started on: " + PORT);
});