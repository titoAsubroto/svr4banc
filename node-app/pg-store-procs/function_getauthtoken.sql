CREATE OR REPLACE FUNCTION banc.getauthtoken(userid text, pwd text, mail text, cell text, OUT auth boolean, OUT persnid integer, OUT primid integer, OUT stoken text, OUT recfound integer)
  RETURNS record
  LANGUAGE plpgsql
AS
$body$
-- Variable declared
DECLARE 
        pwdmd5  text;
        -- rcount int := 0;
        ctstamp text;
       -- stoken text;
 
BEGIN
   -- set MD5 value of pwd provided
   pwdmd5 := MD5(pwd);
   
   -- select from authenticate
   SELECT COUNT(*) INTO recfound FROM banc.creds WHERE uid=userid and email=mail and md5Passwd=pwdmd5;

   
   IF recfound = 1 THEN 
   	  auth := true;
		  SELECT personid, primeid INTO persnid, primid FROM banc.creds WHERE uid=userid and email=mail and md5Passwd=pwdmd5;
      
      -- SELECT banc.getrandomstring(32) INTO ctstamp;
      -- stoken := MD5();
      SELECT banc.getrandomstring(35) INTO ctstamp;
      stoken := MD5(ctstamp);

-- Insert a new sessiontoken for uid  OR
    -- Update the new session token for uid and email, if record is present   Handle if duplicate as an exception
		  INSERT INTO banc.sessiontoken (uid, email, primeid, personid, token)
			    VALUES (userid, mail, primid, persnid, stoken) ;

     	-- SELECT auth, primid, persnid, stoken;
	    
	ELSE
		 auth := false;
     primid := -1;
     persnid := -1;
     stoken := '';
     
  -- Send output
     -- SELECT auth, primid, persnid, stoken;
	   
	END IF;
  RETURN;
	
-- EXCEPTION
  EXCEPTION
  WHEN others THEN
      UPDATE banc.sessiontoken SET primeid=primid, personid=persnid, token=stoken
			        WHERE email=mail and uid=userid;
			          
	    -- RETURN ret_record SELECT auth, primid, persnid, stoken INTO ret_record.auth, ret_record.primid, ret_record.persnid, ret_record.stoken;

END;
$body$
  VOLATILE
  COST 100;

COMMIT;