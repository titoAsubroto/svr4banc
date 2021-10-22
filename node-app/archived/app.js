// @ts-check
// Modified on Oct 14, 2020
//
const fs = require("fs"),
  http = require("http"),
  https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const banc = require("./banc_class_pg.js");
//const WPForms = require("./wp_forms.js");
const mailer = require("./banc_nodemailer.js");
const outputConvertor = require("./output_convertor_FF.js");
const { Pool } = require("pg");
const app = express();
var port = 8000;
//
//var calledServiceURL = "";
const verbose = true;
const useHeader = true;
const dHelper = new banc.SetupDataHelper(verbose);
const validator = new banc.DataValidator(verbose);
//const formsHandler = new WPForms.WPFormsHandler(verbose);
const respConvertor = new outputConvertor.OutputConvertor(verbose);
const dbSchema = dHelper.getActiveSchema();
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
    sql1_result: null,
    err: null,
    err_msg: null,
  };
  pool.connect((err, client, done) => {
    const shouldAbort = (err) => {
      if (err) {
        output.err = err;
        output.msg = "Error in transaction: " + name;
        console.error("Error in transaction", err.stack);
        if (cond) {
          client.query("ROLLBACK", (err) => {
            if (err) {
              console.error("Error rolling back client", err.stack);
            }
          });
        }
        // release the client back to the pool
        client.release();
        //done()
      }
      console.log(output);
      return !!err;
    };
    // Output sent to callback;

    console.log("Transaction - Begin", sql1);
    client.query("BEGIN", (err) => {
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
          client.query("COMMIT", (err) => {
            console.log(
              "No Transaction Sql2 for name: " + name + ". Executed COMMIT. "
            );

            if (err) {
              console.error("Error committing transaction", err.stack);
            }
          });
        }
        client.release();
        // done();
        //console.log("After Commit: ", output);
        return aCallback(output);
      });
    });
  });
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
    sql1_result: null,
    sql2_result: null,
    err: null,
    err_msg: null,
  };
  pool.connect((err, client, done) => {
    const shouldAbort = (err) => {
      if (err) {
        output.err = err;
        output.msg = "Error in transaction: " + name;
        console.error("Error in transaction", err.stack);
        client.query("ROLLBACK", (err) => {
          if (err) {
            console.error("Error rolling back client", err.stack);
          }
          // release the client back to the pool
          client.release();
          //done()
        });
        console.log(output);
      }
      return !!err;
    };
    // Output sent to callback;

    console.log("Transaction - Begin");
    //console.log("Before begin: ", output);
    client.query("BEGIN", (err) => {
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
            client.query("COMMIT", (err) => {
              if (err) {
                output.err = err;
                output.err_msg = "Error committing transaction";
                console.error("Error committing transaction", err.stack);
              }
              client.release();
              //done();
              return aCallback(output);
            });
          });
        } else {
          client.query("COMMIT", (err) => {
            console.log(
              "No Transaction Sql2 for name: " + name + ". Executed COMMIT. "
            );

            if (err) {
              console.error("Error committing transaction", err.stack);
            }
            client.release();
            // done();
            //   console.log("After Commit: ", output);
            return aCallback(output);
          });
        }
      });
    });
  });
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
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

/**
 * The security configuration file that sets up HTTP or HTTPS
 */
