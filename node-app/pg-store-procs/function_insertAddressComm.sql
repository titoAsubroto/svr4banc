CREATE OR REPLACE FUNCTION banc.insertaddresscomm(primeid integer, str text, adline2 text, cty text, st text, zp text, ctry text, adrname text, adrlnk integer, tel text, mtel text, mail text, comname text, comlnk integer, OUT addrid bigint, OUT commid bigint)
  RETURNS record
  LANGUAGE plpgsql
AS
$body$
-- Variable declared

    
DECLARE 
   addrId bigint := 0;
   commId bigint := 0;
    
    
BEGIN

  -- Insert address first and Insert an association
    INSERT INTO banc.address (street, address2, city, state, zip, country) 
         VALUES  (str,adline2,cty,st,zp,ctry) ON CONFLICT (street, city, zip) DO
         UPDATE SET street=str, address2=adline2, city=cty, state=st, zip=zp, country=ctry;
	
    SELECT currval('address_entity_id_seq') INTO addrId;
     
    IF addrId > 0 THEN 
       
	   	  INSERT INTO banc.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
	      	  VALUES (primeId, addrId, 'person', 'address', adrname, adrlnk) ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO UPDATE SET
		        entity1_id=primeId, entity2_id=addrId,entity1='person', entity2='address',name=adrname, link_type_id=adrlnk;
	  END IF;

    
    INSERT INTO banc.familyCommunication (telephone, mobile, email) 
	     VALUES(tel,mtel,mail) ON CONFLICT (email, telephone, mobile) DO UPDATE SET telephone=tel, mobile=mtel, email=mail;
	
    SELECT currval('familycommunication_entity_id_seq') INTO commId;
    
	  IF commId > 0 THEN 
		   
       INSERT INTO banc.association_link (entity1_id, entity2_id, entity1, entity2, name, link_type_id) 
		      VALUES (primeId, addrId, 'person', 'communication', comname, comlnk) ON CONFLICT (entity1_id, entity2_id, link_type_id, entity1, entity2) DO UPDATE SET
		      entity1_id=primeId, entity2_id=commId, entity1='person', entity2='communication',name=comname, link_type_id=comlnk;
			
	END IF;


END;
$body$
  VOLATILE
  COST 100;

COMMIT;
