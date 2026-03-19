#!/usr/bin/env python3
"""
Code Pattern Analyzer for CORRELATION Game
Analyzes specific React patterns and their performance implications
"""

import re

class CodePatternAnalyzer:
    def __init__(self):
        self.source_file = "correlation/index.html"
        self.source_code = ""
        self.patterns = {}
        
    def load_source(self):
        """Load the source code"""
        try:
            with open(self.source_file, 'r', encoding='utf-8') as f:
                self.source_code = f.read()
            print(f"✅ Loaded source code ({len(self.source_code)} characters)")
        except FileNotFoundError:
            print(f"❌ Source file not found: {self.source_file}")
            return False
        return True
    
    def analyze_use_patterns(self):
        """Analyze React hook usage patterns"""
        print("\n🔍 REACT HOOK USAGE ANALYSIS")
        print("=" * 50)
        
        # Find all useState declarations
        useState_pattern = r'const\[(\w+)\]=useState\([^)]+\)'
        useState_matches = re.findall(useState_pattern, self.source_code)
        
        print(f"📊 useState declarations: {len(useState_matches)}")
        state_vars = []
        for var in useState_matches:
            if var not in state_vars:
                state_vars.append(var)
        
        print(f"   Unique state variables: {len(state_vars)}")
        
        # Categorize state variables by impact
        high_impact_states = ['grid', 'echoes', 'sel', 'dragStart', 'dragEnd', 'dragHover']
        medium_impact_states = ['score', 'level', 'combo', 'phase', 'paused']
        
        high_count = sum(1 for var in state_vars if any(state in var.lower() for state in high_impact_states))
        medium_count = sum(1 for var in state_vars if any(state in var.lower() for state in medium_impact_states))
        
        print(f"   High impact states: {high_count}")
        print(f"   Medium impact states: {medium_count}")
        
        # Find useCallback usage
        useCallback_pattern = r'useCallback\(\([^)]+\)\s*,\s*\[[^\]]*\]\)'
        useCallback_matches = re.findall(useCallback_pattern, self.source_code)
        print(f"\n📊 useCallback declarations: {len(useCallback_matches)}")
        
        # Find useMemo usage
        useMemo_pattern = r'useMemo\(\([^)]+\)\s*,\s*\[[^\]]*\]\)'
        useMemo_matches = re.findall(useMemo_pattern, self.source_code)
        print(f"📊 useMemo declarations: {len(useMemo_matches)}")
        
        return {
            'useState_count': len(useState_matches),
            'unique_states': len(state_vars),
            'high_impact_states': high_count,
            'useCallback_count': len(useCallback_matches),
            'useMemo_count': len(useMemo_matches)
        }
    
    def analyze_render_triggers(self):
        """Analyze what triggers re-renders"""
        print("\n🎯 RENDER TRIGGER ANALYSIS")
        print("=" * 50)
        
        # Find setState calls
        setState_pattern = r'set\w+\([^)]+\)'
        setState_matches = re.findall(setState_pattern, self.source_code)
        
        # Categorize by function
        trigger_functions = {}
        
        # Find function definitions and their setState calls
        function_pattern = r'(?:const|function)\s+(\w+)\s*[=\(]'
        functions = re.findall(function_pattern, self.source_code)
        
        for func in functions:
            # Find setState calls within each function
            func_start = self.source_code.find(f"const {func}=")
            if func_start == -1:
                func_start = self.source_code.find(f"function {func}")
            
            if func_start != -1:
                # Find next function or end
                next_func = len(self.source_code)
                for other_func in functions:
                    if other_func != func:
                        other_start = self.source_code.find(f"const {other_func}=", func_start + 1)
                        if other_start != -1 and other_start < next_func:
                            next_func = other_start
                
                func_code = self.source_code[func_start:next_func]
                set_calls = re.findall(setState_pattern, func_code)
                trigger_functions[func] = len(set_calls)
        
        # Sort by frequency
        sorted_triggers = sorted(trigger_functions.items(), key=lambda x: x[1], reverse=True)
        
        print("Top Render Trigger Functions:")
        for func, count in sorted_triggers[:10]:
            print(f"  {func}: {count} setState calls")
        
        return trigger_functions
    
    def analyze_complexity_patterns(self):
        """Analyze computational complexity patterns"""
        print("\n⚡ COMPUTATIONAL COMPLEXITY ANALYSIS")
        print("=" * 50)
        
        complexity_patterns = {
            "Nested Loops": {
                "pattern": r'for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)',
                "description": "O(n²) operations"
            },
            "Grid Iterations": {
                "pattern": r'for\s*\([^)]*ROWS[^)]*\)\s*{[^}]*for\s*\([^)]*COLS[^)]*\)',
                "description": "O(80) operations per iteration"
            },
            "Array.map with nested operations": {
                "pattern": r'\.map\([^)]*\)\s*\.map\(',
                "description": "O(n²) array operations"
            },
            "Recursive Functions": {
                "pattern": r'function\s+\w+\([^)]*\)\s*{[^}]*return\s+\w+\(',
                "description": "Exponential complexity risk"
            }
        }
        
        for pattern_name, info in complexity_patterns.items():
            matches = re.findall(info["pattern"], self.source_code, re.DOTALL)
            print(f"\n{pattern_name}: {len(matches)} instances")
            print(f"   {info['description']}")
            if matches:
                print(f"   ⚠️  Potential performance impact")
        
        # Specific analysis of key functions
        print("\n🔍 KEY FUNCTION ANALYSIS:")
        
        # Analyze getDets function
        getdets_pattern = r'const getDets=useCallback\(([^}]+)\},\[grid,echoMap\]\)'
        getdets_match = re.search(getdets_pattern, self.source_code, re.DOTALL)
        
        if getdets_match:
            getdets_code = getdets_match.group(1)
            nested_loops = len(re.findall(r'for\s*\([^)]+\)', getdets_code))
            print(f"getDets function: {nested_loops} nested loops → O(n²) complexity")
        
        # Analyze echoMap calculation
        echomap_pattern = r'const echoMap=useMemo\(([^}]+)\),\[echoes,tick\]\)'
        echomap_match = re.search(echomap_pattern, self.source_code, re.DOTALL)
        
        if echomap_match:
            echomap_code = echomap_match.group(1)
            nested_loops = len(re.findall(r'for\s*\([^)]+\)', echomap_code))
            print(f"echoMap calculation: {nested_loops} nested loops → O(echoes × grid) complexity")
    
    def analyze_memory_patterns(self):
        """Analyze memory allocation patterns"""
        print("\n💾 MEMORY ALLOCATION ANALYSIS")
        print("=" * 50)
        
        # Find array creation patterns
        array_patterns = {
            "Array.from": r'Array\.from\([^)]+\)',
            "Spread operator": r'\[\s*\.\.\.[^]]+\]',
            "New Array": r'new Array\([^)]+\)',
            "Push operations": r'\.push\([^)]+\)'
        }
        
        for pattern_name, pattern in array_patterns.items():
            matches = re.findall(pattern, self.source_code)
            print(f"{pattern_name}: {len(matches)} instances")
        
        # Find object creation patterns
        object_patterns = {
            "Object literals": r'\{[^}]*:[^}]*\}',
            "New objects": r'new\s+\w+\(',
            "Clone operations": r'\.cloneNode\(\)'
        }
        
        print("\nObject Creation Patterns:")
        for pattern_name, pattern in object_patterns.items():
            matches = re.findall(pattern, self.source_code)
            print(f"{pattern_name}: {len(matches)} instances")
        
        # Find potential memory leaks
        leak_patterns = {
            "Event listeners without cleanup": r'addEventListener\([^)]+\)',
            "setInterval without cleanup": r'setInterval\([^)]+\)',
            "setTimeout without cleanup": r'setTimeout\([^)]+\)'
        }
        
        print("\nPotential Memory Leaks:")
        for pattern_name, pattern in leak_patterns.items():
            matches = re.findall(pattern, self.source_code)
            cleanup_matches = re.findall(r'removeEventListener|clearInterval|clearTimeout', self.source_code)
            print(f"{pattern_name}: {len(matches)} instances, {len(cleanup_matches)} cleanups")
    
    def generate_optimization_recommendations(self):
        """Generate specific optimization recommendations"""
        print("\n🚀 OPTIMIZATION RECOMMENDATIONS")
        print("=" * 50)
        
        recommendations = [
            {
                "priority": "CRITICAL",
                "issue": "Detection Map O(n²) Complexity",
                "location": "getDets function in useMemo",
                "current_code": "Calculates for all cells every render",
                "solution": "Move to useCallback with sel dependency only",
                "expected_improvement": "40-60% render time reduction"
            },
            {
                "priority": "CRITICAL",
                "issue": "Echo Map Recalculation",
                "location": "echoMap useMemo",
                "current_code": "Recalculates entire grid on every echo",
                "solution": "Implement spatial partitioning or radius limiting",
                "expected_improvement": "50-70% echo calculation reduction"
            },
            {
                "priority": "HIGH",
                "issue": "Grid Re-renders",
                "location": "setGrid calls",
                "current_code": "Immutable grid updates trigger full re-render",
                "solution": "Implement grid virtualization or cell-level updates",
                "expected_improvement": "30-50% render reduction"
            },
            {
                "priority": "HIGH",
                "issue": "Drag State Fragmentation",
                "location": "Multiple drag state variables",
                "current_code": "dragStart, dragEnd, dragHover separate states",
                "solution": "Consolidate into single drag state object",
                "expected_improvement": "20-30% drag performance improvement"
            },
            {
                "priority": "MEDIUM",
                "issue": "Particle Memory Allocation",
                "location": "mkParticles function",
                "current_code": "Creates new particle objects frequently",
                "solution": "Implement object pooling for particles",
                "expected_improvement": "80% memory allocation reduction"
            }
        ]
        
        for rec in recommendations:
            print(f"\n🎯 {rec['priority']}: {rec['issue']}")
            print(f"   Location: {rec['location']}")
            print(f"   Current: {rec['current_code']}")
            print(f"   Solution: {rec['solution']}")
            print(f"   Expected: {rec['expected_improvement']}")
    
    def run_complete_analysis(self):
        """Run complete code analysis"""
        print("🔍 CORRELATION GAME CODE PATTERN ANALYSIS")
        print("=" * 70)
        
        if not self.load_source():
            return
        
        hook_analysis = self.analyze_use_patterns()
        trigger_analysis = self.analyze_render_triggers()
        self.analyze_complexity_patterns()
        self.analyze_memory_patterns()
        self.generate_optimization_recommendations()
        
        print("\n" + "=" * 70)
        print("📊 ANALYSIS SUMMARY")
        print("=" * 70)
        
        print(f"\n📈 Code Metrics:")
        print(f"   State variables: {hook_analysis['unique_states']}")
        print(f"   High impact states: {hook_analysis['high_impact_states']}")
        print(f"   useCallback hooks: {hook_analysis['useCallback_count']}")
        print(f"   useMemo hooks: {hook_analysis['useMemo_count']}")
        
        total_triggers = sum(trigger_analysis.values())
        print(f"   Total setState calls: {total_triggers}")
        
        print(f"\n⚡ Performance Risk Assessment:")
        if hook_analysis['high_impact_states'] > 5:
            print("   🔴 HIGH: Too many high-impact state variables")
        if hook_analysis['useCallback_count'] < 10:
            print("   🔴 HIGH: Insufficient useCallback optimization")
        if total_triggers > 50:
            print("   🔴 HIGH: Too many render triggers")
        
        print(f"\n🎯 Priority Actions:")
        print("   1. Optimize detection map calculation (CRITICAL)")
        print("   2. Implement echo map spatial optimization (CRITICAL)")
        print("   3. Add more useCallback for event handlers (HIGH)")
        print("   4. Consolidate drag state management (HIGH)")

if __name__ == "__main__":
    analyzer = CodePatternAnalyzer()
    analyzer.run_complete_analysis()