const securityConfig = JSON.parse(
  fs.readFileSync("security-config.json", "utf8")
);

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
    rejectUnauthorized: false,
  };
  // get https port
  port = dHelper.getConfig().https_port;

  /*
   * Client certification
   
  app.use((req, res, next) => {
    const clientUnauthorized = function () {
      res.status(401).send("Client is not authorized");}
    if (!req.client.authorized) {
      return clientUnauthorized();
    }

    const cert = req.socket.getPeerCertificate();

    if (!cert.subject || cert.subject.CN !== securityConfig.gatewayCN) {
      return clientUnauthorized();
    }

    next();
  });
*/
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
    msg: "Unauthorized to execute",
    error: "UNAUTHORIZED",
    statusCode: 403,
  };
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
    firstname: "Subroto",
    lastname: "Bhattacharji",
    middlename: "",
    email: "subroto@computer.org",
    telephone: "9194607990",
    mobile: "9193451714",
  };
  //dHelper.testFunction(req, Res);
  dHelper.executePersonSQL(jData, 0, true, false, false, null, testCallCB);

  function testCallCB(output) {
    sendJsonResponse(Res, output, null, null);
    return;
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  // console.log(req.body);
  const personInfo = req.body;
  const accessInfo = dHelper.getAccessInfo(req);
  console.log(accessInfo);
  //
  var outRes = {
    msg: null,
    err: true,
    err_msg: "Error Occurred",
    statusCode: 403,
  };
  var loginInfo = {
    uid: accessInfo.uid,
    email: accessInfo.email,
    personid: 0,
    primeid: 0,
    authgroup: 0,
    primeid_fromData: 0,
    isValid: false,
  };
  var primeInfo = personInfo["prime"];
  var spouseInfo = personInfo.spouse;
  var depInfo = personInfo.deps;
  var address = personInfo.address;
  var primarycomm = personInfo.primarycomm;
  //var validtoken = false;

  //
  if (primeInfo === null || typeof primeInfo === "undefined") {
    outRes.msg =
      "Prime person information is a mandatory input -- cannot be null or undefined.";
    sendJsonResponse(Res, outRes);
    return;
  }
  if ("update" in personInfo) {
    let update = primeInfo.update;
    if (!validator.personData(primeInfo, update)) {
      outRes.msg = "Prime person information is incomplete or undefined.";
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  if (spouseInfo != null) {
    console.log("spouse: ", spouseInfo);
    if ("update" in spouseInfo) {
      let update = spouseInfo.update;
      if (!validator.personData(spouseInfo, update)) {
        outRes.msg = "Spouse person information is incomplete or undefined.";
        sendJsonResponse(Res, outRes);
        return;
      }
    }
    if (address != null) {
      if ("update" in address) {
        let update = address.update;
        if (!validator.address(address, update)) {
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
  var flow_step = -1;
  //  Validate the caller
  dHelper.validateAccess(accessInfo, aValidateCB);
  //
  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
        //
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        loginInfo.access_option = output.access_option;
        //
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 0;
        // Call the main orchestration manage callback function now
        setPersonsCB(output);
      } else {
        outRes.msg = "Session token / client token could not be validated!";
        sendJsonResponse(Res, outRes);
        return;
      }
    } else {
      outRes.msg = output.err;
      outRes["statusCode"] = 500;
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  //
  function setPersonsCB(output) {
    console.log("flow_step: ", flow_step);
    console.log("===== set Member CB ---");
    var sql1_result = null;
    var api;
    console.log("setPersonsCB - ", flow_step, " - ", output);
    //
    if (output.err) {
      // Error occurred in DB
      outRes.err = output.err;
      outRes.err_msg = output.msg;
      sendJsonResponse(Res, outRes);
      return;
    }
    if (flow_step == 0) {
      // get the prime and person Info
      flow_step = 1;
      dHelper.getPersonWithPrime(
        primeInfo.firstname,
        primeInfo.middlename,
        primeInfo.lastname,
        primeInfo.email,
        null,
        null,
        setPersonsCB
      );
      return;
    }
    //
    if (flow_step == 1) {
      if (output.found) {
        let prime = JSON.parse(output.prime);
        loginInfo.primeid_fromData = prime.entity_id;
      }
      if (loginInfo.access_option == "client") {
        api = "/banc/setpersoninfo?update=other";
      } else {
        if (loginInfo.primeid_fromData == loginInfo.primeid) {
          api = "/banc/setpersoninfo?update=own";
        } else if (loginInfo.primeid_fromData != loginInfo.primeid) {
          api = "/banc/setpersoninfo?update=other";
        }
      }
      if (isAuthorized(Res, api, loginInfo.authgroup)) {
        flow_step = 2;
        dHelper.processPersonsInfo(
          primeInfo,
          spouseInfo,
          depInfo,
          address,
          primarycomm,
          loginInfo,
          setPersonsCB
        );
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
  var calledServiceURL = req.url;
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

  dHelper.isTokenValid(uid, email, token, aPrimeCB);
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
      return;
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);

  var token, formatType, uid, email, apikey, clientid, accessInfo;
  var flow_step = 0;
  if (useHeader) {
    accessInfo = dHelper.getAccessInfo(req);
    console.log(accessInfo);
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
  }
  if (formatType == null) {
    formatType = "default";
  }
  //
  dHelper.validateAccess(accessInfo, aPPersonCB);
  //
  function aPPersonCB(output) {
    console.log("aPPersonCB - ", flow_step, " - Output below: ");
    //console.log(output);
    if (output.err) {
      sendJsonResponse(Res, output);
      return;
      //
    } else {
      if (flow_step == 0) {
        if (output.valid) {
          flow_step = 1;
          if (output.access_option == "user") {
            let personid = output.personid;
            let primeId = output.primeid;
            console.log(primeId, personid);
            if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
              return;
            }
            dHelper.getPersonWithPrime(
              null,
              null,
              null,
              accessInfo.email,
              primeId,
              personid,
              aPPersonCB
            );
          } else if (output.access_option == "client") {
            if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
              return;
            }
            dHelper.getPersonWithPrime(
              accessInfo.fname,
              accessInfo.mname,
              accessInfo.lname,
              accessInfo.email,
              0,
              0,
              aPPersonCB
            );
          }
        } else {
          output.msg = "Session token / client token could not be validated!";
          sendJsonResponse(Res, output);
        }
      } else if (flow_step == 1) {
        console.log("------ Sending out Result form person / prime-------");
        //console.log(output)
        let outRes = {
          prime: {},
          person: {},
        };
        let prime = JSON.parse(output.prime);
        let person = JSON.parse(output.person);
        if (prime.rowCount == 1) {
          outRes.prime = prime.rows[0];
        }
        if (person.rowCount == 1) {
          outRes.person = person.rows[0];
        }
        sendJsonResponse(Res, outRes);
        return;
      }
    }
  }
  //
  /*
      console.log(output.sq11_result);
      if (flow_step == 0) {
        if (output.token_valid) {
          flow_step = 1;
          let primeid = output.primeid;
          dHelper.getPrimeMember(null, null, null, email, primeid, aPrimeCB);
          return;
        }
        sendJsonResponse(Res, output); // Invalid token found.
        return;
      } else {
        sendJsonResponse(Res, output);
        return;
      }
    } */
});
/**
 * PAY Membership / event
 */

app.post("/banc/topaymembership", (req, Res) => {
  //
  console.log("====== Request obj ====");
  var calledServiceURL = req.url;
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
  var sqlStmt =
    "CALL renewMembership(" +
    `${prime}, '${fname}', '${mname}', '${lname}','${email}','${type}', ${mId}, ${year});`;
  console.log(sqlStmt);

  function aPayMemCB(result, err) {
    var output = {
      prime: "Payment done!",
      token: token,
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
    affiliation: null,
    msg: null,
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
  var calledServiceURL = req.url;
  const fromType = calledServiceURL.split("?");
  //
  var events = dHelper.getEventInfo();
  var year = req.query.year;
  const toType = req.query.formatType ? req.query.formatType : "arrayFormat";
  var outRes = {
    events: {},
    year: null,
    msg: null,
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
    transaction_type: null,
    msg: null,
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email, apikey, clientid, accessInfo;
  var accessInfo;
  if (useHeader) {
    accessInfo = dHelper.getAccessInfo(req);
    console.log(accessInfo);
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if (
      req.query.hasOwnProperty("fname") &&
      req.query.hasOwnProperty("lname") &&
      req.query.hasOwnProperty("mname")
    ) {
      const fname = req.query.fname;
      const lname = req.query.lname;
      const mname = req.query.mname;
    }
  }

  //
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var outRes = {
    prime: null,
    spouse: null,
    deps: [],
    address: null,
    primecomm: null,
    msg: null,
    err: null,
  };
  if (formatType == null) {
    formatType = "default";
  }
  //  Validate the caller
  dHelper.validateAccess(accessInfo, aValidateCB);
  //
  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
        if (output.access_option == "user") {
          personid = output.personid;
          primeId = output.primeid;
          console.log(primeId, personid);
          if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
            return;
          }
          //dHelper.getPrimeMember(null, null, null, null, primeId, aMembersCB);
          dHelper.collateMemberInfo(
            null,
            null,
            null,
            null,
            primeId,
            aMembersCB
          );
        } else if (output.access_option == "client") {
          if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
            return;
          }
          dHelper.collateMemberInfo(
            accessInfo.fname,
            accessInfo.mname,
            accessInfo.lname,
            accessInfo.email,
            0,
            aMembersCB
          );
        }
      } else {
        resultSeq = -1;
        outRes.msg = "Session token / client token could not be validated!";
        sendJsonResponse(Res, outRes);
      }
    } else {
      resultSeq = -1;
      outRes.msg = output.err;
      outRes["statusCode"] = 500;
      sendJsonResponse(Res, outRes);
    }
  }
  //
  function aMembersCB(output) {
    if (output.err) {
      output["statusCode"] = 500;
    }
    sendJsonResponse(Res, output, calledServiceURL, formatType);

    return;
  }
});
/**
 * Get registered events by a member API
 */
app.get("/banc/getRegisteredEvents", (req, Res) => {
  //
  console.log("====== Request obj ====");
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, formatType, uid, email, year;
  year = new Date().getFullYear();
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
    if (req.query.hasOwnProperty("year")) {
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
    events: [],
    msg: null,
  };

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
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
  var calledServiceURL = req.url;
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
    if (req.query.hasOwnProperty("dateFrom")) {
      dateFrom = req.query.dateFrom;
    }
    if (req.query.hasOwnProperty("dateTo")) {
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
    transactions: [],
    msg: null,
  };

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
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
  var calledServiceURL = req.url;
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
    if (req.header.hasOwnProperty("yearFrom")) {
      yearFrom = req.header("yearFrom");
    }
    if (req.header.hasOwnProperty("yearTo")) {
      yearTo = req.header("yearTo");
    }
  } else {
    token = req.query.stoken;
    email = req.query.email;
    uid = req.query.userid;
    if (req.query.hasOwnProperty("yearFrom")) {
      yearFrom = req.query.dateFrom;
    }
    if (req.query.hasOwnProperty("yearTo")) {
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
    membership: [],
    msg: null,
  };
  //

  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var flow_step = 0;
  var sqlStmt;
  var dt, prime, entity_id;
  var currentYear = new Date().getFullYear();
  //
  const email = req.body.email;
  const fname = req.body.firstname;
  const lname = req.body.lastname;
  const mname = req.body.middlename;
  const strict = req.body.strict;
  const year = req.body.year || null;
  var outRes = {
    spouse: false,
    deps: 0,
    address: false,
    primecomm: false,
    membership: {
      status: "unknown",
      year_request: year,
      paid: [],
    },
    found: false,
    primeid: 0,
    person: {
      firstname: fname,
      middlename: mname,
      lastname: lname,
      email: email,
      prime: false,
    },
    event: {
      paid: [],
      current_year: currentYear,
    },
  };
  // Test validity of input params
  if (validator.findPersonData(fname, mname, lname, email, year) == false) {
    console.log("validation failed!");
    sendJsonResponse(Res, outRes);
    return;
  }
  if (strict) {
    sqlStmt =
      "SELECT * FROM " +
      dbSchema +
      ".person WHERE firstname=$1 and lastname=$2 and middlename=$3 and email=$4;";
  } else {
    sqlStmt =
      "SELECT * FROM " +
      dbSchema +
      ".person WHERE (firstname=$1 and lastname=$2 and middlename=$3) or (email=$4);";
  }
  dt = [fname, lname, mname, email];
  //console.log("=== ", sqlStmt, dt);
  execute1SqlsWithCommit(
    dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false),
    aFindPersonCB
  );

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
          sqlStmt =
            "Select entity2_id, entity1, entity2, name, link_type_id from " +
            dbSchema +
            ".association_link where entity1_id=$1";
          dt = [entity_id];
          outRes.primeid = entity_id;
          flow_step = 2;
        } else {
          sqlStmt =
            "SELECT * FROM " +
            dbSchema +
            ".person WHERE entity_id=(SELECT entity1_id from " +
            dbSchema +
            ".association_link " +
            "where entity1='person' and entity2='person' and entity2_id=$1);";
          dt = [entity_id];
          flow_step = 1;
        }
        //console.log(outRes);
        //console.log(sqlStmt);
        execute1SqlsWithCommit(
          dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false),
          aFindPersonCB
        );
        return;
      //
      // Case process prime person
      case 1:
        //console.log(sql1_res.rows[0], sql1_res.rows[0].prime);
        //entity_id = sql1_res.rows[0]["entity_id"];
        //prime = sql1_res.rows[0].prime;

        entity_id = dHelper.getValueFromJSON(
          "entity_id",
          sql1_res.rows[0],
          "int"
        );
        prime = dHelper.getValueFromJSON("prime", sql1_res.rows[0], null);
        sqlStmt =
          "Select entity2_id, entity1, entity2, name, link_type_id from " +
          dbSchema +
          ".association_link where entity1_id=$1";
        dt = [entity_id];
        outRes.primeid = entity_id;
        flow_step = 2;
        execute1SqlsWithCommit(
          dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false),
          aFindPersonCB
        );
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
            outRes.primecomm = true;
          }
        }
        sqlStmt =
          "Select entity2_id, name, year, renewal_date, entity1, entity2 from " +
          dbSchema +
          ".community_link where entity1_id=$1";
        dt = [outRes.primeid];
        flow_step = 3;
        execute1SqlsWithCommit(
          dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false),
          aFindPersonCB
        );
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

        sqlStmt =
          "Select al.name, e.eventname, e.event_year from " +
          dbSchema +
          ".event e, " +
          dbSchema +
          ".association_link al where " +
          "al.entity1_id=$1 and al.entity2_id=e.entity_id and entity1='person' and entity2='event' and event_year=$2;";
        dt = [outRes.primeid, currentYear];
        flow_step = 4;
        execute1SqlsWithCommit(
          dHelper.setDbCallData("Find Person", sqlStmt, dt, null, null, false),
          aFindPersonCB
        );
        return;
      //
      case 4:
        for (i = 0; i < sql1_res.rowCount; i++) {
          row = sql1_res.rows[i];
          var ev = {
            registered: row.name,
            eventname: row.eventname,
            event_year: row.event_year,
          };

          outRes.event["paid"].push(ev);
        }
        // remove primeid -- stored for query
        outRes.primeid = -1;
        sendJsonResponse(Res, outRes);
        return;
      // Process error
      default:
        console.log("Default -- why?");
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
  var calledServiceURL = req.url;
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
    if (
      req.query.hasOwnProperty("fname") &&
      req.query.hasOwnProperty("lname") &&
      req.query.hasOwnProperty("mname")
    ) {
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
    membership: [],
    status: "unknown",
    year: year,
    found: false,
    isPersonPrime: false,
    prime: {},
    person: {},
    error: null,
    err_msg: null,
  };
  var flow_step = 0;
  //
  dHelper.isTokenValid(uid, email, token, aMembershipCB);
  //
  function aMembershipCB(output) {
    if (output.err) {
      outRes.err = output.err;
      outRes.err_msg = "Ismember error.";
      sendJsonResponse(Res, outRes);
      return;
    } else {
      if (flow_step == 0) {
        if (!output.token_valid) {
          outRes.err_msg = "Invalid token sent!";
          outRes.statusCode = 401;
          sendJsonResponse(Res, output);
          return;
        }
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 1;
        dHelper.getPersonWithPrime(
          fname,
          mname,
          lname,
          personemail,
          0,
          0,
          aMembershipCB
        );
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  var flow_step = 0;
  var outRes = {
    msg: "You could not be logged in.  Wrong with userid, email or password!",
    auth: false,
    primid: -1,
    stoken: null,
    persnid: -1,
    error: null,
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
  var sqlStmt =
    "select * from " +
    dbSchema +
    ".getauthtoken(" +
    `'${uid}', '${pwd}', '${mail}', '${cell}');`;
  console.log(sqlStmt);
  execute2SqlTxn(
    dHelper.setDbCallData("login", sqlStmt, null, null, null, false),
    aLoginCB
  );

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
 *  registering an account with " + dbSchema + ".
 */
app.post("/banc/register", (req, Res) => {
  //
  console.log("====== API Called ====");
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  // read input data
  var fname = null;
  if (req.body.hasOwnProperty("firstname")) {
    fname = req.body.firstname;
  }
  var mname = null;
  var lname = null;
  if (req.body.hasOwnProperty("lastname")) {
    lname = req.body.lastname;
  }
  if (req.body.hasOwnProperty("middlename")) {
    var mname = req.body.middlename;
  }
  var email = null;
  if (req.body.hasOwnProperty("email")) {
    var email = req.body.email;
  }
  var uid = null;
  var pwd = null;
  var cell = null;
  var register = "user"; // default registration
  var appserial = null;
  if (req.body.hasOwnProperty("userid")) {
    uid = req.body.userid;
    if (uid.length == 0) {
      uid = email;
    }
  } else {
    // If uid is null email will be used as uid
    uid = email;
  }
  if (req.body.hasOwnProperty("pwd")) {
    pwd = req.body.pwd;
  }
  if (req.body.hasOwnProperty("cell")) {
    cell = req.body.cell;
  }
  // either (IMEI number, laptop serial number - unique to the client - it is the client id)
  // register: "app", "user", "both"
  if (req.body.hasOwnProperty("register")) {
    register = req.body.register;
  }
  if (req.body.hasOwnProperty("appserial")) {
    appserial = req.body.appserial;
  }

  var outRes;
  console.log(fname, mname, lname);
  if (!validator.registrationData(fname, mname, lname, uid, email, cell)) {
    outRes = {
      msg: "Registration failed.",
      err: true,
      err_msg: "Registration aborted - incorrect data",
    };
    sendJsonResponse(Res, outRes, null, null);
    return;
  }
  if (
    pwd == null ||
    (appserial == null && (register == "both" || register == "app"))
  ) {
    outRes = {
      msg: "Registration failed.",
      err: true,
      err_msg:
        "Registration aborted - incorrect data -- missing pwd or appserial",
    };
    sendJsonResponse(Res, outRes, null, null);
    return;
  }
  var flow_step = 0;
  var cond = 0;
  var personid = -1;
  var primeid = -1;
  var tokn_str;
  var actkey;
  var activationlink;
  //
  dHelper.getPersonWithPrime(fname, mname, lname, email, 0, 0, aSetCredsCB);
  //
  function aSetCredsCB(output) {
    console.log("aSetCredsCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes = {
        msg: "Error: Registration failied. Systemic error.",
        err: output.err,
        err_msg: output.msg,
      };
      sendJsonResponse(Res, outRes);
      return;
    }
    //
    if (flow_step == 0) {
      
      outRes = {
        msg: null,
        err: output.err,
        err_msg: output.err_msg,
      };
      let prime = JSON.parse(output.prime);
      let person = JSON.parse(output.person);
      if (prime.rowCount == 0 && person.rowCount == 0) {
        let msg1 = {
          msg: "Could not find person or prime of the person or the person is not a member. Registration Failed.",
        };
        sendJsonResponse(Res, msg1);
        return;
      }
      flow_step = 2;
      primeid = prime.rows[0].entity_id;
      personid = person.rows[0].entity_id;
      tokn_str = pwd + email + personid;
      let act_str = tokn_str + Date.now();
      actkey = crypto.createHash("sha256").update(act_str).digest("hex");
      console.log("actkey: " + actkey);
      // now overload the actkey with registration info
      if (register == "both") {
        actkey = actkey + "2";
      } else if (register == "app") {
        actkey = actkey + "1";
      } else {
        actkey = actkey + "0";
      }
      activationlink = "/banc/activate/" + actkey;
      console.log(activationlink);
      //
      if (register == "app") {
        //
        var data_json = {
          sql1:
            "SELECT " +
            dbSchema +
            ".setupcredentialapp(" +
            `'${email}', ${personid}, ${primeid},'${cell}', '${appserial}', '${tokn_str}', '${actkey}', ${cond});`,
          name: "Executing register/setupcredentailapp",
          args1: null,
          cond: true,
        };
      } else {
        if (register == "both") {
          flow_step = 1;
        }
        var data_json = {
          sql1:
            "SELECT " +
            dbSchema +
            ".setupcredential(" +
            `'${uid}', '${pwd}', '${email}', ${personid}, ${primeid},'${cell}', '${actkey}', ${cond});`,
          name: "Executing register/setupcredentail",
          args1: null,
          cond: true,
        };
      }
      //
      execute1SqlsWithCommit(data_json, aSetCredsCB);
      return;
      //
    } else if (flow_step == 1) {
      let res = JSON.parse(output.sql1_result);
      if (res.rowCount > 0) {
        outRes.msg =
          "[register: " + register + "]" + res.rows[0].setupcredential;
      }
      flow_step = 2;
      if (register == "both") {
        var data_json = {
          sql1:
            "SELECT " +
            dbSchema +
            ".setupcredentialapp(" +
            `'${email}', ${personid}, ${primeid},'${cell}', '${appserial}', '${tokn_str}', '${actkey}', ${cond});`,
          name: "Executing register/setupcredentailapp",
          args1: null,
          cond: true,
        };
      }
      //
      execute1SqlsWithCommit(data_json, aSetCredsCB);
      //
    } else if (flow_step == 2) {
      let res = JSON.parse(output.sql1_result);
      console.log(res);
      if (register == "both" || register == "app") {
        if (res.rowCount > 0) {
          outRes.msg =
            outRes.msg +
            " [register: " +
            register +
            "]" +
            res.rows[0].setupcredentialapp;
        }
      } else {
        if (res.rowCount > 0) {
          outRes.msg =
            "[register: " + register + "]" + res.rows[0].setupcredential;
        }
      }
      flow_step = 3;
      //dHelper.sendEmailActivation(email,activationlink, aSetCredsCB);
      let cfg = dHelper.getConfig();
      let cLink = cfg.serverurl + activationlink;
      let body =
        "Hello BANC member, <p> Please click <a href='" +
        cLink +
        "'> activation link here</a> to activate your BANC account. <p> " +
        "Actual ACTIVATION Link: " + cLink + 
        "<p>DO NOT REPLY to this email.  Thank you. <p>Regards, BANC Tech Team.";
      let subject = "Welcome: BANC account Activation -- [automated email]"
      const mailclient = new mailer.SetupNodeMailer(verbose);
      mailclient.sendMail(email, subject, body);
      outRes.msg = outRes.msg + " [Activation Email Sent - Confirmed]";
      sendJsonResponse(Res, outRes);
    }
  }
});
/*
 *  Activate account
 */
app.get("/banc/activate/:activetoken", (req, Res) => {
  //
  console.log("====== API Called ====");
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  // read input data
  var actkey = req.params.activetoken;
  var flow_step = 0;
  var cond = 0;
  var outRes;
  var flow_step = 0;
  // actkey from the url feed now
  if (actkey.length > 0) {
    let actkeyLastCh = actkey.charAt(actkey.length - 1);
    cond = parseInt(actkeyLastCh);
    // call activate function
    var data_json = {
      sql1: "SELECT " + dbSchema + ".activatecreds(" + `'${actkey}', ${cond});`,
      name: "Executing activatecreds",
      args1: null,
      cond: true,
    };
    //
    execute1SqlsWithCommit(data_json, activateCredsCB);
  } else {
    outRes = {
      msg: "Activation key could not be found!",
      err: "ERROR",
      err_msg: "Activation key erro"
    };
    
    sendJsonResponse(Res, outRes);    
  }

  //
  function activateCredsCB(output) {
    console.log("aSetCredsCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes = {
        msg: "Error: failied. Systemic error.",
        err: output.err,
        err_msg: output.msg,
      };
      sendJsonResponse(Res, outRes);
      return;
    }
    //
    var res = JSON.parse(output.sql1_result);
    //console.log(res);
    outRes = {
      msg: null,
      err: output.err,
      err_msg: output.err_msg,
    };
    if (res.rowCount > 0) {
      outRes.msg = res.rows[0].activatecreds;
    }
    sendJsonResponse(Res, outRes);
  }
  return;
});
/*
 *  Load pay form for membership/event/donation
 */
app.post("/banc/loadPayForm", (req, Res) => {
  //
  console.log("====== API Called ====");
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var test = {};
  //var execute1SqlsWithCommit = execute1SqlsWithCommit.bind(this);
  // read input data

  var payData = req.body.pay_data;
  var form_ref_id = req.body.form_ref_id;
  var form_memo = req.body.form_memo;
  var form_date = req.body.form_date;
  var form_number = "000";

  console.log(payData);
  /*
  get Access info from header
  */
  const accessInfo = dHelper.getAccessInfo(req);
  console.log(accessInfo);
  //
  var outRes = {
    msg: null,
    err: true,
    result: {},
    err_msg: "Error Occurred",
    statusCode: 403,
  };
  var loginInfo = {
    uid: null,
    email: null,
    personid: 0,
    primeid: 0,
    isValid: false,
  };
  console.log(payData);
  //
  test = validator.payRawData(
    payData.person,
    payData.event,
    payData.membership,
    payData.transactions,
    form_ref_id,
    form_date
  );
  console.log(test);
  if (!test.valid) {
    outRes.msg =
      "Verifying banc transaction data. Inalid Pay Data submitted. " + test.msg;
    outRes.err = true;
    outRes.err_msg = "payData aborted - incorrect data";
    sendJsonResponse(Res, outRes);
    return;
  }
  /*
  var flow_step = 0;
  dHelper.isTokenValid(uid, email, token, aPaySubmitCB);
*/
  var flow_step = -1;
  //  Validate the caller
  dHelper.validateAccess(accessInfo, aValidateCB);
  //
  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
        //
        loginInfo.email = accessInfo.email;
        loginInfo.uid = accessInfo.uid;
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        loginInfo.access_option = output.access_option;
        //
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 0;
        // Call the main orchestration manage callback function now
        aPaySubmitCB(output);
      } else {
        outRes.err_msg = "Error Occurred";
        outRes.statusCode = 403;
        outRes.msg = "Session token / client token could not be validated!";
        sendJsonResponse(Res, outRes);
        return;
      }
    } else {
      outRes.msg = output.err;
      outRes["statusCode"] = 500;
      sendJsonResponse(Res, outRes);
      return;
    }
  }

  //
  function aPaySubmitCB(output) {
    var sql1_result = null; //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    console.log("aPaySubmitCB - ", flow_step, " - ", output);
    if (flow_step == 0) {
      if (output.err) {
        outRes.msg = "Error Token validation failied! ";
        outRes.statusCode = 403;
        outRes.err = output.err;
        outRes.err_msg = output.msg;
        //
        let validPersonData = {};
        validPersonData = validator.personData(payData.person, null);
        if (!validPersonData.valid) {
          outRes.msg =
            outRes.msg +
            "person data supplied not valid!  Pay submission aborted! " +
            validPersonData.msg;
          outRes.statusCode = 500;
          sendJsonResponse(Res, outRes);
          return;
        }
        flow_step = 1;
      } else {
        /*
        if (output.token_valid) {
          loginInfo.uid = uid;
          loginInfo.email = email;
          loginInfo.personid = output.personid;
          loginInfo.primeid = output.primeid;
          loginInfo.isValid = true;
        } */
        flow_step = 1;
      }
    }
    //
    if (flow_step == 1) {
      var rdata = {
        loginInfo: loginInfo,
        pay_data: payData,
        form_date: form_date,
        form_ref: form_ref_id,
        form_memo: form_memo,
      };
      flow_step = 2;
      let email;
      if (output.token_valid) {
        email = loginInfo.email;
      } else {
        email = payData.person.email;
      }
      console.log("Rdata: ", rdata);
      let sql1 =
        "INSERT INTO " +
        dbSchema +
        ".unprocessed_data (form_ref_id, banc_transaction_data, email, form_number) " +
        "VALUES ($1, $2, $3, $4) ON CONFLICT (form_ref_id) DO NOTHING RETURNING form_ref_id, created_date;";

      let mydata = {
        name: "pay api: unprocessed data",
        cond: true,
        sql1: sql1,
        args1: [form_ref_id, rdata, email, form_number],
      };
      execute1SqlsWithCommit(mydata, aPaySubmitCB);
      return;
      //
    }
    if (flow_step == 2) {
      outRes.msg = "Pay data stored for processing after Payment.";
      outRes.err = null;
      outRes.result = {};
      outRes.err_msg = null;
      if (output.err) {
        outRes.msg = "Pay data storing task failed and processing is blocked!";
        outRes.statusCode = 500;
      } else {
        if (sql1_result.rowCount > 0) {
          outRes.result = sql1_result.rows[0];
          outRes.statusCode = 200;
        } else {
          outRes.msg = "Unknown error during submission";
          outRes.statusCode = 500;
        }
      }
      sendJsonResponse(Res, outRes);
    }
  }
});
/*
 * receive form data  --- may not work -- following api
 */
