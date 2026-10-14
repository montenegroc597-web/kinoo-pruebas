import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { prepararConfig } from './config';

// los textos y la «Config» del estudio se fijan antes del primer render: todas las pantallas leen la misma versión
void prepararConfig().finally(() => createRoot(document.getElementById('root')!).render(<App />));
