export function getAdminSecretPath(): string {
  return 'admin';
}

export function getAdminUrl(subPath: string = '/dashboard'): string {
  const secretPath = getAdminSecretPath();
  const cleanSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  
  if (cleanSubPath.startsWith('/admin')) {
    return cleanSubPath.replace('/admin', `/${secretPath}`);
  }
  return `/${secretPath}${cleanSubPath}`;
}
