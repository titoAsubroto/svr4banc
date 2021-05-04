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
const querystring = require("querystring");
const banc = require("./banc_class_pg.js");
const EmailHandler = require("./email_formatter.js");

const { release } = require("os");
const c = require("config");
const { now } = require("lodash");
const e = require("express");
//var useDb = require('pg');

class WPFormsHandler {
  constructor(verbose) {
    this.emailConfig = JSON.parse(fs.readFileSync("email_setup.json", "utf8"));
    this.verbose = verbose ? true : false;
    this.banc_org_id = "BANCinRDU";
    this.banc_entity_id = 100;
    this.org_entity = "organization";
    this.activeSchema = "banc";
    //
    this.validator = new banc.DataValidator(verbose);
    this.dHelper = new banc.SetupDataHelper(verbose);
    let configData = {
      service: this.emailConfig.service,
      auth: {
        user: this.emailConfig.userId,
        pass: this.emailConfig.pwd,
      },
    };
  }
//
  storeUnprocData(form_ref_id, command, rdata, email) {
    let schema = this.activeSchema;
    let sql1 =
      "INSERT INTO " + this.activeSchema + ".unprocessed_formdata (form_ref_id, command, formdata, email) " +
      "VALUES ($1, $2, $3, $4) RETURNING form_ref_id, created_date;";

    var mydata = {
      name: "pay api: unprocessed data",
      cond: true,
      sql1: sql1,
      args1: [form_ref_id, command, rdata, email]
    };
    return mydata;
  }
}
//
exports.WPFormsHandler = WPFormsHandler;
