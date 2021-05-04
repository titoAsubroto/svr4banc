// @ts-check
const fs = require("fs"),
  http = require("http"),
  https = require("https")
const express = require('express');
const bodyParser = require('body-parser');

const banc = require('./banc_class_pg.js');
const { Pool } = require("pg");
const app = express();
var port = 3700;
//
var calledServiceURL = "";
const verbose = true;
const useHeader = true;
const dHelper = new banc.setupDataHelper(verbose);
const validator = new banc.DataValidator(verbose);

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

    console.log("Transaction - Begin", output);
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
app.get("/banc/testFunction", (req, Res) => {

  dHelper.testFunction(req, Res);

});
//
app.post("/banc/setpersoninfo", (req, Res) => {
  //
  console.log("====== /setpersoninfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  // console.log(req.body);
  const memberInfo = req.body;
  let output = {};
  var primeInfo = memberInfo["prime"];
  var spouseInfo = memberInfo.spouse;
  var depInfo = memberInfo.deps;
  var address = memberInfo.address;
  var primecomm = memberInfo.primecomm;
  var newPerson = false;

  //
  var resultSeq = "prime";
  var primeId = 0;
  var row;
  var spouseId = 0;
  var assocData = [];
  var depLen = depInfo.length;
  var depProc = 0;
  //
  // is the prime member
  var prime_insert = ((primeInfo.entity_id > 0) ? false : true);
  var spouse_insert = ((spouseInfo.entity_id > 0) ? false : true);

  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes = {
    "msg": null,
    "err": false,
    "err_msg": null,
    "results": null
  };
  var loginInfo = {
    "uid": uid,
    "email": email,
    "personid": 0,
    "primeid": 0,
    "isValid": false
  };
  //
  if (!validator.tokeData(uid, email, token)) {
    outRes.msg = "Login failed.";
    outRes.err = true;
    outRes.err_msg = "Set Person Info aborted - incorrect login data";
    Res.send((outRes));
    return;
  }
  var flow_step = 0;

  if (uid == null && token == null) {
    flow_step = 0;
    dHelper.getPersonWithPrime(primeInfo.firstname, primeInfo.middlename, primeInfo.lastname, primeInfo.email, null, null, setPersonsCB);
  } else {
    flow_step = 1;
    dHelper.isTokenValid(uid, email, token, setPersonsCB);
  }
  //
  function setPersonsCB(output) {
    console.log("===== set Member CB ---");
        var sql1_result = null;
    console.log("setPersonsCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes.err= output.err;
      outRes.err_msg = output.msg;
      if (flow_step == 1) {
        outRes.msg = "Error: Login failied.";
      }
      Res.send(outRes);
      return;
    }
    //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    if (flow_step == 0) {
      if(output.found == true) {
        outRes = {
          "msg": "Error: Login to update.",
          "err": null,
          "err_msg": "Aborted.",
          "results" : null
        };
      }
      Res.send(outRes);
      return;
      }
      flow_step = 2;
      newPerson = true;
    }
//
    if(flow_step = 1) {
      loginInfo.isValid = true;
      loginInfo.personid = output.personid;
      loginInfo.primeid = output.primeid;
      flow_step = 2;
    }
    if (flow_step == 2) {
       flow_step = 3;
       dHelper.processPersonsInfo(primeInfo, spouseInfo, depInfo, address, primecomm, loginInfo, newPerson, setPersonsCB);
       return;
    }
    if (flow_step == 3) {
      outRes = {

      }
      Res.send(outRes);
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
      Res.send(output);
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
      Res.send(output); // Invalid token found.
      return

    } else {

      Res.send(output);
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
      Res.send(output);
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
      Res.send(output); // Invalid token found.
      return

    } else {

      Res.send(output);
      return;

    }
  }
});
//
//
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
    Res.send(output);
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
  Res.send(output);
});
//
//
/**
 * Get Event Info API 
 */
