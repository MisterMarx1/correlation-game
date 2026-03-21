import React, { useEffect, useRef, useCallback, useMemo } from 'react';

const StarfieldBackground = () => {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Configuration - wrapped in useMemo to prevent unnecessary re-renders
  const config = useMemo(() => ({
    numStarsPer100kPixels: 70,
    minStarSize: 0.5,
    maxStarSize: 2.0,
    minOpacity: 0.2,
    maxOpacity: 0.9,
    flickerChance: 0.02,
    flickerAmount: 0.3,
    backgroundColor: '#000428',
  }), []);

  const generateStars = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth * dpr;
    const height = canvas.offsetHeight * dpr;
    canvas.width = width;
    canvas.height = height;

    const numPixels = width * height;
    const numStars = Math.floor((numPixels / 100000) * config.numStarsPer100kPixels);
    const newStars = [];

    for (let i = 0; i < numStars; i++) {
      const size = Math.random() * (config.maxStarSize - config.minStarSize) + config.minStarSize;
      const baseOpacity = Math.random() * (config.maxOpacity - config.minOpacity) + config.minOpacity;
      newStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: size * dpr,
        baseOpacity: baseOpacity,
        currentOpacity: baseOpacity,
        flicker: false,
      });
    }
    starsRef.current = newStars;
  }, [config]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    starsRef.current.forEach(star => {
      if (star.flicker) {
        star.currentOpacity = star.baseOpacity * (1 - config.flickerAmount * Math.random());
        if (Math.random() > 0.8) {
          star.flicker = false;
          star.currentOpacity = star.baseOpacity;
        }
      } else if (Math.random() < config.flickerChance) {
        star.flicker = true;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
      ctx.globalAlpha = star.currentOpacity;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [config]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      generateStars(canvas);
    }
  }, [generateStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    generateStars(canvas);
    animationFrameRef.current = requestAnimationFrame(draw);

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [generateStars, draw, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
};

export default StarfieldBackground;
