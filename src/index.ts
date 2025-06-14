import { PGlite } from "@electric-sql/pglite";
import net from "node:net";
import { join } from "path";
import { fromNodeSocket } from "pg-gateway/node";

import { log } from "./utils.js";

const db = new PGlite({ dataDir: join(import.meta.dirname, "..", "pglite-data") });

const server = net.createServer(async (socket) => {
  log.info("Received client connection...");
  
  await fromNodeSocket(socket, {
    serverVersion: "16.3 (PGlite 0.2.0)",

    auth: {
      method: "password",

      validateCredentials: async function (credentials) {
        if (credentials.clearTextPassword === "postgres") {
          const { username, password } = credentials;
          return username === "postgres" && password === "postgres";
        }
        return false;
      },

      getClearTextPassword: async function (credentials, connectionState) {
        return new Promise((res, rej) => res(credentials.username));
      },
    },

    async onStartup() {
      // Wait for PGlite to be ready before further processing
      log.debug("Awaiting database to be ready...");
      await db.waitReady;
    },

    // Hook into each client message
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        log.debug("Authentication failed!");
        return;
      }

      // Forward raw message to PGlite and send response to client
      return await db.execProtocolRaw(data);
    },
  });

  socket.on("end", () => {
    log.info("Client disconnected");
  });
});

server.listen(5432, async () => {
  log.info("Server listening on port: 5432");
});
