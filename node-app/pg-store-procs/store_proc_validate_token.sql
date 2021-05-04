DELIMITER //
CREATE PROCEDURE banc_db.validateToken(
IN userid text,
IN mail text,
IN cell text,
IN inp_token text,
IN iscell int
)

BEGIN
    -- Variable declared
	DECLARE auth bool;
    DECLARE rcount int;
    DECLARE persnid int8 DEFAULT -1;
    DECLARE primid int8 DEFAULT -1;

   
   -- select from authenticate
   IF iscell = 0 THEN
		SELECT count(*) INTO rcount FROM banc_db.sessiontoken      			
            WHERE uid=userid and email=mail and token=inp_token;
		SELECT primeid, personid INTO primid, persnid FROM banc_db.sessiontoken WHERE uid=userid and email=mail and token=inp_token;
   ELSE 
		SELECT count(*) INTO rcount FROM banc_db.sessiontoken      			
            WHERE uid=userid and mobile=cell and otptoken=inp_token;
		SELECT primeid, personid INTO primid, persnid FROM banc_db.sessiontoken                
			WHERE uid=userid and mobile=cell and otptoken=inp_token;
   END IF;
   
   -- true if rcount = 1
  	IF rcount = 1 THEN 
		SET auth = True;
		SELECT auth, primid, persnid;
      
 -- false if rcount is not 1
	ELSE
		SET auth = False;
		SELECT auth, primid, persnid;
	END IF;

END //