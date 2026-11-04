import React from 'react';
import ReactDOM from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './index.css';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemen #root tidak ditemukan');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
