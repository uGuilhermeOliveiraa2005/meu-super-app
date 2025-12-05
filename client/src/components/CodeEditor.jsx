import React, { useState } from 'react';

const CodeEditor = ({ filePath, initialContent, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAskAi = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: initialContent, prompt })
      });
      const data = await res.json();
      setAiResponse(data.response);
    } catch (err) {
      setAiResponse('Erro ao conectar com a IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e', color: '#fff' }}>
      {/* Cabeçalho do Editor */}
      <div style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
        <span>📝 {filePath.split(/[\\/]/).pop()}</span>
        <button onClick={onClose} style={{background: 'red', border: 'none', color: 'white', cursor: 'pointer'}}>X</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Área de Código (Esquerda) */}
        <div style={{ flex: 1, padding: '10px', overflow: 'auto', borderRight: '1px solid #333' }}>
          <pre style={{ margin: 0, fontFamily: 'Consolas, monospace' }}>{initialContent}</pre>
        </div>

        {/* Área da IA (Direita) */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '10px', background: '#252526' }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: '10px', fontSize: '0.9rem', lineHeight: '1.4' }}>
            {loading ? <span style={{color: '#646cff'}}>Pensando...</span> : aiResponse ? aiResponse : "Pergunte algo sobre este código para o Groq AI."}
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Explique isso..."
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1e1e1e', color: 'white' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            />
            <button onClick={handleAskAi} disabled={loading} style={{ background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer' }}>
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;