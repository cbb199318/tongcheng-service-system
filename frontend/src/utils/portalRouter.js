function ensureLeadingSlash(path) {
  var value = String(path || '/');
  return value.charAt(0) === '/' ? value : '/' + value;
}

function stripPortalPrefix(prefix, path) {
  var value = ensureLeadingSlash(path || '/');
  if (value.indexOf(prefix) === 0) {
    value = value.slice(prefix.length) || '/';
  }
  return ensureLeadingSlash(value);
}

function readHashPath() {
  return ensureLeadingSlash(String(window.location.hash || '').replace(/^#/, '') || '/');
}

function buildBrowserHash(prefix, fullPath) {
  var path = ensureLeadingSlash(fullPath || '/');
  return '#' + prefix + (path === '/' ? '' : path);
}

function ignoreNavigationError(error) {
  if (!error) return;
  var message = String(error && error.message || '');
  if (message.indexOf('Avoided redundant navigation') > -1) return;
  throw error;
}

export function createPortalRouter(VueRouter, prefix, routes) {
  var router = new VueRouter({
    mode: 'abstract',
    routes: routes
  });

  var rawPush = router.push.bind(router);
  var rawReplace = router.replace.bind(router);

  function normalizeLocation(location) {
    if (typeof location === 'string') {
      return stripPortalPrefix(prefix, location);
    }
    if (location && typeof location === 'object') {
      var next = Object.assign({}, location);
      if (next.path) {
        next.path = stripPortalPrefix(prefix, next.path);
      }
      return next;
    }
    return location;
  }

  function syncBrowserUrl() {
    var targetHash = buildBrowserHash(prefix, router.currentRoute.fullPath || '/');
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  function syncFromBrowserHash() {
    var targetPath = stripPortalPrefix(prefix, readHashPath());
    if (router.currentRoute.fullPath === targetPath) return;
    Promise.resolve(rawReplace(targetPath)).then(syncBrowserUrl).catch(ignoreNavigationError);
  }

  router.push = function (location, onComplete, onAbort) {
    return Promise.resolve(rawPush(normalizeLocation(location), onComplete, onAbort)).then(function (result) {
      syncBrowserUrl();
      return result;
    }).catch(function (error) {
      ignoreNavigationError(error);
      syncBrowserUrl();
    });
  };

  router.replace = function (location, onComplete, onAbort) {
    return Promise.resolve(rawReplace(normalizeLocation(location), onComplete, onAbort)).then(function (result) {
      syncBrowserUrl();
      return result;
    }).catch(function (error) {
      ignoreNavigationError(error);
      syncBrowserUrl();
    });
  };

  Promise.resolve(rawReplace(stripPortalPrefix(prefix, readHashPath()))).then(syncBrowserUrl).catch(ignoreNavigationError);
  window.addEventListener('hashchange', syncFromBrowserHash);

  return {
    router: router,
    teardown: function () {
      window.removeEventListener('hashchange', syncFromBrowserHash);
    }
  };
}
