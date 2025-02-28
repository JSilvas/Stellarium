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

	// Add constants for screen wrapping
	const [config, setConfig] = useState({
		maxBalls: 100,
		initialBalls: 20,
		maxSpawnPerCollision: 5,
		minBallSize: 1,
		maxBallSize: 50,
		minVelocity: -7,
		maxVelocity: 7,
		velocity: 0.30, // To slow down movement
		trailOpacity: 0.30, // Background opacity for trails
		pauseSimulation: false
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
		const newValue = type === 'checkbox' ? checked : Number(value);
		
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
		sim.balls = [];
		sim.collisionCounter = 0;
		sim.processedIndices.clear();
		sim.spawnBalls(config.initialBalls);
		setStats({
		ballCount: sim.balls.length,
		collisionCount: 0
		});
	};

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
			</div>
		)}
		</div>
	);
};

export default Sandbox;