CREATE SEQUENCE address_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE association_link_link_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE banc_community_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE community_link_link_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE creds_id_key_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE event_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE familycommunication_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE library_catalog_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE library_genre_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE organization_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE person_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE sessiontoken_id_key_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE transaction_amount_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE transaction_entity_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE SEQUENCE transaction_link_link_id_seq
       INCREMENT BY 1
       MINVALUE 1
       CACHE 1
       NO CYCLE;

CREATE TABLE IF NOT EXISTS banc.address
(
   entity_id    bigserial      NOT NULL,
   street       varchar(100)   NOT NULL,
   city         varchar(50)    NOT NULL,
   address2     varchar(100)   DEFAULT NULL::character varying,
   state        varchar(50)    NOT NULL,
   zip          varchar(12)    NOT NULL,
   country      varchar(45)    DEFAULT NULL::character varying,
   update_date  timestamp      DEFAULT now()
);

-- Column entity_id is associated with sequence banc.address_entity_id_seq

ALTER TABLE banc.address
   ADD CONSTRAINT address_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.address
   ADD CONSTRAINT address_street_city_zip_key UNIQUE (street, city, zip);



CREATE TABLE IF NOT EXISTS banc.association_link
(
   link_id          bigserial      NOT NULL,
   entity1_id       bigint         NOT NULL,
   entity1          varchar(45)    NOT NULL,
   entity2_id       bigint         NOT NULL,
   entity2          varchar(45)    NOT NULL,
   name             varchar(150)   DEFAULT NULL::character varying,
   update_date      timestamp      DEFAULT now(),
   link_type_id     bigint         NOT NULL,
   additional_info  varchar(150)   DEFAULT NULL::character varying,
   adult_count      integer,
   guest_count      integer,
   child_count      integer
);

-- Column link_id is associated with sequence banc.association_link_link_id_seq

ALTER TABLE banc.association_link
   ADD CONSTRAINT association_link_pkey
   PRIMARY KEY (link_id);

ALTER TABLE banc.association_link
   ADD CONSTRAINT association_link_entity1_id_entity2_id_link_type_id_entity1_key UNIQUE (entity1_id, entity2_id, link_type_id, entity1, entity2);



CREATE TABLE IF NOT EXISTS banc.banc_community
(
   entity_id       bigserial      NOT NULL,
   ismember        boolean        NOT NULL,
   affiliation     varchar(45)    NOT NULL,
   mapping_string  varchar(200)   NOT NULL
);

-- Column entity_id is associated with sequence banc.banc_community_entity_id_seq

ALTER TABLE banc.banc_community
   ADD CONSTRAINT banc_communitry_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.banc_community
   ADD CONSTRAINT ismember_affiliation_unique_key UNIQUE (ismember, affiliation);



CREATE TABLE IF NOT EXISTS banc.community_link
(
   link_id         bigserial      NOT NULL,
   entity1_id      bigint         NOT NULL,
   entity2_id      bigint         NOT NULL,
   name            varchar(150)   DEFAULT NULL::character varying,
   affiliation_id  bigint         NOT NULL,
   renewal_date    timestamp      NOT NULL,
   year            smallint       NOT NULL,
   entity1         varchar(45)    NOT NULL,
   entity2         varchar(45)    NOT NULL
);

-- Column link_id is associated with sequence banc.community_link_link_id_seq

ALTER TABLE banc.community_link
   ADD CONSTRAINT community_link_pkey
   PRIMARY KEY (link_id);

ALTER TABLE banc.community_link
   ADD CONSTRAINT community_link_entity1_id_entity2_id_name_year_entity1_enti_key UNIQUE (entity1_id, entity2_id, name, year, entity1, entity2);



CREATE TABLE IF NOT EXISTS banc.creds
(
   id_key       bigserial     NOT NULL,
   uid          varchar(45)   NOT NULL,
   md5passwd    varchar(45)   NOT NULL,
   update_date  timestamp     DEFAULT now() NOT NULL,
   email        varchar(60)   NOT NULL,
   primeid      bigint        NOT NULL,
   personid     bigint        NOT NULL,
   mobile       varchar(15)   NOT NULL,
   priv         varchar(10)   DEFAULT 'user'::character varying NOT NULL
);

