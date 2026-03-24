// ─── ADENIUM OBESUM MOD ────────────────────────────────────────────────────
// Full lifecycle: Seed → Sprout → Young → Adult → Flowering → Pod → Dispersal
// Water axis: Optimal / Dry→Wilting→Dead / Overwatered→Yellowing→Wilting→Dead
// Seeds disperse with parachute silk like dandelion, land and regrow
// ───────────────────────────────────────────────────────────────────────────

(function() {

// ─── HELPERS ───────────────────────────────────────────────────────────────
function adj(pixel) {
    return [
        [pixel.x,   pixel.y-1],
        [pixel.x,   pixel.y+1],
        [pixel.x-1, pixel.y  ],
        [pixel.x+1, pixel.y  ],
        [pixel.x-1, pixel.y-1],
        [pixel.x+1, pixel.y-1],
        [pixel.x-1, pixel.y+1],
        [pixel.x+1, pixel.y+1],
    ];
}

function hasNeighbor(pixel, ...elems) {
    return adj(pixel).some(([x,y]) => {
        if (!pixelMap[x] || !pixelMap[x][y]) return false;
        return elems.includes(pixelMap[x][y].element);
    });
}

function countNeighbors(pixel, ...elems) {
    return adj(pixel).filter(([x,y]) => {
        if (!pixelMap[x] || !pixelMap[x][y]) return false;
        return elems.includes(pixelMap[x][y].element);
    }).length;
}

function hasBelow(pixel, ...elems) {
    const p = pixelMap[pixel.x] && pixelMap[pixel.x][pixel.y+1];
    return p && elems.includes(p.element);
}

function isWater(elem) {
    return ["water","fine_water","wet_sand","mud","dirty_water","rain"].includes(elem);
}

function absorbs(pixel) {
    // returns true and consumes a nearby water pixel
    const coords = adj(pixel);
    for (let [x,y] of coords) {
        if (pixelMap[x] && pixelMap[x][y] && isWater(pixelMap[x][y].element)) {
            deletePixel(x, y);
            return true;
        }
    }
    return false;
}

// ─── FINE WATER (capillary, seeps into sand) ───────────────────────────────
elements["fine_water"] = {
    name: "Fine Water",
    color: ["#a8d4f5","#b8ddf7","#c8e6fa"],
    behavior: behaviors.LIQUID,
    reactions: {
        "sand":     { elem1: "wet_sand", elem2: null, chance: 0.15 },
        "dirt":     { elem1: "mud",      elem2: null, chance: 0.1  },
        "fire":     { elem2: null },
        "lava":     { elem1: "obsidian", elem2: "steam" },
    },
    viscosity: 8,
    state: "liquid",
    density: 990,
    tempHigh: 95,
    stateHigh: "steam",
    tempLow: 0,
    stateLow: "ice",
    category: "liquids",
    desc: "Fine capillary water. Seeps slowly into sand. Ideal for desert plants."
};

// ─── ADENIUM SEED ──────────────────────────────────────────────────────────
elements["adenium_seed"] = {
    name: "Adenium Seed",
    color: ["#8B6914","#7a5c10","#9a7820"],
    behavior: behaviors.POWDER,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        // germinate if sitting on moist soil and warm enough
        if (!isEmpty(pixel.x, pixel.y+1, true)) {
            const below = pixelMap[pixel.x][pixel.y+1];
            const onSoil = below && eLists.SOIL.includes(below.element);
            const moist = below && (isWater(below.element) || below.element === "wet_sand" || below.element === "mud");
            if ((onSoil || moist) && pixel.temp > 15 && Math.random() < 0.002) {
                changePixel(pixel, "adenium_sprout");
                pixel.moisture = 50;
                pixel.age = 0;
            }
        }
        doDefaults(pixel);
    },
    properties: { moisture: 0, age: 0 },
    tempHigh: 80,
    stateHigh: "ash",
    burn: 20,
    burnTime: 10,
    state: "solid",
    density: 1200,
    category: "Desert Rose",
    desc: "Adenium obesum seed. Plant in warm sand. Water gently to germinate."
};

// ─── ADENIUM SPROUT ────────────────────────────────────────────────────────
elements["adenium_sprout"] = {
    name: "Adenium Sprout",
    color: ["#7ab87a","#6aa86a","#8ac88a"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;

        // water absorption
        if (Math.random() < 0.3) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 15));

        // passive moisture drain
        if (Math.random() < 0.02) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        // overwater check
        if ((pixel.moisture||0) > 90 && Math.random() < 0.005) {
            changePixel(pixel, "adenium_yellow"); return;
        }
        // dry check
        if ((pixel.moisture||0) < 10 && pixel.age > 200 && Math.random() < 0.003) {
            changePixel(pixel, "adenium_dry"); return;
        }
        // grow to young plant after enough time + moisture
        if (pixel.age > 400 && (pixel.moisture||0) > 30 && Math.random() < 0.001) {
            changePixel(pixel, "adenium_young");
            pixel.age = 0;
            pixel.moisture = pixel.moisture;
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0 },
    tempHigh: 65,
    stateHigh: "adenium_dry",
    burn: 15,
    burnTime: 15,
    state: "solid",
    density: 900,
    category: "Desert Rose",
    desc: "Young Adenium sprout. Keep moist but not waterlogged."
};

