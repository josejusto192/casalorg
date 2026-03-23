import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/layout/ErrorBoundary'
import EnvGuard from './components/layout/EnvGuard'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <EnvGuard>
      <App />
    </EnvGuard>
  </ErrorBoundary>
)
