DELIMITER //
CREATE PROCEDURE banc_db.InsertPerson(
fname text,
mname text,
lname text,
mail text,
pr bool,
dp bool,
aId text,
tel text,
mtel text,
isM bool)
BEGIN
   -- exit if the duplicate key occurs
    DECLARE EXIT HANDLER FOR 1062 SELECT firstname, lastname, entity_id from banc_db.person where firstname=fname and middlename=mname and lastname=lname and email=mail;
    
    -- insert a new row into the SupplierProducts
    INSERT INTO banc_db.person (firstname, middlename, lastname, email, prime, dependent, affiliationId, telephone, mobile, isMinor) 
	VALUES(fname,mname,lname,mail,pr,dp,aId,tel,mtel,isM);
    
END //
DELIMITER ;
