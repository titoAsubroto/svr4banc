INSERT INTO banc.transaction_link
(
  entity1_id,
  entity2_id,
  name,
  update_date,
  entity1,
  entity2,
  additional_info,
  form_ref,
  txn_form_date
)
VALUES
(
  35,
  21,
  'Membership/BANC/membership/Family-member',
  2020 -09 -16 T02:20:31.904648,
  'person',
  'transaction',
  'null',
  'abec566896a46768bc',
  2020 -09 -16 T02:20:31
);

INSERT INTO banc.transaction_link
(
  entity1_id,
  entity2_id,
  name,
  update_date,
  entity1,
  entity2,
  additional_info,
  form_ref,
  txn_form_date
)
VALUES
(
  100,
  21,
  'Membership/BANC/membership/Family-member',
  2020 -09 -16 T02:20:31.969900,
  'organization',
  'transaction',
  'Family-member',
  'abec566896a46768bc',
  2020 -09 -16 T02:20:31
);

INSERT INTO banc.transaction_link
(
  entity1_id,
  entity2_id,
  name,
  update_date,
  entity1,
  entity2,
  additional_info,
  form_ref,
  txn_form_date
)
VALUES
(
  35,
  22,
  'Swaraswati Puja/event/subscription/Family-member',
  2020 -09 -16 T02:20:32.047647,
  'person',
  'transaction',
  'null',
  'abec566896a46768bc',
  2020 -09 -16 T02:20:31
);

INSERT INTO banc.transaction_link
(
  entity1_id,
  entity2_id,
  name,
  update_date,
  entity1,
  entity2,
  additional_info,
  form_ref,
  txn_form_date
)
VALUES
(
  2020100,
  22,
  'Swaraswati Puja/event/subscription/Family-member',
  2020 -09 -16 T02:20:32.112154,
  'event',
  'transaction',
  'participates-as-member/Swaraswati Puja',
  'abec566896a46768bc',
  2020 -09 -16 T02:20:31
);

INSERT INTO banc.transaction_link
(
  entity1_id,
  entity2_id,
  name,
  update_date,
  entity1,
  entity2,
  additional_info,
  form_ref,
  txn_form_date
)
VALUES
(
  35,
  23,
  'Txns for: BANC[Membership - 2020] Family-member [Swaraswati Puja - 2020] Family-member ',
  2020 -09 -16 T02:20:32.147146,
  'person',
  'transaction',
  'null',
  'abec566896a46768bc',
  2020 -09 -16 T02:20:31
);


COMMIT;
