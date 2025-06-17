'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  gravity: number;
}

interface SuccessCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
  title?: string;
  subtitle?: string;
  stats?: {
    totalPoints: number;
    equipmentCount: number;
    templatesUsed: number;
  };
}

export function SuccessCelebration({ 
  isVisible, 
  onComplete, 
  title = "🎉 Mapping Complete!", 
  subtitle = "All equipment has been successfully mapped!",
  stats 
}: SuccessCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showContent, setShowContent] = useState(false);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  const createConfetti = () => {
    const pieces: ConfettiPiece[] = [];
    const numPieces = 150;
    
    for (let i = 0; i < numPieces; i++) {
      pieces.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        gravity: Math.random() * 0.3 + 0.1
      });
    }
    
    setConfetti(pieces);
  };

  const updateConfetti = () => {
    setConfetti(prevConfetti => 
      prevConfetti
        .map(piece => ({
          ...piece,
          x: piece.x + piece.vx,
          y: piece.y + piece.vy,
          rotation: piece.rotation + 3,
          vy: piece.vy + piece.gravity
        }))
        .filter(piece => piece.y < window.innerHeight + 10)
    );
  };

  useEffect(() => {
    if (!isVisible) return;

    // Start confetti immediately
    createConfetti();
    
    // Show content after a short delay
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    // Update confetti animation
    const interval = setInterval(updateConfetti, 16); // ~60fps

    // Auto-complete after celebration duration
    const autoCompleteTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 8000); // 8 seconds total

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(autoCompleteTimer);
      clearInterval(interval);
      setConfetti([]);
      setShowContent(false);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
    >
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map(piece => (
          <div
            key={piece.id}
            className="absolute"
            style={{
              left: piece.x,
              top: piece.y,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px'
            }}
          />
        ))}
      </div>

      {/* Main celebration content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 300,
              delay: 0.2 
            }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center relative"
          >
            {/* Celebration icon with animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                damping: 10, 
                stiffness: 200,
                delay: 0.5 
              }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-3xl font-bold text-gray-900 mb-2"
            >
              {title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-lg text-gray-600 mb-6"
            >
              {subtitle}
            </motion.p>

            {/* Stats */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="grid grid-cols-3 gap-4 mb-6"
              >
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalPoints}</div>
                  <div className="text-sm text-blue-600">Points</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{stats.equipmentCount}</div>
                  <div className="text-sm text-green-600">Equipment</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">{stats.templatesUsed}</div>
                  <div className="text-sm text-purple-600">Templates</div>
                </div>
              </motion.div>
            )}

            {/* Success checkmark animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                damping: 15, 
                stiffness: 300,
                delay: 1.3 
              }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </motion.div>

            {/* Auto-save message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-sm text-gray-500 italic"
            >
              ✨ Progress automatically saved!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 