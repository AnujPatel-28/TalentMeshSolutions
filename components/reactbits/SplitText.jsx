'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

export default function SplitText({ text, className = '', delay = 35, duration = 0.7, ease = 'power3.out', splitType = 'chars', from = { opacity: 0, y: 24 }, to = { opacity: 1, y: 0 }, threshold = 0.1, rootMargin = '-80px', textAlign = 'left', tag = 'p', onLetterAnimationComplete = undefined }) {
  const ref = useRef(null);
  const completed = useRef(false);
  const callback = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => { callback.current = onLetterAnimationComplete; }, [onLetterAnimationComplete]);
  useEffect(() => { if (document.fonts.status === 'loaded') setFontsLoaded(true); else document.fonts.ready.then(() => setFontsLoaded(true)); }, []);
  useGSAP(() => {
    if (!ref.current || !text || !fontsLoaded || completed.current) return;
    const element = ref.current;
    const startPct = (1 - threshold) * 100;
    const margin = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
    const value = margin ? parseFloat(margin[1]) : 0;
    const unit = margin ? margin[2] || 'px' : 'px';
    const sign = value === 0 ? '' : value < 0 ? `-=${Math.abs(value)}${unit}` : `+=${value}${unit}`;
    const split = new GSAPSplitText(element, { type: splitType, smartWrap: true, charsClass: 'split-char', wordsClass: 'split-word', linesClass: 'split-line', reduceWhiteSpace: false, onSplit: (instance) => gsap.fromTo(instance.chars, { ...from }, { ...to, duration, ease, stagger: delay / 1000, willChange: 'transform, opacity', force3D: true, scrollTrigger: { trigger: element, start: `top ${startPct}%${sign}`, once: true, fastScrollEnd: true }, onComplete: () => { completed.current = true; callback.current?.(); } }) });
    return () => { ScrollTrigger.getAll().forEach((trigger) => { if (trigger.trigger === element) trigger.kill(); }); split.revert(); };
  }, { dependencies: [text, delay, duration, ease, splitType, JSON.stringify(from), JSON.stringify(to), threshold, rootMargin, fontsLoaded], scope: ref });
  const Tag = tag || 'p';
  return <Tag ref={ref} className={`split-parent ${className}`} style={{ textAlign, overflow: 'hidden', display: 'inline-block', whiteSpace: 'normal', wordWrap: 'break-word' }}>{text}</Tag>;
}