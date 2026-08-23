import fs from 'fs';
import path from 'path';

const basePath = path.join(process.cwd(), 'Site', 'games', 'gta');

const css = fs.readFileSync(path.join(basePath, 'css', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(basePath, 'index.html'), 'utf8');

// Read all JS modules
const audioJs = fs.readFileSync(path.join(basePath, 'js', 'audio.js'), 'utf8');
const weatherJs = fs.readFileSync(path.join(basePath, 'js', 'weather.js'), 'utf8');
const cityJs = fs.readFileSync(path.join(basePath, 'js', 'city.js'), 'utf8');
const vehiclesJs = fs.readFileSync(path.join(basePath, 'js', 'vehicles.js'), 'utf8');
const weaponsJs = fs.readFileSync(path.join(basePath, 'js', 'weapons.js'), 'utf8');
const playerJs = fs.readFileSync(path.join(basePath, 'js', 'player.js'), 'utf8');
const trafficJs = fs.readFileSync(path.join(basePath, 'js', 'traffic.js'), 'utf8');
const pedestriansJs = fs.readFileSync(path.join(basePath, 'js', 'pedestrians.js'), 'utf8');
const policeJs = fs.readFileSync(path.join(basePath, 'js', 'police.js'), 'utf8');
const missionsJs = fs.readFileSync(path.join(basePath, 'js', 'missions.js'), 'utf8');
const cheatsJs = fs.readFileSync(path.join(basePath, 'js', 'cheats.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(basePath, 'js', 'ui.js'), 'utf8');
const mainJs = fs.readFileSync(path.join(basePath, 'js', 'main.js'), 'utf8');

// Strip export/import statements to combine into a single clean script
function cleanCode(code) {
    return code
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s+class\s+/g, 'class ')
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+\{[^}]*\};?/g, '')
        .replace(/export\s+default\s+/g, '');
}

const combinedGameScript = `
import * as THREE from './Site/games/gta/js/three.module.js';

${cleanCode(audioJs)}
${cleanCode(weatherJs)}
${cleanCode(cityJs)}
${cleanCode(vehiclesJs)}
${cleanCode(weaponsJs)}
${cleanCode(playerJs)}
${cleanCode(trafficJs)}
${cleanCode(pedestriansJs)}
${cleanCode(policeJs)}
${cleanCode(missionsJs)}
${cleanCode(cheatsJs)}
${cleanCode(uiJs)}
${cleanCode(mainJs)}
`;

// Extract body inner HTML from index.html
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const bodyContent = bodyMatch ? bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') : '';

// Also build a CDN fallback import version for offline single file
const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Grand Theft Auto: AI Vice & Chaos (10-AI Definitive Edition)</title>
    <style>
${css}
    </style>
</head>
<body>
${bodyContent}

    <!-- Embedded Three.js Import Map -->
    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/": "https://unpkg.com/three@0.160.0/"
        }
    }
    </script>
    <script type="module">
    // Fallback: If external CDN unavailable, use local three.module.js
    let THREE;
    try {
        THREE = await import('three');
    } catch(e) {
        THREE = await import('./Site/games/gta/js/three.module.js');
    }

${cleanCode(audioJs)}
${cleanCode(weatherJs)}
${cleanCode(cityJs)}
${cleanCode(vehiclesJs)}
${cleanCode(weaponsJs)}
${cleanCode(playerJs)}
${cleanCode(trafficJs)}
${cleanCode(pedestriansJs)}
${cleanCode(policeJs)}
${cleanCode(missionsJs)}
${cleanCode(cheatsJs)}
${cleanCode(uiJs)}
${cleanCode(mainJs)}
    </script>
</body>
</html>`;

fs.writeFileSync('GTA_Definitive_10AI_Edition.html', standaloneHtml);
fs.writeFileSync(path.join('Site', 'GTA_Definitive_10AI_Edition.html'), standaloneHtml);
console.log('Successfully created standalone GTA_Definitive_10AI_Edition.html');
