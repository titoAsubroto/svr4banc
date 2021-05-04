DELIMITER //
CREATE PROCEDURE banc_db.UpdatePerson(
IN id int,
IN fname text,
IN mname text,
IN lname text,
IN mail text,
IN pr bool,
IN dp bool,
IN aId text,
IN tel text,
IN mtel text,
IN isM bool
)
BEGIN
   -- exit if the duplicate key occurs
    DECLARE EXIT HANDLER FOR 1062 SELECT firstname, lastname, entity_id from banc_db.person where firstname=fname and middlename=mname and lastname=lname and email=mail;
    
    -- insert update a row in Person
	UPDATE banc_db.person SET firstname=fname, middlename=mname,lastname=lname, email=mail, prime=pr, dependent=dp, affiliationId=aId,
             telephone=tel, mobile=mtel, isMinor=isM WHERE entity_id=id;
END //
DELIMITER ;
