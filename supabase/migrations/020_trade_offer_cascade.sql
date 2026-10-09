-- 020 · trades.offer_id must cascade: a trade cannot exist without its offer,
-- and account/fixture cleanup (and purge jobs) delete offers. Caught by
-- 999_test_assertions during cleanup.

alter table trades drop constraint trades_offer_id_fkey;
alter table trades add constraint trades_offer_id_fkey
  foreign key (offer_id) references offers (id) on delete cascade;
