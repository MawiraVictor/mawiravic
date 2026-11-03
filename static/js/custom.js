function initEasterEgg() {
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ];
    let konamiIndex = 0;
    let matrixCode = '';

    document.addEventListener('keydown', (e) => {
        const target = e.target;
        const isEditable =
            target instanceof HTMLElement &&
            (target.isContentEditable ||
             ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

        if (isEditable) return;

        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activateEasterEgg();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }

        // Keep only a short digit sequence for the Matrix easter egg.
        if (/^\d$/.test(e.key)) {
            matrixCode = (matrixCode + e.key).slice(-4);
            if (matrixCode === '1337') {
                activateMatrixMode();
                matrixCode = '';
            }
        } else {
            matrixCode = '';
        }
    });
}