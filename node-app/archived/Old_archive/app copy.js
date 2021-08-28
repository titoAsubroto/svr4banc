// @ts-check
const fs = require("fs"),
  http = require("http"),
  https = require("https"),
  express = require("express"),
  bodyParser = require("body-parser");

const i2c = require('./i2conClass.js');
const app = express();
const port = process.env.PORT || 3700;
var calledServiceURL = "";
const verbose = true;
const remoteConxn = new i2c.i2ConnectorHelper(verbose);
const resultHelper = new i2c.ResultsHelper();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Extracts the search text from the supplied condition
 * @param {Object[]} conditions - The conditions provided in the search form
 * @param {string} conditionId - The identifier of the condition whose value is the search text
 * @returns {Object} - The search text, or Undefined
 */
function valueFromCondition(conditions, conditionId) {
  const condition = conditions && conditions.find(x => x.id === conditionId);
  return condition && condition.value;
}

/**
 * Determines whether a substring occurs within a supplied string, using a case-insensitive comparison
 * @param {string} source - The string to search for a substring within
 * @param {string} searchValue - The substring to search for within the source string
 */
function caseInsensitiveContains(source, searchValue) {
  return source.toLowerCase().includes(searchValue.toLowerCase());
}

/**
  @typedef SourceId
  @property {string} type - The source type
  @property {string[]} key - The key
  @property {string=} itemTypeId - The item type identifier
 /
/**
  @typedef Person
  @property {string} id - The identifier
  @property {string} forename - The forename
  @property {string} surname - The surname
  @property {string} dob - The date of birth
  @property {string} ssn - The social security number
  @property {string} issuedDateAndTime - The date and time when the social security number was issued
  @property {string[]} friends - The identifiers of friends
 /


/**
 * Determines whether a source identifier is from the i2 Connect gateway
 * @param {SourceId} sourceId - The source identifier
 */
function isI2ConnectSeed(sourceId) {
  return sourceId.type === "OI.DAOD";
}

/**
 * Queries the people data set
 * @param {function(Person)} personFilter - The predicate to filter the data set
 * @returns {Person[]} - The people that pass the filter
 */
function lookupPeople(personFilter) {
  const people = JSON.parse(fs.readFileSync("people.json", "utf8")).people;
  return people.filter(personFilter);
}

/**
 * Marshals a person from the data set into a Person entity
 * @param {Person} person - The person from the data set
 */
function marshalPerson(person) {
  return {
    id: person.id,
    typeId: "ET5",
    properties: {
      PER4: person.forename,
      PER6: person.surname,
      PER9: person.dob,

      // Calculate the rough age from the year of birth
      PER12: new Date().getFullYear() - new Date(person.dob).getFullYear(),

      PER99: person.ssn,

      // Construct the date of issue for the SSN
      PER102: {
        localDateAndTime: person.issuedDateAndTime,
        timeZoneId: "Europe/London",
        isDST: false
      }
    }
  };
}
/**
 * Test function
 * processResportELP
 */
 function processReportELP(lRes) {
   const respOut = remoteConxn.getBody();
   const response = remoteConxn.getResponse();
   console.log("retrieved BODY");
   console.log(respOut);
   console.log(response.statusCode);
   const out = {
     "data": respOut,
     "responseCode": response.statusCode
   }
   lRes.send((JSON.stringify(out)));
 }

/**
 * Generates a response that contains a data set of people
 * @param {*} res - The express response
 * @param {function(Person)} personFilter - The predicate to filter the data set
 */
function acquirePeople(res, personFilter) {
  res.send({
    entities: lookupPeople(personFilter).map(marshalPerson),
    links: []
  });
}

/**
 * Extracts external identifiers from the keys of i2 Connect source identifiers
 * @param {SourceId[]=} sourceIds - The source identifiers to query
 * @returns {Set<string>} - The set of external identifiers from i2 Connect sources
 */
function extractExternalIdsFromI2ConnectSources(sourceIds) {
  // i2 Connect keys have the format [connectorId, itemTypeId, externalId]
  const externalIds = sourceIds ? sourceIds.filter(isI2ConnectSeed).map(s => s.key[2]) : [];

  return new Set(externalIds);
}

/**
 * The security configuration file that sets up HTTP or HTTPS
 */
const securityConfig = JSON.parse(fs.readFileSync("security-config.json", "utf8"));

/**
 * Make the server use HTTPS if the configuration file demands it
 */
