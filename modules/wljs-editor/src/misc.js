core['CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView'] = async (args, env) => {
    const cmd = await interpretate(args[0], env);
    const result = await core['CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView'][cmd](args.slice(1), env);
    return result;
}

core['CoffeeLiqueur`Extensions`Editor`Internal`InsertToClipBoard'] = async (args, env) => {
    const data = await interpretate(args[0], env);
    const encoded = await interpretate(args[1], env);
    if (!navigator.clipboard) {
        interpretate.alert('Clipboard manipulation are forbidden in non-secured contexts. Please run an app locally or use reverse proxy with TLS.');
        throw 'Clipboard manipulation are forbidden in non-secured contexts.';
    }
    if (encoded) navigator.clipboard.writeText(decodeURIComponent(data)); else navigator.clipboard.writeText(encodeURIComponent(data));
}

core['CoffeeLiqueur`Extensions`System`Internal`opClipboard'] = async (args, env) => {
    const op = await interpretate(args[0], env);
    switch(op) {
        case 'Write':
            const txt = await interpretate(args[1], env);
            navigator.clipboard.writeText(decodeURIComponent(txt));
        break;
        case 'Read':
            const clipText = await navigator.clipboard.readText()
            return encodeURIComponent(clipText);
        break;
    }
}

let overlay = undefined;

core['CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView'].Dispose = async (args, env) => {
    console.log(overlay);
    if (overlay) await overlay.dispose();
}

core.Confirm = async (args, env) => {
    const text = await interpretate(args[0], env);
    return await interpretate.confirmAsync(text);
}

core['CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView'].Capture = async (args, env) => {
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
        p.resolve(r);
    });

    return p.promise;
}


core['CoffeeLiqueur`Extensions`Rasterize`Internal`GetPDF'] = async (args, env) => {
    if (!(window?.electronAPI?.toPDF)) {
        if (overlay) await overlay.dispose();
        interpretate.alert('PDF generation is only possible using WLJS desktop app (Electron)');
        throw('PDF generation is only possible on desktop app (Electron)');
    }

    const options = await core._getRules(args, env);
    const p = new Deferred();
  
    electronAPI.toPDF(options, (result)=>{
      p.resolve(Array.from(result));
    })
  
    return p.promise;
  }

core['CoffeeLiqueur`Extensions`ContextMenu`Internal`ReadSelectionInDoc'] = (args, env) => document.getSelection().toString()

core.FrontTextSelected = (args, env) => document.getSelection().toString() 
core['CoffeeLiqueur`Extensions`EditorView`FrontTextSelected'] = (args, env) => document.getSelection().toString() 

core['CoffeeLiqueur`Extensions`Rasterize`Internal`takeScreenshot'] = async (args, env) => {
  if (!window.electronAPI) return false;
  const opts = await core._getRules(args, env);
  const p = new Deferred();
  window.electronAPI.requestScreenshot(opts, (d)=>{
    p.resolve(d);
  });
  return p.promise;
}

const printingStyles = `%20%40media%20print%20%7B%0A%20%20%20%20html%2C%20body%20%7B%0A%20%20%20%20%20%20%20%20margin%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20padding%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20width%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20height%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0Abody%20%3E%20*%3Anot(.print-only)%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20none%20!important%3B%0A%20%20%20%20%7D%0A%0A%0A%20%20%20%20.print-only%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0A%20%20%20%20%40page%20%7B%0A%20%20%20%20%20%20%20%20size%3A%20auto%3B%0A%20%20%20%20%20%20%20%20margin%3A%200%3B%0A%20%20%20%20%7D%0A%7D`;

core['CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView'].Create = async (args, env) => {
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
    //find main elmeent if available
    let main = document.getElementById('frame');
    let oldStyle;
    if (main) {
        oldStyle = main.style.display;
        main.style.display = 'none';
    } 

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
        dispose: async () => {
            for (const obj of Object.values(overlay.env.global.stack))  {
                obj.dispose();
            }

            

            styles.remove();

            console.log('OverlayView disposed!');

            overlay_div.remove();
            overlay = undefined
            
            if (main) {
                main.style.display = oldStyle;
            }

            if (zoomEnabled) {
                window.electronAPI.setZoom(defaultZoom);
            }
        }
    };

    try {
        await interpretate(args[0], env);
    } catch (err) {
        console.warn('Unpectected expection during rasterization');
    }

    const channel = interpretate(args[1], env);
    const time = 1000*interpretate(args[2], env);

    

    setTimeout(() => {
        server.kernel.emitt(channel, 'True');
    }, time);
}

