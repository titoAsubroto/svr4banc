// @ts-check
const fs = require("fs"),
  http = require("http"),
  https = require("https")
const express = require('express');
const bodyParser = require('body-parser');

const banc = require('./banc_class.js');
const app = express();
const port = 3700;
var calledServiceURL = "";
const verbose = true;
const dHelper = new banc.setupDataHelper(verbose);
dHelper.setEventInfo();
dHelper.setTransactionTypeInfo();
dHelper.setLinkInfo()
var output = dHelper.printData();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

/**
 * Test function
 * processResportELP
 */
function processReportELP(lRes) {

  const out = {
    "data": 4,
    "responseCode": 5
  }
  lRes.send((JSON.stringify(out)));
}

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
  server = http.createServer(app);
}

/*
 * This is a test example for calling an external api
 * You have to define a Callback function inside this function because
 * you have to get access to the req, lRes objects.
 * The Callback function also contains a response object (rRes) from the remote server.
 */

app.get("/lxnx/test1", (req, lRes) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  output = dHelper.printData();
  console.log(output);
  lRes.send((JSON.stringify(output)));

});
//
app.get("/banc/getprime", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.token;
  const fname = req.query.fname;
  const lname = req.query.lname;
  const mname = req.query.mname;
  const email = req.query.email;
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
  dHelper.getPrimeMember(fname, mname, lname, email, aPrimeCB);

});
//
//
app.post("/banc/paymembership", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.token;
  const email_token = req.query.email;
  const id = req.body.id;
  const txnId = req.body.transaction_id;
  const mType = req.body.membership_type;
  const year = req.body.year;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const mname = req.body.mname;
  const email = req.body.email;
  //
  function aPayMemCB(result, err) {
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
  dHelper.getPrimeMember(fname, mname, lname, email, aPayMemCB);

});
//
//
app.get("/banc/getmemberinfo", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.token;
  const fname = req.query.fname;
  const lname = req.query.lname;
  const mname = req.query.mname;
  const email = req.query.email;
  //
  var resultSeq = 0;
  var primeId = null;
  var output = {
    "prime": null,
    "spouse": null,
    "deps": [],
    "address": null,
    "primecomm": null,
    "token": token
  };

  function aMembersCB(result, err) {
    if (resultSeq == 0) {
      console.log(result);
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          var row = result[key];
          primeId = row.entity_id;
          console.log(primeId);
          output["prime"] = row;
        });
      }
      dHelper.associatedPersons(primeId, aMembersCB);
      return;
    } else if (resultSeq == 1) {
      resultSeq = 2;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          var row = result[key];
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
          var row = result[key];
          if (row.street) {
            output["address"] = row;
          } else {
            output["primecomm"] = row;
          }
        });
      }
    }
    if (resultSeq > 3) {
      Res.send((JSON.stringify(output)));
    }
    return;
  }
  //
  dHelper.getPrimeMember(fname, mname, lname, email, aMembersCB);

});
//
//
app.post("/banc/setmemberinfo", (req, Res) => {
  //
  //
  console.log("====== /setmemberinfo ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  let sqlStmt, dInfo, isminor, name, dep_insert, depId;
  const token = req.query.token;
  const email_token = req.query.email;
  console.log(req.body);
  const memberInfo = req.body;
  console.log(memberInfo["prime"]);
  let output = {};
  let primeInfo = memberInfo["prime"];
  let spouseInfo = memberInfo.spouse;
  let depInfo = memberInfo.deps;
  let address = memberInfo.address;
  let primecomm = memberInfo.primecomm;

  console.log(primecomm);
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
  dHelper.setMemberInfo(sqlStmt, setMembersCB);
  //
  function setMembersCB(result, err) {
    if (resultSeq == "prime") {
        console.log("===== set Member CB ---");
      console.log(result);
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          console.log("Prime - row")
          console.log(key);
          console.log(row);
          primeId = row.entity_id;
          console.log(primeId);
          primeInfo.entity_id = row.entity_id;
        });
        console.log(primeInfo);
      } else {
        if (prime_insert) {
          primeInfo.entity_id = result.insertId;
          primeId = result.insertId;
        } else {
          primeId = primeInfo.entity_id;
        }
      }
      output["prime"] = primeInfo;

      if (Object.keys(spouseInfo).length !== 0) {
        resultSeq = "spouse";
        sqlStmt = dHelper.sqlPerson(spouseInfo, 0, 0, 0, spouseInfo.entity_id);
        dHelper.setMemberInfo(sqlStmt, setMembersCB);
        return;
      } else if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.setMemberInfo(sqlStmt, setMembersCB);
        return;
      } else {
        resultSeq = "done"
      }
    
    //
  } else if (resultSeq == "spouse") {

    if (spouse_insert) {
      spouseInfo.entity_id = result.insertId;
      spouseId = result.insertId;
    } else {
      spouseId = primeInfo.entity_id;
    }
    output["spouse"] = spouseInfo;

    if (prime_insert || spouse_insert) {
      name = assocTypes[assocTypes['spouse']];
      assocData.push([primeId, spouseId, 'person', 'person', name, assocTypes['spouse']]);
    }
    console.log(assocTypes);
    //dHelper.associatedAddress(primeId, aMembersCB);
    //dHelper.associatedFamilyComm(primeId, aMembersCB);
    if (depProc < depLen) {
      resultSeq = "deps";
      dInfo = depInfo[depProc];
      isminor = dInfo.isMinor;
      dep_insert = ((dInfo.entity_id > 0) ? false : true);
      sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
      depProc = depProc + 1;
      dHelper.setMemberInfo(sqlStmt, setMembersCB);
      return;
    } else {
      if (Array.isArray(assocData) && assocData.length) {
        resultSeq = "links";
        sqlStmt = dHelper.sqlAssocLink(false);
        dHelper.createAssocLinks(sqlStmt, assocData, setMembersCB);
        return;
      } else {
        resultSeq = "done";
      }
    }
  } else if (resultSeq == "deps") {

    if (dep_insert) {
      depInfo[depProc]['entity_id'] = result.insertId;
      depId = result.insertId;
    } else {
      depId = primeInfo.entity_id;
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
      dHelper.setMemberInfo(sqlStmt, setMembersCB);
      return;
    } else {
      output['deps'] = depInfo;
      if (Array.isArray(assocData) && assocData.length) {
        resultSeq = "links";
        sqlStmt = dHelper.sqlAssocLink(false);
        dHelper.createAssociaLinks(sqlStmt, assocData, setMembersCB);
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


});
//
app.get("/banc/ismember", (req, Res) => {
  //
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const token = req.query.token;
  const id = req.query.entity_id;
  const year = req.query.year || null;
  const email = req.query.email;
  //
  //
  function aMembershipCB(result, err) {
    var output = {
      "membership": [],
      "status": "unknown",
      "year": year,
      "id": id,
      "token": token
    };
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
 * The "config" endpoint for the example connector
 */
app.get("/config", (req, res) => {
  res.download("config.json");
});


/**
 * Start the server 
 */
server.listen(port, () => {
  console.log("BANC Server Started on: " + port);
});