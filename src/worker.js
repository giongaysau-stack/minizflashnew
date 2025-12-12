// CONFIG sẽ được khởi tạo từ environment variables trong fetch()
const CONFIG = {
    GITHUB_REPO: 'giongaysau-stack/minizflash-private',
    FIRMWARE_FILES: {
        'firmware1': 'firmware/firmware1.bin',
        'firmware2': 'firmware/firmware2.bin',
        'firmware3': 'firmware/firmware3.bin',
        'demo': 'firmware/demo.bin'
    }
};

// VIP Keys - Unlimited downloads (no rate limit)
const UNLIMITED_KEYS = new Set([
    'MZNEW-WCJ9-HZPZ-2L9J'
]);

// 100 License Keys - Generated 2025-12-03
// NOTE: These keys are intentionally public in source code
// Security relies on MAC address binding in KV storage
// Each key can only be bound to ONE device MAC address
const VALID_KEYS = new Set([
    'MZNEW-WCJ9-HZPZ-2L9J', 'MZNEW-S8VP-QRSL-M89X', 'MZNEW-68YY-7LAZ-MB9U',
    'MZNEW-RWPL-RFQ8-BMCE', 'MZNEW-NQ9N-4PL6-2TJ2', 'MZNEW-LAYL-6X7V-DVWA',
    'MZNEW-FKEL-S29H-MSGX', 'MZNEW-8S8X-4PAA-5LD8', 'MZNEW-XLDB-NXWQ-EBXP',
    'MZNEW-JWU7-4G2D-7QET', 'MZNEW-KBL7-HNYC-W7XK', 'MZNEW-PY6A-3H8J-6WZ3',
    'MZNEW-5NVW-7F5A-KUMF', 'MZNEW-GRT3-NP8V-KU65', 'MZNEW-9MN4-4Z25-GR6E',
    'MZNEW-EJSP-RUJ4-A7XH', 'MZNEW-ML5U-DJX7-NF9P', 'MZNEW-75WT-HGAC-K4R5',
    'MZNEW-2J49-CE43-2W7N', 'MZNEW-ZN93-CR24-Y9H7', 'MZNEW-BSN2-PHMF-KSQ3',
    'MZNEW-M7Y5-LVDB-8ETM', 'MZNEW-C8G6-CWY7-E6WJ', 'MZNEW-QW3L-ADGY-X6F8',
    'MZNEW-CBPP-SG4Y-EQ5C', 'MZNEW-CNYM-FTCX-S4ME', 'MZNEW-JG2H-8TUG-WDZC',
    'MZNEW-LK6C-L8YA-QVU4', 'MZNEW-6HGS-WETQ-6UHE', 'MZNEW-7HBP-F4NN-RAAZ',
    'MZNEW-M65X-FB5Z-UVSM', 'MZNEW-5RTF-XNBY-SCVB', 'MZNEW-GZ63-H45W-VCFQ',
    'MZNEW-TN9X-WFZZ-DL8Q', 'MZNEW-VCJK-U9T2-4Z82', 'MZNEW-7TX8-4LJJ-WAN7',
    'MZNEW-3NFZ-ZEDX-WRC6', 'MZNEW-KGXZ-FZTB-Z89J', 'MZNEW-7M5Y-4AK9-FS25',
    'MZNEW-MZQX-5EJX-P78P', 'MZNEW-PPNW-VMRN-KTGW', 'MZNEW-GSK7-STBA-SHRJ',
    'MZNEW-SEYJ-GB86-UW4N', 'MZNEW-43AN-NQUK-7Y9D', 'MZNEW-N4L4-ULBL-YSKC',
    'MZNEW-XD3W-4RCX-5HYK', 'MZNEW-79R7-S4VN-G4W4', 'MZNEW-27E9-9479-XWA3',
    'MZNEW-PQ5K-97EP-7KLT', 'MZNEW-5398-K95L-W7KM', 'MZNEW-6CX9-NWPC-J6F6',
    'MZNEW-JRLM-DWHX-QE73', 'MZNEW-5T63-A4H2-L8FS', 'MZNEW-DUHL-AWM2-NCRV',
    'MZNEW-YV8T-A3PR-HE5H', 'MZNEW-57CS-4KW8-D2KG', 'MZNEW-4P8D-MJWG-TNR2',
    'MZNEW-NZJ8-3AM9-HRAY', 'MZNEW-C8CK-RJ2N-V6PJ', 'MZNEW-L4MA-Y25J-Y7FK',
    'MZNEW-V955-DMX7-KWML', 'MZNEW-F8RA-ELLV-LTV3', 'MZNEW-VYNQ-5WB3-U29U',
    'MZNEW-9UST-SVW9-GVCJ', 'MZNEW-2XP3-456V-DMBM', 'MZNEW-TBJ4-9RU4-XZSC',
    'MZNEW-6DVZ-QLF4-NANZ', 'MZNEW-UUWM-ZSQR-2XT8', 'MZNEW-T5PK-P9HL-UXCF',
    'MZNEW-KWQJ-9U6L-Y9XX', 'MZNEW-Y358-M7GV-4BGP', 'MZNEW-J8KF-DEDQ-NPF5',
    'MZNEW-A3PA-SM4K-4XPH', 'MZNEW-UW5X-WGFS-TQQK', 'MZNEW-8XTE-2PBN-CU5B',
    'MZNEW-BZ7E-6EJ7-PAFL', 'MZNEW-T8DV-6SUH-H2AC', 'MZNEW-ML2Z-JUUP-DVQS',
    'MZNEW-TKT4-JJZA-6BGT', 'MZNEW-287R-2QMX-VEBG', 'MZNEW-R7FT-G6SY-ZUH4',
    'MZNEW-5M4X-394C-9X3K', 'MZNEW-NKNN-UTJU-PXJ3', 'MZNEW-SDCJ-CR67-92V9',
    'MZNEW-JSBZ-QZ7E-33J6', 'MZNEW-NR7E-3SKA-BWHU', 'MZNEW-APRD-Z72S-7H9Y',
    'MZNEW-XWMD-NKFW-8XCM', 'MZNEW-URMP-XPVY-LTX3', 'MZNEW-ZZFY-4YVJ-HKVG',
    'MZNEW-NVR4-PZTK-VVEG', 'MZNEW-M8PX-PAYD-BZWM', 'MZNEW-D8B6-GGTM-B6V7',
    'MZNEW-Z7A7-XN6Q-ZVG3', 'MZNEW-VNS3-EN8W-PGBC', 'MZNEW-NRFT-BYV8-MSP6',
    'MZNEW-86FK-WR6V-FBPH', 'MZNEW-D4BU-MZ7E-2H2A', 'MZNEW-DVMJ-VMN6-C3C7',
    'MZNEW-P3KK-SWLK-2KSR'
]);

