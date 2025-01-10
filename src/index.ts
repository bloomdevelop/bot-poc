import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./db/schema";
import { Client } from "revolt.js";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const bot = new Client();

// TODO: Add .env valiation (unecessary but important)
bot.loginBot(process.env.TOKEN as string);

// This whole fucking mess. I should've organized better
bot.on("ready", () => {
  bot.servers.forEach(async (server) => {
    try {
      (await server.fetchMembers()).members.forEach(async (member) => {
        const existingUser = await db.query.usersTable.findFirst({
          where: (users, { eq }) => eq(users.id, member.user?.id!!),
        });

        // First, we check if there's a existing user in our database
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

          // Inserts these data into the database
          await db.insert(schema.usersTable).values(newUser);
        } else {

          // If there's a user, you know what we do.
          // Add a "pointless" warning (seriously?)
          console.warn(
            `User "${member.user?.username}" exist in the database!`
          );
        }
      });

      const existingServer = await db.query.serversTable.findFirst({
        where: (servers, { eq }) => eq(servers.id, server.id),
      });

      // Also it does applies to the servers part too
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
        // Tell via console.log that we added it
        console.log("Saved into the database!\n", `Added server: ${server.id}`);
      } else {
        // It does exactly the SAME THING, expect the prashe is different
        console.warn(`Server "${server.name}" already exists in database`);
        return;
      }
    } catch (error) {
      // If there's a error, you're very much fucked up.
      console.error("HANDLED REJECTION:\n", error);
    }
  });
});

bot.on("messageCreate", async (msg) => {
  // Every time a user/people sends a message, the bot will recieve "messageCreate" event
  // with the content, even the whole message (expect only some needed values) data from the api/event.
  // 
  // Unsure if I need a timestamp here.
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
  // Tell that we added the exactly the whole damm thing in the database... Ugh...
  console.log(
    `New Message has been added into the database!\nMessage ID: ${msg.id}`
  );
});
