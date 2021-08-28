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
const nodemailer = require('nodemailer');
var querystring = require("querystring");

class SetupNodeMailer {
    constructor(verbose) {
        this.config = JSON.parse(fs.readFileSync("mailer-config.json", "utf8"));
        this.user = this.config.auth.user;
        var transportSetup = {
            "service" : this.config.service,
            "auth" : {
                "user" : this.user,
                "pass" : this.config.auth.user
            }
        };
        this.transporter = nodemailer.createTransport(transportSetup);

    }
/*
*
*/
    sendMail(toEmail, subject, body) {
        const mailOptions = {
                "from" : this.user,
                "to" : toEmail,
                "subject": subject,
                "text": body
            };

        this.transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
}
exports.SetupNodeMailer = SetupNodeMailer;