DELIMITER //
CREATE PROCEDURE banc_db.InsertAddressComm(
IN primeId int,
IN str text,
IN adline2 text,
IN cty text,
IN st text,
IN zp text,
IN ctry text,
IN adrname text,
IN adrlnk int,
IN tel text,
IN mtel text,
IN mail text,
IN comname text,
IN comlnk int)
BEGIN
    -- Variable declared
    DECLARE addrId, commId INT DEFAULT 0;
    
    -- insert a new row into the Address
    INSERT INTO banc_db.address (street, address2, city, state, zip, country) 
	VALUES(str,adline2,cty,st,zp,ctry) ON DUPLICATE KEY UPDATE street=str, address2=adline2, city=cty, state=st, zip=zp, country=ctry;
	SET addrId = LAST_INSERT_ID();
    IF addrId > 0 THEN 
		INSERT INTO banc_db.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
		VALUES (primeId, addrId, 'person', 'address', adrname, adrlnk) ON DUPLICATE KEY UPDATE entity1_id=primeId, entity2_id=addrId,
			entity1='person', entity2='address',name=adrname, link_type_id=adrlnk;
	END IF;

    -- insert a new row into the Family communication
    INSERT INTO banc_db.familyCommunication (telephone, mobile, email) 
	VALUES(tel,mtel,mail) ON DUPLICATE KEY UPDATE telephone=tel, mobile=mtel, email=mail;
    SET commId = LAST_INSERT_ID();
	IF commId > 0 THEN 
		INSERT INTO banc_db.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
		VALUES (primeId, addrId, 'person', 'communication', comname, comlnk) ON DUPLICATE KEY UPDATE entity1_id=primeId, entity2_id=commId,
			entity1='person', entity2='communication',name=comname, link_type_id=comlnk;
	END IF;
END //
DELIMITER ;