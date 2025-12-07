import React, { useState, useEffect } from 'react';
import { Editor } from './editor';
import { generateUserColor, UserInfo } from './editor/types';
import './App.css';

const STORAGE_KEY = 'rewrite-editor-user';

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Check for stored user on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        setShowNamePrompt(true);
      }
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      const newUser: UserInfo = {
        name: nameInput.trim(),
        color: generateUserColor(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      setShowNamePrompt(false);
    }
  };

  const handleChangeName = () => {
    setShowNamePrompt(true);
    setNameInput(user?.name || '');
  };

  // Get document name from URL or use default
  const documentName = new URLSearchParams(window.location.search).get('doc') || 'default-document';

  if (showNamePrompt) {
    return (
      <div className="app">
        <div className="name-prompt-overlay">
          <div className="name-prompt-dialog">
            <h2>Welcome to the Collaborative Editor</h2>
            <p>Please enter your name to join the editing session.</p>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="name-input"
              />
              <button type="submit" className="name-submit" disabled={!nameInput.trim()}>
                Join Session
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="app loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Rewriter</h1>
        <div className="user-info-header">
          <span className="user-color" style={{ backgroundColor: user.color }}></span>
          <span className="user-name">{user.name}</span>
          <button onClick={handleChangeName} className="change-name-btn" title="Change your name">
            ✏️
          </button>
        </div>
      </header>
      <main className="app-main">
        <Editor documentName={documentName} user={user} />
      </main>
    </div>
  );
}

export default App;
