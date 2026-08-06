import React from 'react';
import Unauthorized403 from '@/components/shared/Unauthorized403';

export default function UnauthorizedPage() {
  return (
    <Unauthorized403 
      title="Access Denied" 
      message="You do not have permission to access this page. Please log in with an authorized account or contact your system administrator." 
    />
  );
}
