"use strict";
//
// Updated on Jan 20, 2021
Object.defineProperty(exports, "__esModule", {
  value: true,
});
//
// db is prostgres now
const fs = require("fs");
const crypto = require("crypto");
const appConfig = require("config");
var querystring = require("querystring");
const { Pool } = require("pg");
const { release } = require("os");
const c = require("config");
const { now } = require("lodash");
const e = require("express");
//var useDb = require('pg');

class SetupDataHelper {
  constructor(verbose) {
    this.config = JSON.parse(fs.readFileSync("bdl-config.json", "utf8"));
    this.apiAuth = JSON.parse(
      fs.readFileSync("apiAuthorizationSetup.json", "utf8")
    );
    this.clientApiKeys = JSON.parse(
      fs.readFileSync("apiClientKeys.json", "utf8")
    );
    this.testdata = JSON.parse(fs.readFileSync("testdata.json", "utf8"));
    //const sqlStmt = fs.readFileSync("predef_sql_statements.json", "utf8");
    // this.predef_SQLs = JSON.parse(sqlStmt)
    this.verbose = verbose ? true : false;
    this.validityOfToken = 36000; // in minutes
    this.txnTypeInfo = {};
    this.affiliationType = [];
    this.eventInfo = {};
    this.assocLinkInfo = {};
    this.api2AuthGroupMap = this.apiAuth.api2AuthGroupMap;
    this.authGroup = this.apiAuth.authGroup;
    this.groupBlocked = this.apiAuth.groupBlocked;
    this.apiClientGroup = this.apiAuth.apiClientGroup;
    this.banc_org_id = "BANCinRDU";
    this.banc_entity_id = 100;
    this.org_entity = "organization";
    this.result = null;
    this.insertId = null;
    this.activeSchema = this.config.db_schemaDev;
    this.db_config = {
      host: this.config.db_host, // Server hosting the postgres database
      port: this.config.db_port, // env var: PGPORT - 5432
      user: this.config.Pg_uid, // env var: PGUSER
      password: this.config.Pg_pwd, // env var: PGPASSWORD
      database: this.config.database, // env var: PGDATABASE
      max: 15, // max number of clients in the pool
      ssl: {
        rejectUnauthorized: false,
      },
      idleTimeoutMillis: 50000, // how long a client is allowed to remain idle before being closed
    };
    this.pool = new Pool(this.db_config);
    this.validator = new DataValidator(verbose);
  }
  //Test function
  testFunction(req, Res) {
    console.log("Test Function --->");
    var outRes = {
      membership: null,
      events: null,
      summary: null,
      paypal: null,
      cash: null,
    };
    let form_date = null;
    let form_memo = this.testdata.form_memo;
    let form_ref_id = this.testdata.form_ref_id;
    var processEventTransaction = this.processEventTransaction.bind(this);
    var processMembershipTransaction =
      this.processMembershipTransaction.bind(this);
    var processSummaryTransaction = this.processSummaryTransaction.bind(this);
    // create function data
    var data = this.sortAndBuildTransactionData(
      form_ref_id,
      form_memo,
      form_date,
      this.testdata
    );

    var primeid = 35;
    // call function
    if (data.membership.length > 0) {
      console.log("Membership Data: ", data.membership[0]);
      processMembershipTransaction(primeid, data.membership[0], 0, testFnCB);
    } else if (data.event.length > 0) {
      console.log("Event Data: ", data.event);
      processEventTransaction(primeid, data.event, 1, testFnCB);
    } else if (data.summary.length > 0) {
      console.log("Summary Transaction Data: ", data.summary);
      processSummaryTransaction(primeid, data.summary[0], 2, testFnCB);
    } else if (data.paypal.length > 0) {
      console.log("PayPal Data: ", data);
      //  processPayPalTransaction(primeid, data.paypal, 3, testFnCB);
    } else if (data.cash.length > 0) {
      console.log("Cash Data: ", data);
      //  processCashTransaction(primeid, data.cash, 4, testFnCB);
    } else {
      Res.send(outRes);
    }

    //
    function testFnCB(output) {
      console.log(output);
      if (output.flow_step == 0) {
        outRes.membership = output;

        if (data.event.length > 0) {
          console.log("Event Data: ", data.event);
          processEventTransaction(primeid, data.event, 1, testFnCB);
        } else if (data.summary.length > 0) {
          console.log("Summary Transaction Data: ", data.summary);
          processSummaryTransaction(primeid, data.summary[0], 2, testFnCB);
        } else if (data.paypal.length > 0) {
          console.log("PayPal Data: ", data);
          //  processPayPalTransaction(primeid, data.paypal, 3, testFnCB);
        } else if (data.cash.length > 0) {
          console.log("Cash Data: ", data);
          //  processCashTransaction(primeid, data.cash, 4, testFnCB);
        } else {
          Res.send(outRes);
          return;
        }
      }
      if (output.flow_step == 1) {
        outRes.events = output;
        if (data.summary.length > 0) {
          console.log("Summary Transaction Data: ", data.summary);
          processSummaryTransaction(primeid, data.summary[0], 2, testFnCB);
        } else if (data.paypal.length > 0) {
          console.log("PayPal Data: ", data.paypal);
          //  processPayPalTransaction(primeid, data.paypal, 3, testFnCB);
        } else if (data.cash.length > 0) {
          console.log("Cash Data: ", data.cash);
          //  processCashTransaction(primeid, data.cash, 4, testFnCB);
        } else {
          Res.send(outRes);
          return;
        }
      }
      if (output.flow_step == 2) {
        outRes.summary = output;
        if (data.paypal.length > 0) {
          console.log("PayPal Data: ", data.paypal);
          //  processPayPalTransaction(primeid, data.paypal, 3, testFnCB);
        } else if (data.cash.length > 0) {
          console.log("Cash Data: ", data);
          //  processCashTransaction(primeid, data.cash, 3, testFnCB);
        } else {
          Res.send(outRes);
          return;
        }
      }
      if (output.flow_step == 3) {
        outRes.paypal = output;
        if (data.cash.length > 0) {
          console.log("Cash Data: ", data);
          //  processCashTransaction(primeid, data.cash, 3, testFnCB);
        } else {
          Res.send(outRes);
          return;
        }
      }
      if (output.flow_step == 4) {
        outRes.cash = output;

        Res.send(outRes);
        return;
      }
    }
  }
  //function to Update the Unprocessed Data table
  updateUnprocessedDataTable(
    procData,
    banc_transaction,
    settlement,
    aCallback
  ) {
    console.log(" updateUnprocessedDataTable --->");
    var outRes = {};
    aCallback(outRes);
  }
  //function to process raw unprocessed pay data
  processPayData(rawData, primeid2Use, aCallback) {
    console.log("ProcessPayData --->");

    let form_date = rawData.form_date;
    let form_memo = rawData.form_memo;
    let form_ref_id = rawData.form_ref;
    console.log(form_ref_id, form_date, form_memo);
    let cash = rawData.pay_data.cash ? rawData.pay_data.cash : [];
    let raw_data = {
      cash: cash,
      paypal: [],
      transactions: rawData.pay_data.transactions,
      event: rawData.pay_data.event,
      membership: rawData.pay_data.membership,
    };
    var outRes = {
      form_ref_id: form_ref_id,
      membership: null,
      events: null,
      summary: null,
      msg: null,
      err: null,
    };
    var primeid = primeid2Use;
    var processEventTransaction = this.processEventTransaction.bind(this);
    var processMembershipTransaction =
      this.processMembershipTransaction.bind(this);
    var processSummaryTransaction = this.processSummaryTransaction.bind(this);
    // create function data
    var data = this.sortAndBuildTransactionData(
      form_ref_id,
      form_memo,
      form_date,
      raw_data
    );
    /* var primeid = 35;
        outRes.msg = data;
        aCallback(outRes);
        return;
        */
    let output = {
      flow_step: 0,
      err: false,
      msg: null,
    };
    // Call the callback function

    if (data.membership.length > 0 || data.event.length > 0) {
      console.log("Raw Data OK. Calling procPayFnCB -->");
      procPayFnCB(output);
    } else {
      outRes.msg = "Something wrong with the rawData sent! Everything is null.";
      outRes.err = true;
      aCallback(outRes);
    }
    // callback function
    //
    function procPayFnCB(output) {
      //console.log(output);
      let flow_step = output.flow_step;
      if (flow_step == 0) {
        flow_step = 1;
        if (data.membership.length > 0) {
          console.log("Membership Data: ", data.membership[0]);
          processMembershipTransaction(
            primeid,
            data.membership[0],
            flow_step,
            procPayFnCB
          );
          return;
        }
      }
      //
      if (flow_step == 1) {
        flow_step = 2;
        outRes.membership = output;
        if (data.event.length > 0) {
          console.log("Event Data: ", data.event);
          processEventTransaction(primeid, data.event, flow_step, procPayFnCB);
          return;
        }
      }
      //
      if (flow_step == 2) {
        flow_step = 3;
        outRes.events = output;
        if (data.summary.length > 0) {
          console.log("Summary Transaction Data: ", data.summary);
          processSummaryTransaction(
            primeid,
            data.summary[0],
            flow_step,
            procPayFnCB
          );
          return;
        }
      }
      if (flow_step == 3) {
        outRes.summary = output;
        outRes.msg =
          "Raw Pay Data processed for form_ref_id=" + outRes.form_ref_id;
        outRes.err = false;
        aCallback(outRes);
        return;
      }
    }
  }
  //
  getConfig() {
    return this.config;
  }
  getActiveSchema() {
    return this.activeSchema;
  }
  verifyApi2Execute(api, authgroup) {
    var out = false;
    if (!this.groupBlocked.includes(authgroup)) {
      if (api in this.api2AuthGroupMap) {
        // console.log("BLOCKED: ", this.groupBlocked);
        out = this.api2AuthGroupMap[api].includes(authgroup);
      }
    }
    return out;
  }
  //
  verifyClientIdAccess(api, clientId, apiKey) {
    var client, out;
    var out = {
      valid: false,
    };
    if (api.length > 0 && clientId.length > 0) {
      // 'digest' is the output of hash function containing
      // only hexadecimal digits
      var hashedClientId = crypto
        .createHash("sha1")
        .update(clientId)
        .digest("hex");
      console.log("hashedClientId - " + hashedClientId);
      console.log(api, clientId, hashedClientId, apiKey, this.clientApiKeys);
      // Use hashed client id because that is stored.
      if (hashedClientId in this.clientApiKeys) {
        client = this.clientApiKeys[hashedClientId];
        console.log("client found: ");
        console.log(client);
        if (apiKey == client.apikey) {
          console.log("apikey matched!");
          let group = this.apiClientGroup[client.group];
          console.log("api group: ", group);
          out.group = group;
          out.valid = this.verifyApi2Execute(api, group);
        }
      }
    }
    console.log("client - access: ", out);
    return out;
  }
  //
  getLastId() {
    return this.insertId;
  }
  getLastResult() {
    return this.result;
  }
  getAssocLinkInfo(name) {
    var out = {};
    if (name in this.assocLinkInfo) {
      out = this.assocLinkInfo[name];
    }
    return out;
  }
  getEventInfo() {
    return this.eventInfo;
  }
  getAffiliationTypeInfo() {
    return this.affiliationType;
  }
  getTransactionType() {
    return this.txnTypeInfo;
  }
  getTransactionId(cat, subcat, searchtext) {
    //    console.log("Transaction type: ", this.txnTypeInfo);
    var i, arr, arr_key;
    console.log(cat, subcat, searchtext);
    if (subcat == null) {
      arr = this.txnTypeInfo[cat];
      const keys = Object.keys(arr);
      for (const key of keys) {
        arr_key = arr[key];
        console.log(arr_key);
        for (i = 0; i < arr_key.length; i++) {
          if (arr_key[i].mapping.indexOf(searchtext) != -1) {
            return arr_key[i].type_id;
          }
        }
      }
    } else {
      arr = this.txnTypeInfo[cat][subcat];
      for (i = 0; i < arr.length; i++) {
        if (arr[i].mapping.indexOf(searchtext) != -1) {
          return arr[i].type_id;
        }
      }
    }
    return -1;
  }
  getTransactionInfoFromId(type_id, lineItemONLY = null) {
    // console.log("LineItem");
    var typeIds = this.txnTypeInfo["typeIds"];
    var out;
    //console.log(typeIds, typeIds[type_id]);
    if (type_id in typeIds) {
      if (lineItemONLY != null) {
        out = typeIds[type_id].line_item;
      } else {
        out = typeIds[type_id];
      }
      return out;
    }
    return null;
  }
  setLastResult(result) {
    this.result = result;
  }
  getDbConfig() {
    return this.db_config;
  }
  //
  getValueFromJSON(key, jD, type = null) {
    var out = null;
    if (key in jD) {
      console.log(key, jD, jD[key]);
      switch (type) {
        case "int":
          out = jD[key];
        case "float":
          out = jD[key];
        default:
          out = jD[key];
      }
    }
    return out;
  }
  /*
   * Execute SQL Statement
   */
  /*
    executeSQL(sqlStmt, args, actionCallback) {
        if (sqlStmt === null) {
            const error_msg = { "msg": "SQL statement is null", "stack": null };
            actionCallback(null, error_msg);
        }
        this.pool
            .connect()
            .then(client => {
                return client
                    .query(sqlStmt, args)
                    .then(result => {
                        console.log("------ Execute SQL  -----");
                        client.query("COMMIT")
                        //console.log(result.rows);
                        var txnTypeInfo = {};
                        var rows = result.rows;
                        actionCallback(rows, null);
                        return;
                    })
                    .catch(err => {
                        client.release();
                        console.log(err.stack);
                        actionCallback(null, err);
                        return;
                    });
            });
    }
    //
    printData() {
        console.log(this.txnTypeInfo);
        console.log("PrintData:", this.eventInfo);
        return [this.eventInfo, this.txnTypeInfo];
    }
    */
  setLinkInfo() {
    //
    const sqlStmt =
      "SELECT type_name, type_id, display_name FROM " +
      this.activeSchema +
      ".link_type;";
    this.pool.connect().then((client) => {
      return client
        .query(sqlStmt, null)
        .then((result) => {
          client.release();
          console.log("-------------LinkInfo");
          //console.log(result.rows);
          var lInfo = {};
          var rows = result.rows;
          Object.keys(rows).forEach(function (key) {
            var row = rows[key];
            //console.log(row)
            lInfo[row.type_name] = {
              type_id: row.type_id,
              display_name: row.display_name,
            };
          });
          //console.log("LinkInfo: ", lInfo);
          this.assocLinkInfo = lInfo;
          return;
        })
        .catch((err) => {
          client.release();
          console.log(err.stack);
        });
    });
  }
  //
  setEventInfo() {
    const sqlStmt =
      "SELECT eventname, venue, entity_id, event_year, showlink, start_date, end_date FROM " +
      this.activeSchema +
      ".event;";
    //
    this.pool.connect((err, client, done) => {
      if (err) {
        console.log("Error calling setEventInfo -- Connection failed.");
      }
      client.query(sqlStmt, null, (err, res) => {
        done();

        if (err) {
          console.log(err.stack);
        } else {
          //console.log(res.rows);
          console.log("------------ Event ---------");
          this.setupEventInfo(res.rows);
          // console.log(this.eventInfo);
        }
      });
    });
  }
  //
  setupEventInfo(result) {
    var eInfo = {};
    Object.keys(result).forEach(function (key) {
      var row = result[key];
      //console.log(row)
      var eName = row.eventname;
      var id = row.entity_id;
      var year = row.event_year;
      var showlink = row.showlink;
      var sd = row.start_date;
      var ed = row.end_date;
      var ve = row.venue;
      //console.log(eName, id, year);
      if (year in eInfo == false) {
        eInfo[year] = {};
        console.log(year);
      }
      eInfo[year][eName] = {
        id: id,
        showlink: showlink,
        venue: ve,
        start_date: sd,
        end_date: ed,
      };
    });
    //console.log("Event Info: ", eInfo);
    this.eventInfo = eInfo;
    return;
  }
  //
  getAccessInfo(req) {
    var out = {};
    out.token =
      typeof req.header("stoken") === "undefined" ? "" : req.header("stoken");
    out.email =
      typeof req.header("email") === "undefined" ? "" : req.header("email");
    out.uid =
      typeof req.header("userid") === "undefined" ? "" : req.header("userid");
    out.apikey =
      typeof req.header("apikey") === "undefined" ? "" : req.header("apikey");
    out.clientid =
      typeof req.header("clientid") === "undefined"
        ? ""
        : req.header("clientid");
    out.formatType =
      typeof req.header("formatType") === "undefined"
        ? "default"
        : req.header("formatType");
    out.fname =
      typeof req.header("fname") === "undefined" ? "" : req.header("fname");
    out.mname =
      typeof req.header("mname") === "undefined" ? "" : req.header("mname");
    out.lname =
      typeof req.header("lname") === "undefined" ? "" : req.header("lname");

    out.calledServiceURL = req.url;
    return out;
  }
  validateAccess(accessInfo, actionCallback) {
    var output = {
      sql1_result: null,
      valid: false,
      access_option: "user",
      authgroup: this.authGroup.user,
      primeid: 0,
      personid: 0,
      err: null,
      msg: "",
      statusCode: 200,
    };
    if (
      accessInfo.uid.length > 0 &&
      accessInfo.token.length > 0 &&
      accessInfo.email.length > 0
    ) {
      this.isTokenValid(
        accessInfo.uid,
        accessInfo.email,
        accessInfo.token,
        actionCallback
      );
    } else {
      let result = this.verifyClientIdAccess(
        accessInfo.calledServiceURL,
        accessInfo.clientid,
        accessInfo.apikey
      );
      output.authgroup = result.group;
      output.access_option = "client";
      output.valid = result.valid;
      if (!result.valid) {
        output.msg = "Unauthorized to call!";
        output.statusCode = 403;
        actionCallback(output);
        return;
      } else {
        output.msg = "Authorized client.";
        actionCallback(output);
      }
    }
  }
  //
  isTokenValid(userid, email, token, actionCallback) {
    let expiryTime = ` AND valid_date >= now() - INTERVAL '${this.validityOfToken} MINUTES';`;
    var sqlStmt =
      "SELECT primeid, personid, authlevel FROM " +
      this.activeSchema +
      ".sessionToken WHERE uid=$1 and email=$2 and token=$3 " +
      expiryTime;
    var args = [userid, email, token];
    console.log(args);
    var output = {
      sql1_result: null,
      valid: false,
      access_option: "user",
      authgroup: this.authGroup.user,
      primeid: 0,
      personid: 0,
      err: null,
      msg: "Invalid access token or Expired.",
      statusCode: 200,
    };
    const validate = new DataValidator(true);
    if (!validate.tokenData(userid, email, token)) {
      output.msg = "Invalid Token parameters";
      output.err = true;
      output.statusCode = 403;
      actionCallback(output);
      return;
    }
    // console.log ("isTokenValid: ", sqlStmt);
    //
    this.pool.connect((err, client, done) => {
      console.log("------------ Token Validation start---------");
      if (err) {
        console.log(
          "Error in DB Connection 'isTokenValid' -- Connection failed."
        );
      }
      //console.log(sqlStmt, args);
      client.query(sqlStmt, args, (err, res) => {
        done();
        output.sql1_result = JSON.stringify(res);
        output.err = err;
        if (err) {
          console.log(err.stack);
        }
        //console.log(res.rows);
        console.log("------------ Token Validation done ---------");
        if (res.rowCount > 0) {
          output.valid = "true";
          output.msg = "Access Token valid.";
          output.primeid = res.rows[0].primeid;
          output.personid = res.rows[0].personid;
          let authlevel = res.rows[0].authlevel;
          output.authgroup = this.authGroup[authlevel];
        }

        actionCallback(output);
      });
    });
  }
  //
  setTransactionTypeInfo() {
    const sqlStmt =
      "SELECT category, subcategory, line_item, type_id, mapping_string, adult_count, child_count FROM " +
      this.activeSchema +
      ".transaction_type;";
    this.pool.connect().then((client) => {
      return client
        .query(sqlStmt, null)
        .then((result) => {
          client.release();
          console.log("------Transaction Type Infor -----");
          //console.log(result.rows);
          var txnTypeInfo = {};
          var txnTypeId = {};
          var rows = result.rows;
          Object.keys(rows).forEach(function (key) {
            var row = rows[key];
            //console.log(row)
            var cat = row.category;
            var scat = row.subcategory;
            //console.log(cat, scat);
            if (cat in txnTypeInfo == false) {
              txnTypeInfo[cat] = {};
            }
            if (row.type_id in txnTypeId == false) {
              txnTypeId[row.type_id] = {
                line_item: row.line_item,
                category: cat,
                sub_category: scat,
                adult_count: row.adult_count,
                child_count: row.child_count,
                mapping: row.mapping_string,
              };
            }
            if (scat in txnTypeInfo[cat] == false) {
              txnTypeInfo[cat][scat] = [];
            }
            var jSC = {
              type_id: row.type_id,
              line_item: row.line_item,
              mapping: row.mapping_string,
            };

            //  console.log(jSC);
            txnTypeInfo[cat][scat].push(jSC);
          });
          txnTypeInfo.typeIds = txnTypeId;
          this.txnTypeInfo = txnTypeInfo;
          //console.log("Print in setTxn: ");
          //console.log(JSON.stringify(this.txnTypeInfo));
          return;
        })
        .catch((err) => {
          client.release();
          console.log(err.stack);
        });
    });
  }
  /*
   * getAffliliationInfo
   */
  getAffiliationInfo(strMatch) {
    Object.entries(this.affiliationType).forEach(function (entry) {
      let affiliation = entry[0];
      let value = entry[1];
      let id = value["entity_id"];
      let mapstrs = value["mapping_string"].split("|");
      Object.keys(mapstrs).forEach(function (key) {
        let mapstr = mapstrs[key];
        if (mapstr.indexOf() > -1) {
          return [id, affiliation];
        }
      });
    });
    return [1010, "Family-member"];
  }
  //
  setAffiliationTypeInfo() {
    const sqlStmt =
      "SELECT affiliation, ismember, entity_id, mapping_string FROM " +
      this.activeSchema +
      ".banc_community;";
    this.pool.connect().then((client) => {
      return client
        .query(sqlStmt, null)
        .then((result) => {
          client.release();
          var rows = result.rows;
          var affInfo = {};
          Object.keys(rows).forEach(function (key) {
            var row = rows[key];
            //console.log(row);
            const value = {
              mapping_string: row["mapping_string"],
              entity_id: row["entity_id"],
              ismember: row["ismember"],
            };
            const affKey = row["affiliation"];
            affInfo[affKey] = value;
          });
          this.affiliationType = affInfo;
          console.log("Print in set Affiliation:");
          //console.log(affInfo);
        })
        .catch((err) => {
          console.log("Error in setAffiliationTypeInfo - ");
          client.release();
          console.log(err.stack);
        });
    });
  }
  //
  //
  sortAndBuildTransactionData(form_ref_id, form_memo, form_date, jData) {
    var date2use, allTxns;
    console.log("sortAndBuildTransactionData -->", jData);
    if (form_date == null) {
      date2use = this.getUTCTimestamp(form_date);
    } else {
      date2use = this.getUTCTimestamp(now());
    }
    // A Template for the transaction
    var txn_template = {
      entity_id: 0,
      amount: 0.0,
      service_fee_paid: 0.0,
      amount_net: 0.0,
      info: null,
      name: null,
      eventname: null,
      year: null,
      link_type_id: null,
      form_date: date2use,
      form_memo: null,
      form_ref: form_ref_id,
      bank_transaction_memo: "-",
      bank_transaction_ref: "-",
      bank_transaction_date: null,
      inbound: true,
      transaction_type_id: null,
      summary: false,
      paypalType: null,
      adult_count: 0,
      child_count: 0,
      guest_count: 0,
      status: "pending",
      quantity: 0,
    };
    var txns = {
      membership: [],
      event: [],
      summary: [],
      paypal: [],
      cash: [],
    };
    /*
     *   sort transactions
     */
    //console.log(jData);
    if ("transactions" in jData) {
      allTxns = jData.transactions;
    }
    var smry = JSON.parse(JSON.stringify(txn_template)); // creating a copy of the template
    smry.name = "Summary of Txns: ";
    var smryEventText = null;
    smry.bank_transaction_date = smry.form_date;
    //
    for (let i = 0; i < allTxns.length; i++) {
      let txndata = allTxns[i];
      console.log(txndata);
      var out = JSON.parse(JSON.stringify(txn_template)); // creating a copy of the template
      out.amount = txndata.amount * txndata.quantity;
      out.quantity = txndata.quantity;
      out.bank_transaction_date = out.form_date;
      //            console.log(txndata.category, txndata.sub_category, txndata.line_item);
      out.transaction_type_id = this.getTransactionId(
        txndata.category,
        txndata.sub_category,
        txndata.line_item
      );
      console.log(out.transaction_type_id);
      var adult_count = this.getTransactionInfoFromId(
        out.transaction_type_id
      ).adult_count;
      var child_count = this.getTransactionInfoFromId(
        out.transaction_type_id
      ).child_count;
      // Collect Summary Info
      smry.amount = smry.amount + out.amount;
      smry.quantity = smry.quantity + out.quantity;
      //
      if (txndata.category == "BANC") {
        if ("membership" in jData) {
          out.name =
            "Membership/" +
            txndata.category +
            "/" +
            txndata.sub_category +
            "/" +
            txndata.line_item;
          out.info = jData.membership.type;
          out.year = jData.membership.year;
          out.form_memo =
            form_memo + "/" + txndata.memo + "/" + out.info + "/" + out.year;
          txns.membership.push(out);
          smry.name =
            smry.name +
            txndata.category +
            "[Membership - " +
            out.year +
            "] " +
            txndata.line_item;
          smry.year = out.year;
        }
      } else if (txndata.category == "event") {
        if ("event" in jData) {
          if (txndata.line_item == "Family-member") {
            out.adult_count = jData.event.adult_count;
            out.child_count = jData.event.child_count;
            out.guest_count = jData.event.guest_count;
          } else {
            out.adult_count = adult_count * out.quantity;
            out.child_count = child_count * out.quantity;
            out.guest_count = 0;
          }
          out.eventname = jData.event.name;
          out.info = "";
          out.name =
            out.eventname +
            "/" +
            txndata.category +
            "/" +
            txndata.sub_category +
            "/" +
            txndata.line_item;
          out.year = jData.event.year;
          out.form_memo =
            out.eventname +
            ", " +
            out.year +
            ":" +
            txndata.line_item +
            "[" +
            form_memo +
            "/" +
            txndata.memo +
            "]";
          smry.year = out.year;
          let lineitem = txndata.line_item;
          if (!smryEventText) {
            smryEventText =
              "[" + out.eventname + ", " + out.year + "] " + lineitem;
          } else {
            smryEventText = smryEventText + ", " + lineitem;
          }
          //           console.log(lineitem);
          //if ((new RegExp("/Family|Student|Senior/")).exec(lineitem) !== null) {
          out.info =
            this.assocLinkInfo["member"].display_name + "/" + out.eventname;
          out.link_type_id = this.assocLinkInfo["member"].type_id;

          if (new RegExp("/Non-member/").exec(lineitem) !== null) {
            out.info =
              this.assocLinkInfo["member"].display_name + "/" + out.eventname;
            out.link_type_id = this.assocLinkInfo["non-member"].type_id;
          }

          txns.event.push(out);
        }
      }
    }
    // If PayPal data is present
    if (jData.paypal.length > 0) {
      for (let i = 0; i < jData.paypal.length; i++) {
        let paypalLine = jData.paypal[i];
        console.log(paypalLine);
        var out = JSON.parse(JSON.stringify(txn_template)); // creating a copy of the template
        out.amount = paypalLine.gross;
        out.service_fee_paid = paypalLine.fee;
        out.amount_net = paypalLine.net;
        let splitInfo = paypalLine.itemtitle.split("|");
        out.form_ref = splitInfo[0];
        out.form_memo = splitInfo[1];
        out.name = splitInfo[1];
        out.info = splitInfo[1];
        out.paypalType = paypalLine.type;
        out.bank_transaction_memo = paypalLine.itemtitle;
        out.bank_transaction_ref = paypalLine.transaction_id;
        out.bank_transaction_date = paypalLine.date;
        out.transaction_type_id = this.getTransactionId(
          "paypal",
          null,
          paypalLine.type
        );
        let txnInfo = this.getTransactionInfoFromId(out.transaction_type_id);
        console.log("transaction info: ", txnInfo);
        console.log("transaction id: ", out.transaction_type_id);
        console.log("paypalLine.type: ", paypalLine.type);
        if (txnInfo.sub_category != "receipt") {
          out.inbound = false;
        }
        if (txnInfo.line_item == "Summary-transaction") {
          out.summary = true;
        }
      }
    }
    //
    // update summary transaction
    console.log("jData: ", jData);
    if (jData.cash.length > 0) {
      smry.transaction_type_id = this.getTransactionId(
        "cash",
        "receipt",
        "Received"
      );
      smry.name = smry.name + smryEventText;
      smry.form_memo = smry.name;
      txns.summary.push(smry);
      smry.summary = true;
    } else {
      if ("event" in jData || "membership" in jData) {
        smry.transaction_type_id = this.getTransactionId(
          "paypal",
          "receipt",
          "Website"
        );
        smry.name = smry.name + smryEventText;
        smry.form_memo = smry.name;
        txns.summary.push(smry);
        smry.summary = true;
      }
    }
    //        console.log(txns);
    return txns;
  }
  /*
   * setTransactionWithPrime -- inserts or update a transaction and links to prime_id
   * If prime_id =0 then the association is not done.
   * If key > 0 the transaction is updated and the association is not done
   */
  setTransactionWithPrime(
    jData,
    primeid = null,
    info = null,
    key = null,
    aCallback
  ) {
    var entity2 = "transaction";
    var entity1 = "person";
    var entitytable = this.config.entityTables[entity2];
    var linktable1 = this.config.linkTables[entity2];
    var form_ref = jData.form_ref;
    //var date = jData.bank_transaction_date;
    let txn_info = this.getTransactionInfoFromId(
      jData.transaction_type_id,
      null
    );
    // console.log(txn_info);
    //var name = txn_info.category + "/" + txn_info.sub_category + "/" + txn_info.line_item;
    var name = jData.name;
    var sqlStmt, sql2, cond;
    cond = false;
    sql2 = null;
    if (key > 0) {
      sqlStmt =
        "UPDATE " +
        entitytable +
        " SET amount=" +
        jData.amount +
        "," +
        "service_fee_paid=" +
        jData.service_fee_paid +
        ", amount_net=" +
        jData.amount_net +
        "," +
        "bank_transaction_memo='" +
        jData.bank_transaction_memo +
        "', bank_transaction_ref='" +
        jData.bank_transaction_ref +
        "', bank_transaction_date_utc='" +
        jData.bank_transaction_date +
        "', status='" +
        jData.status +
        "' WHERE entity_id=" +
        key +
        " RETURNING *;";
      console.log("updating transaction ...");
    } else {
      var sql_stmnt =
        "INSERT INTO " +
        entitytable +
        " (amount, service_fee_paid, amount_net, form_date_utc, form_memo," +
        " form_ref, bank_transaction_memo, bank_transaction_ref, bank_transaction_date_utc, " +
        " inbound, transaction_type_id, summary, status, adult_count, child_count, quantity)  VALUES (";
      var sqlTemp = `${jData.amount}, ${jData.service_fee_paid},${jData.amount_net},'${jData.form_date}','${jData.form_memo}','${jData.form_ref}','${jData.bank_transaction_memo}',
                '${jData.bank_transaction_ref}','${jData.bank_transaction_date}',${jData.inbound}, ${jData.transaction_type_id},${jData.summary},
                 '${jData.status}', ${jData.adult_count}, ${jData.child_count}, ${jData.quantity}) RETURNING *`;
      sqlStmt = sql_stmnt + sqlTemp;
      console.log("inserting transaction ... ", jData.name);
    }
    if (primeid > 0) {
      cond = true;
      sql2 =
        "INSERT INTO " +
        linktable1 +
        " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
        "form_ref, txn_form_date) VALUES " +
        `(${primeid},$1,'person','transaction','${name}','${info}','${form_ref}','${jData.bank_transaction_date}') RETURNING *;`;
    }
    //console.log("sqlStmt: ", sqlStmt);
    // console.log("primeid: ", primeid, " sql2: ", sql2);
    this.execute2SqlTxn(
      this.setDbCallData(
        "process transaction with prime",
        sqlStmt,
        null,
        sql2,
        null,
        cond
      ),
      aCallback
    );
  }
  /* *************** */
  //
  executeAddressSQL(jAdr, primeid, key = null, aCallback) {
    let sqlStmt;
    let sql2;
    let cond = false;
    let entity2 = "address";
    let lInfo = this.getAssocLinkInfo("address");
    let name = lInfo.display_name;
    let link_id = lInfo.type_id;
    let tableAddress = this.config.entityTables["address"];
    let tableAssoc = this.config.linkTables["association"];
    //
    console.log(jAdr);
    if (key == null || key <= 0) {
      sqlStmt =
        `INSERT INTO ${tableAddress} (street, address2, city, state, zip, country) VALUES (` +
        `'${jAdr.street}', '${jAdr.address2}', '${jAdr.city}','${jAdr.state}','${jAdr.zip}','${jAdr.country}') ` +
        "ON CONFLICT (street, city, zip) DO NOTHING RETURNING *;";

      if (primeid > 0) {
        sql2 =
          "INSERT INTO " +
          tableAssoc +
          " (entity1_id, entity1, entity2_id, entity2, " +
          "name, link_type_id) VALUES (" +
          `${primeid}, 'person', $1, '${entity2}', '${name}', ${link_id})` +
          " ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO NOTHING RETURNING *;";
        cond = true;
      }
    } else {
      sqlStmt =
        `UPDATE ${tableAddress} SET street=${jAdr.street}, address2=${jAdr.address2}, ` +
        `city=${jAdr.city}, state=${jAdr.state}, zip=${jAdr.zip}, country=${jAdr.country} WHERE entit_id=${key}; `;
      sql2 = null;
      cond = false;
    }
    console.log(sqlStmt);
    this.execute2SqlTxn(
      this.setDbCallData(
        "Execute Address with prime",
        sqlStmt,
        null,
        sql2,
        null,
        cond
      ),
      addressCB
    );
    return;
    //
    function addressCB(output) {
      //
      var outRes = {
        entity: null,
        entityCount: 0,
        assoc_link: null,
        assoc_linkCount: 0,
        err: false,
        err_msg: null,
      };
      console.log(output);
      if (output.err) {
        outRes.err = output.err;
        outRes.err_msg = output.err_msg;
        aCallback(outRes);
        return;
      }

      let address = JSON.parse(output.sql1_result);
      let asLink = JSON.parse(output.sql2_result);
      if (address) {
        outRes.entity = address.rows;
        outRes.entityCount = address.rowCount;
      }
      if (asLink) {
        outRes.assoc_link = asLink.rows;
        outRes.assoc_linkCount = asLink.rowCount;
      }
      aCallback(outRes);
      return;
    }
  }
  //
  executeCommSQL(jFC, primeid, key = null, aCallback) {
    let sqlStmt;
    let sql2;
    let cond = false;
    let entity2 = "communication";
    let lInfo = this.getAssocLinkInfo("communication");
    let name = lInfo.display_name;
    let link_id = lInfo.type_id;
    let tablePC = this.config.entityTables["communication"];
    var tableAssoc = this.config.linkTables["association"];
    //
    console.log(jFC);

    if (key === null || key <= 0) {
      sqlStmt =
        `INSERT INTO ${tablePC} (telephone, mobile, email) VALUES (` +
        `'${jFC.telephone}','${jFC.mobile}','${jFC.email}') ON CONFLICT (email, telephone, mobile) DO NOTHING RETURNING *;`;

      if (primeid > 0) {
        sql2 =
          "INSERT INTO " +
          tableAssoc +
          " (entity1_id, entity1, entity2_id, entity2, " +
          "name, link_type_id) VALUES (" +
          `${primeid}, 'person', $1, '${entity2}', '${name}', ${link_id})` +
          " ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO NOTHING RETURNING *;";
        cond = true;
      }
    } else {
      sqlStmt =
        ` "UPDATE ${tablePC} SET email=${jFC.email}, telephone=${jFC.telephone}, ` +
        `mobile=${jFC.mobile} WHERE entit_id=${key}; `;
      sql2 = null;
      cond = false;
    }
    console.log(sqlStmt);
    this.execute2SqlTxn(
      this.setDbCallData(
        "Execute Communication with prime",
        sqlStmt,
        null,
        sql2,
        null,
        cond
      ),
      pcommCB
    );
    return;
    //
    function pcommCB(output) {
      var outRes = {
        entity: null,
        entityCount: 0,
        assoc_link: null,
        assoc_linkCount: 0,
        err: false,
        err_msg: null,
      };
      console.log(output);
      if (output.err) {
        outRes.err = output.err;
        outRes.err_msg = output.err_msg;
        aCallback(outRes);
        return;
      }

      let pcomm = JSON.parse(output.sql1_result);
      let asLink = JSON.parse(output.sql2_result);
      if (pcomm) {
        outRes.entity = pcomm.rows;
        outRes.entityCount = pcomm.rowCount;
      }
      if (asLink) {
        outRes.assoc_link = asLink.rows;
        outRes.assoc_linkCount = asLink.rowCount;
      }
      aCallback(outRes);
      return;
    }
  }
  /* *************** */
  //
  getPersonSQL(jData, prime, dep, isMinor, key = null) {
    if (!this.validator.personData(jData)) {
      return null;
    }
    let primeB = prime == 1 ? true : false;
    let depB = dep == 1 ? true : false;
    let isMinorB = isMinor == 1 ? true : false;
    //
    let affiliationid = null;
    if (affiliationid in jData) {
      affliationid = jData.affiliationid;
    }
    var sqlStmt;
    if (key <= 0 || key === null) {
      // sqlStmt = "CALL InsertPerson (" +
      sqlStmt =
        "INSERT INTO " +
        this.activeSchema +
        ".person (firstname, middlename, lastname, email, prime, " +
        " dependent, affiliationId, telephone, mobile, isMinor) VALUES ( " +
        `'${jData.firstname}','${jData.middlename}','${jData.lastname}','${jData.email}',${primeB},${depB},'${affiliationid}',` +
        `'${jData.telephone}','${jData.mobile}', ${isMinorB}) ` +
        " ON CONFLICT (firstname, lastname, email, middlename) DO NOTHING RETURNING *;";
      /*
              `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
              `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
              `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
              `firstname='${jData.firstname}' and middlename='${jData.middlename}' and lastname='${jData.lastname}' 
               and email='${jData.email}';` ; */
    } else {
      sqlStmt =
        "UPDATE " +
        this.activeSchema +
        ".person SET " +
        `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
        `email='${jData.email}',prime=${primeB},dependent=${depB},affiliationId='${jData.affiliationid}',` +
        `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinorB}) WHERE ` +
        `entity_id='${key};`;
    }
    return sqlStmt;
  }
  /*
   * the function does three things:
   *  a) insert a person record without any association to primeid (condition primeid=0, key=null)
   *  b) update a person record without updating the association (condition key has to be the entity_id of the person being updated)
   *  c) insert a person record with an association to primeid (condition key= null primeid set to prime person's entity_id [>0])
   */
  executePersonSQL(jData, primeid, prime, dep, isMinor, key = null, aCallback) {
    //
    /*
            var outRes = {
                "sql1_result": null,
                "sql2_result": null,
                "err": false,
                "err_msg": null
            };
        */
    var outRes = {
      entity: null,
      entityCount: 0,
      assoc_link: null,
      assoc_linkCount: 0,
      err: false,
      err_msg: null,
    };
    var sqlStmt = this.getPersonSQL(jData, prime, dep, isMinor, key);
    if (sqlStmt === null) {
      outRes.err_msg = "ERROR - Person data contain data errors. Aborted!";
      aCallback(outRes);
    }
    //
    var sql2 = null;
    var cond = false;
    var entity2 = "person";
    var flow_step = 0;
    var name, link_id, lInfo;
    //
    console.log(sqlStmt);
    console.log(prime, dep);
    if (primeid > 0 && (key === null || key <= 0)) {
      if (prime == 0 && dep == 0) {
        lInfo = this.getAssocLinkInfo("spouse");
      } else if (prime == 0 && dep == 1) {
        lInfo = this.getAssocLinkInfo("parent");
      }
      console.log(lInfo);
      name = lInfo.display_name;
      link_id = lInfo.type_id;
      const tableAssoc = this.config.linkTables["association"];
      //
      sql2 =
        "INSERT INTO " +
        tableAssoc +
        " (entity1_id, entity1, entity2_id, entity2, " +
        "name, link_type_id) VALUES (" +
        `${primeid}, 'person', $1, '${entity2}', '${name}', ${link_id})` +
        " ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO NOTHING RETURNING *;";
      cond = true;
    }
    console.log(sql2);
    /*
     *  we cannot implement in the data email constraint because then a child has to have an email, which is not a good demand.
     *  So we are ensuring that email is not present in the database using an application logic.  If present we will throw an error.
     */
    // do the test
    var test4email = `SELECT * from " + this.activeSchema + ".person where email='${jData.email}';`;
    //console.log(test4email);
    var execute2SqlTxn = this.execute2SqlTxn.bind(this);
    var setDbCallData = this.setDbCallData.bind(this);
    this.execute1SqlsWithCommit(
      this.setDbCallData(
        "Execute Person SQL",
        test4email,
        null,
        null,
        null,
        false
      ),
      personCB
    );
    //
    function personCB(output) {
      console.log(output);
      if (output.err) {
        outRes.err = output.err;
        outRes.err_msg = output.err_msg;
        aCallback(outRes);
        return;
      }
      if (flow_step == 0) {
        // is email present
        let result = JSON.parse(output.sql1_result);
        flow_step = 1;
        if (result.rowCount > 0) {
          let row = result.rows[0];
          if (
            row.firstname.toLowerCase() != jData.firstname.toLowerCase() ||
            row.middlename.toLowerCase() != jData.middlename.toLowerCase() ||
            row.lastname.toLowerCase() != jData.lastname.toLowerCase()
          ) {
            let initials =
              row.firstname.charAt(0) +
              ". <middlename> " +
              row.lastname.charAt(0) +
              ".";
            outRes.err = true;
            outRes.person = jData;
            // outRes.sql2_result = row;
            outRes.err_msg =
              "ERROR - Email [" +
              row.email +
              "] already exists for initials " +
              initials;
            aCallback(outRes);
            return;
          }
        }
        execute2SqlTxn(
          setDbCallData("Execute Person SQL ", sqlStmt, null, sql2, null, cond),
          personCB
        );
        return;
      }
      if (flow_step == 1) {
        let person = JSON.parse(output.sql1_result);
        let asLink = JSON.parse(output.sql2_result);
        if (person) {
          outRes.entity = person.rows;
          outRes.entityCount = person.rowCount;
        }
        if (asLink) {
          outRes.assoc_link = asLink.rows;
          outRes.assoc_linkCount = asLink.rowCount;
        }
        aCallback(outRes);
        return;
      }
    }
  }
  //
  //
  getUTCTimestamp(tsEpoch) {
    // 'YYYY-MM-DD HH:mm:ssTZ'
    var now;
    var utcStr;
    if (tsEpoch == null) {
      now = new Date();
      utcStr = now.toUTCString();
    } else {
      now = new Date(tsEpoch);
      utcStr = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      ).toUTCString();
    }
    return utcStr;
  }
  //
  generate_token(length) {
    //edit the token allowed characters
    var a =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz".split(
        ""
      );
    var b = [];
    for (var i = 0; i < length; i++) {
      var j = (Math.random() * (a.length - 1)).toFixed(0);
      b[i] = a[j];
    }
    return b.join("");
  }
  getNewOTP(
    prime_id,
    email,
    otp,
    r_fname = null,
    r_mname = null,
    r_lname = null
  ) {
    var session_id = this.generate_token(45);
    var utc_time = this.getUTCTimestamp(null);
    var ins_str =
      "INSERT INTO token (otpassword, createTimeUTC, email, primeId, sessiontoken, req_firstname" +
      "req_middlenmae, req_lastname) VALUES (" +
      `${otp}, ${utc_time}, ${email}, ${prime_id}, ${session_id}, ${r_fname}, ` +
      `${r_mname}, ${r_lname});`;
    return ins_str;
  }
  //
  executeStoreProc(sqlStmt, aCallback) {
    console.log(sqlStmt);
    const err = true;
    console.log(sqlStmt);
    const useDb = new aSimplePgClient(this.config, this.verbose);
    const aPromise = useDb.callStoreProc(sqlStmt, null).then(
      (result) => {
        aCallback(result, null);
        useDb.close();
        return;
      },
      (err) => {
        aCallback(null, err);
        useDb.close();
        return;
      }
    );
  }

  setAssocLink(jData, key = null, aCallback) {
    var sqlStmt, args, cond;
    cond = false;
    args = [
      jData.entity1_id,
      jData.entity2_id,
      jData.entity1,
      jData.entity2,
      jData.name,
      jData.link_type_id,
      jData.additional_info,
      jData.adult_count,
      jData.child_count,
      jData.guest_count,
    ];
    //
    if (key == null || key <= 0) {
      sqlStmt =
        "INSERT INTO " +
        this.activeSchema +
        ".association_link" +
        " (entity1_id, entity2_id, entity1, entity2, name, link_type_id, additional_info, adult_count, child_count, guest_count)" +
        " VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);";
    } else {
      sqlStmt =
        "UPDATE " +
        this.config.linkTables["association"] +
        " SET entity1_id=$1, entity2_id=$2, entity1=$3, entity2=$4, name=$5, link_type_id=$6, " +
        ` additional_info=$7, adult_count=$8, child_count=$9, guest_count=$10 WHERE link_id=${key};`;
    }
    //
    console.log("SQL: ", sqlStmt);
    console.log("Args: ", args);
    this.execute1SqlsWithCommit(
      this.setDbCallData("Set Assoc Link", sqlStmt, args, null, null, cond),
      aCallback
    );
    return;
  }
  /* *************** */
  associatedPersons(id, aCallback) {
    const err = true;
    const tableAssoc = this.config.linkTables["association"];
    const tablePerson = this.config.entityTables["person"];
    const sqlStmt =
      "SELECT entity_id,lastName, firstName, middlename, email, prime, dependent, " +
      " telephone, mobile, isMinor, affiliationid FROM  " +
      tablePerson +
      " where entity_id in " +
      "(select entity2_id from " +
      tableAssoc +
      " where entity1_id =" +
      id +
      " and entity1 = 'person' and entity2 = 'person');";

    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData("associatedPerson", sqlStmt, null, null, null, false),
      assocPersonsCB
    );
    return;
    //
    function assocPersonsCB(output) {
      //
      var outRes = {
        spouse: null,
        deps: [],
        depsCount: 0,
        err: false,
        err_msg: null,
      };
      console.log(output);
      if (output.err) {
        outRes.err = output.err;
        outRes.err_msg = output.err_msg;
        aCallback(outRes);
        return;
      }
      //
      let result = JSON.parse(output.sql1_result).rows;
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          let row = result[key];
          if (row.dependent == 1) {
            outRes.deps.push(row);
            outRes.depsCount = outRes.depsCount + 1;
          } else {
            outRes["spouse"] = row;
          }
        });
      }
      //console.log("associatedPersons: ", outRes);
      aCallback(outRes);
      return;
    }
  }
  /* *************** */
  associatedAddress(id, aCallback) {
    const err = true;
    const tableAssoc = this.config.linkTables["association"];
    const tableAddress = this.config.entityTables["address"];
    const sqlStmt =
      "SELECT entity_id, street, address2, city, state, zip, country FROM  " +
      tableAddress +
      " where entity_id in " +
      "(select entity2_id from " +
      tableAssoc +
      " where entity1_id =" +
      id +
      " and entity1 = 'person' and entity2 = 'address');";

    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData("associatedAddress", sqlStmt, null, null, null, false),
      aCallback
    );
    return;
  }
  /* *************** */
  associatedFamilyComm(id, aCallback) {
    const err = true;
    const tableAssoc = this.config.linkTables["association"];
    const tableComm = this.config.entityTables["communication"];
    const sqlStmt =
      "SELECT entity_id, email, telephone, mobile FROM  " +
      tableComm +
      " where entity_id in " +
      "(select entity2_id from " +
      tableAssoc +
      " where entity1_id =" +
      id +
      " and entity1 = 'person' and entity2 = 'communication');";

    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData("associatedPerson", sqlStmt, null, null, null, false),
      aCallback
    );
    return;
  }
  /**
   * get BANC membership paid
   */
  getMembershipPaid(primeid, aCallback) {
    const cell = "";
    var sqlStmt =
      "select c.entity1_id, c.name, c.year, c.renewal_date, l.name," +
      " t.entity_id, t.amount, t.service_fee_paid, t.amount_net,";
    " from " +
      this.activeSchema +
      ".community_link c, " +
      this.activeSchema +
      ".transaction t, " +
      this.activeSchema +
      ".transaction_link l " +
      " where c.entity1_id = l.entity1_id and t.entity_id = l.entity2_id and c.entity1_id = " +
      primeid;
    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData(
        "Get Membership Paid for ONE",
        sqlStmt,
        null,
        null,
        null,
        false
      ),
      aCallback
    );
  }
  /**
   * get BANC Registered Events by prime id
   */
  getRegisteredEvents(primeid, year, aCallback) {
    var sqlStmt;
    if (year > 0) {
      sqlStmt =
        "SELECT e.eventname, e.event_year, al.name as registration, al.adult_count, al.guest_count, " +
        " al.child_count, al.update_date as date, al.link_id from " +
        this.activeSchema +
        ".event e, " +
        this.activeSchema +
        ".association_link al " +
        " where al.entity2='event' and al.entity2_id=e.entity_id and " +
        " e.event_year = " +
        year.toString() +
        " and entity1_id = " +
        primeid.toString() +
        ";";
    } else {
      sqlStmt =
        "SELECT e.eventname, e.event_year, al.name as registration, al.adult_count, al.guest_count, " +
        " al.child_count, al.update_date as date, al.link_id from " +
        this.activeSchema +
        ".event e, " +
        this.activeSchema +
        ".association_link al " +
        " where al.entity2='event' and al.entity2_id=e.entity_id and " +
        "  entity1_id = " +
        primeid.toString() +
        ";";
    }
    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData(
        "Get Registered Events",
        sqlStmt,
        null,
        null,
        null,
        false
      ),
      aCallback
    );
  }
  /**
   * get BANC transaction done by member
   */
  getTransactions(primeid, dateFrom, dateTo, all_txn, aCallback) {
    var sqlStmt;
    if (dateFrom != null && dateTo != null) {
      sqlStmt =
        "Select tl.name as transaction_name, t.amount, t.service_fee_paid as fee_paid, t.status, " +
        "t.amount_net as net_amount, t.form_memo, tl.txn_form_date as transaction_date, t.summary, " +
        "tt.category, tt.subcategory, tt.line_item, t.form_ref as formRef, " +
        "t.entity_id as transaction_id, t.bank_transaction_ref as bankRef, tl.link_id " +
        "from " +
        this.activeSchema +
        ".transaction t, " +
        this.activeSchema +
        ".transaction_link tl, " +
        this.activeSchema +
        ".transaction_type tt where " +
        "tl.entity2_id = t.entity_id and t.transaction_type_id=tt.type_id and tl.entity1_id =" +
        primeid.toString() +
        " and tl.txn_form_date between " +
        dateFrom +
        " and " +
        dateTo +
        ";";
    } else {
      sqlStmt =
        "Select tl.name as transaction_name, t.amount, t.service_fee_paid as fee_paid, t.status, " +
        "t.amount_net as net_amount, t.form_memo, tl.txn_form_date as transaction_date, t.summary, " +
        "tt.category, tt.subcategory, tt.line_item, t.form_ref as formRef, " +
        "t.entity_id as transaction_id, t.bank_transaction_ref as bankRef, tl.link_id " +
        "from " +
        this.activeSchema +
        ".transaction t, " +
        this.activeSchema +
        ".transaction_link tl, " +
        this.activeSchema +
        ".transaction_type tt where " +
        "tl.entity2_id = t.entity_id and t.transaction_type_id=tt.type_id and tl.entity1_id =" +
        primeid.toString() +
        ";";
    }
    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData(
        "Get Transactions done by ONE",
        sqlStmt,
        null,
        null,
        null,
        false
      ),
      aCallback
    );
  }
  /**
   * get BANC Membership paid List by member
   */
  getBANCMembershipPaid(primeid, yearFrom, yearTo, all_members, aCallback) {
    var sqlStmt;

    if (yearFrom != null && yearTo != null) {
      sqlStmt =
        "Select o.orgname, c.affiliation, cl.year as membership_year, c.ismember, cl.renewal_date, " +
        "c.entity_id as banc_community_id, cl.link_id " +
        "from " +
        this.activeSchema +
        ".banc_community c, " +
        this.activeSchema +
        ".community_link cl, " +
        this.activeSchema +
        ".organization o  where " +
        "cl.affiliation_id = c.entity_id and cl.entity2_id = o.entity_id and " +
        "cl.entity1_id =" +
        primeid.toString() +
        " and year between " +
        yearFrom +
        " and " +
        yearTo +
        ";";
    } else {
      sqlStmt =
        "Select o.orgname, c.affiliation, cl.year as membership_year, c.ismember, cl.renewal_date, " +
        "c.entity_id as banc_community_id, cl.link_id " +
        "from " +
        this.activeSchema +
        ".banc_community c, " +
        this.activeSchema +
        ".community_link cl, " +
        this.activeSchema +
        ".organization o where " +
        "cl.affiliation_id = c.entity_id and cl.entity2_id = o.entity_id and " +
        "cl.entity1_id =" +
        primeid.toString() +
        ";";
    }
    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData(
        "Get Membership Paid",
        sqlStmt,
        null,
        null,
        null,
        false
      ),
      aCallback
    );
  }
  /**
   * ismember
   */
  /* *************** */
  ismember(id, year, aCallback) {
    var err = true;
    var tableAssoc = this.config.linkTables["affiliation"];
    var sqlStmt = "";
    if (year !== null) {
      sqlStmt =
        "select entity1_id, name, year, renewal_date from " +
        tableAssoc +
        " where entity1_id=" +
        id +
        " and year=" +
        year +
        ";";
    } else {
      sqlStmt =
        "select entity1_id, name, year, renewal_date from " +
        tableAssoc +
        " where entity1_id=" +
        id +
        ";";
    }
    console.log(sqlStmt);
    this.execute1SqlsWithCommit(
      this.setDbCallData("isMember", sqlStmt, null, null, null, false),
      aCallback
    );
  }
  /**
   * process membership orchestration has two parts:
   * Part A - a person submits the membership payment -- these insert transactions are done:
   *      1) Add a new membership transaction in the transaction table
   *      2) Add a link to transaction link table person - the transaction
   *      3) Add one link in community_link table person - banc
   *    In part A -- transaction is registered, membership is registered for the person
   * Part B - It is the paypal transaction confirmation; it has two steps: (processPaypalTransaction)
   *      1) Update the transaction in part A(1) wiht paypal information.
   *      2) Add a link to transaction link fron the transaction to banc organization (it shows revenue)
   * This process does not check for valid jMship json data. Assumes -- OK.
   */
  processMembershipTransaction(primeid, jMship, flowStep, anExtCallback) {
    //
    var flow_step = 0;
    var config = this.config;
    var banc_entity_id = this.banc_entity_id;
    var org_entity = this.org_entity;
    var bancTxnLinkSql;
    var entity2 = "transaction";
    var linktable1 = this.config.linkTables[entity2];
    //
    // bind the functions to this
    var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
    var setDbCallData = this.setDbCallData.bind(this);
    var getUTCTimestamp = this.getUTCTimestamp.bind(this);
    var setTransactionWithPrime = this.setTransactionWithPrime.bind(this);
    //
    var outRes = {
      primeid: primeid,
      txn_membership: null,
      person_txn_link: null,
      banc_txn_link: null,
      community_link: null,
      year: jMship.year,
      flow_step: flowStep,
      err: null,
      msg: null,
    };
    //
    // Insert membership link first. If it fails then the link is present and abort payment transactions.
    var tableAssoc = config.linkTables["affiliation"];
    var affl_id, affl;
    [affl_id, affl] = getAffiliationInfo(jMship.info);
    var sqlStmt =
      "INSERT INTO " +
      tableAssoc +
      " (entity1_id, entity1, entity2_id, entity2, name, affiliation_id, year, renewal_date) " +
      `VALUES (${primeid}, 'person', ${banc_entity_id}, '${org_entity}', '${jMship.info}', ${affl_id}, ${jMship.year}, '${jMship.form_date}')` +
      " ON CONFLICT (entity1_id, entity2_id, name, year, entity1, entity2) DO NOTHING RETURNING *;";
    console.log(sqlStmt);
    execute1SqlsWithCommit(
      setDbCallData("Processs Membership", sqlStmt, null, null, null, true),
      orchMShipCB
    );
    //  Orchestration starts
    function orchMShipCB(output) {
      var sql1_result = null;
      var sql2_result = null;
      if (output.err) {
        outRes.err = output.err;
        outRes.msg = "SQL Error occurred!";
      }
      if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
      if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
      //console.log("In orchMShipCB: ",output);
      console.log(
        "flow_step: ",
        flow_step,
        "sql1: ",
        sql1_result,
        "sql2: ",
        sql2_result
      );
      // process steps
      if (flow_step == 0) {
        if (sql1_result.rowCount > 0) {
          outRes.community_link = sql1_result.rows[0]; //Person to Banc
          var renewal_date = getUTCTimestamp(null);
          console.log("jMship", jMship);
          // Add a membership transaction and associate person to this txn (Part A.1 and A.2)
          setTransactionWithPrime(jMship, primeid, null, null, orchMShipCB);
          // setup flow_step 1
          flow_step = 1;
        } else {
          // Insert failed because the membership already paid before
          outRes.msg =
            "Membership payment Transaction aborted - Membership previously paid!";
          anExtCallback(outRes);
        }
        //console.log(config);

        return;
      } else if (flow_step == 1) {
        outRes.txn_membership = sql1_result.rows[0];
        outRes.person_txn_link = sql2_result.rows[0];
        flow_step = 2;
        bancTxnLinkSql =
          "INSERT INTO " +
          linktable1 +
          " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
          "form_ref, txn_form_date) VALUES " +
          `(${banc_entity_id},${outRes.txn_membership.entity_id}, '${org_entity}','transaction','${jMship.name}','${jMship.info}',
                '${jMship.form_ref}','${jMship.form_date}') RETURNING *;`;
        //
        execute1SqlsWithCommit(
          setDbCallData(
            "Processs Membership - banc_txn_link",
            bancTxnLinkSql,
            null,
            null,
            null,
            true
          ),
          orchMShipCB
        );
        return;
        //
      } else if (flow_step == 2) {
        outRes.banc_txn_link = sql1_result.rows[0];
        anExtCallback(outRes);
        return;
      }
    }
  }
  /*
   *  Update event association link to update
   */
  /**
   * process Event orchestration has two parts:
   * Part A - a person submits the event payment -- these insert transactions are done:
   *      1) Add one or two event transactions in the transaction table
   *      2) Add a link to transaction link table person - the transaction
   *      3) Add one link in community_link table person - banc
   *    In part A -- transaction is registered, membership is registered for the person
   * Part B - It is the paypal transaction confirmation; it has two steps: (processPaypalTransaction)
   *      1) Update the transaction in part A(1) wiht paypal information.
   *      2) Add a link to transaction link fron the transaction to banc organization (it shows revenue)
   * This process does not check for valid jMship json data. Assumes -- OK.
   */
  processEventTransaction(primeid, jTxns, flowStep, anExtCallback) {
    //
    // bind the functions to this
    var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
    var setDbCallData = this.setDbCallData.bind(this);
    var getUTCTimestamp = this.getUTCTimestamp.bind(this);
    var setTransactionWithPrime = this.setTransactionWithPrime.bind(this);
    //
    var flow_step = 0;
    var numOfEventTransactions = jTxns.length;
    var txnIter = 0;
    var jTxn = jTxns[txnIter];
    var config = this.config;
    var event_entity_id = this.eventInfo[jTxn.year][jTxn.eventname].id;
    var entity2 = "event";
    var eventTxnLinkSql;
    var txnEntity = "transaction";
    var linktable1 = this.config.linkTables[txnEntity];
    var txnEntityId;
    //
    var outRes = {
      primeid: primeid,
      txn_event: [],
      person_txn_link: [],
      event_txn_link: [],
      association_link_event: null,
      year: jTxn.year,
      flow_step: flowStep,
      err: null,
      msg: null,
    };
    //
    // Insert membership link first. If it fails then the link is present and abort payment transactions.
    var tableAssoc = config.linkTables["association"];
    //
    var sqlStmt =
      "INSERT INTO " +
      tableAssoc +
      " (" +
      "entity1_id, entity1, entity2_id, entity2, " +
      "name, link_type_id, additional_info, " +
      "adult_count, child_count, guest_count) " +
      "VALUES (" +
      `${primeid}, 'person', ${event_entity_id}, '${entity2}', ` +
      `'${jTxn.info}', ${jTxn.link_type_id}, '${jTxn.info}', ` +
      `${jTxn.adult_count}, ${jTxn.child_count}, ${jTxn.guest_count}) ` +
      " ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO NOTHING RETURNING *;";
    //console.log(sqlStmt);
    execute1SqlsWithCommit(
      setDbCallData("Processs Event", sqlStmt, null, null, null, true),
      orchEventCB
    );
    //  Orchestration starts
    function orchEventCB(output) {
      var sql1_result = null;
      var sql2_result = null;
      var txnEnityId;
      if (output.err) {
        outRes.err = output.err;
        outRes.msg = "SQL Error occurred!";
      }
      if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
      if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
      //console.log("In orchMShipCB: ",output);
      console.log(
        "flow_step: ",
        flow_step,
        "sql1: ",
        sql1_result,
        "sql2: ",
        sql2_result
      );
      // process steps
      if (flow_step == 0) {
        if (sql1_result.rowCount > 0) {
          outRes.association_link_event = sql1_result.rows[0]; //
          var renewal_date = getUTCTimestamp(null);
          //
          // console.log(jTxn);
          //
          setTransactionWithPrime(jTxn, primeid, null, null, orchEventCB);
          // setup flow_step 1
          flow_step = 1;
        } else {
          // Insert failed because the membership already paid before
          outRes.msg = "Event payment Transaction aborted - previously paid!";
          anExtCallback(outRes);
        }
        //console.log(config);

        return;
      } else if (flow_step == 1) {
        // process the event to this transaction link
        txnEntityId = sql1_result.rows[0].entity_id;
        outRes.txn_event.push(sql1_result.rows[0]);
        outRes.person_txn_link.push(sql2_result.rows[0]);
        //
        flow_step = 2; // --> send to processing the next transaction, if any
        eventTxnLinkSql =
          "INSERT INTO " +
          linktable1 +
          " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
          "form_ref, txn_form_date) VALUES " +
          `(${event_entity_id},${txnEntityId}, '${entity2}', 'transaction','${jTxn.name}','${jTxn.info}','${jTxn.form_ref}','${jTxn.form_date}') RETURNING *;`;

        execute1SqlsWithCommit(
          setDbCallData(
            "Processs Event - event_txn_link",
            eventTxnLinkSql,
            null,
            null,
            null,
            true
          ),
          orchEventCB
        );
        return;
        //
      } else if (flow_step == 2) {
        // Is there another event transaction to process, if not exit.
        outRes.event_txn_link.push(sql1_result.rows[0]);
        txnIter = txnIter + 1;
        console.log("---->", txnIter, numOfEventTransactions);
        if (txnIter < numOfEventTransactions) {
          flow_step = 1; // --> send to processing the corresponding event to transaction link
          jTxn = jTxns[txnIter];
          setTransactionWithPrime(jTxn, primeid, null, null, orchEventCB);
        } else {
          anExtCallback(outRes);
        }
        return;
      }
    }
  }
  /*
   * Process Summary Transaction --
   */
  processSummaryTransaction(primeid, jSmry, flowStep, anExtCallback) {
    //
    var flow_step = 0;
    //
    // bind the functions to this
    var setTransactionWithPrime = this.setTransactionWithPrime.bind(this);
    //
    var outRes = {
      primeid: primeid,
      txn_summary: null,
      person_txn_link: null,
      year: jSmry.year,
      flow_step: flowStep,
      err: null,
      msg: null,
    };
    //
    setTransactionWithPrime(jSmry, primeid, null, null, orchSumCB);
    // setup flow_step 1
    //  Orchestration starts
    function orchSumCB(output) {
      var sql1_result = null;
      var sql2_result = null;
      if (output.err) {
        outRes.err = output.err;
        outRes.msg = "SQL Error occurred!";
      }
      if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
      if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
      //
      console.log(
        "orchSumCB -- flow_step: ",
        flow_step,
        "sql1: ",
        sql1_result,
        "sql2: ",
        sql2_result
      );
      // process steps
      outRes.txn_summary = sql1_result.rows[0];
      outRes.person_txn_link = sql2_result.rows[0];
      anExtCallback(outRes);
      return;
      //
    }
  }
  /*
   * get Prime Member
   ******** */
  getPrimeMember(firstname, middlename, lastname, email, primeid, aCallback) {
    //
    var outRes = {
      prime: null,
      found: false,
      err: null,
      err_msg: null,
    };
    // Call the actual function
    console.log("getPrimeMember -- ", firstname, lastname);
    this.getPersonWithPrime(
      firstname,
      middlename,
      lastname,
      email,
      primeid,
      0,
      aPrimeCallback
    );
    //
    function aPrimeCallback(output) {
      if (output.err) {
        outRes.err = output.err;
        outRes.err = "Error";
      }
      console.log(output);
      if (output.found) {
        let prime = JSON.parse(output.prime);
        outRes.prime = prime.rows[0];
        outRes.found = true;
      }
      aCallback(outRes);
      return;
    }
  }
  //
  getPersonWithPrime(
    firstname,
    middlename,
    lastname,
    email,
    primeid,
    personid,
    aCallback
  ) {
    var sql1, sql2, args1, args2, name, mnameNotPresent;
    var searchSet;
    mnameNotPresent = false;
    if (middlename === null || typeof middlename === "undefined") {
      mnameNotPresent = true;
    }
    //
    if (primeid == null) {
      primeid = 0;
    }
    if (personid == null) {
      personid = 0;
    }
    name = "Get Prime and Person";
    console.log(firstname, middlename, mnameNotPresent, lastname, email);
    if (primeid > 0 && personid > 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 = sql1;
      args1 = [personid];
      args2 = [primeid];
      searchSet = 0;
    } else if (primeid <= 0 && personid > 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 =
        "SELECT * FROM " +
        this.activeSchema +
        ".person WHERE entity_id=(SELECT entity1_id from " +
        this.activeSchema +
        ".association_link " +
        "where entity1='person' and entity2='person' and entity2_id=$1);";
      args1 = [personid];
      args2 = [personid];
      searchSet = 1;
    } else if (primeid > 0 && personid <= 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 = null;
      args1 = [primeid];
      args2 = null;
      searchSet = 2;
    } else {
      sql1 =
        "SELECT * from " +
        this.activeSchema +
        ".person WHERE (firstname='" +
        firstname +
        "' and lastname= '" +
        lastname +
        "' ";
      sql1 = mnameNotPresent
        ? sql1 + "and middlename='' "
        : sql1 + "and middlename= '" + middlename + "' ";
      sql1 =
        email.length == 0
          ? sql1 + "and email='');"
          : sql1 + "and email= '" + email + "') OR (email='" + email + "');";
      args1 = null;
      sql2 =
        "SELECT * FROM " +
        this.activeSchema +
        ".person WHERE entity_id=(SELECT entity1_id from " +
        this.activeSchema +
        ".association_link " +
        "where entity1='person' and entity2='person' and entity2_id=$1);";
      args2 = null;
      searchSet = 3;
    }
    //
    var output = {
      person: null,
      prime: null,
      found: false,
      isPersonPrime: false,
      err: null,
      err_msg: null,
    };
    // Begin query
    this.pool.connect((err, client, done) => {
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
          //console.log(output);
        }
        return !!err;
      };
      // Output sent to callback;

      console.log("Transaction - Begin");
      //console.log("Before begin: ", output);
      client.query("BEGIN", (err) => {
        if (shouldAbort(err)) return aCallback(output);
        //
        // Calling the first sql1 -- It has to be provided all the time
        console.log(sql1, args1);
        client.query(sql1, args1, (err, res) => {
          console.log("Executed Transaction Sql1 for name: " + name);
          //console.log(err, res);
          if (shouldAbort(err)) return aCallback(output);
          // no rows found
          if (res.rowCount == 0) {
            return aCallback(output);
          }
          // process output of the first query
          //  console.log("res: ", res.rows);
          // console.log("output: ", output);
          //
          if (searchSet < 2) {
            output.person = JSON.stringify(res);
            output.found = true;
          } else if (searchSet == 2) {
            output.prime = JSON.stringify(res);
            output.person = output.prime;
            output.found = true;
            output.isPersonPrime = true;
            return aCallback(output);
          } else if (searchSet > 2) {
            var prime = res.rows[0].prime;
            var person_id = res.rows[0].entity_id;
            output.found = true;
            output.person = JSON.stringify(res);
            //
            if (prime == 0) {
              args2 = [person_id];
            } else {
              output.prime = output.person;
              output.isPersonPrime = true;
              return aCallback(output);
            }
          }
          //  if Second sql present when searchSet is less or greater than 2
          client.query(sql2, args2, (err, res) => {
            console.log("Executed Transaction Sql2 for name: " + name);
            output.prime = JSON.stringify(res);
            if (shouldAbort(err)) return aCallback(output);
            //
            client.release();
            //done();
            return aCallback(output);
          });
        });
      });
    });
  }
  /*
   */
  collateMemberInfo(
    firstname,
    middlename,
    lastname,
    email,
    primeMemId,
    aCallback
  ) {
    var resultSeq = 0;
    var primeId = 0;
    if (primeMemId > 0) {
      primeId = primeMemId;
    }
    // bind the functions to this
    var associatedAddress = this.associatedAddress.bind(this);
    var associatedPersons = this.associatedPersons.bind(this);
    var associatedFamilyComm = this.associatedFamilyComm.bind(this);
    var getBANCMembershipPaid = this.getBANCMembershipPaid.bind(this);
    var getRegisteredEvents = this.getRegisteredEvents.bind(this);

    //
    var outRes = {
      prime: null,
      spouse: null,
      deps: [],
      address: null,
      primecomm: null,
      msg: null,
      err: null,
      statusCode: 200,
      membership: {
        status: "unknown",
        year_request: null,
        paid: [],
        rows: null,
      },
      event: {
        paid: [],
        current_year: null,
        rows: null,
      },
    };

    this.getPrimeMember(
      firstname,
      middlename,
      lastname,
      email,
      primeMemId,
      collateCB
    );
    //
    function collateCB(output) {
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
          associatedPersons(primeId, collateCB);
          return;
        } else {
          outRes.msg = output.err_msg;
          outRes.err = output.err;
          resultSeq = 10;
        }
      } else if (resultSeq == 1) {
        resultSeq = 2;
        if (output.depsCount > 0) outRes.deps = output.deps;
        outRes["spouse"] = output.spouse;
        //
        associatedAddress(primeId, collateCB);
        associatedFamilyComm(primeId, collateCB);
      } else if (resultSeq > 1 && resultSeq < 4) {
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
      if (resultSeq > 3 && resultSeq < 5) {
        resultSeq = 5;
        getBANCMembershipPaid(primeId, null, null, null, collateCB);
      } else if (resultSeq == 5) {
        resultSeq = 6;
        outRes.membership.rows = sql1_result.rows;
        getRegisteredEvents(primeId, 0, collateCB);
      } else if (resultSeq == 6) {
        resultSeq = 10;
        outRes.event.rows = sql1_result.rows;
      }
      if (resultSeq == 10) {
        aCallback(outRes);
      }
      return;
    }
    return;
  }
  /*
   * This function insert and update all information about persons, address, etc.
   */
  processPersonsInfo(
    primeInfo,
    spouseInfo,
    depInfo,
    address,
    primcomm,
    loginInfo,
    aCallback
  ) {
    // bind the functions to this
    var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
    var setDbCallData = this.setDbCallData.bind(this);
    var getUTCTimestamp = this.getUTCTimestamp.bind(this);
    var executePersonSQL = this.executePersonSQL.bind(this);
    var executeAddressSQL = this.executeAddressSQL.bind(this);
    var executeCommSQL = this.executeCommSQL.bind(this);
    var setAssocLink = this.setAssocLink.bind(this);
    var getAssocLinkInfo = this.getAssocLinkInfo.bind(this);
    //
    var outRes = {
      prime: {},
      spouse: {},
      deps: [],
      address: {},
      primcomm: {},
      loginInfo: loginInfo,
      key: 0,
      flow_step: 0,
      sub_step: 0,
      msg: "",
      err: null,
    };
    let output = null;
    //
    //aCallback(outRes);
    procpersonsCB(output);
    return;
    //
    function procpersonsCB(output) {
      var sql1_result = null;
      var sql2_result = null;
      var sql1_rows = null;
      var sql2_rows = null;
      let flow_step = outRes.flow_step;
      //
      if (output != null) {
        if (output.err) {
          outRes.err = output.err;
          outRes.msg = "SQL Error occurred!";
          outRes.err_msg = output.msg;
          flow_step = 10; // exit
        } else {
          if (output.sql1_result) {
            sql1_result = JSON.parse(output.sql1_result);
          }
          if (output.sql2_result) {
            sql2_result = JSON.parse(output.sql2_result);
          }

          console.log("flow_step: ", flow_step, "sql1: ", "sql2: ");

          /*
           *  Process output now by flow_step
           */
          if (flow_step == 1) {
            // outRes.prime = sql1_result.rows[0];
            if (output.entityCount > 0) outRes.prime = output.entity[0];
          }
          if (flow_step == 2) {
            if (output.entityCount > 0) outRes.spouse = output.entity[0];
            //  outRes.spouse = sql1_result.rows[0];
          }
          if (flow_step == 3) {
            if (output.entityCount > 0) outRes.address = output.entity[0];
            // outRes.address = sql1_result.rows[0];
          }
          if (flow_step == 4) {
            if (output.entityCount > 0) outRes.primcomm = output.entity[0];
            //outRes.primcomm = sql1_result.rows[0];
          }
          if (flow_step == 5) {
            //  if (sql1_result.rows.length > 0) outRes.deps.push(sql1_result.rows[0]);
            if (output.entityCount > 0) outRes.deps.push(output.entity[0]);
          }
        }
      }
      // process step 0
      if (flow_step == 0) {
        let update = primeInfo.update;
        if (update) {
          // update prime if present
          if (primeInfo != null) {
            let key = primeInfo.entity_id;
            let prime = 1;
            let dep = 0;
            let isMinor = 0;
            outRes.flow_step = 1;
            let primeid = primeInfo.entity_id;
            executePersonSQL(
              primeInfo,
              primeid,
              prime,
              dep,
              isMinor,
              key,
              procpersonsCB
            );
            return;
          }
          flow_step = 1;
        } else {
          // insert new person (prime)
          let key = null;
          let prime = 1;
          let dep = 0;
          let isMinor = 0;
          outRes.flow_step = 1;
          let primeid = 0;
          executePersonSQL(
            primeInfo,
            primeid,
            prime,
            dep,
            isMinor,
            key,
            procpersonsCB
          );
          return;
        }
      }
      // process step 1
      if (flow_step == 1) {
        flow_step = 2;
        if (spouseInfo != null) {
          let update = spouseInfo.update;
          if (update) {
            // update spouse if present
            let key = spouseInfo.entity_id;
            let prime = 0;
            let dep = 0;
            let isMinor = 0;
            outRes.flow_step = 2;
            let primeid = primeInfo.entity_id;
            executePersonSQL(
              spouseInfo,
              primeid,
              prime,
              dep,
              isMinor,
              key,
              procpersonsCB
            );
            return;
          } else {
            // insert if data is present
            let key = null;
            let prime = 0;
            let dep = 0;
            let isMinor = 0;
            outRes.flow_step = 2;
            let primeid = outRes.prime.entity_id;
            executePersonSQL(
              spouseInfo,
              primeid,
              prime,
              dep,
              isMinor,
              key,
              procpersonsCB
            );
            return;
          }
        }
      }
      // process step 2  // address
      if (flow_step == 2) {
        flow_step = 3;
        if (address != null) {
          let update = address.update;
          if (update) {
            // update address if present
            let key = address.entity_id;
            outRes.flow_step = 3;
            let primeid = outRes.prime.entity_id;
            executeAddressSQL(address, primeid, key, procpersonsCB);
            return;
          } else {
            // insert if data is present
            let key = null;
            outRes.flow_step = 3;
            let primeid = outRes.prime.entity_id;
            executeAddressSQL(address, primeid, key, procpersonsCB);
            return;
          }
        }
      }
      // process step 3 -- primaryCommunication
      if (flow_step == 3) {
        flow_step = 4;
        if (primcomm != null) {
          let update = primcomm.update;
          if (update) {
            // update primaryCommunication if present
            let key = primcomm.entity_id;
            outRes.flow_step = 4;
            let primeid = outRes.prime.entity_id;
            executeCommSQL(primcomm, primeid, key, procpersonsCB);
            return;
          } else {
            // insert if data is present
            let key = null;
            outRes.flow_step = 4;
            let primeid = outRes.prime.entity_id;
            executeCommSQL(primcomm, primeid, key, procpersonsCB);
            return;
          }
        }
      }
      //
      // Need a transition step because Dependent can be multiple and each dep has two association links
      if (flow_step == 4) {
        let depsLen = depInfo.length;
        console.log("----------> flow_step=4", depsLen);
        if (depsLen > 0) {
          flow_step = 5;
        } else {
          flow_step = 10;
        }
      }
      // Dep loop starts here
      if (flow_step == 5) {
        let i = outRes.sub_step;
        let depsLen = depInfo.length;
        console.log(depsLen, i);
        if (depsLen > 0 && i < depsLen) {
          let update = depInfo[i].update;
          if (update) {
            // update dep
            let aDep = depInfo[i];
            let key = aDep.entity_id;
            let prime = 0;
            let dep = 1;
            let isMinor = 1;
            outRes.flow_step = 5; // association links are not updated
            outRes.sub_step = i + 1;
            let primeid = primeInfo.entity_id;
            executePersonSQL(
              aDep,
              primeid,
              prime,
              dep,
              isMinor,
              key,
              procpersonsCB
            );
            return;
          } else {
            // insert if data is present
            let aDep = depInfo[i];
            let key = null;
            let prime = 0;
            let dep = 1;
            let isMinor = 1;
            outRes.flow_step = 6;
            outRes.sub_step = i;
            let primeid = outRes.prime.entity_id;
            executePersonSQL(
              aDep,
              primeid,
              prime,
              dep,
              isMinor,
              key,
              procpersonsCB
            );
            return;
          }
        }
        flow_step = 10;
      }
      if (flow_step == 6) {
        let i = outRes.sub_step;
        let depsLen = depInfo.length;
        if (depsLen > 0 && i < depsLen) {
          if (output.entityCount > 0) outRes.deps.push(output.entity[0]);
          //   outRes.deps.push(sql1_result.rows[0]);
          let update = depInfo[i].update;
          if (!update) {
            // update dep
            let lInfo = getAssocLinkInfo("parent");
            let name = lInfo.display_name;
            let link_id = lInfo.type_id;
            let depId = output.entity[0].entity_id;
            let jData = {
              entity1_id: outRes.spouse.entity_id,
              entity2_id: depId,
              entity1: "person",
              entity2: "person",
              name: name,
              link_type_id: link_id,
              additional_info: "",
              adult_count: 0,
              child_count: 0,
              guest_count: 0,
            };
            let key = null;
            outRes.flow_step = 5;
            outRes.sub_step = i + 1;
            setAssocLink(jData, key, procpersonsCB);
            return;
          }
        }
        flow_step = 10;
      }
      // Done -- New Return
      if (flow_step == 10) {
        outRes.msg = "Completed Processing Person Info.";
        aCallback(outRes);
        return;
      }
    }
  }
  /*
   * Set a Person - Insert or Update
   */
  setPersonWithPrime(
    personInfo,
    personid,
    primeid,
    associate = null,
    aCallback
  ) {
    var sql1, sql2, args1, args2, name;
    var searchSet;
    //
    if (primeid == null) {
      primeid = 0;
    }
    if (personid == null) {
      personid = 0;
    }
    name = "Get Prime and Person";
    if (primeid > 0 && personid > 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 = sql1;
      args1 = [personid];
      args2 = [primeid];
      searchSet = 0;
    } else if (primeid <= 0 && personid > 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 =
        "SELECT * FROM " +
        this.activeSchema +
        ".person WHERE entity_id=(SELECT entity1_id from " +
        this.activeSchema +
        ".association_link " +
        "where entity1='person' and entity2='person' and entity2_id=$1);";
      args1 = [personid];
      args2 = [personid];
      searchSet = 1;
    } else if (primeid > 0 && personid <= 0) {
      sql1 =
        "SELECT * from " + this.activeSchema + ".person WHERE entity_id=$1;";
      sql2 = null;
      args1 = [primeid];
      args2 = null;
      searchSet = 2;
    } else {
      sql1 =
        "SELECT * from " +
        this.activeSchema +
        ".person WHERE (firstname='" +
        firstname +
        "' and lastname= '" +
        lastname +
        "' ";
      sql1 =
        middlename.length == 0
          ? sql1 + "and middlename='' "
          : sql1 + "and middlename= '" + middlename + "' ";
      sql1 =
        email.length == 0
          ? sql1 + "and email='');"
          : sql1 + "and email= '" + email + "') OR (email='" + email + "');";
      args1 = null;
      sql2 =
        "SELECT * FROM " +
        this.activeSchema +
        ".person WHERE entity_id=(SELECT entity1_id from " +
        this.activeSchema +
        ".association_link " +
        "where entity1='person' and entity2='person' and entity2_id=$1);";
      args2 = null;
      searchSet = 3;
    }
    //
    var output = {
      person: null,
      prime: null,
      found: false,
      isPersonPrime: false,
      err: null,
      err_msg: null,
    };
    // Begin query
    this.pool.connect((err, client, done) => {
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
        //
        // Calling the first sql1 -- It has to be provided all the time
        console.log(sql1, args1);
        client.query(sql1, args1, (err, res) => {
          console.log("Executed Transaction Sql1 for name: " + name);
          console.log(err, res);
          if (shouldAbort(err)) return aCallback(output);
          // no rows found
          if (res.rowCount == 0) {
            return aCallback(output);
          }
          // process output of the first query
          //  console.log("res: ", res.rows);
          // console.log("output: ", output);
          //
          if (searchSet < 2) {
            output.person = JSON.stringify(res);
            output.found = true;
          } else if (searchSet == 2) {
            output.prime = JSON.stringify(res);
            output.person = output.prime;
            output.found = true;
            output.isPersonPrime = true;
            return aCallback(output);
          } else if (searchSet > 2) {
            var prime = res.rows[0].prime;
            var person_id = res.rows[0].entity_id;
            output.found = true;
            output.person = JSON.stringify(res);
            //
            if (prime == 0) {
              args2 = [person_id];
            } else {
              output.prime = output.person;
              output.isPersonPrime = true;
              return aCallback(output);
            }
          }
          //  if Second sql present when searchSet is less or greater than 2
          client.query(sql2, args2, (err, res) => {
            console.log("Executed Transaction Sql2 for name: " + name);
            output.prime = JSON.stringify(res);
            if (shouldAbort(err)) return aCallback(output);
            //
            client.release();
            //done();
            return aCallback(output);
          });
        });
      });
    });
  }
  /*
   * DB connection functions.
   */
  getDBPool() {
    var pool = this.pool;
    return pool;
  }
  //
  getRowsFrom(output, execNum) {
    var rows;
    if (execNum == 2) {
      if (!output.sql2_result) rows = JSON.parse(output.sql2_result).rows;
    } else {
      if (!output.sql2_result) rows = JSON.parse(output.sql1_result).rows;
    }
    return rows;
  }
  //
  setDbCallData(txn_name, sql1, value1, sql2, value2, cond) {
    var data = {
      name: txn_name,
      sql1: sql1,
      args1: value1,
      sql2: sql2,
      args2: value2,
      cond: cond,
    };
    return data;
  }
  //
  execute1SqlsWithCommit(data_json, aCallback) {
    console.log("IN execute1SqlsWithCommit:");
    var name = data_json.name;
    var sql1 = data_json.sql1;
    var args1 = data_json.args1;
    var cond = data_json.cond; // true with commit & false no commit

    //console.log(data_json);
    var output = {
      sql1_result: null,
      sql2_result: null,
      err: null,
      err_msg: null,
    };
    this.pool.connect((err, client, done) => {
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

      console.log("Transaction - Begin", output);
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
  execute2SqlTxn(data_json, aCallback) {
    var name = data_json.name;
    var sql1 = data_json.sql1;
    var args1 = data_json.args1;
    var sql2 = data_json.sql2;
    var is2assoc = data_json.cond;

    //console.log(data_json);
    var output = {
      sql1_result: null,
      sql2_result: null,
      err: null,
      err_msg: null,
    };
    this.pool.connect((err, client, done) => {
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
        //  console.log(sql1, args1);
        client.query(sql1, args1, (err, res) => {
          console.log("Executed Transaction Sql1 for name: " + name);
          console.log("Error: ", err);
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
              // two transactions are associated (second is the link)
              args2 = [res.rows[0].entity_id];
            } else {
              // two transactions are
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
}
exports.SetupDataHelper = SetupDataHelper;

/* CLASS -  */
class DataValidator {
  /*
   *  field validator - Regex required
   */

  constructor(verbose) {
    const data = fs.readFileSync("data_valid_regex.json", "utf8");
    this.regex_json = JSON.parse(data);
  }
  /*
   * matchRegex is used in validData()
   */
  matchRegex(regex, str) {
    let m;
    while ((m = regex.exec(str)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        console.log(`Found match, group ${groupIndex}: ${match}`);
      });
    }
  }
  /*
   * Use this to validate field level data
   */
  validate(fld, fld_type, fld_len_limit = null) {
    var fld_str = fld + "";
    var fld_len = fld_str.length;
    var regex;
    var output = {
      msg: "Invalid Data!",
      valid: false,
    };
    console.log("validate ->: ", fld_str, fld_type, fld_len_limit);
    //console.log(this.regex_json, fld_type);
    if (fld_type in this.regex_json) {
      var ft = this.regex_json[fld_type];
      // console.log("ft  ==> ", ft);
      var ft_len_limit = fld_len_limit;
      if (ft.len > fld_len_limit) {
        ft_len_limit = ft.len;
      }
      regex = new RegExp(ft.pattern, "gm");
    } else {
      output.msg = "Field_type " + fld_type + " not found / unknown!";
      return output;
    }
    var msg = "";
    if (fld_len > ft_len_limit && ft.len > -1) {
      output.msg =
        "Error: Field length more than limit " + fld_len_limit.toString();
      return output;
    }
    console.log(regex, fld_type, fld_str);
    if (regex.exec(fld_str) !== null) {
      output.msg = "Valid data.";
      output.valid = true;
      console.log(output);
      return output;
    }
    console.log(output);
    return output;
  }
  //
  loginData(uid, email, cell) {
    console.log(uid, email, cell);
    if (uid != null || typeof uid != "undefined") {
      var test = this.validate(uid, "uid", 0);
    } else {
      test = false;
    }
    if (!test.valid) return false;
    if (email != null || typeof email != "undefined") {
      test = this.validate(email, "email", 0);
    } else {
      test = false;
    }
    if (!test.valid) return false;
    if (token == null || typeof token != "undefined") {
      test = this.validate(cell, "number", 0);
    } else {
      test = false;
    }
    if (!test.valid) return false;
    return true;
  }
  //
  tokenData(uid, email, token) {
    console.log(uid, email, token);
    var test = this.validate(uid, "uid", 0);
    if (!test.valid) return false;
    test = this.validate(email, "email", 0);
    if (!test.valid) return false;
    test = this.validate(token, "md5", 32);
    if (!test.valid) return false;
    return true;
  }
  //
  registrationData(firstname, middlename, lastname, uid, email, cell) {
    console.log(uid, email, cell);
    var test = this.validate(uid, "uid", 0);
    if (!test.valid) return false;
    test = this.validate(email, "email", 0);
    if (!test.valid) return false;
    if (cell != null) {
      test = this.validate(cell, "number", 0);
      if (!test.valid) return false;
    }
    if (firstname.length > 0 || firstname != null) {
      test = this.validate(firstname, "name", 0);
      if (!test.valid) return false;
    }
    if (
      !(
        middlename === null ||
        typeof middlename === "undefined" ||
        middlename != ""
      )
    ) {
      if (middlename.length > 0) {
        test = this.validate(middlename, "name", 0);
        if (!test.valid) return false;
      }
    }
    if (lastname.length > 0 || lastname != null) {
      test = this.validate(lastname, "name", 0);
      if (!test.valid) return false;
    }
    return true;
  }
  //
  findPersonData(firstname, middlename, lastname, email, year) {
    var test = this.validate(email, "email", 0);
    if (!test.valid) return false;
    //
    if (year != null) {
      test = this.validate(year, "number", 0);
      if (!test.valid) return false;
    }
    //
    test = this.validate(firstname, "name", 0);
    if (!test.valid) return false;
    if (middlename.length > 1) {
      test = this.validate(middlename, "name", 0);
      if (!test.valid) return false;
    }
    test = this.validate(lastname, "name", 0);
    if (!test.valid) return false;
    return true;
  }
  //
  personData(person_json, update = null) {
    var test = this.validate(person_json.entity_id, "dbkey", 0);
    if (update != null && update) {
      if (!test.valid) return false;
    }
    test = this.validate(person_json.email, "email", 0);
    if (!test.valid) return false;
    test = this.validate(person_json.firstname, "name", 0);
    if (!test.valid) return false;
    if (
      !(
        person_json.middlename === null ||
        typeof person_json.middlename === "undefined"
      )
    ) {
      if (person_json.middlename.length > 1) {
        test = this.validate(person_json.middlename, "name", 0);
        if (!test.valid) return false;
      }
    }
    test = this.validate(person_json.lastname, "name", 0);
    if (!test.valid) return false;
    if (person_json.telephone.length > 0) {
      test = this.validate(person_json.telephone, "number", 0);
      if (!test.valid) return false;
    }
    if (person_json.mobile.length > 0) {
      test = this.validate(person_json.mobile, "number", 0);
      if (!test.valid) return false;
    }
    return true;
  }
  address(address, update = null) {
    var test = this.validate(address.entity_id, "dbkey", 0);
    if (update != null && update) {
      if (!test.valid) return false;
    }
    test = this.validate(address.zip, "zipcode", 0);
    if (!test.valid) return false;
    test = this.validate(address.city, "city", 0);
    if (!test.valid) return false;
    //
    return true;
  }
  payRawData(person, event, membership, transactions, form_ref, form_date) {
    var test, i;
    var testEvent = true;
    console.log("--------RawData");
    //
    if (person != null) {
      test = this.personData(person, null);
      console.log("personData: ", test);
      if (!test) return test;
    }
    console.log(form_ref, form_date);
    test = this.validate(form_ref, "alphanumeric", 0);
    if (!test.valid) return test;
    //test = (this.validate(form_date, "dateYMD", 0));
    // (!test.valid) return false;
    //
    if (transactions == null) {
      test = {
        msg: "PayData - transactions - null",
        valid: false,
      };
      console.log(test);
      return test;
    }
    let txnLen = transactions.length;
    if (txnLen == 0) {
      test = {
        msg: "number of transactions in PayData is 0",
        valid: false,
      };
      console.log(test);
      return test;
    }
    for (i = 0; i < txnLen; i++) {
      let txn = transactions[i];
      console.log(txn);
      if (txn.category == "event") {
        if (event != null) {
          if (testEvent) {
            test = this.validate(event.name, "alphanumeric+", 0);
            if (!test.valid) return test;
            test = this.validate(event.year, "number", 0);
            if (!test.valid) return test;
            test = this.validate(event.adult_count, "number", 0);
            if (!test.valid) return test;
            test = this.validate(event.child_count, "number", 0);
            if (!test.valid) return test;
            test = this.validate(event.guest_count, "number", 0);
            if (!test.valid) return test;
            testEvent = false;
          }
        } else {
          console.log("event: ", event);
          test = {
            msg: "PayData - event is - null",
            valid: false,
          };
          return test;
        }
      }
      if (txn.category == "BANC") {
        if (membership != null) {
          test = this.validate(membership.type, "alphanumeric+", 0);
          if (!test.valid) return test;
          test = this.validate(membership.year, "number", 0);
          if (!test.valid) return test;
        } else {
          test = {
            msg: "PayData - membership is - null",
            valid: false,
          };
          return test;
        }
      }
    }

    test = {
      msg: "PayData validated",
      valid: true,
    };
    return test;
  }
  //
  abbrState(input, to) {
    var states = [
      ["Arizona", "AZ"],
      ["Alabama", "AL"],
      ["Alaska", "AK"],
      ["Arkansas", "AR"],
      ["California", "CA"],
      ["Colorado", "CO"],
      ["Connecticut", "CT"],
      ["Delaware", "DE"],
      ["Florida", "FL"],
      ["Georgia", "GA"],
      ["Hawaii", "HI"],
      ["Idaho", "ID"],
      ["Illinois", "IL"],
      ["Indiana", "IN"],
      ["Iowa", "IA"],
      ["Kansas", "KS"],
      ["Kentucky", "KY"],
      ["Louisiana", "LA"],
      ["Maine", "ME"],
      ["Maryland", "MD"],
      ["Massachusetts", "MA"],
      ["Michigan", "MI"],
      ["Minnesota", "MN"],
      ["Mississippi", "MS"],
      ["Missouri", "MO"],
      ["Montana", "MT"],
      ["Nebraska", "NE"],
      ["Nevada", "NV"],
      ["New Hampshire", "NH"],
      ["New Jersey", "NJ"],
      ["New Mexico", "NM"],
      ["New York", "NY"],
      ["North Carolina", "NC"],
      ["North Dakota", "ND"],
      ["Ohio", "OH"],
      ["Oklahoma", "OK"],
      ["Oregon", "OR"],
      ["Pennsylvania", "PA"],
      ["Rhode Island", "RI"],
      ["South Carolina", "SC"],
      ["South Dakota", "SD"],
      ["Tennessee", "TN"],
      ["Texas", "TX"],
      ["Utah", "UT"],
      ["Vermont", "VT"],
      ["Virginia", "VA"],
      ["Washington", "WA"],
      ["West Virginia", "WV"],
      ["Wisconsin", "WI"],
      ["Wyoming", "WY"],
    ];
    var i;
    if (to == "abbr") {
      input = input.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
      for (i = 0; i < states.length; i++) {
        if (states[i][0] == input) {
          return states[i][1];
        }
      }
    } else if (to == "name") {
      input = input.toUpperCase();
      for (i = 0; i < states.length; i++) {
        if (states[i][1] == input) {
          return states[i][0];
        }
      }
    }
  }
}
//
exports.DataValidator = DataValidator;