// ─── ADENIUM YOUNG ─────────────────────────────────────────────────────────
elements["adenium_young"] = {
    name: "Young Adenium",
    color: ["#6a9a60","#5a8a50","#7aaa70"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;
        if (Math.random() < 0.25) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 12));
        if (Math.random() < 0.015) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        if ((pixel.moisture||0) > 88 && Math.random() < 0.004) { changePixel(pixel,"adenium_yellow"); return; }
        if ((pixel.moisture||0) < 8  && pixel.age > 300 && Math.random() < 0.002) { changePixel(pixel,"adenium_dry"); return; }

        // grow caudex upward — build the thick trunk
        if ((pixel.moisture||0) > 25 && pixel.age > 600 && Math.random() < 0.0008) {
            if (isEmpty(pixel.x, pixel.y-1)) {
                createPixel("adenium_trunk", pixel.x, pixel.y-1);
                if (pixelMap[pixel.x][pixel.y-1]) {
                    pixelMap[pixel.x][pixel.y-1].moisture = pixel.moisture;
                    pixelMap[pixel.x][pixel.y-1].age = 0;
                    pixelMap[pixel.x][pixel.y-1].height = (pixel.height||0) + 1;
                }
            }
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0, height: 0 },
    tempHigh: 70,
    stateHigh: "adenium_dry",
    burn: 12,
    burnTime: 20,
    state: "solid",
    density: 1000,
    category: "Desert Rose",
    desc: "Young Adenium with forming caudex. Grows into a trunk with time and water."
};

// ─── ADENIUM TRUNK (caudex — the fat swollen stem) ─────────────────────────
elements["adenium_trunk"] = {
    name: "Adenium Caudex",
    color: ["#8fa888","#7a9a78","#9ab898","#6b8870"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;
        if (Math.random() < 0.2) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 10));
        if (Math.random() < 0.01) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        if ((pixel.moisture||0) > 85 && Math.random() < 0.003) { changePixel(pixel,"adenium_yellow"); return; }
        if ((pixel.moisture||0) < 5  && pixel.age > 500 && Math.random() < 0.001) { changePixel(pixel,"adenium_wilting"); return; }

        const h = pixel.height || 0;

        // grow upward — either more trunk or branch tips
        if ((pixel.moisture||0) > 30 && pixel.age > 800 && Math.random() < 0.0006) {
            if (isEmpty(pixel.x, pixel.y-1)) {
                const nextElem = h > 6 ? "adenium_branch" : "adenium_trunk";
                createPixel(nextElem, pixel.x, pixel.y-1);
                if (pixelMap[pixel.x][pixel.y-1]) {
                    pixelMap[pixel.x][pixel.y-1].moisture = pixel.moisture;
                    pixelMap[pixel.x][pixel.y-1].age = 0;
                    pixelMap[pixel.x][pixel.y-1].height = h + 1;
                }
            }
            // occasionally branch sideways
            const side = Math.random() < 0.5 ? 1 : -1;
            if (h > 3 && Math.random() < 0.0003 && isEmpty(pixel.x+side, pixel.y-1)) {
                createPixel("adenium_branch", pixel.x+side, pixel.y-1);
                if (pixelMap[pixel.x+side][pixel.y-1]) {
                    pixelMap[pixel.x+side][pixel.y-1].moisture = pixel.moisture;
                    pixelMap[pixel.x+side][pixel.y-1].height = h + 1;
                }
            }
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0, height: 0 },
    tempHigh: 75,
    stateHigh: "adenium_wilting",
    burn: 8,
    burnTime: 30,
    state: "solid",
    density: 1100,
    category: "Desert Rose",
    desc: "The swollen caudex of the Adenium. Stores water. Grows slowly into a tree."
};

