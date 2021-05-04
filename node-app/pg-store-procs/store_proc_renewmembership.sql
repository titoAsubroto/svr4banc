DELIMITER //
CREATE PROCEDURE banc_db.renewMembership(
IN primeid int,
IN fname text,
IN mname text,
IN lname text,
IN mail text,
IN banc_aff text,
IN mId int,
IN yr int)
BEGIN
    -- Variable declared
    DECLARE pid,e2id INT DEFAULT 0;
    DECLARE utc_dt DATETIME;
    SET utc_dt = UTC_TIMESTAMP();
   -- get prime id if not provided
	IF primeid <= 0 THEN
		SELECT entity_id INTO @pid FROM banc_db.person 
			WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM banc_db.association_link 
			WHERE entity2_id IN (Select entity_id FROM banc_db.person 
			WHERE (firstname=fname and lastname=lname and middlename=mname and email=mail) or (firstname=fname and lastname=lname and middlename=mname)) 
				OR entity1_id IN (Select entity_id FROM banc_db.person
			WHERE (firstname=fname and lastname=lname and middlename=mname and email=mail) or (firstname=fname and lastname=lname and middlename=mname) ));
	ELSE
		SET pid = primeid;
	END IF;
  -- get  id if not provided
    if mId <= 0 then
		SELECT entity_id INTO @e2id FROM banc_db.banc_community WHERE affiliation=banc_aff;
		IF e2id <= 0 then
			SET e2id = 1010;
		end if;
	else
		SET e2id = mId;
    end if;
	
    -- insert a new row into the community link

	INSERT INTO banc_db.community_link (entity1_id, entity1, entity2_id, entity2, renewal_date, year, name ) 
		VALUES(pid, 'person', e2id, 'banc_community', utc_dt, yr, banc_aff) ON DUPLICATE KEY UPDATE 
		entity1_id=pid, entity1='person', entity2_id=e2id, entity2='banc_community', renewal_date=utc_dt, year=yr, name=banc_aff;
END //