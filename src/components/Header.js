import React from 'react';
import logo from '../logo.svg';
import './Header.css';

function Header({ currentRoute }) {
  const isStellarium = currentRoute === '#/' || !currentRoute;
  const isCriticality = currentRoute === '#/criticality';

  return (
    <div className="Header">
      <div className="nav-buttons">
        <a
          href="#/"
          className={`nav-button ${isStellarium ? 'active' : ''}`}
        >
          Stellarium
        </a>
        <a
          href="#/criticality"
          className={`nav-button ${isCriticality ? 'active' : ''}`}
        >
          Criticality
        </a>
      </div>

      <h1 className="hero-title">
        <div>Stellarium</div>
        <img src={logo} className="App-logo" alt="logo" />
        <div>Jay Silvas</div>
      </h1>

      <p className="header-description">
        {isStellarium ? (
          <>A revival of <em>Stellar</em> in React.js exploring emergent dynamics</>
        ) : (
          <>Exploring self-organized criticality through stress avalanches</>
        )}
      </p>

      <a
        className="App-link"
        href="https://jaysilvas.dev/"
        target="_blank"
        rel="noopener noreferrer"
      >
        More Projects
      </a>
    </div>
  );
}

export default Header;