let server;
if (securityConfig.https) {
  // Secure connection
  const options = {
    key: fs.readFileSync(securityConfig.keyFileName),
    cert: fs.readFileSync(securityConfig.certificateFileName),
    ca: fs.readFileSync(securityConfig.certificateAuthorityFileName),
    passphrase: securityConfig.keyPassphrase,
    requestCert: true,
    rejectUnauthorized: false
  };

  app.use((req, res, next) => {
    const clientUnauthorized = () => res.status(401).send("Client is not authorized");
    if (!req.client.authorized) {
      return clientUnauthorized();
    }

    const cert = req.socket.getPeerCertificate();

    if (!cert.subject || cert.subject.CN !== securityConfig.gatewayCN) {
      return clientUnauthorized();
    }

    next();
  });

  server = https.createServer(options, app);
} else {
  // Insecure connection
  server = http.createServer(app);
}

/**
 * The "acquire" endpoint for the Example Schema Extension service
 */
app.post("/exampleSchemaExtension/acquire", (req, res) => {
  // Hard-code the data; this example is about the schema and charting scheme fragments
  const tweets = [
    {
      id: "tweet-1",
      user: "user1",
      contents: "My first tweet"
    },
    {
      id: "tweet-2",
      user: "user2",
      contents: "It's hot today"
    }
  ];

  res.send({
    entities: tweets.map(t => {
      return {
        id: t.id,

        // Aligns with the additional entity and property types in schema.xml
        // The server learns about the additions from the "schema" endpoint
        typeId: "TWEET",
        properties: {
          TW1: t.contents,
          TW2: t.user,
          TW3: t.contents.length
        }
      };
    })
  });
});

/**
 * The "validate" endpoint for the Example Search service
 */
app.post("/exampleSearch/validate", (req, res) => {
  // If there were validation issues with the payload and/or the connector,
  // the error message to display to the user would be set here
  const errorMessage = undefined;

  const response = errorMessage ? { errorMessage } : {};
  res.send(JSON.stringify(response));
});

/**
 * The "acquire" endpoint for the Example Search service
 */
app.post("/exampleSearch/acquire", (req, res) => {
  // Pull out the search term using the identifier defined in the client configuration
  const term = valueFromCondition(req.body.payload.conditions, "term");

  acquirePeople(res, person => {
    // Use the search term to filter the data set
    // "term" is a mandatory condition, so it always has a value
    if (term === "*") {
      return true;
    } else {
      return caseInsensitiveContains(person.forename, term) || caseInsensitiveContains(person.surname, term);
    }
  });
});
/*
 * This is a test example for calling an external api
 * You have to define a Callback function inside this function because
 * you have to get access to the req, lRes objects.
 * The Callback function also contains a response object (rRes) from the remote server.
 */

app.get("/lxnx/test1", (req, lRes) => {
  //
  //const term = valueFromCondition(req.body.payload.conditions, "term");
  //const seeds = req.body.payload.seeds;
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const cfile = "./credentials.json";
  const host = "https://httpbin.org";
  const port = null;
  const baseUrl = "";
  console.log(cfile);
  console.log(host);
  remoteConxn.setBaseApiInfo(host, port, baseUrl, null)
  //
  // create the body of the call
  var data = {};
  var params ="";
  // call the api
  const method = 'GET';
  const endpoint = "/get";
  remoteConxn.setBasicAuthorization(cfile);
  // callback
  function userResponseCallback(err,rRes,data) {
    console.log("------- Print ------ callback function!");
    remoteConxn.setResponse(rRes);
    console.log(data);
    processReportELP(lRes);  // The function that process the output of this service call

  }
//
  console.log("calling api")
  remoteConxn.callApiWithCallback(endpoint, method, data, params, userResponseCallback);
  console.log("called api")
});
//
app.get("/lxnx/test2", (req, lRes) => {
  //
  //const term = valueFromCondition(req.body.payload.conditions, "term");
  //const seeds = req.body.payload.seeds;
  //
  console.log("====== Request obj ====");
  calledServiceURL = req.url;
  console.log(calledServiceURL);
  const cfile = "./credentials.json";
  const host = "http://dummy.restapiexample.com";

  const port = null;
  const baseUrl = "/api/v1";
  console.log(cfile);
  console.log(host);
  remoteConxn.setBaseApiInfo(host, port, baseUrl, null)
  //
  // create the body of the call
  var data = {};
  var params = "";
  // call the api
  const method = 'GET';
  const endpoint = "/employee/1";
  http: //dummy.restapiexample.com/api/v1/employee/1
  remoteConxn.setBasicAuthorization(cfile);
  // callback
  function userResponseCallback(err, rRes, data) {
    console.log("------- Print ------ callback function!");
    remoteConxn.setResponse(rRes);
    console.log(data);
    processReportELP(lRes); // The function that process the output of this service call

  }
  //
  console.log("calling api")
  remoteConxn.callApiWithCallback(endpoint, method, data, params, userResponseCallback);
  console.log("called api")
});

