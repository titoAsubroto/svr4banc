INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  100,
  'parent',
  'child'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  200,
  'spouse',
  'spouse'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  300,
  'member',
  'participates-as-member'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  400,
  'address',
  'address of'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  500,
  'communication',
  'primary_communication'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  600,
  'guest',
  'registered-member-guest'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  700,
  'non-member',
  'registered-nonmember-adult'
);

INSERT INTO banc.link_type
(
  type_id,
  type_name,
  display_name
)
VALUES
(
  710,
  'non-member-child',
  'registered-nonmember-child'
);


COMMIT;
