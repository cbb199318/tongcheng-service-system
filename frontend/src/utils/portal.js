export function detectPortalByHash(hash) {
  var normalized = String(hash || '').replace(/^#/, '');
  if (normalized.indexOf('/user') === 0) return 'user';
  if (normalized.indexOf('/merchant') === 0) return 'merchant';
  if (normalized.indexOf('/admin') === 0) return 'admin';
  return '';
}

export function jumpToPortal(hashPath) {
  window.location.hash = hashPath;
}
