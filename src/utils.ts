import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { pino } from 'pino'

const projectFolder = join(cwd(), "logs");

await mkdir(projectFolder, { recursive: true });
const logsDir = projectFolder; 

const logsTempDir = async () => {
  const timestamp = new Date().toISOString()
    .split('T')[0]  
    .replace(/-/g, '');
  return await mkdtemp(join(logsDir, `logs-${timestamp}-`));
};

export const pinofile = async () =>
  join(await logsTempDir(), `pid-${process.pid}-logs`);

async function transport() {
  const transport = pino.transport({
    targets: [
      {
        level: "warn",
        target: "pino/file",
        options: {
          destination: await pinofile(),
        },
      },
      {
        level: "info",
        target: "pino-pretty",
      },
    ],
  });
  return transport;
}

export const logger = async () => {
  let t = await transport();
  return pino(t);
};

// Initilise logger
export const log = await logger().then((logger) => logger);
