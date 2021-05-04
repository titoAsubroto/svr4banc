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



class TransactionProcessor {
    constructor(verbose) {
        this.verbose = (verbose) ? true : false;
    }
    //functions
    processPayData(rawData, primeid2Use, aCallback) {

        console.log("ProcessPayData --->");
        var outRes = {
            "membership": null,
            "events": null,
            "summary": null,
            "msg": null,
            "err": null
        };
        let form_date = rawData.form_date;
        let form_memo = rawData.form_memo;
        let form_ref_id = rawData.form_ref_id;
        var primeid = primeid2Use;
        var processEventTransaction = this.processEventTransaction.bind(this);
        var processMembershipTransaction = this.processMembershipTransaction.bind(this);
        var processSummaryTransaction = this.processSummaryTransaction.bind(this);
        // create function data
        var data = this.sortAndBuildTransactionData(form_ref_id, form_memo, form_date, rawData);
        // var primeid = 35;

        if (data.membership.length > 0) {
            console.log("Membership Data: ", data.membership[0]);
            processMembershipTransaction(primeid, data.membership[0], 0, procPayFnCB);
        } else if (data.event.length > 0) {
            console.log("Event Data: ", data.event);
            processEventTransaction(primeid, data.event, 1, procPayFnCB);
        } else if (data.summary.length > 0) {
            console.log("Summary Transaction Data: ", data.summary);
            processSummaryTransaction(primeid, data.summary[0], 2, procPayFnCB);
        } else {
            outRes.msg = "Something wrong with the rawData sent! Everything is null."
            outRes.err = true;
            aCallback(outRes);
        }
        // callback function
        //
        function procPayFnCB(output) {
            console.log(output);
            if (output.flow_step == 0) {
                outRes.membership = output;

                if (data.event.length > 0) {
                    console.log("Event Data: ", data.event);
                    processEventTransaction(primeid, data.event, 1, testFnCB);
                } else if (data.summary.length > 0) {
                    console.log("Summary Transaction Data: ", data.summary);
                    processSummaryTransaction(primeid, data.summary[0], 2, testFnCB);
                } else {
                    outRes.msg = "Something wrong with the rawData sent! Event or Summary transaction is null. Membership processed"
                    outRes.err = true;
                    aCallback(outRes);
                    return;
                }
            }
            if (output.flow_step == 1) {
                outRes.events = output;
                if (data.summary.length > 0) {
                    console.log("Summary Transaction Data: ", data.summary);
                    processSummaryTransaction(primeid, data.summary[0], 2, testFnCB);
                    //  processCashTransaction(primeid, data.cash, 4, testFnCB);
                } else {
                    outRes.msg = "Something wrong with the rawData sent! Event or Summary transaction is null. Membership processed"
                    outRes.err = true;
                    aCallback(outRes);
                    return;
                }
            }
            if (output.flow_step == 2) {
                outRes.summary = output;
                outRes.msg = "Raw Pay Data processed for form_ref_id=" + rawData.form_ref_id;
                outRes.err = true;
                aCallback(outRes);
                return;
            }
        }
    }
    //
    testFunction(req, Res) {

        console.log("Test Function --->");
        var outRes = {
            "membership": null,
            "events": null,
            "summary": null,
            "paypal": null,
            "cash": null
        };
        let form_date = null;
        let form_memo = this.testdata.form_memo;
        let form_ref_id = this.testdata.form_ref_id;
        var processEventTransaction = this.processEventTransaction.bind(this);
        var processMembershipTransaction = this.processMembershipTransaction.bind(this);
        var processSummaryTransaction = this.processSummaryTransaction.bind(this);
        // create function data
        var data = this.sortAndBuildTransactionData(form_ref_id, form_memo, form_date, this.testdata);

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
            Res.send((outRes));
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
                    Res.send((outRes));
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
                    Res.send((outRes));
                    return
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
                    Res.send((outRes));
                    return
                }
            }
            if (output.flow_step == 3) {
                outRes.paypal = output;
                if (data.cash.length > 0) {
                    console.log("Cash Data: ", data);
                    //  processCashTransaction(primeid, data.cash, 3, testFnCB);
                } else {
                    Res.send((outRes));
                    return
                }
            }
            if (output.flow_step == 4) {
                outRes.cash = output;

                Res.send((outRes));
                return
            }
        }
    }
    //


}
exports.TransactionProcessor = TransactionProcessor;