-- Column id_key is associated with sequence banc.creds_id_key_seq

ALTER TABLE banc.creds
   ADD CONSTRAINT creds_pkey
   PRIMARY KEY (id_key);

ALTER TABLE banc.creds
   ADD CONSTRAINT creds_uid_email_mobile_key UNIQUE (uid, email, mobile);



CREATE TABLE IF NOT EXISTS banc.entity_link_info
(
   id_key      bigint        NOT NULL,
   table_name  varchar(60)   NOT NULL,
   name        varchar(45)   NOT NULL
);

ALTER TABLE banc.entity_link_info
   ADD CONSTRAINT entity_link_info_pkey
   PRIMARY KEY (id_key);

CREATE TABLE IF NOT EXISTS banc.event
(
   entity_id    bigserial      NOT NULL,
   eventname    varchar(100)   NOT NULL,
   venue        varchar(100),
   event_year   integer        NOT NULL,
   start_date   timestamp      NOT NULL,
   end_date     timestamp,
   update_date  timestamp      DEFAULT now() NOT NULL,
   showlink     integer        NOT NULL
);

-- Column entity_id is associated with sequence banc.event_entity_id_seq

ALTER TABLE banc.event
   ADD CONSTRAINT event_pkey
   PRIMARY KEY (entity_id);

CREATE TABLE IF NOT EXISTS banc.familycommunication
(
   entity_id    bigserial      NOT NULL,
   email        varchar(100)   NOT NULL,
   telephone    varchar(15)    NOT NULL,
   mobile       varchar(15)    NOT NULL,
   update_date  timestamp      DEFAULT now() NOT NULL
);

-- Column entity_id is associated with sequence banc.familycommunication_entity_id_seq

ALTER TABLE banc.familycommunication
   ADD CONSTRAINT familycommunication_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.familycommunication
   ADD CONSTRAINT familycommunication_email_telephone_mobile_key UNIQUE (email, telephone, mobile);



CREATE TABLE IF NOT EXISTS banc.library_catalog
(
   id           bigserial       NOT NULL,
   author       varchar(250)    NOT NULL,
   title        varchar(250)    NOT NULL,
   abstract     varchar(1000)   NOT NULL,
   url          varchar(1000)   NOT NULL,
   genre_id     bigint          NOT NULL,
   dewey        float4,
   private      boolean         DEFAULT true,
   update_date  timestamp       DEFAULT now()
);

-- Column id is associated with sequence banc.library_catalog_id_seq

ALTER TABLE banc.library_catalog
   ADD CONSTRAINT catalog_id_pkey
   PRIMARY KEY (id);

CREATE TABLE IF NOT EXISTS banc.library_genre
(
   id           bigserial       NOT NULL,
   dewey_class  float4          NOT NULL,
   genre        varchar(100)    NOT NULL,
   pub_type     varchar(50)     NOT NULL,
   abstract     varchar(1000)   NOT NULL,
   update_date  timestamp       DEFAULT now()
);

-- Column id is associated with sequence banc.library_genre_id_seq

ALTER TABLE banc.library_genre
   ADD CONSTRAINT genre_id_pkey
   PRIMARY KEY (id);

CREATE TABLE IF NOT EXISTS banc.link_type
(
   type_id       bigint         NOT NULL,
   type_name     varchar(50)    NOT NULL,
   display_name  varchar(100)   NOT NULL
);

ALTER TABLE banc.link_type
   ADD CONSTRAINT link_type_pkey
   PRIMARY KEY (type_id);

CREATE TABLE IF NOT EXISTS banc.organization
(
   entity_id       bigserial      NOT NULL,
   type            varchar(32)    NOT NULL,
   organizationid  varchar(12)    NOT NULL,
   orgname         varchar(100)   NOT NULL,
   owner           varchar(100)   DEFAULT NULL::character varying,
   update_date     timestamp      DEFAULT now()
);

