CREATE OR REPLACE FUNCTION banc.setupcredential(userid text, pwd text, mail text, prsnid bigint, prmid bigint, cell text, cond integer)
  RETURNS text
  LANGUAGE plpgsql
AS
$body$
DECLARE
    -- Variable declared
    pwdmd5 text;
    msg text;
    
BEGIN
  pwdmd5 := MD5(pwd);
  -- RAISE NOTICE 'values: % % % %', userid, pwd, mail, pwdmd5;
   -- cond = 0 --> Insert (Initial Registration)
  
	IF cond = 0  THEN
		INSERT INTO banc.creds (uid, md5passwd, email, mobile, primeid, personid)
           VALUES (userid, pwdmd5, mail, cell, prmid, prsnid);

    --COMMIT;
    msg := 'Registration Successful for userid = '|| userid || '!';
   
   -- cond = -1 --> Delete
	ELSEIF cond = -1 THEN

		DELETE FROM banc.creds
			WHERE uid=userid and email=mail and primeid=prmid and personid=prsnid;
    --COMMIT;
    
		msg := 'Registration Successfully removed for userid = '|| userid || '!';

   -- cond = 1 --> Update
  ELSEIF cond = 1 THEN
		UPDATE banc.creds
            SET uid=userid, md5passwd=pwdmd5, email=mail, mobile=cell
			WHERE primeid=prmid and personid=prsnid ;
		
    --COMMIT;    
		msg := 'Registration Successfully updated for userid = '|| userid || '!';

	ELSE
	    msg := 'Error: param cond value has to be -1, 0, or 1';
			RAISE NOTICE 'Error: param cond value has to be -1, 0, or 1';
		  RETURN msg;
	END IF;
	--COMMIT;
  RETURN msg;

-- EXCEPTION
  EXCEPTION
  WHEN others THEN
  	    msg := 'Error: Your are already registered user with userid (' || userid ||'), email and cell phone.';
		    RAISE INFO 'Error Name:%',SQLERRM;
        RAISE INFO 'Error State:%', SQLSTATE;
		  RETURN msg;

END;
$body$
  VOLATILE
  COST 100;

COMMIT;
