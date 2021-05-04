DELIMITER //
CREATE PROCEDURE banc_db.FindPrimePerson(
fname text,
mname text,
lname text,
mail text
)
BEGIN
    DECLARE rows_ret int default 0;
    DECLARE mail2 varchar(100) default NULL;

   -- exit if the duplicate key occurs
    -- DECLARE EXIT HANDLER FOR 1172 SELECT entity_id, firstname, middlename, lastname, email, prime from banc_db.person where firstname=fname
      -- and middlename=mname and lastname=lname and email=mail;
    
    -- get the prime member
	-- IF firstname=fname and middlename=mname and lastname=lname and email=mail are given & correct then we will get the primary person
    SELECT count(*) into rows_ret FROM banc_db.person
		WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM banc_db.association_link
		WHERE 
        (entity2_id IN (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail)) OR 
        (entity1_id in (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail)));
	
    -- This is primary person
	IF rows_ret = 1 THEN
		SELECT entity_id, firstname, middlename, lastname, email, prime, dependent, telephone, mobile, isMinor, affiliationid FROM banc_db.person
	          WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM banc_db.association_link
	          WHERE 
                  (entity2_id IN (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail)) OR 
			      (entity1_id IN (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail)));
                  
	-- Assuming, email is incorrect but the name is OK.
    ELSE 
		SELECT count(*) into rows_ret FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname;
        -- If we get no names then the name and name + email data are incorrect.
        -- If we get more than one names then we resolving to the correct name & email is not possible through error.
        if rows_ret = 1 then
		    SELECT email into mail2 FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname;
			SELECT entity_id, firstname, middlename, lastname, email, prime, dependent, telephone, mobile, isMinor, affiliationid FROM banc_db.person
	          WHERE prime = 1 and entity_id IN (SELECT entity1_id FROM banc_db.association_link
	          WHERE 
                  (entity2_id IN (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail2)) OR 
			      (entity1_id IN (Select entity_id FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname and email=mail2)));
        else
			SELECT * FROM banc_db.person WHERE firstname=fname and lastname=lname and middlename=mname;
        -- Second end if
        end if;
   
    -- End of First IF
	END IF;
       
    
END //
DELIMITER ;
