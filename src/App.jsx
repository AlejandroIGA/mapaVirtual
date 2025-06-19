// App.jsx
import React from 'react';
import GoogleMapsComponent from './components/GoogleMapsComponent';
import './App.css';
import Header from './components/header/Header';
import SearchBar from './components/SearchBar/SearchBar';

function App() {
  return (
    <div className="app-container">
        <Header></Header>
        <SearchBar></SearchBar>
      <main className="app-main">
        <GoogleMapsComponent />
      </main>
    </div>
  );
}

export default App;