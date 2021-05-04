// @ts-check
const fs = require("fs"),
  http = require("http"),
  https = require("https")
const express = require('express');
const bodyParser = require('body-parser');

const banc = require('./banc_class_pg.js');
const app = express();
var port = 3700;
//
var calledServiceURL = "";
const verbose = true;
const useHeader = false;
const dHelper = new banc.setupDataHelper(verbose);
const dbTxnHelper = new banc.TransactionManager(dHelper.getDbConfig);
//dHelper.setEventInfo();
//dHelper.setTransactionTypeInfo();
//dHelper.setAffiliationTypeInfo();
//dHelper.setLinkInfo();
testTransactions();
// var output = dHelper.printData();

/*
* Do asynchronous connection to do quick select or insert;
*/
async function getTransactionClient() {
  var pool = dHelper.getDBPool();
  try {
    var client = await pool.connect();
  } catch (err) {
    console.log("Error occured - get Trans");
    console.log(err);
    throw err;
  }
  return client;
}
//
//
async function beginTransaction(client) {
  var result = false;
  try {
    await client.query('BEGIN');
    result = true;
  } catch (err) {
    console.log("Error occured - Begin Trans");
    throw err;
  }
  return result;
}
//
async function executeTransaction(client, sql, args) {
  var result = null;
  try {
    result = await client.query(sql);
  } catch (err) {
    console.log("Error occured - Execute")
    throw err;
  }
  return result;
}
//
async function endTransaction(client, commit) {
  //
  let res;
  try {
    if (commit) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    res = true;
  } catch (err) {
    res = false;
    throw err;

  } finally {
    client.release();
  }
  return res;
}
//
// Test transactions
function testTransactions() {
  var txn_step = 0;
  var res = null;
  var sqlStmt;

  var args;

  dbTxnHelper.executeTransactions(aflowCB);

  //
  function aflowCB(err, rows, flow_step) {
    //
    var out={};
    if (err) {
      flow_step = -1;
    }
    
    console.log(flow_step);
    switch (flow_step) {
      case 0:
        //

        dt = {
          "firstname": 'Subroto', "middlename": '', "lastname": 'Bhattacharya', "email": 'subroto@computer.org', "affiliationid": '',
          "telephone": '9194607990', "mobile": '9193451714'
        }
        sqlStmt = dHelper.getPersonSQL(dt, 1, 0, 0, null);
        console.log(sqlStmt);
        out.sql = sqlStmt;
        out.value = null;
        out.done = false;
        out.step = flow_step;
        return out;

      case 1:
        if (rows) {
          console.log('step: ', txn_step)
          console.log(res);
        } else {
          console.log('err');
        }
        out.sql = null;
        out.value = null;
        out.done = true;
        out.step = flow_step;
        return out;

      default:
        console.log("Default -- why?")

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
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  if (useHeader) {
    const token = req.header("stoken");
    const fname = req.header("fname");
    const lname = req.header("lname");
    const mname = req.header("mname");
    const email = req.header("email");
    const uid = req.header("uid");
  } else {
    const token = req.query.stoken;
    const fname = req.query.fname;
    const lname = req.query.lname;
    const mname = req.query.mname;
    const email = req.query.email;
    const uid = req.query.uid;
  }
  //
  //
  function aPrimeCB(result, err) {
    var output = {
      "prime": null,
      "token": token
    };
    if (Array.isArray(result) && result.length) {
      Object.keys(result).forEach(function (key) {
        var row = result[key];
        output["prime"] = row;
      });
    }
    Res.send((JSON.stringify(output)));
  }
  //
  dHelper.getPrimeMember(fname, mname, lname, email, null, aPrimeCB);

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
  const sessiontoken = req.query.stoken;
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
app.get("/banc/findPerson", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const email = req.query.email;
  const fname = req.query.firstname;
  const lname = req.query.lastname;
  const mname = req.query.middlename;
  const year = req.query.year || null;

  var output = {
    "spouse": false,
    "deps": false,
    "address": true,
    "primecomm": true,
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
  //
  // read input data
  const mail = req.body.email;
  const uid = req.body.userid;
  const pwd = req.body.pwd;
  const cell = req.body.cell;
  var auth = false;
  var primeid = -1;
  var personid = -1;
  var stoken = -1;
  var output = {
    "msg": "You could not be logged in.  Please check your userid, email or password!",
    "auth": false,
    "primid": -1,
    "stoken": null,
    "persnid": -1,
    "error": null
  };
  const out = uid + "," + pwd + "," + mail + "," + cell;
  console.log(out);
  var testOK, msg = dHelper.testCreds(uid, pwd, mail, cell);
  if (!testOK) {
    output.msg = msg;
    Res.send((JSON.stringify(output)));
    return;
  }

  //
  var sqlStmt = "select * from banc.getauthtoken(" + `'${uid}', '${pwd}', '${mail}', '${cell}');`;
  console.log(sqlStmt);

  function aLoginCB(result, err) {
    if (err === null) {
      var row = result[0];
      if (row.auth === 1) {
        output = {
          "msg": "You're successfully logged in!",
          "auth": true,
          "primid": row.primid,
          "stoken": row.stoken,
          "persnid": row.persnid,
          "error": null
        };
      } else {
        output = {
          "msg": "You could not be logged in.  Please check your userid, email or password!",
          "auth": false,
          "primid": -1,
          "stoken": null,
          "persnid": -1,
          "error": null
        };
      }
    } else {
      output = {
        "msg": "You could not be logged in.  Please check your userid, email or password!",
        "auth": false,
        "primid": -1,
        "stoken": null,
        "persnid": -1,
        "error": err
      };
    }
    Res.send((JSON.stringify(output)));
  }
  //
  dHelper.executeStoreProc(sqlStmt, aLoginCB);

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