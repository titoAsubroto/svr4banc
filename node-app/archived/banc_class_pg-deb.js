"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
//
// db is prostgres now 
const fs = require('fs');
const crypto = require('crypto');
const appConfig = require('config');
var querystring = require('querystring');
const { Pool } = require('pg');
const { release } = require('os');
const c = require('config');
const { now } = require('lodash');
const e = require('express');
//var useDb = require('pg');

class setupDataHelper {

    constructor(verbose) {
        this.config = JSON.parse(fs.readFileSync("bdl-config.json", "utf8"));
        this.testdata = JSON.parse(fs.readFileSync("testdata.json", "utf8"));
        //const sqlStmt = fs.readFileSync("predef_sql_statements.json", "utf8");
        // this.predef_SQLs = JSON.parse(sqlStmt)
        this.verbose = (verbose) ? true : false;
        this.validityOfToken = 480;
        this.txnTypeInfo = {};
        this.affiliationType = [];
        this.eventInfo = {};
        this.assocLinkInfo = {};
        this.banc_org_id = "BANCinRDU";
        this.banc_entity_id = 100;
        this.org_entity = 'organization';
        this.result = null;
        this.insertId = null;
        this.db_config = {
            host: this.config.db_host, // Server hosting the postgres database
            port: this.config.db_port,  // env var: PGPORT - 5432
            user: this.config.Pg_uid, // env var: PGUSER
            password: this.config.Pg_pwd, // env var: PGPASSWORD
            database: this.config.database, // env var: PGDATABASE
            max: 15, // max number of clients in the pool
            ssl: { rejectUnauthorized: false },
            idleTimeoutMillis: 50000 // how long a client is allowed to remain idle before being closed
        };
        this.pool = new Pool(this.db_config);
        this.validator = new DataValidator(verbose);
    }
    //Test function 
    testFunction(req, Res) {

        console.log("Process membership");
        var outRes = {};
        let form_date = null;
        let form_memo = this.testdata.form_memo;
        let form_ref_id = this.testdata.form_ref_id;
        var processEventTransaction = this.processEventTransaction.bind(this);
        var processMembershipTransaction = this.processMembershipTransaction.bind(this);
        // create function data
        var data = this.sortAndBuildTractionData(form_ref_id, form_memo, form_date, this.testdata);
        console.log("Membership Data: ", data);
        // call function
        processMembershipTransaction(35, data.membership[0], 0, testFnCB);
        function testFnCB(output) {
            console.log(output);
            if (output.flow_step == 0) {
                outRes.membership = output;
                processEventTransaction(35, data.event[0], 1, testFnCB);
            }
            if (output.flow_step == 1) {
                outRes.events = output;
                Res.send((JSON.stringify(outRes)));
            }
        }
    }
    //
    getConfig() {
        return this.config;
    }
    getLastId() {
        return this.insertId;
    }
    getLastResult() {
        return this.result;
    }
    getAssocLinkInfo(name) {
        var out = {};
        if (name in this.getAssocLinkInfo) {
            out = this.getAssocLinkInfo[name];
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
        var arr = this.txnTypeInfo[cat][subcat];
        var i;
        for (i = 0; i < arr.length; i++) {
            if ((arr[i].mapping).indexOf(searchtext) != -1) {
                return arr[i].type_id;
            }
        }
        return -1;
    }
    getTransactionInfoFromId(type_id, lineItemONLY = null) {
        // console.log("LineItem");
        var typeIds = this.txnTypeInfo['typeIds'];
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
        var out = null
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
    setLinkInfo() {
        //
        const sqlStmt = "SELECT type_name, type_id, display_name FROM banc.link_type;";
        this.pool
            .connect()
            .then(client => {
                return client
                    .query(sqlStmt, null)
                    .then(result => {
                        client.release();
                        console.log("-------------LinkInfo");
                        //console.log(result.rows);
                        var lInfo = {};
                        var rows = result.rows;
                        Object.keys(rows).forEach(function (key) {
                            var row = rows[key];
                            //console.log(row)
                            lInfo[row.type_name] = {
                                "type_id": row.type_id,
                                "display_name": row.display_name
                            };
                        });
                        //console.log("LinkInfo: ", lInfo);
                        this.assocLinkInfo = lInfo;
                        return;
                    })
                    .catch(err => {
                        client.release();
                        console.log(err.stack);
                    });
            });
    }
    //
    setEventInfo() {
        const sqlStmt = "SELECT eventname, entity_id, event_year, showlink, start_date, end_date FROM banc.event;";
        //
        this.pool.connect((err, client, done) => {
            if (err) {
                console.log("Error calling setEventInfo -- Connection failed.");
            }
            client.query(sqlStmt, null, (err, res) => {
                done()

                if (err) {
                    console.log(err.stack);
                } else {
                    //console.log(res.rows);
                    console.log("------------ Event ---------");
                    this.setupEventInfo(res.rows);
                    // console.log(this.eventInfo);
                }
            })
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
            //console.log(eName, id, year);
            if ((year in eInfo) == false) {
                eInfo[year] = [];
                //console.log(year);
            }
            eInfo[year].push({
                "id": id,
                "name": eName,
                "showlink": showlink,
                "start_date": sd,
                "end_date": ed
            });
        });
        //console.log("Event Info: ", eInfo);
        this.eventInfo = eInfo;
        return;

    }
    //
    isTokenValid(userid, email, token, actionCallback) {
        let expiryTime = ` AND valid_date >= now() - INTERVAL '${this.validityOfToken} hour';`;
        var sqlStmt = "SELECT primeid, personid FROM banc.sessionToken WHERE uid=$1 and email=$2 and token=$3 " + expiryTime;
        var args = [userid, email, token];
        var output = {
            "sql1_result": null,
            "token_valid": false,
            "primeid": 0,
            "personid": 0,
            "err": null,
            "msg": "Invalid access token or Expired.",
        };
        const validate = new DataValidator(true);
        if (!validate.tokeData(userid, email, token)) {
            output.msg = "Invalid Token parameters";
            actionCallback(output);
            return;
        }
        //console.log ("isTokenValid: ", sqlStmt);
        //
        this.pool.connect((err, client, done) => {
            console.log("------------ Token Validation start---------");
            if (err) {
                console.log("Error in DB Connection 'isTokenValid' -- Connection failed.");
            }
            //console.log(sqlStmt, args);
            client.query(sqlStmt, args, (err, res) => {
                done()
                output.sql1_result = JSON.stringify(res);
                output.err = err;
                if (err) {
                    console.log(err.stack);
                }
                //console.log(res.rows);
                console.log("------------ Token Validation done ---------");
                if (res.rowCount > 0) {
                    output.token_valid = "true";
                    output.msg = "Access Token valid.";
                    output.personid = res.rows[0].primeid;
                    output.primeid = res.rows[0].personid;
                }

                actionCallback(output);
            })
        });
    }
    //
    setTransactionTypeInfo() {
        const sqlStmt = "SELECT category, subcategory, line_item, type_id, mapping_string FROM banc.transaction_type;";
        this.pool
            .connect()
            .then(client => {
                return client
                    .query(sqlStmt, null)
                    .then(result => {
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
                            if ((cat in txnTypeInfo) == false) {
                                txnTypeInfo[cat] = {};
                            };
                            if (row.type_id in txnTypeId == false) {
                                txnTypeId[row.type_id] = {
                                    "line_item": row.line_item,
                                    "category": cat,
                                    "sub_category": scat
                                };
                            }
                            if ((scat in txnTypeInfo[cat]) == false) {
                                txnTypeInfo[cat][scat] = [];
                            };
                            var jSC = {
                                "type_id": row.type_id,
                                "line_item": row.line_item,
                                "mapping": row.mapping_string
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
                    .catch(err => {
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
            let mapstrs = value['mapping_string'].split('|');
            Object.keys(mapstrs).forEach(function (key) {
                let mapstr = mapstrs[key];
                if (mapstr.indexOf() > -1) {
                    return [id, affiliation];
                }
            });
        });
        return [1010, 'Family-member'];
    }
    //
    setAffiliationTypeInfo() {

        const sqlStmt = "SELECT affiliation, ismember, entity_id, mapping_string FROM banc.banc_community;";
        this.pool
            .connect()
            .then(client => {
                return client
                    .query(sqlStmt, null)
                    .then(result => {
                        client.release();
                        var rows = result.rows;
                        var affInfo = {};
                        Object.keys(rows).forEach(function (key) {
                            var row = rows[key];
                            //console.log(row);
                            const value = {
                                "mapping_string": row['mapping_string'],
                                "entity_id": row['entity_id'],
                                "ismember": row["ismember"]
                            };
                            const affKey = row['affiliation'];
                            affInfo[affKey] = value;
                        });
                        this.affiliationType = affInfo;
                        console.log("Print in set Affiliation:")
                        //console.log(affInfo);
                    })
                    .catch(err => {
                        console.log("Error in setAffiliationTypeInfo - ")
                        client.release();
                        console.log(err.stack);
                    });
            });
    }
    //
    createTractionDataOf(form_ref_id, form_memo, form_date, mship, event, adnEventTxn) {
        var out = {
            "entity_id": 0,
            "amount": 0.0,
            "service_fee_paid": 0.0,
            "amount_net": 0.0,
            "form_date": now(),
            "form_memo": form_memo,
            "form_ref": form_ref_id,
            "bank_transaction_memo": "-",
            "bank_transaction_ref": "-",
            "bank_transaction_date": "2020-10-10",
            "inbound": true,
            "transaction_type_id": 1,
            "summary": false,
            "adult_count": 0,
            "child_count": 0,
            "guest_count": 0
        };
        if (mship != null && event == null && adnEventTxn == false) {
            out.amount = mship.amount;
            out.form_date = this.getUTCTimestamp(form_date);
            out.bank_transaction_date = out.form_date;
            out.transaction_type_id = this.getTransactionId("BANC", "membership", mship.membership_type);

        } else if (mship == null && event != null && addEventTxn == false) {  // TBD - additional Event
            out.amount = event.amount * event.event_info_quantity;
            out.form_date = this.getUTCTimestamp(form_date);
            out.bank_transaction_date = out.form_date;
            out.transaction_type_id = this.getTransactionId("event", event.subcategory, event.event_info);
        } else if (mship == null && event == null && addEventTxn == true) {  // TBD - additional Event
            out.amount = event.additional_amount * event.addition_info_quantity;
            out.form_date = this.getUTCTimestamp(form_date);
            out.bank_transaction_date = out.form_date;
            out.transaction_type_id = this.getTransactionId("event", event.subcategory, event.additional_info);
        } else out = null;
        return out;
    }

    //
    sortAndBuildTractionData(form_ref_id, form_memo, form_date, jData) {
        var date2use, allTxns;
        if (form_date == null) {
            date2use = this.getUTCTimestamp(form_date);
        }
        else {
            date2use = this.getUTCTimestamp(now());
        }
        var txn_template = {
            "entity_id": 0,
            "amount": 0.0,
            "service_fee_paid": 0.0,
            "amount_net": 0.0,
            "info": null,
            "name": null,
            "eventname": null,
            "year": null,
            "link_type_id": null,
            "form_date": date2use,
            "form_memo": form_memo,
            "form_ref": form_ref_id,
            "bank_transaction_memo": "-",
            "bank_transaction_ref": "-",
            "bank_transaction_date": null,
            "inbound": true,
            "transaction_type_id": null,
            "summary": false,
            "adult_count": 0,
            "child_count": 0,
            "guest_count": 0
        };
        var txns = {
            "membership": [],
            "event": [],
            "paypal": [],
        };
        /*
        *   sort transactions
        */
        console.log(jData);
        if ("transactions" in jData) {
            allTxns = jData.transactions;
        }

        for (let i = 0; i < allTxns.length; i++) {
            let txndata = allTxns[i];
            console.log(txndata);
            var out = JSON.parse(JSON.stringify(txn_template));
            out.amount = txndata.amount * txndata.quantity;
            out.bank_transaction_date = out.form_date;
            console.log(txndata.category, txndata.sub_category, txndata.line_item);
            out.transaction_type_id = this.getTransactionId(txndata.category, txndata.sub_category, txndata.line_item);
            if (txndata.category == "BANC") {
                if ("membership" in jData) {
                    out.name = txndata.category + "/" + txndata.sub_category + "/" + txndata.line_item;
                    out.info = jData.membership.type;
                    out.year = jData.membership.year;
                    txns.membership.push(out);
                }

            } else if (txndata.category == "event") {
                if ("event" in jData) {
                    out.adult_count = jData.event.adult_count;
                    out.child_count = jData.event.child_count;
                    out.guest_count = jData.event.guest_count;
                    out.eventname = jData.event.name;
                    out.info = txndata.category + "/" + txndata.sub_category + "/" + txndata.line_item;
                    out.year = jData.event.year;
                    let lineitem = txndata.line_item;
                    console.log(lineitem);
                    //if ((new RegExp("/Family|Student|Senior/")).exec(lineitem) !== null) {
                    out.name = this.assocLinkInfo["member"].display_name + "/" + out.eventname;
                    out.link_type_id = this.assocLinkInfo["member"].type_id;

                    if ((new RegExp("/Non-member/")).exec(lineitem) !== null) {
                        out.name = this.assocLinkInfo["member"].display_name + "/" + out.eventname;
                        out.link_type_id = this.assocLinkInfo["non-member"].type_id;
                    }

                    txns.event.push(out);
                }
            }
        }
        return txns;
    }
    /*
    * doTransactionWithPrime -- inserts or update a transaction and links to prime_id
    * If prime_id =0 then the association is not done.
    * If key > 0 the transaction is updated and the association is not done
    */
    doTransactionWithPrime(jData, primeid = null, info = null, key = null, aCallback) {
        var entity2 = 'transaction';
        var entity1 = 'person';
        var entitytable = this.config.entityTables[entity2];
        var linktable1 = this.config.linkTables[entity2];
        var form_ref = jData.form_ref;
        //var date = jData.bank_transaction_date;
        let txn_info = this.getTransactionInfoFromId(jData.transaction_type_id, null);
        console.log(txn_info);
        var name = txn_info.category + "/" + txn_info.sub_category + "/" + txn_info.line_item;
        var sqlStmt, sql2, cond;
        cond = false;
        sql2 = null;
        if (key > 0) {
            sqlStmt = "UPDATE " + entitytable + " SET amount=" + jData.amount + "," +
                "service_fee_paid=" + jData.service_fee_paid + ", amount_net=" + jData.amount_net + "," +
                "bank_transaction_memo='" + jData.bank_transaction_memo + "', bank_transaction_ref='" +
                jData.bank_transaction_ref + "', bank_transaction_date_utc='" + jData.bank_transaction_date +
                "', form_ref='" + jData.form_ref + "' WHERE entity_id=" + key + " RETURNING *;"
            console.log("updating transaction ...");
        } else {
            var sql_stmnt = "INSERT INTO " + entitytable + " (amount, service_fee_paid, amount_net, form_date_utc, form_memo," +
                " form_ref, bank_transaction_memo, bank_transaction_ref, bank_transaction_date_utc, " +
                " inbound, transaction_type_id, summary)  VALUES (";
            var sqlTemp = `${jData.amount}, ${jData.service_fee_paid},${jData.amount_net},'${jData.form_date}','${jData.form_memo}','${jData.form_ref}','${jData.bank_transaction_memo}',
                '${jData.bank_transaction_ref}','${jData.bank_transaction_date}',${jData.inbound}, ${jData.transaction_type_id},${jData.summary}) RETURNING *`;
            sqlStmt = sql_stmnt + sqlTemp;
            console.log("inserting transaction ...");
        }
        if (primeid > 0) {
            cond = true;
            sql2 = "INSERT INTO " + linktable1 + " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
                "form_ref, txn_form_date) VALUES (" +
                `${primeid},$1,'person','transaction','${name}','${info}','${form_ref}','${jData.bank_transaction_date}') RETURNING *;`;
        }
        console.log(sqlStmt);
        this.execute2SqlTxn(this.setDbCallData("process transaction with prime", sqlStmt, null, sql2, null, cond), aCallback);
    }
    /* *************** */
    //
    executeAddressSQL(jAdr, primeid, aCallback) {
        let sqlStmt;
        let sql2;
        let cond;
        console.log(jAdr);
        let adrlnk = this.assocLinkInfo['Address'];
        let nameAdr = this.assocLinkInfo[adrlnk];
        if (prime > 0) {

            sqlStmt = `INSERT INTO ${this.entityTables["address"]} (street, address2, city, state, zip, country) VALUES(` +
                `'${jAdr.street}', '${jAdr.address2}', '${jAdr.city}','${jAdr.state}','${jAdr.zip}','${jAdr.country}') ` +
                'ON CONFLICT (street, city, zip) DO NOTHING RETURNING *;';
            sql2 = `INSERT INTO ${this.linkTables["aff"]} () VALUES ()`
            cond = true
        } else {
            sqlStmt = "CALL UpdateAddressComm(" +
                `${adrId}, '${jAdr.street}', '${jAdr.address2}', '${jAdr.city}','${jAdr.state}','${jAdr.zip}','${jAdr.country}', ` +
                `${fcId}, '${jFC.telephone}','${jFC.mobile}','${jFC.email}');`;
            sql2 = null;
            cond = false;
        }
        console.log(sqlStmt);
        this.execute2SqlTxn(this.setDbCallData("Execute Address with prime", sqlStmt, null, sql2, null, cond), aCallback);
        return;
    }
    //
    executeCommSQL(jFC, primeid, aCallback) {
        let sqlStmt;
        console.log(jAdr);
        if (prime > 0 && (adrId == null || adrId <= 0 || fcId <= 0 || fcId == null)) {
            let adrlnk = this.assocLinkInfo['Address'];
            let nameAdr = this.assocLinkInfo[adrlnk];
            let comlnk = this.assocLinkInfo['Communication'];
            let nameComm = this.assocLinkInfo[comlnk];
            sqlStmt = "CALL InsertAddressComm(" +
                `${prime}, '${jAdr.street}', '${jAdr.address2}', '${jAdr.city}','${jAdr.state}','${jAdr.zip}','${jAdr.country}', ` +
                `'${nameAdr}', ${adrlnk}, '${jFC.telephone}','${jFC.mobile}','${jFC.email}','${nameComm}', ${comlnk});`;
        } else {
            sqlStmt = "CALL UpdateAddressComm(" +
                `${adrId}, '${jAdr.street}', '${jAdr.address2}', '${jAdr.city}','${jAdr.state}','${jAdr.zip}','${jAdr.country}', ` +
                `${fcId}, '${jFC.telephone}','${jFC.mobile}','${jFC.email}');`;
        }
        console.log(sqlStmt);
        this.execute2SqlTxn(this.setDbCallData("Execute Family Comm with prime", sqlStmt, null, sql2, null, cond), aCallback);
        return;
    }
    /* *************** */
    /* *************** */
    //
    getPersonSQL(jData, prime, dep, isMinor, key = null) {
        if (!this.validator.personData(jData)) {
            return null;
        }
        var sqlStmt;
        if (key <= 0 || key == null) {
            // sqlStmt = "CALL InsertPerson (" +
            sqlStmt = "INSERT INTO banc.person (firstname, middlename, lastname, email, prime, " +
                " dependent, affiliationId, telephone, mobile, isMinor) VALUES ( " +
                `'${jData.firstname}','${jData.middlename}','${jData.lastname}','${jData.email}',${prime},${dep},'${jData.affiliationid}',` +
                `'${jData.telephone}','${jData.mobile}', ${isMinor}) ` +
                " ON CONFLICT (firstname, lastname, email, middlename) DO NOTHING RETURNING *;";
            /*
              `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
              `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
              `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
              `firstname='${jData.firstname}' and middlename='${jData.middlename}' and lastname='${jData.lastname}' 
               and email='${jData.email}';` ; */

        } else {
            sqlStmt = "UPDATE banc.person SET " +
                `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
                `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
                `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
                `entity_id='${key};`;

        }
        return sqlStmt;
    }
    //
    executePersonSQL(aCallback, jData, prime, dep, isMinor, key = null) {
        let sqlStmt = getPersonSQL(jData, prime, dep, isMinor, key);
        console.log(sqlStmt);
        executeSQL(sqlStmt, null, aCallback);
        return;
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
            utcStr = (new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())).toUTCString();
        }
        return utcStr;
    }
    //
    generate_token(length) {
        //edit the token allowed characters
        var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz".split("");
        var b = [];
        for (var i = 0; i < length; i++) {
            var j = (Math.random() * (a.length - 1)).toFixed(0);
            b[i] = a[j];
        }
        return b.join("");
    }
    getNewOTP(prime_id, email, otp, r_fname = null, r_mname = null, r_lname = null) {
        var session_id = this.generate_token(45);
        var utc_time = this.getUTCTimestamp(null);
        var ins_str = "INSERT INTO token (otpassword, createTimeUTC, email, primeId, sessiontoken, req_firstname" +
            "req_middlenmae, req_lastname) VALUES (" + `${otp}, ${utc_time}, ${email}, ${prime_id}, ${session_id}, ${r_fname}, ` +
            `${r_mname}, ${r_lname});`
        return ins_str;
    }
    //
    executeStoreProc(sqlStmt, aCallback) {
        console.log(sqlStmt)
        const err = true;
        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callStoreProc(sqlStmt, null)
            .then(result => {
                aCallback(result, null);
                useDb.close();
                return;
            },
                err => {
                    aCallback(null, err);
                    useDb.close();
                    return;
                });
    }

    sqlAssocLink(allElements) {
        let sqlStmt;
        if (allElements) {
            sqlStmt = "INSERT INTO banc.association_link" +
                " (entity1_id, entity2_id, entity1, entity2, name, link_type_id, additional_info, adult_count, child_count,guest_count)" +
                " VALUES ?;";
        } else {
            sqlStmt = "INSERT INTO " + this.config.linkTables['association'] +
                " (entity1_id, entity2_id, entity1, entity2, name, link_type_id) VALUES ? " +
                "ON DUPLICATE KEY UPDATE entity1_id=VALUES(entity1_id), entity2_id=VALUES(entity2_id)," +
                "entity1=VALUES(entity1), entity2=VALUES(entity2),name=VALUES(name), link_type_id=VALUES(link_type_id);"
        }
        return sqlStmt;
    }
    createAssocLinks(sqlStmt, args, aCallback) {
        //console.log(sqlStmt);
        //console.log(args);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, [args])
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    /* *************** */
    associatedPersons(id, aCallback) {
        const err = true;
        const tableAssoc = this.config.linkTables['association'];
        const tablePerson = this.config.entityTables['person'];
        const sqlStmt = "SELECT entity_id,lastName, firstName, middlename, email, prime, dependent, " +
            " telephone, mobile, isMinor, affiliationid FROM  " + tablePerson +
            " where entity_id in " + "(select entity2_id from " +
            tableAssoc + " where entity1_id =" + id + " and entity1 = 'person' and entity2 = 'person');";

        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    /* *************** */
    associatedAddress(id, aCallback) {
        const err = true;
        const tableAssoc = this.config.linkTables['association'];
        const tableAddress = this.config.entityTables['address'];
        const sqlStmt = "SELECT entity_id, street, address2, city, state, zip, country FROM  " + tableAddress +
            " where entity_id in " + "(select entity2_id from " +
            tableAssoc + " where entity1_id =" + id + " and entity1 = 'person' and entity2 = 'address');";

        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    /* *************** */
    associatedFamilyComm(id, aCallback) {
        const err = true;
        const tableAssoc = this.config.linkTables['association'];
        const tableComm = this.config.entityTables['communication'];
        const sqlStmt = "SELECT entity_id, email, telephone, mobile FROM  " + tableComm +
            " where entity_id in " + "(select entity2_id from " +
            tableAssoc + " where entity1_id =" + id + " and entity1 = 'person' and entity2 = 'communication');";

        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    /**
     * get BANC membership paid
     */
    getMembershipPaid(primeid, aCallback) {
        const cell = "";
        var sqlStmt = "select c.entity1_id, c.name, c.year, c.renewal_date, l.name," +
            " t.entity_id, t.amount, t.service_fee_paid, t.amount_net,"
        " from banc_db.community_link c, banc_db.transaction t, banc_db.transaction_link l " +
            " where c.entity1_id = l.entity1_id and t.entity_id = l.entity2_id and c.entity1_id = " + primeid;
        console.log(sqlStmt);
        this.execute1SqlsWithCommit(this.setDbCallData("Get Membership Paid for ONE", sqlStmt, null, null, null, false), aCallback);
    }
    //
    //
    /**
     * get BANC Registered Events by prime id
     */
    getRegisteredEvents(primeid, year, aCallback) {
        var sqlStmt;
        if (year > 0) {
            sqlStmt = "SELECT e.eventname, e.event_year, al.name as registration, al.adult_count, al.guest_count, " +
                " al.child_count, al.update_date as date, al.link_id from banc_db.event e, banc_db.association_link al " +
                " where al.entity2='event' and al.entity2_id=e.entity_id and " +
                " e.event_year = " + year.toString() + " and entity1_id = " + primeid.toString() + ";";
        } else {
            sqlStmt = "SELECT e.eventname, e.event_year, al.name as registration, al.adult_count, al.guest_count, " +
                " al.child_count, al.update_date as date, al.link_id from banc_db.event e, banc_db.association_link al " +
                " where al.entity2='event' and al.entity2_id=e.entity_id and " +
                "  entity1_id = " + primeid.toString() + ";";
        }
        console.log(sqlStmt);
        this.execute1SqlsWithCommit(this.setDbCallData("Get Registered Events", sqlStmt, null, null, null, false), aCallback);
    }
    /**
     * get BANC transaction done by member
     */
    getTransactions(primeid, dateFrom, dateTo, all_txn, aCallback) {
        var sqlStmt;
        if (dateFrom.length > 0 && dateTo.length > 0) {
            sqlStmt = "Select tl.name as transaction_name, t.amount, t.service_fee_paid, " +
                "t.amount_net, tl.txn_form_date as transaction_date, t.summary, " +
                "tt.category, tt.subcategory, tt.line_item, " +
                "t.entity_id as transaction_id, t.bank_transaction_ref, tl.link_id " +
                "from banc_db.transaction t, banc_db.transaction_link tl, banc_db.transaction_type tt where " +
                "tl.entity2_id = t.entity_id and t.transaction_type_id=tt.type_id and tl.entity1_id =" + primeid.toString() +
                " and tl.txn_form_date between " + dateFrom + " and " + dateTo + ";";
        } else {
            sqlStmt = "Select tl.name as transaction_name, t.amount, t.service_fee_paid, " +
                "t.amount_net, tl.txn_form_date as transaction_date, t.summary, " +
                "tt.category, tt.subcategory, tt.line_item, " +
                "t.entity_id as transaction_id, t.bank_transaction_ref, tl.link_id " +
                "from banc_db.transaction t, banc_db.transaction_link tl, banc_db.transaction_type tt where " +
                "tl.entity2_id = t.entity_id and t.transaction_type_id=tt.type_id and tl.entity1_id =" + primeid.toString() + ";";
        }
        console.log(sqlStmt);
        this.execute1SqlsWithCommit(this.setDbCallData("Get Transactions done by ONE", sqlStmt, null, null, null, false), aCallback);
    }
    /**
     * get BANC Membership paid List by member
     */
    getBANCMembershipPaid(primeid, yearFrom, yearTo, all_members, aCallback) {
        var sqlStmt;
        if (yearFrom.length > 0 && yearTo.length > 0) {
            sqlStmt = "Select c.affiliation, cl.year as membership_year, cl.renewal_date, " +
                "c.entity_id as banc_community_id, cl.link_id " +
                "from banc_db.banc_community c, banc_db.community_link cl where " +
                "cl.entity2_id = c.entity_id and " +
                "cl.entity1_id =" + primeid.toString() +
                " and year between " + yearFrom + " and " + yearTo + ";";
        } else {
            sqlStmt = "Select c.affiliation, cl.year as membership_year, cl.renewal_date, " +
                "c.entity_id as banc_community_id, cl.link_id " +
                "from banc_db.banc_community c, banc_db.community_link cl where " +
                "cl.entity2_id = c.entity_id and " +
                "cl.entity1_id =" + primeid.toString() + ";";
        }
        console.log(sqlStmt);
        this.execute1SqlsWithCommit(this.setDbCallData("Get Membership Paid", sqlStmt, null, null, null, false), aCallback);
    }
    /**
     * ismember 
     */
    /* *************** */
    ismember(id, year, aCallback) {
        var err = true;
        var tableAssoc = this.config.linkTables['affiliation'];
        var sqlStmt = "";
        if (year !== null) {
            sqlStmt = "select entity1_id, name, year, renewal_date from " +
                tableAssoc + " where entity1_id=" + id + " and year=" + year + ";";
        } else {
            sqlStmt = "select entity1_id, name, year, renewal_date from " +
                tableAssoc + " where entity1_id=" + id + ";";
        }
        console.log(sqlStmt);
        this.execute1SqlsWithCommit(this.setDbCallData("isMember", sqlStmt, null, null, null, false), aCallback);
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
        //
        // bind the functions to this
        var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
        var setDbCallData = this.setDbCallData.bind(this);
        var getUTCTimestamp = this.getUTCTimestamp.bind(this);
        var doTransactionWithPrime = this.doTransactionWithPrime.bind(this);
        var createTractionDataOf = this.createTractionDataOf.bind(this);
        //
        var outRes = {
            "primeid": primeid,
            "txn_membership": null,
            "link_prime": null,
            "link_membership": null,
            "year": jMship.year,
            "flow_step": flowStep,
            "err": null,
            "msg": null
        };
        //
        // Insert membership link first. If it fails then the link is present and abort payment transactions.
        var tableAssoc = config.linkTables['affiliation'];
        var sqlStmt = "INSERT INTO " + tableAssoc + " (entity1_id, entity1, entity2_id, entity2, name, year, renewal_date) " +
            `VALUES (${primeid}, 'person', ${banc_entity_id}, '${org_entity}', '${jMship.name}', ${jMship.year}, '${jMship.form_date}')` +
            " ON CONFLICT (entity1_id, entity2_id, name, year, entity1, entity2) DO NOTHING RETURNING *;";
        console.log(sqlStmt);
        execute1SqlsWithCommit(setDbCallData("Processs Membership", sqlStmt, null, null, null, true), orchMShipCB);
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
            console.log("flow_step: ", flow_step, "sql1: ", sql1_result, "sql2: ", sql2_result);
            // process steps
            if (flow_step == 0) {
                if (sql1_result.rowCount > 0) {
                    outRes.link_membership = sql1_result.rows[0];  //Person to Banc
                    var renewal_date = getUTCTimestamp(null);
                    //var jMship_txn = createTractionDataOf(jMship, null, false);
                    var jMship_txn = jMship;
                    console.log(jMship_txn);
                    // Add a membership transaction and associate person to this txn (Part A.1 and A.2)
                    doTransactionWithPrime(jMship_txn, primeid, null, null, orchMShipCB);
                    // setup flow_step 1
                    flow_step = 1;
                } else {  // Insert failed because the membership already paid before
                    outRes.msg = "Membership payment Transaction aborted - Membership previously paid!"
                    anExtCallback(outRes);
                }
                //console.log(config);

                return;
            } else {
                outRes.txn_membership = sql1_result.rows[0];
                outRes.link_prime = sql2_result.rows[0];
                anExtCallback(outRes);
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
    processEventTransaction(primeid, jTxn, flowStep, anExtCallback) {
        //
        // bind the functions to this
        var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
        var setDbCallData = this.setDbCallData.bind(this);
        var getUTCTimestamp = this.getUTCTimestamp.bind(this);
        var doTransactionWithPrime = this.doTransactionWithPrime.bind(this);
        var createTractionDataOf = this.createTractionDataOf.bind(this);
        //
        var flow_step = 0;
        var config = this.config;
        var event_entity_id = (this.eventInfo[jTxn.year][jTxn.eventname]).id;
        var entity2 = 'event';
        //
        var outRes = {
            "primeid": primeid,
            "txn_event": null,
            "link_prime": null,
            "link_event": null,
            "year": jTxn.year,
            "flow_step": flowStep,
            "err": null,
            "msg": null
        };
        //
        // Insert membership link first. If it fails then the link is present and abort payment transactions.
        var tableAssoc = config.linkTables['association'];
        var sqlStmt = "INSERT INTO " + tableAssoc + " (" +
            "entity1_id, entity1, entity2_id, entity2, " +
            "name, link_type_id, additional_info, " +
            "adult_count, child_count, guest_count) VALUES (" +
            `${primeid}, 'person', ${event_entity_id}, '${entity2}', ` +
            `'${jTxn.name}', ${jTxn.link_type_id}, '${jTxn.info}', ` +
            `${jTxn.adult_count}, ${jTxn.child_count}, ${jTxn.guest_count}) ` +
            " ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO NOTHING RETURNING *;";
        console.log(sqlStmt);
        execute1SqlsWithCommit(setDbCallData("Processs Event", sqlStmt, null, null, null, true), orchEventCB);
        //  Orchestration starts
        function orchEventCB(output) {
            var sql1_result = null;
            var sql2_result = null;
            if (output.err) {
                outRes.err = output.err;
                outRes.msg = "SQL Error occurred!";
            }
            if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
            if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
            //console.log("In orchMShipCB: ",output);
            console.log("flow_step: ", flow_step, "sql1: ", sql1_result, "sql2: ", sql2_result);
            // process steps
            if (flow_step == 0) {
                if (sql1_result.rowCount > 0) {
                    outRes.link_event = sql1_result.rows[0];  //Person to Banc
                    var renewal_date = getUTCTimestamp(null);
                    //var jMship_txn = createTractionDataOf(null, jEvent, false);
                    console.log(jTxn);
                    // Add a membership transaction and associate person to this txn (Part A.1 and A.2)
                    doTransactionWithPrime(jTxn, primeid, null, null, orchEventCB);
                    // setup flow_step 1
                    flow_step = 1;
                } else {  // Insert failed because the membership already paid before
                    outRes.msg = "Event payment Transaction aborted - previously paid!"
                    anExtCallback(outRes);
                }
                //console.log(config);

                return;
            } else {
                outRes.txn_event = sql1_result.rows[0];
                outRes.link_prime = sql2_result.rows[0];
                anExtCallback(outRes);
            }
        }
    }
    //
    processEventTransactionOLD(primeid, jEvent, flowStep, anExtCallback) {
        //
        var flow_step = 0;
        var config = this.config;
        var banc_entity_id = this.banc_entity_id;
        var org_entity = this.org_entity;
        var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
        var setDbCallData = this.setDbCallData.bind(this);
        var outRes = {
            "primeid": primeid,
            "txn_event": [],                //two transaction main and additional
            "link_prime": null,
            "link_event": null,
            "year": jEvent.year,
            "flowStep": flowStep
        };
        var jEvent_txn = this.createTractionDataOf(null, jEvent, false);
        console.log(jEvent_txn);
        // Add a membership transaction and associate person to this txn (Part A.1 and A.2)

        this.doTransactionWithPrime(jEvent_txn, primeid, null, null, orchEShipCB);
        //  Orchestration starts
        function orchEShipCB(output) {
            var sql1_result = null;
            var sql2_result = null;
            if (output.err) {
                outRes.err = output.err;
                outRes.err = "Error";
            }
            if (output.sql1_result) sql1_result = JSON.parse(output.sql1_result);
            if (output.sql2_result) sql2_result = JSON.parse(output.sql2_result);
            //console.log("In orchMShipCB: ",output);
            console.log("flow_step: ", flow_step, "sql1: ", sql1_result, "sql2: ", sql2_result);
            // process steps
            if (flow_step == 0) {
                outRes.txn_membership = sql1_result.rows[0];
                outRes.link_prime = sql2_result.rows[0];
                // setup flow_step 1
                flow_step = 1;
                //console.log(config);
                var tableAssoc = config.linkTables['affiliation'];
                var sqlStmt = "INSERT INTO " + tableAssoc + " (entity1_id, entity1, entity2_id, entity2, name, year, renewal_date) " +
                    `VALUES (${primeid}, 'person', ${banc_entity_id}, '${org_entity}', '${jMship.membership_type}', ${jMship.year}, '${jMship.form_date}')` +
                    " ON CONFLICT (entity1_id, entity2_id, name, year, entity1, entity2) DO NOTHING RETURNING *;";
                console.log(sqlStmt);
                execute1SqlsWithCommit(setDbCallData("Processs Membership", sqlStmt, null, null, null, true), orchMShipCB);
            } else {
                outRes.link_membership = sql1_result.rows[0];
                anExtCallback(outRes);
            }
        }
    }
    /*
    * get Prime Member
    ******** */
    getPrimeMember(firstname, middlename, lastname, email, primeid, aCallback) {
        //
        var outRes = {
            "prime": null,
            "found": false,
            "err": null,
            "err_msg": null
        };
        // Call the actual function
        console.log("getPrimeMember -- ", firstname, lastname);
        this.getPersonWithPrime(firstname, middlename, lastname, email, primeid, 0, aPrimeCallback);
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
    getPersonWithPrime(firstname, middlename, lastname, email, primeid, personid, aCallback) {
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
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = sql1;
            args1 = [personid];
            args2 = [primeid];
            searchSet = 0;
        } else if (primeid <= 0 && personid > 0) {
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
                "where entity1='person' and entity2='person' and entity2_id=$1);";
            args1 = [personid];
            args2 = [personid];
            searchSet = 1;
        } else if (primeid > 0 && personid <= 0) {
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = null;
            args1 = [primeid];
            args2 = null
            searchSet = 2;
        } else {
            sql1 = "SELECT * from banc.person WHERE (firstname='" + firstname + "' and lastname= '" + lastname + "' ";
            sql1 = (middlename.length == 0) ? sql1 + "and middlename='' " : sql1 + "and middlename= '" + middlename + "' ";
            sql1 = (email.length == 0) ? sql1 + "and email='');" : sql1 + "and email= '" + email + "') OR (email='" + email + "');";
            args1 = null;
            sql2 = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
                "where entity1='person' and entity2='person' and entity2_id=$1);";
            args2 = null;
            searchSet = 3;
        }
        //
        var output = {
            "person": null,
            "prime": null,
            "found": false,
            "isPersonPrime": false,
            "err": null,
            "err_msg": null
        };
        // Begin query
        this.pool.connect((err, client, done) => {
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
                    })
                })
            })
        })
    }
    /*
    * 
    */
    processPersonsInfo(primeInfo, spouseInfo, depInfo, address, primecomm, validToken, newPerson) {

        var flow_step = 0;
        // bind the functions to this
        var execute1SqlsWithCommit = this.execute1SqlsWithCommit.bind(this);
        var setDbCallData = this.setDbCallData.bind(this);
        var getUTCTimestamp = this.getUTCTimestamp.bind(this);
        var getPersonSQL = this.getPersonSQL.bind(this);
        var get
        if (newPerson) {
            var primeSql = this.getPersonSQL(primeInfo, 1, 0, 0, key = null);
            
        }
    }
    /*
    * Set a Person - Insert or Update
    */
    //
    setPersonWithPrime(personInfo, personid, primeid, associate = null, aCallback) {
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
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = sql1;
            args1 = [personid];
            args2 = [primeid];
            searchSet = 0;
        } else if (primeid <= 0 && personid > 0) {
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
                "where entity1='person' and entity2='person' and entity2_id=$1);";
            args1 = [personid];
            args2 = [personid];
            searchSet = 1;
        } else if (primeid > 0 && personid <= 0) {
            sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            sql2 = null;
            args1 = [primeid];
            args2 = null
            searchSet = 2;
        } else {
            sql1 = "SELECT * from banc.person WHERE (firstname='" + firstname + "' and lastname= '" + lastname + "' ";
            sql1 = (middlename.length == 0) ? sql1 + "and middlename='' " : sql1 + "and middlename= '" + middlename + "' ";
            sql1 = (email.length == 0) ? sql1 + "and email='');" : sql1 + "and email= '" + email + "') OR (email='" + email + "');";
            args1 = null;
            sql2 = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
                "where entity1='person' and entity2='person' and entity2_id=$1);";
            args2 = null;
            searchSet = 3;
        }
        //
        var output = {
            "person": null,
            "prime": null,
            "found": false,
            "isPersonPrime": false,
            "err": null,
            "err_msg": null
        };
        // Begin query
        this.pool.connect((err, client, done) => {
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
                    })
                })
            })
        })
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
            "name": txn_name,
            "sql1": sql1,
            "args1": value1,
            "sql2": sql2,
            "args2": value2,
            "cond": cond
        };
        return data;
    }
    //
    execute1SqlsWithCommit(data_json, aCallback) {
        console.log("IN execute1SqlsWithCommit:")
        var name = data_json.name;
        var sql1 = data_json.sql1;
        var args1 = data_json.args1;
        var cond = data_json.cond; // true with commit & false no commit

        //console.log(data_json);
        var output = {
            "sql1_result": null,
            "sql2_result": null,
            "err": null,
            "err_msg": null
        };
        this.pool.connect((err, client, done) => {
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
    execute2SqlTxn(data_json, aCallback) {
        var name = data_json.name;
        var sql1 = data_json.sql1;
        var args1 = data_json.args1;
        var sql2 = data_json.sql2;
        var is2assoc = data_json.cond;

        //console.log(data_json);
        var output = {
            "sql1_result": null,
            "sql2_result": null,
            "err": null,
            "err_msg": null
        };
        this.pool.connect((err, client, done) => {
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
                        if (is2assoc) {  // two transactions are associated (second is the link)
                            args2 = [res.rows[0].entity_id];
                        } else { // two transactions are 
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

}
exports.setupDataHelper = setupDataHelper;

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
        var fld_str = fld + '';
        var fld_len = fld_str.length;
        var regex;
        var output = {
            "msg": "Invalid Data!",
            "valid": false
        }
        console.log(fld_str, fld_type, fld_len_limit);
        //console.log(this.regex_json, fld_type);
        if (fld_type in this.regex_json) {
            var ft = this.regex_json[fld_type];
            console.log("ft  ==> ", ft);
            var ft_len_limit = fld_len_limit;
            if (ft.len > fld_len_limit) {
                ft_len_limit = ft.len;
            }
            regex = new RegExp(ft.pattern, 'gm');
        } else {
            output.msg = "Field_type " + fld_type + " not found / unknown!"
            return output;
        }
        var msg = "";
        if (fld_len > ft_len_limit && ft.len > -1) {
            output.msg = "Error: Field length more than limit " + fld_len_limit.toString();
            return output; s
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
        var test = (this.validate(uid, "uid", 0));
        if (!test.valid) return false;
        test = (this.validate(email, "email", 0));
        if (!test.valid) return false;
        test = (this.validate(cell, "number", 0));
        if (!test.valid) return false;
        return true;
    }
    //
    tokeData(uid, email, token) {
        console.log(uid, email, token);
        var test = (this.validate(uid, "uid", 0));
        if (!test.valid) return false;
        test = (this.validate(email, "email", 0));
        if (!test.valid) return false;
        test = (this.validate(token, "md5", 32));
        if (!test.valid) return false;
        return true;
    }
    //
    registrationData(firstname, middlename, lastname, uid, email, cell) {
        console.log(uid, email, cell);
        var test = (this.validate(uid, "uid", 0));
        if (!test.valid) return false;
        test = (this.validate(email, "email", 0));
        if (!test.valid) return false;
        test = (this.validate(cell, "number", 0));
        if (!test.valid) return false;
        test = (this.validate(firstname, "name", 0));
        if (!test.valid) return false;
        if (middlename.length > 0) {
            test = (this.validate(middlename, "name", 0));
            if (!test.valid) return false;
        }
        test = (this.validate(lastname, "name", 0));
        if (!test.valid) return false;
        return true;
    }
    //
    findPersonData(firstname, middlename, lastname, email, year) {

        var test = (this.validate(email, "email", 0));
        if (!test.valid) return false;
        //
        if (year != null) {
            test = (this.validate(year, "number", 0));
            if (!test.valid) return false;
        }
        //
        test = (this.validate(firstname, "name", 0));
        if (!test.valid) return false;
        if (middlename.length > 0) {
            test = (this.validate(middlename, "name", 0));
            if (!test.valid) return false;
        }
        test = (this.validate(lastname, "name", 0));
        if (!test.valid) return false;
        return true;
    }
    //
    personData(person_json) {
        var test = (this.validate(person_json.entity_id, "number", 0));
        if (!test.valid) return false;
        test = (this.validate(person_json.email, "email", 0));
        if (!test.valid) return false;
        test = (this.validate(person_json.firstname, "name", 0));
        if (!test.valid) return false;

        if (middlename.length > 0) {
            test = (this.validate(middlename, "name", 0));
            if (!test.valid) return false;
        }
        test = (this.validate(person_json.lastname, "mane", 0));
        if (!test.valid) return false;
        if (telephone.length > 0) {
            test = (this.validate(middlename, "number", 0));
            if (!test.valid) return false;
        }
        if (mobile.length > 0) {
            test = (this.validate(middlename, "number", 0));
            if (!test.valid) return false;
        }
        return true;
    }
    payRawData(payrd_json, form_id, email) {
        var prime = payrd_json.prime;
        var mship = payrd_json.membership;
        var event = payrd_json.event;
        if (prime == null && (mship == null || event == null)) {
            return false;
        } else {
            if (this.personData(prime) == null) return false;
        }
        return true;
    }
}

exports.DataValidator = DataValidator;