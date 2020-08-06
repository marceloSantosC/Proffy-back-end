import Knex from 'knex';
import { raw } from 'express';

export async function up(knex: Knex) {
    return knex.schema.createTable('connections', table => {
        table.increments('id').primary;

        table.integer('user_id')
            .notNullable()
            .references('id')
            .inTable('user')
            .onDelete('CASCADE')
            .onUpdate('CASCADE');

        table.timestamp('created_at')
            .defaultTo(knex.raw('CURRENT_TIMESTAMP'))
            .notNullable();
    });
}

export async function down(knex: Knex){
    return knex.schema.dropTable('class_schedule');
}