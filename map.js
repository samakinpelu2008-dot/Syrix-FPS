import * as THREE from 'three';

function createNoiseTexture(baseColor, noiseColor, grainDensity = 0.2, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = noiseColor;
    
    for (let i = 0; i < size * size * grainDensity; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1, 1);
    }
    
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
}

export function buildMapArena(scene) {
    // 1. Generate High-Performance Grain Textures
    const terrainTex = createNoiseTexture('#394231', '#282e22', 0.2);
    terrainTex.repeat.set(100, 100);
    
    const wallTex = createNoiseTexture('#50555e', '#3b3e45', 0.1);
    wallTex.repeat.set(4, 4);
    
    const hazardTex = (() => {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#d97706'; cx.fillRect(0, 0, 128, 128);
        cx.fillStyle = '#1e293b'; cx.lineWidth = 12;
        for (let i = -4; i < 8; i++) {
            cx.beginPath(); cx.moveTo(i * 32, -10); cx.lineTo(i * 32 + 32, 140); cx.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(4, 1);
        return t;
    })();

    // 2. Build the Ground Plane Elevation Map
    const geo = new THREE.PlaneGeometry(400, 400, 40, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        let elevation = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 8;
        if (Math.sqrt(x * x + y * y) < 60) elevation = 0; // Keeping player spawn flat
        pos.setZ(i, elevation);
    }
    geo.computeVertexNormals();
    
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.9 }));
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 3. Central Outpost Command Structures
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7 });
    const deckMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 36), wallMat);
    base.position.set(0, 3, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    const platform = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), deckMat);
    platform.position.set(0, 6.5, 0);
    platform.castShadow = true;
    scene.add(platform);

    // 4. Scatter Defensive Cover Assets
    const buildBarricade = (x, z, r, sx, sy) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 2.5), wallMat);
        b.position.set(x, sy / 2, z);
        b.rotation.y = r;
        b.castShadow = true;
        b.receiveShadow = true;
        scene.add(b);
    };
    buildBarricade(-25, 20, 0.4, 14, 5);
    buildBarricade(25, -20, -0.6, 18, 5);
    buildBarricade(0, -35, 1.57, 12, 4.5);

    // 5. Procedural Natural Rock Assets
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
    for (let i = 0; i < 30; i++) {
        const rx = (Math.random() - 0.5) * 250;
        const rz = (Math.random() - 0.5) * 250;
        if (Math.sqrt(rx * rx + rz * rz) < 45) continue;
        
        const size = Math.random() * 3 + 1.5;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMat);
        rock.position.set(rx, size - 1, rz);
        rock.castShadow = true;
        scene.add(rock);
    }
          }
                            
