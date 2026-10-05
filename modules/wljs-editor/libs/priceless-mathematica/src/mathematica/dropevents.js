import {
    EditorView,
    Decoration,
    ViewPlugin
  } from "@codemirror/view";


  const transferFiles = async (list, ev, view, handler) => {
    

    


    if (list.length == 0) return;

    if (handler.pasteTypeAsk) {
      const ch = await handler.pasteTypeAsk(view, ['Import a file', 'Import a path', 'Insert a path']);
      switch (ch) {
        case 2:
          handler.pastePath(view, list.map((el) => window.electronAPI.getFilePath(el)));
          return;
        break;
        case 3:
          handler.insertPath(view, list.map((el) => window.electronAPI.getFilePath(el)));
          return;
        
        break
        default:
      }
    }

    const id = new Date().valueOf();
    let count = 0;

    const progress = (num) => {
        
    };

    view.dom.loadingMark = true;
    const originalColor = view.dom.style.background;

    let hue = 0;

    console.log('Start animation');

    const loaderAnimation = setInterval(() => {
      view.dom.style.setProperty("background", 'hsl('+hue+'deg 100% 97%)', "important");
      hue = hue + 2;
      if (hue > 360) hue = 0;
    }, 30);

    progress(0);
    handler.transaction(ev, view, id, list.length);
    
    for (const file of list) {
        readFile(file, (name, result) => {
            handler.file(ev, view, id, name, result);
            count++;
            progress(count);
            if (count >= list.length && view.dom) {
              if (view.dom.loadingMark) {
                view.dom.loadingMark = false;
                setTimeout(() => {
                  view.dom.style.background = originalColor;
                  clearInterval(loaderAnimation);
                  console.log('Stop animation');
                }, 2000);
              }
            }
        }, () => {
            console.warn('Fauilure');
            const original = view.dom.style.background;
            view.dom.style.background = 'rgb(255 189 189 / 97%)';
            let opacity = 97;
            const interval = setInterval(() => {
              view.dom.style.background = 'rgb(255 189 189 / '+Math.round(opacity)+'%)';
              opacity = opacity * 0.95;
            }, 30);

            
            clearInterval(loaderAnimation);

            setTimeout(() => {
              clearInterval(interval);
              view.dom.style.background = original;
            }, 3000);
        })
    }
    
}

function readFile(file, cbk, fail) {
    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
      const payload = event.target.result;
      if (payload.byteLength / 1024 / 1024 > 100) {
        alert('Files > 100Mb are not supported for drag and drop');
        fail();
        return;
        //throw 'Files > 15Mb are not supported for drag and drop';
      }

      let compressedData = base64ArrayBuffer(payload);
      //console.log(compressedData);
      cbk(file.name, compressedData);  
    });
  
    reader.addEventListener('progress', (event) => {
      if (event.loaded && event.total) {
        const percent = (event.loaded / event.total) * 100;
        console.log(percent);
      }
    });

    reader.readAsArrayBuffer(file);
}

const regex = new RegExp("^jsfc4uri");
const crappy1Regex = new RegExp(decodeURIComponent('%EF%9F%81%EF%9F%89%EF%9F%88'));
const crappyString = decodeURIComponent('%5C!%5C(%5C*');

//drag and drop and past events
export const DropPasteHandlers = (hd, hp, hcc = console.log, crappyHandler1 = console.log, crappyHandler2 = console.log) => EditorView.domEventHandlers({
	drop(ev, view) {
        //console.log("codeMirror :: paste ::", ev); // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();

        const filesArray = [];

        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            [...ev.dataTransfer.items].forEach((item, i) => {
                // If dropped items aren't files, reject them
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    console.log(`… file[${i}].name = ${file.name}`);
                    filesArray.push(file);
                }
            });
        } else {
            // Use DataTransfer interface to access the file(s)
            [...ev.dataTransfer.files].forEach((file, i) => {
                console.log(`… file[${i}].name = ${file.name}`);
                filesArray.push(file);
            });
        }

        transferFiles(filesArray, ev, view, hd);

    },

    paste(ev, view) {
      
        let paste = (ev.clipboardData || window.clipboardData);
        const items = paste.items;
        let stringOnly = false;

        for (const o of items) {
          if (o?.type == "text/plain") {
            stringOnly = true;
            break;
          }
        }

        for (const obj of items) {
          //console.log(obj);
          if (obj.kind === "string") {
           switch(obj.type) {
             case 'text/plain':
               const content = paste.getData("text");
               if (regex.test(content)) {
                 ev.preventDefault();
                 hcc(ev, view, content.slice(8));
               } else if (crappy1Regex.test(content)) {
                 ev.preventDefault();
                 crappyHandler1(ev, view, content)
               } else if (content.includes(crappyString) === true) {
                 ev.preventDefault();
                 crappyHandler2(ev, view, content)                
               }
           
               break;
             case "image/png":
               
               ev.preventDefault();
               if (stringOnly) return;
               transferFiles([obj.getAsFile()], ev, view, hp);
               break;
             }
           } else {
            ev.preventDefault();
            if (stringOnly) return;
            transferFiles([obj.getAsFile()], ev, view, hp);
           }
        }
    }
})