const injector = async (args, env) => {
    const key = await interpretate(args[0], env);
    await injector[key[1]](args.slice(1), {...env, context: injector.context});
}

injector.context = {};

injector.Javascript = async (args, env) => {
    const data = await interpretate(args[0], env);

    data.forEach((el) => {
        const script = document.createElement('script');
        script.type = "module";

        if (typeof el == 'object') {
            script.src = '/'+el.URL;
        } else {
            script.textContent = el;
        }
        
        document.head.appendChild(script);
    })
}

injector.CSS = async (args, env) => {
    const data = await interpretate(args[0], env);

    data.forEach((el) => {
        if (typeof el == 'object') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/'+el.URL;
            document.head.appendChild(link);
        } else {
            const style = document.createElement('style');
            style.textContent = el;
            document.head.appendChild(style);
        }
    })
}

core['CoffeeLiqueur`Extensions`RuntimeTools`Private`UIHeadInject'] = injector;

core['CoffeeLiqueur`Extensions`RemoteCells`Private`openNotebook'] = async (args, env) => {
    const url = await interpretate(args[0], env);
    window.open('/'+url, '_blank');
}

core.SystemOpen = async (args, env) => {
    const type = await interpretate(args[1], env);
    if (!window.electronAPI) interpretate.alert('This feature is available only for the desktop application');
    await core.SystemOpen[type](args[0], env);
}

core.SystemOpen.File = async (path, env) => {
    const p = await interpretate(path, env);
    window.electronAPI.openPath(p);
}

core.SystemOpen.Folder = async (path, env) => {
    const p = await interpretate(path, env);
    window.electronAPI.openFolder(p);
}

core.SystemOpen.URL = async (path, env) => {
    const p = await interpretate(path, env);
    window.electronAPI.openExternal(p);
}

core['CoffeeLiqueur`Extensions`System`Internal`RequestDirectory'] = async (args, env) => {
    const title = await interpretate(args[0], env);
    const p = new Deferred();
    const api = window.electronAPI || window.iframeAPI;

    if (!api) {
        console.error('Electron API not found! Feature is only available for desktop app');
        interpretate.alert('This feature is available only for the desktop application');
        p.resolve('$Failed');
    }
    
    api.showOpenDialog({title: title, properties: ['openDirectory', 'createDirectory'] }, (res) => {
        if (res.canceled) {
            p.resolve(false);
            return;
        }        
        p.resolve( encodeURIComponent(res.filePaths[0]) );
    })

    return p.promise;
}

core['CoffeeLiqueur`Extensions`System`Internal`RequestFile'] = async (args, env) => {
    const title = await interpretate(args[0], env);
    const filters   = await interpretate(args[1], env);
    const type   = await interpretate(args[2], env);
    const p = new Deferred();

    const api = window.electronAPI || window.iframeAPI;

    if (!api) {
        console.error('Electron API not found! Feature is only available for desktop app');
        interpretate.alert('This feature is available only for the desktop application');
        p.resolve('$Failed');
    }


    //let modal;

    if (type === 'OpenList') {
 

        api.showOpenDialog({title: title, ...(filters ? {filters: filters} : {}), properties: ['openFile', 'multiSelections'] }, (res) => {
            if (res.canceled) {
                p.resolve(false);
                return;
            }        
            p.resolve( res.filePaths.map(encodeURIComponent) );
        })

    } else {

        if (type === 'Save') {
            api.showSaveDialog({title: title, ...(filters ? {filters: filters} : {}), properties: ['createDirectory'] }, (res) => {
                if (res.canceled) {
                    p.resolve(false);
                    return;
                }        
                p.resolve( encodeURIComponent(res.filePath) );
            })
        } else {
            api.showOpenDialog({title: title, ...(filters ? {filters: filters} : {}), properties: ['openFile'] }, (res) => {
                if (res.canceled) {
                    p.resolve(false);
                    return;
                }        
                p.resolve( encodeURIComponent(res.filePaths[0]) );
            })
        }
    }

    return p.promise;
}






