-- W8: holdout arm assignment is audited; extend the audit_events kind constraint.
alter table audit_events drop constraint audit_events_kind_check;
alter table audit_events add constraint audit_events_kind_check
  check (kind in ('holdout_assigned','invitation_queued','invitation_sent','invitation_booked','invitation_expired','patient_opted_out','config_changed'));
