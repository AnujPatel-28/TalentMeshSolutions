"use client";
import React, { useState } from 'react';
import styles from './integrations.module.css';

const INTEGRATIONS = [
    {
        category: 'Calendar',
        icon: '📅',
        color: '#3b82f6',
        bg: '#eff6ff',
        items: [
            { name: 'Google Calendar', desc: 'Sync interview schedules directly with Google Calendar.', connected: false, logo: 'G' },
            { name: 'Microsoft Outlook', desc: 'Book meetings and track schedules in Outlook.', connected: false, logo: 'O' },
            { name: 'Calendly', desc: 'Let candidates self-schedule their interviews.', connected: false, logo: 'C' },
        ],
    },
    {
        category: 'Email',
        icon: '✉️',
        color: '#8b5cf6',
        bg: '#f5f3ff',
        items: [
            { name: 'Gmail', desc: 'Send offer letters and updates directly from Gmail.', connected: false, logo: 'G' },
            { name: 'Outlook Mail', desc: 'Communicate with candidates via Outlook.', connected: false, logo: 'O' },
            { name: 'SendGrid', desc: 'Send bulk recruitment emails and templates.', connected: false, logo: 'S' },
        ],
    },
    {
        category: 'ATS',
        icon: '🗂️',
        color: '#f59e0b',
        bg: '#fffbeb',
        items: [
            { name: 'Greenhouse', desc: 'Import candidates and sync pipeline stages.', connected: false, logo: 'G' },
            { name: 'Lever', desc: 'Two-way sync with Lever for seamless workflows.', connected: false, logo: 'L' },
            { name: 'Workday', desc: 'Connect your Workday HCM for candidate data.', connected: false, logo: 'W' },
        ],
    },
    {
        category: 'HRMS',
        icon: '🏢',
        color: '#10b981',
        bg: '#f0fdf4',
        items: [
            { name: 'BambooHR', desc: 'Push hired candidates to BambooHR onboarding.', connected: false, logo: 'B' },
            { name: 'SAP SuccessFactors', desc: 'Sync employee data with SAP SF.', connected: false, logo: 'S' },
            { name: 'Rippling', desc: 'Auto-provision accounts when a hire is confirmed.', connected: false, logo: 'R' },
        ],
    },
];

export default function IntegrationsPage() {
    const [connected, setConnected] = useState<Record<string, boolean>>({});

    const toggle = (name: string) => {
        setConnected(prev => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <div className={styles.integrationsWrapper}>
            <div className={styles.integrationsHeader}>
                <h1 className={styles.pageTitle}>Integrations</h1>
                <p className={styles.pageSub}>Connect your favourite tools to streamline your recruitment workflow</p>
            </div>

            <div className={styles.groupsList}>
                {INTEGRATIONS.map(group => (
                    <div key={group.category}>
                        <div className={styles.groupCategory}>
                            <span className={styles.groupIcon}>{group.icon}</span>
                            <h2 className={styles.groupTitle}>{group.category}</h2>
                            <div className={styles.groupDivider} />
                        </div>
                        <div className={styles.itemsGrid}>
                            {group.items.map(item => {
                                const isOn = connected[item.name] ?? item.connected;
                                return (
                                    <div 
                                        key={item.name} 
                                        className={styles.integrationCard}
                                        style={{
                                            borderColor: isOn ? `${group.color}60` : undefined,
                                        }}
                                    >
                                        <div>
                                            <div className={styles.cardTop}>
                                                <div 
                                                    className={styles.logo}
                                                    style={{
                                                        background: isOn ? group.bg : undefined,
                                                        color: isOn ? group.color : undefined,
                                                        borderColor: isOn ? `${group.color}40` : undefined,
                                                    }}
                                                >
                                                    {item.logo}
                                                </div>
                                                <div className={styles.nameInfo}>
                                                    <div className={styles.name}>{item.name}</div>
                                                    {isOn && (
                                                        <div className={styles.status} style={{ color: group.color }}>● Connected</div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={styles.description}>{item.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => toggle(item.name)}
                                            className={`${styles.actionBtn} ${isOn ? styles.disconnectBtn : styles.connectBtn}`}
                                            style={{
                                                background: isOn ? undefined : group.color,
                                                color: isOn ? undefined : '#fff',
                                            }}
                                        >
                                            {isOn ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