/**
 * The "acquire" endpoint for the 'find like this' service (Example Seeded Search 1)
 */
app.post("/exampleSeededSearch1/acquire", (req, res) => {
  // Pull out the option using the identifier defined in the client configuration
  const useYearOfBirth = valueFromCondition(req.body.payload.conditions, "useYearOfBirth");

  // Pull out the seed
  const seeds = req.body.payload.seeds;
  const seed = seeds.entities[0];
  const forename = seed.properties["PER4"];
  const surname = seed.properties["PER6"];
  const dob = seed.properties["PER9"];

  // Potential seeds that came from this source
  const externalIds = extractExternalIdsFromI2ConnectSources(seed.sourceIds);

  acquirePeople(res, person => {
    // Filter out records that are known to be charted, to prevent duplicates
    if (externalIds.has(person.id)) {
      return false;
    }

    // Look for people with the same given name, surname, or year of birth
    // But exclude the seed from the response
    return (
      person.forename.localeCompare(forename) === 0 ||
      person.surname.localeCompare(surname) === 0 ||
      // Date of birth is formatted as 'YYYY-MM-DD'
      (useYearOfBirth && dob && person.dob.substring(0, 4) === dob.substring(0, 4))
    );
  });
});

/**
 * The "acquire" endpoint for the 'expand' service (Example Seeded Search 2)
 */
app.post("/exampleSeededSearch2/acquire", (req, res) => {
  const seedEntities = req.body.payload.seeds.entities;

  const responseEntities = [];
  const responseLinks = [];

  seedEntities.forEach(seed => {
    const externalIds = extractExternalIdsFromI2ConnectSources(seed.sourceIds);

    // Find all people in the data set for this seed
    // If a chart item contains multiple records, a single seed can have multiple source identifiers
    const seedPeople = lookupPeople(person => externalIds.has(person.id));

    seedPeople.forEach(seedPerson => {
      // Look up the friends
      const friendIds = new Set(seedPerson.friends);
      const friends = lookupPeople(friend => friendIds.has(friend.id));

      // Add the friends to the response
      friends.map(marshalPerson).forEach(friend => {
        // Do not add duplicate entities
        if (!responseEntities.some(e => e.id === friend.id)) {
          responseEntities.push(friend);
        }
      });

      // Generate the friendship links
      const friendshipLinks = friends.map(friend => {
        return {
          // Construct a unique identifier for the link, given the two end identifiers in the data set
          id: `${seedPerson.id}-${friend.id}`,

          typeId: "LAS1",

          // In order to connect the links back to the seed record on the chart,
          // the incoming seed identifier must be used as one of the ends
          fromEndId: seed.seedId,
          toEndId: friend.id,

          linkDirection: "NONE",
          properties: {
            LAS4: "Friend"
          }
        };
      });

      // Add the links to the result set
      friendshipLinks.forEach(link => {
        // Do not add duplicate links
        if (!responseLinks.some(e => e.id === link.id)) {
          responseLinks.push(link);
        }
      });
    });
  });

  res.send({
    entities: responseEntities,
    links: responseLinks
  });
});

/**
 * The "acquire" endpoint for the 'edit property values' service (Example Seeded Search 3)
 */
app.post("/exampleSeededSearch3/acquire", (req, res) => {
  const seeds = req.body.payload.seeds;

  // We can assume that all the entities are people, as specified in the config
  const modifiedEntities = seeds.entities.map(seed => {
    return {
      id: seed.seedId,
      properties: {
        // Spread the existing values, as we do not want to remove them
        ...seed.properties,

        // Override or add the middle name property value
        PER5: "Returned middle name"
      }
    };
  });

  // Return the seeds with the new middle name property value
  res.send({ entities: modifiedEntities });
});

/**
 * The "acquire" endpoint for the 'modify links' service (Example Seeded Search 4)
 */
app.post("/exampleSeededSearch4/acquire", (req, res) => {
  const seeds = req.body.payload.seeds;
  const responseLinks = seeds.links.map(link => {
    return {
      id: link.seedId,

      // Update the link direction
      linkDirection: "AGAINST"
    };
  });

  res.send({ links: responseLinks });
});

/**
 * The "config" endpoint for the example connector
 */
app.get("/config", (req, res) => {
  res.download("config.json");
});

/**
 * The "schema" endpoint for the example connector
 */
app.get("/schema", (req, res) => {
  res.download("schema.xml");
});

/**
 * The "chartingSchemes" endpoint for the example connector
 */
app.get("/chartingSchemes", (req, res) => {
  res.download("chartingSchemes.xml");
});

/**
 * Start the server and the example connector
 */
server.listen(port, () => {
  console.log("Example connector listening on port " + port);
});
