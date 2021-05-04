DROP TABLE IF EXISTS banc.transaction_amount CASCADE;

CREATE TABLE banc.transaction_amount
(
   entity_id     bigserial      NOT NULL,
   event_id      bigint         NOT NULL,
   txn_type_id   bigint         NOT NULL,
   amount        float4         NOT NULL,
   start_date    date           NOT NULL,
   end_date      date,
   update_date   timestamp      DEFAULT now()
);

ALTER TABLE banc.transaction_amount
   ADD CONSTRAINT txn_amount_pkey
   PRIMARY KEY (entity_id);

COMMIT;

DROP TABLE IF EXISTS banc.event CASCADE;

CREATE TABLE banc.event (
   entity_id     bigserial      NOT NULL,
   eventname     varchar(100)   NOT NULL,
   venue         varchar(100)   NULL,
   event_year    integer        NOT NULL,
   start_date    timestamp      NOT NULL,
   end_date      timestamp,       
   update_date   timestamp      DEFAULT now() NOT NULL,
   showlink      integer        NOT NULL    
);

ALTER TABLE banc.event
   ADD CONSTRAINT event_pkey
   PRIMARY KEY (entity_id);
 
COMMIT;


INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date, showlink) VALUES (2019100, 'Swaraswati Puja', 'HSNC Temple', 2019, '2019-02-10', '2019-02-10',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2019200, 'Holi', 'Park', 2019, '2019-04-10', '2019-04-10',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2019300, 'Rabindra Nazrul Jayanti', 'School', 2019, '2019-05-15', '2019-05-15',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2019400, 'Picnic', 'Crabtree-Beech Shelter', 2019, '2019-08-24', '2019-08-24',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2019500, 'Indian Independence Celebration', 'HSNC Temple', 2019, '2019-08-17', '2019-08-17',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2019600, 'Durga Puja', 'Chapel Hill High School', 2019, '2019-09-27', '2019-09-29',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020100, 'Swaraswati Puja', 'HSNC Temple', 2020, '2020-02-10', '2020-02-10',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020200, 'Holi', 'Park', 2020, '2020-02-11', '2020-02-11',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020300, 'Rabindra Nazrul Jayanti', 'School', 2020, '2020-02-12', '2020-02-12',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020400, 'Picnic', 'Crabtree-Beech Shelter', 2020, '2020-02-13', '2020-02-13',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020500, 'Indian Independence Celebration', 'HSNC Temple', 2020, '2020-02-14', '2020-02-14',  0);
INSERT INTO banc.event (entity_id, eventname, venue, event_year, start_date, end_date,  showlink) VALUES (2020600, 'Durga Puja', 'Chapel Hill High School', 2020, '2020-10-15', '2020-10-17',  0);

COMMIT;
