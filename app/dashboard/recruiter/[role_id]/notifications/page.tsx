import React from 'react';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function RecruiterNotificationsPage() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <NotificationCenter role="recruiter" />
        </div>
    );
}
