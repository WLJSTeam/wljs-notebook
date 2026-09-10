import PDFMerger from 'pdf-merger-js/browser';

// files: Array of PDF File or Blob objects
export const Merger = async (files) => {
  const merger = new PDFMerger();

      for(const file of files) {
        await merger.add(file);
      }

      await merger.setMetadata({
        producer: "pdf-merger-js based script"
      });

      const mergedPdf = await merger.saveAsBlob();
      return mergedPdf;
};

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`OverlayView'] = async (args, env) => {
    const cmd = await interpretate(args[0], env);
    const result = await core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`OverlayView'][cmd](args.slice(1), env);
    return result;
}

let overlay = undefined;

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`OverlayView'].Dispose = async (args, env) => {
    console.log(overlay);
    if (overlay) await overlay.dispose();
}


core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`OverlayView'].Capture = async (args, env) => {
    if (!(window?.electronAPI?.requestScreenshot)) {
        if (overlay) await overlay.dispose();
        throw('Not supported outside Electron (aka Desktop App)');
    }

    const p = new Deferred();

    const rect = overlay.dom.getBoundingClientRect();
    console.warn(rect);

    try {
        electronAPI.requestScreenshot({
            y:Math.round(rect.top+2), x:Math.round(rect.left+2), width: Math.round(rect.width-4), height: Math.round(rect.height-4)
        }, (r) => {
            p.resolve(r);
        });
    } catch(err) {
        console.warn(err);
        p.resolve(undefined);
    }

    return p.promise;
}

let accumulator = [];

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`AccumulatePDF'] = async (args, env) => {
    const res = await interpretate(args[0]);
    if (res) accumulator.push(new Uint8Array(res));
    return [0];
}

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`FlushPDF'] = async (args, env) => {
    const res = accumulator;
    accumulator = [];
    const merger = Merger;
    const newFile = await merger(res);
    const arraybuf = await newFile.arrayBuffer();
    const p = Array.from(new Uint8Array(arraybuf));
    console.log(p);
    return p;
}

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`GetPDF'] = async (args, env) => {
    if (!(window?.electronAPI?.toPDF)) {
        if (overlay) await overlay.dispose();
        interpretate.alert('PDF generation is only possible using WLJS desktop app (Electron)');
        throw('PDF generation is only possible on desktop app (Electron)');
    }

    const options = await core._getRules(args, env);
    const p = new Deferred();
    const timer = setTimeout(()=>{
        console.warn('IPC timeout!');
        p.resolve(undefined);
    }, 4000);

    electronAPI.toPDF(options, (result)=>{
      clearTimeout(timer);
      p.resolve(Array.from(result));
    })
  
    return p.promise;
  }


const printingStyles = `%20%40media%20print%20%7B%0A%20%20%20%20html%2C%20body%20%7B%0A%20%20%20%20%20%20%20%20margin%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20padding%3A%200%20!important%3B%0A%20%20%20%20%20%20%20%20width%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20height%3A%20auto%20!important%3B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0Abody%20%3E%20*%3Anot(.print-only)%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20none%20!important%3B%0A%20%20%20%20%7D%0A%0A%0A%20%20%20%20.print-only%20%7B%0A%20%20%20%20%20%20%20%20display%3A%20block%20!important%3B%0A%20%20%20%20%7D%0A%0A%20%20%20%20%40page%20%7B%0A%20%20%20%20%20%20%20%20size%3A%20auto%3B%0A%20%20%20%20%20%20%20%20margin%3A%200%3B%0A%20%20%20%20%7D%0A%7D`;

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`OverlayView'].Create = async (args, env) => {
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

    await interpretate(args[0], env);

    const channel = interpretate(args[1], env);
    const time = 1000*interpretate(args[2], env);

    

    setTimeout(() => {
        server.emitt(channel, 'True');
    }, time);
}

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`HijackCellToContainer'] = async (args, env) => {
    const uid = await interpretate(args[0], env);
    if (args.length > 1) {
        const styles = await interpretate(args[1], env);
        env.element.setAttribute("style", styles);
    }
    env.local.uid = uid;
    WindowWrapper.getWindow(uid).display.makeStandardSize();
    WindowWrapper.getWindow(uid).display.setResizer(false);
    WindowWrapper.moveToContainer(uid, env.element);
}

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`HijackCellToContainer'].virtual = true;

core['CoffeeLiqueur`Extensions`ExportImport`Slides`Private`HijackCellToContainer'].destroy = async (args, env) => {
    WindowWrapper.remove(env.local.uid);
}