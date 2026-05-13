<template>
  <div ref="mount" class="portal-host"></div>
</template>

<script>
import { mountPortal } from '../portals';

export default {
  name: 'PortalHost',
  props: {
    portal: {
      type: String,
      default: ''
    }
  },
  data: function () {
    return {
      portalInstance: null
    };
  },
  watch: {
    portal: function () {
      this.renderPortal();
    }
  },
  mounted: function () {
    this.renderPortal();
  },
  beforeDestroy: function () {
    this.destroyPortal();
  },
  methods: {
    destroyPortal: function () {
      if (this.portalInstance && this.portalInstance.app && this.portalInstance.app.$destroy) {
        this.portalInstance.app.$destroy();
      }
      this.portalInstance = null;
      if (this.$refs.mount) {
        this.$refs.mount.innerHTML = '';
      }
    },
    renderPortal: function () {
      this.destroyPortal();
      if (!this.portal) return;
      this.portalInstance = mountPortal(this.portal, this.$refs.mount);
    }
  }
};
</script>
