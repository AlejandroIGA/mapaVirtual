// App.jsx
import React from 'react';
import GoogleMapsComponent from './components/GoogleMapsComponent';
import './App.css'; // Si tienes estilos personalizados

function App() {
  return (
    <div className="App">
      <header className="bg-blue-800 text-white p-4">
        <h1 className="text-2xl font-bold">Sistema de Navegación Universitaria</h1>
        <p className="text-blue-200">Encuentra edificios y personal del campus</p>
      </header>
      
      <main className="container mx-auto p-4">
        <GoogleMapsComponent />
      </main>
      
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <p className="text-center text-gray-400">
          © 2025 Universidad - Sistema de Navegación
        </p>
      </footer>
    </div>
  );
}

export default App;