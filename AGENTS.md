# Database changes

- Every database schema change must include a NEW timestamped Sequelize migration in BE_BTL_Mobile/migrations, committed together with model/API changes.
- Never modify, rename, or delete migrations already shared with the team, or their frozen migration-support snapshots.
- Never use sync({ alter: true }), sync({ force: true }), or manual SQL as the normal schema update workflow.
- Use npm run db:migrate after pulling; npm run db:status lists applied/pending migrations.
- Migrations must not import live application models. Provide explicit up/down behavior, or a clear refusal to roll back when existing data cannot safely be restored.
- Test migrations on a disposable database, including a second run with no pending changes. MySQL DDL may commit partially; consider retry behavior.
- Preserve existing data and never commit .env or credentials.
