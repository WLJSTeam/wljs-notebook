const { pathToFileURL } = require('url');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { PDFDocument } = require('pdf-lib');

function createPdfTools(pdfjsLib, pdfjsDirectory) {
    const NodeCanvasFactory = {
        create: (width, height) => {
            const canvas = createCanvas(width, height);
            return {
                canvas,
                context: canvas.getContext('2d'),
            };
        },
        reset: (canvasAndContext, width, height) => {
            canvasAndContext.canvas.width = width;
            canvasAndContext.canvas.height = height;
        },
        destroy: (canvasAndContext) => {
            canvasAndContext.canvas = null;
            canvasAndContext.context = null;
        },
    };

    async function getVisualBoundingBox(pdfBuffer, pageNumber = 1, scale = 2.0) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
            path.join(pdfjsDirectory, 'pdf.worker.mjs')
        ).href;
        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        const pdf = await loadingTask.promise;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvasFactory = NodeCanvasFactory;
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
        const canvas = canvasAndContext.canvas;
        const context = canvasAndContext.context;

        await page.render({ canvasContext: context, viewport, canvasFactory }).promise;

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const r = imageData[idx];
                const g = imageData[idx + 1];
                const b = imageData[idx + 2];
                const a = imageData[idx + 3];

                const isNotWhite = !(r === 255 && g === 255 && b === 255 && a === 255);
                if (isNotWhite) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        return {
            x: minX / scale,
            y: (canvas.height - maxY) / scale,
            width: (maxX - minX) / scale,
            height: (maxY - minY) / scale,
        };
    }

    async function cropPdfBuffer(inputBuffer, margin = 10, pageNumber = 1) {
        const bbox = await getVisualBoundingBox(new Uint8Array(inputBuffer), pageNumber);

        const pdfDoc = await PDFDocument.load(inputBuffer);
        const page = pdfDoc.getPages()[pageNumber - 1];
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const x = Math.max(0, bbox.x - margin);
        const y = Math.max(0, bbox.y - margin);
        const width = Math.min(pageWidth - x, bbox.width + 2 * margin);
        const height = Math.min(pageHeight - y, bbox.height + 2 * margin);

        page.setCropBox(x, y, width, height);

        return pdfDoc.save();
    }

    return { cropPdfBuffer, getVisualBoundingBox };
}

module.exports = { createPdfTools };
