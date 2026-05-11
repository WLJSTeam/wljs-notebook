
import { Terminal } from 'xterm';

import { generate, count } from "random-words";
//const c = require('ansi-colors');
//import { FitAddon } from 'xterm-addon-fit';

const term = new Terminal({cursorBlink: true, rows: 13, fontFamily: 'monospace'});

///const fitAddon = new FitAddon();
//term.loadAddon(fitAddon);

const logger = document.getElementById('log');



// Open the terminal in #terminal-container
term.open(logger);

term.options.fontSize = 12;
term.cols = 30;
term.rows = 5;
//term.resize();

term.options.theme.background = "rgb(0,0,0,0)";

document.getElementsByClassName('xterm-viewport')[0].style.backgroundColor = "transparent";
// Make the terminal's size and geometry fit the size of #terminal-container
//setTimeout(() =>fitAddon.fit(), 100);

logger.addEventListener("resize", (event) => {
   // fitAddon.fit();
});


window.electronAPI.clear(() => {
    term.clear();
    //alert('clear');
});


window.electronAPI.handleLogs((event, value, color) => {
    if (color) {
        term.writeln(color+value.replace(/(\n)/gm,"\r\n").trim()+'\x1b[0m');
    } else {
        term.writeln(value.replace(/(\n)/gm,"\r\n").trim()+'\x1b[0m');
    }
    
});

/*function runCommand(term, command) {
    if (command.length > 0) {
        clearInput(command);
        socket.send(command + '\n');
        return;
    }
}*/
const debug = document.getElementById("debug_button");
debug.addEventListener('click', () => {
    window.electronAPI.debug();
    debug.remove();
})



const info = document.getElementById("modal_info");
const newsFeed = document.getElementById("news_feed_items");

const escapeHtml = (text) => {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const renderNewsItems = (items) => {
    if (!newsFeed) return;
    if (!Array.isArray(items) || items.length === 0) {
        newsFeed.innerHTML = '<div style="font-size: 0.75rem; color: #94a3b8;">No WLJS news available.</div>';
        return;
    }

    newsFeed.innerHTML = items.map((item) => {
        const title = escapeHtml(item.title || 'Untitled');
        const summary = escapeHtml(item.summary || '');
        const dateText = escapeHtml(item.dateText || '');
        const source = escapeHtml(item.source || 'News');
        const url = item.url ? escapeHtml(item.url) : 'https://wljs.io';

        return `
            <a href="${url}" target="_blank" rel="noreferrer" class="news-item">
              <div class="news-source">${source}</div>
              <div class="news-title">${title}</div>
              <div class="news-meta">${dateText}${summary ? ' · ' + summary : ''}</div>
            </a>`;
    }).join('');
};

window.electronAPI.updateInfo((event, info) => {
    document.getElementById("modal_info_state").innerText = info;
})

window.electronAPI.updateVersion((event, info) => {
    document.getElementById("modal_info_version").innerText = info;
})

window.electronAPI.handleNews((event, items) => {
    renderNewsItems(items);
});

window.electronAPI.addPromt((event, id, title) => {
    //well. implement it in a way you like, this is just a simple form
    const modal = document.getElementById('modal_dialog');
    document.getElementById('modal_dialog_message').innerText = title;
    const button = document.getElementById('modal_dialog_button');
    const field = document.getElementById('modal_dialog_field');
    

    let resolve;
    

    resolve = () => {
        button.removeEventListener('click', resolve);
        window.electronAPI.resolveInput(id, field.value);
        modal.classList.add('hidden');
        info.classList.remove('hidden');
        field.value = "";
    };

    button.addEventListener('click', resolve);

    info.classList.add('hidden');
    modal.classList.remove('hidden');
});


window.electronAPI.addDialog((event, id, title) => {

    /*const disposable = term.onData((str) => {
        console.log(str);
    });*/
    

    const result = confirm(title);
    window.electronAPI.resolveInput(id, result);
    
});

const runColorMode = (fn) => {
    if (!window.matchMedia) {
      return;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');

    fn(query.matches);

    query.addEventListener('change', (event) => fn(event.matches));
  }

  runColorMode((isDarkMode) => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }); 

window.ifLinux = () => {
    if (navigator.appVersion.indexOf("X11") != -1) return true;
    if (navigator.appVersion.indexOf("Linux") != -1) return true;

    return false;
}

window.ifWin = () => {
    console.warn(navigator.appVersion);
    if (navigator.appVersion.indexOf('Win') != -1) return true;
    return false;
}

  if (ifLinux() || ifWin()) {
    document.body.style.paddingTop = "0";
    logger.style.height = "auto";
    runColorMode((isDarkMode) => {
        if (isDarkMode) {
            document.body.classList.add("dark-static");    
            document.body.classList.remove("light-static");    
        } else {
            document.body.classList.remove("dark-static");    
            document.body.classList.add("light-static");  
        }
      }); 
    
  }