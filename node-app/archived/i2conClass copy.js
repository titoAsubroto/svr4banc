/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2017 All Rights Reserved
 * US Government Users Restricted Rights - Use, duplication, or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

const fs = require('fs');
const crypto = require('crypto');
const appConfig = require('config');
var querystring = require('querystring');
var https = require('https');
var reqCall = require('request')

class i2ConnectorHelper {

    constructor(verbose) {
        this.host = null;
        this.baseUrl = null;
        this.apiKey = null;
        this.port = null;
        this.credentials = null;
        this.basicauth = null;
        this.body = null;
        this.response = null;
        this.headers = {};
        this.verbose = (verbose) ? true : false;
    }

    setBaseApiInfo(host, port, baseUrl, apiKey) {
        this.host = host;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.port = port;
        this.body = null;
        this.response = null;
        this.headers = {};
    }
    setBasicAuthorization(credentialsFilePath) {
        const data = fs.readFileSync(credentialsFilePath, "utf8");
        this.credential = JSON.parse(data);
        if (this.verbose) {
            console.log(this.credential);
        }
        //const username = new Buffer((this.credential).username, 'base64');
        //const password = new Buffer((this.credential).password, 'base64');
        let username = Buffer.from((this.credential).username, 'base64').toString('ascii');
        let password = Buffer.from((this.credential).password, 'base64').toString('ascii');
        this.basicauth = "Basic " + Buffer.from(username + ":" + password).toString("base64");
        if (this.verbose) {
            console.log(this.basicauth);
        }
        if (this.basicauth !== null) {
            this.headers.Authorization = this.basicauth;
        }
    }
    setHeaders(key, value) {
        this.headers[key] = value;
    }

    getBody() {
        if (this.verbose) {
            console.log("get Body called:  sending BODY!");
        }
        if (this.verbose) {
            console.log(this.body);
        }
        return this.body;
    }
    getResponse() {
        if (this.verbose) {
            console.log("get Response called:  sending RESPONSE!");
        }
        return this.response;
    }
    setBody(b) {
        this.body = b;
        if (this.verbose) {
            console.log("set Body called:  sending BODY!");
        }
        if (this.verbose) {
            console.log(this.body);
        }
        return;
    }
    setResponse(r) {
        if (r !== null) {
            this.response = r;
            this.body = JSON.parse(r.body);
            if (this.verbose) {
                console.log("set Response called:  set Body as Json & RESPONSE!");
            }
        }
        return;
    }

    sendRequest(endpoint, method, data, success) {
        var dataStr = JSON.stringify(data);
        var headers = {};
        var options = {};
        var host = "";
        console.log("In sendRequest method!")
        if (method == 'GET') {
            if (data.length > 0) {
                endpoint += '?' + querystring.stringify(data);
            }
        } else if (method == 'POST') {
            headers = {
                'Content-Type': 'application/json',
                'Content-Length': dataStr.length
            };
        }


        const url = this.baseUrl + endpoint;
        if (this.port === null) {
            host = this.host;
        } else {
            host = this.host + ':' + this.port;
        }
        options = {
            host: host,
            path: url,
            method: method,
            headers: headers
        };
        var reqt = https.request(options, function (resp) {
            resp.setEncoding('utf-8');

            var respStr = '';

            resp.on('data', function (data) {
                respStr += data;
            });

            resp.on('end', function () {
                console.log(respStr);
                this.respOut = JSON.parse(respStr);
                success(this.respOut);
            });
        });
        if (this.verbose) {
            console.log("Called external api -->");
        }
        reqt.write(dataStr);
        reqt.end();
    }
    callApiTest(endpoint, method, data, params, callback) {
        const res = {
            "args": {},
            "headers": {
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/json",
                "Host": "httpbin.org",
                "Origin": "https://resttesttest.com",
                "Referer": "https://resttesttest.com/",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:70.0) Gecko/20100101 Firefox/70.0"
            },
            "origin": "136.56.34.134, 136.56.34.134",
            "url": "https://httpbin.org/get"
        };
        this.respOut = res;
    }
    callApiWithCallback(endpoint, method, data, params, userProcessResponse) {
        var dataStr = JSON.stringify(data);
        var headers = {};
        var options = {};
        var host = "";
        if (this.verbose) {
            console.log("Now in i2conClass CallApiWithCallback");
        }
        if (method == 'GET') {
            endpoint += '?' + querystring.stringify(params);
        } else if (method == 'POST') {
            this.setHeaders('Content-Type', 'application/json');
            this.setHeaders('Content-Length', dataStr.length);
            headers = this.headers;
        }
        if (this.port === null) {
            host = this.host;
        } else {
            host = this.host + ':' + this.port;
        }
        const url = host + this.baseUrl + endpoint;
        options = {
            url: url,
            method: method,
            headers: headers,
            data: data
        };
        if (this.verbose) {
            console.log(options);
        }
        /*
         * This a callaback function to retrieved the data; Note the order of the call variables.
         * body = respose.body <-- as a string
         */
        function aCallback(error, response, body) {
            if (this.verbose) {
                console.log("Variables sent in Callback:")
                console.log("error.....");
                console.log(error);
                console.log("response ......");
                console.log(response);
                console.log("body.....");
                console.log(body);
            }
            const jBody = JSON.parse(body);
            if (!error && response.statusCode == 200) {
                console.log(response.statusCode);
            } else {
                console.log('Error and Status Code: ');
                console.log(response.statusCode);
                console.log(error);
            }
            // the user callback
            userProcessResponse(error, response, jBody);
        }
        //
        reqCall(options, aCallback);
    }
}
exports.i2ConnectorHelper = i2ConnectorHelper;

