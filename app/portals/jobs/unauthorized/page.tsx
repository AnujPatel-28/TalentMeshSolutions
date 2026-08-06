import React from 'react';
import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#f3f2f1',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ 
                background: 'white', 
                padding: '3rem', 
                borderRadius: '24px', 
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                maxWidth: '480px'
            }}>
                <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1rem' 
                }}>🚫</div>
                <h1 style={{ 
                    fontSize: '2rem', 
                    fontWeight: '800', 
                    color: '#1a1a1a',
                    marginBottom: '1rem' 
                }}>Unauthorized Access</h1>
                <p style={{ 
                    color: '#666', 
                    marginBottom: '2rem',
                    lineHeight: '1.6'
                }}>
                    Sorry, you don&apos;t have permission to access this page. 
                    Please contact your system administrator or log in with a different account.
                </p>
                <Link href="/login" style={{
                    background: '#0070f3',
                    color: 'white',
                    padding: '0.8rem 2rem',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: '600'
                }}>
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