// ─── ADENIUM BRANCH ────────────────────────────────────────────────────────
elements["adenium_branch"] = {
    name: "Adenium Branch",
    color: ["#5a8a50","#4a7a40","#6a9a60","#3a6a30"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;
        if (Math.random() < 0.15) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 8));
        if (Math.random() < 0.008) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        if ((pixel.moisture||0) > 80 && Math.random() < 0.003) { changePixel(pixel,"adenium_yellow"); return; }
        if ((pixel.moisture||0) < 5  && Math.random() < 0.002) { changePixel(pixel,"adenium_wilting"); return; }

        // branch tip can flower
        if ((pixel.moisture||0) > 40 && pixel.age > 600 && Math.random() < 0.0005) {
            if (isEmpty(pixel.x, pixel.y-1)) {
                createPixel("adenium_bud", pixel.x, pixel.y-1);
                if (pixelMap[pixel.x][pixel.y-1]) {
                    pixelMap[pixel.x][pixel.y-1].moisture = pixel.moisture;
                    pixelMap[pixel.x][pixel.y-1].age = 0;
                }
            }
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0, height: 0 },
    tempHigh: 70,
    stateHigh: "adenium_wilting",
    burn: 15,
    burnTime: 20,
    state: "solid",
    density: 900,
    category: "Desert Rose",
    desc: "Adenium branch. Tips will flower in good conditions."
};

// ─── ADENIUM BUD ───────────────────────────────────────────────────────────
elements["adenium_bud"] = {
    name: "Adenium Bud",
    color: ["#d44fa0","#c03a8a","#e060b0","#b83080"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;
        if (Math.random() < 0.1) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 5));
        if (Math.random() < 0.005) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        if ((pixel.moisture||0) > 80 && Math.random() < 0.004) { changePixel(pixel,"adenium_yellow"); return; }
        if ((pixel.moisture||0) < 5  && Math.random() < 0.003) { changePixel(pixel,"adenium_wilting"); return; }

        // bloom
        if (pixel.age > 300 && (pixel.moisture||0) > 35 && Math.random() < 0.001) {
            changePixel(pixel, "adenium_flower");
            pixel.age = 0;
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0 },
    tempHigh: 60,
    stateHigh: "adenium_wilting",
    state: "solid",
    density: 800,
    category: "Desert Rose",
    desc: "Adenium bud about to bloom."
};

// ─── ADENIUM FLOWER ────────────────────────────────────────────────────────
elements["adenium_flower"] = {
    name: "Adenium Flower",
    color: ["#ff4da6","#ff2288","#ff66bb","#e6008c","#ff80c4","#cc0066"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age || 0) + 1;
        if (Math.random() < 0.08) absorbs(pixel) && (pixel.moisture = Math.min(100, (pixel.moisture||0) + 4));
        if (Math.random() < 0.004) pixel.moisture = Math.max(0, (pixel.moisture||0) - 1);

        if ((pixel.moisture||0) > 78 && Math.random() < 0.004) { changePixel(pixel,"adenium_yellow"); return; }
        if ((pixel.moisture||0) < 5  && Math.random() < 0.004) { changePixel(pixel,"adenium_wilting"); return; }

        // occasionally emit a pollen pixel
        if (Math.random() < 0.0003 && isEmpty(pixel.x + (Math.random()<0.5?1:-1), pixel.y-1)) {
            const px = pixel.x + (Math.random()<0.5?1:-1);
            if (isEmpty(px, pixel.y-1)) createPixel("adenium_pollen", px, pixel.y-1);
        }

        // after long bloom, turn into seed pod
        if (pixel.age > 1200 && Math.random() < 0.0003) {
            changePixel(pixel, "adenium_pod");
            pixel.age = 0;
            pixel.podAge = 0;
        }
        doDefaults(pixel);
    },
    properties: { moisture: 50, age: 0 },
    tempHigh: 55,
    stateHigh: "adenium_wilting",
    burn: 30,
    burnTime: 8,
    state: "solid",
    density: 600,
    category: "Desert Rose",
    desc: "Adenium bloom. Pink trumpet flowers. Will eventually form seed pods."
};

