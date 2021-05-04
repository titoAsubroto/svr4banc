DELIMITER //
CREATE PROCEDURE banc_db.authenticate(
IN userid text,
IN pwd text,
IN mail text,
IN cell text,
OUT auth bool,
OUT prmid int8,
OUT prsnid int8,
OUT stoken text)

BEGIN
    -- Variable declared
    DECLARE pwdMd5 text;
    DECLARE rcount int;
    DECLARE psnid, pmid int8;
    -- DECLARE auth bool;
    DECLARE ctstamp int8;
    DECLARE tokn text;


  -- Handle if duplicate
  DECLARE EXIT HANDLER for 1062
	BEGIN
    -- Update the new session token for uid and email, if record is present 
		UPDATE banc_db.sessiontoken 
			SET primeid=pmid, personid=psnid, token=tokn
			WHERE email=mail and uid=userid;
    END;
    
   -- set MD5 value of pwd provided
   SET pwdMd5 = MD5(pwd);
   
   -- select from authenticate
   SELECT count(*) INTO rcount FROM banc_db.creds      			
            WHERE uid=userid and email=mail and md5Passwd=pwdMd5;
	SELECT concat(rcount);
  	IF rcount = 1 THEN 

		SELECT personid, primeid
            INTO psnid, pmid
			FROM banc_db.creds      			
            WHERE uid=userid and email=mail and md5Passwd=pwdMd5;
		SET ctstamp = CURRENT_TIMESTAMP();
        SET tokn = MD5(ctstamp);
        SET prsnid = psnid;
        SET prmid=pmid;
        SET stoken=tokn;
		SET auth = True;
        SELECT concat(auth,prsnid,prmid,stoken);
        
-- Insert a new sessiontoken for uid 
		INSERT INTO banc_db.sessiontoken (uid, email, primeid, personid, token)
			VALUES(userid, mail, pmid, psnid, tokn);
	ELSE
		SET auth = False;
        SET prmid=-1;
        SET prsnid=-1;
        SET stoken='';
	END IF;

END //