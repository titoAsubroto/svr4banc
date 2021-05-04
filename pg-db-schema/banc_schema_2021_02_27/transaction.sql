INSERT INTO banc.transaction
(
  amount,
  service_fee_paid,
  amount_net,
  update_date,
  form_date_utc,
  form_memo,
  form_ref,
  bank_transaction_memo,
  bank_transaction_ref,
  bank_transaction_date_utc,
  inbound,
  transaction_type_id,
  summary,
  status,
  adult_count,
  child_count,
  quantity
)
VALUES
(
  50.0,
  0.0,
  0.0,
  2020 -09 -16 T02:20:31.904648,
  2020 -09 -16 T02:20:31,
  'Test record/Membership/Family-member/2020',
  'abec566896a46768bc',
  '-',
  '-',
  2020 -09 -16 T02:20:31,
  TRUE,
  1,
  FALSE,
  'pending',
  0,
  0,
  1
);

INSERT INTO banc.transaction
(
  amount,
  service_fee_paid,
  amount_net,
  update_date,
  form_date_utc,
  form_memo,
  form_ref,
  bank_transaction_memo,
  bank_transaction_ref,
  bank_transaction_date_utc,
  inbound,
  transaction_type_id,
  summary,
  status,
  adult_count,
  child_count,
  quantity
)
VALUES
(
  35.0,
  0.0,
  0.0,
  2020 -09 -16 T02:20:32.047647,
  2020 -09 -16 T02:20:31,
  'Test record/Swaraswati Puja/Swaraswati Puja/2020',
  'abec566896a46768bc',
  '-',
  '-',
  2020 -09 -16 T02:20:31,
  TRUE,
  201,
  FALSE,
  'pending',
  2,
  1,
  1
);

INSERT INTO banc.transaction
(
  amount,
  service_fee_paid,
  amount_net,
  update_date,
  form_date_utc,
  form_memo,
  form_ref,
  bank_transaction_memo,
  bank_transaction_ref,
  bank_transaction_date_utc,
  inbound,
  transaction_type_id,
  summary,
  status,
  adult_count,
  child_count,
  quantity
)
VALUES
(
  85.0,
  0.0,
  0.0,
  2020 -09 -16 T02:20:32.147146,
  2020 -09 -16 T02:20:31,
  'Summary - Txns for: BANC[Membership - 2020] Family-member [Swaraswati Puja - 2020] Family-member ',
  'abec566896a46768bc',
  '-',
  '-',
  2020 -09 -16 T02:20:31,
  TRUE,
  502,
  TRUE,
  'pending',
  0,
  0,
  2
);


COMMIT;
