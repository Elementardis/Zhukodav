// Runs before Pixi and the game's ES modules, so network errors remain visible.
(() => {
    if (window.gamePreloader) return;
    const overlay = document.getElementById('preloader');
    const fallback = overlay.querySelector('.loading-fallback');
    const status = overlay.querySelector('[role="status"]');
    const retry = overlay.querySelector('button');
    const bar = overlay.querySelector('[role="progressbar"]');
    const fallbackFill = bar.firstElementChild;
    let scene, reveal, fraction = 0, failed = false, disposed = false;
    let frame = 0, timer = 0;
    const root = 'images/ui/loading/';
    const resize = () => {
        if (!scene) return;
        const scale = Math.min(innerWidth / scene.logicalWidth, innerHeight / scene.logicalHeight);
        scene.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    const update = value => {
        if (failed || disposed) return;
        fraction = Math.max(fraction, Math.min(1, Math.max(0, Number(value) || 0)));
        bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
        overlay.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
        fallbackFill.style.width = `${fraction * 100}%`;
        if (reveal) reveal.style.width = `${fraction * 100}%`;
    };
    const error = (message = 'Не удалось загрузить игру. Проверьте соединение и повторите попытку.') => {
        if (disposed) return;
        failed = true;
        overlay.removeAttribute('role');
        overlay.removeAttribute('aria-valuenow');
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        overlay.style.opacity = '1';
        fallback.hidden = false;
        status.textContent = message;
        retry.hidden = false;
    };
    const onError = event => {
        if (event.target?.tagName === 'SCRIPT') error(`Не удалось загрузить скрипт: ${event.target.src}. Нажмите «Повторить».`);
        else if (event instanceof ErrorEvent) error(`Не удалось запустить игру: ${event.message}. Нажмите «Повторить».`);
    };
    window.addEventListener('error', onError, true);
    window.addEventListener('resize', resize);
    const finish = () => {
        if (failed || disposed) return;
        update(1);
        frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                if (failed || disposed) return;
                overlay.style.opacity = '0';
                timer = setTimeout(() => {
                    disposed = true;
                    window.removeEventListener('resize', resize);
                    window.removeEventListener('error', onError, true);
                    overlay.remove();
                }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
            });
        });
    };
    const loadImage = file => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Loading artwork: ${file}`));
        image.src = root + file;
        image.alt = '';
        image.draggable = false;
    });
    const ready = (async () => {
        const response = await fetch(root + 'layout.json');
        if (!response.ok) throw new Error('Loading layout unavailable');
        const layout = await response.json();
        const entries = [...layout.elements, ...layout.bugs];
        const images = await Promise.all(entries.map(entry => loadImage(entry.file)));
        if (disposed) return;
        scene = document.createElement('div');
        scene.className = 'loading-scene';
        scene.setAttribute('aria-hidden', 'true');
        scene.logicalWidth = layout.canvas.width;
        scene.logicalHeight = layout.canvas.height;
        Object.assign(scene.style, { width: `${layout.canvas.width}px`, height: `${layout.canvas.height}px` });
        entries.forEach((entry, index) => {
            const image = images[index];
            image.style.position = 'absolute';
            image.style.zIndex = entry.z;
            if (entry.rect) {
                const [x, y, width, height] = entry.rect;
                Object.assign(image.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
                if (entry.id === 'fill') {
                    const clip = document.createElement('div');
                    Object.assign(clip.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, borderRadius: `${layout.progress.clip_radius}px`, overflow: 'hidden', zIndex: entry.z });
                    reveal = document.createElement('div');
                    Object.assign(reveal.style, { position: 'relative', height: '100%', overflow: 'hidden', width: `${fraction * 100}%` });
                    image.style.left = image.style.top = '0';
                    reveal.appendChild(image);
                    clip.appendChild(reveal);
                    scene.appendChild(clip);
                    return;
                }
            } else {
                const scale = Math.min(entry.max_size[0] / image.naturalWidth, entry.max_size[1] / image.naturalHeight);
                Object.assign(image.style, { left: `${entry.center[0]}px`, top: `${entry.center[1]}px`, width: `${image.naturalWidth * scale}px`, height: `${image.naturalHeight * scale}px`, transform: `translate(-50%, -50%) rotate(${entry.rotation_radians}rad)` });
            }
            scene.appendChild(image);
        });
        overlay.prepend(scene);
        if (!failed) fallback.hidden = true;
        resize();
    })().catch(error => { console.warn('Loading artwork unavailable; using CSS fallback.', error); });
    window.gamePreloader = { ready, update, error, finish };
})();
