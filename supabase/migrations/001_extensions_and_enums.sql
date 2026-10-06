-- 001 · Extensions and enums
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 001 (pulled into Phase 1 because
-- the Clerk webhook needs `profiles`, which depends on these enums).
-- Apply with: npx supabase db push

create extension if not exists pgcrypto;

create type user_role      as enum ('resident', 'moderator', 'admin');
create type account_status as enum ('pending', 'verified', 'suspended', 'deleted');
create type item_status    as enum ('draft', 'available', 'pending', 'exchanged', 'removed', 'expired', 'paused');
create type item_condition as enum ('like_new', 'good', 'fair', 'for_repair');
create type trade_type     as enum ('item_for_item', 'multiple_smaller');
create type offer_status   as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired', 'countered');
create type trade_status   as enum ('meetup_pending', 'meetup_set', 'both_confirmed', 'completed', 'cancelled', 'disputed');
create type report_status  as enum ('open', 'assigned', 'upheld', 'dismissed');
create type report_reason  as enum ('prohibited', 'asking_money', 'scam', 'not_as_described', 'duplicate', 'harassment', 'moved_outside', 'other');
