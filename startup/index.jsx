import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/app';

import { enableFakeData } from './src/mockApi/fakeBackend';

enableFakeData().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
});