-- Column entity_id is associated with sequence banc.organization_entity_id_seq

ALTER TABLE banc.organization
   ADD CONSTRAINT organization_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.organization
   ADD CONSTRAINT organization_type_organizationid_orgname_key UNIQUE (type, organizationid, orgname);



CREATE TABLE IF NOT EXISTS banc.person
(
   entity_id      bigserial     NOT NULL,
   firstname      varchar(32)   NOT NULL,
   lastname       varchar(64)   NOT NULL,
   middlename     varchar(32)   DEFAULT NULL::character varying,
   email          varchar(60)   DEFAULT NULL::character varying,
   prime          boolean       NOT NULL,
   dependent      boolean       NOT NULL,
   update_date    timestamp     DEFAULT now(),
   affiliationid  varchar(15)   DEFAULT NULL::character varying,
   telephone      varchar(15)   DEFAULT NULL::character varying,
   mobile         varchar(15)   DEFAULT NULL::character varying,
   isminor        boolean
);

-- Column entity_id is associated with sequence banc.person_entity_id_seq

ALTER TABLE banc.person
   ADD CONSTRAINT person_pkey
   PRIMARY KEY (entity_id);

ALTER TABLE banc.person
   ADD CONSTRAINT person_firstname_lastname_email_middlename_key UNIQUE (firstname, lastname, email, middlename);



CREATE TABLE IF NOT EXISTS banc.sessiontoken
(
   id_key      bigserial     NOT NULL,
   uid         varchar(45)   NOT NULL,
   valid_date  timestamp     DEFAULT now() NOT NULL,
   email       varchar(60)   NOT NULL,
   token       varchar(45)   DEFAULT NULL::character varying,
   primeid     bigint,
   personid    bigint,
   mobile      varchar(15)   DEFAULT NULL::character varying,
   authlevel   varchar(15)   DEFAULT 'user'::character varying NOT NULL,
   otptoken    integer
);

-- Column id_key is associated with sequence banc.sessiontoken_id_key_seq

ALTER TABLE banc.sessiontoken
   ADD CONSTRAINT sessiontoken_pkey
   PRIMARY KEY (id_key);

ALTER TABLE banc.sessiontoken
   ADD CONSTRAINT sessiontoken_uid_email_key UNIQUE (uid, email);



CREATE TABLE IF NOT EXISTS banc.transaction
(
   entity_id                  bigserial      NOT NULL,
   amount                     float4         NOT NULL,
   service_fee_paid           float4         NOT NULL,
   amount_net                 float4         NOT NULL,
   update_date                timestamp      DEFAULT now(),
   form_date_utc              timestamp      NOT NULL,
   form_memo                  varchar(150)   DEFAULT NULL::character varying,
   form_ref                   varchar(100)   DEFAULT NULL::character varying,
   bank_transaction_memo      varchar(150)   DEFAULT NULL::character varying,
   bank_transaction_ref       varchar(50)    DEFAULT NULL::character varying,
   bank_transaction_date_utc  timestamp,
   inbound                    boolean        NOT NULL,
   transaction_type_id        bigint         NOT NULL,
   summary                    boolean        NOT NULL,
   status                     varchar(15)    NOT NULL,
   adult_count                integer,
   child_count                integer,
   quantity                   integer
);

-- Column entity_id is associated with sequence banc.transaction_entity_id_seq

ALTER TABLE banc.transaction
   ADD CONSTRAINT transaction_pkey
   PRIMARY KEY (entity_id);

CREATE TABLE IF NOT EXISTS banc.transaction_amount
(
   id           bigserial     NOT NULL,
   entity_id    bigint        NOT NULL,
   txn_type_id  bigint        NOT NULL,
   entity       varchar(25)   DEFAULT 'event'::character varying NOT NULL,
   amount       float4        NOT NULL,
   start_date   date          NOT NULL,
   end_date     date,
   update_date  timestamp     DEFAULT now()
);

-- Column id is associated with sequence banc.transaction_amount_id_seq

ALTER TABLE banc.transaction_amount
   ADD CONSTRAINT txn_amount_pkey
   PRIMARY KEY (id);

