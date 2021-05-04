INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  TRUE,
  'Family-member',
  'Family-member|Family/Couple|Already Paid'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  TRUE,
  'Single-member',
  'Single-member|Single-'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  TRUE,
  'Student-member',
  'Student'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  FALSE,
  'Non-member',
  'Non-member|Not A Member|not a member'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  FALSE,
  'Non-member-child',
  'Non-member-child'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  FALSE,
  'Member-guest',
  'Member Guest'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  FALSE,
  'Senior-non-member',
  'Senior-non-member|Senior non-member'
);

INSERT INTO banc.banc_community
(
  ismember,
  affiliation,
  mapping_string
)
VALUES
(
  TRUE,
  'Senior-member',
  'Senior-member|Senior member'
);


COMMIT;
