import * as THREE from 'three';

export function buildMapArena(scene) {
    // 1. Core Arena Ground Floor Plane
    const floorGeo = new THREE.PlaneGeometry(200, 200, 10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF, 
        roughness: 0.65, 
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid System Alignment Overlays
    const grid = new THREE.GridHelper(200, 40, 0x1e293b, 0x0f172a);
    grid.position.y = 0.01;
    scene.add(grid);

    // 2. High-Tech Boundary Fence Matrix
    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0x07080c, 
        roughness: 0.8 
    });
    const borderPoints = [
        { w: 200, h: 12, d: 2, x: 0, z: -100 },
        { w: 200, h: 12, d: 2, x: 0, z: 100 },
        { w: 2, h: 12, d: 200, x: -100, z: 0 },
        { w: 2, h: 12, d: 200, x: 100, z: 0 }
    ];

    borderPoints.forEach(p => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wallMat);
        wall.position.set(p.x, p.h / 2, p.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    });

    // 3. Tactical Cover Block Formations (CODM/Free Fire Inspired)
    const containerMat = new THREE.MeshStandardMaterial({ 
        color: 0x1e293b, 
        roughness: 0.5, 
        metalness: 0.8 
    });
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Neon edge strips

    const obstacleConfigs = [
        // Center Flag Compositions
        { w: 8, h: 5, d: 4, x: 0, z: 20, r: 0 },
        { w: 8, h: 5, d: 4, x: -12, z: -15, r: Math.PI / 4 },
        { w: 12, h: 6, d: 5, x: 25, z: 5, r: -Math.PI / 6 },
        { w: 6, h: 4, d: 6, x: -30, z: 30, r: 0 },
        
        // Perimeter Flanking Decks
        { w: 10, h: 5, d: 5, x: 45, z: -45, r: Math.PI / 2 },
        { w: 7, h: 4, d: 14, x: -50, z: -50, r: -Math.PI / 3 },
        { w: 16, h: 7, d: 6, x: 60, z: 40, r: Math.PI / 5 },
        { w: 9, h: 5, d: 9, x: -40, z: -10, r: 0 }
    ];

    obstacleConfigs.forEach(config => {
        const block = new THREE.Mesh(new THREE.BoxGeometry(config.w, config.h, config.d), containerMat);
        block.position.set(config.x, config.h / 2, config.z);
        block.rotation.y = config.r;
        block.castShadow = true;
        block.receiveShadow = true;
        scene.add(block);

        // Inject Neon Laser Safety Rails on Top Edges
        const edgeGeo = new THREE.BoxGeometry(config.w + 0.1, 0.15, config.d + 0.1);
        const neonTrim = new THREE.Mesh(edgeGeo, trimMat);
        neonTrim.position.set(config.x, config.h, config.z);
        neonTrim.rotation.y = config.r;
        scene.add(neonTrim);
    });
                                     }
