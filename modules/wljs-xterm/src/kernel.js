import { Terminal } from '@xterm/xterm';
//import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { LocalEchoAddon } from '@gytx/xterm-local-echo';

let terminal = {};
let localEcho = null;

core['CoffeeLiqueur`Extensions`Terminal`Private`UIXtermPrint'] = async (args, env) => {
  if (!terminal.loaded) return;
  const data = interpretate(args[0], env);
  // Preserve newlines as CRLF for terminals
  terminal.write(String(data).replace(/\n/g, '\r\n'));
};

function randomChoice(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

let globalCallback = undefined;

core['CoffeeLiqueur`Extensions`Terminal`Private`UIXtermResolve'] = (args, env) => {
  if (!terminal.loaded) return;
  const data = interpretate(args[0], env);
  const decoded = decodeURIComponent(String(data));
  if (!globalCallback) {
    localEcho.println(decoded);
  } else {
    globalCallback(decoded);
  }
};

const spinners = ['|/-\\', '⣾⣽⣻⢿⡿⣟⣯⣷'];

/**
 * Start spinner on a dedicated status line at `statusRow` (0-based).
 * Returns interval id.
 */
function startSpinner(statusRow) {
  const frames = randomChoice(spinners);
  let i = 0;
  return setInterval(() => {
    const frame = frames.charAt(i++ % frames.length);
    // Save cursor, move to status row + 1 (1-based), clear line, draw, restore
    terminal.write(`\x1b[s\x1b[${statusRow + 1};1H\x1b[0K> ${frame}\x1b[u`);
  }, 80);
}

/** Stop and clear spinner line. */
function stopSpinner(intervalId, statusRow) {
  clearInterval(intervalId);
  terminal.write(`\x1b[s\x1b[${statusRow + 1};1H\x1b[2K\x1b[u`);
}

core['CoffeeLiqueur`Extensions`Terminal`Private`UIXtermLoad'] = async (args, env) => {
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    theme: {
      background: 'transparent',
      foreground: '#000000',
      selectionBackground: 'transparent',
      selectionForeground: 'yellow',
      cursor: 'rgba(0, 128, 128, 0.3)',
      selection: 'blue'
    },
    fontSize: 14,
    fontFamily: 'Hasklig, monospace'
  });

  // Fine-tune theme
  terminal.options.theme.background = 'rgb(0,0,0,0)';
  terminal.options.theme.selection = 'rgba(128, 128, 255, 0.3)';
  terminal.options.theme.selectionInactiveBackground = 'rgba(128, 128, 255, 0.3)';
  terminal.options.theme.selectionBackground = 'rgba(128, 128, 255, 0.3)';

  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  //const fit = new FitAddon();
  //terminal.loadAddon(fit);

  terminal.loaded = true;

  const uid = await interpretate(args[0], env);
  const channel = await interpretate(args[1], env);

  const container = document.getElementById(uid);
  terminal.open(container);
  const vp = document.getElementsByClassName('xterm-viewport')[0];
  if (vp) vp.style.backgroundColor = 'transparent';

  //fit.fit();

  terminal.writeln('This is a virtual terminal connected to Wolfram Kernel');
  terminal.writeln('Your input is directly sent to the evaluation loop');
  terminal.writeln('');

  // Create and attach LocalEcho addon (handles multiline paste natively)
  localEcho = new LocalEchoAddon({
    enableIncompleteInput: false  // Disable shell-style continuation, submit on Enter
  });
  terminal.loadAddon(localEcho);

  // Completely take over paste handling to avoid double-paste
  const xtermTextarea = container.querySelector('.xterm-helper-textarea');
  if (xtermTextarea) {
    xtermTextarea.addEventListener('paste', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = e.clipboardData.getData('text');
      if (text) {
        // Feed each character to the terminal's onData (which local-echo listens to)
        terminal._core.coreService.triggerDataEvent(text, true);
      }
    }, true);
  }

  // ---- Prompt/loop ----
  const read = (cbk) =>
    localEcho.read('$ ')
      .then(input => cbk(input))
      .catch(error => interpretate.alert(`Error reading: ${error}`));

  const loop = (cmd) => {
    // Create a dedicated status line under the prompt for the spinner
    localEcho.println('');
    const statusRow = terminal.buffer.active.cursorY;

    const interval = startSpinner(statusRow);

    globalCallback = (answer) => {
      stopSpinner(interval, statusRow);
      localEcho.print('> ');
      // allow ANSI sequences to pass through
      localEcho.print(String(answer).replaceAll('\\x1b', '\x1b'));
      localEcho.println('');
      localEcho.println('');
      globalCallback = () => {};
      read(loop);
    };

    // Send command to your backend
    server.io.fire(channel, encodeURIComponent(cmd), 'Write');
  };

  // IMPORTANT: kick off the first prompt
  read(loop);
};
