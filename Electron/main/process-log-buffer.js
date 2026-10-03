const TRUNCATED_SUFFIX = '… [line truncated]';
const activeLogWindows = new Set();

class ProcessLogBuffer {
    constructor({ capacity = 100, maxLineLength = 8 * 1024 } = {}) {
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw new RangeError('capacity must be a positive integer');
        }
        if (!Number.isInteger(maxLineLength) || maxLineLength < 1) {
            throw new RangeError('maxLineLength must be a positive integer');
        }

        this.capacity = capacity;
        this.maxLineLength = maxLineLength;
        this.lines = new Array(capacity);
        this.next = 0;
        this.size = 0;
        this.pending = { stdout: '', stderr: '' };
        this.truncated = { stdout: false, stderr: false };
    }

    append(source, chunk, encoding) {
        const text = toText(chunk, encoding);
        if (text.length === 0) return;

        let start = 0;
        let newline;

        while ((newline = text.indexOf('\n', start)) !== -1) {
            this.#appendSegment(source, text, start, newline);
            this.#commit(source);
            start = newline + 1;
        }

        if (start < text.length) {
            this.#appendSegment(source, text, start, text.length);
        }
    }

    snapshot({ includePending = true } = {}) {
        const pendingSources = [];
        if (includePending) {
            for (const source of ['stdout', 'stderr']) {
                if (this.pending[source] || this.truncated[source]) pendingSources.push(source);
            }
        }

        const pendingStart = Math.max(0, pendingSources.length - this.capacity);
        const pendingCount = pendingSources.length - pendingStart;
        const completeLineCount = Math.min(this.size, this.capacity - pendingCount);
        const skippedLines = this.size - completeLineCount;
        const result = new Array(completeLineCount + pendingCount);
        const oldest = (this.next - this.size + this.capacity) % this.capacity;

        for (let index = 0; index < completeLineCount; index++) {
            result[index] = this.lines[(oldest + skippedLines + index) % this.capacity];
        }

        if (includePending) {
            let index = completeLineCount;
            for (let pendingIndex = pendingStart; pendingIndex < pendingSources.length; pendingIndex++) {
                result[index++] = this.#format(pendingSources[pendingIndex]);
            }
        }

        return result;
    }

    #appendSegment(source, text, start, end) {
        if (this.truncated[source] || start === end) return;

        const pending = this.pending[source];
        const available = this.maxLineLength - pending.length;
        const segmentLength = end - start;

        if (segmentLength <= available) {
            this.pending[source] = pending + text.slice(start, end);
            return;
        }

        if (available > 0) {
            this.pending[source] = pending + text.slice(start, start + available);
        }
        this.truncated[source] = true;
    }

    #commit(source) {
        let line = this.pending[source];
        if (line.endsWith('\r')) line = line.slice(0, -1);

        this.lines[this.next] = this.#format(source, line);
        this.next = (this.next + 1) % this.capacity;
        if (this.size < this.capacity) this.size++;

        this.pending[source] = '';
        this.truncated[source] = false;
    }

    #format(source, line = this.pending[source]) {
        return `[${source}] ${line}${this.truncated[source] ? TRUNCATED_SUFFIX : ''}`;
    }
}

function toText(chunk, encoding) {
    if (typeof chunk === 'string') return chunk;
    if (Buffer.isBuffer(chunk)) return chunk.toString(encoding);
    if (ArrayBuffer.isView(chunk)) {
        return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength).toString(encoding);
    }
    return String(chunk);
}

function installProcessLogCapture({ stdout = process.stdout, stderr = process.stderr, ...options } = {}) {
    const buffer = new ProcessLogBuffer(options);
    const restoreStdout = captureWrites(stdout, 'stdout', buffer);
    const restoreStderr = captureWrites(stderr, 'stderr', buffer);

    return {
        buffer,
        restore() {
            restoreStdout();
            restoreStderr();
        }
    };
}

function captureWrites(stream, source, buffer) {
    if (!stream || typeof stream.write !== 'function') return () => {};

    const originalWrite = stream.write;

    function capturedWrite(chunk, encoding) {
        try {
            buffer.append(source, chunk, typeof encoding === 'string' ? encoding : undefined);
        } catch {
            // Diagnostics must never interfere with the actual output stream.
        }

        return originalWrite.apply(this, arguments);
    }

    stream.write = capturedWrite;

    return () => {
        if (stream.write === capturedWrite) stream.write = originalWrite;
    };
}

function createProcessLogWindow(BrowserWindow, lines) {
    const win = new BrowserWindow({
        width: 760,
        height: 480,
        minWidth: 480,
        minHeight: 280,
        title: 'WLJS Process Logs',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    activeLogWindows.add(win);
    win.once('closed', () => activeLogWindows.delete(win));

    const content = lines.length > 0
        ? stripAnsi(lines.join('\n'))
        : 'No stdout or stderr output has been captured yet.';

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>WLJS Process Logs</title>
<style>
html, body { margin: 0; min-height: 100%; background: #171717; color: #e5e5e5; }
pre { box-sizing: border-box; margin: 0; padding: 14px; min-height: 100vh; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body><pre>${escapeHtml(content)}</pre></body>
</html>`;

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
        .catch((error) => {
            console.error('Failed to open process log window', error);
            if (!win.isDestroyed()) win.destroy();
        });
    return win;
}

function stripAnsi(text) {
    return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function escapeHtml(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

module.exports = {
    ProcessLogBuffer,
    createProcessLogWindow,
    installProcessLogCapture
};
