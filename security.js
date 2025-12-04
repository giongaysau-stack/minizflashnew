/**
 * MiniZ Flash Pro - Security Manager
 * Bảo mật và quản lý session
 */

class SecurityManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.attemptCount = 0;
        this.maxAttempts = 10;
        this.lockoutTime = 300000; // 5 phút
        this.lastAttempt = 0;
        
        // Cloudflare state
        this.turnstileVerified = false;
        this.turnstileToken = null;
        this.turnstileExpiry = null;
        
        // Trusted domains
        this.trustedOrigins = [
            'minizjp.com',
            'www.minizjp.com',
            'localhost',
            '127.0.0.1',
            ''
        ];
    }

    /**
     * Check development mode
     */
    isDevelopment() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               window.location.protocol === 'file:';
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Check origin
     */
    checkOrigin() {
        const hostname = window.location.hostname;
        
        if (this.isDevelopment()) {
            return true;
        }
        
        return this.trustedOrigins.some(origin => hostname.includes(origin));
    }
    
    /**
     * Set Turnstile token
     */
    setTurnstileToken(token) {
        this.turnstileToken = token;
        this.turnstileVerified = true;
        this.turnstileExpiry = Date.now() + 300000;
        
        sessionStorage.setItem('cf_turnstile_token', token);
        sessionStorage.setItem('cf_turnstile_expiry', this.turnstileExpiry.toString());
    }
    
    /**
     * Check Turnstile validity
     */
    isTurnstileValid() {
        if (!this.turnstileToken) {
            this.turnstileToken = sessionStorage.getItem('cf_turnstile_token');
            this.turnstileExpiry = parseInt(sessionStorage.getItem('cf_turnstile_expiry') || '0');
        }
        
        if (!this.turnstileToken || !this.turnstileExpiry) {
            return false;
        }
        
        if (Date.now() > this.turnstileExpiry) {
            this.clearTurnstile();
            return false;
        }
        
        return true;
    }
    
    /**
     * Clear Turnstile
     */
    clearTurnstile() {
        this.turnstileToken = null;
        this.turnstileVerified = false;
        this.turnstileExpiry = null;
        sessionStorage.removeItem('cf_turnstile_token');
        sessionStorage.removeItem('cf_turnstile_expiry');
    }
    
    /**
     * Get secure headers
     */
    getSecureHeaders() {
        const headers = {
            'X-Session-ID': this.sessionId,
            'X-Timestamp': Date.now().toString()
        };
        
        if (this.turnstileToken) {
            headers['X-CF-Turnstile-Token'] = this.turnstileToken;
        }
        
        return headers;
    }

    /**
     * Check if locked
     */
    isLocked() {
        if (this.attemptCount >= this.maxAttempts) {
            const timeSinceLast = Date.now() - this.lastAttempt;
            if (timeSinceLast < this.lockoutTime) {
                return true;
            } else {
                this.attemptCount = 0;
            }
        }
        return false;
    }

    /**
     * Record failed attempt
     */
    recordAttempt() {
        this.attemptCount++;
        this.lastAttempt = Date.now();
    }

    /**
     * Reset attempts
     */
    resetAttempts() {
        this.attemptCount = 0;
    }

    /**
     * Obfuscate URL with cache busting
     */
    obfuscateUrl(url) {
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(7);
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${timestamp}&s=${this.sessionId.substring(0, 8)}&r=${rand}`;
    }

    /**
     * Verify firmware integrity
     */
    async verifyIntegrity(data, expectedSize) {
        if (Math.abs(data.length - expectedSize) > expectedSize * 0.1) {
            console.warn('Size mismatch:', data.length, 'vs expected', expectedSize);
        }
        
        if (data.length > 0 && data[0] !== 0xE9 && data[0] !== 0x00) {
            console.warn('Unexpected magic byte:', data[0].toString(16));
            return false;
        }
        
        return true;
    }

    /**
     * Sanitize console output
     */
    sanitizeConsoleOutput(message) {
        if (typeof message !== 'string') return message;
        
        return message
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/\b[A-Fa-f0-9]{32,}\b/g, '[HASH]')
            .replace(/MZNEW-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi, '[LICENSE]');
    }
}

export default SecurityManager;