// ─── ADENIUM POLLEN ────────────────────────────────────────────────────────
elements["adenium_pollen"] = {
    name: "Adenium Pollen",
    color: ["#ffe066","#ffd700","#ffec80"],
    behavior: behaviors.POWDER,
    tick: function(pixel) {
        doDefaults(pixel);
    },
    state: "solid",
    density: 300,
    burn: 5,
    burnTime: 3,
    category: "Desert Rose",
    desc: "Fine golden pollen from the Adenium flower."
};

// ─── ADENIUM POD ───────────────────────────────────────────────────────────
elements["adenium_pod"] = {
    name: "Adenium Pod",
    color: ["#8B4513","#7a3a0e","#9a5020","#6b3010"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.podAge = (pixel.podAge || 0) + 1;

        // pods dry and split — release parachute seeds
        if (pixel.podAge > 800 && Math.random() < 0.001) {
            changePixel(pixel, "adenium_wilting");
            // release 2-4 seeds with parachutes in a fan pattern
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const ox = Math.floor(Math.random() * 5) - 2;
                const oy = -1 - Math.floor(Math.random() * 2);
                if (isEmpty(pixel.x + ox, pixel.y + oy)) {
                    createPixel("adenium_silk_seed", pixel.x + ox, pixel.y + oy);
                    if (pixelMap[pixel.x+ox] && pixelMap[pixel.x+ox][pixel.y+oy]) {
                        pixelMap[pixel.x+ox][pixel.y+oy].vx = (Math.random()-0.5) * 2;
                        pixelMap[pixel.x+ox][pixel.y+oy].vy = -1;
                    }
                }
            }
        }
        doDefaults(pixel);
    },
    properties: { podAge: 0 },
    tempHigh: 90,
    stateHigh: "ash",
    burn: 10,
    burnTime: 25,
    state: "solid",
    density: 800,
    category: "Desert Rose",
    desc: "Elongated Adenium seed pod. Will split and release silk-carried seeds."
};

// ─── ADENIUM SILK SEED (parachute — like dandelion) ────────────────────────
elements["adenium_silk_seed"] = {
    name: "Adenium Silk Seed",
    color: ["#f0e8d8","#e8dcc8","#fff8f0"],
    behavior: behaviors.POWDER,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.floatAge = (pixel.floatAge || 0) + 1;

        // float phase — drift sideways and resist falling
        if (pixel.floatAge < 300) {
            const drift = Math.random() < 0.5 ? 1 : -1;
            if (Math.random() < 0.5 && isEmpty(pixel.x + drift, pixel.y)) {
                tryMove(pixel, pixel.x + drift, pixel.y);
                return;
            }
            if (Math.random() < 0.1 && isEmpty(pixel.x, pixel.y - 1)) {
                tryMove(pixel, pixel.x, pixel.y - 1);
                return;
            }
        }

        // once landed on soil → become seed
        if (!isEmpty(pixel.x, pixel.y+1, true)) {
            const below = pixelMap[pixel.x][pixel.y+1];
            if (below && eLists.SOIL.includes(below.element) && Math.random() < 0.01) {
                changePixel(pixel, "adenium_seed");
                pixel.moisture = 0;
                pixel.age = 0;
                return;
            }
        }
        doDefaults(pixel);
    },
    properties: { floatAge: 0 },
    state: "solid",
    density: 50,
    burn: 5,
    burnTime: 5,
    category: "Desert Rose",
    desc: "Adenium seed carried by silk threads. Drifts on air before landing."
};

// ─── ADENIUM DRY (dehydrated) ──────────────────────────────────────────────
elements["adenium_dry"] = {
    name: "Dry Adenium",
    color: ["#8B7355","#7a6245","#9a8265"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        // can recover if watered in time
        if (absorbs(pixel)) {
            pixel.moisture = (pixel.moisture||0) + 20;
            if ((pixel.moisture||0) > 25 && Math.random() < 0.05) {
                changePixel(pixel, "adenium_sprout");
                pixel.moisture = 30;
            }
            return;
        }
        pixel.moisture = Math.max(0, (pixel.moisture||0) - 0.5);
        if ((pixel.moisture||0) <= 0 && Math.random() < 0.002) {
            changePixel(pixel, "adenium_wilting");
        }
        doDefaults(pixel);
    },
    properties: { moisture: 5 },
    state: "solid",
    density: 900,
    burn: 25,
    burnTime: 15,
    category: "Desert Rose",
    desc: "Dehydrated Adenium. Water it quickly to save it."
};

