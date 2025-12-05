import React, { useState, useEffect } from 'react';

const FileExplorer = ({ onFileClick }) => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [error, setError] = useState(null);

  // Função para buscar arquivos do backend
  const fetchFiles = async (path = '') => {
    try {
      const url = `http://localhost:3000/api/files${path ? `?path=${encodeURIComponent(path)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setFiles(data.files);
        setCurrentPath(data.path);
        setError(null);
      } else {
        setError('Erro ao carregar pasta');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    }
  };

  // Carregar arquivos iniciais ao montar o componente
  useEffect(() => {
    fetchFiles();
  }, []);

  const handleNavigate = (path, isDirectory) => {
    if (isDirectory) {
      fetchFiles(path);
    } else {
      // Se for arquivo, chama a função do pai (App.jsx) para abrir o editor
      if (onFileClick) {
        onFileClick(path);
      }
    }
  };

  const handleGoUp = () => {
    // Lógica para subir um nível (compatível com Windows e Linux)
    const separator = currentPath.includes('\\') ? '\\' : '/';
    // Remove a última parte do caminho
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf(separator));
    
    // Se tiver um caminho pai válido (não vazou a raiz), navega
    if (parentPath || parentPath === '') { 
       // parentPath === '' pode acontecer se estivermos na raiz do drive no windows ou / no linux
       fetchFiles(parentPath);
    }
  };

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h3>Explorador</h3>
        <button onClick={handleGoUp} title="Voltar pasta" style={{padding: '2px 8px', cursor: 'pointer'}}>⬆</button>
      </div>
      
      <div className="current-path" title={currentPath}>
        {/* Mostra apenas o nome da pasta atual para não poluir, ou o caminho todo se preferir */}
        {currentPath.split(/[\\/]/).pop() || currentPath}
      </div>

      {error && <div style={{color: '#ff6b6b', fontSize: '0.8em', padding: '5px'}}>{error}</div>}

      <ul className="file-list">
        {files.map((file) => (
          <li 
            key={file.path} 
            className={`file-item ${file.isDirectory ? 'folder' : 'file'}`}
            onClick={() => handleNavigate(file.path, file.isDirectory)}
            title={file.name}
          >
            {/* Ícones usando Emojis para evitar problemas de fonte */}
            <span className="icon">{file.isDirectory ? '📁' : '📄'}</span>
            <span className="name">{file.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileExplorer;