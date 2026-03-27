#!/usr/bin/env node

/**
 * MisterMarx.com Games Launcher with Performance Monitoring
 * 
 * Features:
 * - Auto-discovery of game index files
 * - Interactive game selection
 * - Live server with FPS overlay
 * - Performance monitoring dashboard
 * - Terminal reporting
 * - System resource tracking
 */


// cd c:/coding/correlation/correlation-game
// npm install
// npm start

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const open = require('open');

class GameLauncher {
    constructor() {
        this.games = [];
        this.selectedGame = null;
        this.server = null;
        this.ws = null;
        this.performanceData = {
            fps: [],
            memory: [],
            timing: [],
            network: []
        };
        this.startTime = Date.now();
    }

    // Auto-discover game index files
    discoverGames() {
        const gameDirs = [
            { name: 'CORRELATION', path: './correlation/index.html', icon: '⚛️' },
            { name: 'MATH IN SPACE', path: './mathInSpace/index.html', icon: '🚀' },
            { name: 'SIGMA PRIME', path: './sigmaPrime/index.html', icon: 'Σ' },
            { name: 'GAME HUB', path: './game-selection.html', icon: '🎮' },
            { name: 'ABOUT GAMES', path: './index.html', icon: '📚' }
        ];

        this.games = gameDirs.filter(game => {
            const exists = fs.existsSync(game.path);
            if (exists) {
                const stats = fs.statSync(game.path);
                game.size = (stats.size / 1024).toFixed(1) + ' KB';
                game.modified = stats.mtime.toLocaleDateString();
            }
            return exists;
        });

        console.log(`🎮 Discovered ${this.games.length} games:`);
        return this.games.length > 0;
    }

    // Display interactive menu
    showMenu() {
        console.log('\n' + '='.repeat(60));
        console.log('🎮 MISTERMARX.COM GAMES LAUNCHER');
        console.log('='.repeat(60));
        
        this.games.forEach((game, index) => {
            console.log(`${index + 1}. ${game.icon} ${game.name}`);
            console.log(`   📁 ${game.path}`);
            console.log(`   📊 ${game.size} • Modified: ${game.modified}`);
            console.log('');
        });

        console.log('0. 🚪 Exit');
        console.log('\nSelect a game (0-' + this.games.length + '):');
    }

    // Handle user selection
    async handleSelection(choice) {
        const index = parseInt(choice) - 1;
        
        if (choice === '0') {
            console.log('👋 Goodbye!');
            process.exit(0);
        }

        if (index >= 0 && index < this.games.length) {
            this.selectedGame = this.games[index];
            console.log(`\n🎯 Launching: ${this.selectedGame.name}`);
            await this.launchGame();
        } else {
            console.log('❌ Invalid selection. Please try again.');
            this.showMenu();
        }
    }

