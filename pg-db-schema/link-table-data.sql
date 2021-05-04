INSERT INTO banc.entity_link_info VALUES 
(100,'banc.address','address'),
(200,'banc.association_link','association'),
(300,'banc.event','event'),
(400,'banc.familyCommunication','connunication'),
(500,'banc.banc_community','community'),
(600,'banc.transactions','transactions'),
(700,'banc.person','person'),
(800,'banc.organizations','organizations'),
(900,'banc.relationship_link','relationship'),
(1000,'banc.transaction_link','transaction'),
(1100,'banc.community_link','affiliation'),
(1200,'banc.creds','credentials'),
(1300,'banc.sessiontoken', 'stoken');

COMMIT;

INSERT INTO banc.link_type VALUES
(100,'parent','child'),
(200,'spouse','spouse'),
(300,'member','participates-as-member'),
(400,'address','address of'),
(500,'communication','primary_communication'),
(600,'guest','registered-member-guest'),
(700,'non-member','registered-nonmember-adult'),
(710,'non-member-child','registered-nonmember-child');


COMMIT;

INSERT INTO banc.organization VALUES
(100,'NonProfit-503C3','BANCinRDU','Bengali Association of North Carolina','',NULL);

COMMIT;
