

DROP TABLE IF EXISTS banc.community_link CASCADE;

CREATE TABLE banc.community_link
(
   link_id       bigserial      NOT NULL,
   entity1_id    bigint         NOT NULL,
   entity2_id    bigint         NOT NULL,
   name          varchar(150)   DEFAULT NULL::character varying,
   affiliation_id bigint        NOT NULL,
   renewal_date  timestamp      NOT NULL,
   year          smallint       NOT NULL,
   entity1       varchar(45)    NOT NULL,
   entity2       varchar(45)    NOT NULL
);

-- Column link_id is associated with sequence banc.community_link_link_id_seq

ALTER TABLE banc.community_link
   ADD CONSTRAINT community_link_pkey
   PRIMARY KEY (link_id);

ALTER TABLE banc.community_link
   ADD CONSTRAINT community_link_entity1_id_entity2_id_name_year_entity1_enti_key UNIQUE (entity1_id, entity2_id, name, year, entity1, entity2);

COMMIT;

INSERT INTO banc.community_link (entity1_id,entity2_id,name,renewal_date,year,entity1,entity2, affiliation_id) 
VALUES
  (35,100,'Family-member','2020-09-16 02:20:31',2020,'person','organization',1010);


commit;
