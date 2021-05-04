-- -----------------------------------------------------
-- Table banc.banc_community
-- -----------------------------------------------------
DROP TABLE IF EXISTS banc.banc_community;

CREATE TABLE IF NOT EXISTS banc.banc_community (
 entity_id bigserial NOT NULL,
 ismember boolean NOT NULL,
 affiliation varchar(45) NOT NULL,
 mapping_string varchar(150) NOT NULL
 );

 ALTER TABLE banc.banc_community
   ADD CONSTRAINT banc_communitry_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.banc_community
      ADD CONSTRAINT ismember_affiliation_unique_key UNIQUE (ismember, affiliation);

COMMIT;

INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1010, true, 'Family-member', 'Family-member|Family/Couple|Already Paid');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1020, true, 'Single-member', 'Single-member|Single-');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1030, true, 'Student-member', 'Student');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1040, false, 'Non-member', 'Non-member|Not A Member|not a member');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1050, false, 'Non-member-child', 'Non-member-child');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1060, false, 'Member-guest', 'Member Guest');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1070, false, 'Senior-non-member', 'Senior-non-member|Senior non-member');
INSERT INTO banc.banc_community (entity_id, ismember, affiliation, mapping_string) VALUES (1080, true, 'Senior-member', 'Senior-member|Senior member');

COMMIT;
