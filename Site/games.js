var games = [
    {
        name: "APEX CITY: OVERDRIVE",
        desc: "Definitive 10-AI Edition — 3D Open World, 8 Weapons, Drivable Cars, Tanks & Choppers, 5-Star Police, Story Missions & Radio Stations!",
        badge: "👑 10-AI FLAGSHIP",
        path: "games/gta/index.html"
    },
    {
        name: "Flappy Bird",
        desc: "Classic endless arcade flapping game built on PlayCanvas.",
        badge: "ARCADE",
        path: "games/flappybird/index.html"
    }
];

var glist = document.getElementById("gameslist");

for (let item of games) {
    let card = document.createElement("div");
    card.style.background = "rgba(255, 255, 255, 0.06)";
    card.style.border = "1px solid rgba(255, 255, 255, 0.12)";
    card.style.borderRadius = "10px";
    card.style.padding = "16px 20px";
    card.style.display = "flex";
    card.style.justifyContent = "space-between";
    card.style.alignItems = "center";
    card.style.cursor = "pointer";
    card.style.transition = "all 0.2s ease";

    card.onmouseover = () => { card.style.background = "rgba(255, 71, 87, 0.15)"; card.style.borderColor = "#ff4757"; };
    card.onmouseout = () => { card.style.background = "rgba(255, 255, 255, 0.06)"; card.style.borderColor = "rgba(255, 255, 255, 0.12)"; };

    let left = document.createElement("div");
    left.style.textAlign = "left";

    let badge = document.createElement("div");
    badge.textContent = item.badge;
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "bold";
    badge.style.color = "#00d2d3";
    badge.style.letterSpacing = "1px";
    badge.style.marginBottom = "4px";

    let title = document.createElement("div");
    title.textContent = item.name;
    title.style.fontSize = "20px";
    title.style.fontWeight = "bold";
    title.style.color = "#fff";

    let desc = document.createElement("div");
    desc.textContent = item.desc;
    desc.style.fontSize = "13px";
    desc.style.color = "#a4b0be";
    desc.style.marginTop = "4px";

    left.appendChild(badge);
    left.appendChild(title);
    left.appendChild(desc);

    let btn = document.createElement("button");
    btn.textContent = "PLAY ▶";
    btn.style.background = "linear-gradient(135deg, #2ed573, #10ac84)";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.padding = "10px 22px";
    btn.style.borderRadius = "8px";
    btn.style.fontSize = "14px";
    btn.style.fontWeight = "bold";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 12px rgba(46, 213, 115, 0.4)";

    card.appendChild(left);
    card.appendChild(btn);

    card.onclick = function(e) {
        e.preventDefault();
        loadGame(item.path);
    };

    glist.appendChild(card);
}

function loadGame(path) {
    var button = document.getElementById('button');
    var button1 = document.getElementById('button1');
    var button2 = document.getElementById('button2');
    var button3 = document.getElementById('button3');
    var button_closegame = document.getElementById('button_closegame');
    var button_fullscreengame = document.getElementById('button_fullscreengame');
    var gameWindow = document.getElementById('gamewindow');
    button.style.display = 'none';
    button1.style.display = 'none';
    button2.style.display = 'none';
    button3.style.display = 'none';
    button_closegame.style.display = 'initial';
    button_fullscreengame.style.display = 'initial';
    gameWindow.setAttribute('src', path);
    gameWindow.style.display = 'initial';
}

function closeGame() {
    var button_closegame = document.getElementById('button_closegame');
    var button_fullscreengame = document.getElementById('button_fullscreengame');
    var button = document.getElementById('button');
    var button1 = document.getElementById('button1');
    var button2 = document.getElementById('button2');
    var button3 = document.getElementById('button3');
    var gameWindow = document.getElementById('gamewindow');
    button_closegame.style.display = 'none';
    button_fullscreengame.style.display = 'none';
    button.style.display = 'initial';
    button1.style.display = 'initial';
    button2.style.display = 'initial';
    button3.style.display = 'initial';
    gameWindow.style.display = 'none';
    gameWindow.removeAttribute('src');
}

function fullscreenGame() {
    var gameWindow = document.getElementById('gamewindow');
    gameWindow.requestFullscreen();
}