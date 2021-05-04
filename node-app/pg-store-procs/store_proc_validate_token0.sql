DELIMITER //
CREATE PROCEDURE banc_db.validateToken(
IN userid text,
IN mail text,
IN cell text,
IN inp_token text,
IN iscell int,
OUT auth bool,
OUT primeid int8,
OUT persnid int8
)

BEGIN
    -- Variable declared
	DECLARE pid int8 DEFAULT 0;
    DECLARE rcount int;
    DECLARE prsnid int8 DEFAULT 0;

   
   -- select from authenticate
   IF iscell = 0 THEN
	 SELECT count(*) INTO rcount FROM banc_db.sessiontoken      			
            WHERE uid=userid and email=mail and token=inp_token;

   ELSE 
   	 SELECT count(*) INTO rcount FROM banc_db.sessiontoken      			
            WHERE uid=userid and mobile=cell and otptoken=inp_token;
	 -- SELECT primeId, personid INTO pid, prsnid FROM banc_db.sessiontoken                
			-- WHERE uid=userid and mobile=cell and otptoken=inp_token;
   END IF;
   
   -- true if rcount = 1
  	IF rcount = 1 THEN 
	  SELECT primeid, personid INTO pid, prsnid FROM banc_db.sessiontoken WHERE uid=userid and email=mail and token=inp_token;
      SELECT pid, prsnid;
	  SET primeid=pid;
	  SET auth = True;
	  SET persnid=prsnid;
      
 -- false if rcount is not 1
	ELSE
		SET auth = False;
        SET primeid=-1;
        SET persnid=-1;
	END IF;

END //