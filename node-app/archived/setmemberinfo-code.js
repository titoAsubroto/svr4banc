//
app.post("/banc/setmemberinfo", (req, Res) => {
    //
    console.log("====== /setmemberinfo ====");
    calledServiceURL = req.url;
    console.log(calledServiceURL);
    let sqlStmt, dInfo, isminor, name, dep_insert, depId, lastId;
    const token = req.query.token;
    const email_token = req.query.email;
    console.log(req.body);
    const memberInfo = req.body;
    let output = {};
    let primeInfo = memberInfo["prime"];
    let spouseInfo = memberInfo.spouse;
    let depInfo = memberInfo.deps;
    let address = memberInfo.address;
    let primecomm = memberInfo.primecomm;
    //
    var resultSeq = "prime";
    var primeId = 0;
    var row;
    var spouseId = 0;
    var assocData = [];
    var depLen = depInfo.length;
    var depProc = 0;
    const assocTypes = dHelper.getAssocLinkInfo;
    let prime_insert = ((primeInfo.entity_id > 0) ? false : true);
    let spouse_insert = ((spouseInfo.entity_id > 0) ? false : true);
    sqlStmt = dHelper.getPersonSQL(primeInfo, 1, 0, 0, primeInfo.entity_id);
    //
    // dHelper.executeStoreProc(sqlStmt, setMembersCB);
    dHelper.callQuery(sqlStmt, setMembersCB);
    //
    function setMembersCB(result, err) {
      console.log("===== set Member CB ---");
      console.log(result);
      if (Array.isArray(result) && result.length) {
        Object.keys(result).forEach(function (key) {
          row = result[key];
          console.log("Array Row - lastId")
          lastId = row.entity_id;
        });
      } else {
        console.log("Result - lastId")
        lastId = result.insertId;
      }
      console.log(lastId);
      if (resultSeq == "prime") {
        if (prime_insert) {
          primeInfo.entity_id = lastId
          primeId = lastId;
        } else {
          primeId = lastId;
        }
        output["prime"] = primeInfo;
        // Insert or update address and family communication and link
        sqlStmt = dHelper.sqlAddressComm(address, primecomm, primeId, address.entity_id, primecomm.entity_id);
        resultSeq = "addr_comm";
        dHelper.executeStoreProc(sqlStmt, setMembersCB);
        // Next insert or update
      } else if (resultSeq == "addr_comm") {
        if (Object.keys(spouseInfo).length !== 0) {
          resultSeq = "spouse";
          sqlStmt = dHelper.getPersonSQL(spouseInfo, 0, 0, 0, spouseInfo.entity_id);
          dHelper.executeStoreProc(sqlStmt, setMembersCB);
          return;
        } else if (depProc < depLen) {
          resultSeq = "deps";
          dInfo = depInfo[depProc];
          isminor = dInfo.isMinor;
          sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
          depProc = depProc + 1;
          dHelper.executeStoreProc(sqlStmt, setMembersCB);
          return;
        } else {
          resultSeq = "done"
        }
  
        //
      } else if (resultSeq == "spouse") {
  
        if (spouse_insert) {
          spouseInfo.entity_id = lastId;
          spouseId = lastId;
        } else {
          spouseId = lastId;
        }
        output["spouse"] = spouseInfo;
  
        if (prime_insert || spouse_insert) {
          name = assocTypes[assocTypes['spouse']];
          assocData.push([primeId, spouseId, 'person', 'person', name, assocTypes['spouse']]);
        }
  
        if (depProc < depLen) {
          resultSeq = "deps";
          dInfo = depInfo[depProc];
          isminor = dInfo.isMinor;
          dep_insert = ((dInfo.entity_id > 0) ? false : true);
          sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
          depProc = depProc + 1;
          dHelper.executeStoreProc(sqlStmt, setMembersCB);
          return;
        } else {
          if (Array.isArray(assocData) && assocData.length) {
            resultSeq = "links";
            sqlStmt = dHelper.sqlAssocLink(false);
            console.log(assocData);
            dHelper.createAssocLinks(sqlStmt, assocData, setMembersCB);
            return;
          } else {
            resultSeq = "done";
          }
        }
      } else if (resultSeq == "deps") {
  
        if (dep_insert) {
          depInfo[depProc]['entity_id'] = lastId;
          depId = lastId;
        } else {
          depId = lastId;
        }
        name = assocTypes[assocTypes['parent']]
        if (dep_insert || prime_insert) {
          assocData.push([primeId, depId, 'person', 'person', name, assocTypes['parent']]);
        }
        if (spouseId > 0 && (dep_insert || spouse_insert)) {
          assocData.push([spouseId, depId, 'person', 'person', name, assocTypes['parent']]);
        }
  
        if (depProc < depLen) {
          resultSeq = "deps";
          dInfo = depInfo[depProc];
          isminor = dInfo.isMinor;
          dep_insert = ((dInfo.entity_id > 0) ? false : true);
          sqlStmt = dHelper.getPersonSQL(dInfo, 0, 1, isminor, dInfo.entity_id);
          depProc = depProc + 1;
          dHelper.executeStoreProc(sqlStmt, setMembersCB);
          return;
        } else {
          output['deps'] = depInfo;
          if (Array.isArray(assocData) && assocData.length) {
            resultSeq = "links";
            sqlStmt = dHelper.sqlAssocLink(false);
            dHelper.createAssocLinks(sqlStmt, assocData, setMembersCB);
            return;
          } else {
            resultSeq = "done";
          }
        }
      } else if (resultSeq == "links") {
        resultSeq = "done";
      }
      if (resultSeq == "done") {
        sendJsonResponse(Res, output);
      }
      return;
    }
    //
  });
  //