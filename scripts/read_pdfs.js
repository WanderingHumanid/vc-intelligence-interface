const fs = require('fs');
const pdf = require('pdf-parse');

async function extractText(filePath) {
    let dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        console.log(`\n\n--- CONTENT OF ${filePath} ---\n\n`);
        console.log(data.text);
    } catch (e) {
        console.error("Error reading PDF:", e);
    }
}

async function main() {
    await extractText("c:\\Users\\sreer\\OneDrive\\Documents\\VSCODE\\vc-intelligence-interface\\Case context.pdf");
    await extractText("c:\\Users\\sreer\\OneDrive\\Documents\\VSCODE\\vc-intelligence-interface\\VC Sourcing Assignment.pdf");
}

main();
