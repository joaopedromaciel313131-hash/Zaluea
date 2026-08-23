import fs from 'fs';

const htmlContent = fs.readFileSync('GTA_Definitive_10AI_Edition.html');
const zipContent = fs.readFileSync('GTA_Definitive_10AI_Edition.zip');

const htmlBase64 = htmlContent.toString('base64');
const zipBase64 = zipContent.toString('base64');

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Download APEX CITY: OVERDRIVE</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body {
            background: #0a0e17;
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
            text-align: center;
        }
        .card {
            background: #151c2c;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 16px;
            padding: 28px 20px;
            max-width: 520px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0,0,0,0.7);
        }
        .badge {
            background: linear-gradient(90deg, #ff4757, #ff6b81);
            color: #fff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            padding: 4px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 12px;
        }
        h1 {
            font-size: 26px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 6px;
        }
        h1 span { color: #ff4757; }
        p {
            font-size: 14px;
            color: #a4b0be;
            margin-bottom: 20px;
            line-height: 1.4;
        }
        .btn-download {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            background: linear-gradient(135deg, #2ed573, #10ac84);
            color: #fff;
            text-decoration: none;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
            box-shadow: 0 8px 20px rgba(46, 213, 115, 0.35);
            transition: transform 0.15s ease;
            cursor: pointer;
            border: none;
        }
        .btn-download:active { transform: scale(0.97); }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: none;
            color: #00d2d3;
            font-size: 14px;
        }
        .btn-secondary:active { background: rgba(255, 255, 255, 0.15); }
        .info-box {
            background: rgba(0, 210, 211, 0.08);
            border: 1px solid rgba(0, 210, 211, 0.25);
            border-radius: 10px;
            padding: 12px;
            margin-top: 16px;
            text-align: left;
            font-size: 12px;
            color: #c8d6e5;
            line-height: 1.5;
        }
        .info-box b { color: #00d2d3; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Definitive 10-AI Edition</div>
        <h1>APEX CITY<br><span>OVERDRIVE</span></h1>
        <p>Optimized for Google Pixel 10 & PC. Tap below to download the game directly to your device storage.</p>

        <!-- Direct Download Buttons -->
        <button class="btn-download" id="dl-html-btn">
            <span>📥</span> Download Standalone Game (.HTML)
        </button>

        <button class="btn-download btn-secondary" id="dl-zip-btn">
            <span>📦</span> Download Full Project Archive (.ZIP)
        </button>

        <a href="games/gta/index.html" class="btn-download btn-secondary" style="color: #ff9f43; border-color: rgba(255, 159, 67, 0.4);">
            <span>▶</span> Launch Game in Browser
        </a>

        <div class="info-box">
            <b>💡 How to play on Google Pixel / Mobile:</b><br>
            1. Tap <b>"Download Standalone Game (.HTML)"</b> above.<br>
            2. Open your phone's <b>Downloads</b> folder.<br>
            3. Tap <b>Apex_City_Overdrive.html</b> to open and play offline immediately in Chrome!
        </div>
    </div>

    <script>
        const htmlB64 = "###HTML_BASE64###";
        const zipB64 = "###ZIP_BASE64###";

        function triggerDownload(base64Data, fileName, mimeType) {
            try {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 2500);
            } catch(e) {
                window.location.href = fileName;
            }
        }

        document.getElementById('dl-html-btn').addEventListener('click', () => {
            triggerDownload(htmlB64, 'Apex_City_Overdrive.html', 'text/html');
        });

        document.getElementById('dl-zip-btn').addEventListener('click', () => {
            triggerDownload(zipB64, 'Apex_City_Overdrive.zip', 'application/zip');
        });
    </script>
</body>
</html>`;

const finalPage = template
    .replace('###HTML_BASE64###', htmlBase64)
    .replace('###ZIP_BASE64###', zipBase64);

fs.writeFileSync('Site/download.html', finalPage);
fs.writeFileSync('download.html', finalPage);
console.log('Successfully generated Site/download.html and download.html');
