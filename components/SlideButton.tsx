
import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, ChevronDownIcon } from './icons';

interface SlideButtonProps {
    onSuccess: () => void;
    label: string;
    icon?: React.ReactNode;
    className?: string;
}

export const SlideButton: React.FC<SlideButtonProps> = ({ onSuccess, label, icon, className = "" }) => {
    const [dragWidth, setDragWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const maxDrag = useRef(0);

    useEffect(() => {
        if (containerRef.current) {
            maxDrag.current = containerRef.current.offsetWidth - 44; // button width
        }
    }, []);

    const handleStart = (clientX: number) => {
        if (!containerRef.current) return;
        isDragging.current = true;
        startX.current = clientX;
        maxDrag.current = containerRef.current.offsetWidth - 44;
    };

    const handleMove = (clientX: number) => {
        if (!isDragging.current) return;
        const diff = clientX - startX.current;
        const newWidth = Math.max(0, Math.min(diff, maxDrag.current));
        setDragWidth(newWidth);
    };

    const handleEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        
        if (dragWidth >= maxDrag.current * 0.9) {
            setDragWidth(maxDrag.current);
            setTimeout(() => {
                onSuccess();
                setDragWidth(0);
            }, 100);
        } else {
            setDragWidth(0);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`relative h-[50px] bg-slate-900/80 rounded-xl overflow-hidden border border-slate-700 shadow-inner select-none ${className}`}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => isDragging.current && handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            {/* Background Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] animate-pulse">
                    {label}
                </span>
                <div className="absolute right-3 opacity-30">
                    <ChevronDownIcon className="w-4 h-4 -rotate-90 text-white" />
                </div>
            </div>

            {/* Slider Handle */}
            <div 
                className="absolute left-0 top-0 bottom-0 bg-cyan-600 flex items-center justify-end pr-3 rounded-xl transition-all duration-75 ease-linear shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                style={{ width: `${dragWidth + 50}px` }}
            >
                <div className="absolute right-1 top-1 bottom-1 w-[42px] bg-white rounded-lg flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing">
                    {icon || <PlayIcon className="w-5 h-5 text-cyan-600 fill-current" />}
                </div>
            </div>
        </div>
    );
};
