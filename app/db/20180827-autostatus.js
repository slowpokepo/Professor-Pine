const {PartyStatus} = require('../constants');

exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('User', table => {
      table.integer('status')
        .notNullable()
        .defaultTo(PartyStatus.INTERESTED);
    })
  ])
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('User', table => {
      table.dropColumn('status');
    })
  ])
};