app.get("/banc/getEventInfo", (req, Res) => {
  var output = {
    "events": null,
    "year" : null,
    "msg": null
  };
  var events = dHelper.getEventInfo();
  const year = req.query.year;  
  if (year in events) {
    output.events = events[year];
    output.year = year;
  } else {
    output.events = events;
  }
  console.log("Requested year: ",year);
  Res.send(output);
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
  Res.send(output);
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
  const token = req.query.stoken;
  const email = req.query.email;
  const uid = req.query.userid;
  if ((req.query).hasOwnProperty('fname') && (req.query).hasOwnProperty('lname') && (req.query).hasOwnProperty('mname')) {
    const fname = req.query.fname;
    const lname = req.query.lname;
    const mname = req.query.mname;
  }
  //
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var auth = 0;
  var output = {
    "prime": null,
    "spouse": null,
    "deps": [],
    "address": null,
    "primecomm": null,
    "msg": null
  };

  function aValidateCB(result, err) {
    if (err === null) {
      auth = result[0].auth;
      if (auth == 1) {
        primeId = result[0].primid;
        personid = result[0].persnid;
        resultSeq = 0;
        dHelper.getPrimeMember(null, null, null, null, primeId, aMembersCB);
      } else {
        resultSeq = -1;
        output.msg = "Session token could not be validated!";
        Res.send(output);
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send(output);
    }
  }

  function aMembersCB(result, err) {
    var row;
    console.log(result);
    if (resultSeq == 0) {
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          primeId = row.entity_id;
          console.log(primeId);
          output["prime"] = row;
        });
      }
      console.log(output);
      dHelper.associatedPersons(primeId, aMembersCB);
      return;
    } else if (resultSeq == 1) {
      resultSeq = 2;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          if (row.dependent == 1) {
            output.deps.push(row);
          } else {
            output["spouse"] = row;
          }
        });
      }
      dHelper.associatedAddress(primeId, aMembersCB);
      dHelper.associatedFamilyComm(primeId, aMembersCB);
    } else if (resultSeq > 1) {
      resultSeq = resultSeq + 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          if (row.street) {
            output["address"] = row;
          } else {
            output["primecomm"] = row;
          }
        });
      }
    }
    console.log(output);
    if (resultSeq > 3) {
      Res.send(output);
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
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const sessiontoken = req.query.stoken;
  const email = req.query.email;
  const uid = req.query.userid;
  var year = (new Date()).getFullYear();
  if ((req.query).hasOwnProperty('year')) {
    year = req.query.year;
  }
  //
  var row;
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var auth = 0;
  var output = {
    "events": [],
    "msg": null
  };

  function aValidateCB(result, err) {
    if (err === null) {
      auth = result[0].auth;
      if (auth == 1) {
        primeId = result[0].primid;
        personid = result[0].persnid;
        dHelper.getRegisteredEvents(primeId, year, aEventsCB);
      } else {
        resultSeq = -1;
        output.msg = "Session token could not be validated!";
        Res.send(output);
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send(output);
    }
  }

  function aEventsCB(result, err) {
    if (resultSeq == 0) {
      console.log(result);
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          output.events.push(row);
        });
      }
      Res.send(output);
      return;
    }
  }
  //
  dHelper.validateSession(uid, email, sessiontoken, aValidateCB);

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
  const sessiontoken = req.query.stoken;
  const email = req.query.email;
  const uid = req.query.userid;
  var dateFrom = "";
  var dateTo = "";
  if ((req.query).hasOwnProperty('dateFrom')) {
    dateFrom = req.query.dateFrom;
  }
  if ((req.query).hasOwnProperty('dateTo')) {
    dateTo = req.query.dateTo;
  }
  //
  var row;
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var auth = 0;
  var output = {
    "transactions": [],
    "msg": null
  };

  function aValidateCB(result, err) {
    if (err === null) {
      auth = result[0].auth;
      if (auth == 1) {
        primeId = result[0].primid;
        personid = result[0].persnid;
        dHelper.getTransactions(primeId, dateFrom, dateTo, null, aEventsCB);
      } else {
        resultSeq = -1;
        output.msg = "Session token could not be validated!";
        Res.send(output);
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send(output);
    }
  }

  function aEventsCB(result, err) {
    if (resultSeq == 0) {
      console.log(result);
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          output.transactions.push(row);
        });
      }
      Res.send(output);
      return;
    }
  }
  //
  dHelper.validateSession(uid, email, sessiontoken, aValidateCB);

});
//
//
/**
 * Get transactions by a member or all members API 
 */
