import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c3169',
            color: '#e2e8f0',
            border: '1px solid rgba(79,142,247,0.2)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1c3169' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1c3169' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
