DROP TABLE IF EXISTS banc.transaction_type CASCADE;

CREATE TABLE banc.transaction_type
(
   type_id         bigint         NOT NULL,
   category        varchar(50)    NOT NULL,
   subcategory     varchar(50)    NOT NULL,
   line_item       varchar(50)    NOT NULL,
   mapping_string  varchar(250)   NOT NULL,
   start_date      timestamp      DEFAULT now(),
   end_date        timestamp
);

ALTER TABLE banc.transaction_type
   ADD CONSTRAINT transaction_type_pkey
   PRIMARY KEY (type_id);

COMMIT;

-- -----------------------------------------------------
-- Data for table banc.transaction_type
-- -----------------------------------------------------

INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (1, 'BANC', 'membership', 'Family-member', 'Family-member|Family/Couple|Already Paid');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (2, 'BANC', 'membership', 'Single-member', 'Single-member|Single-');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (3, 'BANC', 'membership', 'Non-member', 'Non-member|Not A Member');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (4, 'BANC', 'special', 'Default', 'Default');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (200, 'event', 'subscription', 'Non-member', 'Non-member');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (201, 'event', 'subscription', 'Family-member', 'SP Dues|Family-member|Member Family/Couple');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (202, 'event', 'subscription', 'Single-member', 'SP Dues|Single-member|Member Single');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (203, 'event', 'subscription', 'Non-member-adult-3-day', '3 Days/Non-member Adult');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (204, 'event', 'subscription', 'Non-member-child-3-day', 'Non-member Child/1 or 3 day');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (205, 'event', 'subscription', 'Non-member-adult-1-day', '1 Day/Non-member Adult');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (206, 'event', 'subscription', 'Non-member-child-1-day', 'Non-member Child/1 or 3 day');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (207, 'event', 'subscription', 'Non-member-adult-ashtami', 'Ashtami Special/Non-member Adult');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (208, 'event', 'subscription', 'Non-member-child-ashtami', 'Ashtami Special/Non-member Child');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (209, 'event', 'subscription', 'Senior-3-day', '3 days/Senior');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (210, 'event', 'subscription', 'Senior-1-day', '1 days/Senior');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (211, 'event', 'subscription', 'Senior-ashtami', 'Ashtami Special/Senior');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (212, 'event', 'subscription', 'Student-3-day', '3 days/Student');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (213, 'event', 'subscription', 'Student-1-day', '1 day/Student');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (214, 'event', 'subscription', 'Student-ashtami', 'Ashtami Special/Student');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (215, 'event', 'subscription', 'Member-guest-3-day', '3 days/Members Guest|3 days/Member Guest');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (216, 'event', 'subscription', 'Member-guest-1-day', '1 days/Members Guest|1 days/Member Guest');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (217, 'event', 'subscription', 'Member-guest-ashtami', 'Ashtami Special/Members Guest|Ashtami Special/Member Guest');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (218, 'event', 'subscription', 'Summary-line', 'Member');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (219, 'event', 'advertisement', 'Vendor', 'Business Greetings');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (220, 'event', 'advertisement', 'Diganta/Affiliates', 'Personal Greetings');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (221, 'event', 'receipt', 'Stall-rental', 'stall|booth|rent from vendor');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (222, 'event', 'receipt', 'Donation-for-food', 'Food donation|donate');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (223, 'event', 'receipt', 'Donation-for-Puja', 'Puja donation|donate');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (224, 'event', 'receipt', 'Misc-donation', 'Donate to BANC');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (225, 'event', 'receipt', 'Misc', 'misc|Misc');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (226, 'event', 'expense', 'Food', 'Food|Catering|Snack');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (227, 'event', 'expense', 'Puja', 'Puja ');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (228, 'event', 'expense', 'Transportation', 'U-haul|Uhaul|Uber|Van rental');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (229, 'event', 'expense', 'Decoration', 'Flowers');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (230, 'event', 'expense', 'Venue-Rental', 'School rental|hall rental|park rental');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (231, 'event', 'expense', 'Cultural-Functions', 'Stage support|');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (232, 'event', 'expense', 'External-Artists', 'Singer|Foreign artist|');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (233, 'event', 'expense', 'Light-Sound-Video Equipment', 'Sound rental|Video rental|Light');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (234, 'event', 'expense', 'Stage-setup', 'Constumes|Stage props');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (235, 'event', 'expense', 'Misc', 'Misc');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (236, 'event', 'special', 'Default', 'Default');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (500, 'Paypal', 'payment', 'Payment-refund', 'Payment Refund');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (501, 'Paypal', 'receipt', 'General-withdrawal', 'General Withdrawal');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (502, 'Paypal', 'receipt', 'Summary-line/Receipt', 'Donation|Website|Paypal');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (503, 'Paypal', 'expense', 'Bill User Payment', 'PreApproved Payment Bill');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (504, 'Paypal', 'payment', 'Subscription Payment', 'Subscription Payment');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (505, 'Paypal', 'receipt', 'Summary-to-Sub-line', 'Shopping');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (506, 'Paypal', 'special', 'Default', 'Default');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (600,'Cash','receipt','General/Summary-Line/Receipt','Donation|Diganta|Advertisement|');
INSERT INTO banc.transaction_type (type_id, category, subcategory, line_item, mapping_string) VALUES (601,'Cash','expense','General expense line','Misc|Expense|Food|Decoration');

COMMIT;
