// Small UI fixes kept separate from the game engine.
// The victory screen's MENU button is present in index.html but was not wired.
const victoryMenuButton = document.getElementById('btnVicMenu');
if (victoryMenuButton) {
  victoryMenuButton.addEventListener('click', () => {
    if (typeof sfx !== 'undefined' && sfx.click) sfx.click();
    if (typeof goMenu === 'function') goMenu();
  });
}