    // Create performance monitoring overlay HTML
    createOverlayHTML() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                #perf-overlay {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.85);
                    color: #0f0;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 999999;
                    min-width: 200px;
                    backdrop-filter: blur(5px);
                    border: 1px solid #333;
                }
                #perf-overlay .fps { color: #0f0; }
                #perf-overlay .memory { color: #ff0; }
                #perf-overlay .timing { color: #0ff; }
                #perf-overlay .network { color: #f0f; }
                #perf-overlay .title { color: #fff; font-weight: bold; margin-bottom: 5px; }
                .perf-line { margin: 2px 0; }
                .perf-value { float: right; }
                #perf-controls {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.85);
                    color: #fff;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 999999;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                }
                button {
                    background: #333;
                    color: #fff;
                    border: 1px solid #666;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                button:hover { background: #555; }
            </style>
        </head>
        <body>
            <div id="perf-overlay">
                <div class="title">🎮 PERFORMANCE MONITOR</div>
                <div class="perf-line">
                    <span>FPS:</span>
                    <span class="fps perf-value" id="fps">60</span>
                </div>
                <div class="perf-line">
                    <span>Memory:</span>
                    <span class="memory perf-value" id="memory">0 MB</span>
                </div>
                <div class="perf-line">
                    <span>Load Time:</span>
                    <span class="timing perf-value" id="loadtime">0ms</span>
                </div>
                <div class="perf-line">
                    <span>Network:</span>
                    <span class="network perf-value" id="network">0 KB/s</span>
                </div>
                <div class="perf-line">
                    <span>Nodes:</span>
                    <span class="perf-value" id="nodes">0</span>
                </div>
            </div>
            <div id="perf-controls">
                <button onclick="toggleOverlay()">👁️ Toggle</button>
                <button onclick="resetStats()">🔄 Reset</button>
                <button onclick="exportData()">📊 Export</button>
            </div>
            <script>
                let frameCount = 0;
                let lastTime = performance.now();
                let fps = 60;
                let networkBytes = 0;
                let overlayVisible = true;

                // FPS calculation
                function calculateFPS() {
                    frameCount++;
                    const currentTime = performance.now();
                    const delta = currentTime - lastTime;
                    
                    if (delta >= 1000) {
                        fps = Math.round((frameCount * 1000) / delta);
                        document.getElementById('fps').textContent = fps + ' FPS';
                        frameCount = 0;
                        lastTime = currentTime;
                    }
                    
                    requestAnimationFrame(calculateFPS);
                }

                // Memory monitoring
                function updateMemory() {
                    if (performance.memory) {
                        const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
                        const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
                        document.getElementById('memory').textContent = used + '/' + total + ' MB';
                    }
                    setTimeout(updateMemory, 1000);
                }

                // Network monitoring
                function monitorNetwork() {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.transferSize) {
                                networkBytes += entry.transferSize;
                            }
                        }
                        const kbps = Math.round(networkBytes / 1024);
                        document.getElementById('network').textContent = kbps + ' KB/s';
                        networkBytes = 0;
                    });
                    observer.observe({ entryTypes: ['resource'] });
                }

                // DOM monitoring
                function updateNodes() {
                    const nodes = document.querySelectorAll('*').length;
                    document.getElementById('nodes').textContent = nodes;
                    setTimeout(updateNodes, 2000);
                }

                // Load time
                window.addEventListener('load', () => {
                    const loadTime = Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart);
                    document.getElementById('loadtime').textContent = loadTime + 'ms';
                });

                // Controls
                function toggleOverlay() {
                    overlayVisible = !overlayVisible;
                    document.getElementById('perf-overlay').style.display = overlayVisible ? 'block' : 'none';
                }

                function resetStats() {
                    networkBytes = 0;
                    frameCount = 0;
                    console.log('📊 Performance stats reset');
                }

                function exportData() {
                    const data = {
                        fps: fps,
                        memory: performance.memory ? {
                            used: performance.memory.usedJSHeapSize,
                            total: performance.memory.totalJSHeapSize
                        } : null,
                        nodes: document.querySelectorAll('*').length,
                        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                        timestamp: new Date().toISOString()
                    };
                    console.log('📊 Performance Data:', data);
                    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                }

                // Start monitoring
                calculateFPS();
                updateMemory();
                updateNodes();
                monitorNetwork();

                // WebSocket connection to terminal
                const ws = new WebSocket('ws://localhost:8081');
                ws.onopen = () => {
                    console.log('🔗 Connected to performance monitor');
                };
                
                setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'performance',
                            fps: fps,
                            memory: performance.memory ? performance.memory.usedJSHeapSize : 0,
                            nodes: document.querySelectorAll('*').length,
                            timestamp: Date.now()
                        }));
                    }
                }, 1000);
            </script>
        </body>
        </html>`;
    }

    // Inject performance monitoring into game HTML
    injectMonitoring(htmlContent) {
        const overlayHTML = this.createOverlayHTML();
        
        // Find a good place to inject the overlay
        const headEnd = htmlContent.indexOf('</head>');
        if (headEnd !== -1) {
            // Add overlay styles and script
            const injection = `
    <style>
        #perf-overlay {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 999999;
            min-width: 200px;
            backdrop-filter: blur(5px);
            border: 1px solid #333;
        }
        #perf-overlay .fps { color: #0f0; }
        #perf-overlay .memory { color: #ff0; }
        #perf-overlay .timing { color: #0ff; }
        #perf-overlay .network { color: #f0f; }
        #perf-overlay .title { color: #fff; font-weight: bold; margin-bottom: 5px; }
        .perf-line { margin: 2px 0; }
        .perf-value { float: right; }
        #perf-controls {
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            z-index: 999999;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        button {
            background: #333;
            color: #fff;
            border: 1px solid #666;
            padding: 5px 10px;
            margin: 2px;
            border-radius: 3px;
            cursor: pointer;
        }
        button:hover { background: #555; }
    </style>`;
            
            htmlContent = htmlContent.slice(0, headEnd) + injection + htmlContent.slice(headEnd);
        }

        // Add monitoring script before closing body tag
        const bodyEnd = htmlContent.indexOf('</body>');
        if (bodyEnd !== -1) {
            const monitoringScript = `
    <script>
        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 60;
        let networkBytes = 0;
        let overlayVisible = true;

        function calculateFPS() {
            frameCount++;
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            
            if (delta >= 1000) {
                fps = Math.round((frameCount * 1000) / delta);
                updateDisplay();
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(calculateFPS);
        }

        function updateDisplay() {
            const overlay = document.getElementById('perf-overlay');
            if (!overlay) {
                createOverlay();
                return;
            }
            
            overlay.querySelector('.fps').textContent = fps + ' FPS';
            
            if (performance.memory) {
                const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
                const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
                overlay.querySelector('.memory').textContent = used + '/' + total + ' MB';
            }
            
            const nodes = document.querySelectorAll('*').length;
            overlay.querySelector('#nodes').textContent = nodes;
        }

        function createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'perf-overlay';
            overlay.innerHTML = \`
                <div class="title">🎮 PERFORMANCE MONITOR</div>
                <div class="perf-line">
                    <span>FPS:</span>
                    <span class="fps perf-value">\${fps} FPS</span>
                </div>
                <div class="perf-line">
                    <span>Memory:</span>
                    <span class="memory perf-value">0 MB</span>
                </div>
                <div class="perf-line">
                    <span>Nodes:</span>
                    <span class="perf-value" id="nodes">0</span>
                </div>
            \`;
            document.body.appendChild(overlay);
        }

        function createControls() {
            const controls = document.createElement('div');
            controls.id = 'perf-controls';
            controls.innerHTML = \`
                <button onclick="toggleOverlay()">👁️ Toggle</button>
                <button onclick="exportData()">📊 Export</button>
            \`;
            document.body.appendChild(controls);
        }

        function toggleOverlay() {
            const overlay = document.getElementById('perf-overlay');
            if (overlay) {
                overlayVisible = !overlayVisible;
                overlay.style.display = overlayVisible ? 'block' : 'none';
            }
        }

        function exportData() {
            const data = {
                fps: fps,
                memory: performance.memory ? performance.memory.usedJSHeapSize : 0,
                nodes: document.querySelectorAll('*').length,
                timestamp: new Date().toISOString()
            };
            console.log('📊 Performance Data:', data);
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        }

        // Start monitoring
        calculateFPS();
        createControls();
        createOverlay();
        
        // Update memory periodically
        setInterval(updateDisplay, 1000);
    </script>`;
            
            htmlContent = htmlContent.slice(0, bodyEnd) + monitoringScript + htmlContent.slice(bodyEnd);
        }

        return htmlContent;
    }

    // Start live server with monitoring
    async launchGame() {
        const port = 3000;
        const wsPort = 8081;

        // Start WebSocket server for real-time data
        this.ws = new WebSocket.Server({ port: wsPort });
        
        this.ws.on('connection', (ws) => {
            console.log('🔗 Performance monitor connected');
            
            ws.on('message', (data) => {
                const perf = JSON.parse(data);
                this.updateTerminalDisplay(perf);
            });
        });

        // Create HTTP server
        this.server = http.createServer((req, res) => {
            if (req.url === '/') {
                const gamePath = path.resolve(this.selectedGame.path);
                let content = fs.readFileSync(gamePath, 'utf8');
                
                // Inject performance monitoring
                content = this.injectMonitoring(content);
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            } else {
                // Serve other files normally
                const filePath = path.join(path.dirname(this.selectedGame.path), req.url);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath);
                    const ext = path.extname(filePath);
                    const contentType = this.getContentType(ext);
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content);
                } else {
                    res.writeHead(404);
                    res.end('Not found');
                }
            }
        });

        // Start server
        this.server.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log(`📊 Performance monitor on ws://localhost:${wsPort}`);
            console.log(`🎮 Game: ${this.selectedGame.name}`);
            console.log('\n' + '='.repeat(60));
            console.log('📈 PERFORMANCE MONITORING ACTIVE');
            console.log('='.repeat(60));
            
            // Open browser
            open(`http://localhost:${port}`);
        });

        // System monitoring
        this.startSystemMonitoring();
    }

    getContentType(ext) {
        const types = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg'
        };
        return types[ext] || 'text/plain';
    }

    updateTerminalDisplay(perfData) {
        // Clear terminal and update display
        process.stdout.write('\x1B[2J\x1B[0f');
        
        console.log('🎮'.repeat(20));
        console.log(`📊 ${this.selectedGame.name} - LIVE PERFORMANCE`);
        console.log('🎮'.repeat(20));
        console.log(`⚡ FPS: ${perfData.fps}`);
        console.log(`💾 Memory: ${(perfData.memory / 1048576).toFixed(1)} MB`);
        console.log(`🌐 DOM Nodes: ${perfData.nodes}`);
        console.log(`⏱️  Uptime: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        console.log('\nPress Ctrl+C to stop monitoring');
    }

    startSystemMonitoring() {
        setInterval(() => {
            const usage = process.cpuUsage();
            const memUsage = process.memoryUsage();
            
            // You could add system-level monitoring here
            // For now, we rely on browser-side data
        }, 2000);
    }

    // Cleanup
    shutdown() {
        if (this.server) {
            this.server.close();
        }
        if (this.ws) {
            this.ws.close();
        }
        console.log('🛑 Server stopped');
    }
}

// Main execution
async function main() {
    const launcher = new GameLauncher();
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        launcher.shutdown();
        process.exit(0);
    });

    // Discover games
    if (!launcher.discoverGames()) {
        console.log('❌ No games found. Make sure you\'re in the correct directory.');
        process.exit(1);
    }

    // Show menu and handle input
    launcher.showMenu();
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (input) => {
        const choice = input.trim();
        await launcher.handleSelection(choice);
    });
}

// Check for required dependencies
try {
    require('ws');
    require('open');
} catch (error) {
    console.log('❌ Missing dependencies. Please run:');
    console.log('npm install ws open');
    process.exit(1);
}

// Run the launcher
main().catch(console.error);
