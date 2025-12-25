/**
 * MiniZ Flash Pro - Main Application
 * ESP Web Flasher with Cloudflare Worker API Security
 */

import { ESPLoader, Transport } from 'https://unpkg.com/esptool-js@latest/bundle.js';
import SecurityManager from './security.js';
import LicenseManager from './license.js';

class ESPWebFlasher {
    constructor() {
        // Device state
        this.device = null;
        this.transport = null;
        this.chip = null;
        this.esploader = null;
        
        // Firmware state
        this.firmwareData = null;
        this.firmwareSource = 'cloud';
        this.selectedFirmwareId = null;
        this.selectedFileName = null;
        
        // Device info
        this.deviceMAC = null;
        
        // License state
        this.licenseKey = null;
        this.licenseValidated = false;
        this.accessToken = null;
        
        // Cloudflare state
        this.turnstileVerified = false;
        this.turnstileToken = null;
        
        // Worker API URL
        this.workerApiUrl = 'https://miniznew.giongaysau.workers.dev';
        
        // Serial Monitor state
        this.serialReader = null;
        this.serialWriter = null;
        this.monitorRunning = false;
        this.monitorPort = null;
        
        // Initialize managers
        this.security = new SecurityManager();
        this.license = new LicenseManager();
        
        // Initialize
        this.initializeSecurity();
        this.initializeUI();
        this.initializeSerialMonitor();
        this.checkWebSerialSupport();
        this.displaySessionInfo();
    }

    /**
     * Khởi tạo bảo mật
     */
    initializeSecurity() {
        this.turnstileVerified = window.turnstileVerified || false;
        this.turnstileToken = window.turnstileToken || null;
        
        window.addEventListener('turnstileVerified', (e) => {
            this.turnstileVerified = true;
            this.turnstileToken = e.detail.token;
            this.log('🛡️ Cloudflare đã xác thực thành công', 'success');
        });
        
        if (!this.security.checkOrigin()) {
            console.warn('⚠️ Running on untrusted domain');
        }
        
        console.log('🔒 Security initialized - Session:', this.security.sessionId.substring(0, 8) + '...');
    }

