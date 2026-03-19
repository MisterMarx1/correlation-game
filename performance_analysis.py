#!/usr/bin/env python3
"""
Performance Analysis of CORRELATION Game
Analyzing computational complexity and memory usage patterns
"""

import time
import math
import random
from collections import defaultdict
import tracemalloc
import sys

# Game constants from the source
COLS = 8
ROWS = 10
MAX_E = 5
K = 1
DECAY_BASE = 14000
DECAY_MIN = 4500
SPAWN_BASE = 2400
SPAWN_MIN = 800
ECHO_DUR = 2500
ECHO_BOOST = 0.25

class PerformanceAnalyzer:
    def __init__(self):
        self.results = {}
        self.memory_snapshots = []
        
    def empty_cell(self):
        return {"e": 0, "mass": 0, "born": 0, "decay": 0, "locked": False}
    
    def mk_grid(self):
        return [[self.empty_cell() for _ in range(COLS)] for _ in range(ROWS)]
    
    def mk_cell(self, level, now):
        max_e = min(2 + math.floor(level / 2), MAX_E)
        return {
            "e": 1 + math.floor(random.random() * max_e),
            "mass": 1 + math.floor(random.random() * 3),
            "born": now,
            "decay": now + max(DECAY_MIN, DECAY_BASE - level * 500),
            "locked": False
        }
    
    def corr_prob(self, r):
        """Correlation probability function from source"""
        if r < 0.5: return 0.98
        if r < 1.0: return 0.90
        if r < 1.5: return 0.80
        if r < 2.0: return 0.70
        if r < 3.0: return 0.55
        return max(0.25, 0.70 - r * 0.05)
    
    def recoil_p(self, M, dE):
        """Recoil momentum function from source"""
        return math.sqrt(2 * M * dE + dE * dE) / K
    
    def gen_bolt(self, x1, y1, x2, y2, d=0):
        """Lightning bolt generation - recursive function"""
        segs = []
        dx, dy = x2 - x1, y2 - y1
        dist = math.sqrt(dx * dx + dy * dy)
        
        if dist < 8 or d > 3:
            segs.extend([x1, y1, x2, y2, max(0.5, 3 - d * 0.8), max(0.3, 1 - d * 0.25)])
            return segs
        
        jit = (random.random() - 0.5) * dist * 0.35
        nx, ny = -dy / dist, dx / dist
        jx, jy = x1 + dx * 0.5 + nx * jit, y1 + dy * 0.5 + ny * jit
        
        segs.extend(self.gen_bolt(x1, y1, jx, jy, d))
        segs.extend(self.gen_bolt(jx, jy, x2, y2, d))
        
        if d < 2 and random.random() < 0.4:
            a = math.atan2(dy, dx) + (random.random() - 0.5) * 1.2
            l = dist * (0.2 + random.random() * 0.3)
            segs.extend(self.gen_bolt(jx, jy, jx + math.cos(a) * l, jy + math.sin(a) * l, d + 1))
        
        return segs
    
    def mk_particles(self, cx, cy, n, col):
        """Particle generation"""
        colors = {
            "#93c5fd": [147, 197, 253], "#67e8f9": [103, 232, 249],
            "#6ee7b7": [110, 231, 183], "#fcd34d": [252, 211, 77],
            "#e879f9": [232, 121, 249]
        }
        rgb = colors.get(col, [255, 255, 255])
        out = []
        now = time.time() * 1000
        
        for i in range(n):
            a = random.random() * 6.283
            sp = 20 + random.random() * 40
            out.append({
                "x": cx, "y": cy,
                "vx": math.cos(a) * sp, "vy": math.sin(a) * sp,
                "life": 300 + random.random() * 500,
                "born": now,
                "r": rgb[0], "g": rgb[1], "b": rgb[2],
                "size": 1.5 + random.random() * 2.5
            })
        return out
    
    def get_dets(self, grid, sx, sy, echo_map):
        """Get detection targets - O(n²) operation"""
        src = grid[sy][sx]
        if src["e"] <= 0:
            return []
        
        dE = src["e"]
        ds = []
        
        for y in range(ROWS):
            for x in range(COLS):
                if x == sx and y == sy:
                    continue
                d = grid[y][x]
                if d["e"] <= 0 or d["e"] < dE:
                    continue
                
                r = math.sqrt((x - sx) ** 2 + (y - sy) ** 2)
                p = self.corr_prob(r)
                p = min(0.98, p + echo_map[y * COLS + x])
                ds.append({"x": x, "y": y, "prob": p, "r": r, "dE": dE})
        
        return sorted(ds, key=lambda x: x["prob"], reverse=True)
    
    def echo_map_calculation(self, echoes, now):
        """Echo map calculation - O(echoes * grid_size)"""
        m = [0.0] * (ROWS * COLS)
        
        for echo in echoes:
            age = now - echo["time"]
            if age >= ECHO_DUR:
                continue
            
            fade = 1 - (age / ECHO_DUR)
            for y in range(ROWS):
                for x in range(COLS):
                    r = math.sqrt((x - echo["x"]) ** 2 + (y - echo["y"]) ** 2)
                    if r < 4:
                        m[y * COLS + x] += ECHO_BOOST * (1 - r / 4) * fade
        
        return m
    
    def simulate_game_state(self, level, fill_percentage):
        """Simulate game state at specific level and fill percentage"""
        grid = self.mk_grid()
        now = time.time() * 1000
        
        # Fill grid to specified percentage
        total_cells = ROWS * COLS
        filled_cells = int(total_cells * fill_percentage)
        
        for _ in range(filled_cells):
            x, y = random.randint(0, COLS - 1), random.randint(0, ROWS - 1)
            while grid[y][x]["e"] > 0:
                x, y = random.randint(0, COLS - 1), random.randint(0, ROWS - 1)
            grid[y][x] = self.mk_cell(level, now)
        
        # Add some echoes
        echoes = []
        for _ in range(min(10, filled_cells // 5)):
            echoes.append({
                "x": random.randint(0, COLS - 1),
                "y": random.randint(0, ROWS - 1),
                "time": now - random.random() * ECHO_DUR
            })
        
        return grid, echoes
    
    def benchmark_operations(self, grid, echoes, particles, bolts):
        """Benchmark key game operations"""
        results = {}
        now = time.time() * 1000
        
        # 1. Echo Map Calculation
        tracemalloc.start()
        start = time.perf_counter()
        echo_map = self.echo_map_calculation(echoes, now)
        echo_time = time.perf_counter() - start
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        results["echo_map"] = {"time": echo_time, "memory": current}
        
        # 2. Detection Map Calculation (for each filled cell)
        start = time.perf_counter()
        det_maps = []
        for y in range(ROWS):
            for x in range(COLS):
                if grid[y][x]["e"] > 0:
                    dets = self.get_dets(grid, x, y, echo_map)
                    det_maps.append(dets)
        det_time = time.perf_counter() - start
        results["detection_maps"] = {"time": det_time, "count": len(det_maps)}
        
        # 3. Lightning Bolt Generation
        start = time.perf_counter()
        bolt_segments = []
        for i in range(min(20, len(det_maps))):  # Simulate active bolts
            if det_maps and random.random() < 0.3:
                source = random.choice([(x, y) for y in range(ROWS) for x in range(COLS) if grid[y][x]["e"] > 0])
                target = random.choice([(d["x"], d["y"]) for d in det_maps[random.randint(0, len(det_maps)-1)]])
                segs = self.gen_bolt(source[0], source[1], target[0], target[1])
                bolt_segments.append(segs)
        bolt_time = time.perf_counter() - start
        results["bolt_generation"] = {"time": bolt_time, "segments": sum(len(s)//6 for s in bolt_segments)}
        
        # 4. Particle System Update
        start = time.perf_counter()
        updated_particles = []
        for p in particles:
            age = now - p["born"]
            if age < p["life"]:
                t = age / p["life"]
                px = p["x"] + p["vx"] * t
                py = p["y"] + p["vy"] * t
                updated_particles.append(p)
        particle_time = time.perf_counter() - start
        results["particle_update"] = {"time": particle_time, "count": len(updated_particles)}
        
        # 5. Grid Operations (decay check)
        start = time.perf_counter()
        decayed_cells = []
        for y in range(ROWS):
            for x in range(COLS):
                cell = grid[y][x]
                if cell["e"] > 0 and cell["decay"] > 0 and now > cell["decay"]:
                    decayed_cells.append((x, y))
        grid_time = time.perf_counter() - start
        results["grid_operations"] = {"time": grid_time, "decayed": len(decayed_cells)}
        
        return results
    
    def run_performance_analysis(self):
        """Run comprehensive performance analysis across game progression"""
        print("=== CORRELATION GAME PERFORMANCE ANALYSIS ===\n")
        
        # Test scenarios: different levels and fill percentages
        scenarios = [
            (1, 0.2), (1, 0.4), (1, 0.6), (1, 0.8),  # Level 1, various fills
            (5, 0.4), (5, 0.6), (5, 0.8),           # Level 5, various fills
            (10, 0.6), (10, 0.8), (10, 0.9),        # Level 10, various fills
            (20, 0.8), (20, 0.9), (20, 0.95),       # Level 20, various fills
        ]
        
        all_results = {}
        
        for level, fill_pct in scenarios:
            print(f"Testing Level {level}, {fill_pct*100:.0f}% fill...")
            
            # Simulate game state
            grid, echoes = self.simulate_game_state(level, fill_pct)
            
            # Simulate particle count based on activity
            particle_count = int(fill_pct * 50)  # More particles as game progresses
            particles = [self.mk_particles(100, 100, 5, "#67e8f9")[0] for _ in range(particle_count)]
            
            # Benchmark operations
            results = self.benchmark_operations(grid, echoes, particles, [])
            
            # Store results
            key = f"L{level}_F{fill_pct*100:.0f}"
            all_results[key] = {
                "level": level,
                "fill_pct": fill_pct,
                "filled_cells": sum(1 for row in grid for cell in row if cell["e"] > 0),
                "echoes": len(echoes),
                "particles": len(particles),
                **results
            }
        
        return all_results
    
    def analyze_bottlenecks(self, results):
        """Analyze results to identify performance bottlenecks"""
        print("\n=== PERFORMANCE BOTTLENECK ANALYSIS ===\n")
        
        # Sort by fill percentage (game progression)
        sorted_results = sorted(results.items(), key=lambda x: x[1]["fill_pct"])
        
        print("Game Progression | Echo Map | Detection | Bolts | Particles | Grid Ops")
        print("-" * 70)
        
        for key, data in sorted_results:
            fill_str = f"{data['fill_pct']*100:.0f}%"
            echo_str = f"{data['echo_map']['time']*1000:.3f}ms"
            det_str = f"{data['detection_maps']['time']*1000:.3f}ms"
            bolt_str = f"{data['bolt_generation']['time']*1000:.3f}ms"
            part_str = f"{data['particle_update']['time']*1000:.3f}ms"
            grid_str = f"{data['grid_operations']['time']*1000:.3f}ms"
            
            print(f"{fill_str:>14} | {echo_str:>8} | {det_str:>8} | {bolt_str:>5} | {part_str:>8} | {grid_str:>8}")
        
        print("\n=== COMPLEXITY ANALYSIS ===\n")
        
        # Analyze scaling patterns
        fill_progression = [data["fill_pct"] for _, data in sorted_results]
        echo_times = [data["echo_map"]["time"] * 1000 for _, data in sorted_results]
        det_times = [data["detection_maps"]["time"] * 1000 for _, data in sorted_results]
        particle_times = [data["particle_update"]["time"] * 1000 for _, data in sorted_results]
        
        print("Echo Map Scaling:")
        for i in range(1, len(fill_progression)):
            if i > 0:
                ratio = echo_times[i] / echo_times[i-1] if echo_times[i-1] > 0 else 1
                fill_ratio = fill_progression[i] / fill_progression[i-1]
                print(f"  {fill_progression[i]*100:.0f}% -> {fill_progression[i-1]*100:.0f}%: {ratio:.2f}x time (fill ratio: {fill_ratio:.2f}x)")
        
        print("\nDetection Map Scaling:")
        for i in range(1, len(fill_progression)):
            if i > 0:
                ratio = det_times[i] / det_times[i-1] if det_times[i-1] > 0 else 1
                fill_ratio = fill_progression[i] / fill_progression[i-1]
                cells_ratio = sorted_results[i][1]["filled_cells"] / sorted_results[i-1][1]["filled_cells"]
                print(f"  {fill_progression[i]*100:.0f}% -> {fill_progression[i-1]*100:.0f}%: {ratio:.2f}x time (cells ratio: {cells_ratio:.2f}x)")
        
        print("\nParticle System Scaling:")
        for i in range(1, len(fill_progression)):
            if i > 0:
                ratio = particle_times[i] / particle_times[i-1] if particle_times[i-1] > 0 else 1
                particle_ratio = sorted_results[i][1]["particles"] / sorted_results[i-1][1]["particles"]
                print(f"  {fill_progression[i]*100:.0f}% -> {fill_progression[i-1]*100:.0f}%: {ratio:.2f}x time (particle ratio: {particle_ratio:.2f}x)")
    
    def predict_slowdown_causes(self, results):
        """Predict likely causes of slowdowns based on performance data"""
        print("\n=== SLOWDOWN PREDICTION ===\n")
        
        # Find worst performers
        sorted_by_total_time = sorted(results.items(), key=lambda x: sum([
            x[1]["echo_map"]["time"],
            x[1]["detection_maps"]["time"],
            x[1]["bolt_generation"]["time"],
            x[1]["particle_update"]["time"],
            x[1]["grid_operations"]["time"]
        ]), reverse=True)
        
        print("Top 5 Most Expensive Game States:")
        for i, (key, data) in enumerate(sorted_by_total_time[:5]):
            total_time = sum([
                data["echo_map"]["time"],
                data["detection_maps"]["time"],
                data["bolt_generation"]["time"],
                data["particle_update"]["time"],
                data["grid_operations"]["time"]
            ]) * 1000
            
            print(f"{i+1}. Level {data['level']}, {data['fill_pct']*100:.0f}% fill: {total_time:.3f}ms total")
            
            # Break down by operation
            echo_pct = (data["echo_map"]["time"] / total_time * 1000) * 100
            det_pct = (data["detection_maps"]["time"] / total_time * 1000) * 100
            bolt_pct = (data["bolt_generation"]["time"] / total_time * 1000) * 100
            part_pct = (data["particle_update"]["time"] / total_time * 1000) * 100
            grid_pct = (data["grid_operations"]["time"] / total_time * 1000) * 100
            
            print(f"   Echo: {echo_pct:.1f}%, Detection: {det_pct:.1f}%, Bolts: {bolt_pct:.1f}%, Particles: {part_pct:.1f}%, Grid: {grid_pct:.1f}%")
        
        print("\n=== LIKELY SLOWDOWN CAUSES ===\n")
        
        # Analyze patterns
        high_fill_states = [data for _, data in results.items() if data["fill_pct"] > 0.7]
        if high_fill_states:
            avg_echo_time = sum(d["echo_map"]["time"] for d in high_fill_states) / len(high_fill_states) * 1000
            avg_det_time = sum(d["detection_maps"]["time"] for d in high_fill_states) / len(high_fill_states) * 1000
            avg_particle_time = sum(d["particle_update"]["time"] for d in high_fill_states) / len(high_fill_states) * 1000
            
            print(f"High Fill States (>70%):")
            print(f"  Average Echo Map Time: {avg_echo_time:.3f}ms")
            print(f"  Average Detection Time: {avg_det_time:.3f}ms")
            print(f"  Average Particle Time: {avg_particle_time:.3f}ms")
            
            # Identify bottlenecks
            if avg_echo_time > 0.5:
                print(f"  ⚠️  ECHO MAP is a bottleneck at high fill levels")
            if avg_det_time > 2.0:
                print(f"  ⚠️  DETECTION MAP is a bottleneck at high fill levels")
            if avg_particle_time > 1.0:
                print(f"  ⚠️  PARTICLE SYSTEM is a bottleneck at high fill levels")
        
        print("\n=== RECOMMENDATIONS ===\n")
        print("1. Echo Map Optimization:")
        print("   - Use spatial partitioning for echo calculations")
        print("   - Limit echo radius or use distance-based LOD")
        print("   - Cache echo maps between frames when possible")
        
        print("\n2. Detection Map Optimization:")
        print("   - Only calculate for selected cell, not all cells")
        print("   - Use distance cutoffs to reduce calculation area")
        print("   - Pre-calculate distance matrices")
        
        print("\n3. Particle System Optimization:")
        print("   - Implement particle pooling/recycling")
        print("   - Use object pooling for frequent creation/destruction")
        print("   - Reduce particle count at high fill levels")
        
        print("\n4. General Optimizations:")
        print("   - Use requestAnimationFrame throttling")
        print("   - Implement level-of-detail for visual effects")
        print("   - Consider web workers for heavy calculations")

if __name__ == "__main__":
    analyzer = PerformanceAnalyzer()
    results = analyzer.run_performance_analysis()
    analyzer.analyze_bottlenecks(results)
    analyzer.predict_slowdown_causes(results)
