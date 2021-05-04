DELIMITER //
CREATE PROCEDURE banc_db.InsertTransaction(
IN entity1id int,
IN entity1 text,
IN link_name text,
IN link_add_info text,
IN amount float, 
IN service_fee_paid float, 
IN amount_net float, 
IN  form_date datetime, 
IN  form_memo text, 
IN  form_ref text, 
IN  bank_transaction_memo text, 
IN  bank_transaction_ref text, 
IN  bank_transaction_date datetime, 
IN inbound bool,  
IN transaction_type_id int, 
IN summary bool)
BEGIN
    -- Variable declared
    DECLARE txnId INT DEFAULT 0;
   -- exit if the duplicate key occurs
    DECLARE EXIT HANDLER FOR 1062 SELECT * from banc_db.transaction where amount=amount and transaction_type_id=transaction_type_id and form_ref=form_ref;
    
    -- insert a new row into the transaction
    INSERT INTO banc_db.transaction (amount, service_fee_paid, amount_net, form_date_utc, form_memo,
			form_ref, bank_transaction_memo, bank_transaction_ref, bank_transaction_date_utc, inbound, transaction_type_id, summary)  
            VALUES (amount, service_fee_paid, amount_net, form_date_utc, form_memo,
			form_ref, bank_transaction_memo, bank_transaction_ref, bank_transaction_date_utc, inbound, transaction_type_id, summary);

	SET txnId = LAST_INSERT_ID();
    -- insert a transaction link
    if entity1id > 0 then
		INSERT INTO banc_db.transaction_link (entity1_id, entity2_id, entity1, entity2, name, form_ref, txn_form_date, additional_info) 
			VALUES (entity1id, txnId, entity1, 'transaction', link_name, form_ref, form_date_utc,link_add_info);
	end if;
END //
DELIMITER ;