    /**
     * Hiển thị session info
     */
    displaySessionInfo() {
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            sessionInfo.textContent = `Session: ${this.security.sessionId.substring(0, 8)}...`;
        }
    }

    /**
     * Kiểm tra Web Serial API
     */
    checkWebSerialSupport() {
        if (!('serial' in navigator)) {
            this.log('❌ Web Serial API không được hỗ trợ. Vui lòng sử dụng Chrome/Edge/Opera.', 'error');
            document.getElementById('connectBtn').disabled = true;
        } else {
            this.log('✅ Web Serial API sẵn sàng', 'success');
        }
    }

    /**
     * Khởi tạo UI events
     */
    initializeUI() {
        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => this.connectDevice());
        
        // Quick connect button
        document.getElementById('quickConnectBtn')?.addEventListener('click', () => this.connectDevice());
        
        // Main navigation
        document.querySelectorAll('.main-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });
        
        // Tab switching (firmware tabs)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Firmware cards
        document.querySelectorAll('.firmware-card').forEach(card => {
            card.addEventListener('click', () => this.selectFirmware(card));
        });
        
        // License validation
        document.getElementById('licenseKeyInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validateLicense();
            }
        });
        
        document.getElementById('validateLicenseBtn')?.addEventListener('click', () => this.validateLicense());
        
        // Local file input
        document.getElementById('firmwareFile').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Flash button
        document.getElementById('flashBtn').addEventListener('click', () => this.flashFirmware());
        
        // Clear console button
        document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
            document.getElementById('consoleOutput').innerHTML = '';
            this.log('Console đã được xóa', 'info');
        });
        
        // Buy license popup
        document.getElementById('buyLicenseBtn')?.addEventListener('click', () => {
            document.getElementById('buyPopup')?.classList.remove('hidden');
        });
        
        document.getElementById('closePopup')?.addEventListener('click', () => {
            document.getElementById('buyPopup')?.classList.add('hidden');
        });
        
        document.getElementById('buyPopup')?.addEventListener('click', (e) => {
            if (e.target.id === 'buyPopup') {
                document.getElementById('buyPopup')?.classList.add('hidden');
            }
        });
    }

    /**
     * Switch main page
     */
    switchPage(pageName) {
        // Update nav buttons
        document.querySelectorAll('.main-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });
        
        // Update pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    /**
     * Chuyển tab
     */
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.firmware-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        if (tabName === 'cloud') {
            document.getElementById('cloudFirmwareTab').classList.add('active');
            this.firmwareSource = 'cloud';
        } else {
            document.getElementById('localFileTab').classList.add('active');
            this.firmwareSource = 'local';
        }
    }

    /**
     * Chọn firmware
     */
    async selectFirmware(card) {
        if (this.security.isLocked()) {
            this.log('🔒 Quá nhiều lần thử. Vui lòng đợi 5 phút.', 'error');
            return;
        }

        document.querySelectorAll('.firmware-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const name = card.querySelector('h3').textContent;
        const firmwareId = card.dataset.id;
        const requiresLicense = card.dataset.requiresLicense === 'true';

        const licenseSection = document.getElementById('licenseSection');
        if (requiresLicense) {
            licenseSection.classList.remove('hidden');
            if (this.selectedFirmwareId !== firmwareId) {
                this.licenseKey = null;
                this.licenseValidated = false;
                this.accessToken = null;
                document.getElementById('licenseKeyInput').value = '';
                document.getElementById('licenseStatus').classList.add('hidden');
            }
        } else {
            licenseSection.classList.add('hidden');
            this.licenseValidated = true;
        }

        this.selectedFirmwareId = firmwareId;
        this.selectedFileName = name;

        const fileInfo = document.getElementById('cloudFileInfo');
        
        if (requiresLicense) {
            fileInfo.innerHTML = `
                <strong>📦 ${name}</strong><br>
                🔐 Firmware yêu cầu license key<br>
                ⏳ Nhập license để tải firmware từ server bảo mật
            `;
            this.firmwareData = null;
        } else {
            // Demo firmware - tải từ public
            this.log(`📥 Đang tải ${name}...`, 'info');
            try {
                const url = `firmware/${firmwareId}.bin?t=${Date.now()}`;
                const response = await fetch(url, { method: 'GET', cache: 'no-store' });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    this.firmwareData = new Uint8Array(arrayBuffer);
                    
                    fileInfo.innerHTML = `
                        <strong>✅ ${name}</strong><br>
                        📦 Kích thước: ${this.formatBytes(this.firmwareData.length)}<br>
                        ✓ Sẵn sàng nạp
                    `;
                    this.log(`✅ ${name} đã tải thành công`, 'success');
                } else {
                    throw new Error('File not found');
                }
            } catch (error) {
                fileInfo.innerHTML = `
                    <strong>📦 ${name}</strong><br>
                    ⚠️ Firmware chưa có sẵn
                `;
                this.firmwareData = null;
            }
        }
        
        fileInfo.classList.remove('hidden');
        this.updateFlashButtonState();
    }

    /**
     * Tải firmware từ Worker API (private repo)
     */
    async downloadFirmwareFromWorker(firmwareId) {
        if (!this.accessToken || !this.deviceMAC) {
            throw new Error('Cần access token và MAC address');
        }

        this.log('🔐 Đang tải firmware từ server bảo mật...', 'info');

        const response = await fetch(`${this.workerApiUrl}/api/download-firmware`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firmwareId: firmwareId,
                accessToken: this.accessToken,
                macAddress: this.deviceMAC
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const encryptedData = new Uint8Array(arrayBuffer);
        
        // Decrypt firmware (XOR với MAC)
        const xorKey = this.deviceMAC.replace(/:/g, '').toUpperCase();
        const fullKey = xorKey + xorKey; // 24 chars
        const decryptedData = new Uint8Array(encryptedData.length);
        
        for (let i = 0; i < encryptedData.length; i++) {
            decryptedData[i] = encryptedData[i] ^ fullKey.charCodeAt(i % fullKey.length);
        }
        
        this.log('✅ Firmware đã giải mã thành công', 'success');
        return decryptedData;
    }

    /**
     * Kết nối thiết bị
     */
    async connectDevice() {
        const connectBtn = document.getElementById('connectBtn');
        const statusBadge = document.getElementById('connectionStatus');

        try {
            connectBtn.disabled = true;
            this.log('🔌 Đang yêu cầu kết nối...', 'info');

            this.device = await navigator.serial.requestPort();
            
            const baudRate = parseInt(document.getElementById('baudRate').value);
            this.log(`📡 Đang mở cổng với baud rate ${baudRate}...`, 'info');

            this.transport = new Transport(this.device);

            this.esploader = new ESPLoader({
                transport: this.transport,
                baudrate: baudRate,
                romBaudrate: 115200,
                terminal: {
                    clean: () => {},
                    writeLine: (text) => this.log(text, 'info'),
                    write: (text) => this.log(text, 'info')
                },
                debugLogging: false
            });

            this.log('🔄 Đang kết nối với ESP...', 'info');
            this.chip = await this.esploader.main();

            try {
                this.log('📦 Đang tải stub flasher...', 'info');
                await this.esploader.runStub();
                this.log('✅ Stub loaded thành công', 'success');
            } catch (e) {
                this.log('⚠️ Không thể load stub, tiếp tục không có stub', 'warning');
            }

            this.log(`✅ Đã kết nối với ${this.chip}!`, 'success');

            await this.readDeviceMAC();

            statusBadge.textContent = 'Đã kết nối';
            statusBadge.classList.remove('disconnected');
            statusBadge.classList.add('connected');
            
            connectBtn.innerHTML = '<span class="btn-icon">🔌</span> Ngắt kết nối';
            connectBtn.onclick = () => this.disconnectDevice();

            await this.displayDeviceInfo();
            this.updateFlashButtonState();

        } catch (error) {
            this.log(`❌ Kết nối thất bại: ${error.message}`, 'error');
            console.error(error);
        } finally {
            connectBtn.disabled = false;
        }
    }

    /**
     * Đọc MAC address
     */
    async readDeviceMAC() {
        try {
            // ESP32-S3
            try {
                const word0 = await this.esploader.readReg(0x60007044);
                const word1 = await this.esploader.readReg(0x60007048);
                
                if (word0 !== undefined && word1 !== undefined) {
                    const macBytes = [
                        (word0 >> 0) & 0xFF,
                        (word0 >> 8) & 0xFF,
                        (word0 >> 16) & 0xFF,
                        (word0 >> 24) & 0xFF,
                        (word1 >> 0) & 0xFF,
                        (word1 >> 8) & 0xFF
                    ];
                    this.deviceMAC = macBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
                    this.log(`✅ MAC: ${this.deviceMAC}`, 'success');
                    return;
                }
            } catch (e) {}

            // ESP32
            try {
                const word0 = await this.esploader.readReg(0x3f41a048);
                const word1 = await this.esploader.readReg(0x3f41a04c);
                
                if (word0 && word1) {
                    const macBytes = [
                        (word0 >> 0) & 0xFF,
                        (word0 >> 8) & 0xFF,
                        (word0 >> 16) & 0xFF,
                        (word0 >> 24) & 0xFF,
                        (word1 >> 0) & 0xFF,
                        (word1 >> 8) & 0xFF
                    ];
                    this.deviceMAC = macBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
                    this.log(`✅ MAC: ${this.deviceMAC}`, 'success');
                    return;
                }
            } catch (e) {}

            this.deviceMAC = this.generateSessionMAC();
            this.log(`📟 Session MAC: ${this.deviceMAC}`, 'warning');

        } catch (e) {
            this.deviceMAC = this.generateSessionMAC();
            this.log(`⚠️ Sử dụng session MAC: ${this.deviceMAC}`, 'warning');
        }
    }

    /**
     * Tạo session MAC (fallback)
     */
    generateSessionMAC() {
        const sessionKey = localStorage.getItem('esp_session_key') || Math.random().toString(36).substr(2, 12);
        localStorage.setItem('esp_session_key', sessionKey);
        
        const bytes = [];
        for (let i = 0; i < 6; i++) {
            bytes.push(parseInt(sessionKey.substr(i * 2, 2), 16) || Math.floor(Math.random() * 256));
        }
        bytes[0] |= 0x02;
        
        return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
    }

    /**
     * Ngắt kết nối
     */
    async disconnectDevice() {
        try {
            if (this.transport) {
                await this.transport.disconnect();
                await this.transport.waitForUnlock(1500);
            }

            this.device = null;
            this.transport = null;
            this.chip = null;
            this.esploader = null;
            this.deviceMAC = null;
            this.licenseKey = null;
            this.licenseValidated = false;

            const statusBadge = document.getElementById('connectionStatus');
            statusBadge.textContent = 'Chưa kết nối';
            statusBadge.classList.remove('connected');
            statusBadge.classList.add('disconnected');

            const connectBtn = document.getElementById('connectBtn');
            connectBtn.innerHTML = '<span class="btn-icon">🔌</span> Kết nối thiết bị ESP';
            connectBtn.onclick = () => this.connectDevice();

            document.getElementById('deviceInfo').classList.add('hidden');
            document.getElementById('flashBtn').disabled = true;

            document.getElementById('licenseKeyInput').value = '';
            document.getElementById('licenseStatus').classList.add('hidden');

            this.log('🔌 Đã ngắt kết nối', 'info');

        } catch (error) {
            this.log(`Lỗi ngắt kết nối: ${error.message}`, 'error');
        }
    }

    /**
     * Hiển thị thông tin thiết bị
     */
    async displayDeviceInfo() {
        const deviceInfo = document.getElementById('deviceInfo');
        let info = `<strong>Thông tin thiết bị:</strong><br>`;
        info += `Chip: ${this.chip}<br>`;
        
        if (this.deviceMAC) {
            info += `MAC: ${this.deviceMAC}<br>`;
        }

        try {
            const features = await this.esploader.getChipFeatures();
            if (features && features.length > 0) {
                info += `Features: ${features.join(', ')}<br>`;
            }
        } catch (e) {}

        try {
            const flashId = await this.esploader.readFlashId();
            if (flashId) {
                info += `Flash ID: 0x${flashId.toString(16)}<br>`;
            }
        } catch (e) {}

        deviceInfo.innerHTML = info;
        deviceInfo.classList.remove('hidden');
    }

    /**
     * Xác thực license qua Worker API
     */
    async validateLicense() {
        const licenseInput = document.getElementById('licenseKeyInput');
        const keyValue = licenseInput.value.trim().toUpperCase();

        if (!keyValue) {
            this.showLicenseStatus('🔴 Vui lòng nhập license key', 'error');
            return;
        }

        if (!this.selectedFirmwareId) {
            this.showLicenseStatus('🔴 Vui lòng chọn firmware trước', 'error');
            return;
        }

        if (!this.deviceMAC) {
            this.showLicenseStatus('🔴 Vui lòng kết nối thiết bị trước', 'error');
            return;
        }

        if (!this.license.isValidFormat(keyValue)) {
            console.log('Format check failed for:', keyValue, 'Length:', keyValue.length);
            this.showLicenseStatus(`🔴 Sai định dạng. Key: "${keyValue}" (${keyValue.length} ký tự)`, 'error');
            return;
        }

        this.showLicenseStatus('🔄 Đang xác thực với server...', 'info');

        try {
            const response = await fetch(`${this.workerApiUrl}/api/validate-license`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    licenseKey: keyValue,
                    macAddress: this.deviceMAC,
                    turnstileToken: this.turnstileToken
                })
            });

            const result = await response.json();

            if (result.valid) {
                this.licenseKey = keyValue;
                this.licenseValidated = true;
                this.accessToken = result.accessToken;
                
                console.log('✅ License validated, accessToken:', this.accessToken ? 'SET' : 'NULL');

                this.showLicenseStatus(`🟢 ${result.message}`, 'success');
                this.log(`✅ License xác thực thành công`, 'success');
            } else {
                this.showLicenseStatus(`🔴 ${result.error || 'License không hợp lệ'}`, 'error');
                this.licenseKey = null;
                this.licenseValidated = false;
                this.accessToken = null;
            }

        } catch (error) {
            console.error('License validation error:', error);
            this.showLicenseStatus('🔴 Lỗi kết nối server. Vui lòng thử lại.', 'error');
            this.licenseKey = null;
            this.licenseValidated = false;
        }

        this.updateFlashButtonState();
    }

    /**
     * Hiển thị trạng thái license
     */
    showLicenseStatus(message, type) {
        const statusDiv = document.getElementById('licenseStatus');
        statusDiv.innerHTML = message;
        statusDiv.className = `license-status ${type}`;
        statusDiv.classList.remove('hidden');
    }

    /**
     * Cập nhật trạng thái nút Flash
     */
    updateFlashButtonState() {
        const flashBtn = document.getElementById('flashBtn');
        
        // Cần kết nối thiết bị và chọn firmware
        const hasDevice = this.esploader && this.deviceMAC;
        const hasFirmwareSelected = this.selectedFirmwareId;

        if (!hasDevice || !hasFirmwareSelected) {
            flashBtn.disabled = true;
            return;
        }

        const selectedCard = document.querySelector('.firmware-card.selected');
        const requiresLicense = selectedCard?.dataset.requiresLicense === 'true';

        if (requiresLicense) {
            // Firmware yêu cầu license - cần validate trước
            flashBtn.disabled = !this.licenseValidated || !this.accessToken;
        } else {
            // Firmware miễn phí - cần có data
            flashBtn.disabled = !this.firmwareData;
        }
    }    /**
     * Xử lý chọn file local
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.bin')) {
            this.log('⚠️ File nên có đuôi .bin', 'warning');
        }

        this.log(`📦 Đang tải file: ${file.name} (${this.formatBytes(file.size)})`, 'info');

        const reader = new FileReader();
        reader.onload = async (e) => {
            this.firmwareData = new Uint8Array(e.target.result);
            this.selectedFileName = file.name;
            this.firmwareSource = 'local';
            this.licenseValidated = true;

            const hash = await this.calculateSHA256(this.firmwareData);
            this.displayFirmwareHash(hash);

            const fileInfo = document.getElementById('fileInfo');
            fileInfo.innerHTML = `
                <strong>📦 ${file.name}</strong><br>
                Kích thước: ${this.formatBytes(file.size)}<br>
                Loại: Binary (${this.firmwareData.length} bytes)
            `;
            fileInfo.classList.remove('hidden');

            this.log(`✅ File đã tải: ${this.formatBytes(this.firmwareData.length)}`, 'success');
            this.updateFlashButtonState();
        };

        reader.onerror = () => {
            this.log(`❌ Lỗi đọc file`, 'error');
        };

        reader.readAsArrayBuffer(file);
    }

    /**
     * Tính SHA256 hash
     */
    async calculateSHA256(data) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Hiển thị hash firmware
     */
    displayFirmwareHash(hash) {
        const hashVerification = document.getElementById('hashVerification');
        const firmwareHash = document.getElementById('firmwareHash');
        const hashStatus = document.getElementById('hashStatus');
        
        if (hashVerification && firmwareHash && hashStatus) {
            hashVerification.classList.remove('hidden');
            firmwareHash.textContent = hash;
            hashStatus.textContent = '✓ Đã tính toán';
            hashStatus.className = 'hash-status valid';
        }
    }

    /**
     * Nạp firmware
     */
    async flashFirmware() {
        console.log('Flash state:', {
            turnstileVerified: this.turnstileVerified || window.turnstileVerified,
            esploader: !!this.esploader,
            selectedFirmwareId: this.selectedFirmwareId,
            licenseValidated: this.licenseValidated,
            licenseKey: this.licenseKey,
            accessToken: !!this.accessToken,
            deviceMAC: this.deviceMAC
        });

        // Skip Turnstile check - not configured yet
        // const isTurnstileOk = this.turnstileVerified || window.turnstileVerified || this.security.isDevelopment();
        // if (!isTurnstileOk) {
        //     this.log('❌ Vui lòng xác thực Cloudflare trước', 'error');
        //     return;
        // }

        if (!this.esploader) {
            this.log('❌ Vui lòng kết nối thiết bị trước khi flash', 'error');
            return;
        }

        if (!this.selectedFirmwareId) {
            this.log('❌ Vui lòng chọn firmware', 'error');
            return;
        }

        const selectedCard = document.querySelector('.firmware-card.selected');
        const requiresLicense = selectedCard?.dataset.requiresLicense === 'true';
        
        if (requiresLicense) {
            if (!this.licenseValidated || !this.licenseKey || !this.accessToken) {
                this.log('❌ Vui lòng xác thực license trước', 'error');
                console.log('License check failed:', { licenseValidated: this.licenseValidated, licenseKey: this.licenseKey, accessToken: this.accessToken });
                return;
            }

            try {
                this.log('🔐 Đang tải firmware từ server bảo mật...', 'info');
                this.firmwareData = await this.downloadFirmwareFromWorker(this.selectedFirmwareId);
                this.log(`✅ Firmware đã tải: ${this.formatBytes(this.firmwareData.length)}`, 'success');
            } catch (error) {
                this.log(`❌ Lỗi tải firmware: ${error.message}`, 'error');
                console.error('Download error:', error);
                return;
            }
        }

        if (!this.firmwareData) {
            this.log('❌ Không có dữ liệu firmware', 'error');
            return;
        }

        const flashBtn = document.getElementById('flashBtn');
        const progressSection = document.getElementById('progressSection');

        try {
            flashBtn.disabled = true;
            progressSection.classList.remove('hidden');

            const flashOffset = parseInt(document.getElementById('flashOffset').value, 16);
            const eraseFlash = document.getElementById('eraseFlash').checked;

            this.log('='.repeat(50), 'info');
            this.log(`⚡ Bắt đầu nạp ${this.selectedFileName || 'firmware.bin'}...`, 'info');

            if (eraseFlash) {
                this.log('🗑️ Đang xóa flash...', 'warning');
                this.updateProgress(5, 0, this.firmwareData.length);
                await this.esploader.eraseFlash();
                this.log('✅ Đã xóa flash', 'success');
                this.updateProgress(15, 0, this.firmwareData.length);
            } else {
                this.updateProgress(10, 0, this.firmwareData.length);
            }

            this.log(`📝 Đang ghi ${this.formatBytes(this.firmwareData.length)} vào 0x${flashOffset.toString(16)}...`, 'info');
            this.updateProgress(20, 0, this.firmwareData.length);

            let binaryString = '';
            for (let i = 0; i < this.firmwareData.length; i++) {
                binaryString += String.fromCharCode(this.firmwareData[i]);
            }

            const fileArray = [{
                data: binaryString,
                address: flashOffset
            }];

            const flashOptions = {
                fileArray: fileArray,
                flashSize: 'keep',
                flashMode: 'keep',
                flashFreq: 'keep',
                eraseAll: false,
                compress: true,
                reportProgress: (fileIndex, written, total) => {
                    const percent = 20 + Math.floor((written / total) * 65);
                    this.updateProgress(percent, written, total);
                },
                calculateMD5Hash: (image) => {
                    if (typeof image === 'string') {
                        return CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString();
                    }
                    let bytes = image instanceof Uint8Array ? image : new Uint8Array(image);
                    let binaryStr = '';
                    for (let i = 0; i < bytes.length; i++) {
                        binaryStr += String.fromCharCode(bytes[i]);
                    }
                    return CryptoJS.MD5(CryptoJS.enc.Latin1.parse(binaryStr)).toString();
                }
            };

            this.log('Đang ghi flash...', 'info');
            await this.esploader.writeFlash(flashOptions);

            this.updateProgress(85, this.firmwareData.length, this.firmwareData.length);
            this.log('✅ Ghi hoàn tất!', 'success');

            this.log('🔍 Đang xác minh...', 'info');
            this.updateProgress(95, this.firmwareData.length, this.firmwareData.length);

            this.updateProgress(100, this.firmwareData.length, this.firmwareData.length);
            this.log('='.repeat(50), 'info');
            this.log('🎉 Nạp firmware hoàn tất!', 'success');

            this.log('🔄 Đang reset thiết bị...', 'info');
            try {
                if (this.esploader?.hardReset) {
                    await this.esploader.hardReset();
                    await new Promise(r => setTimeout(r, 500)); // Đợi thiết bị reset
                    this.log('✅ Thiết bị đã được reset', 'success');
                } else if (this.transport?.setDTR && this.transport?.setRTS) {
                    // Thử reset bằng DTR/RTS signals
                    await this.transport.setDTR(false);
                    await this.transport.setRTS(true);
                    await new Promise(r => setTimeout(r, 100));
                    await this.transport.setRTS(false);
                    await new Promise(r => setTimeout(r, 500));
                    this.log('✅ Thiết bị đã được reset', 'success');
                } else if (this.device?.setSignals) {
                    await this.device.setSignals({ dataTerminalReady: false, requestToSend: true });
                    await new Promise(r => setTimeout(r, 100));
                    await this.device.setSignals({ requestToSend: false });
                    await new Promise(r => setTimeout(r, 500));
                    this.log('✅ Thiết bị đã được reset', 'success');
                } else {
                    this.log('⚠️ Không thể tự động reset. Vui lòng nhấn nút RESET trên thiết bị', 'warning');
                }
            } catch (e) {
                console.error('Reset error:', e);
                this.log('⚠️ Không thể tự động reset. Vui lòng nhấn nút RESET trên thiết bị', 'warning');
            }

        } catch (error) {
            this.log(`❌ Nạp thất bại: ${error.message}`, 'error');
            console.error('Flash error:', error);
            
            if (error.message.includes('timeout')) {
                this.log('💡 Thử giảm baud rate hoặc kiểm tra cáp USB', 'warning');
            }
            
            this.updateProgress(0, 0, this.firmwareData?.length || 0);
        } finally {
            flashBtn.disabled = false;
        }
    }

    /**
     * Cập nhật progress bar
     */
    updateProgress(percent, written, total) {
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${percent}%`;
        document.getElementById('progressBytes').textContent = `${this.formatBytes(written)} / ${this.formatBytes(total)}`;
    }

    /**
     * Ghi log
     */
    log(message, type = 'info') {
        const consoleOutput = document.getElementById('consoleOutput');
        const logLine = document.createElement('div');
        logLine.className = `log-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        const sanitizedMessage = this.security.sanitizeConsoleOutput(message);
        logLine.textContent = `[${timestamp}] ${sanitizedMessage}`;
        
        consoleOutput.appendChild(logLine);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    /**
     * Format bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Initialize Serial Monitor
     */
    initializeSerialMonitor() {
        // Old serial monitor (in flash page)
        const startBtn = document.getElementById('startMonitorBtn');
        const stopBtn = document.getElementById('stopMonitorBtn');
        const clearBtn = document.getElementById('clearMonitorBtn');
        const sendBtn = document.getElementById('sendSerialBtn');
        const serialInput = document.getElementById('serialInput');

        startBtn?.addEventListener('click', () => this.startSerialMonitor());
        stopBtn?.addEventListener('click', () => this.stopSerialMonitor());
        clearBtn?.addEventListener('click', () => this.clearSerialMonitor());
        sendBtn?.addEventListener('click', () => this.sendSerialData());
        
        serialInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendSerialData();
            }
        });
        
        // Full Console Page
        const consoleConnectBtn = document.getElementById('consoleConnectBtn');
        const consoleDisconnectBtn = document.getElementById('consoleDisconnectBtn');
        const consoleClearBtn = document.getElementById('consoleClearBtn');
        const consoleResetBtn = document.getElementById('consoleResetBtn');
        const consoleSendBtn = document.getElementById('consoleSendBtn');
        const consoleInput = document.getElementById('consoleInput');

        consoleConnectBtn?.addEventListener('click', () => this.startFullConsole());
        consoleDisconnectBtn?.addEventListener('click', () => this.stopFullConsole());
        consoleClearBtn?.addEventListener('click', () => this.clearFullConsole());
        consoleResetBtn?.addEventListener('click', () => this.resetESPFromConsole());
        consoleSendBtn?.addEventListener('click', () => this.sendConsoleData());
        
        consoleInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendConsoleData();
            }
        });
    }

    /**
     * Start Full Console (Console Page)
     */
    async startFullConsole() {
        try {
            const baudRate = parseInt(document.getElementById('consoleBaud').value);
            
            this.monitorPort = await navigator.serial.requestPort();
            await this.monitorPort.open({ baudRate });
            
            this.monitorRunning = true;
            this.updateFullConsoleStatus(true);
            this.consoleLog(`Serial port WebSerial`, 'info');
            this.consoleLog(`Connecting...`, 'system');
            this.consoleLog(`Baud rate: ${baudRate}`, 'info');
            
            // Update UI
            document.getElementById('consoleInput').disabled = false;
            document.getElementById('consoleSendBtn').disabled = false;
            document.getElementById('consoleConnectBtn').disabled = true;
            document.getElementById('consoleDisconnectBtn').disabled = false;
            document.getElementById('consoleBaud').disabled = true;
            
            // Update device banner
            const banner = document.getElementById('consoleDeviceInfo');
            banner.classList.add('connected');
            document.getElementById('consoleDeviceText').textContent = 'Đã kết nối - Đang nhận dữ liệu...';
            
            // Setup writer
            this.serialWriter = this.monitorPort.writable.getWriter();
            
            // Start reading
            this.readFullConsoleData();
            
        } catch (error) {
            if (error.name === 'NotFoundError') {
                this.consoleLog('⚠️ Không có cổng Serial được chọn', 'error');
            } else {
                this.consoleLog('❌ Lỗi: ' + error.message, 'error');
            }
        }
    }

    /**
     * Read Full Console Data
     */
    async readFullConsoleData() {
        if (!this.monitorPort || !this.monitorPort.readable) return;

        const decoder = new TextDecoder();
        
        while (this.monitorPort.readable && this.monitorRunning) {
            this.serialReader = this.monitorPort.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.serialReader.read();
                    if (done) break;
                    if (value) {
                        const text = decoder.decode(value);
                        this.consoleLog(text, 'rx', false);
                    }
                }
            } catch (error) {
                if (this.monitorRunning) {
                    this.consoleLog('⚠️ Lỗi đọc: ' + error.message, 'error');
                }
            } finally {
                this.serialReader.releaseLock();
            }
        }
    }

    /**
     * Stop Full Console
     */
    async stopFullConsole() {
        this.monitorRunning = false;
        
        try {
            if (this.serialReader) {
                await this.serialReader.cancel();
                this.serialReader.releaseLock();
                this.serialReader = null;
            }
            
            if (this.serialWriter) {
                await this.serialWriter.close();
                this.serialWriter = null;
            }
            
            if (this.monitorPort) {
                await this.monitorPort.close();
                this.monitorPort = null;
            }
        } catch (error) {
            console.warn('Error closing port:', error);
        }
        
        this.updateFullConsoleStatus(false);
        this.consoleLog('🔌 Đã ngắt kết nối', 'system');
        
        // Update UI
        document.getElementById('consoleInput').disabled = true;
        document.getElementById('consoleSendBtn').disabled = true;
        document.getElementById('consoleConnectBtn').disabled = false;
        document.getElementById('consoleDisconnectBtn').disabled = true;
        document.getElementById('consoleBaud').disabled = false;
        
        // Update banner
        const banner = document.getElementById('consoleDeviceInfo');
        banner.classList.remove('connected');
        document.getElementById('consoleDeviceText').textContent = 'Chưa kết nối thiết bị';
    }

    /**
     * Send Console Data
     */
    async sendConsoleData() {
        const input = document.getElementById('consoleInput');
        const data = input.value;
        
        if (!data || !this.serialWriter) return;
        
        try {
            const encoder = new TextEncoder();
            await this.serialWriter.write(encoder.encode(data + '\n'));
            this.consoleLog('❯ ' + data, 'tx');
            input.value = '';
        } catch (error) {
            this.consoleLog('❌ Lỗi gửi: ' + error.message, 'error');
        }
    }

    /**
     * Clear Full Console
     */
    clearFullConsole() {
        const output = document.getElementById('fullConsoleOutput');
        output.innerHTML = `<div class="console-welcome">
esptool.js
─────────────────────────────────────────────
Console đã được xóa.
─────────────────────────────────────────────
</div>`;
    }

    /**
     * Reset ESP from Console
     */
    async resetESPFromConsole() {
        if (!this.monitorPort) {
            this.consoleLog('⚠️ Chưa kết nối thiết bị', 'warning');
            return;
        }
        
        try {
            this.consoleLog('🔄 Đang reset ESP...', 'system');
            
            // Toggle DTR to reset
            await this.monitorPort.setSignals({ dataTerminalReady: false });
            await new Promise(r => setTimeout(r, 100));
            await this.monitorPort.setSignals({ dataTerminalReady: true });
            
            this.consoleLog('✅ Đã gửi tín hiệu reset', 'success');
        } catch (error) {
            this.consoleLog('❌ Lỗi reset: ' + error.message, 'error');
        }
    }

    /**
     * Update Full Console Status
     */
    updateFullConsoleStatus(connected) {
        const status = document.getElementById('consoleConnStatus');
        if (connected) {
            status.className = 'console-conn-status connected';
            status.textContent = '● Online';
        } else {
            status.className = 'console-conn-status disconnected';
            status.textContent = '● Offline';
        }
    }

    /**
     * Log to Full Console
     */
    consoleLog(message, type = 'rx', addTimestamp = true) {
        const output = document.getElementById('fullConsoleOutput');
        
        // Remove welcome if exists
        const welcome = output.querySelector('.console-welcome');
        if (welcome) {
            welcome.remove();
        }
        
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        
        if (addTimestamp) {
            const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
            const timeSpan = document.createElement('span');
            timeSpan.className = 'console-timestamp';
            timeSpan.textContent = `[${timestamp}]`;
            line.appendChild(timeSpan);
        }
        
        const textNode = document.createTextNode(message);
        line.appendChild(textNode);
        
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Start Serial Monitor
     */
    async startSerialMonitor() {
        try {
            const baudRate = parseInt(document.getElementById('monitorBaud').value);
            
            // Request a port
            this.monitorPort = await navigator.serial.requestPort();
            await this.monitorPort.open({ baudRate });
            
            this.monitorRunning = true;
            this.updateMonitorStatus(true);
            this.serialLog('📡 Đã kết nối Serial Monitor @ ' + baudRate + ' baud', 'system');
            
            // Enable input
            document.getElementById('serialInput').disabled = false;
            document.getElementById('sendSerialBtn').disabled = false;
            document.getElementById('startMonitorBtn').disabled = true;
            document.getElementById('stopMonitorBtn').disabled = false;
            document.getElementById('monitorBaud').disabled = true;
            
            // Setup writer
            this.serialWriter = this.monitorPort.writable.getWriter();
            
            // Start reading
            this.readSerialData();
            
        } catch (error) {
            if (error.name === 'NotFoundError') {
                this.serialLog('⚠️ Không có cổng Serial được chọn', 'error');
            } else {
                this.serialLog('❌ Lỗi: ' + error.message, 'error');
            }
        }
    }

    /**
     * Read Serial Data continuously
     */
    async readSerialData() {
        if (!this.monitorPort || !this.monitorPort.readable) return;

        const decoder = new TextDecoder();
        
        while (this.monitorPort.readable && this.monitorRunning) {
            this.serialReader = this.monitorPort.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.serialReader.read();
                    if (done) break;
                    if (value) {
                        const text = decoder.decode(value);
                        this.serialLog(text, 'rx', false);
                    }
                }
            } catch (error) {
                if (this.monitorRunning) {
                    this.serialLog('⚠️ Lỗi đọc: ' + error.message, 'error');
                }
            } finally {
                this.serialReader.releaseLock();
            }
        }
    }

    /**
     * Stop Serial Monitor
     */
    async stopSerialMonitor() {
        this.monitorRunning = false;
        
        try {
            if (this.serialReader) {
                await this.serialReader.cancel();
                this.serialReader.releaseLock();
                this.serialReader = null;
            }
            
            if (this.serialWriter) {
                await this.serialWriter.close();
                this.serialWriter = null;
            }
            
            if (this.monitorPort) {
                await this.monitorPort.close();
                this.monitorPort = null;
            }
        } catch (error) {
            console.warn('Error closing port:', error);
        }
        
        this.updateMonitorStatus(false);
        this.serialLog('🔌 Đã ngắt kết nối Serial Monitor', 'system');
        
        // Disable input
        document.getElementById('serialInput').disabled = true;
        document.getElementById('sendSerialBtn').disabled = true;
        document.getElementById('startMonitorBtn').disabled = false;
        document.getElementById('stopMonitorBtn').disabled = true;
        document.getElementById('monitorBaud').disabled = false;
    }

    /**
     * Send data to Serial
     */
    async sendSerialData() {
        const input = document.getElementById('serialInput');
        const data = input.value;
        
        if (!data || !this.serialWriter) return;
        
        try {
            const encoder = new TextEncoder();
            await this.serialWriter.write(encoder.encode(data + '\n'));
            this.serialLog('TX: ' + data, 'tx');
            input.value = '';
        } catch (error) {
            this.serialLog('❌ Lỗi gửi: ' + error.message, 'error');
        }
    }

    /**
     * Clear Serial Monitor
     */
    clearSerialMonitor() {
        const output = document.getElementById('serialOutput');
        output.innerHTML = '<div class="serial-placeholder">💡 Nhấn "Bắt đầu" để xem output từ ESP32/ESP8266</div>';
    }

    /**
     * Update monitor connection status
     */
    updateMonitorStatus(connected) {
        const status = document.getElementById('serialStatus');
        if (connected) {
            status.className = 'serial-status connected';
            status.textContent = '● Đã kết nối';
        } else {
            status.className = 'serial-status disconnected';
            status.textContent = '● Chưa kết nối';
        }
    }

    /**
     * Log to Serial Monitor output
     */
    serialLog(message, type = 'rx', addTimestamp = true) {
        const output = document.getElementById('serialOutput');
        
        // Remove placeholder if exists
        const placeholder = output.querySelector('.serial-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        const line = document.createElement('div');
        line.className = `serial-line ${type}`;
        
        if (addTimestamp) {
            const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
            const timeSpan = document.createElement('span');
            timeSpan.className = 'serial-timestamp';
            timeSpan.textContent = `[${timestamp}]`;
            line.appendChild(timeSpan);
        }
        
        const textNode = document.createTextNode(message);
        line.appendChild(textNode);
        
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.turnstileVerified) {
        window.flasher = new ESPWebFlasher();
    }
});

// Global function for initialization after Turnstile
window.initializeFlasher = function() {
    if (!window.flasher) {
        window.flasher = new ESPWebFlasher();
    }
};
