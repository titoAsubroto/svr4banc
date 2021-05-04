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
const { release } = require('os');
const c = require('config');



class Convert_Json2Json {

    constructor(verbose) {
        this.verbose = (verbose) ? true : false;
    }
    //Test function 
    convertor(jObject, fromType, toType) {

        console.log("Convert_Json2Json - convertor called: ", fromType, toType);
        var outJson;

        switch (fromType) {
            case "/banc/getTransactions":
                outJson = this.convertGetTransactions(jObject, toType);
                break;
            case "/banc/getmemberinfo":
                outJson = this.convertGetMemberInfo(jObject, toType);
                break;
            case "/banc/getEventInfo":
                outJson = this.convertGetEventInfo(jObject, toType);
                break;
            default:
                outJson = jObject;
        }
        console.log(outJson);
        return outJson;
    }
    //
    convertGetEventInfo(jObject, toType) {
        //
        console.log("done")
        if (toType != "arrayFormat") {
            return jObject;
        }

        var year;
        var events = {};
        var years = Object.keys(jObject.events);
        //console.log(years);
        for (const i in years) {
            year = years[i];
            events[year] = [];
           // console.log(jObject.events[year]);
            for (const j in jObject.events[year]) {
                var event = {
                    "id": jObject.events[year][j].id,
                    "showlink": jObject.events[year][j].showlink,
                    "start_date": jObject.events[year][j].start_date,
                    "end_date": jObject.events[year][j].end_date,
                    "event": j
                };
                events[year].push(event);
            }
        }
        jObject.events = events;
        return jObject;
    }
    //
    convertGetTransactions(jObject, toType) {
        var row, i, formref;
        var outJson = {
            "transactions": [],
            "msg": jObject.msg
        };
        var formrefs = {};
        if (toType == "groupBySummary") {

            for (i = 0; i < jObject.transactions.length; i++) {
                row = jObject.transactions[i];
                formref = row.formref;
                if (formref in formrefs) {
                    if (row.summary) {
                        formrefs[formref].summary = row;
                    } else {
                        formrefs[formref].details.push(row);
                    }
                } else {
                    formrefs[formref] = {
                        "summary": null,
                        "details": []
                    };
                    if (row.summary) {
                        formrefs[formref].summary = row;
                    } else {
                        formrefs[formref].details.push(row);
                    }

                }
            }
            for (i in formrefs) {
                outJson.transactions.push(formrefs[i]);
            }
        } else {
            outJson = jObject;
        }
        //
        return outJson;
    }
    //
    convertGetMemberInfo(jObject, toType) {
        var row, i, formref;
        var outJson = {};
        var formrefs = {};
        if (toType == "profile") {

            outJson.primaryMember = {
                "name": jObject.prime.firstname + " " + jObject.prime.middlename + " " + jObject.prime.lastname,
                "address": jObject.address.street + ", " + jObject.address.city + ", " + jObject.address.state + " - " + jObject.address.zip,
                "emailId": jObject.prime.email,
                "phoneNumber": jObject.prime.telephone
            };
            outJson.spouse = {
                "name": jObject.spouse.firstname + " " + jObject.spouse.middlename + " " + jObject.spouse.lastname,
                "emailId": jObject.spouse.email,
                "phoneNumber": jObject.spouse.telephone
            };
            var name = null;
            for (i in jObject.deps) {
                if (name) {
                    name = name + ", " + jObject.deps[i].firstname;
                } else {
                    name = jObject.deps[i].firstname;
                }
            }
            outJson.children = { "names": name };
        } else {
            outJson = jObject;
        }
        //
        return outJson;
    }
}
exports.Convert_Json2Json = Convert_Json2Json;