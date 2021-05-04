DELIMITER //
CREATE PROCEDURE banc_db.FindPerson(
IN fname text,
IN mname text,
IN lname text,
IN mail text,
IN strict int
)
-- Outputs: persnid, prime, dependent, cell, isMinor, affiliationid, primid
BEGIN
    DECLARE rows_ret int default 0;
    DECLARE persnid, primid int8 DEFAULT -1;
    DECLARE isprime, isdependent, isminor bool;
    DECLARE cell, affilid varchar(15) DEFAULT NULL;
    DECLARE msg text DEFAULT NULL;
--
-- Strict mode means that all four parameters have to be used to find the person
    IF strict = 1 THEN
		SELECT count(*) into rows_ret FROM banc_db.person
			WHERE firstname=fname and lastname=lname and middlename=mname and email=mail;    
    ELSE
		SELECT count(*) into rows_ret FROM banc_db.person
			WHERE firstname=fname and lastname=lname and middlename=mname;
	END IF;

	IF rows_ret = 1 THEN	
    -- This is the person
		SELECT entity_id, prime, dependent, mobile, isMinor, affiliationid 
            INTO persnid, isprime, isdependent, cell, isminor, affilid
			FROM banc_db.person
			WHERE firstname=fname and lastname=lname and middlename=mname;
		if isprime = 0 then
			SELECT entity1_id 
				INTO primid
				FROM banc_db.association_link
				WHERE entity2_id = persnid;
		else
			SET primid=persnid;
		end if;
		-- output
		SELECT persnid, isprime, isdependent, cell, isminor, affilid, primid, msg;
    ELSEIF rows_ret > 1 THEN
    -- too many returns - use the email to resolve name
		SELECT count(*) into rows_ret FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail;
        -- If we get no names then the name and name + email data are incorrect.
        if rows_ret = 1 then
			SELECT entity_id, prime, dependent, mobile, isMinor, affiliationid 
				INTO persnid, isprime, isdependent, cell, isminor, affilid
				FROM banc_db.person
				WHERE firstname=fname and lastname=lname and middlename=mname and email=mail;
			if isprime = 0 then
				SELECT entity1_id 
					INTO primid
					FROM banc_db.association_link
					WHERE entity2_id = persnid;
			else
				SET primid=persnid;
			end if;
        -- Second end if
            -- output
			SET msg = "Person NOT found";
			SELECT persnid, isprime, isdependent, cell, isminor, affilid, primid, msg;
		else
            -- output
			SELECT persnid, isprime, isdependent, cell, isminor, affilid, primid;
        end if;
	ELSE 
       -- person not found
       SET msg = "Person NOT found";
		-- output
		SELECT persnid, isprime, isdependent, cell, isminor, affilid, primid, msg;
   
    -- End of First IF
	END IF;
    
END //
DELIMITER ;
