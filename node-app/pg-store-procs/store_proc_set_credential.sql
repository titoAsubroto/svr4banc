-- setCredential procedure
CREATE OR REPLACE PROCEDURE banc.setcredential(userid text, pwd text, mail text, prsnid integer, prmid integer, cell text, cond integer)
  LANGUAGE plpgsql
AS
$body$
DECLARE
    -- Variable declared
    pwdMd5 text;
    msg text;
    
BEGIN

  pwdMd5 := MD5(pwd);
   -- cond = 0 --> Insert (Initial Registration)
	IF cond = 0  THEN

		INSERT INTO banc_db.creds (uid, md5Passwd, email, mobile, personid, primeid)
           VALUES (userid, pwdMd5, mail, cell, prsnid, prmid)
           ON CONFLICT (creds_uid_email_mobile_key)
           DO UPDATE
            SET uid=userid, md5Passwd=pwdMd5, email=mail, mobile=cell
			      WHERE primeid=prmid and personid=prsnid ;
          
    msg := 'Registration Successful done!';
    SELECT msg;

   -- cond = -1 --> Delete
	ELSEIF cond = -1 THEN

		DELETE FROM banc_db.creds
			WHERE uid=userid and email=mail and primeid=prmid and personid=prsnid;
		msg := 'Registration Successfully removed!';
    SELECT msg;
   -- cond = 1 --> Update
  ELSEIF cond = 1 THEN
		UPDATE banc_db.creds
            SET uid=userid, md5Passwd=pwdMd5, email=mail, mobile=cell
			WHERE primeid=prmid and personid=prsnid ;
		msg := 'Registration Successfully updated!';
    SELECT msg;
	ELSE
			RAISE NOTICE 'Error: param cond value has to be -1, 0, or 1';
	END IF;

END;
$body$
;

COMMIT;
