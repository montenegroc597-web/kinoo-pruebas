import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Catalogo } from './steps/Catalogo';

const catalogo = new URLSearchParams(location.search).get('catalogo') === '1';
createRoot(document.getElementById('root')!).render(catalogo ? <Catalogo /> : <App />);