CREATE TABLE IF NOT EXISTS banc.transaction_link
(
   link_id          bigserial      NOT NULL,
   entity1_id       bigint         NOT NULL,
   entity2_id       bigint         NOT NULL,
   name             varchar(150)   NOT NULL,
   update_date      timestamp      DEFAULT now(),
   entity1          varchar(45)    NOT NULL,
   entity2          varchar(45)    NOT NULL,
   additional_info  varchar(150)   DEFAULT NULL::character varying,
   form_ref         varchar(100)   DEFAULT NULL::character varying,
   txn_form_date    timestamp      NOT NULL
);

-- Column link_id is associated with sequence banc.transaction_link_link_id_seq

ALTER TABLE banc.transaction_link
   ADD CONSTRAINT transaction_link_pkey
   PRIMARY KEY (link_id);

CREATE TABLE IF NOT EXISTS banc.transaction_type
(
   type_id         bigint         NOT NULL,
   category        varchar(50)    NOT NULL,
   subcategory     varchar(50)    NOT NULL,
   line_item       varchar(50)    NOT NULL,
   mapping_string  varchar(350)   NOT NULL,
   adult_count     integer        DEFAULT 0,
   child_count     integer        DEFAULT 0,
   start_date      timestamp      DEFAULT now(),
   end_date        timestamp
);

ALTER TABLE banc.transaction_type
   ADD CONSTRAINT transaction_type_pkey
   PRIMARY KEY (type_id);

CREATE TABLE IF NOT EXISTS banc.unprocessed_data
(
   form_ref_id                varchar(100)    NOT NULL,
   form_number                varchar(6)      DEFAULT '000'::character varying NOT NULL,
   banc_transaction_data      varchar(8000)   NOT NULL,
   settlement_data            varchar(4000),
   created_date               timestamp       DEFAULT now() NOT NULL,
   command                    varchar(60)     DEFAULT 'CLIENT_LOAD'::character varying NOT NULL,
   paypal_date                timestamp,
   email                      varchar(60)     NOT NULL,
   banc_data_processed        boolean         DEFAULT false NOT NULL,
   settlement_data_processed  boolean         DEFAULT false NOT NULL,
   member_data_processed      boolean         DEFAULT false NOT NULL,
   set_purge_date             timestamp,
   processor_id               varchar(100),
   processed_keys             varchar(1000)
);

ALTER TABLE banc.unprocessed_data
   ADD CONSTRAINT unprocessed_data_pk
   PRIMARY KEY (form_ref_id);

ALTER SEQUENCE banc.address_entity_id_seq OWNED BY address.entity_id;
ALTER SEQUENCE banc.association_link_link_id_seq OWNED BY association_link.link_id;
ALTER SEQUENCE banc.banc_community_entity_id_seq OWNED BY banc_community.entity_id;
ALTER SEQUENCE banc.community_link_link_id_seq OWNED BY community_link.link_id;
ALTER SEQUENCE banc.creds_id_key_seq OWNED BY creds.id_key;
ALTER SEQUENCE banc.event_entity_id_seq OWNED BY event.entity_id;
ALTER SEQUENCE banc.familycommunication_entity_id_seq OWNED BY familycommunication.entity_id;
ALTER SEQUENCE banc.library_catalog_id_seq OWNED BY library_catalog.id;
ALTER SEQUENCE banc.library_genre_id_seq OWNED BY library_genre.id;
ALTER SEQUENCE banc.organization_entity_id_seq OWNED BY organization.entity_id;
ALTER SEQUENCE banc.person_entity_id_seq OWNED BY person.entity_id;
ALTER SEQUENCE banc.sessiontoken_id_key_seq OWNED BY sessiontoken.id_key;
ALTER SEQUENCE banc.transaction_amount_id_seq OWNED BY transaction_amount.id;
ALTER SEQUENCE banc.transaction_entity_id_seq OWNED BY transaction.entity_id;
ALTER SEQUENCE banc.transaction_link_link_id_seq OWNED BY transaction_link.link_id;



COMMIT;
