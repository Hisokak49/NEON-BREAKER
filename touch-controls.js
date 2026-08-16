/* Mobile touch controls for NEON BREAKER. */
(() => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  const movePaddle = event => {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    canvas.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: touch.clientX,
      clientY: touch.clientY
    }));
  };

  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    movePaddle(event);
    canvas.click();
  }, { passive: false });

  canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    movePaddle(event);
  }, { passive: false });
})();
