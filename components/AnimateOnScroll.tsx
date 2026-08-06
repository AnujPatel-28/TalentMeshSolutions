"use client";
import React, { useEffect, useRef, useState } from 'react';

interface AnimateOnScrollProps {
    children: React.ReactNode;
    animation?: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'fadeIn' | 'scaleUp' | 'blurIn';
    delay?: number;      // ms
    duration?: number;    // ms
    threshold?: number;   // 0-1
    once?: boolean;       // animate only once
    className?: string;
    style?: React.CSSProperties;
    as?: React.ElementType;
}

export default function AnimateOnScroll({
    children,
    animation = 'fadeUp',
    delay = 0,
    duration = 400,
    threshold = 0.1,
    once = false,
    className = '',
    style = {},
    as: Tag = 'div',
}: AnimateOnScrollProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Skip animation if user prefers reduced motion
    useEffect(() => {
        if (reduceMotion) {
            setVisible(true);
        }
    }, [reduceMotion]);

    useEffect(() => {
        if (visible) {
            setAnimating(true);
        }
    }, [visible]);

    const handleTransitionEnd = () => {
        setAnimating(false);
    };

    useEffect(() => {
        if (reduceMotion) return;
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    setVisible(false);
                }
            },
            { threshold, rootMargin: '0px 0px -40px 0px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, once]);

    const transforms: Record<string, string> = {
        fadeUp: 'translateY(15px)',
        fadeDown: 'translateY(-15px)',
        fadeLeft: 'translateX(-15px)',
        fadeRight: 'translateX(15px)',
        fadeIn: 'none',
        scaleUp: 'scale(0.96)',
        blurIn: 'none',
    };

    const animStyle: React.CSSProperties = {
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[animation],
        filter: animation === 'blurIn' ? (visible ? 'blur(0)' : 'blur(4px)') : undefined,
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms, filter ${duration}ms ease-out ${delay}ms`,
        willChange: animating ? 'opacity, transform, filter' : 'auto',
        ...style,
    };

    return React.createElement(
        Tag,
        { ref, className, style: animStyle, onTransitionEnd: handleTransitionEnd },
        children
    );
}
