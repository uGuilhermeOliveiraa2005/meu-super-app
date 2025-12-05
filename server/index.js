import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import pty from '@homebridge/node-pty-prebuilt-multiarch';
import os from 'os';

const fastify = Fastify({
  logger: true
});

await fastify.register(fastifyWebsocket);

fastify.get('/ws/terminal', { websocket: true }, (connection, req) => {
  const socket = connection.socket || connection;

  if (!socket) {
    fastify.log.error('ERRO CRÍTICO: Não foi possível encontrar o socket.');
    return;
  }

  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80, // Começa padrão
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  // Backend -> Frontend
  ptyProcess.on('data', (data) => {
    if (socket.readyState === 1) {
      socket.send(data);
    }
  });

  // Frontend -> Backend (Agora aceita JSON para redimensionar)
  socket.on('message', (message) => {
    try {
      // Tenta ler como JSON (comando de resize ou input estruturado)
      const msg = JSON.parse(message.toString());
      
      if (msg.type === 'resize') {
        // Redimensiona o terminal virtual para igualar ao navegador
        ptyProcess.resize(msg.cols, msg.rows);
      } else if (msg.type === 'input') {
        // Escreve o que foi digitado
        ptyProcess.write(msg.data);
      }
    } catch (err) {
      // Se der erro no JSON, assume que é texto puro (fallback)
      ptyProcess.write(message.toString());
    }
  });

  socket.on('close', () => {
    ptyProcess.kill();
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🍳 Cozinha (Backend) aberta em http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();