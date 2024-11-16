import { PGlite } from "@electric-sql/pglite";
import net from "node:net";
import { join } from "path";
import { fromNodeSocket } from "pg-gateway/node";

// create a single instance of the db, so that subsequent requests use the same db
const db = new PGlite({ dataDir: join(import.meta.dirname, "pglite-data") });

const server = net.createServer(async (socket) => {
  await fromNodeSocket(socket, {
    serverVersion: "16.3 (PGlite 0.2.0)",

    auth: {
      // No password required
      method: "trust",
    },

    async onStartup() {
      // Wait for PGlite to be ready before further processing
      await db.waitReady;
    },

    // Hook into each client message
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return;
      }

      // Forward raw message to PGlite and send response to client
      return await db.execProtocolRaw(data);
    },
  });

  socket.on("end", () => {
    console.info("Client disconnected");
  });
});

server.listen(5432, () => {
  console.info("Server listening on port 5432");
});
