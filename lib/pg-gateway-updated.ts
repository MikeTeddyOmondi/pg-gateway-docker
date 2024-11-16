import { PGlite } from '@electric-sql/pglite'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fromNodeSocket } from 'pg-gateway/node'

// create a single instance of the db, so that subsequent requests use the same db
const db = new PGlite({ dataDir: join(import.meta.dirname, 'pglite-data') })

const server = createServer(async (socket) => {
  let activeDb = db;

  await fromNodeSocket(socket, {
    serverVersion: '16.3',

    auth: {
      // No password required
      method: 'trust',
    },

    async onStartup({ clientParams }) {
      // create a temp in-memory instance if connecting to the prisma shadow DB
      if (clientParams?.database === 'prisma-shadow') {
        activeDb = new PGlite();
      }

      // Wait for PGlite to be ready before further processing
      await activeDb.waitReady
    },

    // Hook into each client message
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return
      }

      // Forward raw message to PGlite and send response to client
      return await activeDb.execProtocolRaw(data)
    },
  })

  socket.on('end', () => {
    console.info('Client disconnected')
  })
})

server.listen(5432, () => {
  console.info('Server listening on port 5432')
})