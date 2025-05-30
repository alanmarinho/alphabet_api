const { type } = require('os');

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    username: { type: 'text', notNull: true, unique: true },
    password: { type: 'text', notNull: true },
    email: { type: 'text', notNull: false, default: null },
    email_verified: { type: 'boolean', notNull: true, default: false },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createTable('top_scores', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    match_id: {
      type: 'uuid',
      notNull: true,
    },
    username: { type: 'text', notNull: true },
    duration_ms: { type: 'integer', notNull: true },
    played_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.sql(`
  CREATE OR REPLACE FUNCTION trim_top_scores()
  RETURNS TRIGGER AS $$
  BEGIN
    DELETE FROM top_scores
    WHERE id IN (
      SELECT id FROM top_scores
      ORDER BY duration_ms DESC, played_at ASC
      OFFSET 100
    );
    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
  CREATE TRIGGER limit_top_scores
  AFTER INSERT ON top_scores
  FOR EACH STATEMENT
  EXECUTE FUNCTION trim_top_scores();
  `);

  pgm.addConstraint('users', 'unique_email_not_null', {
    unique: ['email'],
    where: 'email IS NOT NULL',
  });

  pgm.createIndex('top_scores', 'duration_ms');
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('top_scores');
  pgm.dropTable('users');
  pgm.sql(`DROP TRIGGER IF EXISTS limit_top_scores ON top_scores;`);
  pgm.sql(`DROP FUNCTION IF EXISTS trim_top_scores();`);
};
