import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StorageError } from './components/StorageError';
import { db } from './lib/db';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container!);

// Nothing in the app works without IndexedDB, so surface that failure clearly
// instead of rendering a broken queue.
db.open()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error('Antrilah: could not open IndexedDB', error);
    root.render(<StorageError error={error} />);
  });
