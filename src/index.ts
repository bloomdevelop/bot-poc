import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./db/schema";
import { Client } from "revolt.js";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });
const bot = new Client();

bot.loginBot(process.env.TOKEN as string);

bot.on("ready", () => {
  bot.servers.forEach(async (server) => {
    try {
      (await server.fetchMembers()).members.forEach(async (member) => {
        const existingUser = await db.query.usersTable.findFirst({
          where: (users, { eq }) => eq(users.id, member.user?.id!!),
        });

        if (!existingUser) {
          const newUser: typeof schema.usersTable.$inferInsert = {
            id: member.user?.id!!,
            data: JSON.stringify(
              {
                id: member.user?.id,
                username: member.user?.username,
                displayName: member.user?.displayName
                  ? member.user?.displayName
                  : "",
                discriminator: member.user?.discriminator,
              },
              null,
              2
            ),
          };

          await db.insert(schema.usersTable).values(newUser);
        } else {
          console.warn(
            `User "${member.user?.username}" exist in the database!`
          );
        }
      });

      const existingServer = await db.query.serversTable.findFirst({
        where: (servers, { eq }) => eq(servers.id, server.id),
      });

      if (!existingServer) {
        const newServer: typeof schema.serversTable.$inferInsert = {
          id: server.id,
          data: JSON.stringify(
            {
              id: server.id,
              name: server.name,
              description: server.description,
              owner: {
                id: server.owner?.id,
                username: server.owner?.username,
                displayName: server.owner?.displayName,
                discriminator: server.owner?.discriminator,
                avatar_image: server.owner?.avatar
                  ? server.owner?.avatar?.url
                  : "",
              },
              server_icon: server.icon ? server.icon.url : "",
              banner: server.banner ? server.banner.url : "",
            },
            null,
            2
          ),
        };

        await db.insert(schema.serversTable).values(newServer);
        console.log("Saved into the database!\n", `Added server: ${server.id}`);
      } else {
        console.warn(`Server "${server.name}" already exists in database`);
        return;
      }
    } catch (error) {
      console.error("HANDLED REJECTION:\n", error);
    }
  });
});

bot.on("messageCreate", async (msg) => {
  const message: typeof schema.messagesTable.$inferInsert = {
    id: msg.id,
    data: JSON.stringify(
      {
        id: msg.id,
        author: {
          id: msg.author?.id,
          username: msg.author?.username,
          displayName: msg.author?.displayName,
          discriminator: msg.author?.discriminator,
        },
        content: msg.content,
        channel: {
          id: msg.channel?.id,
          name: msg.channel?.name,
        },
        metions: msg.mentionIds ? [msg.mentionIds] : [],
        attachments: msg.attachments ? [msg.attachments] : [],
      },
      null,
      2
    ),
  };

  await db.insert(schema.messagesTable).values(message);

  console.log(
    `New Message has been added into the database!\nMessage ID: ${msg.id}`
  );
});
