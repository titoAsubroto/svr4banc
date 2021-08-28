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
//var useDb = require('pg');

class setupDataHelper {

    constructor(verbose) {
        const data = fs.readFileSync("bdl-config.json", "utf8");
        this.config = JSON.parse(data);
        //const sqlStmt = fs.readFileSync("predef_sql_statements.json", "utf8");
        // this.predef_SQLs = JSON.parse(sqlStmt)
        this.verbose = (verbose) ? true : false;
        this.txnTypeInfo = [];
        this.affiliationType = [];
        this.eventInfo = {};
        this.assocLinkInfo = {};
        this.members = {}
        this.mInfo = {
            "prime": null,
            "spouse": null,
            "deps": []
        };
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
    }
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
    getTransactionType() {
        return this.txnTypeInfo;
    }
    setLastResult(result) {
        this.result = result;
    }
    getDbConfig() {
        return this.db_config;
    }
    getDBPool() {
        var pool = this.pool;
        return pool;
    }
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
                        client.query("COMMIt")
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
        //const useDb = new aSimplePgClient(this.config, this.verbose);
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
        const sqlStmt = "SELECT eventname, entity_id, event_year, registration, start_date, end_date FROM banc.event;";
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
            var registration = row.registration;
            var sd = row.start_date;
            var ed = row.end_date;
            //console.log(eName, id, year);
            if ((year in eInfo) == false) {
                eInfo[year] = {};
                console.log(year);
            }
            eInfo[year][eName] = {
                "id": id,
                "registration": registration,
                "start_date": sd,
                "end_date": ed
            };
        });
        //console.log("Event Info: ", eInfo);
        this.eventInfo = eInfo;
        return;

    }
    //
    isTokenValid(userid, email, token, actionCallback) {
        var sqlStmt = "SELECT primeid, personid FROM banc.sessionToken WHERE uid=$1 and email=$2 and token=$3 ;";
        var args = [userid, email, token];
        var output = {
            "sql1_result": null,
            "token_valid": false,
            "err": null,
            "msg": "Invalid access token or Expired.",
        };
        const validate = new DataValidator(true);
        if (!validate.tokeData(userid, email, token)) {
            output.msg = "Invalid Token parameters";
            actionCallback(output);
            return;
        }
        //
        this.pool.connect((err, client, done) => {
            console.log("------------ Token Validation start---------");
            if (err) {
                console.log("Error in DB Connection 'isTokenValid' -- Connection failed.");
            }
            console.log(sqlStmt, args);
            client.query(sqlStmt, args, (err, res) => {
                done()
                output.sql1_result = res;
                output.err = err;
                if (err) {
                    console.log(err.stack);
                }
                console.log(res.rows);
                console.log("------------ Token Validation done ---------");
                if (res.rowCount > 0) {
                    output.token_valid = "true";
                    output.msg = "Access Token valid.";
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

        const sqlStmt = "SELECT affiliation, entity_id, mapping_string FROM banc.banc_community;";
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
                                "entity_id": row['entity_id']
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
    //
    // inserts or update a transaction
    // if inserts a new transaction links with the entity1_id 
    setTransaction(jData, entity1 = null, entity1_id = null, info = null, key = null) {
        let entity2 = 'transaction';
        let entity2_id = 0;
        let entitytable1 = this.config.entityTables[entity2];
        let linktable1 = this.config.linkTables[entity2];
        let form_ref = jData.form_ref;
        let date = jData.bank_transaction_date;
        let sqlStmt;
        if (key > 0) {
            sqlStmt = "UPDATE " + entitytable1 + " SET amount=" + jData.amount + "," +
                "service_fee_paid=" + jData.service_fee_paid + ", amount_net=" + jData.amount_net + "," +
                "bank_transaction_memo='" + jData.bank_transaction_memo + "', bank_transaction_ref='" +
                jData.bank_transaction_ref + "', bank_transaction_date_utc='" + jData.bank_transaction_date +
                "', form_ref='" + jData.form_ref + "' WHERE entity_id=" + key + ";"
            console.log("updating transaction ...");
        } else {
            var sql_stmnt = "INSERT INTO " + entitytable1 + " (amount, service_fee_paid, amount_net, form_date_utc, form_memo," +
                " form_ref, bank_transaction_memo, bank_transaction_ref, bank_transaction_date_utc, " +
                " inbound, transaction_type_id, summary)  VALUES (";
            var sqlTemp = `${jData.amount}, ${jData.service_fee_paid},${jData.amount_net},'${jData.form_date}','${jData.form_memo}','${jData.form_ref}','${jData.bank_transaction_memo}',
                '${jData.bank_transaction_ref}','${jData.bank_transaction_date}',${jData.inbound}, ${jData.transaction_type_id},${jData.summary})`;
            sqlStmt = sql_stmnt + sqlTemp;
            console.log("inserting transaction ...");
        }
        console.log(sqlStmt)
        const err = true;
        const tableAssoc = this.config.linkTables['association'];
        const tablePerson = this.config.entityTables['person'];
        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                entity2_id = result.insertId;
                let sqlLink = "INSERT INTO " + linktable1 + " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
                    "form_ref, txn_form_date) VALUES (" +
                    `${entity1_id},${entity2_id},'${entity1}','${entity2}','${name}','${info}','${form_ref}','${jData.bank_transaction_date}')`;
                return useDb.callQuery(sqlLink, null);
            })
            .then(result => {
                entity2_id = result.insertId;
                useDb.close();
                return;
            })
            .catch(err => {
                // handle the error
            });

    }
    /* *************** */
    //
    executeAddressCommSQL(aCallback, jAdr, jFC, prime, adrId = null, fcId = null) {
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
        executeSQL(sqlStmt, null, aCallback);
        return;
    }
    /* *************** */
    //
    getPersonSQL(jData, prime, dep, isMinor, key = null) {
        var sqlStmt;
        if (key <= 0 || key == null) {
            // sqlStmt = "CALL InsertPerson (" +
            sqlStmt = "INSERT INTO banc.person (firstname, middlename, lastname, email, prime, " +
                " dependent, affiliationId, telephone, mobile, isMinor) VALUES ( " +
                `'${jData.firstname}','${jData.middlename}','${jData.lastname}','${jData.email}',${prime},${dep},'${jData.affiliationid}',` +
                `'${jData.telephone}','${jData.mobile}', ${isMinor});`;
            /*
                            " ON CONFLICT (firstname, lastname, email, middlename) DO UPDATE SET"
                                `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
                            `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
                            `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
                            `firstname='${jData.firstname}' and middlename='${jData.middlename}' and lastname='${jData.lastname}' and email='${jData.email}';` ; */

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
    getUTCTimestamp() {
        var now = new Date;
        var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
        return utc_timestamp;
    }
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
        var utc_time = this.getUTCTimestamp();
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
        this.executeStoreProc(sqlStmt, aCallback);
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
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    //
    //
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
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    //
    //
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
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
    }
    //
    //
    /**
     * validate session token
     */
    validateSession(uid, email, sessiontoken, aCallback) {
        const cell = "";
        var sqlStmt = "CALL validateToken(" + `'${uid}', '${email}', '${cell}', '${sessiontoken}',0);`;
        console.log(sqlStmt);
        this.executeStoreProc(sqlStmt, aCallback);
    }
    //
    //

    /* *************** */
    ismember(id, year, aCallback) {
        const err = true;
        const tableAssoc = this.config.linkTables['affiliation'];
        var sqlStmt = "";
        if (year !== null) {
            sqlStmt = "select entity1_id, name, year, renewal_date from " +
                tableAssoc + " where entity1_id=" + id + " and year=" + year + ";";
        } else {
            sqlStmt = "select entity1_id, name, year, renewal_date from " +
                tableAssoc + " where entity1_id=" + id + ";";
        }

        console.log(sqlStmt);
        const useDb = new aSimplePgClient(this.config, this.verbose);
        const aPromise = useDb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                useDb.close();
                return;
            });
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
        this.getPersonWithPrime(firstname, middlename, lastname, email, primeid, aPrimeCallback);
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
    getPersonWithPrime(firstname, middlename, lastname, email, primeid, aCallback) {
        var sql1, sql2, args1, args2, person_id, name;
        //
        name = "Get Prime Person";
        var sql1 = "";
        if (primeid == null || primeid <= 0) {
            sql1 = "SELECT * from banc.person WHERE (firstname='" + firstname + "' and lastname= '" + lastname + "' ";
            sql1 = (middlename.length == 0) ? sql1 + "and middlename='' " : sql1 + "and middlename= '" + middlename + "' ";
            sql1 = (email.length == 0) ? sql1 + "and email='');" : sql1 + "and email= '" + email + "') OR (email='" + email + "');";
            var args1 = null;

        } else {
            var sql1 = "SELECT * from banc.person WHERE entity_id=$1;";
            var args1 = [primeid];
        }
        sql2 = "SELECT * FROM banc.person WHERE entity_id=(SELECT entity1_id from banc.association_link " +
            "where entity1='person' and entity2='person' and entity2_id=$1);";
        //
        var output = {
            "person": null,
            "prime": null,
            "found": false,
            "isPersonPrime": false,
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
                //
                // Calling the first sql1 -- It has to be provided all the time
                console.log(sql1, args1);
                client.query(sql1, args1, (err, res) => {
                    console.log("Executed Transaction Sql1 for name: " + name);
                    console.log(err, res);
                    if (shouldAbort(err)) return aCallback(output);
                    if (res) {
                        output.person = JSON.stringify(res);
                    }
                    //  console.log("res: ", res.rows);
                    // console.log("output: ", output);
                    //
                    if (res.rowCount == 0) {
                        return aCallback(output);
                    }
                    var prime = res.rows[0].prime;
                    var person_id = res.rows[0].entity_id;
                    output.found = true;
                    if (prime == 0) {
                        args2 = [person_id];

                        //  if Second sql present
                        client.query(sql2, args2, (err, res) => {
                            console.log("Executed Transaction Sql2 for name: " + name);
                            output.prime = JSON.stringify(res);
                            if (shouldAbort(err)) return aCallback(output);
                            //
                            client.release();
                            //done();
                            return aCallback(output);
                        })
                    } else {
                        output.prime = output.person;
                        output.isPersonPrime = true;
                        return aCallback(output);
                    }
                })
            })
        })
    }

    /*
     * data is a JSON object, params can be null or string, userProcessResponse is a user Callback
     * method can be 'GET' or 'POST'
     */
    callQuery(sql, userCallback) {
        this.dbConnect.connect(function (err) {
            console.error('Could not connect to db: ' + err.stack);
            throw err;
            return;
        });
        /* Begin transaction */
        this.dbConnect.beginTransaction(function (err) {
            if (err) {
                throw err;
            }
            connection.query('INSERT INTO names SET name=?', "sameer", function (err, result) {
                if (err) {
                    connection.rollback(function () {
                        throw err;
                    });
                }

                var log = result.insertId;

                connection.query('INSERT INTO log SET logid=?', log, function (err, result) {
                    if (err) {
                        connection.rollback(function () {
                            throw err;
                        });
                    }
                    connection.commit(function (err) {
                        if (err) {
                            connection.rollback(function () {
                                throw err;
                            });
                        }
                        console.log('Transaction Complete.');
                        connection.end();
                    });
                });
            });
        });
        /* End transaction */
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
        test = (this.validate(middlename, "name", 0));
        if (!test.valid) return false;
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
        return true;
    }
}

exports.DataValidator = DataValidator;