app.get("/banc/getMembershipPaid", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const sessiontoken = req.query.stoken;
  const email = req.query.email;
  const uid = req.query.userid;
  var yearFrom = -1;
  var yearTo = -1;
  if ((req.query).hasOwnProperty('dateFrom')) {
    yearFrom = req.query.yearFrom;
  }
  if ((req.query).hasOwnProperty('dateTo')) {
    yearTo = req.query.yearTo;
  }
  //
  var row;
  var resultSeq = 0;
  var primeId = -1;
  var personid = -1;
  var auth = 0;
  var output = {
    "membership": [],
    "msg": null
  };

  function aValidateCB(result, err) {
    if (err === null) {
      auth = result[0].auth;
      if (auth == 1) {
        primeId = result[0].primid;
        personid = result[0].persnid;
        dHelper.getBANCMembershipPaid(primeId, yearFrom, yearTo, null, aEventsCB);
      } else {
        resultSeq = -1;
        output.msg = "Session token could not be validated!";
        Res.send(output);
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send(output);
    }
  }

  function aEventsCB(result, err) {
    if (resultSeq == 0) {
      console.log(result);
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          output.membership.push(row);
        });
      }
      Res.send(output);
      return;
    }
  }
  //
  dHelper.validateSession(uid, email, sessiontoken, aValidateCB);

});
//
app.post("/banc/setmemberinfo", (req, Res) => {
  //
  console.log("====== /setmemberinfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  const token = req.query.token;
  const email_token = req.query.email;
  console.log(req.body);
  const memberInfo = req.body;
  let output = {};
  let primeInfo = memberInfo["prime"];
  let spouseInfo = memberInfo.spouse;
  let depInfo = memberInfo.deps;
  let address = memberInfo.address;
  let primecomm = memberInfo.primecomm;
  //
  var resultSeq = "prime";
  var primeId = 0;
  var row;
  var spouseId = 0;
  var assocData = [];
  var depLen = depInfo.length;
  var depProc = 0;
  const assocTypes = dHelper.getAssocLinkInfo;
  let prime_insert = ((primeInfo.entity_id > 0) ? false : true);
  let spouse_insert = ((spouseInfo.entity_id > 0) ? false : true);
  sqlStmt = dHelper.getPersonSQL(primeInfo, 1, 0, 0, primeInfo.entity_id);
  //
  // dHelper.executeStoreProc(sqlStmt, setMembersCB);
  dHelper.callQuery(sqlStmt, setMembersCB);
  //
  function setMembersCB(result, err) {
    console.log("===== set Member CB ---");
    console.log(result);
    if (Array.isArray(result) && result.length) {
      Object.keys(result).forEach(function (key) {
        row = result[key];
        console.log("Array Row - lastId")
        lastId = row.entity_id;
      });
    } else {
      console.log("Result - lastId")
      lastId = result.insertId;
    }
    console.log(lastId);
    if (resultSeq == "prime") {
      if (prime_insert) {
        primeInfo.entity_id = lastId
        primeId = lastId;
      } else {
        primeId = lastId;
      }
      output["prime"] = primeInfo;
      // Insert or update address and family communication and link
      sqlStmt = dHelper.sqlAddressComm(address, primecomm, primeId, address.entity_id, primecomm.entity_id);
      resultSeq = "addr_comm";
      dHelper.executeStoreProc(sqlStmt, setMembersCB);
      // Next insert or update
    } else if (resultSeq == "addr_comm") {
      if (Object.keys(spouseInfo).length !== 0) {
        resultSeq = "spouse";
        sqlStmt = dHelper.getPersonSQL(spouseInfo, 0, 0, 0, spouseInfo.entity_id);
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else {
        resultSeq = "done"
      }

      //
    } else if (resultSeq == "spouse") {

      if (spouse_insert) {
        spouseInfo.entity_id = lastId;
        spouseId = lastId;
      } else {
        spouseId = lastId;
      }
      output["spouse"] = spouseInfo;

      if (prime_insert || spouse_insert) {
        name = assocTypes[assocTypes['spouse']];
        assocData.push([primeId, spouseId, 'person', 'person', name, assocTypes['spouse']]);
      }

      if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        dep_insert = ((dInfo.entity_id > 0) ? false : true);
        sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else {
        if (Array.isArray(assocData) && assocData.length) {
          resultSeq = "links";
          sqlStmt = dHelper.sqlAssocLink(false);
          console.log(assocData);
          dHelper.createAssocLinks(sqlStmt, assocData, setMembersCB);
          return;
        } else {
          resultSeq = "done";
        }
      }
    } else if (resultSeq == "deps") {

      if (dep_insert) {
        depInfo[depProc]['entity_id'] = lastId;
        depId = lastId;
      } else {
        depId = lastId;
      }
      name = assocTypes[assocTypes['parent']]
      if (dep_insert || prime_insert) {
        assocData.push([primeId, depId, 'person', 'person', name, assocTypes['parent']]);
      }
      if (spouseId > 0 && (dep_insert || spouse_insert)) {
        assocData.push([spouseId, depId, 'person', 'person', name, assocTypes['parent']]);
      }

      if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        dep_insert = ((dInfo.entity_id > 0) ? false : true);
        sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else {
        output['deps'] = depInfo;
        if (Array.isArray(assocData) && assocData.length) {
          resultSeq = "links";
          sqlStmt = dHelper.sqlAssocLink(false);
          dHelper.createAssocLinks(sqlStmt, assocData, setMembersCB);
          return;
        } else {
          resultSeq = "done";
        }
      }
    } else if (resultSeq == "links") {
      resultSeq = "done";
    }
    if (resultSeq == "done") {
      Res.send(output);
    }
    return;
  }
  //
});
//
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
    Res.send(outRes);
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
          Res.send(outRes);
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
        Res.send(outRes);
        return;
      // Process error
      default:
        console.log("Default -- why?")
        console.log(err);
        console.log(err_msg);
        outRes.err = err;
        Res.send(outRes);
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
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.stoken;
  const email = req.query.email;
  const uid = req.query.userid;
  var id = req.query.entity_id;
  var year = req.query.year || null;

  var outRes = {
    "membership": [],
    "status": "unknown",
    "year": year,
    "id": id,
    "prime": {},
    "err": null,
    "err_msg": null
  };
  var flow_step = 0;
  //
  dHelper.isTokenValid(uid, email, token, aMembershipCB);
  //
  function aMembershipCB(output) {
    if (output.err) {
      outRes.err = output.err;
      outRes.err_msg = "Transaction error."
    } else {
      if (flow_step == 0) {
        if (!output.token_valid) {
          outRes.err_msg = "Invalid token sent!"
          Res.send(output);
          return;
        }
        flow_step = 1;
        //
        dHelper.ismember(id, year, aMembershipCB);
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
      }
    }
    Res.send(outRes);
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
    "msg": "You could not be logged in.  Please check your userid, email or password!",
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
    Res.send(outRes);
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
        Res.send(outRes);
        return;
      default:
        outRes.msg = "You're not logged in: " + err_msg;
        outRes.error = output.err;
        Res.send(outRes);
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
    Res.send(outRes);
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
      Res.send(outRes);
      return;
    }
    //
    if (flow_step == 0) {
      let prime = JSON.parse(output.prime);
      let person = JSON.parse(output.person);
      if (prime.rowCount == 0 && person.rowCount == 0) {
        Res.send((JSON.stringify({ "msg": "Could not find person or prime of the person or the person is not a member. Registration Failed." })));
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
      Res.send(outRes);
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
  // read input data
  var rawData = req.body.banc_data;
  var form_ref_id = req.body.form_ref_id;
  var email_data = req.body.email;

  var token = req.header("stoken");
  var email = req.header("email");
  var uid = req.header("userid");

  var outRes;
  var loginInfo = {
    "uid": uid,
    "email": email,
    "personid": 0,
    "primeid": 0,
    "isValid": false
  };
  //
  if (!validator.tokeData(uid, email, token)) {
    outRes = {
      "msg": "Registration failed.",
      "err": true,
      "err_msg": "Registration aborted - incorrect data"
    };
    Res.send(outRes);
    return;
  }
  if (!validator.payRawData(rawData, form_ref_id, email_data)) {
    outRes = {
      "msg": "Inalid Raw Data -- .",
      "err": true,
      "err_msg": "payData aborted - incorrect data"
    };
    Res.send(outRes);
    return;
  }
  var flow_step = 0;
  var cond = true;

  dHelper.isTokenValid(uid, email, token, aPaySubmitCB);
  //
  function aPaySubmitCB(output) {
    var sql1_result = null;
    console.log("aPaySubmitCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes = {
        "msg": "Error: Registration failied. Systemic error.",
        "err": output.err,
        "err_msg": output.msg
      };
      Res.send(outRes);
      return;
    }
    //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    //
    if (flow_step == 0) {
      if (output.token_valid) {
        loginInfo.personid = output.personid;
        loginInfo.primeid = output.primeid;
        loginInfo.isValid = true;
      }
      flow_step = 1;
      var rdata = {
        "loginInfo": loginInfo,
        "rawData": rawData
      };
      var sql1 = "INSERT INTO banc.unprocessed_data (form_ref_id, banc_transaction_data, email) VALUES ($1, $2, $3) RETURNING form_ref_id, created_date;";
      var args1 = [form_ref_id, rdata, email];
      execute1SqlsWithCommit(dHelper.setDbCallData("pay api: unprocessed data", sql1, args1, null, null, cond), aPaySubmitCB);
      //
    } else {
      outRes = {
        "msg": "Pay data stored for processing after Payment.",
        "err": null,
        "result": null,
        "err_msg": null
      };

      if (sql1_result.rowCount > 0) {
        outRes.result = sql1_result.rows[0];
      } else {
        outRes.msg = "Unknown error is submission";
      }
      Res.send(outRes);
    }
  }
});
/*
*  process "unprocessed data"
*/
app.post("/banc/processData", (req, Res) => {
  //
  var rowCount = 10;
  var unPRows;
  var currentRow = 0;
  console.log("====== API Called ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  /*
  *  INSERT code to block REMOTE CALL.
  */

  var sql1 = `SELECT * FROM banc.unprocessedData WHERE data_processed=true FETCH FIRST ${rowCount} ONLY;`;
  var outRes;

  var flow_step = 0;
  var cond = true;
  execute1SqlsWithCommit(dHelper.setDbCallData("Processing nprocessed data", sql1, null, null, null, cond), aProcessDataCB);
  //
  function aProcessDataCB(output) {
    var sql1_result = null;
    console.log("aPaySubmitCB - ", flow_step, " - ", output);
    if (output.err) {
      outRes = {
        "msg": "Error: Registration failied. Systemic error.",
        "err": output.err,
        "err_msg": output.msg
      };
      Res.send(outRes);
      return;
    }
    //
    if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
    //
    if (flow_step == 0) {
      unPRows = sql1_result.rows;
      flow_step = 1;
      var rdata = {
        "loginInfo": loginInfo,
        "rawData": rawData
      };
      var sql1 = "INSERT INTO banc.unprocessed_data (form_ref_id, banc_transaction_data, email) VALUES ($1, $2, $3) RETURNING form_ref_id, created_date;";
      var args1 = [form_ref_id, rdata, email];
      execute1SqlsWithCommit(dHelper.setDbCallData("pay api: unprocessed data", sql1, args1, null, null, cond), aPaySubmitCB);
      //
    } else {
      outRes = {
        "msg": "Pay data stored for processing after Payment.",
        "err": null,
        "result": null,
        "err_msg": null
      };

      if (sql1_result.rowCount > 0) {
        outRes.result = sql1_result.rows[0];
      } else {
        outRes.msg = "Unknown error is submission";
      }
      Res.send(outRes);
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