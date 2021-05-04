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


dHelper.setEventInfo();
dHelper.setTransactionTypeInfo();
dHelper.setAffiliationTypeInfo();
dHelper.setLinkInfo();
//
//testTransactions();
// var output = dHelper.printData();
//Test transactions
function testTransactions() {
  var flow_step = 0;
  //
  var dt = ['Subroto', '', 'Bhattacharya', 'subroto@computer.org', 't', 'f', '', '9194607990', '9193451714', 'f'];
  var sqlStmt = "INSERT INTO banc.person (firstname, middlename, lastname, email, prime, " +
    " dependent, affiliationId, telephone, mobile, isMinor) VALUES " +
    "($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *;";
  var spouseLnk = dHelper.getAssocLinkInfo('spouse');
  console.log("Spouse link: ", spouseLnk);


  execute2SqlTxn(dHelper.setDbCallData("Prime Person", sqlStmt, dt, null, null, false), aflowCB);
  //
  function aflowCB(output) {
    //
    let err = output.err;
    let err_msg = output.err_msg;
    var sql1_res = JSON.parse(output.sql1_result);
    var sql2_res = JSON.parse(output.sql2_result);

    console.log("aflowCB/flow_step: ", flow_step);
    console.log("SQL1 -->", sql1_res.rows);
    console.log("SQL2 -->", sql2_res.rows);
    if (err != null) {
      flow_step = -1;
      console.log("flow_step - set: ", flow_step);
    }
    switch (flow_step) {
      case 0:
        flow_step = 1;
        let primeId = sql1_res.rows[0].entity_id;
        console.log("prime: ", primeId);
        // let primeId = 10;
        let name = "spouse";
        let link_type_id = 200;
        console.log(spouseLnk);
        //
        var dt = ['Nandita', '', 'Bhattacharya', 'nanditajsr@gmail.com', 'f', 'f', '', '9194607990', '', 'f'];
        var sql2 = "INSERT INTO banc.association_link" +
          " (entity1_id, entity2_id, entity1, entity2, name, link_type_id)" +
          " VALUES (" + `${primeId}, $1,'person', 'person', '${name}', ${link_type_id});`;
        //
        execute2SqlTxn(dHelper.setDbCallData("Spouse", sqlStmt, dt, sql2, null, true), aflowCB);

      case 1:
        console.log(output);

      default:
        console.log("Default -- why?")
        console.log(err);
        console.log(err_msg);

    }
  }
}
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
app.post("/banc/setpersoninfo", (req, Res) => {
  //
  console.log("====== /setpersoninfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
  const token = req.query.token;
  const email_token = req.query.email;
  // console.log(req.body);
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
  //
  // get client for transaction
  var client = getTransactionClient();
  //
  let prime_insert = ((primeInfo.entity_id > 0) ? false : true);
  let spouse_insert = ((spouseInfo.entity_id > 0) ? false : true);
  sqlStmt = dHelper.sqlPerson(primeInfo, 1, 0, 0, primeInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(spouseInfo, 0, 0, 0, spouseInfo.entity_id);
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
      Res.send((JSON.stringify(output)));
    }
    return;
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

//
app.get("/banc/getprime", (req, Res) => {
  //
  //
  console.log("====== API Called: ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  var token, fname, lname, mname, uid, email;
  var flow_step = 0;
  if (useHeader) {
    token = req.header("stoken");
    fname = req.header("firstname");
    lname = req.header("lastname");
    mname = req.header("middlename") ? req.header("middlename") : null;
    email = req.header("email");
    uid = req.header("userid");
  } else {
    token = req.query.stoken;
    fname = req.query.fistname;
    lname = req.query.lastname;
    mname = req.query.middlename;
    email = req.query.email;
    uid = req.query.userid;
  }

  dHelper.isTokenValid(uid, email, token, aPrimeCB)
  //
  //
  function aPrimeCB(output) {
    console.log(output);
    if (output.err) {
      Res.send((JSON.stringify(output)));
      return;
    }
    //
    console.log(output);
    if (flow_step == 0) {
      if (output.token_valid) {
        flow_step = 1;
        dHelper.getPrimeMember(fname, mname, lname, email, 0, aPrimeCB);
        return;
      }
      Res.send((JSON.stringify(output))); // Invalid token found.
      return

    } else {

      Res.send((JSON.stringify(output)));
      return;

    }
  }
  //
  //dHelper.getPrimeMember(fname, mname, lname, email, null, aPrimeCB);

});
//
//
/**
 * PAY Membership API 
 */

app.post("/banc/paymembership", (req, Res) => {
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
    Res.send((JSON.stringify(output)));
  }
  //
  dHelper.executeStoreProc(sqlStmt, aPayMemCB);

});
//
/**
 * Get Event Info API 
 */
app.get("/banc/getEventInfo", (req, Res) => {
  var output = {
    "events": null,
    "msg": null
  };
  output.events = dHelper.getEventInfo();
  Res.send((JSON.stringify(output)));
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
  Res.send((JSON.stringify(output)));
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
        Res.send((JSON.stringify(output)));
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send((JSON.stringify(output)));
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
      Res.send((JSON.stringify(output)));
    }
    return;
  }
  //
  dHelper.validateSession(uid, email, sessiontoken, aValidateCB);

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
  var year = -1;
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
        Res.send((JSON.stringify(output)));
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send((JSON.stringify(output)));
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
      Res.send((JSON.stringify(output)));
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
        Res.send((JSON.stringify(output)));
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send((JSON.stringify(output)));
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
      Res.send((JSON.stringify(output)));
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
        Res.send((JSON.stringify(output)));
      }
    } else {
      resultSeq = -1;
      output.msg = err;
      Res.send((JSON.stringify(output)));
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
      Res.send((JSON.stringify(output)));
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
  const assocTypes = dHelper.getAssocLinkInfo()
  let prime_insert = ((primeInfo.entity_id > 0) ? false : true);
  let spouse_insert = ((spouseInfo.entity_id > 0) ? false : true);
  sqlStmt = dHelper.sqlPerson(primeInfo, 1, 0, 0, primeInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(spouseInfo, 0, 0, 0, spouseInfo.entity_id);
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        return;
      } else if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
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
      Res.send((JSON.stringify(output)));
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
    }
  };
  // Test validity of input params
  if (validator.findPersonData(fname, mname, lname, email, year) == false) {
    console.log("validation failed!")
    Res.send((JSON.stringify(outRes)));
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
          Res.send((JSON.stringify(outRes)));
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

        outRes.person.prime = prime;
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
        //
        // remove primeid -- stored for query
        outRes.primeid = -1;
        Res.send((JSON.stringify(outRes)));
        return;
      // Process error
      default:
        console.log("Default -- why?")
        console.log(err);
        console.log(err_msg);
        outRes.err = err;
        Res.send((JSON.stringify(outRes)));
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
  const id = req.query.entity_id;
  const year = req.query.year || null;

  var output = {
    "membership": [],
    "status": "unknown",
    "year": year,
    "id": id,
    "prime": {}
  };
  //
  //
  function aMembershipCB(result, err) {
    if (Array.isArray(result) && result.length) {
      Object.keys(result).forEach(function (key) {
        var row = result[key];
        if (row.year == year) {
          output.status = "current";
        }
        output["membership"].push(row);
      });
    }
    Res.send((JSON.stringify(output)));
  }
  //
  dHelper.ismember(id, year, aMembershipCB);

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
    Res.send((JSON.stringify(outRes)));
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
        Res.send((JSON.stringify(outRes)));
        return;
      default:
        outRes.msg = "You're not logged in: " + err_msg;
        outRes.error = output.err;
        Res.send((JSON.stringify(outRes)));
    }

  }
});