// ─── ADENIUM YELLOW (overwatered) ──────────────────────────────────────────
elements["adenium_yellow"] = {
    name: "Yellowing Adenium",
    color: ["#c8b840","#b8a830","#d8c850","#a89820"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age||0) + 1;
        // will self-recover if no more water nearby and time passes
        if (!hasNeighbor(pixel, "water","fine_water","mud","wet_sand") && pixel.age > 400) {
            if (Math.random() < 0.002) changePixel(pixel, "adenium_sprout");
            return;
        }
        if (pixel.age > 800 && Math.random() < 0.001) {
            changePixel(pixel, "adenium_wilting");
        }
        doDefaults(pixel);
    },
    properties: { age: 0 },
    state: "solid",
    density: 900,
    category: "Desert Rose",
    desc: "Overwatered Adenium. Stop watering and it may recover."
};

// ─── ADENIUM WILTING ───────────────────────────────────────────────────────
elements["adenium_wilting"] = {
    name: "Wilting Adenium",
    color: ["#7a6040","#6a5030","#8a7050","#5a4020"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age||0) + 1;
        // shed leaf pixels occasionally
        if (Math.random() < 0.002) {
            const side = Math.random() < 0.5 ? 1 : -1;
            if (isEmpty(pixel.x+side, pixel.y)) {
                createPixel("dead_plant", pixel.x+side, pixel.y);
            }
        }
        if (pixel.age > 600 && Math.random() < 0.0008) {
            changePixel(pixel, "adenium_dead");
        }
        doDefaults(pixel);
    },
    properties: { age: 0 },
    tempHigh: 50,
    stateHigh: "adenium_dead",
    state: "solid",
    density: 850,
    category: "Desert Rose",
    desc: "Wilting Adenium. Too late to save. Will die and rot."
};

// ─── ADENIUM DEAD ──────────────────────────────────────────────────────────
elements["adenium_dead"] = {
    name: "Dead Adenium",
    color: ["#3a2a18","#2a1a08","#4a3a28"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age||0) + 1;
        // slowly rot
        if (pixel.age > 1000 && Math.random() < 0.0005) {
            changePixel(pixel, "adenium_rot");
        }
        doDefaults(pixel);
    },
    properties: { age: 0 },
    burn: 40,
    burnTime: 40,
    state: "solid",
    density: 800,
    category: "Desert Rose",
    desc: "Dead Adenium. Will eventually decompose."
};

// ─── ADENIUM ROT ───────────────────────────────────────────────────────────
elements["adenium_rot"] = {
    name: "Rotting Adenium",
    color: ["#2a3a10","#1a2a08","#3a4a18","#0f1f04"],
    behavior: behaviors.WALL,
    tick: function(pixel) {
        if (pixel.start === pixelTicks) return;
        pixel.age = (pixel.age||0) + 1;
        // spread rot to adjacent adenium parts
        const neighbors = adj(pixel);
        for (let [x,y] of neighbors) {
            if (pixelMap[x] && pixelMap[x][y]) {
                const n = pixelMap[x][y];
                if (n.element.startsWith("adenium_") && n.element !== "adenium_rot" && Math.random() < 0.0003) {
                    changePixel(n, "adenium_rot");
                }
            }
        }
        // eventually becomes dirt
        if (pixel.age > 2000 && Math.random() < 0.0003) {
            changePixel(pixel, "dirt");
        }
        doDefaults(pixel);
    },
    properties: { age: 0 },
    state: "solid",
    density: 800,
    category: "Desert Rose",
    desc: "Decomposing Adenium. Rot spreads to neighboring parts. Returns to soil."
};

// ─── REGISTER IN eLISTS ────────────────────────────────────────────────────
eListAdd("SOIL", ["wet_sand", "sand"]);  // already there but be safe

