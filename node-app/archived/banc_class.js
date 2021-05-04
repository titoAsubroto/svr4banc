"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

const fs = require('fs');
const crypto = require('crypto');
const appConfig = require('config');
var querystring = require('querystring');
var mydbSvr = require('mysql');
var mydb = require('mysql');

class setupDataHelper {

    constructor(verbose) {
        const data = fs.readFileSync("bdl-config.json", "utf8");
        this.config = JSON.parse(data);
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
        this.insertId = null
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
    getAssocLinkInfo() {
        return this.assocLinkInfo;
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
    getConnection() {
        var conn = mydbSvr.createConnection({
            host: this.config.host,
            user: this.config.mysql_uid,
            password: this.config.mysql_pwd,
            database: this.config.database
        });
        return conn;
    }
    //
    printData() {
        console.log(this.txnTypeInfo);
        console.log("PrintData:", this.eventInfo);
        return [this.eventInfo, this.txnTypeInfo];
    }
    setLinkInfo() {
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const sqlStmt = "SELECT type_name, type_id, display_name FROM link_type;";
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                var lInfo = {};
                Object.keys(result).forEach(function (key) {
                    var row = result[key];
                    //console.log(row)
                    var id = row.type_id;
                    lInfo[row.type_name] = id;
                    lInfo[id] = row.display_name;
                });
                console.log("eInfo: ", lInfo);
                this.assocLinkInfo = lInfo;
                return mydb.close();
            });
    }
    setEventInfo() {
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const sqlStmt = "SELECT eventname, entity_id, event_year, registration, start_date, end_date FROM event;";
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
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
                    console.log(eName, id, year);
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
                console.log("eInfo: ", eInfo);
                this.eventInfo = eInfo;
                return mydb.close();
            });
    }
    //
    setTransactionTypeInfo() {
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const sqlStmt = "SELECT category, subcategory,  line_item, type_id, mapping_string FROM transaction_type;";
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                var txnTypeInfo = {};
                Object.keys(result).forEach(function (key) {
                    var row = result[key];
                    //console.log(row)
                    var cat = row.category;
                    var scat = row.subcategory;
                    console.log(cat, scat);
                    if ((cat in txnTypeInfo) == false) {
                        txnTypeInfo[cat] = {};
                    };
                    if ((scat in txnTypeInfo[cat]) == false) {
                        txnTypeInfo[cat][scat] = [];
                    };
                    var jSC = {
                        "id": row.type_id,
                        "line_item": row.line_item,
                        "mapping": row.mapping_string
                    };
                    console.log(jSC);
                    txnTypeInfo[cat][scat].push(jSC);
                });
                this.txnTypeInfo = txnTypeInfo;
                console.log("Print in setTxn: ", this.txnTypeInfo);
                return mydb.close();
            });
    }
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        var affInfo = {};
        const sqlStmt = "SELECT affiliation, entity_id, mapping_string FROM banc_community;";
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                Object.keys(result).forEach(function (key) {
                    var row = result[key];
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
                console.log(affInfo);
                return mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                entity2_id = result.insertId;
                let sqlLink = "INSERT INTO " + linktable1 + " (entity1_id, entity2_id, entity1, entity2, name, additional_info, " +
                    "form_ref, txn_form_date) VALUES (" +
                    `${entity1_id},${entity2_id},'${entity1}','${entity2}','${name}','${info}','${form_ref}','${jData.bank_transaction_date}')`;
                return mydb.callQuery(sqlLink, null);
            })
            .then(result => {
                entity2_id = result.insertId;
                mydb.close();
                return;
            })
            .catch(err => {
                // handle the error
            });

    }
    /* *************** */
    //
    sqlAddressComm(jAdr, jFC, prime, adrId = null, fcId = null) {
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
        return sqlStmt;
    }
    /* *************** */
    //
    sqlPerson(jData, prime, dep, isMinor, key = null) {
        let sqlStmt;
        console.log(jData);

        if (key <= 0 || key == null) {
            // sqlStmt = "CALL InsertPerson (" +
            sqlStmt = "INSERT INTO banc_db.person (firstname, middlename, lastname, email, prime, " +
                " dependent, affiliationId, telephone, mobile, isMinor) " +
                `'${jData.firstname}','${jData.middlename}','${jData.lastname}','${jData.email}',${prime},${dep},'${jData.affiliationid}',` +
                `'${jData.telephone}','${jData.mobile}', ${isMinor})` + "ON DUPLICATE KEY UPDATE "
            `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
            `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
            `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
            `firstname='${jData.firstname}' and middlename='${jData.middlename}' and lastname='${jData.lastname}' and email='${jData.email}';`;

        } else {
            sqlStmt = "UPDATE banc_db.person SET " +
                `firstname='${jData.firstname}',middlename='${jData.middlename}',lastname='${jData.lastname}', ` +
                `email='${jData.email}',prime=${prime},dependent=${dep},affiliationId='${jData.affiliationid}',` +
                `telephone='${jData.telephone}',mobile='${jData.mobile}', isMinor=${isMinor}) WHERE ` +
                `entity_id='${key};`;

        }

        console.log(sqlStmt);
        return sqlStmt;
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callStoreProc(sqlStmt, null)
            .then(result => {
                    aCallback(result, null);
                    mydb.close();
                    return;
                },
                err => {
                    aCallback(null, err);
                    mydb.close();
                    return;
                });
    }

    sqlAssocLink(allElements) {
        let sqlStmt;
        if (allElements) {
            sqlStmt = "INSERT INTO " + this.config.linkTables['association'] +
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, [args])
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
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
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                aCallback(result);
                mydb.close();
                return;
            });
    }
    /* *************** */
    getPrimeMember(firstname, middlename, lastname, email, primeid, aCallback) {
        const err = true;
        const entity = "person";
        var emailStr = "";
        const tablePerson = this.config.entityTables[entity];
        const tableAssoc = this.config.linkTables['association'];
        var sqlStmt = "";
        //
        //  If prime id is given ignore firstname, lastname et.
        if (primeid > 0) {
            sqlStmt = "SELECT entity_id, lastName, firstName, middlename, email, prime, dependent, " +
                " telephone, mobile, isMinor, affiliationid FROM " + tablePerson +
                " WHERE entity_id=" + primeid + ";";
        } else {

            if (email.length > 0) {
                emailStr = email.toString();
                sqlStmt = "SELECT entity_id, lastName, firstName, middlename, email, prime, dependent, " +
                    " telephone, mobile, isMinor, affiliationid FROM " + tablePerson +
                    " WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM " + tableAssoc +
                    " WHERE entity2_id IN (Select entity_id FROM " + tablePerson +
                    " WHERE (firstname='" + firstname + "' and lastname='" + lastname + "' and middlename='" + middlename +
                    "' and email='" + emailStr + "') or (firstname='" + firstname + "' and lastname='" + lastname +
                    "' and middlename='" + middlename + "') or (email='" + emailStr +
                    "')) OR entity1_id IN (Select entity_id FROM " + tablePerson +
                    " WHERE (firstname='" + firstname + "' and lastname='" + lastname + "' and middlename='" + middlename +
                    "' and email='" + emailStr + "') or (firstname='" + firstname +
                    "' and lastname='" + lastname + "' and middlename='" + middlename + "') or (email='" + emailStr + "'))); ";
            } else {
                sqlStmt = "SELECT entity_id, lastName, firstName, middlename, email, prime, dependent, " +
                    " telephone, mobile, isMinor, affiliationid FROM " + tablePerson +
                    " WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM " + tableAssoc +
                    " WHERE entity2_id IN (Select entity_id FROM " + tablePerson +
                    " WHERE (firstname='" + firstname + "' and lastname='" + lastname + "' and middlename='" + middlename +
                    "' and email='" + emailStr + "') or (firstname='" + firstname + "' and lastname='" + lastname +
                    "' and middlename='" + middlename + "')) OR entity1_id IN (Select entity_id FROM " + tablePerson +
                    " WHERE (firstname='" + firstname + "' and lastname='" + lastname + "' and middlename='" + middlename +
                    "' and email='" + emailStr + "') or (firstname='" + firstname +
                    "' and lastname='" + lastname + "' and middlename='" + middlename + "') )); ";
            }
        }

        console.log(sqlStmt);
        const mydb = new aSimpleMySQLClient(this.config, this.verbose);
        const aPromise = mydb.callQuery(sqlStmt, null)
            .then(result => {
                this.result = result;
                aCallback(result);
                mydb.close();
                return;
            });
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

/* create simple mysql client */
class aSimpleMySQLClient {

    constructor(config, verbose) {
        this.config = config;
        this.verbose = (verbose) ? true : false;
        this.conn = mydb.createConnection({
            host: this.config.host,
            user: this.config.mysql_uid,
            password: this.config.mysql_pwd,
            database: this.config.database
        });
        // console.log(this.conn);
    }
    callQuery(sql, args) {
        return new Promise((resolve, reject) => {
            this.conn.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }
    callQuery2(sql, args) {
        return new Promise((resolve, reject) => {
            this.conn.query(sql, args, (err, rows) => {
                console.log('---- Query Executed -----');
                console.log(rows);
                console.log(err);
                if (err) {
                    return reject(err);
                }
                if (Array.isArray(rows) && rows.length) {
                    // console.log(rows);
                    resolve(rows[0])
                } else {
                    var results = [];
                    results.push(rows);
                    //console.log(rows);
                    //console.log(results);
                    resolve(results[0]);
                }
            });
        });
    }
    callStoreProc(sql, args) {
        return new Promise((resolve, reject) => {
            this.conn.query(sql, args, (err, rows) => {
                console.log('---- STORE PROC Executed-----');
                console.log(rows);
                console.log(err);
                if (err) {
                    return reject(err);
                }
                if (Array.isArray(rows) && rows.length) {
                    // console.log(rows);
                    resolve(rows[0])
                } else {
                    var results = [];
                    results.push(rows);
                    //console.log(rows);
                    //console.log(results);
                    resolve(results[0]);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.conn.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}
exports.aSimpleMySQLClient = aSimpleMySQLClient;