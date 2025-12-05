import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit'; // Melhor usar o pacote oficial atualizado
import 'xterm/css/xterm.css';

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
    
    // Ajuste inicial (importante!)
    fitAddon.fit();

    // 2. Conecta com a "Cozinha" (Backend)
    const socket = new WebSocket('ws://localhost:3000/ws/terminal');

    socket.onopen = () => {
      term.write('\r\n\x1b[32m Conectado ao seu PC! Tente digitar "dir" ou "ls" \x1b[0m\r\n\r\n$ ');
      
      // AVISA O BACKEND DO TAMANHO INICIAL ASSIM QUE CONECTAR
      const dims = { cols: term.cols, rows: term.rows };
      socket.send(JSON.stringify({ type: 'resize', ...dims }));
    };

    socket.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      // Envia como JSON para o backend saber que é input de texto
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data: data }));
      }
    });

    // 3. Lógica de Redimensionamento Inteligente
    const handleResize = () => {
      fitAddon.fit(); // Ajusta o visual no navegador
      
      // E AVISA O SERVIDOR DAS NOVAS MEDIDAS
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: 'resize', 
          cols: term.cols, 
          rows: term.rows 
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.close();
      term.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1e1e1e', padding: '10px', boxSizing: 'border-box' }}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default App;