// ─── DESERT PRESET ─────────────────────────────────────────────────────────
// Call this function to fill canvas with a desert scene + one adenium
window.loadDesertPreset = function() {
    if (typeof clearAll === "function") clearAll();

    const W = (typeof width  !== 'undefined' ? width  : 150);
    const H = (typeof height !== 'undefined' ? height : 100);
    const groundY = Math.floor(H * 0.70);

    // Sand dunes with sinusoidal shape
    for (let x = 0; x < W; x++) {
        const dune = Math.floor(Math.sin(x * 0.035) * 5 + Math.sin(x * 0.011) * 8);
        const top = groundY + dune;
        const depth = 18 + Math.floor(Math.random() * 4);
        for (let y = top; y < top + depth && y < H; y++) {
            createPixel("sand", x, y);
        }
        for (let y = top + depth; y < H; y++) {
            createPixel("stone", x, y);
        }
    }

    // ── Structured Adenium plant silhouette ────────────────────────────
    // Planted at ~45% from left
    const cx = Math.floor(W * 0.45);
    const base = groundY - 1; // top of sand

    // Caudex (fat swollen base) — 3px wide, 4px tall, widest at bottom
    const caudexShape = [
        // [dx, dy] relative to cx, base
        [-1,0],[0,0],[1,0],          // base row — widest
        [-1,-1],[0,-1],[1,-1],       // row 2
        [0,-2],[-1,-2],[1,-2],       // row 3
        [0,-3],                      // row 4 — narrowing
    ];
    for (const [dx,dy] of caudexShape) {
        const x = cx+dx, y = base+dy;
        if (x>=0 && x<=W && y>=0 && y<=H) {
            createPixel("adenium_trunk", x, y);
            if (pixelMap[x] && pixelMap[x][y]) {
                pixelMap[x][y].moisture = 55;
                pixelMap[x][y].age = 1500;
                pixelMap[x][y].height = Math.abs(dy) + 1;
            }
        }
    }

    // Main stem above caudex
    for (let i = 4; i <= 7; i++) {
        const x = cx, y = base - i;
        if (y >= 0) {
            createPixel("adenium_trunk", x, y);
            if (pixelMap[x] && pixelMap[x][y]) {
                pixelMap[x][y].moisture = 55;
                pixelMap[x][y].age = 1200;
                pixelMap[x][y].height = i;
            }
        }
    }

    // Left branch
    const branchL = [[-1,-8],[-2,-9],[-2,-10],[-3,-10]];
    for (const [dx,dy] of branchL) {
        const x = cx+dx, y = base+dy;
        if (x>=0 && y>=0) {
            createPixel("adenium_branch", x, y);
            if (pixelMap[x] && pixelMap[x][y]) { pixelMap[x][y].moisture = 50; pixelMap[x][y].age = 800; }
        }
    }

    // Right branch
    const branchR = [[1,-8],[2,-9],[2,-10],[3,-10]];
    for (const [dx,dy] of branchR) {
        const x = cx+dx, y = base+dy;
        if (x<=W && y>=0) {
            createPixel("adenium_branch", x, y);
            if (pixelMap[x] && pixelMap[x][y]) { pixelMap[x][y].moisture = 50; pixelMap[x][y].age = 800; }
        }
    }

    // Center tip — bud
    if (base-11 >= 0) {
        createPixel("adenium_bud", cx, base-11);
        if (pixelMap[cx] && pixelMap[cx][base-11]) { pixelMap[cx][base-11].moisture = 45; pixelMap[cx][base-11].age = 200; }
    }

    // Branch tip flowers
    const flowerPositions = [[-3,-11],[3,-11],[-2,-11],[2,-11]];
    for (const [dx,dy] of flowerPositions) {
        const x = cx+dx, y = base+dy;
        if (x>=0 && x<=W && y>=0) {
            createPixel("adenium_flower", x, y);
            if (pixelMap[x] && pixelMap[x][y]) { pixelMap[x][y].moisture = 48; pixelMap[x][y].age = 100; }
        }
    }

    // Small water puddle nearby — player can use it to water
    const waterX = cx + 18;
    for (let x = waterX; x < waterX + 6 && x < W; x++) {
        for (let dy = 1; dy <= 3; dy++) {
            const y = groundY - dy;
            if (y >= 0) createPixel("fine_water", x, y);
        }
    }

    console.log("[Adenium] Desert preset loaded — grid:", W, "x", H, "plant at x:", cx);
};

console.log("[Adenium Mod] Loaded — elements: fine_water, adenium_seed, adenium_sprout, adenium_young, adenium_trunk, adenium_branch, adenium_bud, adenium_flower, adenium_pod, adenium_silk_seed + stress states");

})();
