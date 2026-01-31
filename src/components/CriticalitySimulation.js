import React, { useState, useRef, useEffect } from 'react';
import './CriticalitySimulation.css';
import PowerLawChart from './PowerLawChart';

function CriticalitySimulation() {
  // Configuration state
  const [config, setConfig] = useState({
    // Population
    maxBalls: 150,
    initialBalls: 40,
    minBallSize: 3,
    maxBallSize: 8,

    // Physics
    minVelocity: -2,
    maxVelocity: 2,
    velocity: 0.6,

    // Stress dynamics
    stressAccumRate: 0.003,
    criticalThreshold: 0.82,
    thresholdVariation: 0.12,

    // Cascade mechanics
    cascadeRadius: 120,
    energyTransfer: 0.65,
    stressReleaseAmount: 0.85,
    refractoryPeriod: 45,

    // Collision behavior
    collisionStressBoost: 0.08,

    // Visual
    trailOpacity: 0.12,
    showStressHeatmap: false,
    showCascadeConnections: true,
    showEventHistory: true,
    showHistogram: true,

    // Simulation control
    pauseSimulation: false,
    pauseOnLargeAvalanche: false,
    largeAvalancheThreshold: 25
  });

  // Statistics state
  const [stats, setStats] = useState({
    ballCount: 0,
    averageStress: 0,
    totalAvalanches: 0,
    largestAvalanche: 0,
    recentAvalancheSizes: [],
    avgAvalancheSize: 0,
    criticalBallsPercent: 0
  });

  // UI state
  const [showControls, setShowControls] = useState(true);

  // Simulation state (persistent across renders)
  const simulationRef = useRef({
    balls: [],
    canvas: null,
    ctx: null,
    activeAvalanche: null,
    avalancheEvents: [],
    tickCount: 0,
    totalAvalanches: 0,
    largestAvalanche: 0,
    animationId: null,
    currentConfig: null,
    Ball: null,
    recentEventMarkers: [] // For visual history
  });

  // Initialization effect
  useEffect(() => {
    const canvas = document.getElementById('criticality-canvas');
    const ctx = canvas.getContext('2d');

    const sim = simulationRef.current;
    sim.canvas = canvas;
    sim.ctx = ctx;
    sim.currentConfig = config;

    // Set canvas size
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // StressBall class definition
    class StressBall {
      constructor(x, y, velX, velY, size) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.origVelX = velX;
        this.origVelY = velY;
        this.size = size;

        // Stress properties
        this.stress = Math.random() * 0.3; // Start with low random stress
        this.stressCapacity = config.criticalThreshold +
          (Math.random() - 0.5) * config.thresholdVariation;
        this.stressAccumRate = config.stressAccumRate * (0.8 + Math.random() * 0.4);
        this.isAvalanching = false;
        this.refractoryTimer = 0;

        // Tracking
        this.totalAvalanchesTriggered = 0;
        this.totalAvalanchesReceived = 0;
        this.lastAvalancheTick = 0;

        // Visual
        this.updateColor();
        this.glowIntensity = 0;
      }

      updateColor() {
        // Deep blue/green (calm) → orange/red (critical)
        const stressRatio = this.stress / this.stressCapacity;

        if (this.refractoryTimer > 0) {
          // Post-avalanche: cool blue-gray
          const cooldown = this.refractoryTimer / sim.currentConfig.refractoryPeriod;
          const hue = 200 + cooldown * 20; // Blue range
          const saturation = 30 + cooldown * 20;
          const lightness = 40 + cooldown * 10;
          this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else if (stressRatio < 0.5) {
          // Low stress: deep blue-green
          const hue = 200 - stressRatio * 40; // 200° (cyan-blue) to 180° (cyan-green)
          const saturation = 60 + stressRatio * 20;
          const lightness = 35 + stressRatio * 10;
          this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else if (stressRatio < 0.8) {
          // Medium stress: green to yellow
          const normalizedStress = (stressRatio - 0.5) / 0.3;
          const hue = 160 - normalizedStress * 100; // 160° (green) to 60° (yellow)
          const saturation = 70 + normalizedStress * 20;
          const lightness = 45 + normalizedStress * 5;
          this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else {
          // High stress: yellow to orange to red
          const normalizedStress = (stressRatio - 0.8) / 0.2;
          const hue = 60 - normalizedStress * 50; // 60° (yellow) to 10° (orange-red)
          const saturation = 85 + normalizedStress * 15;
          const lightness = 50 + normalizedStress * 10;
          this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }

        // Calculate glow intensity for near-critical balls
        if (stressRatio > 0.85 && this.refractoryTimer === 0) {
          const proximity = (stressRatio - 0.85) / 0.15;
          this.glowIntensity = proximity * 25;
        } else {
          this.glowIntensity = 0;
        }
      }

      draw() {
        const ctx = sim.ctx;

        // Draw glow if near critical
        if (this.glowIntensity > 0) {
          const gradient = ctx.createRadialGradient(
            this.x, this.y, this.size,
            this.x, this.y, this.size + this.glowIntensity
          );
          gradient.addColorStop(0, this.color);
          gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size + this.glowIntensity, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw main ball
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();

        // Optional: Draw stress indicator ring for very high stress
        if (this.stress / this.stressCapacity > 0.95 && this.refractoryTimer === 0) {
          ctx.strokeStyle = 'rgba(255, 50, 0, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size + 2, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      update() {
        const cfg = sim.currentConfig;

        // Update velocity
        this.velX = this.origVelX * cfg.velocity;
        this.velY = this.origVelY * cfg.velocity;

        // Update position
        this.x += this.velX;
        this.y += this.velY;

        // Screen wrapping (toroidal topology)
        if (this.x - this.size > sim.canvas.width) {
          this.x = -this.size;
        } else if (this.x + this.size < 0) {
          this.x = sim.canvas.width + this.size;
        }

        if (this.y - this.size > sim.canvas.height) {
          this.y = -this.size;
        } else if (this.y + this.size < 0) {
          this.y = sim.canvas.height + this.size;
        }

        // Update refractory timer
        if (this.refractoryTimer > 0) {
          this.refractoryTimer--;
        }

        // Accumulate stress (if not in refractory period)
        if (this.refractoryTimer === 0 && !this.isAvalanching) {
          this.stress += this.stressAccumRate;
          this.stress = Math.min(this.stress, 1.2); // Allow slight overflow
        }

        // Update visual representation
        this.updateColor();
      }

      collisionDetect(balls) {
        const cfg = sim.currentConfig;

        for (let j = 0; j < balls.length; j++) {
          if (this === balls[j]) continue;

          const dx = this.x - balls[j].x;
          const dy = this.y - balls[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.size + balls[j].size) {
            // Add stress to both balls on collision
            this.stress += cfg.collisionStressBoost;
            balls[j].stress += cfg.collisionStressBoost;

            // Check if either ball exceeds threshold
            const thisCritical = this.stress >= this.stressCapacity && this.refractoryTimer === 0;
            const otherCritical = balls[j].stress >= balls[j].stressCapacity && balls[j].refractoryTimer === 0;

            if (thisCritical || otherCritical) {
              // Trigger avalanche from the more stressed ball
              const epicenter = thisCritical && (!otherCritical || this.stress > balls[j].stress)
                ? this
                : balls[j];
              initiateAvalanche(epicenter, balls);
            }

            break; // One collision per frame
          }
        }
      }
    }

    // Avalanche cascade algorithm
    function initiateAvalanche(epicenterBall, balls) {
      const cfg = sim.currentConfig;

      // Create avalanche event
      const avalanche = {
        epicenter: { x: epicenterBall.x, y: epicenterBall.y },
        affectedBalls: new Set([epicenterBall]),
        generation: new Map([[epicenterBall, 0]]),
        startTick: sim.tickCount,
        size: 1,
        maxGeneration: 0
      };

      sim.activeAvalanche = avalanche;

      // BFS queue for cascade propagation
      const queue = [epicenterBall];
      const visited = new Set([epicenterBall]);

      // Release stress from epicenter
      epicenterBall.stress *= (1 - cfg.stressReleaseAmount);
      epicenterBall.isAvalanching = true;
      epicenterBall.refractoryTimer = cfg.refractoryPeriod;
      epicenterBall.totalAvalanchesTriggered++;
      epicenterBall.lastAvalancheTick = sim.tickCount;

      // Propagate cascade
      while (queue.length > 0) {
        const currentBall = queue.shift();
        const currentGen = avalanche.generation.get(currentBall);
        avalanche.maxGeneration = Math.max(avalanche.maxGeneration, currentGen);

        // Find neighbors within cascade radius
        for (let ball of balls) {
          if (visited.has(ball)) continue;

          const dx = currentBall.x - ball.x;
          const dy = currentBall.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if within cascade radius
          if (distance <= cfg.cascadeRadius) {
            // Transfer stress energy
            const transferredStress = currentBall.stress * cfg.energyTransfer *
              (1 - distance / cfg.cascadeRadius); // Decay with distance
            ball.stress += transferredStress;

            // If neighbor exceeds threshold, add to cascade
            if (ball.stress >= ball.stressCapacity && ball.refractoryTimer === 0) {
              visited.add(ball);
              avalanche.affectedBalls.add(ball);
              avalanche.generation.set(ball, currentGen + 1);
              queue.push(ball);
              avalanche.size++;

              // Release stress and enter refractory period
              ball.stress *= (1 - cfg.stressReleaseAmount);
              ball.isAvalanching = true;
              ball.refractoryTimer = cfg.refractoryPeriod;
              ball.totalAvalanchesReceived++;
              ball.lastAvalancheTick = sim.tickCount;
            }
          }
        }

        // Mark current ball as processed
        currentBall.isAvalanching = false;
      }

      // Record event
      const eventRecord = {
        tick: avalanche.startTick,
        size: avalanche.size,
        duration: sim.tickCount - avalanche.startTick,
        epicenter: avalanche.epicenter,
        maxGeneration: avalanche.maxGeneration
      };

      sim.avalancheEvents.push(eventRecord);
      sim.totalAvalanches++;
      sim.largestAvalanche = Math.max(sim.largestAvalanche, avalanche.size);

      // Add visual marker
      if (cfg.showEventHistory && avalanche.size > 1) {
        sim.recentEventMarkers.push({
          x: avalanche.epicenter.x,
          y: avalanche.epicenter.y,
          size: avalanche.size,
          tick: sim.tickCount,
          maxAge: 180
        });
      }

      // Keep last 1000 events
      if (sim.avalancheEvents.length > 1000) {
        sim.avalancheEvents.shift();
      }

      // Auto-pause on large avalanche
      if (cfg.pauseOnLargeAvalanche && avalanche.size >= cfg.largeAvalancheThreshold) {
        setConfig(prev => ({ ...prev, pauseSimulation: true }));
      }

      // Clear active avalanche
      setTimeout(() => {
        sim.activeAvalanche = null;
      }, 100);
    }

    // Spawn balls helper
    function spawnBalls(count) {
      const cfg = sim.currentConfig;
      const balls = sim.balls;

      for (let i = 0; i < count; i++) {
        const size = random(cfg.minBallSize, cfg.maxBallSize);
        const x = random(size, sim.canvas.width - size);
        const y = random(size, sim.canvas.height - size);
        const velX = random(cfg.minVelocity, cfg.maxVelocity);
        const velY = random(cfg.minVelocity, cfg.maxVelocity);

        balls.push(new StressBall(x, y, velX, velY, size));
      }
    }

    // Random integer helper
    function random(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Store Ball class in simulation ref
    sim.Ball = StressBall;

    // Initialize balls
    spawnBalls(config.initialBalls);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sim.animationId) {
        cancelAnimationFrame(sim.animationId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Config update effect
  useEffect(() => {
    simulationRef.current.currentConfig = config;
  }, [config]);

  // Animation loop effect
  useEffect(() => {
    const sim = simulationRef.current;
    const ctx = sim.ctx;
    const canvas = sim.canvas;

    if (!ctx || !canvas) return;

    let frameCount = 0;

    function animate() {
      if (!config.pauseSimulation) {
        sim.tickCount++;

        // Clear canvas with trail effect
        ctx.fillStyle = `rgba(5, 15, 30, ${config.trailOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw event markers
        if (config.showEventHistory) {
          drawEventMarkers();
        }

        // Draw active cascade connections
        if (config.showCascadeConnections && sim.activeAvalanche) {
          drawCascadeConnections();
        }

        // Update and draw balls
        for (let ball of sim.balls) {
          ball.update();
          ball.draw();
        }

        // Collision detection
        for (let ball of sim.balls) {
          ball.collisionDetect(sim.balls);
        }

        // Update stats periodically
        frameCount++;
        if (frameCount % 30 === 0) {
          updateStats();
        }
      }

      sim.animationId = requestAnimationFrame(animate);
    }

    function drawEventMarkers() {
      sim.recentEventMarkers = sim.recentEventMarkers.filter(marker => {
        const age = sim.tickCount - marker.tick;
        if (age > marker.maxAge) return false;

        const alpha = 1 - (age / marker.maxAge);
        const radius = 5 + marker.size * 0.5;

        ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, radius + age * 0.3, 0, 2 * Math.PI);
        ctx.stroke();

        return true;
      });
    }

    function drawCascadeConnections() {
      const avalanche = sim.activeAvalanche;
      if (!avalanche || avalanche.affectedBalls.size === 0) return;

      ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
      ctx.lineWidth = 1;

      avalanche.affectedBalls.forEach(ball => {
        ctx.beginPath();
        ctx.moveTo(avalanche.epicenter.x, avalanche.epicenter.y);
        ctx.lineTo(ball.x, ball.y);
        ctx.stroke();
      });
    }

    function updateStats() {
      const balls = sim.balls;
      const totalStress = balls.reduce((sum, ball) => sum + ball.stress, 0);
      const avgStress = balls.length > 0 ? totalStress / balls.length : 0;

      const criticalBalls = balls.filter(ball =>
        ball.stress / ball.stressCapacity > 0.9
      ).length;
      const criticalPercent = balls.length > 0
        ? (criticalBalls / balls.length) * 100
        : 0;

      const recentSizes = sim.avalancheEvents.slice(-100).map(e => e.size);
      const avgSize = recentSizes.length > 0
        ? recentSizes.reduce((a, b) => a + b, 0) / recentSizes.length
        : 0;

      setStats({
        ballCount: balls.length,
        averageStress: avgStress,
        totalAvalanches: sim.totalAvalanches,
        largestAvalanche: sim.largestAvalanche,
        recentAvalancheSizes: recentSizes,
        avgAvalancheSize: avgSize,
        criticalBallsPercent: criticalPercent
      });
    }

    animate();

    return () => {
      if (sim.animationId) {
        cancelAnimationFrame(sim.animationId);
      }
    };
  }, [config.pauseSimulation, config.trailOpacity, config.showEventHistory,
      config.showCascadeConnections]);

  // Event handlers
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const resetSimulation = () => {
    const sim = simulationRef.current;
    sim.balls = [];
    sim.avalancheEvents = [];
    sim.recentEventMarkers = [];
    sim.tickCount = 0;
    sim.totalAvalanches = 0;
    sim.largestAvalanche = 0;
    sim.activeAvalanche = null;

    // Respawn balls
    const cfg = sim.currentConfig;
    for (let i = 0; i < cfg.initialBalls; i++) {
      const size = Math.floor(Math.random() * (cfg.maxBallSize - cfg.minBallSize + 1)) + cfg.minBallSize;
      const x = Math.floor(Math.random() * (sim.canvas.width - size * 2)) + size;
      const y = Math.floor(Math.random() * (sim.canvas.height - size * 2)) + size;
      const velX = Math.floor(Math.random() * (cfg.maxVelocity - cfg.minVelocity + 1)) + cfg.minVelocity;
      const velY = Math.floor(Math.random() * (cfg.maxVelocity - cfg.minVelocity + 1)) + cfg.minVelocity;

      sim.balls.push(new sim.Ball(x, y, velX, velY, size));
    }

    setStats({
      ballCount: cfg.initialBalls,
      averageStress: 0,
      totalAvalanches: 0,
      largestAvalanche: 0,
      recentAvalancheSizes: [],
      avgAvalancheSize: 0,
      criticalBallsPercent: 0
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key) {
        case ' ':
          e.preventDefault();
          setConfig(prev => ({ ...prev, pauseSimulation: !prev.pauseSimulation }));
          break;
        case 'r':
        case 'R':
          resetSimulation();
          break;
        case 'h':
        case 'H':
          toggleControls();
          break;
        case 'v':
        case 'V':
          setConfig(prev => ({
            ...prev,
            showCascadeConnections: !prev.showCascadeConnections
          }));
          break;
        case 'm':
        case 'M':
          setConfig(prev => ({
            ...prev,
            showStressHeatmap: !prev.showStressHeatmap
          }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch/Click controls for mobile and desktop
  useEffect(() => {
    const canvas = document.getElementById('criticality-canvas');
    if (!canvas) return;

    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300;

    const handleCanvasInteraction = (x, y) => {
      const sim = simulationRef.current;
      const balls = sim.balls;
      const interactionRadius = 80; // Radius around tap/click

      // Find balls within interaction radius
      const nearbyBalls = balls.filter(ball => {
        const dx = ball.x - x;
        const dy = ball.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= interactionRadius;
      });

      // Add stress to nearby balls
      nearbyBalls.forEach(ball => {
        ball.stress += 0.15; // Add significant stress

        // Visual feedback: temporary glow
        ball.glowIntensity = Math.max(ball.glowIntensity, 15);
      });

      // If no balls nearby, try to trigger avalanche on closest ball
      if (nearbyBalls.length === 0) {
        let closestBall = null;
        let closestDistance = Infinity;

        balls.forEach(ball => {
          const dx = ball.x - x;
          const dy = ball.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestBall = ball;
          }
        });

        if (closestBall && closestDistance < 200) {
          closestBall.stress += 0.2;
        }
      }
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const currentTime = new Date().getTime();
      const tapTimeDelta = currentTime - lastTapTime;

      // Double-click/tap: toggle pause
      if (tapTimeDelta < DOUBLE_TAP_DELAY) {
        setConfig(prev => ({ ...prev, pauseSimulation: !prev.pauseSimulation }));
        lastTapTime = 0;
      } else {
        // Single click: add stress
        handleCanvasInteraction(x, y);
        lastTapTime = currentTime;
      }
    };

    const handleTouch = (e) => {
      e.preventDefault(); // Prevent scrolling and zooming
      const rect = canvas.getBoundingClientRect();

      // Handle first touch point
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const currentTime = new Date().getTime();
        const tapTimeDelta = currentTime - lastTapTime;

        // Double-tap: toggle pause
        if (tapTimeDelta < DOUBLE_TAP_DELAY) {
          setConfig(prev => ({ ...prev, pauseSimulation: !prev.pauseSimulation }));
          lastTapTime = 0;
        } else {
          // Single tap: add stress
          handleCanvasInteraction(x, y);
          lastTapTime = currentTime;
        }
      }

      // Multi-touch: add stress at multiple points
      if (e.touches.length > 1) {
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          handleCanvasInteraction(x, y);
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch);

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="criticality-simulation">
      <canvas id="criticality-canvas"></canvas>

      {/* Histogram overlay */}
      {config.showHistogram && stats.recentAvalancheSizes.length > 10 && (
        <PowerLawChart
          data={stats.recentAvalancheSizes}
          totalEvents={stats.totalAvalanches}
          largestEvent={stats.largestAvalanche}
        />
      )}

      {/* Control toggle button */}
      <button
        className="toggle-controls-btn"
        onClick={toggleControls}
      >
        {showControls ? 'Hide Controls' : 'Show Controls'}
      </button>

      {/* Control panel */}
      {showControls && (
        <div className="control-panel">
          <h3>Criticality Controls</h3>

          <div className="control-section">
            <h4>Population</h4>
            <label>
              Initial Balls: {config.initialBalls}
              <input
                type="range"
                min="10"
                max="100"
                value={config.initialBalls}
                onChange={(e) => handleConfigChange('initialBalls', parseInt(e.target.value))}
              />
            </label>
          </div>

          <div className="control-section">
            <h4>Stress Dynamics</h4>
            <label>
              Accumulation Rate: {config.stressAccumRate.toFixed(4)}
              <input
                type="range"
                min="0.001"
                max="0.010"
                step="0.0005"
                value={config.stressAccumRate}
                onChange={(e) => handleConfigChange('stressAccumRate', parseFloat(e.target.value))}
              />
            </label>
            <label>
              Critical Threshold: {config.criticalThreshold.toFixed(2)}
              <input
                type="range"
                min="0.70"
                max="0.95"
                step="0.01"
                value={config.criticalThreshold}
                onChange={(e) => handleConfigChange('criticalThreshold', parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="control-section">
            <h4>Cascade Mechanics</h4>
            <label>
              Propagation Radius: {config.cascadeRadius}px
              <input
                type="range"
                min="50"
                max="250"
                value={config.cascadeRadius}
                onChange={(e) => handleConfigChange('cascadeRadius', parseInt(e.target.value))}
              />
            </label>
            <label>
              Energy Transfer: {(config.energyTransfer * 100).toFixed(0)}%
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={config.energyTransfer}
                onChange={(e) => handleConfigChange('energyTransfer', parseFloat(e.target.value))}
              />
            </label>
            <label>
              Stress Release: {(config.stressReleaseAmount * 100).toFixed(0)}%
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={config.stressReleaseAmount}
                onChange={(e) => handleConfigChange('stressReleaseAmount', parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="control-section">
            <h4>Visualization</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.showCascadeConnections}
                onChange={(e) => handleConfigChange('showCascadeConnections', e.target.checked)}
              />
              Show cascade connections
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.showEventHistory}
                onChange={(e) => handleConfigChange('showEventHistory', e.target.checked)}
              />
              Show event history
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.showHistogram}
                onChange={(e) => handleConfigChange('showHistogram', e.target.checked)}
              />
              Show histogram
            </label>
          </div>

          <div className="control-section">
            <h4>Auto-Pause</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.pauseOnLargeAvalanche}
                onChange={(e) => handleConfigChange('pauseOnLargeAvalanche', e.target.checked)}
              />
              Pause on large avalanche
            </label>
            {config.pauseOnLargeAvalanche && (
              <label>
                Threshold: {config.largeAvalancheThreshold} balls
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={config.largeAvalancheThreshold}
                  onChange={(e) => handleConfigChange('largeAvalancheThreshold', parseInt(e.target.value))}
                />
              </label>
            )}
          </div>

          <div className="control-actions">
            <button onClick={resetSimulation}>Reset</button>
            <button onClick={() => handleConfigChange('pauseSimulation', !config.pauseSimulation)}>
              {config.pauseSimulation ? '▶ Play' : '⏸ Pause'}
            </button>
          </div>

          <div className="stats-panel">
            <h4>Statistics</h4>
            <div className="stat">Balls: {stats.ballCount}</div>
            <div className="stat">Avg Stress: {stats.averageStress.toFixed(2)}</div>
            <div className="stat">Critical: {stats.criticalBallsPercent.toFixed(1)}%</div>
            <div className="stat">Total Avalanches: {stats.totalAvalanches}</div>
            <div className="stat">Largest: {stats.largestAvalanche} balls</div>
            <div className="stat">Avg Size: {stats.avgAvalancheSize.toFixed(1)} balls</div>
          </div>

          <div className="keyboard-shortcuts">
            <small>
              <strong>Keyboard:</strong> Space=Play/Pause | R=Reset | H=Hide | V=Cascade Viz
            </small>
            <small>
              <strong>Touch/Click:</strong> Tap ball=Add stress | Double-tap=Play/Pause
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

export default CriticalitySimulation;
