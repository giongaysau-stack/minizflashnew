/**
 * MiniZ Flash Pro - License Key Manager
 * Validate qua Cloudflare Worker API - KHÔNG lưu keys ở frontend
 */

class LicenseManager {
    constructor() {
        // Worker API URL - tất cả validation thực hiện server-side
        this.apiUrl = 'https://miniznew.giongaysau.workers.dev';
        this.storageKey = 'mznew_validated_session';
    }

    /**
     * Validate format - XXXX-XXXX-XXXX-XXXX (19 ký tự)
     */
    isValidFormat(key) {
        if (!key || typeof key !== 'string') return false;
        const normalized = key.toUpperCase().trim().replace(/\s+/g, '');
        // Format mới: XXXX-XXXX-XXXX-XXXX (19 ký tự)
        const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return pattern.test(normalized);
    }

    /**
     * Validate license key qua Worker API
     * @param {string} key - License key
     * @param {string} macAddress - MAC address của thiết bị
     * @returns {Promise<object>} - Kết quả validation
     */
    async validateKey(key, macAddress) {
        const normalizedKey = key.toUpperCase().trim();

        // Check format trước
        if (!this.isValidFormat(normalizedKey)) {
            return { 
                valid: false, 
                message: 'Sai định dạng. Sử dụng: XXXX-XXXX-XXXX-XXXX (19 ký tự)' 
            };
        }

        try {
            // Gọi Worker API để validate
            const response = await fetch(`${this.apiUrl}/api/license/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: normalizedKey,
                    mac: macAddress
                })
            });

            const result = await response.json();
            
            if (result.valid) {
                // Lưu session validated
                this.saveValidatedSession(normalizedKey, macAddress);
            }

            return result;
        } catch (error) {
            console.error('License validation error:', error);
            return {
                valid: false,
                message: 'Lỗi kết nối server. Vui lòng thử lại.'
            };
        }
    }

    /**
     * Lưu session đã validate (cache local)
     */
    saveValidatedSession(key, mac) {
        try {
            const session = {
                key: key,
                mac: mac,
                validatedAt: new Date().toISOString()
            };
            sessionStorage.setItem(this.storageKey, JSON.stringify(session));
        } catch (e) {
            console.error('Error saving session:', e);
        }
    }

    /**
     * Kiểm tra session đã validate
     */
    getValidatedSession() {
        try {
            const stored = sessionStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Xóa session
     */
    clearSession() {
        sessionStorage.removeItem(this.storageKey);
    }
}

export default LicenseManager;
