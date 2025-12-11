import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';
import unzipper from 'unzipper';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

const CMS_URL = 'https://www.cms.gov/medicare/payment/prospective-payment-systems/ambulatory-surgical-center-asc/asc-payment-rates-addenda';

/**
 * Downloads the latest ASC AA Zip file from CMS
 * @param {string} outputDir - Directory to save files
 * @returns {Promise<string>} - Path to the extracted CSV file
 */
export async function downloadLatestFullPack(outputDir) {
    // Setup Browser with Proxy if needed
    const launchOptions = { headless: true };
    if (process.env.PROXY_URL) {
        launchOptions.proxy = { server: process.env.PROXY_URL };
        console.log(`🔒 Using Proxy: ${process.env.PROXY_URL}`);
    }

    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
        console.log(`🌍 Navigating to CMS: ${CMS_URL}`);
        await page.goto(CMS_URL, { timeout: 60000 });

        // Logic to find the link
        // CMS page structure changes, but usually lists "2025 ASC Approved HCPCS Code..."
        // We look for the section for the current/configured year.
        // User requested "expand the 2025 section". 
        // Usually these are accordions or simple lists.

        // Attempt to click on "2025" or similar if it's an accordion
        const currentYear = new Date().getFullYear();
        // Or user configured ASC_YEAR
        const targetYear = process.env.ASC_YEAR || '2025';

        console.log(`🔍 Searching for ${targetYear} data...`);

        // Example: Click a button that contains the year if it's an accordion
        // Note: CMS updated their site recently, typically it's a list relative to year

        // We try to find a link text containing "ASC Approved HCPCS Code" inside a container for the year
        // We will look for the link directly first.
        const downloadPromise = page.waitForEvent('download');

        // This locator is a best-guess based on CMS structure. 
        // We look for a link text that looks like the data file.
        // "ASC Approved HCPCS Code and Payment Rates"

        const linkText = "ASC Approved HCPCS Code and Payment Rates";

        // Often tucked in a detail/summary or a dynamic list.
        // We might need to click the Year header first.
        // Trying to click a button that parses as the year
        try {
            const yearButton = page.getByRole('button', { name: targetYear.toString(), exact: false });
            if (await yearButton.count() > 0 && await yearButton.isVisible()) {
                await yearButton.first().click();
                await page.waitForTimeout(1000); // Wait for expansion
            }
        } catch (e) {
            console.log("No specific year button found or click failed, trying global search.");
        }

        // Now find the link
        // We want the "newest". Usually they are listed by date.
        // We grab all links matching the text and pick the first one (top is usually newest).
        const link = page.getByRole('link', { name: linkText }).first();

        if (await link.count() === 0) {
            throw new Error(`Could not find link with text: ${linkText}`);
        }

        console.log("⬇️ Triggering download...");
        await link.click();

        // Check for "Accept License" modal
        // CMS often has a "Accept" button for license agreements on data downloads.
        try {
            const acceptBtn = page.getByRole('button', { name: /accept/i });
            // wait a short moment to see if it pops up
            await acceptBtn.waitFor({ state: 'visible', timeout: 5000 });
            if (await acceptBtn.isVisible()) {
                console.log("📝 Accepting License Agreement...");
                await acceptBtn.click();
            }
        } catch (e) {
            // No license modal, proceed
        }

        const download = await downloadPromise;
        const downloadPath = await download.path();
        const suggestedFilename = download.suggestedFilename();

        console.log(`✅ Downloaded: ${suggestedFilename}`);

        // Move to output dir
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const zipPath = path.join(outputDir, suggestedFilename);
        await download.saveAs(zipPath);

        await browser.close();

        // Now extract
        console.log("📦 Extracting...");
        const extractedPath = await extractAscCsv(zipPath, outputDir);
        return extractedPath;

    } catch (error) {
        console.error("❌ Error during download flow:", error);
        await browser.close();
        throw error;
    }
}

async function extractAscCsv(zipPath, outputDir) {
    // We want the file ending in -ASC-AA_.csv or similar logic
    // "extract only the -ASC-AA_.csv file"

    let targetFile = null;

    await fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
            const fileName = entry.path;
            // Filter logic
            // e.g. 508-Version-Jul-2025-ASC-AA_...csv
            if (fileName.includes('ASC-AA') && fileName.endsWith('.csv') && !fileName.includes('__MACOSX')) {
                console.log(`Found Target CSV: ${fileName}`);
                const outFile = path.join(outputDir, path.basename(fileName));
                entry.pipe(fs.createWriteStream(outFile));
                targetFile = outFile;
            } else {
                entry.autodrain();
            }
        })
        .promise();

    if (!targetFile) throw new Error("No matching ASC-AA csv file found in zip.");
    return targetFile;
}
