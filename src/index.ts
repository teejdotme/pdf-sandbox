import {AnnotationFactory} from 'annotpdf';

import pdfFile from './asset/input.pdf';
import hocrFile from './asset/output-01.hocr';

var pdfjsLib: any = window.pdfjsLib;

console.log('pdfjs', pdfjsLib);

async function loadMetadata(pageNum: number): Promise<Document> {
    const response = await fetch(hocrFile);

    const parser = new DOMParser();

    const parsed = parser.parseFromString(await response.text(), 'text/html');

    return parsed;
}

function parseHOCRString(str: string): {[key: string]: string} {
    var textarea = document.createElement('textarea');

    console.log(str, typeof str)

    textarea.innerHTML = str;

    str = textarea.value;

    const split = str.split(';');

    let result = {};

    for (let i = 0; i < split.length; i++) {
        const item = split[i];

        const key = item.trim().split(' ')[0];

        result[key] = item.substring(key.length + 1).trim();
    }

    return result;
}

interface BBOXString {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

function parseBboxString(str: string): BBOXString {
    const split = str.split(' ').filter(x => x.length > 0);

    return {
        startX: parseFloat(split[0]),
        startY: parseFloat(split[1]),
        endX: parseFloat(split[2]),
        endY: parseFloat(split[3]),
    }
}


async function main() {
    let annotated = await annotatePDF(pdfFile, 1);

    let rendered = await renderPDF(annotated);

    window.testFn = async function(selectedIndex: number) {
        let annotated = await annotatePDF(pdfFile, selectedIndex);

        let rendered = await renderPDF(annotated);
    };
}

async function downloadPDF(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    
    return blob;
}

let objectTag;

let _annotations;


async function annotatePDF(uri: string, selectedIndex: number): Promise<Blob> {
    let annotations = await AnnotationFactory.loadFile(uri);

    const metadata = await loadMetadata(1);

    const metadataBoxes = metadata.querySelectorAll('.ocr_carea');

    for (let i = 0; i < metadataBoxes.length; i++) {
        const item = metadataBoxes[i];
        const parentItem = item.parentElement;

        let itemHocr = parseHOCRString(item.attributes['title'].value);
        let parentHocr = parseHOCRString(parentItem?.attributes['title'].value);

        let itemBbox = parseBboxString(itemHocr['bbox']);
        let parentBbox = parseBboxString(parentHocr['bbox']);

        let dpiX = (parentBbox.endX - parentBbox.startX) / 8.5;
        let dpiY = (parentBbox.endY - parentBbox.startY) / 11;
        
        console.log('item', itemBbox, parentBbox, dpiX, dpiY);

        let highlight = annotations.createHighlightAnnotation({
            page: 0,
            rect: [
                ((itemBbox.startX) / dpiX) * 72,
                ((parentBbox.endY - itemBbox.startY) / dpiY) * 72,
                ((itemBbox.endX) / dpiX) * 72,
                ((parentBbox.endY - itemBbox.endY) / dpiY) * 72,
            ],
            //contents: "Test123",
            //author: "John",
            color: selectedIndex === i ? {r:0, g:128, b:0} : {r: 0, g: 0, b: 128},
            opacity: 0.5
        });

        //if (i >= 0) break;
    }

    const buffer = annotations.write();

    return new Blob([buffer], { type: 'application/pdf' });
}

async function renderPDF(blob: Blob): Promise<HTMLObjectElement> {
    if (!objectTag) {
        objectTag = document.createElement('object');
    
        objectTag.type = 'application/pdf';
        objectTag.width = '100%';
        objectTag.height = '100%';

        

        document.getElementById('container')?.appendChild(objectTag);
    }

    objectTag.data = URL.createObjectURL(blob);

    return objectTag;
}

document.addEventListener('DOMContentLoaded', function() {
    // Your code here will run once the DOM is ready, similar to $(document).ready()
    console.log("DOM fully loaded and parsed");
    main();
});


