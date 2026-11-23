const images = new Map();
export function loadStoryImage(path) {
    if (!path) return Promise.resolve(null);
    const preloaded = PIXI.Loader.shared.resources[path]?.texture;
    if (preloaded?.valid) return Promise.resolve(preloaded);
    if (!images.has(path)) {
        const pending = new Promise(resolve=>{
            const image=new Image(); image.onload=()=>resolve(PIXI.Texture.from(image)); image.onerror=()=>resolve(null);image.src=path;
        });
        images.set(path, pending);
        // A failed background request must not prevent a later on-demand retry.
        pending.then(texture=>{if(!texture)images.delete(path);});
    }
    return images.get(path);
}

// Share the on-demand cache; only two future images compete with gameplay traffic.
export async function preloadCutsceneImages(paths) {
    const queue = [...new Set(paths)].filter(Boolean);
    let index = 0;
    const worker = async () => {
        while (index < queue.length) await loadStoryImage(queue[index++]);
    };
    await Promise.all([worker(), worker()]);
}

