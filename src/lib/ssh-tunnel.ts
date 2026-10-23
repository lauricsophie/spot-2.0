import net from "node:net";
import { Client } from "ssh2";
import { config } from "../config.js";
import { logger } from "./logger.js";

let sshClient: Client | null = null;
let localServer: net.Server | null = null;

function loadPrivateKey(): Buffer {
  const raw = config.SSH_TUNNEL_KEY.includes("-----BEGIN")
    ? config.SSH_TUNNEL_KEY.replace(/\\n/g, "\n")
    : Buffer.from(config.SSH_TUNNEL_KEY, "base64").toString("utf8");
  return Buffer.from(raw, "utf8");
}

function parseForward(): { localPort: number; remoteHost: string; remotePort: number } {
  const [localPortStr, remoteHost, remotePortStr] = config.SSH_TUNNEL_FORWARD.split(":");
  return {
    localPort: Number(localPortStr),
    remoteHost,
    remotePort: Number(remotePortStr),
  };
}

export async function openSshTunnel(): Promise<void> {
  if (sshClient) return;

  const { localPort, remoteHost, remotePort } = parseForward();
  const client = new Client();
  sshClient = client;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      client.off("error", onError);
      resolve();
    };
    const onError = (err: Error) => {
      client.off("ready", onReady);
      reject(err);
    };
    client.once("ready", onReady);
    client.once("error", onError);

    logger.info(
      { host: config.SSH_TUNNEL_HOST, forward: config.SSH_TUNNEL_FORWARD },
      "Opening SSH tunnel"
    );

    client.connect({
      host: config.SSH_TUNNEL_HOST,
      port: config.SSH_TUNNEL_PORT,
      username: config.SSH_TUNNEL_USER,
      privateKey: loadPrivateKey(),
      keepaliveInterval: 30000,
      readyTimeout: 10000,
    });
  });

  client.on("error", (err) => {
    logger.error({ err: err.message }, "SSH client error");
  });
  client.on("end", () => {
    logger.info("SSH connection ended");
  });
  client.on("close", () => {
    logger.info("SSH connection closed");
    sshClient = null;
  });

  const server = net.createServer((socket) => {
    client.forwardOut(
      "127.0.0.1",
      socket.remotePort ?? 0,
      remoteHost,
      remotePort,
      (err, stream) => {
        if (err) {
          logger.error({ err: err.message }, "SSH forwardOut failed");
          socket.destroy();
          return;
        }
        socket.pipe(stream).pipe(socket);
        stream.on("error", () => socket.destroy());
        socket.on("error", () => stream.destroy());
      }
    );
  });
  localServer = server;

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(localPort, "127.0.0.1");
  });

  logger.info({ localPort }, "SSH tunnel ready");
}

export async function closeSshTunnel(): Promise<void> {
  if (localServer) {
    await new Promise<void>((resolve) => localServer!.close(() => resolve()));
    localServer = null;
  }
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  logger.info("SSH tunnel closed");
}