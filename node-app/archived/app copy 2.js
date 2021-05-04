// @ts-check
const fs = require("fs"),
  http = require("http"),
  https = require("https"),
  express = require("express"),
  bodyParser = require("body-parser");

const banc = require('./banc_class.js');
const app = express();
const port =  3700;
var calledServiceURL = "";
const verbose = true;
const dHelper = new banc.setupDataHelper(verbose);
dHelper.setEventInfo();
dHelper.setTransactionTypeInfo();
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

/**
 * The "acquire" endpoint for the Example Schema Extension service
 */
app.post("/exampleSchemaExtension/acquire", (req, res) => {
  // Hard-code the data; this example is about the schema and charting scheme fragments
  const tweets = [{
      id: "tweet-1",
      user: "user1",
      contents: "My first tweet"
    },
    {
      id: "tweet-2",
      user: "user2",
      contents: "It's hot today"
    }
  ];

  res.send({
    entities: tweets.map(t => {
      return {
        id: t.id,

        // Aligns with the additional entity and property types in schema.xml
        // The server learns about the additions from the "schema" endpoint
        typeId: "TWEET",
        properties: {
          TW1: t.contents,
          TW2: t.user,
          TW3: t.contents.length
        }
      };
    })
  });
});


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
  function aPrimeCB(result) {
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
  function aPayMemCB(result) {
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
    "info": null,
    "token": token
  };

  function aMembersCB(result) {
    if (resultSeq == 0) {
      resultSeq = 1;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          var row = result[key];
          primeId = row.entity_id;
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
            output["info"] = row;
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
  let sqlStmt, dInfo, isminor;
  const token = req.query.token;
  const email_token = req.query.email;
  const insert = req.query.update || false;
  console.log(req.body);
  const memberInfo = req.body;
  console.log(memberInfo["prime"]);
  let output = {};
  let primeInfo = memberInfo["prime"];
  let spouseInfo = memberInfo.spouse;
  let depInfo = memberInfo.deps;
  let address = memberInfo.address;
  let fcomm = {
    "email": primeInfo.email,
    "telephone": primeInfo.telephone,
    "mobile": primeInfo.mobile
  };
  console.log(fcomm);
  //
  var resultSeq = "prime";
  var primeId = 0;
  var spouseId = 0;
  var assocData = [];
  var depLen = depInfo.length;
  var depProc = 0;
  const assocTypes = dHelper.getAssocLinkInfo()
  sqlStmt = dHelper.sqlPerson(primeInfo, 1, 0, 0, primeInfo.entity_id);
  //
  dHelper.setMemberInfo(sqlStmt, setMembersCB);
  //
  function setMembersCB(result) {
    if (resultSeq == "prime") {
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          let row = result[key];
          primeInfo.entity_id = row.entity_id;
          primeId = row.entity_id;
          output["prime"] = primeInfo;
        });
      }
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
      }
      //
    } else if (resultSeq == "spouse") {
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          let row = result[key];
          spouseInfo.entity_id = row.entity_id;
          spouseId = row.entity_id;
          output["spouse"] = spouseInfo;
          assocData.push([primeId, row.entity_id, 'person', 'person', 'spouse', assocTypes['spouse']]);
        });
      }
      //dHelper.associatedAddress(primeId, aMembersCB);
      //dHelper.associatedFamilyComm(primeId, aMembersCB);
      if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.setMemberInfo(sqlStmt, setMembersCB);
        return;
      }
    } else if (resultSeq == "deps") {
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          let row = result[key];
          depInfo[depProc]['entity_id'] = row.entity_id;
          assocData.push([primeId, row.entity_id, 'person', 'person', 'Child', assocTypes['parent']]);
          if (spouseId > 0) {
            assocData.push([spouseId, row.entity_id, 'person', 'person', 'Child', assocTypes['parent']]);
          }
        });
      }
      if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.setMemberInfo(sqlStmt, setMembersCB);
        return;
      } else {
        output['deps'] = depInfo;
        if (insert) {
        resultSeq = "links";
        sqlStmt = dHelper.sqlAssocLink(false);
        dHelper.createAssociaLinks(sqlStmt, assocData, setMembersCB);
        return;
        } else {
          resultSeq = "done";
        }
      }

    } else if (resultSeq == "links") {
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          let row = result[key];
          depInfo[depProc]['entity_id'] = row.entity_id;
          assocData.push([primeId, row.entity_id, 'person', 'person', 'Child', assocTypes['parent']]);
          if (spouseId > 0) {
            assocData.push([spouseId, row.entity_id, 'person', 'person', 'Child', assocTypes['parent']]);
          }
        });
      }
      if (depProc < depLen) {
        resultSeq = "deps";
        dInfo = depInfo[depProc];
        isminor = dInfo.isMinor;
        sqlStmt = dHelper.sqlPerson(dInfo, 0, 1, isminor, dInfo.entity_id);
        depProc = depProc + 1;
        dHelper.setMemberInfo(sqlStmt, setMembersCB);
        return;
      } else {
        resultSeq = "done";
      }
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
  function aMembershipCB(result) {
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