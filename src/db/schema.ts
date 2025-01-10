import { pgTable, text, json } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
    id: text().primaryKey(),
    data: json()
});

export const serversTable = pgTable('servers', {
    id: text().primaryKey(),
    data: json(),
})

export const usersTable = pgTable('users', {
    id: text().primaryKey(),
    data: json()
})