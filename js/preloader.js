// Runs before Pixi and the game's ES modules, so network errors remain visible.
(() => {
    if (window.gamePreloader) return;
    const overlay = document.getElementById('preloader');
    const fallback = overlay.querySelector('.loading-fallback');
    const status = overlay.querySelector('[role="status"]');
    const retry = overlay.querySelector('button');
    const bar = overlay.querySelector('[role="progressbar"]');
    const fallbackFill = bar.firstElementChild;
    const safeProbe = document.createElement('div');
    safeProbe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding:var(--safe-top,env(safe-area-inset-top,0px)) var(--safe-right,env(safe-area-inset-right,0px)) var(--safe-bottom,env(safe-area-inset-bottom,0px)) var(--safe-left,env(safe-area-inset-left,0px))';
    overlay.appendChild(safeProbe);
    let scene, reveal, fraction = 0, failed = false, disposed = false;
    let frame = 0, timer = 0, resizeFrame = 0, waveTimer = 0, finishing = false, wave = 0;
    const bugAnimations = new Set();
    const bugButtons = new Set();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const syncBugMotion = () => {
        for (const animation of bugAnimations) {
            if (document.hidden || reducedMotion.matches) animation.pause();
            else animation.play();
        }
    };
    const stopBugs = () => {
        clearTimeout(waveTimer);waveTimer=0;
        for (const animation of bugAnimations) animation.cancel();
        bugAnimations.clear();
        for (const button of bugButtons) button.disabled = true;
        bugButtons.clear();
        document.removeEventListener('visibilitychange', syncBugMotion);
        reducedMotion.removeEventListener('change', syncBugMotion);
    };
    document.addEventListener('visibilitychange', syncBugMotion);
    reducedMotion.addEventListener('change', syncBugMotion);
    const root = 'images/ui/loading/';
    const resize = () => {
        if (!scene) return;
        const css = getComputedStyle(safeProbe);
        const left=parseFloat(css.paddingLeft)||0, right=parseFloat(css.paddingRight)||0;
        const top=parseFloat(css.paddingTop)||0, bottom=parseFloat(css.paddingBottom)||0;
        const scale = Math.min((overlay.clientWidth-left-right) / scene.logicalWidth, (overlay.clientHeight-top-bottom) / scene.logicalHeight);
        scene.style.left = `${left+(overlay.clientWidth-left-right)/2}px`;
        scene.style.top = `${top+(overlay.clientHeight-top-bottom)/2}px`;
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
        stopBugs();
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
    const scheduleResize = () => {
        if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
    };
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    window.visualViewport?.addEventListener('resize', scheduleResize);
    const finish = () => {
        if (failed || disposed) return;
        finishing = true;
        stopBugs();
        update(1);
        frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                if (failed || disposed) return;
                overlay.style.opacity = '0';
                timer = setTimeout(() => {
                    disposed = true;
                    cancelAnimationFrame(resizeFrame);
                    window.removeEventListener('resize', scheduleResize);
                    window.removeEventListener('orientationchange', scheduleResize);
                    window.visualViewport?.removeEventListener('resize', scheduleResize);
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
        scene.logicalWidth = layout.canvas.width;
        scene.logicalHeight = layout.canvas.height;
        Object.assign(scene.style, { width: `${layout.canvas.width}px`, height: `${layout.canvas.height}px` });
        const spawnWave = () => {
            waveTimer=0;
            if(failed||disposed||finishing)return;
            wave++;
            entries.forEach((entry,index)=>{if(!entry.rect)renderEntry(entry,index);});
            syncBugMotion();
        };
        const renderEntry = (entry, index) => {
            if (entry.id === 'cloth') return; // Full-viewport CSS background is the only cloth.
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
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'loading-bug';
                button.setAttribute('aria-label', 'Убрать жука');
                Object.assign(button.style, { position: 'absolute', left: `${entry.center[0]}px`, top: `${entry.center[1]}px`, width: `${image.naturalWidth * scale}px`, height: `${image.naturalHeight * scale}px`, zIndex: entry.z, transform: `translate(-50%, -50%) rotate(${entry.rotation_radians}rad)` });
                Object.assign(image.style, { position: 'static', width: '100%', height: '100%', pointerEvents: 'none' });
                button.appendChild(image); scene.appendChild(button); bugButtons.add(button);
                const angle = Math.atan2(entry.target[1] - entry.center[1], entry.target[0] - entry.center[0]);
                const dx = Math.cos(angle) * 65, dy = Math.sin(angle) * 65;
                const pose = (x,y,turn) => `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${entry.rotation_radians+turn}rad)`;
                const animation = button.animate([
                    { transform: pose(0,0,0) }, { transform: pose(dx,dy,-0.12) },
                    { transform: pose(dx*0.4-dy*0.35,dy*0.4+dx*0.35,0.12) }, { transform: pose(0,0,0) }
                ], { duration: 3500 + index * 170, iterations: Infinity, easing: 'ease-in-out' });
                bugAnimations.add(animation);
                if(wave && !reducedMotion.matches) {
                    const entrance=button.animate([{transform:pose(entry.center[0]<960?-entry.center[0]-200:2120-entry.center[0],0,0)},{transform:pose(0,0,0)}],{duration:650+index*35,easing:'ease-out'});
                    bugAnimations.add(entrance);entrance.onfinish=()=>bugAnimations.delete(entrance);
                }
                const dismiss = event => {
                    if (button.disabled || failed || disposed || finishing) return;
                    event.preventDefault(); event.stopPropagation();
                    button.disabled = true;
                    for(const motion of button.getAnimations()){motion.cancel();bugAnimations.delete(motion);}
                    bugButtons.delete(button);button.remove();
                    if(!bugButtons.size&&!waveTimer)waveTimer=setTimeout(spawnWave,350);
                };
                button.addEventListener('pointerdown', dismiss);
                button.addEventListener('click', dismiss); // Keyboard activation.
                return;
            }
            scene.appendChild(image);
        };
        entries.forEach(renderEntry);
        overlay.prepend(scene);
        if (!failed) fallback.hidden = true;
        resize();
        if (failed) stopBugs(); else syncBugMotion();
    })().catch(error => { console.warn('Loading artwork unavailable; using CSS fallback.', error); });
    window.gamePreloader = { ready, update, error, finish };
})();
