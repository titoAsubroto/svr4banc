"use strict";
//
// Updated July 14, 2021
Object.defineProperty(exports, "__esModule", {
  value: true,
});
//
// db is prostgres now
const fs = require("fs");
const crypto = require("crypto");
const appConfig = require("config");
const nodemailer = require("nodemailer");
var querystring = require("querystring");
//
class SetupNodeMailer {
  constructor(verbose) {
    this.config = JSON.parse(fs.readFileSync("mailer-config.json", "utf8"));
    this.user = this.config.auth.user;
    var transportSetup = {
      auth: {
        user: this.user,
        pass: this.config.auth.pass,
      },
      host: this.config.host,
      port: this.config.port
    };
    this.transportInfo = transportSetup;
  }
  /*
   *
   */
  sendMail(toEmail, subject, body) {
    const mailOptions = {
      from: this.user,
      to: toEmail,
      subject: subject,
      html: body,
    };
    //
    console.log("Nodemailer setup:\n");
    console.log(this.transportInfo);
    const transporter = nodemailer.createTransport(this.transportInfo);
    // verify connection configuration
    var verified = true;
    transporter.verify(function (error, success) {
      if (error) {
        console.log("Nodemailer Error:\n" + error);
      } else {
        console.log("banc-online Mail Server is ready to take our messages!");
        //verified = true;
      }
    });
    if (verified) {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    } else {
        console.log("Email could be sent due to server connection!");
    }
  }
}
exports.SetupNodeMailer = SetupNodeMailer;
