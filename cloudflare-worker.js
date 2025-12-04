/**
 * MiniZ Flash Pro - Cloudflare Worker
 * Server-side license validation và firmware protection
 * 
 * HƯỚNG DẪN DEPLOY:
 * 1. Vào https://dash.cloudflare.com/ → Workers & Pages
 * 2. Create Application → Create Worker
 * 3. Đặt tên: minizflashnew-api
 * 4. Copy code này vào Worker
 * 5. Deploy
 * 6. Thêm KV Namespace: LICENSE_BINDINGS
 * 7. Thêm Environment Variable: GITHUB_TOKEN
 */

// ============================================
// CẤU HÌNH - THAY ĐỔI THEO NHU CẦU CỦA BẠN
// ============================================

const CONFIG = {
    // Secret key để mã hóa (THAY ĐỔI NGAY!)
    SECRET_KEY: 'YOUR-SECRET-KEY-HERE-CHANGE-THIS',
    
    // Turnstile Secret Key (từ Cloudflare Dashboard)
    TURNSTILE_SECRET: 'YOUR-TURNSTILE-SECRET-HERE',
    
    // GitHub Private Repo chứa firmware
    GITHUB_REPO: 'your-username/your-private-repo',
    
    // Allowed origins (thêm domain của bạn)
    ALLOWED_ORIGINS: [
        'https://your-domain.com',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    
    // Firmware files trong private repo
    FIRMWARE_FILES: {
        'firmware1': 'firmware/firmware1.bin',
        'firmware2': 'firmware/firmware2.bin',
        'firmware3': 'firmware/firmware3.bin',
        'demo': 'firmware/demo.bin'
    }
};

// License keys hợp lệ
// ⚠️ KHÔNG COMMIT KEYS THẬT VÀO REPO PUBLIC
// Thêm keys của bạn ở đây khi deploy Worker
const VALID_KEYS = new Set([
    // 'MZNEW-XXXX-XXXX-XXXX',  // Thêm keys của bạn
    // 'MZNEW-YYYY-YYYY-YYYY',
]);

// ============================================
// MAIN WORKER
// ============================================

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Turnstile-Token',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/api/validate-license') {
                return await handleValidateLicense(request, env, corsHeaders);
            }
            
            if (path === '/api/download-firmware') {
                return await handleDownloadFirmware(request, env, corsHeaders);
            }
            
            if (path === '/api/verify-turnstile') {
                return await handleVerifyTurnstile(request, corsHeaders);
            }

            if (path === '/health') {
                return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);
            }

            return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ error: 'Internal Server Error' }, corsHeaders, 500);
        }
    }
};

// ============================================
// API HANDLERS
// ============================================

/**
 * Verify Turnstile token
 */
async function handleVerifyTurnstile(request, corsHeaders) {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
        return jsonResponse({ success: false, error: 'Missing token' }, corsHeaders, 400);
    }

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: CONFIG.TURNSTILE_SECRET,
            response: token
        })
    });

    const result = await verifyResponse.json();
    
    return jsonResponse({
        success: result.success,
        challenge_ts: result.challenge_ts
    }, corsHeaders);
}

/**
 * Validate license key
 */
