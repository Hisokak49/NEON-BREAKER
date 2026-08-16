/* Mobile touch controls for NEON BREAKER. */
(() => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  const updatePointer = event => {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('neon-pointer', {
      detail: {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width)
      }
    }));
  };

  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    updatePointer(event);
    canvas.click();
  }, { passive: false });

  canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    updatePointer(event);
  }, { passive: false });
})();
