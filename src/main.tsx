import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { LegalPage } from './components/LegalPage'
import { LEGAL_PATH } from './legal'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname.replace(/\/$/, '') === LEGAL_PATH ? <LegalPage /> : <App />}
  </React.StrictMode>,
)
