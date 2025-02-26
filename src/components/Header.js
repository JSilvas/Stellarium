import React from 'react';
import logo from '../logo.svg';
import './Header.css';


class Header extends React.Component {
  render() {
    return (
      <div className="Header">
        <h1 className="hero-title">
          <div>Stellarium</div> 
          <img src={logo} className="App-logo" alt="logo" /> 
          <div>Jay Silvas</div>
        </h1>
        <p>
        A revival of <em>Stellar</em> in React.js exploring emergent dynamics
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
}

export default Header;
