import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { addNotes } from './store/slices/notesSlice'
import { seedNotes } from './domain/seed'
import { App } from './components/App'
import './index.css'

// Seed a short demo phrase on first load.
store.dispatch(addNotes(seedNotes))

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