// Initialize config from environment variables
function getConfig(env) {
    // Strip BOM if present (PowerShell encoding issue)
    const stripBOM = (str) => {
        if (!str) return str;
        // Remove UTF-8 BOM (EF BB BF) and other BOMs
        return str.replace(/^\uFEFF/, '').replace(/^ï»¿/, '').trim();
    };
    
    return {
        SECRET_KEY: stripBOM(env.SECRET_KEY) || 'default-secret-key-change-me',
        GITHUB_TOKEN: stripBOM(env.GITHUB_TOKEN) || null,
        ...CONFIG
    };
}

export default {
    async fetch(request, env) {
        // Inject environment variables into config
        const config = getConfig(env);
        
        const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }

        const url = new URL(request.url);

        try {
            if (url.pathname === '/api/validate-license') {
                return await validateLicense(request, env, cors, config);
            }
            if (url.pathname === '/api/download-firmware') {
                return await downloadFirmware(request, env, cors, config);
            }
            // Debug endpoint - DISABLED on production for security
            // if (url.pathname === '/api/debug-env') {
            //     return await debugEnv(request, env);
            // }
            return json({ status: 'ok', service: 'MiniZ Flash API' }, cors);
        } catch (e) {
            return json({ error: e.message }, cors, 500);
        }
    }
};

async function validateLicense(request, env, cors, config) {
    const { licenseKey, macAddress } = await request.json();
    
    if (!licenseKey || !macAddress) {
        return json({ valid: false, error: 'Thiếu thông tin license hoặc địa chỉ MAC' }, cors, 400);
    }

    const key = licenseKey.toUpperCase().trim();
    
    if (!VALID_KEYS.has(key)) {
        return json({ valid: false, error: 'License key không hợp lệ' }, cors);
    }

    if (env.LICENSE_BINDINGS) {
        const binding = await env.LICENSE_BINDINGS.get(key);
        if (binding) {
            const data = JSON.parse(binding);
            if (data.mac !== macAddress) {
                return json({ valid: false, error: 'Key đã được kích hoạt trên thiết bị khác' }, cors);
            }
            data.useCount++;
            await env.LICENSE_BINDINGS.put(key, JSON.stringify(data));
            return json({ valid: true, message: 'License hợp lệ (Lần sử dụng #' + data.useCount + ')', accessToken: makeToken(key, macAddress, config) }, cors);
        }
        await env.LICENSE_BINDINGS.put(key, JSON.stringify({ mac: macAddress, useCount: 1, firstUsed: new Date().toISOString() }));
    }

    return json({ valid: true, message: 'License đã được kích hoạt thành công', accessToken: makeToken(key, macAddress, config) }, cors);
}

