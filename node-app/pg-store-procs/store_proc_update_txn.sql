DELIMITER //
CREATE PROCEDURE banc_db.UpdateTransaction(
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
IN summary bool,
IN txnId int)
BEGIN
   -- exit if the duplicate key occurs
    DECLARE EXIT HANDLER FOR 1062 SELECT * from banc_db.transaction where amount=amount and transaction_type_id=transaction_type_id and form_ref=form_ref;
    
    -- Update a row into the transaction
    if txnId > 0 then
		UPDATE  banc_db.transaction SET amount=amount, service_fee_paid=service_fee_paid, amount_net=amount_net, form_date_utc=form_date_utc, 
			form_memo=form_memo, form_ref=form_ref, bank_transaction_memo=bank_transaction_memo, bank_transaction_ref=bank_transaction_ref, 
			bank_transaction_date_utc=bank_transaction_date_utc, inbound=inbound, transaction_type_id=transaction_type_id, summary=summary
			WHERE entity_id = txnId;
	end if;

    -- Update the transaction link
    if entity1id > 0 and txnId > 0 then
		UPDATE banc_db.transaction_link SET name=link_name, form_ref=form_ref, txn_form_date=form_date_utc, additional_info=link_add_info
            WHERE entity1_id=entity1id and entity2_id=txnId and entity1=entity1 and entity2='transaction';
	end if;
END //
DELIMITER ;
