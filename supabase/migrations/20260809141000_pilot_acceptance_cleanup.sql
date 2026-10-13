-- Reserved migration number. Disposable acceptance tenants are closed and retained
-- with their append-only audit history; no hard-delete bypass is installed.
select 1;