async function downloadFirmware(request, env, cors, config) {
    const { firmwareId, accessToken, macAddress } = await request.json();

    if (!checkToken(accessToken, macAddress, config)) {
        return json({ error: 'Token không hợp lệ' }, cors, 403);
    }

    // Extract license key from token to check if unlimited
    const tokenData = atob(accessToken).split('|')[0];
    const isUnlimited = UNLIMITED_KEYS.has(tokenData);

    // Rate limit: Max 20 downloads/day/MAC (skip for unlimited keys)
    if (!isUnlimited && env.LICENSE_BINDINGS) {
        const today = new Date().toISOString().split('T')[0];
        const dlKey = 'dl:' + macAddress.replace(/:/g, '') + ':' + today;
        const count = parseInt(await env.LICENSE_BINDINGS.get(dlKey) || '0');
        if (count >= 20) {
            return json({ error: 'Giới hạn 20 lần tải/ngày. Thử lại ngày mai.' }, cors, 429);
        }
        await env.LICENSE_BINDINGS.put(dlKey, String(count + 1), { expirationTtl: 86400 });
    }

    const path = config.FIRMWARE_FILES[firmwareId];
    if (!path) {
        return json({ error: 'Không tìm thấy firmware' }, cors, 404);
    }

    const ghUrl = 'https://api.github.com/repos/' + config.GITHUB_REPO + '/contents/' + path;
    
    const ghToken = config.GITHUB_TOKEN;
    if (!ghToken) {
        return json({ 
            error: 'GitHub token chưa được cấu hình', 
            debug: { 
                envKeys: Object.keys(env),
                hasToken: !!env.GITHUB_TOKEN,
                tokenPrefix: env.GITHUB_TOKEN?.substring(0, 10)
            } 
        }, cors, 500);
    }

    // Debug: Check token format
    const tokenDebug = {
        length: ghToken.length,
        prefix: ghToken.substring(0, 10),
        hasBearer: ghToken.includes('Bearer')
    };

    const resp = await fetch(ghUrl, {
        headers: {
            'Authorization': 'Bearer ' + ghToken,
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'MiniZ-Worker'
        }
    });

    if (!resp.ok) {
        return json({ 
            error: 'GitHub error: ' + resp.status,
            debug: tokenDebug,
            headers: Object.fromEntries(resp.headers.entries())
        }, cors, 500);
    }

    const data = await resp.arrayBuffer();
    
    // Embed MAC vào firmware - firmware sẽ check MAC khi boot
    // Tìm marker "MACBIND:" trong firmware và thay bằng MAC thật
    const firmwareBytes = new Uint8Array(data);
    const marker = new TextEncoder().encode('MACBIND:000000000000');
    const macClean = macAddress.replace(/:/g, '').toUpperCase();
    const macBytes = new TextEncoder().encode('MACBIND:' + macClean);
    
    // Tìm và thay thế marker trong firmware
    for (let i = 0; i < firmwareBytes.length - marker.length; i++) {
        let found = true;
        for (let j = 0; j < marker.length; j++) {
            if (firmwareBytes[i + j] !== marker[j]) {
                found = false;
                break;
            }
        }
        if (found) {
            // Thay marker bằng MAC thật
            for (let j = 0; j < macBytes.length; j++) {
                firmwareBytes[i + j] = macBytes[j];
            }
            break;
        }
    }
    
    // XOR encrypt với key từ MAC - F12 copy sẽ không dùng được trực tiếp
    const xorKey = macClean + macClean; // 24 chars
    for (let i = 0; i < firmwareBytes.length; i++) {
        firmwareBytes[i] ^= xorKey.charCodeAt(i % xorKey.length);
    }
    
    return new Response(firmwareBytes.buffer, {
        headers: {
            ...cors,
            'Content-Type': 'application/octet-stream',
            'X-Firmware-Key': macClean, // Frontend dùng để decrypt
            'Content-Disposition': 'attachment; filename="' + firmwareId + '.mzfw"'
        }
    });
}

function json(data, cors, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}

function makeToken(key, mac, config) {
    const m = mac.replace(/:/g, '');
    const t = Date.now();
    const h = hash(key + '|' + m + '|' + t + config.SECRET_KEY);
    return btoa(key + '|' + m + '|' + t + '|' + h);
}

function checkToken(token, mac, config) {
    try {
        const d = atob(token);
        const p = d.split('|');
        if (p.length !== 4) return false;
        const m = mac.replace(/:/g, '');
        if (p[1] !== m) return false;
        if (Date.now() - parseInt(p[2]) > 300000) return false;
        const h = hash(p[0] + '|' + p[1] + '|' + p[2] + config.SECRET_KEY);
        return p[3] === h;
    } catch (e) {
        return false;
    }
}

function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h = h & h;
    }
    return Math.abs(h).toString(16);
}

// Debug endpoint - remove in production
async function debugEnv(request, env) {
    const config = getConfig(env);
    return json({
        hasGitHubToken: !!config.GITHUB_TOKEN,
        tokenLength: config.GITHUB_TOKEN?.length || 0,
        tokenPrefix: config.GITHUB_TOKEN?.substring(0, 15) || 'none',
        hasSecretKey: !!config.SECRET_KEY,
        envKeys: Object.keys(env)
    }, { 'Access-Control-Allow-Origin': '*' });
}




