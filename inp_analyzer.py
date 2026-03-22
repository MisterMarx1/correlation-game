#!/usr/bin/env python3
"""
INP (Interaction to Next Paint) Performance Analyzer for Web Applications

This script analyzes HTML/JavaScript files to identify potential INP issues:
- Long-running event handlers
- Heavy DOM manipulations
- Expensive animations
- Blocking operations
- State management bottlenecks
- Memory leaks patterns
"""

import re
import ast
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict

@dataclass
class INPIssue:
    """Represents a potential INP performance issue"""
    severity: str  # 'critical', 'high', 'medium', 'low'
    category: str  # 'event_handler', 'rendering', 'animation', 'memory', 'blocking'
    title: str
    description: str
    line_number: int
    code_snippet: str
    impact_score: int = field(default=0)  # 0-100
    recommendations: List[str] = field(default_factory=list)

@dataclass
class AnalysisResult:
    """Complete analysis results"""
    file_path: str
    total_issues: int = 0
    issues_by_severity: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    issues_by_category: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    issues: List[INPIssue] = field(default_factory=list)
    performance_score: int = 0  # 0-100 (higher is better)

class INPAnalyzer:
    """Main analyzer class for INP performance issues"""
    
    def __init__(self):
        self.issues: List[INPIssue] = []
        
        # Patterns that commonly cause INP issues
        self.problematic_patterns = {
            'heavy_dom_manipulation': [
                r'innerHTML\s*=',
                r'outerHTML\s*=',
                r'document\.write',
                r'\.appendChild\(',
                r'\.removeChild\(',
                r'\.insertBefore\(',
            ],
            'blocking_operations': [
                r'setTimeout\s*\(\s*[^,]+,\s*0\s*\)',  # setTimeout with 0ms
                r'setTimeout\s*\(\s*[^,]+,\s*1\s*\)',  # setTimeout with 1ms
                r'while\s*\(\s*true\s*\)',  # Infinite loops
                r'for\s*\(\s*.*\s*;\s*.*\s*;\s*.*\)\s*\{',  # Complex loops
            ],
            'expensive_calculations': [
                r'Math\.sqrt',
                r'Math\.pow',
                r'Math\.sin',
                r'Math\.cos',
                r'\.filter\(',
                r'\.map\(',
                r'\.reduce\(',
                r'\.forEach\(',
            ],
            'event_listeners': [
                r'addEventListener',
                r'on(click|mousedown|mouseup|touchstart|touchend|keydown|keyup)',
                r'onClick\s*=',
                r'onMouseDown\s*=',
                r'onTouchStart\s*=',
            ],
            'animations': [
                r'requestAnimationFrame',
                r'setInterval\s*\(',
                r'animation\s*:',
                r'transition\s*:',
                r'transform\s*:',
            ],
            'state_updates': [
                r'setState\s*\(',
                r'set[A-Z]\w*\s*\(',  # React setters
                r'dispatch\s*\(',
                r'reducer\s*\(',
            ]
        }
        
        # React-specific patterns
        self.react_patterns = {
            'use_effect_deps': r'useEffect\s*\(\s*\([^)]+\)\s*,\s*\[([^\]]*)\]',
            'heavy_rendering': [
                r'useState\s*\(',
                r'useMemo\s*\(',
                r'useCallback\s*\(',
            ],
            'context_usage': r'createContext|useContext',
        }
        
        # Performance anti-patterns
        self.anti_patterns = {
            'inline_functions': r'onClick\s*=\s*\(\s*\)\s*=>',
            'object_creation': r'style\s*=\s*\{',
            'array_creation': r'\[\s*\.\.\. ',
            'frequent_renders': r'useEffect\s*\(\s*\([^)]+\)\s*,\s*\[\s*\]',
        }

    def analyze_file(self, file_path: str) -> AnalysisResult:
        """Analyze a single file for INP issues"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        self.issues.clear()
        
        # Analyze different aspects
        self._analyze_event_handlers(content, lines)
        self._analyze_dom_manipulations(content, lines)
        self._analyze_animations(content, lines)
        self._analyze_blocking_operations(content, lines)
        self._analyze_memory_patterns(content, lines)
        self._analyze_react_patterns(content, lines)
        self._analyze_performance_anti_patterns(content, lines)
        
        # Calculate results
        result = self._calculate_results(file_path)
        return result

    def _analyze_event_handlers(self, content: str, lines: List[str]):
        """Analyze event handlers for performance issues"""
        for i, line in enumerate(lines, 1):
            # Check for heavy operations in event handlers
            if any(pattern in line for pattern in ['onClick', 'onMouseDown', 'onTouchStart']):
                # Look for expensive operations in the same function
                func_content = self._extract_function_content(lines, i-1)
                if func_content:
                    self._check_function_performance(func_content, i, 'event_handler')

    def _analyze_dom_manipulations(self, content: str, lines: List[str]):
        """Analyze DOM manipulation patterns"""
        for i, line in enumerate(lines, 1):
            for category, patterns in self.problematic_patterns.items():
                if category == 'heavy_dom_manipulation':
                    for pattern in patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            self.issues.append(INPIssue(
                                severity='high',
                                category='dom_manipulation',
                                title='Heavy DOM Manipulation Detected',
                                description=f'Potential blocking DOM operation: {pattern}',
                                line_number=i,
                                code_snippet=line.strip(),
                                impact_score=70,
                                recommendations=[
                                    'Use document fragments for batch operations',
                                    'Consider virtual scrolling for large lists',
                                    'Use CSS transforms instead of direct manipulation'
                                ]
                            ))

    def _analyze_animations(self, content: str, lines: List[str]):
        """Analyze animation performance"""
        for i, line in enumerate(lines, 1):
            if 'requestAnimationFrame' in line:
                # Check if animation loop is optimized
                func_content = self._extract_function_content(lines, i-1)
                if func_content and len(func_content.split('\n')) > 20:
                    self.issues.append(INPIssue(
                        severity='medium',
                        category='animation',
                        title='Complex Animation Loop',
                        description='Animation loop might be doing too much work per frame',
                        line_number=i,
                        code_snippet=line.strip(),
                        impact_score=50,
                        recommendations=[
                            'Move calculations outside animation loop',
                            'Use will-change CSS property for animated elements',
                            'Consider using Web Workers for heavy calculations'
                        ]
                    ))
            
            # Check for expensive CSS animations
            if any(prop in line for prop in ['animation:', 'transition:']) and 'transform' not in line:
                self.issues.append(INPIssue(
                    severity='medium',
                    category='animation',
                    title='Non-optimized CSS Animation',
                    description='Animation not using transform/opacity for better performance',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=40,
                    recommendations=[
                        'Use transform and opacity for smooth animations',
                        'Add will-change property for animated elements',
                        'Consider using CSS animations instead of JavaScript'
                    ]
                ))

    def _analyze_blocking_operations(self, content: str, lines: List[str]):
        """Analyze potentially blocking operations"""
        for i, line in enumerate(lines, 1):
            # Check for setTimeout with small delays
            if re.search(r'setTimeout\s*\(\s*[^,]+,\s*[01]\s*\)', line):
                self.issues.append(INPIssue(
                    severity='high',
                    category='blocking',
                    title='Potential Blocking setTimeout',
                    description='setTimeout with 0-1ms can block the main thread',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=60,
                    recommendations=[
                        'Use requestIdleCallback for non-critical work',
                        'Consider Web Workers for heavy computations',
                        'Batch operations and use larger timeouts'
                    ]
                ))
            
            # Check for complex loops
            if re.search(r'for\s*\([^}]*\}\s*for\s*\(', line) or 'while' in line:
                self.issues.append(INPIssue(
                    severity='medium',
                    category='blocking',
                    title='Complex Loop Detected',
                    description='Nested loops or complex iterations can block main thread',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=45,
                    recommendations=[
                        'Use break conditions to prevent infinite loops',
                        'Consider using Web Workers for heavy computations',
                        'Optimize algorithm complexity'
                    ]
                ))

    def _analyze_memory_patterns(self, content: str, lines: List[str]):
        """Analyze potential memory leaks"""
        for i, line in enumerate(lines, 1):
            # Check for missing cleanup
            if 'addEventListener' in line and 'removeEventListener' not in line:
                self.issues.append(INPIssue(
                    severity='high',
                    category='memory',
                    title='Potential Memory Leak',
                    description='addEventListener without corresponding removeEventListener',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=65,
                    recommendations=[
                        'Always remove event listeners in cleanup functions',
                        'Use useEffect cleanup in React',
                        'Consider using weak references for large objects'
                    ]
                ))
            
            # Check for large object creation
            if re.search(r'\[\s*\.\.\..*\]', line) or 'new Array(' in line:
                self.issues.append(INPIssue(
                    severity='medium',
                    category='memory',
                    title='Large Array Creation',
                    description='Creating large arrays can cause memory pressure',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=40,
                    recommendations=[
                        'Use typed arrays for better performance',
                        'Implement object pooling for frequently created objects',
                        'Consider lazy loading for large datasets'
                    ]
                ))

    def _analyze_react_patterns(self, content: str, lines: List[str]):
        """Analyze React-specific performance patterns"""
        for i, line in enumerate(lines, 1):
            # Check for useEffect with empty dependencies (runs every render)
            if re.search(r'useEffect\s*\(\s*\([^)]*\)\s*,\s*\[\s*\]', line):
                self.issues.append(INPIssue(
                    severity='critical',
                    category='rendering',
                    title='useEffect Running Every Render',
                    description='useEffect with empty dependency array runs on every render',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=80,
                    recommendations=[
                        'Add proper dependencies to useEffect',
                        'Consider useEffect cleanup for performance',
                        'Move expensive operations outside render cycle'
                    ]
                ))
            
            # Check for inline functions in props
            if re.search(r'onClick\s*=\s*\(\s*\)\s*=>', line):
                self.issues.append(INPIssue(
                    severity='medium',
                    category='rendering',
                    title='Inline Function in Props',
                    description='Inline functions cause unnecessary re-renders',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=35,
                    recommendations=[
                        'Use useCallback for event handlers',
                        'Define functions outside render method',
                        'Consider using memo for component optimization'
                    ]
                ))
            
            # Check for object creation in render
            if re.search(r'style\s*=\s*\{', line):
                self.issues.append(INPIssue(
                    severity='medium',
                    category='rendering',
                    title='Inline Style Object Creation',
                    description='Creating style objects in render causes re-renders',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=30,
                    recommendations=[
                        'Use useMemo for style objects',
                        'Define styles outside component',
                        'Consider CSS classes instead of inline styles'
                    ]
                ))

    def _analyze_performance_anti_patterns(self, content: str, lines: List[str]):
        """Analyze general performance anti-patterns"""
        for i, line in enumerate(lines, 1):
            # Check for synchronous operations
            if any(pattern in line for pattern in ['JSON.parse', 'JSON.stringify']) and line.count(';') > 2:
                self.issues.append(INPIssue(
                    severity='medium',
                    category='blocking',
                    title='Synchronous Heavy Operation',
                    description='Synchronous operation that might block main thread',
                    line_number=i,
                    code_snippet=line.strip(),
                    impact_score=45,
                    recommendations=[
                        'Use Web Workers for JSON operations',
                        'Batch operations and process asynchronously',
                        'Consider streaming for large data'
                    ]
                ))

    def _check_function_performance(self, func_content: str, line_num: int, category: str):
        """Check if a function has performance issues"""
        issues_in_func = 0
        
        # Count expensive operations
        expensive_ops = ['Math.sqrt', 'Math.pow', 'filter(', 'map(', 'reduce(']
        for op in expensive_ops:
            issues_in_func += func_content.count(op)
        
        # Check for loops
        issues_in_func += len(re.findall(r'for\s*\(', func_content))
        issues_in_func += len(re.findall(r'while\s*\(', func_content))
        
        if issues_in_func > 3:
            self.issues.append(INPIssue(
                severity='high' if issues_in_func > 5 else 'medium',
                category=category,
                title='Heavy Event Handler',
                description=f'Event handler contains {issues_in_func} expensive operations',
                line_number=line_num,
                code_snippet=func_content[:200] + '...' if len(func_content) > 200 else func_content,
                impact_score=min(80, issues_in_func * 15),
                recommendations=[
                    'Debounce or throttle event handlers',
                    'Move expensive operations out of event handlers',
                    'Use requestAnimationFrame for visual updates',
                    'Consider Web Workers for heavy computations'
                ]
            ))

    def _extract_function_content(self, lines: List[str], start_idx: int) -> Optional[str]:
        """Extract function content starting from a given line"""
        if start_idx >= len(lines):
            return None
        
        content = lines[start_idx]
        brace_count = content.count('{') - content.count('}')
        line_idx = start_idx + 1
        
        while brace_count > 0 and line_idx < len(lines):
            line = lines[line_idx]
            content += '\n' + line
            brace_count += line.count('{') - line.count('}')
            line_idx += 1
        
        return content if brace_count == 0 else None

    def _calculate_results(self, file_path: str) -> AnalysisResult:
        """Calculate final analysis results"""
        result = AnalysisResult(file_path=file_path)
        
        # Count issues by severity and category
        for issue in self.issues:
            result.issues_by_severity[issue.severity] += 1
            result.issues_by_category[issue.category] += 1
            result.total_issues += 1
        
        # Calculate performance score
        severity_weights = {'critical': 25, 'high': 15, 'medium': 8, 'low': 3}
        total_deduction = sum(severity_weights.get(issue.severity, 0) for issue in self.issues)
        result.performance_score = max(0, 100 - total_deduction)
        
        result.issues = self.issues
        return result

    def print_results(self, result: AnalysisResult):
        """Print analysis results in a formatted way"""
        print(f"\n{'='*80}")
        print(f"INP PERFORMANCE ANALYSIS RESULTS")
        print(f"{'='*80}")
        print(f"File: {result.file_path}")
        print(f"Performance Score: {result.performance_score}/100")
        print(f"Total Issues Found: {result.total_issues}")
        print(f"\nIssues by Severity:")
        for severity, count in sorted(result.issues_by_severity.items()):
            print(f"  {severity.capitalize()}: {count}")
        
        print(f"\nIssues by Category:")
        for category, count in sorted(result.issues_by_category.items()):
            print(f"  {category.replace('_', ' ').title()}: {count}")
        
        print(f"\n{'='*80}")
        print("DETAILED ISSUES")
        print(f"{'='*80}")
        
        # Sort issues by impact score (highest first)
        sorted_issues = sorted(result.issues, key=lambda x: x.impact_score, reverse=True)
        
        for i, issue in enumerate(sorted_issues, 1):
            print(f"\n{i}. [{issue.severity.upper()}] {issue.title}")
            print(f"   Category: {issue.category}")
            print(f"   Line: {issue.line_number}")
            print(f"   Impact Score: {issue.impact_score}/100")
            print(f"   Description: {issue.description}")
            print(f"   Code: {issue.code_snippet}")
            if issue.recommendations:
                print("   Recommendations:")
                for rec in issue.recommendations:
                    print(f"     - {rec}")
            print("-" * 60)

def main():
    """Main function to run the analyzer"""
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python inp_analyzer.py <file_path>")
        print("Example: python inp_analyzer.py correlation/index.html")
        sys.exit(1)
    
    file_path = sys.argv[1]
    analyzer = INPAnalyzer()
    
    try:
        result = analyzer.analyze_file(file_path)
        analyzer.print_results(result)
        
        # Save results to JSON
        output_file = Path(file_path).parent / "inp_analysis_results.json"
        with open(output_file, 'w') as f:
            json.dump({
                'file_path': result.file_path,
                'performance_score': result.performance_score,
                'total_issues': result.total_issues,
                'issues_by_severity': dict(result.issues_by_severity),
                'issues_by_category': dict(result.issues_by_category),
                'issues': [
                    {
                        'severity': issue.severity,
                        'category': issue.category,
                        'title': issue.title,
                        'description': issue.description,
                        'line_number': issue.line_number,
                        'code_snippet': issue.code_snippet,
                        'impact_score': issue.impact_score,
                        'recommendations': issue.recommendations
                    }
                    for issue in result.issues
                ]
            }, f, indent=2)
        
        print(f"\nDetailed results saved to: {output_file}")
        
    except Exception as e:
        print(f"Error analyzing file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
