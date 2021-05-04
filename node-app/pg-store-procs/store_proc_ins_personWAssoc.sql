DELIMITER //
CREATE PROCEDURE banc_db.insertPersonWithAssoc(
fname text,
mname text,
lname text,
mail text,
pr bool,
dp bool,
aId text,
tel text,
mtel text,
isM bool,
primeId int,
assocId int,
linkId int,
linkName text)

BEGIN
    -- Variable declared
    DECLARE lastId INT DEFAULT 0;

   -- exit if the duplicate key occurs
    DECLARE EXIT HANDLER FOR 1062 SELECT firstname, lastname, entity_id from banc_db.person where firstname=fname and middlename=mname and lastname=lname and email=mail;
    
    -- insert a new row into the person table
    INSERT INTO banc_db.person (firstname, middlename, lastname, email, prime, dependent, affiliationId, telephone, mobile, isMinor) 
	VALUES(fname,mname,lname,mail,pr,dp,aId,tel,mtel,isM);
	SET lastId = LAST_INSERT_ID();
    
    -- insert an association link table if primeid is not zero
    IF primeid > 0 THEN 
		INSERT INTO banc_db.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
		VALUES (primeId, lastId, 'person', 'person', linkName, linkId) ON DUPLICATE KEY UPDATE entity1_id=primeId, entity2_id=lastId,
			entity1='person', entity2='person',name=linkName, link_type_id=linkId;
	END IF;
        -- insert an association link table if primeid is not zero
    IF assocId > 0 THEN 
		INSERT INTO banc_db.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
		VALUES (assocId, lastId, 'person', 'person', linkName, linkId) ON DUPLICATE KEY UPDATE entity1_id=assocId, entity2_id=lastId,
			entity1='person', entity2='person',name=linkName, link_type_id=linkId;
	END IF;
    SELECT entity_id INTO lastId from banc_db.person where firstname=fname and middlename=mname and lastname=lname and email=mail;
END //
DELIMITER ;
