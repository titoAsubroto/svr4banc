CREATE OR REPLACE PROCEDURE banc.authenticate(userid text, pwd text, mail text, cell text)
  LANGUAGE plpgsql
AS
$body$
-- Variable declared
DECLARE 
        pwdmd5  text;
        rcount int;
        auth bool;
        persnid int;
        primid int;
        ctstamp timestamp;
        stoken text;
 
BEGIN
   -- set MD5 value of pwd provided
   pwdmd5 := MD5(pwd);
   
   -- select from authenticate
   SELECT COUNT(*) INTO rcount FROM banc.creds WHERE uid=userid and email=mail and md5Passwd=pwdmd5;
   
   IF rcount = 1 THEN 

		  SELECT personid, primeid INTO persnid, primid FROM banc.creds WHERE uid=userid and email=mail and md5Passwd=pwdmd5;
			
		  ctstamp := CURRENT_TIMESTAMP;
      stoken := MD5(ctstamp);
		  auth := true;
        -- Send output
		  SELECT auth, primid, persnid, stoken;
-- Insert a new sessiontoken for uid  OR
    -- Update the new session token for uid and email, if record is present   Handle if duplicate
		  INSERT INTO banc.sessiontoken (uid, email, primeid, personid, token)
			    VALUES (userid, mail, primid, persnid, stoken)
			    ON CONFLICT (sessiontoken_uid_email_key)
			    DO UPDATE SET primeid=primid, personid=persnid, token=stoken
			        WHERE email=mail and uid=userid;

	ELSE
		 auth := false;
     primid := -1;
     persnid := -1;
  -- Send output
		 SELECT auth, primid, persnid, stoken;
	END IF;

END;
$body$
;

COMMIT;