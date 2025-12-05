import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import pty from '@homebridge/node-pty-prebuilt-multiarch';
import os from 'os';
import fs from 'node:fs/promises';
import path from 'node:path';
import Groq from 'groq-sdk';
import 'dotenv/config'; // Carrega o arquivo .env

const fastify = Fastify({ logger: true });

// Configurar o cliente Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

await fastify.register(fastifyCors, { origin: true });
await fastify.register(fastifyWebsocket);

// --- ROTAS DE ARQUIVOS ---

// 1. Listar arquivos
fastify.get('/api/files', async (req, reply) => {
  const currentPath = req.query.path || os.homedir();
  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(currentPath, entry.name)
    })).sort((a, b) => b.isDirectory - a.isDirectory || a.name.localeCompare(b.name));
    return { path: currentPath, files };
  } catch (err) {
    reply.status(500).send({ error: 'Erro ao ler diretório' });
  }
});

// 2. Ler conteúdo do arquivo (NOVO)
fastify.get('/api/files/read', async (req, reply) => {
  const filePath = req.query.path;
  if (!filePath) return reply.status(400).send({ error: 'Caminho não informado' });
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { content };
  } catch (err) {
    reply.status(500).send({ error: 'Erro ao ler arquivo' });
  }
});

// --- ROTA DE INTELIGÊNCIA ARTIFICIAL (NOVO) ---
fastify.post('/api/ai/chat', async (req, reply) => {
  const { code, prompt } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente de programação especialista (Vibe Coding). Responda de forma direta, técnica e concisa. Se for código, mostre apenas o código ou a explicação solicitada."
        },
        {
          role: "user",
          content: `Aqui está o meu código/arquivo:\n\n${code}\n\nPergunta: ${prompt}`
        }
      ],
      model: "qwen-2.5-coder-32b", // Modelo especializado em código
      temperature: 0.5,
      max_tokens: 1024,
    });

    return { response: completion.choices[0]?.message?.content || "Sem resposta da IA." };
  } catch (error) {
    req.log.error(error);
    reply.status(500).send({ error: 'Erro ao falar com o Groq' });
  }
});

// --- WEBSOCKET TERMINAL ---
fastify.get('/ws/terminal', { websocket: true }, (connection) => {
  const socket = connection.socket || connection;
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color', cols: 80, rows: 30, cwd: os.homedir(), env: process.env
  });

  ptyProcess.on('data', (data) => socket.readyState === 1 && socket.send(data));
  socket.on('message', (msg) => {
    try {
      const { type, cols, rows, data } = JSON.parse(msg.toString());
      if (type === 'resize') ptyProcess.resize(cols, rows);
      else if (type === 'input') ptyProcess.write(data);
    } catch { ptyProcess.write(msg.toString()); }
  });
  socket.on('close', () => ptyProcess.kill());
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🍳 Cozinha (Backend) com Groq AI aberta em http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();