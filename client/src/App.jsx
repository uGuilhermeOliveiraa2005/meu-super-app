import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import './App.css';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';

function App() {
  // Referências para o Terminal
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  
  // Estado para controlar qual arquivo está aberto (null = nenhum arquivo = mostra terminal)
  const [activeFile, setActiveFile] = useState(null); 

  // Função chamada quando clica num arquivo na barra lateral
  const handleFileSelect = async (path) => {
    try {
      // Pede ao backend para ler o conteúdo do arquivo
      const res = await fetch(`http://localhost:3000/api/files/read?path=${encodeURIComponent(path)}`);
      
      if (res.ok) {
        const data = await res.json();
        // Define o arquivo ativo, o que vai trocar a visualização do Terminal para o Editor
        setActiveFile({ path, content: data.content });
      } else {
        alert('Não foi possível ler este arquivo. Verifique se é um arquivo de texto.');
      }
    } catch (err) {
      console.error("Erro ao abrir arquivo:", err);
      alert('Erro de conexão ao tentar abrir o arquivo.');
    }
  };

  // Configuração do Terminal (só roda uma vez)
  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: { background: '#1e1e1e' }
    });

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);

    // Renderiza o terminal na div
    term.open(terminalRef.current);
    
    // Pequeno delay para garantir que o elemento tem tamanho antes do fit
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    // Conecta WebSocket
    const socket = new WebSocket('ws://localhost:3000/ws/terminal');
    wsRef.current = socket;

    socket.onopen = () => {
      term.write('\r\n\x1b[32m Super App OS Conectado! \x1b[0m\r\n$ ');
      
      // Sincroniza tamanho inicial
      const dims = { cols: term.cols, rows: term.rows };
      socket.send(JSON.stringify({ type: 'resize', ...dims }));
    };

    socket.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data: data }));
      }
    });

    // Redimensionamento responsivo
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        // Se o terminal estiver visível (ou socket aberto), avisa o backend
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const { cols, rows } = term;
          wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
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
    <div className="app-container">
      {/* Lado Esquerdo: Navegador de Arquivos */}
      <div className="sidebar">
        <FileExplorer onFileClick={handleFileSelect} />
      </div>

      {/* Lado Direito: Conteúdo Principal */}
      <div className="main-content">
        {activeFile ? (
          // Se tem arquivo aberto, mostra o Editor com IA
          <CodeEditor 
            filePath={activeFile.path} 
            initialContent={activeFile.content} 
            onClose={() => setActiveFile(null)} // Botão fechar volta para null
          />
        ) : (
          // Se não tem arquivo, mostra o Terminal
          // Usamos display: 'block' ou 'none' se quiséssemos manter o estado do terminal vivo,
          // mas aqui estamos desmontando/montando ou apenas escondendo. 
          // O xterm precisa da div presente para renderizar.
          // Nota: O useEffect roda na montagem. Se o activeFile mudar, o terminal pode sumir do DOM.
          // Para manter o terminal vivo (sessão não cair), o ideal é usar display style.
          <div 
            ref={terminalRef} 
            className="terminal-container" 
            style={{ display: activeFile ? 'none' : 'block' }} 
          />
        )}
      </div>
    </div>
  );
}

export default App;