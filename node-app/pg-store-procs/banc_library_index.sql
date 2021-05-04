DROP TABLE IF EXISTS banc.library_catalog CASCADE;
DROP TABLE IF EXISTS banc.library_genre CASCADE;

COMMIT;

CREATE TABLE banc.library_catalog
(
   id                   bigserial     NOT NULL,
   author               varchar(250)  NOT NULL,
   title                varchar(250)  NOT NULL,
   abstract             varchar(1000) NOT NULL,
   url                  varchar(1000) NOT NULL,
   path                 varchar(1000) ,
   filename             varchar(200) ,
   genre_id             bigint        NOT NULL,
   dewey                float4      ,
   language             varchar(50) DEFAULT 'bengali',
   private              boolean DEFAULT true, 
   update_date          timestamp   DEFAULT now()
);
CREATE TABLE banc.library_genre
(
   id                   int     NOT NULL,
   dewey_desc           varchar(250)  NOT NULL,
   dewey_class          float4        NOT NULL,
   genre                varchar(100)  NOT NULL,
   pub_type             varchar(50)   NOT NULL,
   sub_category         varchar(100)  NOT NULL,
   update_date  timestamp   DEFAULT now()
);

-- Column entity_id is associated with sequence banc.transaction_amount_entity_id_seq

ALTER TABLE banc.library_catalog
   ADD CONSTRAINT catalog_id_pkey
   PRIMARY KEY (id);
   
ALTER TABLE banc.library_genre
   ADD CONSTRAINT genre_id_pkey
   PRIMARY KEY (id);

COMMIT;


INSERT INTO banc.library_genre (1000, dewey_class, genre, pub_type, sub_category) 
VALUES
  (1,'BANC','membership','Fami),
  (2,'BANC','membership','Single-member','Single-member|Single-',0,0),
  (3,'BANC','membership','Non-member','Non-member|Not A Member',0,0),
  (4,'BANC','special','Default','Default',0,0),
  (200,'event','subscription','Non-member','Non-member',0,0),
  (201,'event','subscription','Family-member','SP Dues|Family-member|Member Family/Couple',2,0),
  (202,'event','subscription','Single-member','SP Dues|Single-member|Member Single',1,0),
  (203,'event','subscription','Non-member-adult-3-day','3 Days/Non-member Adult|Non-member-adult-3-day',1,0),
  (204,'event','subscription','Non-member-child-3-day','Non-member Child/1 or 3 day|Non-member-child-3-day',0,1),
  (205,'event','subscription','Non-member-adult-1-day','1 Day/Non-member Adult|Non-member-adult-1-day',1,0),
  (206,'event','subscription','Non-member-child-1-day','Non-member Child/1 or 3 day|Non-member-child-1-day',0,1),
  (207,'event','subscription','Non-member-adult-ashtami','Ashtami Special/Non-member Adult|Non-member-adult-ashtami',1,0),
  (208,'event','subscription','Non-member-child-ashtami','Ashtami Special/Non-member Child|Non-member-child-ashtami',1,0),
  (209,'event','subscription','Senior-3-day','3 days/Senior|Senior-3-day',1,0),
  (210,'event','subscription','Senior-1-day','1 days/Senior|Senior-1-day',1,0),
  (211,'event','subscription','Senior-ashtami','Ashtami Special/Senior|Senior-ashtami',1,0),
  (212,'event','subscription','Student-3-day','3 days/Student|Student-3-day',1,0),
  (213,'event','subscription','Student-1-day','1 day/Student|Student-1-day',1,0),
  (214,'event','subscription','Student-ashtami','Ashtami Special/Student|Student-ashtami',0,0),
  (215,'event','subscription','Member-guest-3-day','3 days/Members Guest|3 days/Member Guest|Member-guest-3-day',1,0),
  (216,'event','subscription','Member-guest-1-day','1 days/Members Guest|1 days/Member Guest|Member-guest-1-day',1,0),
  (217,'event','subscription','Member-guest-ashtami','Ashtami Special/Members Guest|Ashtami Special/Member Guest|Member-guest-ashtami',1,0),
  (218,'event','subscription','Summary-line','Member|Summary-line',0,0),
  (219,'event','advertisement','Vendor-Business Greetings','Business Greetings|Vendor-Business Greetings',0,0),
  (220,'event','advertisement','Diganta/Affiliates-Personal Greetings','Personal Greetings|Diganta/Affiliates-Personal Greetings',0,0),
  (221,'event','receipt','Stall-rental','stall|booth|rent from vendor|Stall-rental',0,0),
  (222,'event','receipt','Donation-for-food','Food donation|donate|Donation-for-food',0,0),
  (223,'event','receipt','Donation-for-Puja','Puja donation|donate|Donation-for-Puja',0,0),
  (224,'event','receipt','Misc-donation','Donate to BANC|Misc-donation',0,0),
  (225,'event','receipt','Misc','misc|Misc',0,0),
  (226,'event','expense','Food','Food|Catering|Snack',0,0),
  (227,'event','expense','Puja','Puja ',0,0),
  (228,'event','expense','Transportation','U-haul|Uhaul|Uber|Van rental|Transportation',0,0),
  (229,'event','expense','Decoration','Flowers|Decoration',0,0),
  (230,'event','expense','Venue-Rental','School rental|hall rental|park rental|Venue-Rental',0,0),
  (231,'event','expense','Cultural-Functions','Stage support|Cultural-Functions',0,0),
  (232,'event','expense','External-Artists','Singer|Foreign artist|External-Artists',0,0),
  (233,'event','expense','Light-Sound-Video Equipment','Sound rental|Video rental|Light|Light-Sound-Video Equipment',0,0),
  (234,'event','expense','Stage-setup','Constumes|Stage props|Stage-setup',0,0),
  (235,'event','expense','Misc','Misc',0,0),
  (236,'event','special','Default','Default',0,0),
  (500,'paypal','payment','Payment-refund','Payment Refund|Payment-refund',0,0),
  (501,'paypal','receipt','General-withdrawal','General Withdrawal|General-withdrawal',0,0),
  (502,'paypal','receipt','Summary-transaction','Donation|Website Payment|Paypal|Summary-transaction',0,0),
  (503,'paypal','expense','Bill User Payment','PreApproved Payment Bill|Bill User Payment',0,0),
  (504,'paypal','payment','Subscription Payment','Subscription Payment',0,0),
  (505,'paypal','receipt','Sub-transaction','Shopping Cart Item|Sub-transaction',0,0),
  (506,'paypal','special','Default','Default',0,0),
  (800,'cash','receipt','General/Summary-Line/Receipt','Cash Donation|Check Received|Cheque Received|Diganta|Advertisement|Received|Cash Received|General/Summary-Line/Receipt',0,0),
  (801,'cash','expense','General expense line','Misc|Expense|Food|Decoration|Cash Paid|Check Payment|Payment|General expense line',0,0);




COMMIT;




CREATE SEQUENCE banc.catalog_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE
       OWNED BY library_catalog.id;

COMMIT;
CREATE SEQUENCE banc.genre_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE
       OWNED BY library_genre.id;

COMMIT;
