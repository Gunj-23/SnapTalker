import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { EncryptionProvider } from './context/EncryptionContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <EncryptionProvider>
                <App />
            </EncryptionProvider>
        </AuthProvider>
    </React.StrictMode>,
)
