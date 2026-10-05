let recorder = {};

let overlay = undefined;

recorder = async (args, env) => {
    if (args.length == 0) return ' ';
    const cmd = await interpretate(args[0], env);
    const result = await recorder[cmd](args.slice(1), env);
    return result;
}

recorder.Dispose = async (args, env) => {
    console.log(overlay);
    if (overlay) await overlay.dispose();
}

recorder.Pop = async (args, env) => {
    return overlay.frames.shift();
}

recorder.Capture = async (args, env) => {
    if (!(window?.electronAPI?.requestScreenshot)) {
        if (overlay) await overlay.dispose();
        throw('Not supported outside Electron (aka Desktop App)');
    }

    const p = new Deferred();

    const rect = overlay.dom.getBoundingClientRect();
    console.warn(rect);

    electronAPI.requestScreenshot({
        y:Math.round(rect.top+2), x:Math.round(rect.left+2), width: Math.round(rect.width-4), height: Math.round(rect.height-4)
    }, (r) => {
        overlay.frames.push(r);
        p.resolve();
    });

    return p.promise;
}

const printingStyles = `%20%40media%20print%20%7B%0A%20%20%20%20html%2C%20body%20%7B%0A%20%20%20%20%20%20%20%20margin%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20padding%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20width%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20height%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0Abody%20%3E%20*%3Anot(.print-only)%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20none%20!important%3B%0A%20%20%20%20%7D%0A%0A%0A%20%20%20%20.print-only%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0A%20%20%20%20%40page%20%7B%0A%20%20%20%20%20%20%20%20size%3A%20auto%3B%0A%20%20%20%20%20%20%20%20margin%3A%200%3B%0A%20%20%20%20%7D%0A%7D`;

recorder.Create = async (args, env) => {
    if (!(window?.electronAPI?.requestScreenshot)) {
        if (overlay) await overlay.dispose();
        interpretate.alert('Rasterization is only possible using WLJS desktop app (Electron)');
        throw('Rasterization is only possible on desktop app (Electron)');
    }

    if (overlay) await overlay.dispose();

    const styles = document.createElement('style');
    styles.innerHTML = decodeURIComponent(printingStyles);
    document.head.appendChild(styles);
    
    const overlay_div = document.createElement('div');
    overlay_div.classList.add('w-full', 'h-full', 'flex', 'print-only');
    overlay_div.style.backgroundColor = 'rgb(107 114 128 / 0.5)';

    const container = document.createElement('div');
    container.classList.add('mt-auto', 'mb-auto', 'ml-auto', 'mr-auto', 'bg-white', 'p-1');

    overlay_div.appendChild(container);
    env.element = container;

    document.body.prepend(overlay_div);

    let zoom = 1.0;
    let defaultZoom = 1.0;
    let zoomEnabled = false;

    if (args.length > 3) {
        zoom = await interpretate(args[3], env);
        zoom = Math.round(zoom);

        if (Math.abs(zoom - 1.0) > 0.5 && window?.electronAPI?.getZoom) {
            const p = new Deferred();
            zoomEnabled = true;
            window.electronAPI.getZoom((value) => {
                p.resolve(value);
            } );

            defaultZoom = await p.promise;
            window.electronAPI.setZoom(zoom);
        }
    }
    
    overlay = {
        env: env,
        dom: container,
        frames: [],
        dispose: async () => {
            for (const obj of Object.values(overlay.env.global.stack))  {
                obj.dispose();
            }

            styles.remove();

            console.log('OverlayView disposed!');

            overlay_div.remove();
            overlay = undefined

            if (zoomEnabled) {
                window.electronAPI.setZoom(defaultZoom);
            }
        }
    };

    await interpretate(args[0], env);

    const channel = interpretate(args[1], env);
    const time = 1000*interpretate(args[2], env);

    

    setTimeout(() => {
        server.kernel.io.fire(channel, true);
    }, time);
}

core['CoffeeLiqueur`Extensions`Manipulate`Internal`RecorderView'] = recorder;