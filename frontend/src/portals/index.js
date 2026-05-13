import { mountUserPortal } from './user/portal';
import { mountMerchantPortal } from './merchant/portal';
import { mountAdminPortal } from './admin/portal';

var portalMountMap = {
  user: mountUserPortal,
  merchant: mountMerchantPortal,
  admin: mountAdminPortal
};

export function mountPortal(portalKey, el) {
  var mount = portalMountMap[portalKey];
  if (!mount) return null;
  return mount(el);
}
