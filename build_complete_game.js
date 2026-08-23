import fs from 'fs';
import path from 'path';

const threeBundle = fs.readFileSync('Site/games/gta/js/three.bundle.js', 'utf8');
const css = fs.readFileSync('Site/games/gta/css/style.css', 'utf8');
const html = fs.readFileSync('Site/games/gta/index.html', 'utf8');

// Read all game modules
const audioJs = fs.readFileSync('Site/games/gta/js/audio.js', 'utf8');
const weatherJs = fs.readFileSync('Site/games/gta/js/weather.js', 'utf8');
const cityJs = fs.readFileSync('Site/games/gta/js/city.js', 'utf8');
const vehiclesJs = fs.readFileSync('Site/games/gta/js/vehicles.js', 'utf8');
const weaponsJs = fs.readFileSync('Site/games/gta/js/weapons.js', 'utf8');
const playerJs = fs.readFileSync('Site/games/gta/js/player.js', 'utf8');
const trafficJs = fs.readFileSync('Site/games/gta/js/traffic.js', 'utf8');
const pedestriansJs = fs.readFileSync('Site/games/gta/js/pedestrians.js', 'utf8');
const policeJs = fs.readFileSync('Site/games/gta/js/police.js', 'utf8');
const missionsJs = fs.readFileSync('Site/games/gta/js/missions.js', 'utf8');
const cheatsJs = fs.readFileSync('Site/games/gta/js/cheats.js', 'utf8');
const uiJs = fs.readFileSync('Site/games/gta/js/ui.js', 'utf8');
const mainJs = fs.readFileSync('Site/games/gta/js/main.js', 'utf8');

function cleanModule(code) {
    return code
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s+class\s+/g, 'class ')
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+\{[^}]*\};?/g, '')
        .replace(/export\s+default\s+/g, '');
}

// Extract body markup
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let bodyContent = bodyMatch ? bodyMatch[1] : '';
// Remove existing script tags
bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

const fullGameCode = `
// ==========================================
// 1. PROCEDURAL AUDIO SYNTHESIZER
// ==========================================
${cleanModule(audioJs)}

// ==========================================
// 2. DYNAMIC WEATHER & DAY/NIGHT CYCLE
// ==========================================
${cleanModule(weatherJs)}

// ==========================================
// 3. 3D CITY WORLD & DESTRUCTIBLE PROPS
// ==========================================
${cleanModule(cityJs)}

// ==========================================
// 4. VEHICLES FLEET & ARCADE DRIVING DYNAMICS
// ==========================================
${cleanModule(vehiclesJs)}

// ==========================================
// 5. WEAPONS ARSENAL & COMBAT BALLISTICS
// ==========================================
${cleanModule(weaponsJs)}

// ==========================================
// 6. RIGGED 3D PLAYER CONTROLLER
// ==========================================
${cleanModule(playerJs)}

// ==========================================
// 7. AUTONOMOUS TRAFFIC SIMULATION
// ==========================================
${cleanModule(trafficJs)}

// ==========================================
// 8. LIVING PEDESTRIAN & CROWD AI
// ==========================================
${cleanModule(pedestriansJs)}

// ==========================================
// 9. 5-STAR POLICE WANTED SYSTEM
// ==========================================
${cleanModule(policeJs)}

// ==========================================
// 10. STORY MISSIONS & SIDE ACTIVITIES
// ==========================================
${cleanModule(missionsJs)}

// ==========================================
// 11. GTA CHEAT CODES SYSTEM
// ==========================================
${cleanModule(cheatsJs)}

// ==========================================
// 12. GTA HUD, RADAR & GRAPHICS SETTINGS
// ==========================================
${cleanModule(uiJs)}

// ==========================================
// 13. MASTER ENGINE & EVENT ORCHESTRATION
// ==========================================
${cleanModule(mainJs)}
`;

const completeHtmlFile = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Grand Theft Auto: AI Vice & Chaos (10-AI Definitive Edition)</title>
    <style>
${css}
    </style>
    <script>
${threeBundle}
    </script>
</head>
<body>
${bodyContent}

    <script>
${fullGameCode}
    </script>
</body>
</html>`;

fs.writeFileSync('GTA_Definitive_10AI_Edition.html', completeHtmlFile);
fs.writeFileSync('Site/GTA_Definitive_10AI_Edition.html', completeHtmlFile);
fs.writeFileSync('Site/games/gta/index.html', completeHtmlFile);
console.log('Successfully generated self-contained GTA_Definitive_10AI_Edition.html! Size:', completeHtmlFile.length);
