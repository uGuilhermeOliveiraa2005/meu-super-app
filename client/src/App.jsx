import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Importa o estilo visual

function App() {
  const terminalRef = useRef(null);

  useEffect(() => {
    // 1. Configura o visual do terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: { background: '#1e1e1e' }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    // 2. Conecta com a "Cozinha" (Backend)
    const socket = new WebSocket('ws://localhost:3000/ws/terminal');

    // Quando conectar, avisa na tela
    socket.onopen = () => {
      term.write('\r\n\x1b[32m Conectado ao seu PC! Tente digitar "dir" ou "ls" \x1b[0m\r\n\r\n$ ');
    };

    // Recebe a resposta do computador e mostra na tela
    socket.onmessage = (event) => {
      term.write(event.data);
    };

    // Pega o que você digita e manda para o computador
    term.onData((data) => {
      socket.send(data);
    });

    // Ajusta o tamanho se redimensionar a janela
    window.addEventListener('resize', () => fitAddon.fit());

    return () => {
      socket.close();
      term.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', padding: '10px', boxSizing: 'border-box' }}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default App;