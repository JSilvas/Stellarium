import React, { useRef, useEffect, useState } from 'react';
import './Sandbox.css';

const Sandbox = () => {
  const canvasRef = useRef(null);
  const simulationRef = useRef({
    balls: [],
    collisionCounter: 0,
    animationId: null,
    processedIndices: new Set(),
    currentConfig: null // Will store current config
  });
  const audioContextRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const ballFiltersRef = useRef(new Map()); // Store filters for each ball

  // Add constants for screen wrapping
  const [config, setConfig] = useState({
    maxBalls: 100,
    initialBalls: 20,
    maxSpawnPerCollision: 5,
    minBallSize: 1,
    maxBallSize: 50,
    minVelocity: -7,
    maxVelocity: 7,
    velocity: 0.30,
    trailOpacity: 0.30,
    pauseSimulation: false,
    noiseType: 'pink',
    audioEnabled: false,     // Start disabled
    minFrequency: 100,
    maxFrequency: 8000,
    filterQ: 1.0,
    bypassFilters: false     // Start disabled
  });

  // Stats tracking
  const [stats, setStats] = useState({
    ballCount: 0,
    collisionCount: 0
  });

  // Toggle controls visibility
  const [showControls, setShowControls] = useState(true);

  // Initialize simulation once
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Important: Set actual pixel dimensions of the canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let width = canvas.width;
    let height = canvas.height;

    const sim = simulationRef.current;

    class Ball {
      static spawnCount = 0;

      constructor(x, y, velX, velY, color, size) {
        this.x = x;
        this.y = y;
        // Apply velocity scale factor from current config
        this.velX = velX * config.velocity;
        this.velY = velY * config.velocity;
        this.color = color;
        this.size = size;
        // Store original velocity values to allow rescaling
        this.origVelX = velX;
        this.origVelY = velY;
      }

      draw() {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
      }

      update() {
        // Get current configuration
        const currentConfig = sim.currentConfig || config;
        
        // Recalculate velocity with current scale
        this.velX = this.origVelX * currentConfig.velocity;
        this.velY = this.origVelY * currentConfig.velocity;
        
        // Move the ball
        this.x += this.velX;
        this.y += this.velY;
        
        // Screen wrapping (Asteroids-style)
        // If ball moves off the right edge, wrap to left edge
        if (this.x - this.size > width) {
          this.x = -this.size;
        }
        // If ball moves off the left edge, wrap to right edge
        else if (this.x + this.size < 0) {
          this.x = width + this.size;
        }
        
        // If ball moves off the bottom edge, wrap to top edge
        if (this.y - this.size > height) {
          this.y = -this.size;
        }
        // If ball moves off the top edge, wrap to bottom edge
        else if (this.y + this.size < 0) {
          this.y = height + this.size;
        }
      }

      collisionDetect(balls, processedIndices) {
        // Get current configuration values
        const currentConfig = sim.currentConfig || config;
        
        for (let j = 0; j < balls.length; j++) {
          // Skip if this is the same ball or if already processed in this frame
          if (this === balls[j] || processedIndices.has(j)) continue;

          const dx = this.x - balls[j].x;
          const dy = this.y - balls[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.size + balls[j].size) {
            // Record that we've processed this ball
            processedIndices.add(j);
            
            // Change colors
            const newColor = `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`;
            balls[j].color = this.color = newColor;
            
            // Track collision count
            sim.collisionCounter++;
            
            // Spawn new balls at the collision location
            if (balls.length < currentConfig.maxBalls) {
              Ball.spawnCount = 0;
              // Get collision location
              const spawnX = balls[j].x;
              const spawnY = balls[j].y;
              
              // Spawn between 1 and maxSpawnPerCollision balls
              const spawnAmount = random(1, currentConfig.maxSpawnPerCollision + 1);
              while (Ball.spawnCount < spawnAmount) {
                Ball.spawnCount += 1;
                
                // Create a new ball at collision point
                const newBall = new Ball(
                  spawnX + random(-10, 10), // Add small random offset to prevent exact overlap
                  spawnY + random(-10, 10),
                  random(currentConfig.minVelocity, currentConfig.maxVelocity),
                  random(currentConfig.minVelocity, currentConfig.maxVelocity),
                  `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`,
                  random(currentConfig.minBallSize, currentConfig.maxBallSize)
                );
                balls.push(newBall);
              }
            }
            
            // Clean up filter for the ball we're about to remove
            cleanupBallFilter(balls[j]);
            
            // Remove the ball
            balls.splice(j, 1);
            Ball.spawnCount = 0;
            
            // Only process one collision per ball per frame
            break;
          }
        }
      }
    }

    const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

    // Create initial balls
    const spawnBalls = (count) => {
      // Always use current config values from the sim reference
      const currentConfig = sim.currentConfig || config;
      
      for (let i = 0; i < count; i++) {
        const ball = new Ball(
          random(0, width),
          random(0, height),
          random(currentConfig.minVelocity, currentConfig.maxVelocity),
          random(currentConfig.minVelocity, currentConfig.maxVelocity),
          `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`,
          random(currentConfig.minBallSize, currentConfig.maxBallSize)
        );
        sim.balls.push(ball);
      }
    };

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      width = canvas.width;
      height = canvas.height;
      
      // Redraw immediately after resize
      ctx.fillStyle = 'rgba(0, 5, 25, 1)';
      ctx.fillRect(0, 0, width, height);
      
      // Redraw all balls after resize
      sim.balls.forEach(ball => {
        ball.draw();
      });
    };

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Store these functions in the sim ref
    sim.Ball = Ball;
    sim.random = random;
    sim.spawnBalls = spawnBalls;
    sim.width = width;
    sim.height = height;
    sim.ctx = ctx;

    // Initial spawn if needed
    if (sim.balls.length === 0) {
      spawnBalls(config.initialBalls);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (sim.animationId) {
        cancelAnimationFrame(sim.animationId);
      }
      
      // Clean up audio context
      if (audioContextRef.current) {
        try {
          // Only try to close if not already closed
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => {
              console.error('Error closing audio context:', e);
            });
          }
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps array means this runs once on mount

  // Make configuration available in the simulation context
  useEffect(() => {
    // Update the simulation with current config
    const sim = simulationRef.current;
    if (sim.Ball) {
      // This allows the simulation objects to access current config
      sim.currentConfig = { ...config };
      
      // Update velocity scale for all existing balls
      if (sim.balls) {
        sim.balls.forEach(ball => {
          // Velocity will be recalculated in the next update cycle
          ball.velocityChanged = true;
          
          // Update audio filter if ball has one
          updateBallFilter(ball);
        });
      }
    }
  }, [config]);

  // Animation loop effect
  useEffect(() => {
    const sim = simulationRef.current;
    const ctx = sim.ctx;
    
    if (!ctx) return; // Exit if canvas isn't ready
    
    const canvas = canvasRef.current;
    // Ensure canvas dimensions are set correctly
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const loop = () => {
      // Clear with transparent background for trails
      ctx.fillStyle = config.pauseSimulation
        ? 'rgba(0, 5, 25, 1)'  // Solid background when paused
        : `rgba(0, 5, 25, ${config.trailOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Maintain minimum ball count
      while (sim.balls.length < config.initialBalls) {
        sim.spawnBalls(1);
      }

      if (!config.pauseSimulation) {
        // Clear processed set for this frame
        sim.processedIndices.clear();
        
        // Process each ball
        for (let i = 0; i < sim.balls.length; i++) {
          // Skip if we already processed this ball in this frame
          if (sim.processedIndices.has(i)) continue;
          
          sim.balls[i].draw();
          sim.balls[i].update();
          
          // Handle collisions
          sim.balls[i].collisionDetect(sim.balls, sim.processedIndices);
        }
        
        // Update stats (less frequently to avoid performance impact)
        if (Math.random() < 0.05) {
          setStats({
            ballCount: sim.balls.length,
            collisionCount: sim.collisionCounter
          });
        }
      } else {
        // When paused, just draw balls
        for (const ball of sim.balls) {
          ball.draw();
        }
      }

      sim.animationId = requestAnimationFrame(loop);
    };

    // Start animation
    sim.animationId = requestAnimationFrame(loop);

    // Cleanup
    return () => {
      cancelAnimationFrame(sim.animationId);
      sim.animationId = null;
    };
  }, [config.pauseSimulation, config.trailOpacity, config.initialBalls]); 

  // Handle parameter changes
  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : 
                    name === 'noiseType' ? value : 
                    Number(value);
    
    console.log(`Config change: ${name} = ${newValue}`);
    
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: newValue
    }));
  };

  // Toggle controls panel
  const toggleControls = () => {
    setShowControls(!showControls);
  };

  // Reset simulation
  const resetSimulation = () => {
    const sim = simulationRef.current;
    
    // Clean up filters for all balls before removing them
    sim.balls.forEach(ball => cleanupBallFilter(ball));
    
    // Reset simulation state
    sim.balls = [];
    sim.collisionCounter = 0;
    sim.processedIndices.clear();
    
    // Create new balls
    sim.spawnBalls(config.initialBalls);
    
    // Update stats
    setStats({
      ballCount: sim.balls.length,
      collisionCount: 0
    });
  };

  // Audio management functions
  
  // Initialize Audio Context when enabled
  useEffect(() => {
    if (config.audioEnabled && !audioContextRef.current) {
      console.log('Creating new audio context');
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        initializeNoiseGenerator();
      } catch (e) {
        console.error('Failed to create audio context:', e);
        // Turn off audio if we can't create the context
        setConfig(prev => ({ ...prev, audioEnabled: false }));
      }
    } else if (!config.audioEnabled && audioContextRef.current) {
      // Suspend the audio context when disabled (only if not already closed)
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.suspend().catch(e => {
            console.error('Error suspending audio context:', e);
          });
        }
      } catch (e) {
        console.error('Error with audio context operation:', e);
      }
    }
  }, [config.audioEnabled]);

  // Initialize noise generator based on noise type
  const initializeNoiseGenerator = () => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) {
      console.log('No audio context available');
      return;
    }
    
    // Verify the audio context is not closed
    if (audioCtx.state === 'closed') {
      console.log('Audio context is closed, cannot initialize noise generator');
      return;
    }

    console.log(`Initializing ${config.noiseType} noise generator`);

    // Disconnect old noise source if it exists
    if (noiseSourceRef.current) {
      try {
        if (noiseSourceRef.current.gainNode) {
          noiseSourceRef.current.gainNode.disconnect();
        }
        noiseSourceRef.current.disconnect();
      } catch (e) {
        console.log('Error disconnecting old noise source:', e);
      }
    }

    const bufferSize = 4096;
    const noiseNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1;  // Master volume

    // Variables for various noise algorithms
    let lastOut = 0; // For brown noise
    let lastValue = 0, lastValue2 = 0; // For blue/violet noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; // For pink noise
    let lfsr = 0x9D2C5680; // For LFSR noise (seed with a prime number)

    // Add a periodic reset to prevent filter coefficient drift
    // This prevents gradual volume fade out
    let sampleCounter = 0;
    const resetInterval = 48000; // Reset every ~1 second at 48kHz

    noiseNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      
      // Periodically reset filter states to prevent drift and volume fade
      sampleCounter += bufferSize;
      if (sampleCounter >= resetInterval) {
        // Soft reset - don't zero everything to avoid clicks
        if (config.noiseType === 'pink') {
          // Scale back towards original magnitude without zeroing
          b0 *= 0.9; b1 *= 0.9; b2 *= 0.9;
          b3 *= 0.9; b4 *= 0.9; b5 *= 0.9; b6 *= 0.9;
        }
        sampleCounter = 0;
      }
      
      switch(config.noiseType) {
        case 'white':
          // White noise (flat frequency spectrum)
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          break;
          
        case 'pink':
          // Pink noise (1/f spectrum - more bass than white noise)
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            
            // Pink noise filter (Voss-McCartney algorithm) - modified for stability
            b0 = 0.99765 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            
            // Normalize output to prevent volume fade
            let pinkSample = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] = pinkSample * 0.11;
            
            b6 = white * 0.115926;
          }
          break;
          
        case 'brown':
          // Brown noise (1/f² spectrum - even more bass)
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            
            // Modified leaky integrator with normalization to prevent drift
            lastOut = (lastOut + (0.02 * white));
            // Apply leaky factor but ensure we don't diminish signal over time
            if (Math.abs(lastOut) > 8.0) {
              lastOut = 0.998 * lastOut;
            }
            
            output[i] = (lastOut / 8.0) * 3.5; // Scale to match other noise volumes
          }
          break;

        case 'blue':
          // Blue noise (high frequencies emphasized, +6dB/octave)
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Apply differentiation filter (emphasizes high frequencies)
            // With DC blocking to prevent drift
            const blueSample = white - lastValue;
            lastValue = white;
            output[i] = blueSample * 0.5;
          }
          break;
          
        case 'violet':
          // Violet noise (very high frequencies emphasized, +12dB/octave)
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Apply double differentiation filter with DC blocking
            const temp = white - lastValue;
            const violetSample = temp - lastValue2;
            lastValue2 = temp;
            lastValue = white;
            output[i] = violetSample * 0.25;
          }
          break;
          
        case 'lfsr':
          // LFSR (Linear Feedback Shift Register) digital noise
          for (let i = 0; i < bufferSize; i++) {
            // Extract the least significant bit
            const bit = lfsr & 1;
            // XOR taps (for a 32-bit LFSR)
            const tap = ((lfsr >> 0) ^ (lfsr >> 10) ^ (lfsr >> 30) ^ (lfsr >> 31)) & 1;
            // Shift register and insert new bit
            lfsr = (lfsr >> 1) | (tap << 31);
            // Scale the output to audio range (-1 to 1)
            output[i] = bit * 2 - 1;
          }
          break;
          
        case 'velvet':
          // "Velvet" noise - sparse impulses with controlled density
          // Creates a smoother digital texture
          for (let i = 0; i < bufferSize; i++) {
            // Only generate impulses at ~10% density
            if (Math.random() < 0.1) {
              output[i] = Math.random() > 0.5 ? 0.7 : -0.7;
            } else {
              output[i] = 0;
            }
          }
          break;
          
        default:
          // Default to white noise
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
      }
    };

    // Store references
    noiseNode.gainNode = gainNode;
    noiseSourceRef.current = noiseNode;
    
    // After creating the noise source, update filter connections
    updateFilterConnections();
    
    console.log(`${config.noiseType} noise generator initialized`);
  };

  // Create a filter for a ball
  const createBallFilter = (ball) => {
    // Skip if we already have a filter for this ball
    if (ballFiltersRef.current.has(ball)) return;
    
    // Skip if no audio context
    if (!audioContextRef.current) return;
    
    const audioCtx = audioContextRef.current;
    
    // Create a bandpass filter
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    
    // Map ball size to frequency (smaller balls = higher frequency)
    const minFreq = config.minFrequency;
    const maxFreq = config.maxFrequency;
    const sizeRange = config.maxBallSize - config.minBallSize;
    
    // Calculate frequency ratio based on ball size
    // Invert the ratio so smaller balls have higher frequencies
    const freqRatio = 1 - ((ball.size - config.minBallSize) / sizeRange);
    const frequency = minFreq + freqRatio * (maxFreq - minFreq);
    
    filter.frequency.value = frequency;
    filter.Q.value = config.filterQ;
    
    // Store the filter
    ballFiltersRef.current.set(ball, filter);
    
    console.log(`Filter created for ball: size=${ball.size}, freq=${frequency.toFixed(0)}Hz`);
    
    // Update filter connections
    updateFilterConnections();
  };

  // Update a ball's filter parameters
  const updateBallFilter = (ball) => {
    const filter = ballFiltersRef.current.get(ball);
    if (!filter) {
      // Create filter if it doesn't exist
      if (config.audioEnabled) {
        createBallFilter(ball);
      }
      return;
    }
    
    // Update filter parameters based on current config
    const minFreq = config.minFrequency;
    const maxFreq = config.maxFrequency;
    const sizeRange = config.maxBallSize - config.minBallSize;
    const freqRatio = 1 - ((ball.size - config.minBallSize) / sizeRange);
    const frequency = minFreq + freqRatio * (maxFreq - minFreq);
    
    filter.frequency.value = frequency;
    filter.Q.value = config.filterQ;
  };

  // Clean up a ball's filter
  const cleanupBallFilter = (ball) => {
    const filter = ballFiltersRef.current.get(ball);
    if (filter) {
      try {
        filter.disconnect();
      } catch (e) {
        console.log('Error disconnecting filter:', e);
      }
      ballFiltersRef.current.delete(ball);
      console.log(`Filter cleaned up for ball with size ${ball.size}`);
      
      // Update connections after removing a filter
      if (config.audioEnabled && !config.bypassFilters) {
        updateFilterConnections();
      }
    }
  };

  // Update filter connections when configuration changes
  const updateFilterConnections = () => {
    if (!audioContextRef.current || !noiseSourceRef.current) {
      console.log('Audio context or noise source not available');
      return;
    }
    
    // Check if context is closed, if so we can't proceed
    if (audioContextRef.current.state === 'closed') {
      console.log('Audio context is closed, not updating connections');
      return;
    }
    
    const audioCtx = audioContextRef.current;
    const noiseNode = noiseSourceRef.current;
    const gainNode = noiseNode.gainNode;
    const allFilters = Array.from(ballFiltersRef.current.values());
    
    console.log(`Updating ${allFilters.length} filter connections, bypass=${config.bypassFilters}, enabled=${config.audioEnabled}`);
    
    // Disconnect existing connections
    try {
      noiseNode.disconnect();
      gainNode.disconnect();
      allFilters.forEach(filter => {
        try {
          filter.disconnect();
        } catch (e) {
          console.log('Error disconnecting filter:', e);
        }
      });
    } catch (e) {
      console.log('Error during disconnection:', e);
    }
    
    // Only reconnect if audio is enabled
    if (!config.audioEnabled) {
      console.log('Audio disabled, not reconnecting');
      return;
    }
    
    // Connect noise node to gain node
    noiseNode.connect(gainNode);
    
    // Either bypass filters or connect through them
    if (config.bypassFilters) {
      // Connect directly to output
      gainNode.connect(audioCtx.destination);
      console.log('Filters bypassed, connected directly to output');
    } else {
      // Connect through filters
      if (allFilters.length === 0) {
        console.log('No filters available, audio will be silent');
        return;
      }
      
      console.log(`Connecting through ${allFilters.length} filters`);
      allFilters.forEach(filter => {
        gainNode.connect(filter);
        filter.connect(audioCtx.destination);
      });
    }
  };

  // Extend balls with audio capabilities when created
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;
    
    // Store the original functions
    const originalBall = sim.Ball;
    const originalSpawnBalls = sim.spawnBalls;
    
    // Extend Ball class with audio capabilities
    sim.Ball = class AudioBall extends originalBall {
      constructor(x, y, velX, velY, color, size) {
        // Call original constructor
        super(x, y, velX, velY, color, size);
        
        // Add audio filter if audio is enabled
        if (config.audioEnabled) {
          createBallFilter(this);
        }
      }
    };
    
    // Override the spawnBalls method to ensure filters are created
    sim.spawnBalls = function(count) {
      console.log(`Creating ${count} new balls`);
      
      // Call original spawnBalls
      originalSpawnBalls.call(this, count);
      
      // If audio is enabled, ensure all balls have filters
      if (config.audioEnabled) {
        const newBalls = this.balls.slice(-count);
        newBalls.forEach(ball => {
          if (!ballFiltersRef.current.has(ball)) {
            createBallFilter(ball);
          }
        });
      }
    };
    
    // Create filters for existing balls
    if (config.audioEnabled) {
      sim.balls.forEach(ball => {
        if (!ballFiltersRef.current.has(ball)) {
          createBallFilter(ball);
        }
      });
    }
    
    // Cleanup function
    return () => {
      // Restore original methods
      sim.Ball = originalBall;
      sim.spawnBalls = originalSpawnBalls;
    };
  }, [config.audioEnabled]);

  // Update filter connections when bypass state changes
  useEffect(() => {
    if (config.audioEnabled) {
      updateFilterConnections();
    }
  }, [config.bypassFilters]);

  // Update noise generator when noise type changes
  useEffect(() => {
    if (audioContextRef.current && config.audioEnabled) {
      initializeNoiseGenerator();
    }
  }, [config.noiseType]);
  
  // Update filter parameters when config changes
  useEffect(() => {
    if (!config.audioEnabled) return;
    
    simulationRef.current.balls.forEach(ball => {
      updateBallFilter(ball);
    });
  }, [config.filterQ, config.minFrequency, config.maxFrequency]);

  return (
    <div className="sandbox-container">
      <canvas 
        ref={canvasRef} 
        className="sandbox-canvas"
      />

      <button 
        className="controls-toggle"
        onClick={toggleControls}
      >
        {showControls ? 'Hide Controls' : 'Show Controls'}
      </button>
      
      {showControls && (
        <div className="controls-panel">
          <h3 className="controls-title">Simulation Controls</h3>
          
          <div className="control-group">
            <label className="control-label">
              Max Balls: {config.maxBalls}
              <input
                type="range"
                name="maxBalls"
                min="10"
                max="300"
                className="control-input"
                value={config.maxBalls}
                onChange={handleConfigChange}
              />
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Initial Balls: {config.initialBalls}
              <input
                type="range"
                name="initialBalls"
                min="1"
                max="50"
                className="control-input"
                value={config.initialBalls}
                onChange={handleConfigChange}
              />
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Max Spawns Per Collision: {config.maxSpawnPerCollision}
              <input
                type="range"
                name="maxSpawnPerCollision"
                min="1"
                max="10"
                className="control-input"
                value={config.maxSpawnPerCollision}
                onChange={handleConfigChange}
              />
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Ball Size Range: {config.minBallSize} - {config.maxBallSize}
              <div className="range-slider">
                {/* Track background */}
                <div className="range-track"></div>
                
                {/* Colored range between handles */}
                <div 
                  className="range-fill"
                  style={{ 
                    left: `${(config.minBallSize / 100) * 100}%`,
                    width: `${((config.maxBallSize - config.minBallSize) / 100) * 100}%`
                  }}
                ></div>
                
                {/* Min handle */}
                <div 
                  className="range-handle"
                  style={{
                    left: `${(config.minBallSize / 100) * 100}%`
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    
                    const startX = e.clientX;
                    const startMin = config.minBallSize;
                    const sliderWidth = e.currentTarget.parentElement.clientWidth;
                    
                    const handleMouseMove = (moveEvent) => {
                      const deltaX = moveEvent.clientX - startX;
                      const deltaPercent = deltaX / sliderWidth;
                      const newValue = Math.max(1, Math.min(config.maxBallSize - 1, Math.round(startMin + deltaPercent * 100)));
                      
                      setConfig(prev => ({
                        ...prev,
                        minBallSize: newValue
                      }));
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                ></div>
                
                {/* Max handle */}
                <div 
                  className="range-handle"
                  style={{
                    left: `${(config.maxBallSize / 100) * 100}%`
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    
                    const startX = e.clientX;
                    const startMax = config.maxBallSize;
                    const sliderWidth = e.currentTarget.parentElement.clientWidth;
                    
                    const handleMouseMove = (moveEvent) => {
                      const deltaX = moveEvent.clientX - startX;
                      const deltaPercent = deltaX / sliderWidth;
                      const newValue = Math.max(config.minBallSize + 1, Math.min(100, Math.round(startMax + deltaPercent * 100)));
                      
                      setConfig(prev => ({
                        ...prev,
                        maxBallSize: newValue
                      }));
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                ></div>
                
                {/* Value labels */}
                <div className="range-labels">
                  <span>1</span>
                  <span>100</span>
                </div>
              </div>
              <small className="control-hint">Drag the handles to set min and max ball sizes</small>
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Velocity Range: ±{config.maxVelocity}
              <input
                type="range"
                name="maxVelocity"
                min="1"
                max="15"
                className="control-input"
                value={config.maxVelocity}
                onChange={handleConfigChange}
              />
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Velocity: {config.velocity.toFixed(2)}
              <input
                type="range"
                name="velocity"
                min="0.01"
                max="2"
                step="0.01"
                className="control-input"
                value={config.velocity}
                onChange={handleConfigChange}
              />
              <small className="control-hint">Lower values = slower movement</small>
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              Trail Opacity: {config.trailOpacity.toFixed(2)}
              <input
                type="range"
                name="trailOpacity"
                min="0.01"
                max="0.99"
                step="0.01"
                className="control-input"
                value={config.trailOpacity}
                onChange={handleConfigChange}
              />
              <small className="control-hint">Low = long trails, High = short trails</small>
            </label>
          </div>
          
          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="pauseSimulation"
                className="checkbox-input"
                checked={config.pauseSimulation}
                onChange={handleConfigChange}
              />
              Pause Simulation
            </label>
          </div>
          
          <button 
            className="reset-button"
            onClick={resetSimulation}
          >
            Reset Simulation
          </button>
          
          <div className="stats-panel">
            <h4 className="stats-title">Stats</h4>
            <p>Ball Count: {stats.ballCount}</p>
            <p>Collisions: {stats.collisionCount}</p>
          </div>

          <div className="control-group">
            <h4>Audio Controls</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="audioEnabled"
                checked={config.audioEnabled}
                onChange={handleConfigChange}
              />
              Enable Audio
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="bypassFilters"
                checked={config.bypassFilters}
                onChange={handleConfigChange}
              />
              Bypass Ball Filters
            </label>
            
            <label className="control-label">
              Noise Type:
              <select
                name="noiseType"
                value={config.noiseType}
                onChange={handleConfigChange}
                className="control-input"
              >
                <option value="white">White Noise</option>
                <option value="pink">Pink Noise</option>
                <option value="brown">Brown Noise</option>
                <option value="blue">Blue Noise</option>
                <option value="violet">Violet Noise</option>
                <option value="lfsr">Digital LFSR Noise</option>
                <option value="velvet">Velvet Noise</option>
              </select>
            </label>

            <label className="control-label">
              Filter Q: {config.filterQ.toFixed(1)}
              <input
                type="range"
                name="filterQ"
                min="0.1"
                max="10.0"
                step="0.1"
                className="control-input"
                value={config.filterQ}
                onChange={handleConfigChange}
              />
              <small className="control-hint">Higher values = narrower frequency bands</small>
            </label>

            <div className="control-label">
              Frequency Range: {config.minFrequency}Hz - {config.maxFrequency}Hz
              <div className="range-slider">
                <input
                  type="range"
                  name="minFrequency"
                  min="20"
                  max={config.maxFrequency - 1}  // Prevent overlap
                  step="1"
                  className="range-input"
                  value={config.minFrequency}
                  onChange={handleConfigChange}
                />
                
                <input
                  type="range"
                  name="maxFrequency"
                  min={config.minFrequency + 1}  // Prevent overlap
                  max="20000"
                  step="1"
                  className="range-input"
                  value={config.maxFrequency}
                  onChange={handleConfigChange}
                />
              </div>
              <small className="control-hint">
                Current range: {config.maxFrequency - config.minFrequency}Hz
              </small>
            </div>
          </div>

          <div className="audio-status">
            <div className={`status-indicator ${config.audioEnabled ? 'active' : ''}`}>
              Audio {config.audioEnabled ? 'On' : 'Off'}
            </div>
            <div className={`status-indicator ${!config.bypassFilters ? 'active' : ''}`}>
              Filters {config.bypassFilters ? 'Bypassed' : 'Active'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sandbox;