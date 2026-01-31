import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './Header';
import Sandbox from './Sandbox';
import CriticalitySimulation from './CriticalitySimulation';

function App() {
  const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderSimulation = () => {
    switch (currentRoute) {
      case '#/criticality':
        return <CriticalitySimulation />;
      case '#/':
      default:
        return <Sandbox />;
    }
  };

  return (
    <div className="App">
      <Header currentRoute={currentRoute} />
      {renderSimulation()}
    </div>
  );
}

export default App;