app.post("/banc/register", (req, Res) => {
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  //
  // read input data
  const fname = req.body.firstname;
  const mname = req.body.middlename;
  const lname = req.body.lastname
  const email = req.body.email;
  const uid = req.body.userid;
  const pwd = req.body.pwd;
  const cell = req.body.cell;
  if (!validator.registrationData(fname, mname, lname, uid, email, cell)) {

  }

  var cond = -100;
  var primeid = -1;
  var personid = -1;
  var output = {};
  const out = uid + "," + pwd + "," + email + "," + cell;
  console.log(out);

  //
  // Strict mode check email is also valide
  var sqlStmt = "CALL FindPerson(" + `'${fname}', '${mname}', '${lname}', '${email}', 1);`;
  console.log(sqlStmt);

  function aSetCredsCB(result, err) {
    if (err === null) {
      var row = result[0];
      if (cond === -100) {
        primeid = row.primid;
        personid = row.persnid;
        if (personid === -1 && primeid === -1) {
          output = {
            "msg": row.msg + " with information: " + `'${fname}', '${mname}', '${lname}', '${email}'.`,
            "error": null
          };
          Res.send((JSON.stringify(output)));
        } else {
          cond = req.body.condition;
          sqlStmt = "CALL setCredential(" + `'${uid}', '${pwd}', '${email}', ${personid}, ${primeid}, '${cell}', ${cond});`;
          console.log(sqlStmt);
          dHelper.executeStoreProc(sqlStmt, aSetCredsCB);
        }
      } else {
        output = {
          "msg": row.msg + " with information: " + `'${fname}', '${mname}', '${lname}', '${email}'.`,
          "error": null
        };
        Res.send((JSON.stringify(output)));
      }
    } else {
      output = {
        "msg": "Error during setting up credentials",
        "error": err
      };
      Res.send((JSON.stringify(output)));
    }

  }

  //
  dHelper.executeStoreProc(sqlStmt, aSetCredsCB);

});

/**
 * Start the server 
 */
server.listen(port, () => {
  console.log("BANC Server Started on: " + port);
});