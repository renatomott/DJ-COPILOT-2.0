
import React, { useState, useRef } from 'react';
import { PlayIcon, PlusIcon } from './icons';

interface SwipeableItemProps {
  children: React.ReactNode;
  onLeftAction?: () => void;  // e.g. Load
  onRightAction?: () => void; // e.g. Queue
  leftColor?: string;
  rightColor?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
    children, 
    onLeftAction, 
    onRightAction,
    leftColor = "bg-cyan-600",
    rightColor = "bg-green-600",
    leftIcon = <PlayIcon className="w-6 h-6 text-white" />,
    rightIcon = <PlusIcon className="w-6 h-6 text-white" />
}) => {
    const [offsetX, setOffsetX] = useState(0);
    const startX = useRef(0);
    const startY = useRef(0);
    const isDragging = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
        setOffsetX(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX.current;
        const diffY = currentY - startY.current;

        // If scrolling vertically, ignore horizontal swipe
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
            isDragging.current = false;
            return;
        }

        // Limit swipe distance
        if (Math.abs(diffX) < 150) {
            if (e.cancelable && Math.abs(diffX) > 10) e.preventDefault();
            setOffsetX(diffX);
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        
        if (offsetX > 80 && onLeftAction) {
            // Trigger Left Action (Load)
            // Animate further right then snap back
            setOffsetX(300); 
            setTimeout(() => {
                onLeftAction();
                setOffsetX(0);
            }, 200);
        } else if (offsetX < -80 && onRightAction) {
            // Trigger Right Action (Queue)
            // Animate further left then snap back
            setOffsetX(-300);
            setTimeout(() => {
                onRightAction();
                setOffsetX(0);
            }, 200);
        } else {
            setOffsetX(0);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-xl bg-black">
            {/* Left Action Background (Reveal when swiping right) */}
            <div className={`absolute inset-y-0 left-0 w-1/2 ${leftColor} flex items-center justify-start pl-6 transition-opacity duration-200 ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}>
                {leftIcon}
            </div>

            {/* Right Action Background (Reveal when swiping left) */}
            <div className={`absolute inset-y-0 right-0 w-1/2 ${rightColor} flex items-center justify-end pr-6 transition-opacity duration-200 ${offsetX < 0 ? 'opacity-100' : 'opacity-0'}`}>
                {rightIcon}
            </div>

            <div
                className="relative bg-[#020617] transition-transform duration-200 ease-out will-change-transform touch-pan-y"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};
