INSERT INTO banc.sessiontoken
(
  uid,
  valid_date,
  email,
  token,
  primeid,
  personid,
  mobile,
  authlevel,
  otptoken
)
VALUES
(
  'subroto',
  2021 -01 -22 T20:11:10.882511,
  'subroto@computer.org',
  '5beb44a93a2a857faad470cef8c905cf',
  35,
  35,
  NULL,
  'ec_admin',
  NULL
);


COMMIT;