app.post("/banc/wpformdata", (req, Res) => {
  //
  console.log("====== API Called ====");
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  var test = {};
  //
  var formData = req.body;
  var form_ref_id = req.body.form_ref_id;
  var form_date = formData.Date;
  var email = null; // Find the main email -- this cannot be null
  const accessInfo = dHelper.getAccessInfo(req);
  console.log(accessInfo);
  //
  var outRes = {
    msg: null,
    err: true,
    err_msg: "Error Occurred",
    statusCode: 403,
  };
  var loginInfo = {
    uid: null,
    email: null,
    personid: 0,
    primeid: 0,
    isValid: false,
  };
  //
  test = validator.payRawData(null, null, null, null, form_ref_id, form_date);
  console.log(test);
  if (!test.valid) {
    outRes.msg =
      "Verifying banc transaction data. Inalid Form Data submitted. " +
      test.msg;
    outRes.err = true;
    outRes.err_msg = "Form storing aborted - incorrect data";
    sendJsonResponse(Res, outRes);
    return;
  }
  /*
  var flow_step = 0;
  dHelper.isTokenValid(uid, email, token, aPaySubmitCB);
*/
  var flow_step = -1;
  //  Validate the caller
  dHelper.validateAccess(accessInfo, aValidateCB);
  //
  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
        //
        loginInfo.email = accessInfo.email;
        loginInfo.uid = accessInfo.uid;
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        loginInfo.access_option = output.access_option;
        //
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 0;
        // Call the main orchestration manage callback function now
        formSubmitCB(output);
      } else {
        outRes.msg = "Session token / client token could not be validated!";
        sendJsonResponse(Res, outRes);
        return;
      }
    } else {
      outRes.msg = output.err;
      outRes["statusCode"] = 500;
      sendJsonResponse(Res, outRes);
      return;
    }
  }
  //
  function formSubmitCB(output) {
    var sql1_result = null; //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    console.log("formSubmitCD - ", flow_step, " - ", output);
    if (output.err) {
      if (flow_step == 0) outRes.msg = "Error Token validation failied! ";
      if (flow_step > 0) outRes.msg = "Form data storing task failed!";
      outRes.err = output.err;
      outRes.err_msg = output.msg;
    } else {
      if (flow_step == 0) {
        flow_step = 1;
        var command = "forms";
        var rdata = {
          loginInfo: loginInfo,
          formData: formData,
          form_date: formData.Date,
          form_ref: form_ref_id,
          form_memo: command,
        };
        console.log("Rdata: ", rdata);
        let mydata = formsHandler.storeUnprocData(
          form_ref_id,
          command,
          rdata,
          email
        );
        execute1SqlsWithCommit(mydata, formSubmitCB);
        return;
        //
      }
      if (flow_step == 1) {
        outRes.msg = "Form data stored for processing after Payment.";
        outRes.err = null;
        outRes.result = null;
        outRes.err_msg = null;
        if (sql1_result.rowCount > 0) {
          outRes.result = sql1_result.rows[0];
        } else {
          outRes.msg = "Unknown error happened during form storage!";
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
  var calledServiceURL = req.url;
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
    msg: "Received Pay Pal confirmation.  Not yet Processed.",
    ppal_receipt: ppalrcpt,
    err: false,
    err_msg: "None",
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
  var calledServiceURL = req.url;
  console.log(calledServiceURL);
  var form_ref_id = req.header("form_ref_id");
  var raw_data;
  var cond = true;
  /*
  get Access info from header
  */
  const accessInfo = dHelper.getAccessInfo(req);
  console.log(accessInfo);
  //
  var outRes = {
    prime: null,
    form_ref_id: null,
    membership: null,
    events: null,
    summary: null,
    settlement: null,
    msg: "",
    err: null,
    statusCode: 500,
    result: {},
    err_msg: "Error Occurred",
  };
  var loginInfo = {
    uid: null,
    email: null,
    personid: 0,
    primeid: 0,
    isValid: false,
  };
  //
  var test = validator.validate(form_ref_id, "alphanumeric", 0);
  console.log(test);
  if (!test.valid) {
    outRes.msg = "Verifying banc transaction form_ref_id. Inalid. " + test.msg;
    outRes.err = true;
    outRes.err_msg = "Processing aborted - incorrect data";
    sendJsonResponse(Res, outRes);
    return;
  }
  /*
   *  INSERT code to block REMOTE CALL. (write this code when functioning)
   */
  var sql1;
  if (form_ref_id != null || typeof form_ref_id != "undefined") {
    sql1 =
      "SELECT form_ref_id, banc_transaction_data, settlement_data, banc_data_processed, settlement_data_processed " +
      " FROM " +
      dbSchema +
      `.unprocessed_data WHERE banc_data_processed=false and settlement_data_processed=false and form_ref_id='${form_ref_id}';`;
  } else {
    sql1 =
      "SELECT form_ref_id, banc_transaction_data, settlement_data, banc_data_processed, settlement_data_processed " +
      " FROM " +
      dbSchema +
      ".unprocessed_data WHERE banc_data_processed=false and settlement_data_processed=false FETCH FIRST 1 ROW ONLY;";
  }
  /*
 var flow_step = 0;
 dHelper.isTokenValid(uid, email, token, aPaySubmitCB);
*/
  var flow_step = -1;
  //  Validate the caller
  dHelper.validateAccess(accessInfo, aValidateCB);
  //
  function aValidateCB(output) {
    if (output.err === null) {
      if (output.valid) {
        //
        loginInfo.email = accessInfo.email;
        loginInfo.uid = accessInfo.uid;
        loginInfo.authgroup = output.authgroup;
        loginInfo.isValid = output.valid;
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        loginInfo.access_option = output.access_option;
        //
        if (!isAuthorized(Res, calledServiceURL, output.authgroup)) {
          return;
        }
        flow_step = 0;
        // Call the main orchestration manage callback function now
        execute1SqlsWithCommit(
          dHelper.setDbCallData(
            "Processing unprocessed data",
            sql1,
            null,
            null,
            null,
            cond
          ),
          aProcessDataCB
        );
      } else {
        outRes.err_msg = "Error Occurred";
        outRes.statusCode = 403;
        outRes.msg = "Session token / client token could not be validated!";
        sendJsonResponse(Res, outRes);
        return;
      }
    } else {
      outRes.msg = output.err;
      outRes["statusCode"] = 500;
      sendJsonResponse(Res, outRes);
      return;
    }
  }
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
        outRes.msg =
          "No Pay data retrived with condition - banc_data_processed=false. & form_ref_id =" +
          form_ref_id;
        outRes.raw_data = null;
        outRes.settlement_data = null;
        outRes.statusCode = 500;
        sendJsonResponse(Res, outRes, calledServiceURL, null);
        return;
      }
      // Found a row -- contain banc_transaction data unprocessed.  Now find the prime and person entity id for the submitter
      flow_step = 1;
      let row = sql1_result.rows[0];
      raw_data = JSON.parse(row["banc_transaction_data"]);
      outRes.form_ref_id = row.form_ref_id;
      let jData = raw_data.pay_data.person;
      dHelper.getPersonWithPrime(
        jData.firstname,
        jData.middlename,
        jData.lastname,
        jData.email,
        null,
        null,
        aProcessDataCB
      );
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
      dHelper.executePersonSQL(
        jData,
        primeid,
        prime,
        dep,
        isMinor,
        key,
        aProcessDataCB
      );
    }
    //  Process prime information from step 2 and proceed to step 4
    if (flow_step == 3) {
      if (sql1_result.rowCount == 0) {
        outRes.msg =
          "Systemic error: Could not insert prime person but verified no such person for form_ref_id: " +
          form_ref_id;
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
      dHelper.updateUnprocessedDataTable(
        outRes,
        banc_transaction,
        settlement,
        aProcessDataCB
      );
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
  console.log("BANC server running https ..." + securityConfig.https);
  console.log(`BANC Server running at PORT: ${PORT}`);
});
