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
// These keys are stored in KV with prefix "UNLIMITED:" for security
const UNLIMITED_KEY_PREFIX = 'UNLIMITED:';

// License keys are now stored in Cloudflare KV Storage for security
// Keys are stored with prefix "VALIDKEY:" - not exposed in source code
const VALID_KEY_PREFIX = 'VALIDKEY:';

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
    
    // Check if key exists in KV storage (keys stored with VALIDKEY: prefix)
    if (!env.LICENSE_BINDINGS) {
        return json({ valid: false, error: 'Hệ thống chưa sẵn sàng' }, cors, 500);
    }
    
    const isValidKey = await env.LICENSE_BINDINGS.get(VALID_KEY_PREFIX + key);
    if (!isValidKey) {
        return json({ valid: false, error: 'License key không hợp lệ' }, cors);
    }

    // Check MAC binding
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
    
    // First time activation - save MAC binding
    await env.LICENSE_BINDINGS.put(key, JSON.stringify({ mac: macAddress, useCount: 1, firstUsed: new Date().toISOString() }));

    return json({ valid: true, message: 'License đã được kích hoạt thành công', accessToken: makeToken(key, macAddress, config) }, cors);
}

async function downloadFirmware(request, env, cors, config) {
    const { firmwareId, accessToken, macAddress } = await request.json();

    if (!checkToken(accessToken, macAddress, config)) {
        return json({ error: 'Token không hợp lệ' }, cors, 403);
    }

    // Extract license key from token to check if unlimited
    const tokenData = atob(accessToken).split('|')[0];
    // Check if key is unlimited (stored in KV with UNLIMITED: prefix)
    const isUnlimited = env.LICENSE_BINDINGS ? await env.LICENSE_BINDINGS.get(UNLIMITED_KEY_PREFIX + tokenData) : false;

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




