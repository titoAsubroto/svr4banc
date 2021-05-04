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
const nodemailer = require("nodemailer");
const banc = require("./banc_class_pg.js");

const { Pool } = require("pg");
const { release } = require("os");
const c = require("config");
const { now } = require("lodash");
const e = require("express");
//var useDb = require('pg');

class EmailHandler {
  constructor(verbose) {
    this.emailConfig = JSON.parse(fs.readFileSync("email_setup.json", "utf8"));
    this.verbose = verbose ? true : false;
    this.banc_org_id = "BANCinRDU";
    this.banc_entity_id = 100;
    this.org_entity = "organization";
    //
    this.validator = new banc.DataValidator(verbose);
    this.dHelper = new banc.SetupDataHelper(verboxe);
    let configData = {
      service: this.emailConfig.service,
      auth: {
        user: this.emailConfig.userId,
        pass: this.emailConfig.pwd,
      },
    };

    this.transporter = nodemailer.createTransport(configData);
  }

  selectMailOptions(email, subject, text) {
    var mailOptions = {
      from: this.emailConfig.userId,
      to: email,
      subject: subject,
      text: text,
    };
    return mailOptions;
  }
  sendMail(mailOptions, text=null) {
    if (text.length > 0) {
      mailOptions.text = text;
    }
    this.transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
}
//
exports.EmailHandler = EmailHandler;
