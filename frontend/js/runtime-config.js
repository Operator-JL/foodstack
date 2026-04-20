(function () {
  if (!window.FOODSTACK_RUNTIME_OVERRIDES) {
    window.FOODSTACK_RUNTIME_OVERRIDES = {};
  }

  const defaults = {
    // Leave empty to use automatic base-url resolution.
    API_BASE_URL: '',
    // QA-safe defaults: demo mode is off unless explicitly enabled.
    DEV_FALLBACK_MODE: false,
    ALLOW_DEMO_AUTH: false,
    // same-origin works for backend-served frontend; cross-origin API calls use bearer token.
    REQUEST_CREDENTIALS: 'same-origin'
  };

  window.FOODSTACK_RUNTIME_OVERRIDES = {
    ...defaults,
    ...window.FOODSTACK_RUNTIME_OVERRIDES
  };
})();