async function handleValidateLicense(request, env, corsHeaders) {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
    }

    const body = await request.json();
    const { licenseKey, macAddress, turnstileToken } = body;

    if (!licenseKey || !macAddress) {
        return jsonResponse({ 
            valid: false, 
            error: 'Missing license key or MAC address' 
        }, corsHeaders, 400);
    }

    // Verify Turnstile (optional)
    if (turnstileToken) {
        const turnstileValid = await verifyTurnstile(turnstileToken);
        if (!turnstileValid) {
            return jsonResponse({ 
                valid: false, 
                error: 'Turnstile verification failed' 
            }, corsHeaders, 403);
        }
    }

    const normalizedKey = licenseKey.toUpperCase().trim();

    // Check if key exists
    if (!VALID_KEYS.has(normalizedKey)) {
        return jsonResponse({ 
            valid: false, 
            error: 'Invalid license key' 
        }, corsHeaders);
    }

    // Check binding in KV
    if (env.LICENSE_BINDINGS) {
        const binding = await env.LICENSE_BINDINGS.get(normalizedKey);
        
        if (binding) {
            const data = JSON.parse(binding);
            if (data.mac !== macAddress) {
                return jsonResponse({ 
                    valid: false, 
                    error: 'License key is bound to another device' 
                }, corsHeaders);
            }
            
            // Update use count
            data.useCount++;
            data.lastUsed = new Date().toISOString();
            await env.LICENSE_BINDINGS.put(normalizedKey, JSON.stringify(data));
            
            return jsonResponse({ 
                valid: true, 
                message: `License valid (Use #${data.useCount})`,
                accessToken: generateAccessToken(normalizedKey, macAddress)
            }, corsHeaders);
        }
        
        // First use - bind
        const newBinding = {
            mac: macAddress,
            firstUsed: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            useCount: 1
        };
        await env.LICENSE_BINDINGS.put(normalizedKey, JSON.stringify(newBinding));
    }

    const accessToken = generateAccessToken(normalizedKey, macAddress);

    return jsonResponse({ 
        valid: true, 
        message: 'License activated',
        accessToken: accessToken,
        expiresIn: 300
    }, corsHeaders);
}

/**
 * Download firmware (protected)
 */
async function handleDownloadFirmware(request, env, corsHeaders) {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405);
    }

    const body = await request.json();
    const { firmwareId, accessToken, macAddress } = body;

    // Validate access token
    if (!accessToken || !validateAccessToken(accessToken, macAddress)) {
        return jsonResponse({ 
            error: 'Invalid or expired access token' 
        }, corsHeaders, 403);
    }

    // Get firmware path
    const firmwarePath = CONFIG.FIRMWARE_FILES[firmwareId];
    if (!firmwarePath) {
        return jsonResponse({ error: 'Firmware not found' }, corsHeaders, 404);
    }

    // Get GitHub token from env
    const githubToken = env.GITHUB_TOKEN;
    if (!githubToken) {
        console.error('GITHUB_TOKEN not configured');
        return jsonResponse({ 
            error: 'Server configuration error' 
        }, corsHeaders, 500);
    }

    // Build GitHub API URL
    const githubApiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${firmwarePath}`;

    // Fetch from private repo
    const firmwareResponse = await fetch(githubApiUrl, {
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'MiniZFlashNew-Worker'
        }
    });

    if (!firmwareResponse.ok) {
        console.error('GitHub API Error:', firmwareResponse.status);
        return jsonResponse({ 
            error: 'Failed to fetch firmware' 
        }, corsHeaders, 500);
    }

    const firmwareData = await firmwareResponse.arrayBuffer();

    // Log download
    if (env.LICENSE_BINDINGS) {
        const logKey = `download:${Date.now()}`;
        await env.LICENSE_BINDINGS.put(logKey, JSON.stringify({
            firmwareId,
            macAddress,
            timestamp: new Date().toISOString(),
            size: firmwareData.byteLength
        }), { expirationTtl: 86400 * 30 });
    }

    return new Response(firmwareData, {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${firmwareId}.bin"`,
            'X-Firmware-Size': firmwareData.byteLength.toString(),
            'Cache-Control': 'no-store'
        }
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse(data, corsHeaders, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}

async function verifyTurnstile(token) {
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: CONFIG.TURNSTILE_SECRET,
                response: token
            })
        });
        const result = await response.json();
        return result.success;
    } catch (e) {
        return false;
    }
}

function generateAccessToken(licenseKey, macAddress) {
    const timestamp = Date.now();
    const data = `${licenseKey}:${macAddress}:${timestamp}`;
    return btoa(data + ':' + simpleHash(data + CONFIG.SECRET_KEY));
}

function validateAccessToken(token, macAddress) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        if (parts.length < 4) return false;
        
        const [key, mac, timestamp, hash] = parts;
        
        if (mac !== macAddress) return false;
        
        const tokenTime = parseInt(timestamp);
        if (Date.now() - tokenTime > 300000) return false;
        
        const expectedHash = simpleHash(`${key}:${mac}:${timestamp}` + CONFIG.SECRET_KEY);
        if (hash !== expectedHash) return false;
        
        return true;
    } catch (e) {
        return false;
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
