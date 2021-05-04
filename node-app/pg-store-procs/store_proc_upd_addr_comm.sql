DELIMITER //
CREATE PROCEDURE banc_db.UpdateAddressComm(
IN addrId int,
IN str text,
IN adline2 text,
IN cty text,
IN st text,
IN zp text,
IN ctry text,
IN commId int,
IN tel text,
IN mtel text,
IN mail text)
BEGIN
    -- Variable declared
    
    -- insert a new row into the Address
	IF addrId > 0 THEN 
		UPDATE banc_db.address SET street=str, address2=adline2, city=cty, state=st, zip=zp, country=ctry WHERE entity_id=addrId;
	END IF;

    -- insert a new row into the Family communication
	IF commId > 0 THEN 
		UPDATE banc_db.familyCommunication SET telephone=tel, mobile=mtel, email=mail WHERE entity_id=commId;
	END IF;
END //
DELIMITER ;