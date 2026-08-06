"use client";
import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../app/onboarding/onboarding.module.css';

interface OnboardingStepperProps {
    currentStep: number;
    steps?: string[];
}

export function OnboardingStepper({ currentStep, steps = ['Skills', 'Interests', 'Documents'] }: OnboardingStepperProps) {
    const items = steps.map((label, index) => ({
        id: index + 1,
        label,
    }));

    return (
        <div className={styles.stepper}>
            {items.map((step, index) => {
                const isNotLast = index < items.length - 1;

                return (
                    <React.Fragment key={step.id}>
                        <div className={styles.stepItem}>
                            <motion.span
                                className={`
                                    ${styles.stepDot} 
                                    ${currentStep > step.id ? styles.stepDotDone : ''} 
                                    ${currentStep === step.id ? styles.stepDotActive : ''}
                                `}
                                animate={{
                                    scale: currentStep === step.id ? 1.08 : 1,
                                }}
                                transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                {currentStep > step.id ? (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <motion.polyline
                                            points="20 6 9 17 4 12"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                        />
                                    </svg>
                                ) : (
                                    step.id
                                )}
                            </motion.span>
                            <span className={`${styles.stepLabel} ${currentStep === step.id ? styles.stepLabelActive : ''} ${currentStep > step.id ? styles.stepLabelDone : ''}`}>
                                {step.label}
                            </span>
                        </div>
                        {isNotLast && (
                            <div
                                className={`
                                    ${styles.stepLine} 
                                    ${currentStep > step.id ? styles.stepLineDone : ''} 
                                    ${currentStep === step.id ? styles.stepLineActive : ''}
                                `}
                                style={{ position: 'relative', overflow: 'hidden' }}
                            >
                                <motion.div
                                    initial={false}
                                    animate={{
                                        width: currentStep > step.id ? '100%' : '0%'
                                    }}
                                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                                    style={{
                                        height: '100%',
                                        backgroundColor: '#22c55e',
                                        borderRadius: '2px'
                                    }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