class ResultsHelper {

    constructor() {
        this.result = {
            entities: [],
            links: []
        };
    }

    clearResult() {
        this.result = {
            entities: [],
            links: []
        };
    }
    get entities() {
        return this.result.entities;
    }
    set entities(newEntities) {
        this.result.entities = newEntities;
    }

    get links() {
        return this.result.links;
    }
    set links(newLinks) {
        this.result.links = newLinks;
    }

    setStatus(statusCode, status, statusMessage) {
        this.result.status = status;
        this.result.statusMessage = statusMessage;
        this.statusCode = statusCode;
    }

    setRecommendedChartingScheme(chartingSchemeId) {
        this.result.recommendedChartingSchemeId = chartingSchemeId;
    }

    addEntity(entity) {
        this.result.entities.push(entity);
    }

    addLink(link) {
        this.result.links.push(link);
    }

    createEntity(id, identity, typeId, properties) {
        const entity = {
            id: id,
            typeId: typeId,
            properties: properties
        }
        if (identity) {
            entity.identity = identity;
        }
        this.addEntity(entity);
        return entity;
    }

    createLink(id, end1Id, end2Id, typeId, properties) {
        const link = {
            id: id,
            end1Id: end1Id,
            end2Id: end2Id,
            typeId: typeId,
            properties: properties
        }
        this.addLink(link);
        return link;
    }

    createIdentifierEntity(parentEntityId, identifierValue, identifierType, linkValue, linkType, linkDate, linkTime) {
        this.result.entities.push({
            id: identifierValue,
            identity: identifierValue,
            typeId: 'i2.identifier',
            properties: {
                "i2.value": identifierValue,
                "i2.type": identifierType
            }
        });
        this.result.links.push({
            id: parentEntityId + ':' + identifierValue,
            end1Id: parentEntityId,
            end2Id: identifierValue,
            typeId: 'i2.identifiedBy',
            properties: {
                "i2.value": linkValue,
                "i2.type": linkType,
                "i2.startDate": linkDate,
                "i2.startTime": linkTime
            }
        });
    }

    removeDuplicates() {
        let seen = {};
        this.result.entities = this.result.entities.filter(item => {
            return seen.hasOwnProperty(item.id) ? false : (seen[item.id] = true);
        });
        seen = {};
        this.result.links = this.result.links.filter(item => {
            return seen.hasOwnProperty(item.id) ? false : (seen[item.id] = true);
        });
    }

    getResults() {
        return this.result;
    }

    getStatusCode() {
        return this.statusCode;
    }
    // generate hash value of string
    // get hash token call info
    getHashToken(str) {
        var hsh = 0;
        if (str.length === 0) {
            return hsh;
        }
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hsh = ((hsh << 5) - hsh) + char;
            hsh = hsh & hsh;
        }
        return hsh;
    }
}
exports.ResultsHelper = ResultsHelper;

exports.loadConnectorConfigFromFile = (filePath) => {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
}

exports.setErrorMsg = (msgObject, statusCode, statusMessage) => {
    msgObject.payload = {};
    msgObject.payload.status = "Error";
    msgObject.payload.statusMessage = statusMessage;
    msgObject.statusCode = statusCode;
}