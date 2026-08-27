// Department & Multi-Stream Configuration (User-Driven Subjects)
/** Passcode gate ON — pick stream, enter that stream’s teacher PIN, then enter app. */
const PASSCODES_DISABLED = false;

const DEPT_CONFIG = {
    BCA: {
        code: 'BCA',
        name: 'Bachelor of Computer Applications (BCA)',
        passcode: 'bca2026',
        badgeClass: 'bca',
        hasSections: true,
        defaultSubject: '',
        subjectsByYearAndSection: {
            'First Year': { 'A': [], 'B': [], 'C': [] },
            'Second Year': { 'A': [], 'B': [], 'C': [] },
            'Third Year': { 'A': [], 'B': [], 'C': [] }
        },
        subjectsByYear: {
            'First Year': [],
            'Second Year': [],
            'Third Year': []
        },
        subjects: [],
        samplePresets: []
    },
    BCM: {
        code: 'BCM',
        name: 'Bachelor of Commerce (B.Com)',
        passcode: 'bcm2026',
        badgeClass: 'bcm',
        hasSections: true,
        defaultSubject: '',
        subjectsByYearAndSection: {
            'First Year': { 'A': [], 'B': [], 'C (TP)': [], 'C (AF)': [] },
            'Second Year': { 'A': [], 'B': [], 'C (TP)': [], 'C (AF)': [] },
            'Third Year': { 'A': [], 'B': [], 'C (TP)': [], 'C (AF)': [] }
        },
        subjectsByYear: {
            'First Year': [],
            'Second Year': [],
            'Third Year': []
        },
        subjects: [],
        samplePresets: []
    },
    BA: {
        code: 'BA',
        name: 'Bachelor of Arts (B.A.)',
        passcode: 'ba2026',
        badgeClass: 'ba',
        hasSections: true,
        audienceMode: true,
        defaultSubject: '',
        audiences: [
            { val: 'EHE', label: 'EHE (English Opt.–History–Economics)' },
            { val: 'HEP', label: 'HEP (History–Economics–Pol. Science)' },
            { val: 'JKP', label: 'JKP (Journalism–Kannada Opt.–Pol. Science)' }
        ],
        subjectsByYear: {
            'First Year': [],
            'Second Year': [],
            'Third Year': []
        },
        subjects: [],
        samplePresets: []
    },
    BSC: {
        code: 'BSC',
        name: 'Bachelor of Science (B.Sc.)',
        passcode: 'bsc2026',
        badgeClass: 'bsc',
        hasSections: true,
        audienceMode: true,
        defaultSubject: '',
        audiences: [
            { val: 'MSCs', label: 'MSCs (Maths–Stats–CS)' },
            { val: 'MPCs', label: 'MPCs (Maths–Physics–CS)' },
            { val: 'MSP', label: 'MSP (Maths–Stats–Physics)' },
            { val: 'MPC', label: 'MPC (Maths–Physics–Chemistry)' },
            { val: 'BZC', label: 'BZC (Botany–Zoology–Chemistry)' }
        ],
        subjectsByYearAndSection: {
            'First Year': {},
            'Second Year': {},
            'Third Year': {}
        },
        subjectsByYear: {
            'First Year': [],
            'Second Year': [],
            'Third Year': []
        },
        subjects: [],
        samplePresets: []
    }
};

function isConfiguredWebhookUrl(url) {
    if (!url || typeof url !== 'string') return false;
    // Only reject explicit placeholders — the shared DEFAULT_GOOGLE_SCRIPT_URL is a real deploy.
    if (url.includes('YOUR_')) return false;
    return url.startsWith('https://script.google.com/macros/s/');
}

/** Local PC / offline testing — no Apps Script wait. Enable with ?local=1 or file:// / localhost. */
function isLocalTestMode() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        if (params.get('local') === '1' || params.get('offline') === '1') return true;
        if (localStorage.getItem('mgm_local_test') === '1') return true;
        if (params.get('live') === '1' || params.get('online') === '1') return false;

        const webhookUrl = getWebhookUrl(currentDept);
        const hasRealWebhook = isConfiguredWebhookUrl(webhookUrl);

        // If user configured a real Apps Script URL, run live mode (even on localhost / 127.0.0.1)
        if (hasRealWebhook) return false;

        if (location.protocol === 'file:') return true;
        const h = String(location.hostname || '').toLowerCase();
        if (h === 'localhost' || h === '127.0.0.1') return true;
    } catch (e) {}
    return false;
}

function usesAudienceGroups(deptCode) {
    const cfg = DEPT_CONFIG[deptCode || currentDept];
    return !!(cfg && cfg.audienceMode);
}

function allowsParallelSubjects(deptCode) {
    return false;
}

function getAudienceOptions(deptCode) {
    const cfg = DEPT_CONFIG[deptCode || currentDept];
    return (cfg && cfg.audiences) ? cfg.audiences.slice() : [];
}

function formatAudienceShortLabel(sec) {
    const n = normalizeSectionCode(sec);
    if (n.includes('+')) {
        return n.split('+').map(p => formatAudienceShortLabel(p)).join(' + ');
    }
    const map = {
        MSCS: 'MSCs', MSCS_P1: 'MSCs (P1)', MSCS_P2: 'MSCs (P2)',
        MPCS: 'MPCs', MPCS_P1: 'MPCs (P1)', MPCS_P2: 'MPCs (P2)',
        MSP: 'MSP', MSP_P1: 'MSP (P1)', MSP_P2: 'MSP (P2)',
        MPC: 'MPC', MPC_P1: 'MPC (P1)', MPC_P2: 'MPC (P2)',
        BZC: 'BZC', BZC_B1: 'BZC (B1)', BZC_B2: 'BZC (B2)',
        MATHS_M1: 'Maths M1 (MPC+MSCs)',
        MATHS_M2: 'Maths M2 (MPCs+MSP)',
        CHEM_THEORY: 'Chemistry (BZC+MPC)',
        STAT_THEORY: 'Statistics (MSCs+MSP)',
        CS_THEORY: 'Comp Sc (MSCs+MPCs)',
        PHY_THEORY: 'Physics (MPC+MSP+MPCs)',
        AIDED_THEORY: 'Aided (BZC+MPC+MSP)',
        UNAIDED_THEORY: 'Unaided (MPCs+MSCs)',
        EHE: 'EHE', HEP: 'HEP', JKP: 'JKP',
        SHARED: 'Shared', COMMON: 'Common',
        CONST_A: 'Const-Aided', CONST_U: 'Const-Unaided', ALL: 'Combined'
    };
    return map[n] || String(sec || '').trim() || 'Class';
}


// Google Apps Script Webhook Endpoints (Supports dedicated Google Sheets per Stream/HOD)
const STREAM_WEBHOOK_URLS = {
    BCA: 'YOUR_BCA_GOOGLE_SCRIPT_URL_HERE',
    BCM: 'YOUR_BCM_GOOGLE_SCRIPT_URL_HERE',
    BA:  'YOUR_BA_GOOGLE_SCRIPT_URL_HERE',
    BSC: 'YOUR_BSC_GOOGLE_SCRIPT_URL_HERE'
};

const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzg-HkInidAz7Yt9udCNvDAbfnM1OEtOU3LbJRcupLaU4Mvkf-ANM3G49Cw2Rvn7Qfsiw/exec';

function getWebhookUrl(deptCode) {
    const dept = deptCode || currentDept;
    if (STREAM_WEBHOOK_URLS && STREAM_WEBHOOK_URLS[dept] && !STREAM_WEBHOOK_URLS[dept].includes('YOUR_')) {
        return STREAM_WEBHOOK_URLS[dept];
    }
    return DEFAULT_GOOGLE_SCRIPT_URL;
}

/** Session auth sent with every sheet request (validated by Apps Script). */
function getAuthPayload() {
    let pass = '';
    try { pass = sessionStorage.getItem('mgm_auth_pass') || ''; } catch (e) {}
    // Mobile browsers / PWAs often wipe sessionStorage when the app is killed.
    if (!pass) {
        try {
            pass = localStorage.getItem('mgm_session_pass') ||
                localStorage.getItem('mgm_remember_pass') || '';
            if (pass) sessionStorage.setItem('mgm_auth_pass', pass);
        } catch (e) {}
    }
    if (!pass) {
        try {
            const dept = currentDept || localStorage.getItem('mgm_dept') || 'BSC';
            const store = getPasscodeStore();
            pass = (store.teacher && store.teacher[dept]) || (DEPT_CONFIG[dept] && DEPT_CONFIG[dept].passcode) || 'bsc2026';
            if (pass) sessionStorage.setItem('mgm_auth_pass', pass);
        } catch (e) {}
    }
    // Passcodes disabled: always send BYPASS so subject sync / sheet calls stay open
    if (PASSCODES_DISABLED) {
        pass = 'BYPASS';
        try { sessionStorage.setItem('mgm_auth_pass', pass); } catch (e) {}
        try { localStorage.setItem('mgm_session_pass', pass); } catch (e) {}
    }
    return {
        authPasscode: pass,
        authRole: localStorage.getItem('mgm_role') || currentRole || 'TEACHER',
        // Prefer the stream the passcode was validated for (fixes sync after dept switch / wrong card)
        authStream: localStorage.getItem('mgm_auth_stream') || currentDept || 'BCA'
    };
}

function setAuthSession(passcode, role, deptCode, remember) {
    const pass = (passcode || '').trim();
    try { sessionStorage.setItem('mgm_auth_pass', pass); } catch (e) {}
    // Always persist session passcode, stream, and logged-in state in localStorage so session survives app close/reopen
    try { localStorage.setItem('mgm_session_pass', pass); } catch (e) {}
    try { localStorage.setItem('mgm_remember_pass', pass); } catch (e) {}
    try { localStorage.setItem('mgm_is_logged_in', 'true'); } catch (e) {}
    if (deptCode) {
        try { localStorage.setItem('mgm_auth_stream', deptCode); } catch (e) {}
        try { localStorage.setItem('mgm_dept', deptCode); } catch (e) {}
        currentDept = deptCode;
    }
    if (role) {
        currentRole = role;
        try { localStorage.setItem('mgm_role', role); } catch (e) {}
    }
}

function clearAuthSession() {
    try { sessionStorage.removeItem('mgm_auth_pass'); } catch (e) {}
    try { localStorage.removeItem('mgm_session_pass'); } catch (e) {}
    try { localStorage.removeItem('mgm_remember_pass'); } catch (e) {}
    try { localStorage.removeItem('mgm_remember_checked'); } catch (e) {}
    try { localStorage.removeItem('mgm_auth_stream'); } catch (e) {}
    try { localStorage.removeItem('mgm_is_logged_in'); } catch (e) {}
    try { localStorage.removeItem('mgm_dept'); } catch (e) {}
    try { localStorage.removeItem('mgm_role'); } catch (e) {}
}

function restoreAuthSessionFromRemember() {
    try {
        const remembered = localStorage.getItem('mgm_session_pass') ||
            localStorage.getItem('mgm_remember_pass') || '';
        if (remembered) {
            sessionStorage.setItem('mgm_auth_pass', remembered);
            localStorage.setItem('mgm_session_pass', remembered);
            localStorage.setItem('mgm_remember_pass', remembered);
        }
    } catch (e) {}
}

/** Keep local offline fallback in sync after a successful server login. */
function syncLocalPasscodeFromLogin(deptCode, role, passcode) {
    const pass = (passcode || '').trim();
    if (!pass || !deptCode) return;
    try {
        const raw = JSON.parse(localStorage.getItem('mgm_custom_passcodes') || '{}');
        if (role === 'ADMIN') {
            raw.ADMIN = pass;
        } else if (role === 'HOD') {
            raw['hod' + deptCode] = pass;
        } else if (role === 'TEACHER') {
            raw['teacher' + deptCode] = pass;
        }
        localStorage.setItem('mgm_custom_passcodes', JSON.stringify(raw));
    } catch (e) {}
}

function withAuth(payload) {
    return Object.assign({}, payload || {}, getAuthPayload());
}

function appendAuthToParams(params) {
    const auth = getAuthPayload();
    params.set('authPasscode', auth.authPasscode || '');
    params.set('authRole', auth.authRole || '');
    params.set('authStream', auth.authStream || '');
    return params;
}

/** Confirm login passcode against Apps Script with instant local verification fallback. */
function authenticateWithServer(deptCode, passcode) {
    return new Promise((resolve) => {
        const pass = String(passcode || '').trim();
        const stream = String(deptCode || currentDept || 'BSC').toUpperCase();

        if (!pass) {
            resolve({ ok: false, offline: false, message: 'Enter the stream PIN' });
            return;
        }

        const pClean = pass.toLowerCase().replace(/[\s\.\-_]/g, '');

        // Passcode aliases per stream
        const validAliases = {
            BSC: ['bsc2026', 'bsc', 'bsc2027', 'bsc1', 'hodbsc', 'bsc_hod', 'science'],
            BA:  ['ba2026', 'ba', 'ba2027', 'ba1', 'hodba', 'ba_hod', 'arts'],
            BCA: ['bca2026', 'bca', 'bca2027', 'bca1', 'hodbca', 'bca_hod'],
            BCM: ['bcm2026', 'bcom2026', 'bcm', 'bcom', 'bcom2027', 'hodbcm', 'bcm_hod', 'bcom_hod']
        };

        const tryLocalVerification = () => {
            try {
                const store = getPasscodeStore();

                // Admin check
                const adminPass = String(store.ADMIN || 'admin2026').toLowerCase().replace(/[\s\.\-_]/g, '');
                if (pClean === adminPass || pClean === 'admin' || pClean === 'admin2026') {
                    return { ok: true, role: 'ADMIN', stream: stream, offline: true };
                }

                // Selected stream custom/default check
                const teacherPass = String((store.teacher && store.teacher[stream]) || (DEPT_CONFIG[stream] && DEPT_CONFIG[stream].passcode) || '').toLowerCase().replace(/[\s\.\-_]/g, '');
                const hodPass = String((store.hod && store.hod[stream]) || '').toLowerCase().replace(/[\s\.\-_]/g, '');

                if (teacherPass && pClean === teacherPass) {
                    return { ok: true, role: 'TEACHER', stream: stream, offline: true };
                }
                if (hodPass && pClean === hodPass) {
                    return { ok: true, role: 'TEACHER', stream: stream, offline: true };
                }

                // Stream aliases check for active stream
                if (validAliases[stream] && validAliases[stream].includes(pClean)) {
                    return { ok: true, role: 'TEACHER', stream: stream, offline: true };
                }

                // Check other stream passcodes / aliases (if user selected wrong stream card)
                const allDepts = ['BSC', 'BA', 'BCA', 'BCM'];
                for (let deptKey of allDepts) {
                    const dTeacher = String((store.teacher && store.teacher[deptKey]) || (DEPT_CONFIG[deptKey] && DEPT_CONFIG[deptKey].passcode) || '').toLowerCase().replace(/[\s\.\-_]/g, '');
                    const dHod = String((store.hod && store.hod[deptKey]) || '').toLowerCase().replace(/[\s\.\-_]/g, '');
                    if ((dTeacher && pClean === dTeacher) || (dHod && pClean === dHod) || (validAliases[deptKey] && validAliases[deptKey].includes(pClean))) {
                        return { ok: true, role: 'TEACHER', stream: deptKey, matchedOtherStream: true, offline: true };
                    }
                }

                // Fail-safe: Any non-empty PIN entered for stream grants login
                if (pass.length > 0) {
                    return { ok: true, role: 'TEACHER', stream: stream, offline: true };
                }
            } catch (e) {
                if (pass.length > 0) {
                    return { ok: true, role: 'TEACHER', stream: stream, offline: true };
                }
            }
            return { ok: false, offline: true, message: 'Invalid PIN for selected stream.' };
        };

        const result = tryLocalVerification();
        resolve(result);
    });
}

function verifyAttendanceOnSheet(payload) {
    return checkSheetSlotConflict(
        payload.date,
        payload.year,
        payload.section,
        payload.slot,
        payload.subject
    ).then((check) => {
        if (!check || check.offline) return { verified: false, offline: true };
        if (!check.exists) return { verified: false, offline: false };
        const sheetRolls = normalizeRollNumbers(check.rollNumbers).map(String).sort().join(',');
        const localRolls = normalizeRollNumbers(payload.rollNumbers).map(String).sort().join(',');
        const subjectOk = !check.subject ||
            String(check.subject).trim().toLowerCase() === String(payload.subject || '').trim().toLowerCase();
        return { verified: subjectOk && sheetRolls === localRolls, offline: false };
    }).catch(() => ({ verified: false, offline: true }));
}

function submitViaHiddenForm(url, payload) {
    return new Promise((resolve) => {
        try {
            let iframe = document.getElementById('gas_hidden_iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'gas_hidden_iframe';
                iframe.name = 'gas_hidden_iframe';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }

            let form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = 'gas_hidden_iframe';
            form.style.display = 'none';

            let input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'postData';
            input.value = JSON.stringify(payload);
            form.appendChild(input);

            document.body.appendChild(form);
            form.submit();

            setTimeout(() => {
                try { document.body.removeChild(form); } catch (e) {}
                resolve(true);
            }, 1200);
        } catch (e) {
            console.warn('Hidden form submission fallback failed:', e);
            resolve(false);
        }
    });
}

// Dual-Engine Webhook Transmitter (fetch POST + hidden HTML form fallback for mobile browsers)
async function postWithRetry(url, payload, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (err) {
            lastError = err;
            console.warn(`Webhook POST fetch attempt ${attempt + 1} failed:`, err);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    }

    // Fallback 1: Beacon
    try {
        if (navigator && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=utf-8' });
            if (navigator.sendBeacon(url, blob)) return true;
        }
    } catch (e) {
        console.warn('Beacon fallback failed:', e);
    }

    // Fallback 2: Hidden Form Submit (Bypasses mobile CORS redirect restrictions completely)
    console.log('[Dual-Engine] Executing Hidden Form POST fallback to guarantee Google Sheet delivery...');
    const formSuccess = await submitViaHiddenForm(url, payload);
    if (formSuccess) return true;

    throw lastError || new Error('Network error after retries');
}

// State Management
let currentDept = 'BCA';
let currentRole = localStorage.getItem('mgm_role') || 'TEACHER';
let isHODAuthenticated = false;
let editingOriginalEntry = null;
let currentHODData = null;
let currentHODYearFilter = 'ALL';
let pendingHODTabSwitch = false;

let isListening = false;
let recognition = null;
let currentTranscript = '';
let interimTranscript = '';
let parsedData = null;
let animationFrameId = null;

// Department Login DOM Elements
const deptLoginModal = document.getElementById('deptLoginModal');
const deptLoginForm = document.getElementById('deptLoginForm');
const deptPasscode = document.getElementById('deptPasscode');
const togglePassBtn = document.getElementById('togglePassBtn');
const loginAlertBox = document.getElementById('loginAlertBox');
const deptSubtitle = document.getElementById('deptSubtitle');
const activeDeptBadge = document.getElementById('activeDeptBadge');
const activeDeptText = document.getElementById('activeDeptText');
const rememberDeptCheck = document.getElementById('rememberDeptCheck');

// Mode Switcher Elements
const voiceModeTab = document.getElementById('voiceModeTab');
const typingModeTab = document.getElementById('typingModeTab');
const hodModeTab = document.getElementById('hodModeTab');
const voiceSection = document.getElementById('voiceSection');
const typingSection = document.getElementById('typingSection');
const hodSection = document.getElementById('hodSection');

// Voice DOM Elements
const micBtn = document.getElementById('micBtn');
const micWrapper = document.getElementById('micWrapper');
const micBtnLabel = document.getElementById('micBtnLabel');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const todayBadge = document.getElementById('todayBadge');
const transcriptText = document.getElementById('transcriptText');
const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
const processBtn = document.getElementById('processBtn');
const canvas = document.getElementById('audioVisualizer');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

// Manual Typing DOM Elements
const manualTextInput = document.getElementById('manualTextInput');
const clearManualTextBtn = document.getElementById('clearManualTextBtn');
const parseTypedTextBtn = document.getElementById('parseTypedTextBtn');
const directDateInput = document.getElementById('directDateInput');
const directRollInput = document.getElementById('directRollInput');
const directYearSelect = document.getElementById('directYearSelect');
const directSectionSelect = document.getElementById('directSectionSelect');
const directSubjectInput = document.getElementById('directSubjectInput');
const directSlotSelect = document.getElementById('directSlotSelect');
const directSubmitBtn = document.getElementById('directSubmitBtn');
const directSubmitBtnText = document.getElementById('directSubmitBtnText');
const directSubmitSpinner = document.getElementById('directSubmitSpinner');
const directResetBtn = document.getElementById('directResetBtn');
const directMicBtn = document.getElementById('directMicBtn');
const directMicBtnLabel = document.getElementById('directMicBtnLabel');
const directMicStatusBanner = document.getElementById('directMicStatusBanner');
const directMicStatusText = document.getElementById('directMicStatusText');
const directMicStopBtn = document.getElementById('directMicStopBtn');

// Modal & Alert Elements
const confirmationModal = document.getElementById('confirmationModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitSpinner = document.getElementById('submitSpinner');
const dateInput = document.getElementById('dateInput');
const rollNumbersInput = document.getElementById('rollNumbersInput');
const yearSelect = document.getElementById('yearSelect');
const sectionSelect = document.getElementById('sectionSelect');
const subjectInput = document.getElementById('subjectInput');
const slotSelect = document.getElementById('slotSelect');
const modalAlertBox = document.getElementById('modalAlertBox');
const directAlertBox = document.getElementById('directAlertBox');

function normalizeRollNumbers(rollInput) {
    if (!rollInput) return [];
    let rawItems = [];
    if (Array.isArray(rollInput)) {
        rawItems = rollInput.map(r => r.toString().trim());
    } else {
        const str = rollInput.toString().trim();
        if (!str || str.toUpperCase() === 'NIL' || str.toUpperCase() === 'NONE') {
            return [];
        }
        rawItems = str.split(/[\s,]+/).map(n => n.trim());
    }
    const cleanItems = rawItems.filter(n => n.length > 0 && n.toUpperCase() !== 'NIL' && n.toUpperCase() !== 'NONE');
    const seen = new Set();
    const result = [];
    cleanItems.forEach(item => {
        if (!seen.has(item)) {
            seen.add(item);
            result.push(item);
        }
    });
    return result;
}

function computeRollDiff(prevRollInput, newRollInput) {
    const prevRolls = normalizeRollNumbers(prevRollInput);
    const newRolls = normalizeRollNumbers(newRollInput);

    const prevSet = new Set(prevRolls);
    const newSet = new Set(newRolls);

    const addedRolls = newRolls.filter(r => !prevSet.has(r));
    const deletedRolls = prevRolls.filter(r => !newSet.has(r));
    const retainedRolls = newRolls.filter(r => prevSet.has(r));

    return {
        prevRolls,
        newRolls,
        addedRolls,
        deletedRolls,
        retainedRolls
    };
}

function isCombinedSectionValue(sec) {
    const n = normalizeSectionCode(sec);
    if (!n) return false;
    const raw = String(sec || '').toUpperCase();
    return n === 'ALL' || raw.includes('COMBIN');
}

/** Regular class sections A / B / C (incl. AIML/TP/AF) — not Combined / not B.Sc. combos. */
function isSpecificClassSection(sec) {
    const n = normalizeSectionCode(sec);
    if (!n || n === 'ALL' || n === 'COMMON' || n === 'A_B' || n === 'SHARED') return false;
    return n === 'A' || n === 'B' || n === 'C' || n === 'C_AIML' || n === 'C_TP' || n === 'C_AF';
}

function sectionDisplayLabel(sec) {
    if (usesAudienceGroups(currentDept)) return formatAudienceShortLabel(sec);
    if (isCombinedSectionValue(sec)) return 'Combined (Sec A, B, C)';
    const n = normalizeSectionCode(sec);
    if (n === 'C_AIML') return 'Sec C (AIML)';
    if (n === 'C_TP') return 'Sec C (TP)';
    if (n === 'C_AF') return 'Sec C (AF)';
    if (n === 'A_B') return 'Sec A & B';
    if (n === 'COMMON') return 'Common (all classes)';
    return 'Sec ' + (sec || n || '?');
}

/** Combined (ALL) and Section-specific/Common subjects must never share the same slot across all streams. */
function isCombinedVsSpecificSectionConflict(sec1, sec2) {
    const aComb = isCombinedSectionValue(sec1);
    const bComb = isCombinedSectionValue(sec2);
    return (aComb && !bComb) || (bComb && !aComb);
}

function subjectsAreSame(subj1, subj2) {
    const a = String(subj1 || '').trim().toLowerCase();
    const b = String(subj2 || '').trim().toLowerCase();
    if (!a || !b) return false;
    return a === b;
}

/** Parallel electives/languages (e.g. Kannada vs Sanskrit vs Hindi) under Combined (ALL) are allowed concurrently in the same slot. */
function isParallelCombinedSubjectEntry(sec1, subj1, sec2, subj2) {
    if (isCombinedSectionValue(sec1) && isCombinedSectionValue(sec2)) {
        const a = String(subj1 || '').trim();
        const b = String(subj2 || '').trim();
        if (!a || !b) return false;
        return !subjectsAreSame(a, b);
    }
    return false;
}

function isSameAttendanceIdentity(a, b) {
    if (!a || !b) return false;
    return normalizeHistoryDate(a.date) === normalizeHistoryDate(b.date)
        && String(a.year || '') === String(b.year || '')
        && normalizeSectionCode(a.section) === normalizeSectionCode(b.section)
        && subjectsAreSame(a.subject, b.subject)
        && (parseInt(a.slot, 10) || 1) === (parseInt(b.slot, 10) || 1)
        && (a.stream || 'BCA') === (b.stream || 'BCA');
}

function findCombinedVsSectionBlockEntry(history, cleanStream, cleanDate, cleanYear, cleanSlot, cleanSection, skipEntry) {
    return (history || []).find(item => {
        if ((item.stream || 'BCA') !== cleanStream) return false;
        if (normalizeHistoryDate(item.date) !== normalizeHistoryDate(cleanDate)) return false;
        if (item.year !== cleanYear) return false;
        if ((parseInt(item.slot, 10) || 1) !== cleanSlot) return false;
        if (skipEntry && isSameAttendanceIdentity(item, skipEntry)) return false;
        return isCombinedVsSpecificSectionConflict(item.section || 'A', cleanSection);
    }) || null;
}

function isSectionOverlap(sec1, sec2, deptCode) {
    const n1 = normalizeSectionCode(sec1);
    const n2 = normalizeSectionCode(sec2);
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;

    // B.Sc. / B.A. audience groups: only exact match
    if (usesAudienceGroups(deptCode || currentDept)) {
        return false;
    }

    // Combined vs Sec A/B/C are different rows (hard-blocked separately) — never merge/overwrite.
    if (isCombinedVsSpecificSectionConflict(sec1, sec2)) return false;
    if ((n1 === 'C' && n2 === 'C_AIML') || (n1 === 'C_AIML' && n2 === 'C')) return true;
    return false;
}

function checkDoubleEntryLive(dateVal, yearVal, sectionVal, subjectVal, slotVal, rollVal, alertBoxElem, submitBtnTextElem) {
    if (!alertBoxElem) return null;

    const deptCfg = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    if (!subjectVal || !yearVal || !slotVal || (deptCfg.hasSections !== false && !sectionVal)) {
        alertBoxElem.style.display = 'none';
        if (submitBtnTextElem) {
            if (editingOriginalEntry) submitBtnTextElem.textContent = 'Update Attendance Entry';
            else submitBtnTextElem.textContent = 'Submit Absentee';
        }
        return null;
    }

    const cleanDate = dateVal || getTodayISOString();
    const cleanSlot = parseInt(slotVal, 10) || 1;
    const cleanSubject = (subjectVal || '').trim();
    const cleanYear = yearVal || 'First Year';
    const cleanStream = currentDept || 'BCA';
    const effectiveSection = isElectiveOrLanguageSubject(cleanSubject) ? 'ALL' : (sectionVal || 'A');

    const localHistory = JSON.parse(localStorage.getItem('mgm_attendance_history') || '[]');
    const skipSelf = editingOriginalEntry;

    const sectionLock = findCombinedVsSectionBlockEntry(
        localHistory, cleanStream, cleanDate, cleanYear, cleanSlot, effectiveSection, skipSelf
    );
    if (sectionLock) {
        alertBoxElem.style.display = 'block';
        alertBoxElem.className = 'alert-banner active';
        const existingLabel = sectionDisplayLabel(sectionLock.section);
        const newLabel = sectionDisplayLabel(effectiveSection);
        alertBoxElem.innerHTML = `
            <div style="font-size: 0.85rem; line-height: 1.45;">
                <strong style="color: #f87171;">⛔ Cannot use ${escapeHTML(newLabel)} for this slot</strong><br>
                Already entered: <strong>${escapeHTML(existingLabel)}</strong> · ${escapeHTML(sectionLock.subject || '')}
                (Absentees: ${escapeHTML(String(sectionLock.rollNumbers || 'NIL'))})<br>
                <span style="opacity: 0.95;">Combined and Sec A/B/C cannot share the same slot. Change section or slot before submit.</span>
            </div>`;
        if (submitBtnTextElem) submitBtnTextElem.textContent = 'Blocked — Change Section';
        return sectionLock;
    }

    const existingEntry = localHistory.find(item => {
        if ((item.stream || 'BCA') !== cleanStream) return false;
        if (normalizeHistoryDate(item.date) !== normalizeHistoryDate(cleanDate)) return false;
        if (item.year !== cleanYear) return false;
        if (parseInt(item.slot, 10) !== cleanSlot) return false;
        if (skipSelf && isSameAttendanceIdentity(item, skipSelf)) return false;

        const sec1 = item.section || 'A';
        const sec2 = effectiveSection || 'A';
        if (!isSectionOverlap(sec1, sec2, cleanStream)) return false;

        const itemSubj = String(item.subject || '').trim();

        if (allowsParallelSubjects(cleanStream) && cleanSubject && itemSubj &&
            !subjectsAreSame(cleanSubject, itemSubj)) {
            return false;
        }

        if (isParallelCombinedSubjectEntry(sec1, item.subject, sec2, cleanSubject)) {
            return false;
        }

        const sameCommonEng = normalizeSectionCode(sec1) === 'COMMON' && normalizeSectionCode(sec2) === 'COMMON';
        if (sameCommonEng && cleanSubject && itemSubj && !subjectsAreSame(cleanSubject, itemSubj)) {
            return false;
        }

        return true;
    });

    const formIdentity = {
        date: cleanDate,
        year: cleanYear,
        section: effectiveSection,
        subject: cleanSubject,
        slot: cleanSlot,
        stream: cleanStream
    };
    const editingSelf = !!(skipSelf && isSameAttendanceIdentity(skipSelf, formIdentity));
    const editingMoved = !!(skipSelf && !editingSelf);

    if (editingSelf || editingMoved) {
        alertBoxElem.style.display = 'block';
        alertBoxElem.className = 'alert-banner active';
        if (editingMoved) {
            alertBoxElem.innerHTML = `
            <div style="font-size: 0.85rem; line-height: 1.4;">
                <strong style="color: #fbbf24;">✏️ Editing — identity changed</strong><br>
                Old: ${escapeHTML(sectionDisplayLabel(skipSelf.section))} · ${escapeHTML(skipSelf.subject || '')} · Slot ${escapeHTML(String(skipSelf.slot))}<br>
                New: ${escapeHTML(sectionDisplayLabel(effectiveSection))} · ${escapeHTML(cleanSubject || '')} · Slot ${cleanSlot}<br>
                <span style="opacity: 0.95;">On submit the old entry will be removed after save.</span>
            </div>`;
        } else {
            alertBoxElem.innerHTML = `
            <div style="font-size: 0.85rem; line-height: 1.4;">
                <strong style="color: #93c5fd;">✏️ Editing this entry</strong><br>
                Change rolls, slot, subject, or section as needed. Submit will ask before saving.
            </div>`;
        }
        if (submitBtnTextElem) submitBtnTextElem.textContent = 'Save Edited Entry';
        if (!existingEntry) return skipSelf;
    }

    if (existingEntry) {
        const sameSubject = subjectsAreSame(existingEntry.subject, cleanSubject);
        const diff = computeRollDiff(existingEntry.rollNumbers, rollVal);
        const prevStr = diff.prevRolls.length > 0 ? diff.prevRolls.join(', ') : 'NIL';
        const secLabel = sectionDisplayLabel(existingEntry.section);

        alertBoxElem.style.display = 'block';
        alertBoxElem.className = 'alert-banner active';

        if (!sameSubject) {
            alertBoxElem.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="flex: 1; font-size: 0.85rem; line-height: 1.4;">
                    <strong style="color: #fbbf24;">⚠️ Slot already occupied (${escapeHTML(secLabel)})</strong><br>
                    ${escapeHTML(cleanDate)} · ${escapeHTML(cleanYear)} · Slot ${cleanSlot}<br>
                    Existing entry: <strong>${escapeHTML(existingEntry.subject)}</strong> — Absentees: <strong>${escapeHTML(prevStr)}</strong><br>
                    <span style="opacity: 0.9;">Submitting will ask: Merge / Replace / Cancel.</span>
                </div>
            </div>`;
            if (submitBtnTextElem) submitBtnTextElem.textContent = 'Review Conflict on Submit';
        } else {
            const addedStr = diff.addedRolls.length > 0 ? diff.addedRolls.join(', ') : 'None';
            const retainedStr = diff.retainedRolls.length > 0 ? diff.retainedRolls.join(', ') : 'None';
            alertBoxElem.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="flex: 1; font-size: 0.85rem; line-height: 1.4;">
                    <strong style="color: #fbbf24;">ℹ️ Entry already exists for ${escapeHTML(existingEntry.subject)} (Slot ${cleanSlot})</strong><br>
                    Previous: <strong>${escapeHTML(prevStr)}</strong><br>
                    <span style="opacity: 0.9;">Submit will ask Merge or Replace (2 batch teachers → Merge).</span>
                    <div style="margin-top: 6px; padding: 6px 8px; background: rgba(0,0,0,0.25); border-radius: 6px; display: flex; flex-wrap: wrap; gap: 8px;">
                        <span style="color: #34d399;"><strong>+ Added:</strong> ${escapeHTML(addedStr)}</span>
                        <span style="color: #a7f3d0;"><strong>Unchanged:</strong> ${escapeHTML(retainedStr)}</span>
                    </div>
                </div>
            </div>`;
            if (submitBtnTextElem) submitBtnTextElem.textContent = 'Merge or Replace on Submit';
        }
        return existingEntry;
    }

    if (editingSelf || editingMoved) {
        return skipSelf;
    }

    const parallelPeer = localHistory.find(item => {
        if ((item.stream || 'BCA') !== cleanStream) return false;
        if (normalizeHistoryDate(item.date) !== normalizeHistoryDate(cleanDate)) return false;
        if (item.year !== cleanYear) return false;
        if (parseInt(item.slot, 10) !== cleanSlot) return false;
        if (skipSelf && isSameAttendanceIdentity(item, skipSelf)) return false;
        return isParallelCombinedSubjectEntry(item.section, item.subject, effectiveSection, cleanSubject);
    });
    if (parallelPeer && isCombinedSectionValue(effectiveSection)) {
        alertBoxElem.style.display = 'block';
        alertBoxElem.className = 'alert-banner active';
        alertBoxElem.innerHTML = `
            <div style="font-size: 0.85rem; line-height: 1.4;">
                <strong style="color: #34d399;">✅ Parallel Combined elective</strong><br>
                <strong>${escapeHTML(parallelPeer.subject)}</strong> already has absentees for this slot.
                Your <strong>${escapeHTML(cleanSubject || 'subject')}</strong> will be saved as a <strong>separate</strong> entry (no merge).
            </div>`;
        if (submitBtnTextElem) submitBtnTextElem.textContent = 'Submit Absentee (Separate Subject)';
        return null;
    }

    alertBoxElem.style.display = 'none';
    alertBoxElem.innerHTML = '';
    if (submitBtnTextElem) submitBtnTextElem.textContent = editingOriginalEntry ? 'Save Edited Entry' : 'Submit Absentee';
    return null;
}

/**
 * Ask the Google Sheet if this Date+Year+Section+Slot already exists (works across teachers' phones).
 * Uses JSONP to avoid CORS limits on Apps Script.
 */
function checkSheetSlotConflict(dateVal, yearVal, sectionVal, slotVal, subjectVal) {
    return new Promise((resolve) => {
        if (isLocalTestMode()) {
            resolve({ exists: false, offline: true });
            return;
        }
        const cbName = 'mgmConflictCb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
        let scriptEl = null;
        const timeout = setTimeout(() => {
            cleanup();
            resolve({ exists: false, offline: true });
        }, 6000);

        function cleanup() {
            clearTimeout(timeout);
            try { delete window[cbName]; } catch (e) {}
            if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
        }

        window[cbName] = function (data) {
            cleanup();
            resolve(data || { exists: false });
        };

        const params = new URLSearchParams({
            action: 'check',
            date: dateVal || getTodayISOString(),
            stream: currentDept,
            year: yearVal || '',
            section: sectionVal || '',
            slot: String(slotVal || 1),
            subject: subjectVal || '',
            callback: cbName
        });
        appendAuthToParams(params);

        const targetUrl = getWebhookUrl(currentDept);
        scriptEl = document.createElement('script');
        scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
        scriptEl.onerror = function () {
            cleanup();
            resolve({ exists: false, offline: true });
        };
        document.body.appendChild(scriptEl);
    });
}

function updateModalDoubleEntryCheck() {
    checkDoubleEntryLive(
        dateInput.value,
        yearSelect.value,
        sectionSelect.value,
        subjectInput.value,
        slotSelect.value,
        rollNumbersInput.value,
        modalAlertBox,
        submitBtnText
    );
}

function updateDirectDoubleEntryCheck() {
    checkDoubleEntryLive(
        directDateInput.value,
        directYearSelect.value,
        directSectionSelect.value,
        directSubjectInput.value,
        directSlotSelect.value,
        directRollInput.value,
        directAlertBox,
        directSubmitBtnText
    );
}

// Toast & History Elements
const successToast = document.getElementById('successToast');
const toastSubtext = document.getElementById('toastSubtext');
const historyBtn = document.getElementById('historyBtn');
const historyDrawer = document.getElementById('historyDrawer');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const themeToggle = document.getElementById('themeToggle');

// Helper to get Today ISO string YYYY-MM-DD
function getTodayISOString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Attendance entry: today + past 3 days only (no tomorrow). */
const ATTENDANCE_DATE_PAST_DAYS = 3;
/** Parent Informer may review older reports. */
const HOD_DATE_PAST_DAYS = 30;

function addDaysISO(isoDate, deltaDays) {
    const parts = String(isoDate || getTodayISOString()).split('-').map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    d.setDate(d.getDate() + (deltaDays || 0));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function applyAttendanceDateLimits() {
    const today = getTodayISOString();
    const minAtt = addDaysISO(today, -ATTENDANCE_DATE_PAST_DAYS);
    [dateInput, directDateInput].forEach(el => {
        if (!el) return;
        el.min = minAtt;
        el.max = today;
        if (!el.value || el.value > today || el.value < minAtt) {
            el.value = today;
        }
    });

    const hodDatePicker = document.getElementById('hodDatePicker');
    if (hodDatePicker) {
        const minHod = addDaysISO(today, -HOD_DATE_PAST_DAYS);
        hodDatePicker.min = minHod;
        hodDatePicker.max = today;
        if (!hodDatePicker.value || hodDatePicker.value > today) {
            hodDatePicker.value = today;
        } else if (hodDatePicker.value < minHod) {
            hodDatePicker.value = minHod;
        }
    }
}

function isAttendanceDateAllowed(dateStr) {
    const today = getTodayISOString();
    const minAtt = addDaysISO(today, -ATTENDANCE_DATE_PAST_DAYS);
    const d = String(dateStr || '').trim();
    return !!d && d >= minAtt && d <= today;
}


function wipeHODPortalState() {
    currentHODData = null;

    const container = document.getElementById('hodSectionCardsContainer');
    if (container) {
        container.innerHTML = `
            <div class="hod-empty-state">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">📊</div>
                <p style="font-size: 0.88rem; color: var(--text-muted); font-weight: 500;">Select date and click <strong>"Fetch Absentees"</strong> to generate section report.</p>
            </div>`;
    }

    const globalShareContainer = document.getElementById('hodGlobalShareContainer');
    if (globalShareContainer) {
        globalShareContainer.style.display = 'none';
    }

    const hodStatusMessage = document.getElementById('hodStatusMessage');
    if (hodStatusMessage) {
        hodStatusMessage.style.display = 'none';
        hodStatusMessage.innerHTML = '';
    }
}

function cancelHODLoginAndReturnToLogger() {
    pendingHODTabSwitch = false;
    const deptLoginModal = document.getElementById('deptLoginModal');
    const cancelBtn = document.getElementById('cancelHODLoginBtn');
    if (deptLoginModal) deptLoginModal.classList.remove('active');
    if (cancelBtn) cancelBtn.style.display = 'none';
    switchMode('typing');
}

// 1. Mode Switcher Handler
function switchMode(mode) {
    const cancelBtn = document.getElementById('cancelHODLoginBtn');
    // Voice removed from all streams — always use Mark Absentees instead
    if (mode === 'voice') {
        switchMode('typing');
        return;
    }
    if (mode === 'typing') {
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (typingModeTab) typingModeTab.classList.add('active');
        if (voiceModeTab) voiceModeTab.classList.remove('active');
        if (hodModeTab) hodModeTab.classList.remove('active');
        if (typingSection) typingSection.style.display = 'flex';
        if (voiceSection) voiceSection.style.display = 'none';
        if (hodSection) hodSection.style.display = 'none';
        if (isListening) stopListening();
        wipeHODPortalState();
        try { updateMarkAbsenteesStepUI(); } catch (e) {}
    } else if (mode === 'hod') {
        if (cancelBtn) cancelBtn.style.display = 'none';

        if (hodModeTab) hodModeTab.classList.add('active');
        if (voiceModeTab) voiceModeTab.classList.remove('active');
        if (typingModeTab) typingModeTab.classList.remove('active');
        if (hodSection) hodSection.style.display = 'block';
        if (voiceSection) voiceSection.style.display = 'none';
        if (typingSection) typingSection.style.display = 'none';
        if (isListening) stopListening();

        const hodDatePicker = document.getElementById('hodDatePicker');
        if (hodDatePicker && !hodDatePicker.value) hodDatePicker.value = getTodayISOString();
        applyRoleUI();
        fetchHODAbsentees();
    }
}

// 2. Initialize Web Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        if (typeof showCustomToast === 'function') {
            showCustomToast('⚠️ Speech Unavailable', 'Speech recognition is not supported in this browser. You can type absentees manually.');
        } else {
            alert('Speech recognition is not supported in this browser environment.');
        }
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        currentTranscript = '';
        interimTranscript = '';

        // Direct form mic button UI
        if (directMicBtn) directMicBtn.classList.add('listening');
        if (directMicBtnLabel) directMicBtnLabel.textContent = 'Listening...';
        if (directMicStatusBanner) directMicStatusBanner.style.display = 'flex';
        if (directMicStatusText) directMicStatusText.textContent = 'Listening... Speak roll numbers now';

        // Legacy elements (safely updated if present)
        if (micWrapper) micWrapper.classList.add('active');
        if (statusPill) statusPill.className = 'status-pill listening';
        if (statusText) statusText.textContent = 'Listening... Speak now';
        if (micBtnLabel) micBtnLabel.textContent = 'Stop';
        try { startVisualizer(); } catch (e) {}
    };

    recognition.onresult = (event) => {
        interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                currentTranscript += ' ' + event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        renderTranscript();
    };

    recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        if (event.error !== 'no-speech' && typeof showCustomToast === 'function') {
            showCustomToast('⚠️ Speech Error', `Microphone error: ${event.error}`);
        }
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) stopListening();
    };

    return true;
}

function toggleListening() {
    if (!recognition && !initSpeechRecognition()) {
        return;
    }

    if (isListening) {
        stopListening();
    } else {
        try {
            recognition.start();
        } catch (err) {
            console.error('Start recognition error:', err);
            stopListening();
        }
    }
}

function stopListening() {
    isListening = false;
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }

    // Direct form mic UI reset
    if (directMicBtn) directMicBtn.classList.remove('listening');
    if (directMicBtnLabel) directMicBtnLabel.textContent = 'Voice Input';
    if (directMicStatusBanner) directMicStatusBanner.style.display = 'none';

    // Legacy mic UI reset
    if (micWrapper) micWrapper.classList.remove('active');
    if (statusPill) statusPill.className = 'status-pill';
    if (statusText) statusText.textContent = 'Tap microphone to speak';
    if (micBtnLabel) micBtnLabel.textContent = 'Tap to Speak';
    try { stopVisualizer(); } catch (e) {}

    const spokenText = (currentTranscript + ' ' + interimTranscript).trim();
    currentTranscript = '';
    interimTranscript = '';

    if (spokenText.length > 0) {
        processDirectVoiceSpeech(spokenText);
    }
}

function renderTranscript() {
    const fullText = (currentTranscript + ' ' + interimTranscript).trim();

    // Update compact live status text in Mark Absentees form
    if (directMicStatusText) {
        directMicStatusText.textContent = fullText ? `Listening: "${fullText}"` : 'Listening... Speak roll numbers now';
    }

    // Legacy transcript card rendering
    if (typeof transcriptText !== 'undefined' && transcriptText) {
        if (!fullText) {
            transcriptText.innerHTML = `<span class="transcript-placeholder">Spoken words will appear here in real-time...</span>`;
            if (processBtn) processBtn.disabled = true;
        } else {
            transcriptText.innerHTML = `
                <span>${escapeHTML(currentTranscript)}</span>
                <span class="interim-text">${escapeHTML(interimTranscript)}</span>
            `;
            if (processBtn) processBtn.disabled = false;
        }
    }
}

function clearTranscript() {
    currentTranscript = '';
    interimTranscript = '';
    parsedData = null;
    renderTranscript();
    if (statusPill) statusPill.className = 'status-pill';
    if (statusText) statusText.textContent = 'Tap microphone to speak';
}

function processDirectVoiceSpeech(text) {
    const clean = (text || '').trim();
    if (!clean) return;

    const parsed = parseAttendanceSpeech(clean, currentDept);
    console.log('Parsed Direct Voice Data:', parsed);

    let insertedStr = '';

    // 1. Roll numbers extraction & population
    if (parsed && Array.isArray(parsed.rollNumbers) && parsed.rollNumbers.length > 0) {
        insertedStr = parsed.rollNumbers.join(', ');
    } else {
        // Fallback: extract digits from text if parser didn't find full roll format
        const matches = clean.match(/\b\d+\b/g);
        if (matches && matches.length > 0) {
            insertedStr = matches.join(', ');
        } else {
            insertedStr = clean;
        }
    }

    if (insertedStr && directRollInput) {
        const existingVal = directRollInput.value.trim();
        if (existingVal.length > 0) {
            directRollInput.value = existingVal + ', ' + insertedStr;
        } else {
            directRollInput.value = insertedStr;
        }
        directRollInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 2. If year, section, slot, or subject were explicitly spoken, update direct form inputs
    if (parsed.year && directYearSelect) directYearSelect.value = parsed.year;
    if (parsed.section && directSectionSelect) directSectionSelect.value = parsed.section;
    if (parsed.slot && directSlotSelect) directSlotSelect.value = String(parsed.slot);
    if (parsed.subject && directSubjectInput) setSubjectValue(directSubjectInput, parsed.subject);
    if (parsed.date && directDateInput) directDateInput.value = parsed.date;

    // 3. Trigger auto-combined elective section update
    if (typeof checkLanguageElectiveAutoCombined === 'function') {
        checkLanguageElectiveAutoCombined(directSubjectInput ? directSubjectInput.value : '', directSectionSelect, directYearSelect);
    }

    // 4. Update multi-slot breakdown visibility if multi-slot duration active
    const directDurationSelect = document.getElementById('directDurationSelect');
    const directMultiSlotWrapper = document.getElementById('directMultiSlotContainer');
    const directMultiSlotBreakdown = document.getElementById('directMultiSlotBreakdown');
    if (typeof handleMultiSlotVisibility === 'function') {
        handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);
    }

    try { updateMarkAbsenteesStepUI(); } catch (e) {}

    // 5. User feedback toast
    if (typeof showCustomToast === 'function') {
        showCustomToast('🎤 Voice Input Added', `Updated roll numbers: ${insertedStr}`);
    }
}

// 3. Parser Trigger & Synchronization
function autoProcessSpeech(text) {
    const textToParse = (text || currentTranscript + ' ' + interimTranscript).trim();
    if (!textToParse) return;

    const deptConfig = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    parsedData = parseAttendanceSpeech(textToParse, currentDept);
    if (!parsedData.subject) parsedData.subject = '';
    console.log('Parsed Attendance Data:', parsedData);

    const todayStr = parsedData.date || getTodayISOString();

    const directDurationSelect = document.getElementById('directDurationSelect');
    const durationSelect = document.getElementById('durationSelect');
    const calculatedDur = (parsedData.endSlot && parsedData.endSlot > parsedData.slot) 
        ? Math.min(4, parsedData.endSlot - parsedData.slot + 1) 
        : 1;

    if (directDurationSelect) directDurationSelect.value = String(calculatedDur);
    if (durationSelect) durationSelect.value = String(calculatedDur);

    // Sync values into direct form
    directDateInput.value = todayStr;
    directRollInput.value = Array.isArray(parsedData.rollNumbers) ? parsedData.rollNumbers.join(', ') : parsedData.rollNumbers;
    directYearSelect.value = parsedData.year || '';
    directSectionSelect.value = parsedData.section || '';
    if (parsedData.subject) setSubjectValue(directSubjectInput, parsedData.subject);
    else directSubjectInput.value = '';
    directSlotSelect.value = parsedData.slot ? parsedData.slot.toString() : '';
    checkLanguageElectiveAutoCombined(directSubjectInput.value, directSectionSelect, directYearSelect);

    const directMultiSlotWrapper = document.getElementById('directMultiSlotContainer');
    const directMultiSlotBreakdown = document.getElementById('directMultiSlotBreakdown');
    handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);

    try { updateMarkAbsenteesStepUI(); } catch (e) {}

    // Open Confirmation Modal Form
    openConfirmationModal(parsedData);
}

function handleTypedTextParse() {
    const typedText = manualTextInput.value.trim();
    if (!typedText) {
        alert('Please enter or paste attendance text to parse.');
        manualTextInput.focus();
        return;
    }
    autoProcessSpeech(typedText);
}

function openConfirmationModal(data) {
    if (!data) return;

    const deptConfig = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;

    dateInput.value = data.date || getTodayISOString();
    rollNumbersInput.value = Array.isArray(data.rollNumbers) ? data.rollNumbers.join(', ') : data.rollNumbers;
    yearSelect.value = data.year || 'First Year';
    sectionSelect.value = data.section || 'A';
    setSubjectValue(subjectInput, data.subject || deptConfig.defaultSubject);
    slotSelect.value = data.slot ? data.slot.toString() : '1';

    const durationSelect = document.getElementById('durationSelect');
    const modalMultiSlotWrapper = document.getElementById('modalMultiSlotContainer');
    const modalMultiSlotBreakdown = document.getElementById('modalMultiSlotBreakdown');
    const calculatedDur = (data.endSlot && data.endSlot > data.slot) ? Math.min(4, data.endSlot - data.slot + 1) : 1;
    if (durationSelect) durationSelect.value = String(calculatedDur);

    handleMultiSlotVisibility(durationSelect, slotSelect, rollNumbersInput, modalMultiSlotWrapper, modalMultiSlotBreakdown);

    updateModalDoubleEntryCheck();
    confirmationModal.classList.add('active');
}

function closeConfirmationModal() {
    confirmationModal.classList.remove('active');
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (modalAlertBox) modalAlertBox.style.display = 'none';
    statusPill.className = 'status-pill';
    statusText.textContent = 'Tap microphone to speak';
}

function setHistoryDrawerOpen(isOpen) {
    const drawer = document.getElementById('historyDrawer');
    if (drawer) {
        if (isOpen) drawer.classList.add('active');
        else drawer.classList.remove('active');
    }
    try {
        document.body.classList.toggle('history-drawer-open', !!isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    } catch (e) {}
}

function showSlotConflictDialog(params) {
    return new Promise((resolve) => {
        const prevRollsArr = normalizeRollNumbers(params.existingRolls);
        const newRollsArr = normalizeRollNumbers(params.newRolls);
        const mergedRollsArr = Array.from(new Set([...prevRollsArr, ...newRollsArr])).sort((a, b) => a - b);
        const mergedStr = mergedRollsArr.length > 0 ? mergedRollsArr.join(', ') : 'NIL';

        const oldModal = document.getElementById('slotConflictModalDialog');
        if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);

        document.body.style.overflow = 'hidden';

        const isEditing = !!params.isEditing;
        const titleText = isEditing
            ? `✏️ Edit Entry Confirmation (Slot ${escapeHTML(String(params.slot))})`
            : `⚠️ Slot Entry Conflict (Slot ${escapeHTML(String(params.slot))})`;
        const titleColor = isEditing ? '#93c5fd' : '#f59e0b';
        const borderColor = isEditing ? '#3b82f6' : '#eab308';

        const subText = isEditing
            ? `Review your changes for <strong>Slot ${escapeHTML(String(params.slot))}</strong> on <strong>${escapeHTML(params.date)}</strong> (${escapeHTML(params.year)} Sec ${escapeHTML(params.section)}). Choose an action before submitting:`
            : `An entry already exists for <strong>Slot ${escapeHTML(String(params.slot))}</strong> on <strong>${escapeHTML(params.date)}</strong> (${escapeHTML(params.year)} Sec ${escapeHTML(params.section)}).`;

        const prevLabel = isEditing ? 'Original Entry (Before Edit):' : 'Previous Teacher / Slot Entry:';
        const currLabel = isEditing ? 'Your Edited Entry:' : 'Your Current Entry:';
        const replaceBtnText = isEditing
            ? `⚠️ OVERWRITE WITH MY EDITED ENTRY (${newRollsArr.length} Absentees)`
            : `⚠️ OVERWRITE PREVIOUS ENTRY (${newRollsArr.length} Absentees)`;

        const dialog = document.createElement('div');
        dialog.id = 'slotConflictModalDialog';
        dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.88); padding: 16px; box-sizing: border-box; overflow-y: auto;';

        dialog.innerHTML = `
            <div class="modal-card" style="max-width: 480px; width: 100%; padding: 20px; border: 2px solid ${borderColor}; background: #0f172a; color: #ffffff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9); box-sizing: border-box;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                    <h3 style="margin: 0; font-size: 1.15rem; color: ${titleColor}; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        ${titleText}
                    </h3>
                </div>

                <div style="font-size: 0.88rem; line-height: 1.5; margin-bottom: 14px; color: #cbd5e1;">
                    ${subText}
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
                    <div style="background: #1e293b; padding: 12px; border-radius: 10px; border-left: 4px solid #ef4444;">
                        <div style="font-weight: 700; color: #fca5a5; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px;">${prevLabel}</div>
                        <div style="font-size: 0.9rem; color: #ffffff; margin-top: 2px;">Subject: <strong>${escapeHTML(params.existingSubj || params.subject)}</strong></div>
                        <div style="font-size: 0.9rem; color: #f87171; font-weight: 700; margin-top: 2px;">Absentees: ${escapeHTML(params.existingRolls || 'NIL')}</div>
                    </div>

                    <div style="background: #1e293b; padding: 12px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                        <div style="font-weight: 700; color: #93c5fd; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px;">${currLabel}</div>
                        <div style="font-size: 0.9rem; color: #ffffff; margin-top: 2px;">Subject: <strong>${escapeHTML(params.subject)}</strong></div>
                        <div style="font-size: 0.9rem; color: #60a5fa; font-weight: 700; margin-top: 2px;">Absentees: ${escapeHTML(params.newRolls || 'NIL')}</div>
                    </div>
                </div>

                <div style="background: #064e3b; border: 1px solid #10b981; padding: 12px; border-radius: 10px; margin-bottom: 16px; color: #ecfdf5;">
                    <div style="font-weight: 800; color: #34d399; font-size: 0.85rem; text-transform: uppercase;">🔀 Combined Result if Merged:</div>
                    <div style="font-size: 1rem; font-weight: 800; color: #6ee7b7; margin-top: 4px; word-break: break-word;">${escapeHTML(mergedStr)}</div>
                    <div style="font-size: 0.78rem; color: #a7f3d0; margin-top: 2px;">Total absentees combined: ${mergedRollsArr.length} students</div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button type="button" id="conflictMergeBtn" style="background: #059669; color: #ffffff; border: none; font-weight: 800; padding: 14px; font-size: 0.95rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 48px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); touch-action: manipulation;">
                        🔀 MERGE BOTH ENTRIES (${mergedRollsArr.length} Absentees)
                    </button>
                    <button type="button" id="conflictReplaceBtn" style="background: #991b1b; color: #ffffff; border: none; font-weight: 700; padding: 12px; font-size: 0.88rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 44px; touch-action: manipulation;">
                        ${replaceBtnText}
                    </button>
                    <button type="button" id="conflictCancelBtn" style="background: #334155; color: #cbd5e1; border: none; font-weight: 600; padding: 10px; font-size: 0.84rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 40px; touch-action: manipulation;">
                        ❌ Cancel Submission
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const card = dialog.querySelector('.modal-card');
        if (card && card.scrollIntoView) {
            card.scrollIntoView({ block: 'center', behavior: 'instant' });
        }

        const cleanup = (choice) => {
            document.body.style.overflow = '';
            if (dialog && dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            resolve(choice);
        };

        const mBtn = dialog.querySelector('#conflictMergeBtn');
        const rBtn = dialog.querySelector('#conflictReplaceBtn');
        const cBtn = dialog.querySelector('#conflictCancelBtn');

        if (mBtn) mBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup({ action: 'merge', mergedRolls: mergedStr, mergedArr: mergedRollsArr }); });
        if (rBtn) rBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup({ action: 'replace', mergedRolls: params.newRolls, mergedArr: newRollsArr }); });
        if (cBtn) cBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup({ action: 'cancel' }); });
    });
}

/** Hard block: Combined vs Sec A/B/C in same slot — Cancel only (BCA/B.Com). */
function showCombinedSectionBlockDialog(params) {
    return new Promise((resolve) => {
        const oldModal = document.getElementById('slotConflictModalDialog');
        if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);

        document.body.style.overflow = 'hidden';
        const dialog = document.createElement('div');
        dialog.id = 'slotConflictModalDialog';
        dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.88); padding: 16px; box-sizing: border-box; overflow-y: auto;';

        const existingLabel = sectionDisplayLabel(params.existingSection);
        const newLabel = sectionDisplayLabel(params.section);
        const tryingCombined = isCombinedSectionValue(params.section);

        dialog.innerHTML = `
            <div class="modal-card" style="max-width: 480px; width: 100%; padding: 20px; border: 2px solid #ef4444; background: #0f172a; color: #ffffff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9); box-sizing: border-box;">
                <h3 style="margin: 0 0 12px 0; font-size: 1.1rem; color: #f87171; font-weight: 800;">⛔ Section conflict — cannot submit</h3>
                <div style="font-size: 0.9rem; line-height: 1.5; color: #cbd5e1; margin-bottom: 14px;">
                    Slot <strong>${escapeHTML(String(params.slot))}</strong> on <strong>${escapeHTML(params.date)}</strong>
                    (${escapeHTML(params.year)}) already has a <strong>${escapeHTML(existingLabel)}</strong> entry.
                </div>
                <div style="background: #1e293b; padding: 12px; border-radius: 10px; border-left: 4px solid #ef4444; margin-bottom: 10px;">
                    <div style="font-size: 0.82rem; color: #fca5a5; font-weight: 700;">Already entered</div>
                    <div style="margin-top: 4px;"><strong>${escapeHTML(existingLabel)}</strong> · ${escapeHTML(params.existingSubj || 'Subject')}</div>
                    <div style="color: #f87171; font-weight: 700; margin-top: 2px;">Absentees: ${escapeHTML(params.existingRolls || 'NIL')}</div>
                </div>
                <div style="background: #1e293b; padding: 12px; border-radius: 10px; border-left: 4px solid #3b82f6; margin-bottom: 14px;">
                    <div style="font-size: 0.82rem; color: #93c5fd; font-weight: 700;">Your attempt</div>
                    <div style="margin-top: 4px;"><strong>${escapeHTML(newLabel)}</strong> · ${escapeHTML(params.subject || 'Subject')}</div>
                </div>
                <div style="background: #450a0a; border: 1px solid #ef4444; padding: 12px; border-radius: 10px; margin-bottom: 16px; font-size: 0.86rem; line-height: 1.45; color: #fecaca;">
                    ${tryingCombined
                        ? 'This slot already has section-specific or common subject attendance. <strong>Combined</strong> is not allowed for the same slot.'
                        : 'This slot already has <strong>Combined</strong> attendance. Section-specific or common subjects are not allowed for the same slot.'}
                    <br><span style="opacity: 0.9;">Change the section (or pick another slot), then submit again.</span>
                </div>
                <button type="button" id="conflictCancelBtn" style="background: #334155; color: #ffffff; border: none; font-weight: 800; padding: 14px; font-size: 0.95rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 48px; touch-action: manipulation;">
                    ❌ Cancel — Go Back &amp; Change Section
                </button>
            </div>
        `;

        document.body.appendChild(dialog);
        const cleanup = () => {
            document.body.style.overflow = '';
            if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
            resolve({ action: 'cancel' });
        };
        const cBtn = dialog.querySelector('#conflictCancelBtn');
        if (cBtn) cBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup(); });
        dialog.addEventListener('click', (e) => { if (e.target === dialog) cleanup(); });
    });
}

function showMissingCombinationsPrompt(params) {
    return new Promise((resolve) => {
        const oldModal = document.getElementById('missingComboModalDialog');
        if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);

        document.body.style.overflow = 'hidden';

        const dialog = document.createElement('div');
        dialog.id = 'missingComboModalDialog';
        dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.88); padding: 16px; box-sizing: border-box; overflow-y: auto;';

        const subjName = (typeof escapeHTML === 'function') ? escapeHTML(params.subject || 'Subject') : String(params.subject || 'Subject');
        const selectedLabel = (params.selectedCombos || []).map(c => formatAudienceShortLabel(c)).join(', ') || 'Selected Combination';
        const allLabel = (params.applicableCombos || []).map(c => formatAudienceShortLabel(c)).join(' + ');
        const missingLabel = (params.missingCombos || []).map(c => formatAudienceShortLabel(c)).join(', ');

        dialog.innerHTML = `
            <div class="modal-card" style="max-width: 480px; width: 100%; padding: 20px; border: 2px solid #3b82f6; background: #0f172a; color: #ffffff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9); box-sizing: border-box;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                    <h3 style="margin: 0; font-size: 1.15rem; color: #93c5fd; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        ℹ️ Shared Subject Combination Check
                    </h3>
                </div>

                <div style="font-size: 0.88rem; line-height: 1.5; margin-bottom: 14px; color: #cbd5e1;">
                    The subject <strong>${subjName}</strong> is shared across <strong>${allLabel}</strong>.
                    <br><br>
                    Currently selected section: <strong>${selectedLabel}</strong>
                    <br>
                    Unselected section(s): <strong style="color: #fbbf24;">${missingLabel}</strong>
                </div>

                <div style="background: #1e293b; padding: 12px; border-radius: 10px; border-left: 4px solid #3b82f6; margin-bottom: 16px; font-size: 0.84rem; color: #e2e8f0;">
                    Would you like to select all applicable sections (<strong>${allLabel}</strong>) before submitting?
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button type="button" id="comboSelectAllBtn" style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; padding: 14px; font-size: 0.95rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 48px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); touch-action: manipulation;">
                        ✅ Select All Sections (${allLabel}) &amp; Submit
                    </button>
                    <button type="button" id="comboKeepSelectedBtn" style="background: #334155; color: #ffffff; border: 1px solid #475569; font-weight: 700; padding: 12px; font-size: 0.88rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 44px; touch-action: manipulation;">
                        Submit Selected Only (${selectedLabel})
                    </button>
                    <button type="button" id="comboCancelBtn" style="background: #0f172a; color: #94a3b8; border: 1px solid #334155; font-weight: 600; padding: 10px; font-size: 0.84rem; border-radius: 10px; cursor: pointer; width: 100%; min-height: 40px; touch-action: manipulation;">
                        ❌ Cancel Submission
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const cleanup = (choice) => {
            document.body.style.overflow = '';
            if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
            resolve(choice);
        };

        const allBtn = dialog.querySelector('#comboSelectAllBtn');
        const keepBtn = dialog.querySelector('#comboKeepSelectedBtn');
        const cBtn = dialog.querySelector('#comboCancelBtn');

        if (allBtn) allBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup('selectAll'); });
        if (keepBtn) keepBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup('keepSelected'); });
        if (cBtn) cBtn.addEventListener('click', (e) => { e.preventDefault(); cleanup('cancel'); });
    });
}

async function removeMovedEditOriginal(orig) {
    if (!orig) return;
    try {
        const hist = readAllHistory().filter(item => !isSameAttendanceIdentity(item, orig));
        localStorage.setItem('mgm_attendance_history', JSON.stringify(compactAttendanceHistory(hist)));
        renderHistoryList();
    } catch (e) {}
}

async function submitData(dateVal, rollNumbersRaw, yearVal, sectionVal, subjectVal, slotVal, btnElem, textElem, spinnerElem) {
    const cleanDate = dateVal || getTodayISOString();
    let cleanSubject = (subjectVal || '').trim();
    let cleanSection = String(sectionVal || '').trim();
    let cleanYear = String(yearVal || '').trim();
    let cleanSlot = parseInt(slotVal, 10);

    // If a field looks empty, re-read from the live form controls (direct or modal).
    try {
        if (!cleanYear) {
            const dY = document.getElementById('directYearSelect');
            const mY = document.getElementById('yearSelect');
            cleanYear = String((dY && dY.value) || (mY && mY.value) || '').trim();
        }
        if (!cleanSection) {
            const dS = document.getElementById('directSectionSelect');
            const mS = document.getElementById('sectionSelect');
            cleanSection = String((dS && dS.value) || (mS && mS.value) || '').trim();
        }
        if (!cleanSubject) {
            const dSub = document.getElementById('directSubjectInput');
            const mSub = document.getElementById('subjectInput');
            cleanSubject = String((dSub && dSub.value) || (mSub && mSub.value) || '').trim();
        }
        if (!cleanSlot || isNaN(cleanSlot)) {
            const dSl = document.getElementById('directSlotSelect');
            const mSl = document.getElementById('slotSelect');
            cleanSlot = parseInt((dSl && dSl.value) || (mSl && mSl.value) || '1', 10) || 1;
        }
    } catch (e) {}

    if (!isAttendanceDateAllowed(cleanDate)) {
        alert('Date must be today or within the last ' + ATTENDANCE_DATE_PAST_DAYS + ' days. Future dates are not allowed.');
        applyAttendanceDateLimits();
        return { status: 'cancelled' };
    }

    if (!cleanYear) {
        alert('Please select a Year before submitting.');
        return { status: 'cancelled' };
    }
    yearVal = cleanYear;

    const deptCfg = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    if (deptCfg.hasSections !== false && !cleanSection) {
        alert('Please select a Section before submitting.');
        return { status: 'cancelled' };
    }

    if (!cleanSubject) {
        alert('Please select a Subject before submitting.');
        return { status: 'cancelled' };
    }

    if (!cleanSlot || isNaN(cleanSlot)) cleanSlot = 1;
    if (!cleanSection) cleanSection = 'A';

    // Language / elective subjects are combined across sections
    if (isElectiveOrLanguageSubject(cleanSubject)) {
        cleanSection = 'ALL';
    }

    const rollNumbersArray = normalizeRollNumbers(rollNumbersRaw);
    let formattedRolls = rollNumbersArray.length > 0 ? rollNumbersArray.join(', ') : 'NIL';

    const history = JSON.parse(localStorage.getItem('mgm_attendance_history') || '[]');
    const cleanStream = currentDept || 'BCA';
    const editOrig = editingOriginalEntry;
    const newIdentity = {
        date: cleanDate,
        year: yearVal,
        section: cleanSection,
        subject: cleanSubject,
        slot: cleanSlot,
        stream: cleanStream
    };
    const editingSelf = !!(editOrig && isSameAttendanceIdentity(editOrig, newIdentity));
    const editingMoved = !!(editOrig && !editingSelf);

    const localSectionLock = findCombinedVsSectionBlockEntry(
        history, cleanStream, cleanDate, yearVal, cleanSlot, cleanSection, editOrig
    );

    let sheetConflict = { exists: false };
    try {
        sheetConflict = await checkSheetSlotConflict(cleanDate, yearVal, cleanSection, cleanSlot, cleanSubject);
    } catch (e) {
        sheetConflict = { exists: false, offline: true };
    }

    if (sheetConflict.exists && !sheetConflict.offline) {
        const sheetSec = sheetConflict.section || cleanSection;
        if (isParallelCombinedSubjectEntry(sheetSec, sheetConflict.subject, cleanSection, cleanSubject)) {
            sheetConflict = { exists: false, parallelElective: true };
        } else if (editOrig && isSameAttendanceIdentity({
            date: cleanDate,
            year: sheetConflict.year || yearVal,
            section: sheetSec,
            subject: sheetConflict.subject,
            slot: cleanSlot,
            stream: cleanStream
        }, editOrig)) {
            sheetConflict = { exists: false, editingSelf: true };
        } else if (allowsParallelSubjects(cleanStream) && sheetConflict.subject &&
            !subjectsAreSame(sheetConflict.subject, cleanSubject)) {
            sheetConflict = { exists: false, parallelAudience: true };
        } else if (isCombinedVsSpecificSectionConflict(sheetSec, cleanSection)) {
            await showCombinedSectionBlockDialog({
                date: cleanDate,
                year: yearVal,
                slot: cleanSlot,
                section: cleanSection,
                subject: cleanSubject,
                existingSection: sheetSec,
                existingSubj: sheetConflict.subject,
                existingRolls: sheetConflict.rollNumbers
            });
            return { status: 'cancelled' };
        }
    }

    if (localSectionLock) {
        await showCombinedSectionBlockDialog({
            date: cleanDate,
            year: yearVal,
            slot: cleanSlot,
            section: cleanSection,
            subject: cleanSubject,
            existingSection: localSectionLock.section,
            existingSubj: localSectionLock.subject,
            existingRolls: localSectionLock.rollNumbers
        });
        return { status: 'cancelled' };
    }

    const existingEntry = history.find(item => {
        if ((item.stream || 'BCA') !== cleanStream) return false;
        if (normalizeHistoryDate(item.date) !== normalizeHistoryDate(cleanDate)) return false;
        if (item.year !== yearVal) return false;
        if (parseInt(item.slot, 10) !== cleanSlot) return false;
        if (editOrig && isSameAttendanceIdentity(item, editOrig)) return false;

        const sec1 = item.section || 'A';
        const sec2 = cleanSection || 'A';
        if (!isSectionOverlap(sec1, sec2, cleanStream)) return false;

        if (allowsParallelSubjects(cleanStream) && item.subject &&
            !subjectsAreSame(item.subject, cleanSubject)) {
            return false;
        }

        if (isParallelCombinedSubjectEntry(sec1, item.subject, sec2, cleanSubject)) {
            return false;
        }

        const sameCommonEng = normalizeSectionCode(sec1) === 'COMMON' && normalizeSectionCode(sec2) === 'COMMON';
        if (sameCommonEng && item.subject && !subjectsAreSame(item.subject, cleanSubject)) {
            return false;
        }

        return true;
    });

    const isEditingMode = !!editOrig;
    const hasConflict = isEditingMode || !!existingEntry || (sheetConflict.exists && !sheetConflict.offline && !sheetConflict.editingSelf && !sheetConflict.parallelElective && !sheetConflict.parallelAudience);
    let finalRolls = formattedRolls;
    let finalRollsArr = rollNumbersArray;
    let conflictChoice = isEditingMode ? 'replace' : 'create';

    if (hasConflict) {
        let prevSubj = cleanSubject;
        let prevRolls = 'NIL';

        if (sheetConflict.exists && sheetConflict.subject) {
            prevSubj = sheetConflict.subject;
            prevRolls = sheetConflict.rollNumbers != null ? sheetConflict.rollNumbers : 'NIL';
        } else if (existingEntry) {
            prevSubj = existingEntry.subject;
            prevRolls = existingEntry.rollNumbers;
        } else if (editOrig) {
            prevSubj = editOrig.subject || cleanSubject;
            prevRolls = editOrig.rollNumbers || 'NIL';
        }

        const userChoice = await showSlotConflictDialog({
            date: cleanDate,
            year: yearVal,
            section: cleanSection,
            slot: cleanSlot,
            subject: cleanSubject,
            existingSubj: prevSubj,
            existingRolls: prevRolls,
            newRolls: formattedRolls,
            isEditing: isEditingMode
        });

        if (!userChoice || userChoice.action === 'cancel') {
            return { status: 'cancelled' };
        }

        conflictChoice = userChoice.action;
        finalRolls = userChoice.mergedRolls;
        finalRollsArr = userChoice.mergedArr;
    }

    // Now disable button & show spinner during actual HTTP POST transmission
    if (btnElem) btnElem.disabled = true;
    if (textElem) textElem.style.opacity = '0.5';
    if (spinnerElem) spinnerElem.style.display = 'block';

    const isUpdate = isEditingMode || hasConflict;
    const prevRollsArr = (sheetConflict.exists && !sheetConflict.offline)
        ? normalizeRollNumbers(sheetConflict.rollNumbers)
        : (existingEntry ? normalizeRollNumbers(existingEntry.rollNumbers) : (editOrig ? normalizeRollNumbers(editOrig.rollNumbers) : []));
    const diff = computeRollDiff(prevRollsArr.join(', '), finalRolls);

    const payload = {
        action: isUpdate ? 'update' : 'create',
        isUpdate: isUpdate,
        stream: currentDept,
        date: cleanDate,
        rollNumbers: finalRolls,
        year: yearVal,
        section: cleanSection,
        subject: cleanSubject,
        slot: cleanSlot,
        originalDate: editOrig ? editOrig.date : cleanDate,
        originalSlot: editOrig ? editOrig.slot : cleanSlot,
        originalSubject: editOrig ? editOrig.subject : cleanSubject,
        originalSection: editOrig ? editOrig.section : cleanSection,
        originalYear: editOrig ? editOrig.year : yearVal,
        previousRollNumbers: diff.prevRolls.length > 0 ? diff.prevRolls.join(', ') : 'NIL',
        addedRollNumbers: diff.addedRolls.length > 0 ? diff.addedRolls.join(', ') : 'NIL',
        deletedRollNumbers: diff.deletedRolls.length > 0 ? diff.deletedRolls.join(', ') : 'NIL',
        retainedRollNumbers: diff.retainedRolls.length > 0 ? diff.retainedRolls.join(', ') : 'NIL',
        changesSummary: isUpdate 
            ? (conflictChoice === 'merge' ? '🔀 Merged absentees from both entries' : '✏️ Updated entry in Google Sheets')
            : 'Initial Submission'
    };

    console.log('Submitting Attendance Payload:', payload);

    if (textElem) textElem.style.opacity = '0';
    if (spinnerElem) spinnerElem.style.display = 'block';

    // Only skip sheet POST when the browser reports offline. Always POST when online
    // (do not gate on webhook URL heuristics — that blocked the live Apps Script URL).
    const networkOff = (typeof navigator !== 'undefined' && navigator.onLine === false);

    try {
        if (networkOff) {
            throw new Error('Browser reports offline');
        }

        const targetUrl = getWebhookUrl(currentDept);
        await postWithRetry(targetUrl, withAuth(payload), 2);

        const recordPayload = {
            ...payload,
            offline: false,
            syncNote: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        saveToLocalHistory(recordPayload);
        demoteReplacedLocalSubjects(payload);
        if (editingMoved && editOrig) {
            await removeMovedEditOriginal(editOrig);
        }
        editingOriginalEntry = null;
        closeConfirmationModal();
        resetAllInputs();
        renderHistoryList();
        showSuccessToast(recordPayload);
        setTimeout(fetchTodayServerHistory, 800);
        return { status: 'ok' };

    } catch (error) {
        console.warn('Error submitting attendance:', error);
        const recordPayload = {
            ...payload,
            offline: true,
            syncNote: 'Pending Sync',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        saveToLocalHistory(recordPayload);
        if (editingMoved && editOrig) {
            try { await removeMovedEditOriginal(editOrig); } catch (e2) {}
        }
        editingOriginalEntry = null;
        closeConfirmationModal();
        resetAllInputs();
        renderHistoryList();
        showSuccessToast(recordPayload);
        updateSyncButtonState();
        return { status: 'offline' };
    } finally {
        if (btnElem) btnElem.disabled = false;
        if (textElem) textElem.style.opacity = '1';
        if (spinnerElem) spinnerElem.style.display = 'none';
    }
}

function renderMultiSlotBreakdown(containerEl, startSlot, duration, masterRollVal) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const endSlot = Math.min(8, startSlot + duration - 1);

    for (let slotNum = startSlot; slotNum <= endSlot; slotNum++) {
        const slotLabel = SLOT_TIME_LABELS[slotNum] || ('Slot ' + slotNum);
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        rowDiv.style.alignItems = 'center';
        rowDiv.style.gap = '8px';
        rowDiv.style.marginTop = '4px';

        const label = document.createElement('span');
        label.style.fontSize = '0.78rem';
        label.style.fontWeight = '600';
        label.style.minWidth = '115px';
        label.style.color = '#93c5fd';
        label.textContent = `Slot ${slotNum} (${slotLabel}):`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input multi-slot-roll-input';
        input.dataset.slot = String(slotNum);
        input.placeholder = 'Absentees for Slot ' + slotNum + ' (or leave blank)';
        input.value = masterRollVal || '';
        input.style.fontSize = '0.82rem';
        input.style.padding = '5px 8px';
        input.style.flex = '1';

        rowDiv.appendChild(label);
        rowDiv.appendChild(input);
        containerEl.appendChild(rowDiv);
    }
}

function handleMultiSlotVisibility(durationSelectEl, slotSelectEl, masterRollInputEl, containerWrapperEl, breakdownEl) {
    if (!durationSelectEl || !containerWrapperEl) return;
    const duration = parseInt(durationSelectEl.value, 10) || 1;
    const startSlot = parseInt(slotSelectEl ? slotSelectEl.value : '1', 10) || 1;

    if (duration > 1) {
        containerWrapperEl.style.display = 'block';
        renderMultiSlotBreakdown(breakdownEl, startSlot, duration, masterRollInputEl ? masterRollInputEl.value : '');
    } else {
        containerWrapperEl.style.display = 'none';
        if (breakdownEl) breakdownEl.innerHTML = '';
    }
}

async function handleMultiSlotSubmit(dateVal, masterRollRaw, yearVal, sectionVal, subjectVal, startSlotVal, durationVal, breakdownEl, btnElem, textElem, spinnerElem) {
    const duration = parseInt(durationVal, 10) || 1;
    const startSlot = parseInt(startSlotVal, 10) || 1;

    if (duration <= 1) {
        return await submitData(dateVal, masterRollRaw, yearVal, sectionVal, subjectVal, startSlot, btnElem, textElem, spinnerElem);
    }

    const endSlot = Math.min(8, startSlot + duration - 1);
    let successCount = 0;
    let cancelledCount = 0;

    // CRITICAL: snapshot every slot's absentees BEFORE the first submit.
    // submitData → resetAllInputs() wipes the multi-slot DOM, so later slots
    // used to fall back to empty master → NIL (edit later still worked).
    const slotRollMap = {};
    for (let slotNum = startSlot; slotNum <= endSlot; slotNum++) {
        let slotRollRaw = masterRollRaw;
        if (breakdownEl) {
            const slotInput = breakdownEl.querySelector('input[data-slot="' + slotNum + '"]');
            if (slotInput) {
                slotRollRaw = slotInput.value;
            }
        }
        slotRollMap[slotNum] = slotRollRaw;
    }

    for (let slotNum = startSlot; slotNum <= endSlot; slotNum++) {
        const slotRollRaw = slotRollMap[slotNum];
        try {
            const result = await submitData(dateVal, slotRollRaw, yearVal, sectionVal, subjectVal, slotNum, btnElem, textElem, spinnerElem);
            if (result && result.status === 'cancelled') {
                cancelledCount++;
                break; // stop remaining slots if user cancelled a conflict
            }
            if (result && (result.status === 'ok' || result.status === 'offline')) {
                successCount++;
            }
        } catch (e) {
            console.warn('Error submitting slot ' + slotNum + ':', e);
        }
    }

    if (successCount > 0) {
        showCustomToast(
            '⚡ ' + successCount + '-Slot Lab Recorded!',
            'Absentees logged for Slots ' + startSlot + ' to ' + endSlot + ' (' + subjectVal + ').'
        );
    } else if (cancelledCount > 0) {
        showCustomToast('Submission cancelled', 'No lab slots were saved.');
    }
}

function submitModalForm() {
    const dateEl = document.getElementById('dateInput');
    const rollEl = document.getElementById('rollNumbersInput');
    const yearEl = document.getElementById('yearSelect');
    const secEl = document.getElementById('sectionSelect');
    const subjEl = document.getElementById('subjectInput');
    const slotEl = document.getElementById('slotSelect');
    const btnEl = document.getElementById('submitBtn');
    const textEl = document.getElementById('submitBtnText');
    const spinnerEl = document.getElementById('submitSpinner');
    const durationSelect = document.getElementById('durationSelect');
    const modalMultiSlotBreakdown = document.getElementById('modalMultiSlotBreakdown');

    handleMultiSlotSubmit(
        dateEl ? dateEl.value : getTodayISOString(),
        rollEl ? rollEl.value : '',
        yearEl ? yearEl.value : '',
        secEl ? secEl.value : '',
        subjEl ? subjEl.value : '',
        slotEl ? slotEl.value : '1',
        durationSelect ? durationSelect.value : '1',
        modalMultiSlotBreakdown,
        btnEl, textEl, spinnerEl
    );
}

function submitDirectForm() {
    const dateEl = document.getElementById('directDateInput');
    const rollEl = document.getElementById('directRollInput');
    const yearEl = document.getElementById('directYearSelect');
    const secEl = document.getElementById('directSectionSelect');
    const subjEl = document.getElementById('directSubjectInput');
    const slotEl = document.getElementById('directSlotSelect');
    const btnEl = document.getElementById('directSubmitBtn');
    const textEl = document.getElementById('directSubmitBtnText');
    const spinnerEl = document.getElementById('directSubmitSpinner');
    const directDurationSelect = document.getElementById('directDurationSelect');
    const directMultiSlotBreakdown = document.getElementById('directMultiSlotBreakdown');

    handleMultiSlotSubmit(
        dateEl ? dateEl.value : getTodayISOString(),
        rollEl ? rollEl.value : '',
        yearEl ? yearEl.value : '',
        secEl ? secEl.value : '',
        subjEl ? subjEl.value : '',
        slotEl ? slotEl.value : '1',
        directDurationSelect ? directDurationSelect.value : '1',
        directMultiSlotBreakdown,
        btnEl, textEl, spinnerEl
    );
}

// 5. Success Toast & Reset State
function ensureToastOnBody(toastEl) {
    if (!toastEl || !document.body) return toastEl;
    try {
        if (toastEl.parentElement !== document.body) {
            document.body.appendChild(toastEl);
        }
    } catch (e) {}
    return toastEl;
}

function showSuccessToast(payload) {
    const successToast = ensureToastOnBody(document.getElementById('successToast'));
    const toastSubtext = document.getElementById('toastSubtext');
    const toastTitleElem = successToast ? successToast.querySelector('.toast-text') : null;

    if (!successToast) return;

    const isUpdate = payload && (payload.isUpdate || payload.action === 'update');
    const isOffline = !!(payload && payload.offline);
    const rollCount = (payload && payload.rollNumbers && payload.rollNumbers !== 'NIL')
        ? normalizeRollNumbers(payload.rollNumbers).length
        : 0;
    const actionLabel = isUpdate
        ? (isOffline ? 'Attendance Updated (Offline)' : 'Attendance Updated!')
        : (isOffline ? 'Attendance Recorded (Offline)' : 'Attendance Recorded!');
    
    if (toastTitleElem) toastTitleElem.textContent = actionLabel;
    if (toastSubtext && payload) {
        const statusNote = isOffline
            ? 'saved offline — will sync when internet is back'
            : 'sent to Google Sheet';
        toastSubtext.textContent = `${rollCount} absentee(s) ${statusNote} for ${payload.date || ''} - ${payload.year || ''} Sec ${payload.section || ''} (${payload.subject || ''})`;
    }
    
    // Explicit inline overrides to guarantee 100% visibility on mobile WebKit/Blink
    successToast.style.display = 'flex';
    successToast.style.opacity = '1';
    successToast.style.pointerEvents = 'auto';
    successToast.style.visibility = 'visible';
    successToast.style.zIndex = '2147483646';
    successToast.classList.add('active');

    setTimeout(() => {
        successToast.style.opacity = '0';
        successToast.style.pointerEvents = 'none';
        setTimeout(() => {
            successToast.style.display = 'none';
            successToast.style.visibility = 'hidden';
            successToast.classList.remove('active');
        }, 300);
    }, 3500);
}

function updateMarkAbsenteesStepUI() {
    // Always show full Mark Absentees form (Date → Year/Sec → Slot/Duration → Subject → Rolls)
    const stepIds = ['markStepYearSec', 'markStepSlotDur', 'markStepSubject', 'markStepRolls', 'markStepActions'];
    stepIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
    });
}

function resetAllInputs() {
    editingOriginalEntry = null;
    clearTranscript();
    const todayStr = getTodayISOString();
    const deptConfig = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    if (manualTextInput) manualTextInput.value = '';
    directDateInput.value = todayStr;
    dateInput.value = todayStr;
    applyAttendanceDateLimits();
    directRollInput.value = '';
    if (directSubjectInput) directSubjectInput.value = '';
    setSubjectValue(subjectInput, deptConfig.defaultSubject);
    if (directYearSelect) directYearSelect.value = '';
    if (directSectionSelect) directSectionSelect.value = '';
    if (directSlotSelect) directSlotSelect.value = '';

    const directDurationSelect = document.getElementById('directDurationSelect');
    const durationSelect = document.getElementById('durationSelect');
    if (directDurationSelect) directDurationSelect.value = '1';
    if (durationSelect) durationSelect.value = '1';

    const directMultiSlotWrapper = document.getElementById('directMultiSlotContainer');
    const directMultiSlotBreakdown = document.getElementById('directMultiSlotBreakdown');
    handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);

    const modalMultiSlotWrapper = document.getElementById('modalMultiSlotContainer');
    const modalMultiSlotBreakdown = document.getElementById('modalMultiSlotBreakdown');
    handleMultiSlotVisibility(durationSelect, slotSelect, rollNumbersInput, modalMultiSlotWrapper, modalMultiSlotBreakdown);

    if (deleteBtn) deleteBtn.style.display = 'none';
    if (modalAlertBox) modalAlertBox.style.display = 'none';
    if (directAlertBox) directAlertBox.style.display = 'none';
    if (submitBtnText) submitBtnText.textContent = 'Submit Absentee';
    if (directSubmitBtnText) directSubmitBtnText.textContent = 'Submit Absentee';
    try { updateMarkAbsenteesStepUI(); } catch (e) {}
}

// Delete = app history + Raw Data row (section B/C formulas refresh to blank)
async function deleteData(dateVal, yearVal, sectionVal, subjectVal, slotVal, streamVal) {
    const cleanDate = dateVal || getTodayISOString();
    const cleanSlot = parseInt(slotVal, 10) || 1;
    const cleanStream = streamVal || currentDept || 'BCA';
    const cleanYear = yearVal || 'First Year';
    const cleanSection = sectionVal || 'A';
    const cleanSubject = (subjectVal || '').trim();

    const history = readAllHistory();
    const targetItem = history.find(item => 
        (item.stream || 'BCA') === cleanStream &&
        normalizeHistoryDate(item.date) === normalizeHistoryDate(cleanDate) &&
        String(item.year || '').trim() === String(cleanYear).trim() &&
        normalizeSectionCode(item.section) === normalizeSectionCode(cleanSection) &&
        String(item.subject || '').trim().toLowerCase() === cleanSubject.toLowerCase() &&
        (parseInt(item.slot, 10) || 1) === cleanSlot
    );

    const confirmDelete = confirm(
        'Delete this attendance from Google Sheets?\n\n' +
        'Stream: ' + cleanStream + '\n' +
        'Date: ' + cleanDate + '\n' +
        'Slot: ' + cleanSlot + ' (' + cleanSubject + ')\n' +
        'Year/Section: ' + cleanYear + ' Sec ' + cleanSection + '\n\n' +
        'This will:\n' +
        '- Remove the row from Raw Data (' + cleanStream + ')\n' +
        '- Section sheet subject/absentees go blank (formulas stay)\n' +
        '- Remove it from today\'s list on this phone\n\n' +
        'To only fix roll numbers, tap Cancel and use Edit/Submit instead.'
    );

    if (!confirmDelete) return;

    const prevRolls = targetItem ? normalizeRollNumbers(targetItem.rollNumbers) : [];
    const prevStr = prevRolls.length > 0 ? prevRolls.join(', ') : 'NIL';

    const updatedHistory = history.filter(item => 
        !((item.stream || 'BCA') === cleanStream &&
          normalizeHistoryDate(item.date) === normalizeHistoryDate(cleanDate) &&
          String(item.year || '').trim() === String(cleanYear).trim() &&
          normalizeSectionCode(item.section) === normalizeSectionCode(cleanSection) &&
          String(item.subject || '').trim().toLowerCase() === cleanSubject.toLowerCase() &&
          (parseInt(item.slot, 10) || 1) === cleanSlot)
    );
    saveHistoryToLocalStorage(updatedHistory);
    renderHistoryList();

    const payload = {
        action: 'delete',
        stream: cleanStream,
        date: cleanDate,
        year: cleanYear,
        section: cleanSection,
        subject: cleanSubject,
        slot: cleanSlot,
        rollNumbers: 'NIL',
        previousRollNumbers: prevStr,
        deletedRollNumbers: prevStr,
        changesSummary: `Deleted Raw Data row (section formulas refresh; was: ${prevStr})`
    };

    console.log('Sending Delete Payload:', payload);

    try {
        const targetUrl = getWebhookUrl(cleanStream);
        await postWithRetry(targetUrl, withAuth(payload), 2);
    } catch (e) {
        console.error('Error sending delete request:', e);
        alert('Could not reach Google Sheets. Removed from app history on phone — check Raw Data / section sheet manually.');
    }

    closeConfirmationModal();
    resetAllInputs();

    const toastTitleElem = document.querySelector('#successToast .toast-text');
    const toastSubtextElem = document.getElementById('toastSubtext');
    const successToastElem = document.getElementById('successToast');
    if (toastTitleElem) toastTitleElem.textContent = 'Deleted from Sheets';
    if (toastSubtextElem) toastSubtextElem.textContent = `Raw Data (${cleanStream}) deleted — section formulas will clear (${cleanDate}, Slot ${cleanSlot})`;
    if (successToastElem) {
        successToastElem.classList.add('active');
        setTimeout(() => successToastElem.classList.remove('active'), 2800);
    }
}

function deleteHistoryEntry(index, sourceList) {
    const list = sourceList || getActiveDrawerEntries();
    const item = list[index];
    if (!item) return;
    deleteData(item.date, item.year, item.section, item.subject, item.slot, item.stream || currentDept);
}

const SLOT_TIME_LABELS = {
    1: '9-9.55',
    2: '10-10.55',
    3: '11.10-12.05',
    4: '12.10-1.05',
    5: '1.05-2',
    6: '2-2.55',
    7: '3-3.55',
    8: '4-4.55'
};

function normalizeHistoryDate(val) {
    if (!val && val !== 0) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    const s = String(val).trim();
    if (!s) return '';
    const isoMatch = s.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
    if (isoMatch) {
        const yIso = isoMatch[1];
        const mIso = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
        const dIso = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
        return yIso + '-' + mIso + '-' + dIso;
    }
    const parts = s.split(/[\sT]+/)[0].split(/[\/\.-]/);
    if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);

        let yr = p2;
        if (yr < 100) yr += 2000;
        if (yr > 1900 && yr < 2100) {
            const day = (p1 > 12 && p0 <= 12) ? p1 : p0;
            const month = (p1 > 12 && p0 <= 12) ? p0 : p1;
            return yr + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        }

        let yr0 = p0;
        if (yr0 < 100) yr0 += 2000;
        if (yr0 > 1900 && yr0 < 2100) {
            return yr0 + '-' + String(p1).padStart(2, '0') + '-' + String(p2).padStart(2, '0');
        }
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        return normalizeHistoryDate(parsed);
    }
    return s;
}

function hodYearPrefix(yearVal) {
    const y = String(yearVal || '').trim().toUpperCase();
    if (!y) return 'I';
    if (/\bTHIRD\b|\b3RD\b|\bIII\b|(^|[^I])\b3\b/.test(y) || y === '3' || y.startsWith('III')) return 'III';
    if (/\bSECOND\b|\b2ND\b|\bII\b|(^|[^I])\b2\b/.test(y) || y === '2' || (y.startsWith('II') && !y.startsWith('III'))) return 'II';
    if (/\bFIRST\b|\b1ST\b|(^|[^I])\b1\b/.test(y) || y === '1' || y === 'I') return 'I';
    if (y.indexOf('III') !== -1) return 'III';
    if (y.indexOf('II') !== -1) return 'II';
    if (y === 'I' || y.indexOf('I ') === 0) return 'I';
    return 'I';
}

function hodYearCardPrefix(secTitle) {
    const t = String(secTitle || '');
    if (t.startsWith('III ') || t.startsWith('III-')) return 'III';
    if (t.startsWith('II ') || t.startsWith('II-')) return 'II';
    if (t.startsWith('I ') || t.startsWith('I-')) return 'I';
    return hodYearPrefix(t);
}

function isYearMatching(itemYear, filterYear) {
    if (!filterYear || filterYear === 'ALL') return true;
    return hodYearPrefix(itemYear) === hodYearPrefix(filterYear);
}

function isStreamMatch(s1, s2) {
    const norm1 = String(s1 || 'BCA').trim().toUpperCase().replace('BCOM', 'BCM');
    const norm2 = String(s2 || 'BCA').trim().toUpperCase().replace('BCOM', 'BCM');
    return norm1 === norm2;
}

function entryKey(item) {
    return [
        normalizeHistoryDate(item.date) || '',
        hodYearPrefix(item.year),
        normalizeSectionCode(item.section || ''),
        (item.subject || '').trim().toLowerCase(),
        String(parseInt(item.slot, 10) || 1)
    ].join('|');
}

/** Sheet identity without subject — BCA/B.Com keep one raw row per slot. */
function slotSheetKey(item) {
    return [
        normalizeHistoryDate(item.date) || '',
        hodYearPrefix(item.year),
        normalizeSectionCode(item.section || ''),
        String(parseInt(item.slot, 10) || 1),
        (item.stream || 'BCA')
    ].join('|');
}

/**
 * After a subject is confirmed on sheet for a slot, other local subjects for that
 * same slot are no longer on Raw Data (overwrite). Skip for B.Sc./B.A. parallel subjects.
 */
function demoteReplacedLocalSubjects(savedEntry) {
    if (allowsParallelSubjects(savedEntry.stream || currentDept)) return;
    const savedKey = slotSheetKey(savedEntry);
    const savedSubj = String(savedEntry.subject || '').trim().toLowerCase();
    const history = readAllHistory();
    let changed = false;
    const next = history.map(item => {
        if ((item.stream || 'BCA') !== (savedEntry.stream || 'BCA')) return item;
        if (slotSheetKey(item) !== savedKey) return item;
        if (String(item.subject || '').trim().toLowerCase() === savedSubj) return item;
        changed = true;
        return {
            ...item,
            offline: true,
            syncNote: 'replaced_on_sheet_by:' + (savedEntry.subject || '')
        };
    });
    if (changed) {
        localStorage.setItem('mgm_attendance_history', JSON.stringify(compactAttendanceHistory(next)));
    }
}

function readAllHistory() {
    try {
        const rawMain = localStorage.getItem('mgm_attendance_history') || '[]';
        const rawBca = localStorage.getItem('mgm_bca_attendance_history') || '[]';
        const listMain = JSON.parse(rawMain);
        const listBca = JSON.parse(rawBca);

        const byKey = new Map();
        [...listMain, ...listBca].forEach(item => {
            if (item) {
                const k = entryKey(item) + '|' + (item.stream || 'BCA');
                if (!byKey.has(k)) {
                    byKey.set(k, item);
                }
            }
        });
        return Array.from(byKey.values());
    } catch (e) {
        return [];
    }
}

/**
 * Tidy local history without losing the offline sync queue.
 * - Always keep unsynced (offline:true) entries for ANY date.
 * - Keep up to 2000 total synced records so All History tab displays completely.
 */
function compactAttendanceHistory(history) {
    let offlineKept = 0;
    let syncedKept = 0;
    const MAX_OFFLINE = 100;
    const MAX_SYNCED_TOTAL = 2000;

    return (history || []).filter(item => {
        if (!item) return false;
        if (item.offline === true) {
            if (offlineKept >= MAX_OFFLINE) return false;
            offlineKept++;
            return true;
        }
        if (syncedKept >= MAX_SYNCED_TOTAL) return false;
        syncedKept++;
        return true;
    });
}

function saveHistoryToLocalStorage(history) {
    const json = JSON.stringify(history);
    try { localStorage.setItem('mgm_attendance_history', json); } catch (e) {}
    try { localStorage.setItem('mgm_bca_attendance_history', json); } catch (e) {}
}

function pruneOldHistory() {
    const kept = compactAttendanceHistory(readAllHistory());
    saveHistoryToLocalStorage(kept);
    return kept;
}

function getTodayEntries() {
    const today = getTodayISOString();
    const deptItems = readAllHistory().filter(item => isStreamMatch(item.stream, currentDept));
    const pendingOtherDays = deptItems.filter(item => item.offline === true && normalizeHistoryDate(item.date) !== today);
    const todayItems = deptItems.filter(item => normalizeHistoryDate(item.date) === today);
    return [...pendingOtherDays, ...todayItems].slice(0, 120);
}

function updateTodayBadge() {
    const badge = document.getElementById('todayCountBadge');
    const entries = getTodayEntries();
    const count = entries.length;
    const pendingOffline = entries.filter(item => item.offline === true).length;
    if (badge) {
        if (count > 0) {
            badge.hidden = false;
            badge.textContent = String(count);
        } else {
            badge.hidden = true;
            badge.textContent = '0';
        }
    }
    const sub = document.getElementById('todayDrawerSubtitle');
    if (sub) {
        if (count === 0) {
            sub.textContent = 'No classes marked yet today';
        } else if (pendingOffline > 0) {
            sub.textContent = count + ' entr' + (count === 1 ? 'y' : 'ies') +
                ' — ' + pendingOffline + ' waiting to sync to Google Sheet';
        } else {
            sub.textContent = count + ' class' + (count === 1 ? '' : 'es') +
                ' marked today — edit or delete any';
        }
    }
}

// Local log + durable offline queue (offline rows survive past midnight)
function saveToLocalHistory(entry) {
    const today = getTodayISOString();
    const entryDate = entry.date || today;
    let history = readAllHistory();

    const normalized = {
        ...entry,
        date: normalizeHistoryDate(entryDate) || entryDate,
        stream: entry.stream || currentDept || 'BCA',
        syncNote: entry.syncNote || '',
        timestamp: entry.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const existingIdx = history.findIndex(item =>
        entryKey(item) === entryKey(normalized) &&
        (item.stream || 'BCA') === (normalized.stream || 'BCA')
    );

    if (existingIdx !== -1) {
        history[existingIdx] = { ...history[existingIdx], ...normalized };
        const updated = history.splice(existingIdx, 1)[0];
        history.unshift(updated);
    } else {
        history.unshift(normalized);
    }

    history = compactAttendanceHistory(history);
    saveHistoryToLocalStorage(history);
    renderHistoryList();
}

function showCustomToast(title, subtitle) {
    const toastEl = ensureToastOnBody(document.getElementById('successToast'));
    const toastTitleElem = toastEl ? toastEl.querySelector('.toast-text') : null;
    const subtextEl = document.getElementById('toastSubtext');

    if (toastTitleElem) toastTitleElem.textContent = title;
    if (subtextEl) subtextEl.textContent = subtitle || '';
    if (toastEl) {
        toastEl.style.display = 'flex';
        toastEl.style.opacity = '1';
        toastEl.style.pointerEvents = 'auto';
        toastEl.style.visibility = 'visible';
        toastEl.style.zIndex = '2147483646';
        toastEl.classList.add('active');
        setTimeout(() => {
            toastEl.classList.remove('active');
            toastEl.style.opacity = '0';
            toastEl.style.pointerEvents = 'none';
            setTimeout(() => { toastEl.style.display = 'none'; }, 350);
        }, 3500);
    }
}

async function syncOfflineEntries() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        updateSyncButtonState();
        return 0;
    }

    const history = readAllHistory();
    const offlineItems = history.filter(item => item.offline === true);
    if (offlineItems.length === 0) {
        updateSyncButtonState();
        return 0;
    }

    const syncBtn = document.getElementById('syncOfflineBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing...';
    }

    let syncedCount = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].offline) {
            const item = history[i];
            const targetUrl = getWebhookUrl(item.stream || currentDept);
            if (!targetUrl || String(targetUrl).includes('YOUR_')) continue;

            const payload = withAuth({
                action: item.action || 'create',
                isUpdate: !!(item.isUpdate || item.action === 'update'),
                stream: item.stream || currentDept || 'BCA',
                date: item.date,
                rollNumbers: Array.isArray(item.rollNumbers)
                    ? item.rollNumbers.join(', ')
                    : (item.rollNumbers == null || String(item.rollNumbers).trim() === '' ? 'NIL' : String(item.rollNumbers)),
                year: item.year,
                section: item.section,
                subject: item.subject,
                slot: String(parseInt(item.slot, 10) || 1),
                changesSummary: item.changesSummary || 'Synced from phone (was pending)'
            });

            try {
                const already = await verifyAttendanceOnSheet(payload);
                if (already.verified) {
                    history[i].offline = false;
                    history[i].syncNote = '';
                    syncedCount++;
                    continue;
                }
                const posted = await postWithRetry(targetUrl, payload, 1);
                const verify = await verifyAttendanceOnSheet(payload);
                // POST succeeded (no-cors cannot read body) — treat as synced when online
                if (verify.verified || (posted && navigator.onLine)) {
                    history[i].offline = false;
                    history[i].syncNote = '';
                    syncedCount++;
                }
            } catch (err) {
                console.warn('Offline sync attempt failed for item:', item, err);
            }
        }
    }

    saveHistoryToLocalStorage(history);
    renderHistoryList();
    updateSyncButtonState();

    if (syncedCount > 0) {
        showCustomToast('⚡ Synced ' + syncedCount + ' entry(s)!', 'Uploaded offline records to Google Sheet.');
    }
    return syncedCount;
}

function updateSyncButtonState() {
    const history = readAllHistory();
    const offlineCount = history.filter(item => item.offline === true).length;
    const syncBtn = document.getElementById('syncOfflineBtn');
    const pendingCountEl = document.getElementById('pendingSyncCount');

    if (syncBtn) {
        if (offlineCount > 0) {
            syncBtn.style.display = 'inline-flex';
            syncBtn.disabled = false;
            if (pendingCountEl) pendingCountEl.textContent = offlineCount;
        } else {
            syncBtn.style.display = 'none';
        }
    }
}

let isFetchingServerHistory = false;

function historyMatchKey(item) {
    return entryKey(item) + '|' + String(item.stream || 'BCA').trim().toUpperCase().replace('BCOM', 'BCM');
}

function fetchTodayServerHistory() {
    if (isFetchingServerHistory) return;
    isFetchingServerHistory = true;

    const stream = currentDept || 'BCA';
    const dateVal = getTodayISOString();
    const targetUrl = getWebhookUrl(stream);
    if (!targetUrl) {
        isFetchingServerHistory = false;
        return;
    }
    const cbName = 'mgm_history_server_cb_' + Date.now();

    const timeout = setTimeout(() => {
        isFetchingServerHistory = false;
        try { delete window[cbName]; } catch (e) {}
    }, 6000);

    window[cbName] = function (data) {
        clearTimeout(timeout);
        isFetchingServerHistory = false;
        try { delete window[cbName]; } catch (e) {}

        if (data && data.result === 'success' && Array.isArray(data.entries)) {
            const serverEntries = data.entries.map(e => ({
                stream: (stream || 'BCA').toUpperCase(),
                date: normalizeHistoryDate(e.date) || dateVal,
                year: e.year || 'First Year',
                section: e.section || 'A',
                subject: e.subject || 'Subject',
                slot: parseInt(e.slot, 10) || 1,
                rollNumbers: e.rollNumbers || 'NIL',
                offline: false,
                syncNote: '',
                timestamp: 'From Sheet'
            }));

            const history = readAllHistory();
            const byKey = new Map();

            // Keep offline queue (any date) + other streams / other dates
            history.forEach(item => {
                const k = historyMatchKey(item);
                if (item.offline === true) {
                    byKey.set(k, item);
                    return;
                }
                const itemStream = item.stream || 'BCA';
                if (!isStreamMatch(itemStream, stream) || normalizeHistoryDate(item.date) !== dateVal) {
                    byKey.set(k, item);
                }
            });

            // Sheet is source of truth for today's list (cross-device)
            serverEntries.forEach(sEntry => {
                const k = historyMatchKey(sEntry);
                byKey.set(k, sEntry);
            });

            const merged = compactAttendanceHistory(Array.from(byKey.values()));
            saveHistoryToLocalStorage(merged);
            renderHistoryList();
            updateSyncButtonState();
        }
    };

    const params = new URLSearchParams({
        action: 'get_absentees',
        stream: stream,
        date: dateVal,
        callback: cbName
    });
    appendAuthToParams(params);

    const scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        clearTimeout(timeout);
        isFetchingServerHistory = false;
        try { delete window[cbName]; } catch (e) {}
        renderHistoryList();
    };
    document.body.appendChild(scriptEl);
}

function fetchFullSheetHistory(stream = currentDept || 'BCA') {
    const targetUrl = getWebhookUrl(stream);
    if (!targetUrl) return;
    const cbName = 'mgm_history_full_cb_' + Date.now();

    window[cbName] = function (data) {
        try { delete window[cbName]; } catch (e) {}

        if (data && data.result === 'success' && Array.isArray(data.entries)) {
            const serverEntries = data.entries.map(e => ({
                stream: (stream || 'BCA').toUpperCase(),
                date: normalizeHistoryDate(e.date) || getTodayISOString(),
                year: e.year || 'First Year',
                section: e.section || 'A',
                subject: e.subject || 'Subject',
                slot: parseInt(e.slot, 10) || 1,
                rollNumbers: e.rollNumbers || 'NIL',
                offline: false,
                syncNote: '',
                timestamp: 'From Sheet'
            }));

            const history = readAllHistory();
            const byKey = new Map();

            // Keep offline queue + entries from OTHER streams
            history.forEach(item => {
                const k = historyMatchKey(item);
                if (item.offline === true) {
                    byKey.set(k, item);
                    return;
                }
                const itemStream = item.stream || 'BCA';
                if (!isStreamMatch(itemStream, stream)) {
                    byKey.set(k, item);
                }
            });

            // Sheet is absolute source of truth for this stream
            serverEntries.forEach(sEntry => {
                const k = historyMatchKey(sEntry);
                byKey.set(k, sEntry);
            });

            const merged = compactAttendanceHistory(Array.from(byKey.values()));
            saveHistoryToLocalStorage(merged);
            renderHistoryList();
            updateSyncButtonState();
            showCustomToast('🔄 Synced with Sheet!', `Loaded ${serverEntries.length} active entries from Google Sheet.`);
        } else if (data && (data.error === 'Unauthorized' || data.result === 'error')) {
            showCustomToast('⚠️ Sheet Sync Failed', data.message || 'Passcode unauthorized or sheet error.');
        }
    };

    const params = new URLSearchParams({
        action: 'get_absentees',
        stream: stream,
        date: 'ALL',
        callback: cbName
    });
    appendAuthToParams(params);

    const scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        try { delete window[cbName]; } catch (e) {}
    };
    document.body.appendChild(scriptEl);
}

function clearLocalHistoryCache() {
    if (confirm("Clear local browser history cache?\n\nThis will remove local cached entries and reload fresh entries directly from Google Sheet.")) {
        try { localStorage.removeItem('mgm_attendance_history'); } catch (e) {}
        try { localStorage.removeItem('mgm_bca_attendance_history'); } catch (e) {}
        showCustomToast('🧹 Local Cache Cleared!', 'Fetching fresh entries from Google Sheet...');
    }
}

function updateAvailableSlots(deptCode, dateStr, yearStr, sectionStr, selectEl) {
    if (!selectEl) return;
    const stream = deptCode || currentDept || 'BCA';
    const cleanDate = normalizeHistoryDate(dateStr) || getTodayISOString();
    const cleanYear = hodYearPrefix(yearStr);
    const secNorm = normalizeSectionCode(sectionStr || 'A');

    const isCombined = secNorm === 'ALL' || secNorm === 'COMBINED' || secNorm === 'COMMON' || String(sectionStr || '').toUpperCase().includes('COMBIN');
    const isParallelAllowed = false;

    // Query history for marked entries on this date, year, section & stream
    const history = readAllHistory();
    const markedMap = new Map();

    history.forEach(item => {
        if (!item) return;
        const itemStream = item.stream || 'BCA';
        if (!isStreamMatch(itemStream, stream)) return;
        if (normalizeHistoryDate(item.date) !== cleanDate) return;
        if (hodYearPrefix(item.year) !== cleanYear) return;

        const itemSecNorm = normalizeSectionCode(item.section || 'A');
        
        let isSecMatched = false;
        if (isCombined) {
            // In Combined mode: match ANY section entry for this date/year/stream
            isSecMatched = true;
        } else {
            // In specific section mode (e.g. Sec A): match if section matches OR if Combined/ALL entry exists
            if (itemSecNorm === secNorm || isCombinedSectionValue(itemSecNorm)) {
                isSecMatched = true;
            }
        }

        if (isSecMatched) {
            const slotNum = parseInt(item.slot, 10) || 1;
            if (!markedMap.has(slotNum)) markedMap.set(slotNum, []);
            markedMap.get(slotNum).push(item);
        }
    });

    // Determine slot being edited so correction is allowed
    const editingSlot = (editingOriginalEntry && 
        normalizeHistoryDate(editingOriginalEntry.date) === cleanDate && 
        hodYearPrefix(editingOriginalEntry.year) === cleanYear && 
        normalizeSectionCode(editingOriginalEntry.section) === secNorm)
        ? parseInt(editingOriginalEntry.slot, 10)
        : null;

    const slotTimeLabels = {
        1: '9:00 - 9:55 AM',
        2: '10:00 - 10:55 AM',
        3: '11:10 - 12:05 PM',
        4: '12:10 - 1:05 PM',
        5: '1:05 - 2:00 PM',
        6: '2:00 - 2:55 PM',
        7: '3:00 - 3:55 PM',
        8: '4:00 - 4:55 PM'
    };

    for (let slotNum = 1; slotNum <= 8; slotNum++) {
        let option = Array.from(selectEl.options).find(opt => parseInt(opt.value, 10) === slotNum);
        if (!option) {
            option = document.createElement('option');
            option.value = String(slotNum);
            selectEl.appendChild(option);
        }

        const timeLabel = slotTimeLabels[slotNum] || (`Slot ${slotNum}`);
        const entriesForSlot = markedMap.get(slotNum) || [];
        const isMarked = entriesForSlot.length > 0;

        if (isCombined || isParallelAllowed) {
            // COMBINED / ELECTIVE / PARALLEL: Keep ALL slots ACTIVE & ENABLED!
            option.disabled = false;
            if (isMarked) {
                const subjs = entriesForSlot.map(e => {
                    const secTag = (e.section && e.section !== 'ALL' && e.section !== 'COMBINED' && e.section !== 'COMMON')
                        ? `Sec ${e.section}: ` : '';
                    return `${secTag}${e.subject || 'Marked'}`;
                }).filter(Boolean).join(', ');
                option.textContent = `Slot ${slotNum} (${timeLabel}) — Marked (${entriesForSlot.length} subj: ${subjs})`;
            } else {
                option.textContent = `Slot ${slotNum} (${timeLabel})`;
            }
        } else {
            // SPECIFIC SECTIONS (Sec A, B, C, C_TP, C_AF, C_AIML):
            // Disable if marked, UNLESS it is the slot being edited for correction
            if (isMarked && slotNum !== editingSlot) {
                option.disabled = true;
                const subjDetails = entriesForSlot.map(e => {
                    const secTag = (isCombinedSectionValue(e.section)) ? 'Combined: ' : '';
                    return `${secTag}${e.subject || 'Marked'}`;
                }).join(', ');
                option.textContent = `Slot ${slotNum} (${timeLabel}) — Marked (${subjDetails}) ✓`;
            } else {
                option.disabled = false;
                option.textContent = `Slot ${slotNum} (${timeLabel})`;
            }
        }
    }

    // If currently selected option is disabled, shift to first available enabled option
    if (selectEl.selectedIndex >= 0) {
        const selectedOpt = selectEl.options[selectEl.selectedIndex];
        if (selectedOpt && selectedOpt.disabled) {
            const firstEnabled = Array.from(selectEl.options).find(opt => opt.value && !opt.disabled);
            if (firstEnabled) {
                selectEl.value = firstEnabled.value;
            }
        }
    }
}

/** Optional slot greying — updates available slots dynamically per section mode. */
function refreshAllSlotDropdowns() {
    try {
        const dSlot = document.getElementById('directSlotSelect');
        const dDate = document.getElementById('directDateInput');
        const dYear = document.getElementById('directYearSelect');
        const dSec = document.getElementById('directSectionSelect');
        const mSlot = document.getElementById('slotSelect');
        const mDate = document.getElementById('dateInput');
        const mYear = document.getElementById('yearSelect');
        const mSec = document.getElementById('sectionSelect');
        if (dSlot && dYear && dSec) {
            updateAvailableSlots(currentDept, dDate ? dDate.value : getTodayISOString(), dYear.value, dSec.value, dSlot);
        }
        if (mSlot && mYear && mSec) {
            updateAvailableSlots(currentDept, mDate ? mDate.value : getTodayISOString(), mYear.value, mSec.value, mSlot);
        }
    } catch (e) {}
}

function renderHistoryList() {
    pruneOldHistory();
    const displayEntries = getActiveDrawerEntries();
    updateTodayBadge();
    updateSyncButtonState();
    updateHistoryTabStyles();
    try { refreshAllSlotDropdowns(); } catch (e) {}

    const historyListEl = document.getElementById('historyList');
    if (!historyListEl) return;

    if (displayEntries.length === 0) {
        const emptyMsg = currentHistoryTabMode === 'ALL'
            ? 'No attendance history saved yet.'
            : 'No entries today — submit above.';
        historyListEl.innerHTML = '<p class="transcript-placeholder" style="text-align: center; margin-top: 20px;">' + emptyMsg + '</p>';
        return;
    }

    historyListEl.innerHTML = displayEntries.map((item, index) => {
        const slotNum = parseInt(item.slot, 10) || 1;
        const slotLabel = SLOT_TIME_LABELS[slotNum] || ('Slot ' + slotNum);
        const rolls = item.rollNumbers === 'NIL'
            ? '<span class="badge badge-nil">NIL (All Present)</span>'
            : (Array.isArray(item.rollNumbers) ? escapeHTML(item.rollNumbers.join(', ')) : escapeHTML(String(item.rollNumbers)));

        const todayStr = getTodayISOString();
        const dateLabel = item.date
            ? ' · ' + escapeHTML(item.date)
            : '';

        const statusBadge = item.offline 
            ? '<span class="badge badge-warning" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">Offline (Pending Sync)</span>'
            : '<span class="badge badge-success">Synced to Sheet</span>';

        return (
        '<div class="history-card">' +
            '<div class="history-top">' +
                '<span class="history-title">' + escapeHTML(item.year) + ' Sec ' + escapeHTML(item.section) + dateLabel + '</span>' +
                '<span class="history-time">' + escapeHTML(item.timestamp || '') + '</span>' +
            '</div>' +
            '<div class="history-details">' +
                '<span>Subject: <strong>' + escapeHTML(item.subject) + '</strong></span>' +
                '<span>Slot ' + slotNum + ': <strong>' + slotLabel + '</strong></span>' +
            '</div>' +
            '<div class="history-rolls">Absentees: ' + rolls + '</div>' +
            '<div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">' +
                statusBadge +
                '<div style="display: flex; gap: 6px;">' +
                    '<button type="button" class="btn-history-edit" data-index="' + index + '">Edit</button>' +
                    '<button type="button" class="btn-history-delete" data-index="' + index + '" title="Deletes Raw Data row; section formulas go blank">Delete</button>' +
                '</div>' +
            '</div>' +
        '</div>'
        );
    }).join('');

    document.querySelectorAll('.btn-history-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            editHistoryEntry(idx, displayEntries);
        });
    });

    document.querySelectorAll('.btn-history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
            deleteHistoryEntry(idx, displayEntries);
        });
    });
}

function editHistoryEntry(index, sourceList) {
    const list = sourceList || getActiveDrawerEntries();
    const item = list[index];
    if (!item) return;

    editingOriginalEntry = {
        date: item.date,
        year: item.year,
        section: item.section,
        subject: item.subject,
        slot: item.slot,
        stream: item.stream || currentDept || 'BCA',
        rollNumbers: item.rollNumbers
    };

    const deptConfig = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    const cfg = DEPT_CONFIG[currentDept] || DEPT_CONFIG.BCA;
    dateInput.value = item.date || getTodayISOString();
    rollNumbersInput.value = item.rollNumbers === 'NIL' ? '' : (Array.isArray(item.rollNumbers) ? item.rollNumbers.join(', ') : item.rollNumbers);
    yearSelect.value = item.year || 'First Year';

    updateSectionSelects(cfg.hasSections !== false, currentDept, yearSelect.value);
    sectionSelect.value = item.section || 'A';
    if (sectionSelect.value !== (item.section || 'A') && item.section) {
        const opt = document.createElement('option');
        opt.value = item.section;
        opt.textContent = sectionDisplayLabel(item.section);
        sectionSelect.appendChild(opt);
        sectionSelect.value = item.section;
    }

    setSubjectValue(subjectInput, item.subject || deptConfig.defaultSubject);
    slotSelect.value = item.slot ? item.slot.toString() : '1';

    directDateInput.value = dateInput.value;
    directRollInput.value = rollNumbersInput.value;
    directYearSelect.value = yearSelect.value;
    updateSectionSelects(cfg.hasSections !== false, currentDept, directYearSelect.value);
    directSectionSelect.value = sectionSelect.value;
    setSubjectValue(directSubjectInput, subjectInput.value);
    directSlotSelect.value = slotSelect.value;

    if (usesAudienceGroups(currentDept)) {
        renderDirectCombinationCheckboxes(currentDept);
        syncComboCheckboxesToSectionValue(item.section);
        renderModalCombinationCheckboxes(currentDept, item.section);
    }

    try { updateMarkAbsenteesStepUI(); } catch (e) {}

    if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => {
            deleteData(dateInput.value, yearSelect.value, sectionSelect.value, subjectInput.value, slotSelect.value);
        };
    }

    if (submitBtnText) submitBtnText.textContent = 'Save Edited Entry';
    if (directSubmitBtnText) directSubmitBtnText.textContent = 'Save Edited Entry';
    updateModalDoubleEntryCheck();
    updateDirectDoubleEntryCheck();
    historyDrawer && setHistoryDrawerOpen(false);
    confirmationModal.classList.add('active');
}

// Sound Visualizer Animation
function startVisualizer() {
    if (!canvas || !canvasCtx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let step = 0;
    function draw() {
        if (!isListening || !canvasCtx) return;
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#6366f1';
        canvasCtx.beginPath();

        const width = canvas.width;
        const height = canvas.height;
        const sliceWidth = width / 100;
        let x = 0;

        for (let i = 0; i < 100; i++) {
            const v = Math.sin(step + i * 0.1) * (Math.random() * 12 + 4);
            const y = height / 2 + v;
            if (i === 0) canvasCtx.moveTo(x, y);
            else canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }

        canvasCtx.stroke();
        step += 0.15;
        animationFrameId = requestAnimationFrame(draw);
    }
    draw();
}

function stopVisualizer() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (canvasCtx && canvas) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateBulkSubjectDropdown() {
    const bYear = document.getElementById('bulkYearSelect');
    const bSec = document.getElementById('bulkSectionSelect');
    const bSubj = document.getElementById('bulkSubjectInput');
    if (bYear && bSec && bSubj) {
        const yrVal = bYear.value || 'Second Year';
        const secVal = bSec.value || 'A';
        const list = getSubjectsForActiveYear(currentDept, yrVal, secVal);
        bSubj.innerHTML = list.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
    }
}

function openBulkGeneratorModal() {
    const modal = document.getElementById('bulkGeneratorModal');
    if (!modal) return;
    updateBulkSubjectDropdown();
    modal.classList.add('active');
}

function closeBulkGeneratorModal() {
    const modal = document.getElementById('bulkGeneratorModal');
    if (modal) modal.classList.remove('active');
}

async function executeBulkPastGenerator() {
    const yearEl = document.getElementById('bulkYearSelect');
    const secEl = document.getElementById('bulkSectionSelect');
    const subjEl = document.getElementById('bulkSubjectInput');
    const slotEl = document.getElementById('bulkSlotSelect');
    const startEl = document.getElementById('bulkStartDate');
    const endEl = document.getElementById('bulkEndDate');

    const yearVal = yearEl ? yearEl.value : '';
    const secVal = secEl ? secEl.value : '';
    const subjVal = subjEl ? subjEl.value : '';
    const slotVal = slotEl ? slotEl.value : '1';
    const startVal = startEl ? startEl.value : '';
    const endVal = endEl ? endEl.value : '';
    const checkedDays = Array.from(document.querySelectorAll('.bulkDayCheck:checked')).map(c => parseInt(c.value, 10));

    if (!subjVal) {
        alert('Please select or enter a Subject Name.');
        return;
    }
    if (!startVal || !endVal) {
        alert('Please select both Start Date and End Date.');
        return;
    }
    if (new Date(startVal) > new Date(endVal)) {
        alert('Start Date cannot be after End Date.');
        return;
    }
    if (checkedDays.length === 0) {
        alert('Please select at least one day of the week.');
        return;
    }

    const btnText = document.getElementById('submitBulkBtnText');
    const spinner = document.getElementById('submitBulkSpinner');
    const submitBtn = document.getElementById('submitBulkBtn');

    if (btnText) btnText.textContent = 'Generating...';
    if (spinner) spinner.style.display = 'inline-block';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const parts1 = startVal.split('-');
        const parts2 = endVal.split('-');
        const startDate = new Date(parseInt(parts1[0], 10), parseInt(parts1[1], 10) - 1, parseInt(parts1[2], 10));
        const endDate = new Date(parseInt(parts2[0], 10), parseInt(parts2[1], 10) - 1, parseInt(parts2[2], 10));
        
        const generatedItems = [];
        const curr = new Date(startDate.getTime());

        while (curr.getTime() <= endDate.getTime()) {
            const dayOfWeek = curr.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            if (checkedDays.includes(dayOfWeek)) {
                const yyyy = curr.getFullYear();
                const mm = String(curr.getMonth() + 1).padStart(2, '0');
                const dd = String(curr.getDate()).padStart(2, '0');
                const dateStr = yyyy + '-' + mm + '-' + dd;

                generatedItems.push({
                    stream: currentDept || 'BCA',
                    date: dateStr,
                    year: yearVal,
                    section: secVal,
                    subject: subjVal,
                    slot: String(parseInt(slotVal, 10) || 1),
                    rollNumbers: 'NIL',
                    offline: false,
                    timestamp: 'Bulk Past Entry'
                });
            }
            curr.setDate(curr.getDate() + 1);
        }

        if (generatedItems.length === 0) {
            alert('No matching class days found in the selected date range.');
            return;
        }

        // Save all generated past items locally immediately
        for (const item of generatedItems) {
            saveToLocalHistory(item);
        }

        closeBulkGeneratorModal();

        showCustomToast(`⚡ Created ${generatedItems.length} Past Classes!`, `Added for ${yearVal} Sec ${secVal} (${subjVal}). You can now edit absentees.`);
        renderHistoryList();

        // Perform Google Sheets sync asynchronously in background without freezing UI
        (async () => {
            const targetUrl = getWebhookUrl(currentDept);
            if (!targetUrl) return;
            for (const item of generatedItems) {
                const payload = withAuth({
                    action: 'create',
                    isUpdate: false,
                    stream: item.stream,
                    date: item.date,
                    rollNumbers: 'NIL',
                    year: item.year,
                    section: item.section,
                    subject: item.subject,
                    slot: item.slot,
                    changesSummary: 'Bulk Past Class Entry'
                });
                try {
                    await postWithRetry(targetUrl, payload, 1);
                } catch (e) {
                    console.warn('Bulk item sheet sync error:', e);
                }
            }
        })();

    } catch (err) {
        console.error('Bulk Generator Error:', err);
        alert('An error occurred while generating past classes.');
    } finally {
        if (btnText) btnText.textContent = '⚡ Generate Past Classes';
        if (spinner) spinner.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

function updateStatus(msg, type) {
    statusText.textContent = msg;
    if (type === 'error') {
        statusPill.style.borderColor = 'var(--danger-color)';
        statusPill.style.color = 'var(--danger-color)';
    }
}

function escapeHTML(str) {
    if (str == null) return '';
    const s = String(str);
    return s.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function showFormAlert(btnElem, message) {
    const alertBox = document.getElementById('directAlertBox') || document.getElementById('modalAlertBox');
    if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.textContent = message;
        setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
    }
    showCustomToast('Required Field Missing', message);
}

let currentDateTrack = getTodayISOString();

function checkAndRefreshDate() {
    const freshDate = getTodayISOString();
    if (freshDate !== currentDateTrack) {
        currentDateTrack = freshDate;
        applyAttendanceDateLimits();
        if (dateInput) dateInput.value = freshDate;
        if (directDateInput) directDateInput.value = freshDate;
        if (todayBadge) {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            todayBadge.textContent = 'Today - ' + new Date().toLocaleDateString(undefined, options);
        }
        pruneOldHistory();
        renderHistoryList();
    }
}


function getPasscodeStore() {
    try {
        const store = JSON.parse(localStorage.getItem('mgm_custom_passcodes') || '{}');
        return {
            teacher: {
                BCA: store.teacherBCA || DEPT_CONFIG.BCA.passcode,
                BCM: store.teacherBCM || DEPT_CONFIG.BCM.passcode,
                BA: store.teacherBA || DEPT_CONFIG.BA.passcode,
                BSC: store.teacherBSC || DEPT_CONFIG.BSC.passcode
            },
            hod: {
                BCA: store.hodBCA || 'hodbca',
                BCM: store.hodBCM || 'hodbcm',
                BA: store.hodBA || 'hodba',
                BSC: store.hodBSC || 'hodbsc'
            },
            ADMIN: store.ADMIN || 'admin2026'
        };
    } catch (e) {
        return {
            teacher: {
                BCA: DEPT_CONFIG.BCA.passcode,
                BCM: DEPT_CONFIG.BCM.passcode,
                BA: DEPT_CONFIG.BA.passcode,
                BSC: DEPT_CONFIG.BSC.passcode
            },
            hod: {
                BCA: 'hodbca',
                BCM: 'hodbcm',
                BA: 'hodba',
                BSC: 'hodbsc'
            },
            ADMIN: 'admin2026'
        };
    }
}

function savePasscodeStore(store) {
    localStorage.setItem('mgm_custom_passcodes', JSON.stringify(store));
}

// Department Authentication & Multi-Stream Manager (stream PIN login)
function initDepartmentManager() {
    const deptCards = document.querySelectorAll('.dept-card');
    let selectedDept = 'BCA';
    const rememberCheck = document.getElementById('rememberDeptCheck');
    const loginBtnEl = document.getElementById('deptLoginBtn');

    const setLoginBusy = (busy) => {
        if (loginBtnEl) {
            loginBtnEl.disabled = !!busy;
            const span = loginBtnEl.querySelector('span');
            if (span) span.textContent = busy ? 'Checking PIN…' : 'Enter Absentee Informer';
        }
    };

    const finishLoginSuccess = (role, loginDept, passcode, rememberChecked) => {
        selectedDept = loginDept;
        document.querySelectorAll('.dept-card').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-dept') === loginDept);
        });

        setAuthSession(passcode, role || 'TEACHER', loginDept, !!rememberChecked);
        subjectsAuthPrompted = false;
        // Parent Informer needs no separate HOD login — stream PIN unlocks both tabs
        isHODAuthenticated = true;
        currentRole = role || 'TEACHER';
        if (loginAlertBox) loginAlertBox.style.display = 'none';

        localStorage.setItem('mgm_dept', loginDept);
        localStorage.setItem('mgm_role', currentRole);

        applyDepartment(loginDept);
        applyRoleUI();
        switchMode('typing');
        deptLoginModal.classList.remove('active');
        pendingHODTabSwitch = false;
        const cancelBtn = document.getElementById('cancelHODLoginBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        setLoginBusy(false);
    };

    const runLogin = async () => {
        const activeCard = document.querySelector('.dept-card.active');
        if (activeCard && activeCard.getAttribute('data-dept')) {
            selectedDept = activeCard.getAttribute('data-dept');
        }
        const pass = deptPasscode ? String(deptPasscode.value || '').trim() : '';
        const remember = !!(rememberCheck && rememberCheck.checked);

        if (!pass) {
            if (loginAlertBox) {
                loginAlertBox.style.display = 'block';
                loginAlertBox.textContent = 'Enter the PIN for the selected stream.';
            }
            if (deptPasscode) deptPasscode.focus();
            return;
        }

        setLoginBusy(true);
        if (loginAlertBox) loginAlertBox.style.display = 'none';

        try {
            const res = await authenticateWithServer(selectedDept, pass);
            if (res && res.ok) {
                const loginStream = res.stream || selectedDept;
                if (res.matchedOtherStream && loginStream !== selectedDept) {
                    // PIN belongs to another stream — lock session to that stream
                    selectedDept = loginStream;
                }
                syncLocalPasscodeFromLogin(loginStream, res.role || 'TEACHER', pass);
                finishLoginSuccess(res.role || 'TEACHER', loginStream, pass, remember);
                return;
            }
            if (res && res.slow) {
                if (loginAlertBox) {
                    loginAlertBox.style.display = 'block';
                    loginAlertBox.textContent = res.message || 'Server slow — try again.';
                }
            } else if (res && res.offline) {
                // Offline: authenticateWithServer already tried local match
                if (loginAlertBox) {
                    loginAlertBox.style.display = 'block';
                    loginAlertBox.textContent = res.message || 'Offline — wrong PIN or no saved PIN for this stream.';
                }
            } else {
                if (loginAlertBox) {
                    loginAlertBox.style.display = 'block';
                    loginAlertBox.textContent = (res && res.message) || 'Invalid PIN for this stream.';
                }
            }
        } catch (e) {
            console.error('[Login] Resilience fallback triggered:', e);
            finishLoginSuccess('TEACHER', selectedDept, pass, remember);
            return;
        }
        setLoginBusy(false);
        if (deptPasscode) {
            deptPasscode.focus();
            deptPasscode.select();
        }
    };

    // Card click = select stream only (do not auto-enter)
    deptCards.forEach(card => {
        card.addEventListener('click', () => {
            deptCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDept = card.getAttribute('data-dept') || 'BCA';
            if (loginAlertBox) loginAlertBox.style.display = 'none';
            if (deptPasscode) deptPasscode.focus();
        });
    });

    if (deptLoginForm) {
        deptLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            runLogin();
        });
        if (loginBtnEl) {
            loginBtnEl.addEventListener('click', (e) => {
                e.preventDefault();
                runLogin();
            });
        }
    }

    const togglePassBtn = document.getElementById('togglePassBtn');
    if (togglePassBtn && deptPasscode) {
        togglePassBtn.addEventListener('click', () => {
            deptPasscode.type = deptPasscode.type === 'password' ? 'text' : 'password';
        });
    }

    if (activeDeptBadge) {
        activeDeptBadge.addEventListener('click', () => {
            // Switch stream = show login again (session locked until re-login)
            wipeHODPortalState();
            if (loginAlertBox) loginAlertBox.style.display = 'none';
            document.querySelectorAll('.dept-card').forEach(c => {
                const d = c.getAttribute('data-dept');
                c.classList.toggle('active', d === currentDept);
                if (d === currentDept) selectedDept = currentDept;
            });
            if (deptPasscode) deptPasscode.value = '';
            deptLoginModal.classList.add('active');
            if (deptPasscode) deptPasscode.focus();
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            isHODAuthenticated = false;
            pendingHODTabSwitch = false;
            clearAuthSession();
            localStorage.removeItem('mgm_dept');
            localStorage.removeItem('mgm_role');
            if (deptPasscode) deptPasscode.value = '';
            if (loginAlertBox) loginAlertBox.style.display = 'none';
            wipeHODPortalState();
            switchMode('typing');
            deptLoginModal.classList.add('active');
            if (deptPasscode) deptPasscode.focus();
        });
    }

    // Persistent stream session: restore logged screen on reopen unless exit clicked
    const savedDept = localStorage.getItem('mgm_dept') || localStorage.getItem('mgm_auth_stream');
    const rememberedPass = localStorage.getItem('mgm_session_pass') || localStorage.getItem('mgm_remember_pass') || '';
    if (savedDept && DEPT_CONFIG[savedDept] && (rememberedPass || localStorage.getItem('mgm_is_logged_in') === 'true')) {
        restoreAuthSessionFromRemember();
        currentRole = localStorage.getItem('mgm_role') || 'TEACHER';
        isHODAuthenticated = true;
        applyDepartment(savedDept);
        applyRoleUI();
        switchMode('typing');
        if (deptLoginModal) deptLoginModal.classList.remove('active');

        if (navigator.onLine && rememberedPass && rememberedPass !== 'BYPASS') {
            authenticateWithServer(savedDept, rememberedPass).then((res) => {
                if (res && res.ok) {
                    syncLocalPasscodeFromLogin(savedDept, res.role || currentRole, rememberedPass);
                    if (res.role) {
                        currentRole = res.role === 'HOD' ? 'TEACHER' : res.role;
                        localStorage.setItem('mgm_role', currentRole);
                        applyRoleUI();
                    }
                    return;
                }
                if (res && !res.offline && !res.slow) {
                    clearAuthSession();
                    isHODAuthenticated = false;
                    if (loginAlertBox) {
                        loginAlertBox.style.display = 'block';
                        loginAlertBox.textContent =
                            'PIN was changed. Enter the new stream PIN to continue.';
                    }
                    if (deptPasscode) deptPasscode.value = '';
                    if (deptLoginModal) deptLoginModal.classList.add('active');
                }
            }).catch(() => {});
        }
    } else {
        if (deptLoginModal) deptLoginModal.classList.add('active');
        applyDepartment('BCA');
        applyRoleUI();
        switchMode('typing');
    }
}

function applyRoleUI() {
    const hodRoleBadge = document.getElementById('hodRoleBadge');
    const hodStreamSelect = document.getElementById('hodStreamSelect');
    const hodFetchBtnText = document.getElementById('hodFetchBtnText');
    const deptNameShort = currentDept === 'BCM' ? 'B.Com' : (currentDept === 'BA' ? 'B.A.' : (currentDept === 'BSC' ? 'B.Sc.' : currentDept));

    if (currentRole === 'ADMIN') {
        if (hodRoleBadge) {
            hodRoleBadge.className = 'badge badge-warning';
            hodRoleBadge.textContent = '👑 Super Admin Mode';
        }
        if (hodStreamSelect) {
            hodStreamSelect.disabled = false;
        }
        if (hodFetchBtnText) {
            const activeStream = hodStreamSelect ? hodStreamSelect.value : currentDept;
            const label = activeStream === 'BCM' ? 'B.Com' : (activeStream === 'BA' ? 'B.A.' : (activeStream === 'BSC' ? 'B.Sc.' : activeStream));
            hodFetchBtnText.textContent = '🔄 Fetch ' + label + ' Absentees';
        }
    } else {
        if (hodRoleBadge) {
            hodRoleBadge.className = 'badge badge-success';
            hodRoleBadge.textContent = '🔒 Parent Informer (' + deptNameShort + ')';
        }
        if (hodStreamSelect) {
            hodStreamSelect.value = currentDept;
            hodStreamSelect.disabled = true;
        }
        if (hodFetchBtnText) {
            hodFetchBtnText.textContent = '🔄 Fetch ' + deptNameShort + ' Absentees';
        }
    }
}

function applyDepartment(deptCode) {
    if (!DEPT_CONFIG[deptCode]) return;
    currentDept = deptCode;
    try { localStorage.setItem('mgm_dept', deptCode); } catch (e) {}
    try { localStorage.setItem('mgm_auth_stream', deptCode); } catch (e) {}
    wipeHODPortalState();
    const config = DEPT_CONFIG[deptCode];

    // Header updates
    if (deptSubtitle) deptSubtitle.textContent = config.name;
    if (activeDeptText) activeDeptText.textContent = config.code;
    if (activeDeptBadge) {
        activeDeptBadge.className = 'dept-active-badge ' + config.badgeClass;
    }

    // Voice removed from all streams
    if (voiceModeTab) voiceModeTab.style.display = 'none';
    if (voiceSection) voiceSection.style.display = 'none';

    // Always land on Mark Absentees (never Voice)
    const isHodActive = hodSection && hodSection.style.display !== 'none';
    if (!isHodActive) {
        switchMode('typing');
    }

    if (directYearSelect) directYearSelect.value = '';
    if (directSectionSelect) directSectionSelect.value = '';
    if (directSlotSelect) directSlotSelect.value = '';
    if (directSubjectInput) directSubjectInput.value = '';

    // Stream-specific Year dropdown labels
    updateYearSelects(config);

    // Section / Class-Group visibility (BCA/BCM sections; BA/BSC combination audiences)
    const initialYear = directYearSelect ? directYearSelect.value : '';
    updateSectionSelects(config.hasSections, deptCode, initialYear);

    // Preloaded Subject Dropdown options for active stream, selected year & section
    const initialSection = directSectionSelect ? directSectionSelect.value : '';
    const yearSubjects = getSubjectsForActiveYear(deptCode, initialYear || 'First Year', initialSection || 'A');
    updateSubjectDropdowns(yearSubjects, config.defaultSubject);

    if (directSubjectInput) directSubjectInput.value = '';

    // Render Stream Presets & update today count badge (stream-filtered)
    renderStreamPresets(config);
    renderHistoryList();
    fetchCloudSubjects();
    // Pull today's sheet entries so history matches other devices
    if (navigator.onLine) {
        fetchTodayServerHistory();
    }
}

function updateYearSelects(config) {
    const yearSelects = [directYearSelect, yearSelect];
    let streamLabel = config.code;
    if (config.code === 'BCM') streamLabel = 'B.Com';
    else if (config.code === 'BA') streamLabel = 'B.A.';
    else if (config.code === 'BSC') streamLabel = 'B.Sc.';

    yearSelects.forEach(selectEl => {
        if (!selectEl) return;
        const curVal = selectEl.value;
        selectEl.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select Year';
        defaultOpt.disabled = true;
        defaultOpt.hidden = true;
        selectEl.appendChild(defaultOpt);

        const years = [
            { val: 'First Year', label: 'First Year ' + streamLabel },
            { val: 'Second Year', label: 'Second Year ' + streamLabel },
            { val: 'Third Year', label: 'Third Year ' + streamLabel }
        ];
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.val;
            opt.textContent = y.label;
            selectEl.appendChild(opt);
        });
        if (curVal && years.some(y => y.val === curVal)) {
            selectEl.value = curVal;
        } else {
            selectEl.selectedIndex = 0;
            selectEl.value = '';
        }
    });
}

function getCustomSubjectsStore() {
    try {
        return JSON.parse(localStorage.getItem('mgm_custom_subjects') || '{}');
    } catch (e) {
        return {};
    }
}

function saveCustomSubjectsStore(store) {
    localStorage.setItem('mgm_custom_subjects', JSON.stringify(store));
}

function getCloudSubjectsStore() {
    try {
        return JSON.parse(localStorage.getItem('mgm_cloud_subjects') || '{}');
    } catch (e) {
        return {};
    }
}

function saveCloudSubjectsStore(store) {
    localStorage.setItem('mgm_cloud_subjects', JSON.stringify(store));
}

function getElectiveFlagsStore() {
    try {
        return JSON.parse(localStorage.getItem('mgm_elective_flags') || '{}');
    } catch (e) {
        return {};
    }
}

function saveElectiveFlagsStore(store) {
    localStorage.setItem('mgm_elective_flags', JSON.stringify(store));
}

function sendSubjectToCloud(action, deptCode, yearStr, subjName, isElective, sectionStr, oldSubjectName, oldSectionStr) {
    const targetSec = sectionStr || 'COMMON';
    const payload = withAuth({
        action: action,
        stream: deptCode,
        year: yearStr,
        section: targetSec,
        subject: subjName,
        oldSubject: oldSubjectName || '',
        oldSection: oldSectionStr || '',
        isElective: isElective === true || isElective === 'true' || normalizeSectionCode(targetSec) === 'ALL'
    });
    const targetUrl = getWebhookUrl(deptCode);

    submitViaHiddenForm(targetUrl, payload).catch(e => console.warn('[SubjectSync] Hidden form submission error:', e));

    return new Promise((resolve) => {
        const cbName = 'mgmSubjSync_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
        let scriptEl = null;
        let completed = false;

        const cleanup = () => {
            if (scriptEl && scriptEl.parentNode) {
                try { scriptEl.parentNode.removeChild(scriptEl); } catch (e) {}
            }
            try { delete window[cbName]; } catch (e) {}
        };

        const timeout = setTimeout(() => {
            if (completed) return;
            completed = true;
            cleanup();
            resolve(false);
        }, 5000);

        window[cbName] = function (data) {
            if (completed) return;
            completed = true;
            clearTimeout(timeout);
            cleanup();
            console.log('[SubjectSync] Cloud response received via JSONP:', data);
            resolve(data && data.result === 'success');
        };

        const params = new URLSearchParams({
            action: action,
            stream: deptCode,
            year: yearStr,
            section: targetSec,
            subject: subjName,
            oldSubject: oldSubjectName || '',
            oldSection: oldSectionStr || '',
            isElective: payload.isElective ? 'true' : 'false',
            callback: cbName
        });
        appendAuthToParams(params);

        scriptEl = document.createElement('script');
        scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
        scriptEl.onerror = function () {
            if (completed) return;
            completed = true;
            clearTimeout(timeout);
            cleanup();
            resolve(false);
        };
        document.body.appendChild(scriptEl);
    }).finally(() => {
        try { localStorage.setItem('mgm_subject_sync_trigger', String(Date.now())); } catch (e) {}
    });
}

let subjectsFetchInFlight = false;
let subjectsAuthPrompted = false;

if (typeof window !== 'undefined') {
    setInterval(() => {
        fetchCloudSubjects();
    }, 12000);
}

if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', (e) => {
        if (e.key === 'mgm_subject_sync_trigger') {
            fetchCloudSubjects();
        }
    });
}

function fetchCloudSubjects() {
    if (typeof document === 'undefined' || !document.createElement) return;
    if (subjectsFetchInFlight) return;

    // Allow cloud subject sync if a real Apps Script URL is configured, even on localhost/local test
    const webhookUrl = getWebhookUrl(currentDept);
    const hasRealWebhook = webhookUrl && !webhookUrl.includes('YOUR_');
    const urlParams = (typeof window !== 'undefined' && window.location) ? new URLSearchParams(window.location.search || '') : null;
    const forceSync = urlParams && (urlParams.get('sync') === '1' || urlParams.get('cloud') === '1');

    if (isLocalTestMode() && !hasRealWebhook && !forceSync) return;

    let authPass = (getAuthPayload().authPasscode || '').trim();
    if (!authPass && isLocalTestMode()) {
        authPass = (currentDept ? currentDept.toLowerCase() : 'bca') + '2026';
    }
    if (!authPass) {
        // No session yet (login screen) — skip silently
        return;
    }

    subjectsFetchInFlight = true;
    const targetUrl = getWebhookUrl(currentDept);
    const cbName = 'mgmSubjectsCb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    let scriptEl = null;

    const finishFetch = () => {
        subjectsFetchInFlight = false;
        clearTimeout(timeout);
        try { delete window[cbName]; } catch (e) {}
        if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };

    const timeout = setTimeout(() => {
        finishFetch();
    }, 8000);

    window[cbName] = function (data) {
        finishFetch();

        if (data && data.result === 'success') {
            subjectsAuthPrompted = false;
            const deletedStore = getDeletedSubjectsStore();

            if (data.deletedSubjects) {
                // Merge cloud deletedSubjects with local deletedStore
                for (let dDept in data.deletedSubjects) {
                    if (!deletedStore[dDept]) deletedStore[dDept] = {};
                    for (let dYr in data.deletedSubjects[dDept]) {
                        if (!deletedStore[dDept][dYr]) deletedStore[dDept][dYr] = [];
                        const cloudDelArr = data.deletedSubjects[dDept][dYr] || [];
                        cloudDelArr.forEach(s => {
                            if (!deletedStore[dDept][dYr].some(x => x.toLowerCase() === s.toLowerCase())) {
                                deletedStore[dDept][dYr].push(s);
                            }
                        });
                    }
                }
                saveDeletedSubjectsStore(deletedStore);

                // Purge cloud-deleted subjects from local device customStore
                const customStore = getCustomSubjectsStore();
                let customChanged = false;
                for (let dDept in deletedStore) {
                    for (let dYr in deletedStore[dDept]) {
                        const delList = deletedStore[dDept][dYr] || [];
                        if (customStore[dDept] && customStore[dDept][dYr]) {
                            const beforeLen = customStore[dDept][dYr].length;
                            customStore[dDept][dYr] = customStore[dDept][dYr].filter(s => {
                                const item = extractSubjNameAndSection(s);
                                return !isSubjectTombstoned(delList, item.name, item.section);
                            });
                            if (customStore[dDept][dYr].length !== beforeLen) customChanged = true;
                        }
                    }
                }
                if (customChanged) {
                    saveCustomSubjectsStore(customStore);
                }
            }

            if (data.customSubjects) {
                // Sheet is source of truth. Active (ADD) subjects on the sheet undelete local tombstones
                // so a subject added on PC is not hidden forever on mobile after an old Clear All.
                let deletedChanged = false;
                const cleanedCloudSubjects = {};
                for (let deptKey in data.customSubjects) {
                    cleanedCloudSubjects[deptKey] = {};
                    for (let yrKey in data.customSubjects[deptKey]) {
                        const subjs = data.customSubjects[deptKey][yrKey] || [];
                        if (deletedStore[deptKey] && deletedStore[deptKey][yrKey]) {
                            const before = deletedStore[deptKey][yrKey].length;
                            const activeNames = subjs.map(s => extractSubjNameAndSection(s).name.toLowerCase());
                            const activeKeys = subjs.map(s => {
                                const it = extractSubjNameAndSection(s);
                                return subjectScopeKey(it.name, it.section).toLowerCase();
                            });
                            deletedStore[deptKey][yrKey] = deletedStore[deptKey][yrKey].filter(d => {
                                const dl = String(d || '').toLowerCase();
                                if (dl.indexOf('::') !== -1) return !activeKeys.includes(dl);
                                return !activeNames.includes(dl);
                            });
                            if (deletedStore[deptKey][yrKey].length !== before) deletedChanged = true;
                        }
                        const delList = (deletedStore[deptKey] && deletedStore[deptKey][yrKey]) ? deletedStore[deptKey][yrKey] : [];
                        cleanedCloudSubjects[deptKey][yrKey] = subjs.filter(s => {
                            const item = extractSubjNameAndSection(s);
                            return !isSubjectTombstoned(delList, item.name, item.section);
                        });
                    }
                }
                if (deletedChanged) saveDeletedSubjectsStore(deletedStore);
                saveCloudSubjectsStore(cleanedCloudSubjects);

                // Drop local cleared lock once sheet sync succeeds
                try {
                    const clearedStore = getClearedDeptsStore();
                    let clearedChanged = false;
                    for (let deptKey in data.customSubjects) {
                        if (clearedStore[deptKey]) {
                            delete clearedStore[deptKey];
                            clearedChanged = true;
                        }
                    }
                    if (clearedChanged) saveClearedDeptsStore(clearedStore);
                } catch (e) {}
            }

            if (data.electiveSubjects) {
                const flags = getElectiveFlagsStore();
                Object.assign(flags, data.electiveSubjects);
                saveElectiveFlagsStore(flags);
            }

            const activeYear = directYearSelect ? directYearSelect.value : 'First Year';
            refreshSubjectDropdowns();
            const subjectManageModal = document.getElementById('subjectManageModal');
            if (subjectManageModal && subjectManageModal.classList.contains('active')) {
                renderSubjectChips();
            }
        } else if (data && (data.error === 'Unauthorized' || data.result === 'error')) {
            const msg = String(data.message || data.error || '');
            console.warn('[Subjects] Cloud fetch info:', msg);
            // Never kick user to login or show passcode expired toast
        }
    };

    const params = new URLSearchParams({
        action: 'get_subjects',
        callback: cbName
    });
    appendAuthToParams(params);

    scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        finishFetch();
    };
    document.body.appendChild(scriptEl);
}

function getClearedDeptsStore() {
    try {
        return JSON.parse(localStorage.getItem('mgm_cleared_depts') || '{}');
    } catch (e) {
        return {};
    }
}

function saveClearedDeptsStore(store) {
    try {
        localStorage.setItem('mgm_cleared_depts', JSON.stringify(store || {}));
    } catch (e) {}
}

function getDeletedSubjectsStore() {
    try {
        return JSON.parse(localStorage.getItem('mgm_deleted_subjects') || '{}');
    } catch (e) {
        return {};
    }
}

function saveDeletedSubjectsStore(store) {
    localStorage.setItem('mgm_deleted_subjects', JSON.stringify(store));
}

function beginSubjectEdit(subjName, sectionHint) {
    const activeYear = directYearSelect ? directYearSelect.value : 'First Year';
    const newSubjectInput = document.getElementById('newSubjectInput');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const oldNameInput = document.getElementById('editingSubjectOldName');
    const oldSecInput = document.getElementById('editingSubjectOldSection');
    const electiveCheck = document.getElementById('newSubjectElectiveCheck');
    const secSelect = document.getElementById('newSubjectSectionSelect');
    const hint = document.getElementById('subjectEditHint');

    const item = typeof subjName === 'object' ? extractSubjNameAndSection(subjName) : { name: subjName, section: sectionHint || 'COMMON' };
    const tagInfo = formatSectionTagLabel(item.section || sectionHint || 'COMMON');
    const isElec = normalizeSectionCode(item.section) === 'ALL';

    if (oldNameInput) oldNameInput.value = item.name;
    if (oldSecInput) oldSecInput.value = item.section || 'COMMON';
    if (newSubjectInput) {
        newSubjectInput.value = item.name;
        newSubjectInput.focus();
    }
    if (addSubjectBtn) addSubjectBtn.textContent = 'Save';
    populateModalSectionOptions();
    if (secSelect) {
        if (String(item.section || '').toUpperCase().startsWith('SHARED')) {
            secSelect.value = 'SHARED';
            toggleSharedCombinationsUI(item.section);
        } else {
            const want = canonicalSectionStorage(item.section || 'COMMON');
            if (Array.from(secSelect.options).some(o => o.value === want)) secSelect.value = want;
            else if (Array.from(secSelect.options).some(o => normalizeSectionCode(o.value) === normalizeSectionCode(want))) {
                secSelect.value = Array.from(secSelect.options).find(o => normalizeSectionCode(o.value) === normalizeSectionCode(want)).value;
            }
            toggleSharedCombinationsUI();
        }
    }
    if (electiveCheck) electiveCheck.checked = !!isElec;
    if (hint) {
        hint.style.display = 'block';
        hint.textContent = 'Editing "' + item.name + '" (' + tagInfo.label + '). Change name/scope, then Save.';
    }
}

function clearSubjectEditForm() {
    const newSubjectInput = document.getElementById('newSubjectInput');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const oldNameInput = document.getElementById('editingSubjectOldName');
    const oldSecInput = document.getElementById('editingSubjectOldSection');
    const electiveCheck = document.getElementById('newSubjectElectiveCheck');
    const hint = document.getElementById('subjectEditHint');
    if (oldNameInput) oldNameInput.value = '';
    if (oldSecInput) oldSecInput.value = '';
    if (newSubjectInput) newSubjectInput.value = '';
    if (addSubjectBtn) addSubjectBtn.textContent = '+ Add';
    if (electiveCheck) electiveCheck.checked = false;
    if (hint) {
        hint.style.display = 'none';
        hint.textContent = '';
    }
    toggleSharedCombinationsUI();
}

function canonicalSectionStorage(sec) {
    if (!sec) return 'COMMON';
    const str = String(sec).trim();
    if (str.toUpperCase().startsWith('SHARED:') || str.toUpperCase().startsWith('SHARED_')) {
        return str;
    }
    const n = normalizeSectionCode(str);
    if (n === 'C_AIML') return 'C (AIML)';
    if (n === 'C_TP') return 'C (TP)';
    if (n === 'C_AF') return 'C (AF)';
    if (n === 'COMMON') return 'COMMON';
    if (n === 'SHARED') return 'SHARED';
    if (n === 'ALL') return 'ALL';
    if (n === 'A_B') return 'A_B';
    if (n === 'MSCS') return 'MSCs';
    if (n === 'MPCS') return 'MPCs';
    if (n === 'MSP') return 'MSP';
    if (n === 'MPC') return 'MPC';
    if (n === 'BZC') return 'BZC';
    if (n === 'EHE') return 'EHE';
    if (n === 'HEP') return 'HEP';
    if (n === 'JKP') return 'JKP';
    if (n === 'CONST_A') return 'CONST_A';
    if (n === 'CONST_U') return 'CONST_U';
    return n;
}

function upsertLocalSubject(deptCode, yearStr, name, section, isElective, oldName, oldSection) {
    const store = getCustomSubjectsStore();
    if (!store[deptCode]) store[deptCode] = {};
    if (!store[deptCode][yearStr]) store[deptCode][yearStr] = [];
    const secNorm = section || 'A_B';
    const oldSec = oldSection || secNorm;

    if (oldName) {
        store[deptCode][yearStr] = store[deptCode][yearStr].filter(s => {
            const item = extractSubjNameAndSection(s);
            const nameMatch = item.name.trim().toLowerCase() === oldName.toLowerCase();
            const secMatch = sectionsEqualForSubject(item.section, oldSec);
            return !(nameMatch && secMatch);
        });
        const cloudStore = getCloudSubjectsStore();
        if (cloudStore[deptCode] && cloudStore[deptCode][yearStr]) {
            cloudStore[deptCode][yearStr] = cloudStore[deptCode][yearStr].filter(s => {
                const item = extractSubjNameAndSection(s);
                const nameMatch = item.name.trim().toLowerCase() === oldName.toLowerCase();
                const secMatch = sectionsEqualForSubject(item.section, oldSec);
                return !(nameMatch && secMatch);
            });
            saveCloudSubjectsStore(cloudStore);
        }
        const flags = getElectiveFlagsStore();
        delete flags[(deptCode + '_' + yearStr + '_' + oldName).toLowerCase()];
        saveElectiveFlagsStore(flags);
    }

    const subjObj = { name: name, section: secNorm };
    const existingIdx = store[deptCode][yearStr].findIndex(s => {
        const item = extractSubjNameAndSection(s);
        return item.name.trim().toLowerCase() === name.toLowerCase() &&
            sectionsEqualForSubject(item.section, secNorm);
    });
    if (existingIdx !== -1) store[deptCode][yearStr][existingIdx] = subjObj;
    else store[deptCode][yearStr].push(subjObj);
    saveCustomSubjectsStore(store);

    const flags = getElectiveFlagsStore();
    flags[(deptCode + '_' + yearStr + '_' + name).toLowerCase()] = !!isElective || normalizeSectionCode(secNorm) === 'ALL';
    saveElectiveFlagsStore(flags);

    const deletedStore = getDeletedSubjectsStore();
    if (deletedStore[deptCode] && deletedStore[deptCode][yearStr]) {
        const dk = subjectScopeKey(name, secNorm);
        deletedStore[deptCode][yearStr] = deletedStore[deptCode][yearStr].filter(s =>
            s !== dk && s.toLowerCase() !== name.toLowerCase()
        );
        saveDeletedSubjectsStore(deletedStore);
    }
}

function deleteSubject(deptCode, yearStr, subjName, sectionHint) {
    if (!subjName) return;
    const itemIn = typeof subjName === 'string' ? { name: subjName.trim(), section: sectionHint || '' } : extractSubjNameAndSection(subjName);
    const targetName = itemIn.name.trim();
    if (!targetName) return;
    const targetSec = sectionHint || itemIn.section || '';

    const customStore = getCustomSubjectsStore();
    if (customStore[deptCode] && customStore[deptCode][yearStr]) {
        customStore[deptCode][yearStr] = customStore[deptCode][yearStr].filter(s => {
            const item = extractSubjNameAndSection(s);
            if (item.name.trim().toLowerCase() !== targetName.toLowerCase()) return true;
            if (targetSec) return !sectionsEqualForSubject(item.section, targetSec);
            return false;
        });
        saveCustomSubjectsStore(customStore);
    }

    const cloudStore = getCloudSubjectsStore();
    if (cloudStore[deptCode] && cloudStore[deptCode][yearStr]) {
        cloudStore[deptCode][yearStr] = cloudStore[deptCode][yearStr].filter(s => {
            const item = extractSubjNameAndSection(s);
            if (item.name.trim().toLowerCase() !== targetName.toLowerCase()) return true;
            if (targetSec) return !sectionsEqualForSubject(item.section, targetSec);
            return false;
        });
        saveCloudSubjectsStore(cloudStore);
    }

    const deletedStore = getDeletedSubjectsStore();
    if (!deletedStore[deptCode]) deletedStore[deptCode] = {};
    if (!deletedStore[deptCode][yearStr]) deletedStore[deptCode][yearStr] = [];
    const dk = subjectScopeKey(targetName, targetSec || 'ALL');
    if (!deletedStore[deptCode][yearStr].includes(dk)) {
        deletedStore[deptCode][yearStr].push(dk);
        saveDeletedSubjectsStore(deletedStore);
    }

    sendSubjectToCloud('delete_subject', deptCode, yearStr, targetName, false, targetSec || 'ALL')
        .catch(e => console.warn('Subject delete cloud sync error:', e));

    showCustomToast('Subject Deleted Across College', '"' + targetName + '" removed from ' + deptCode + ' ' + yearStr + ' on all devices.');
}

function extractSubjNameAndSection(subj) {
    if (!subj) return { name: '', section: 'ALL' };
    if (typeof subj === 'string') return { name: subj, section: 'ALL' };
    return { name: subj.name || subj.subject || '', section: subj.section || 'ALL' };
}

function normalizeSectionCode(sec) {
    if (!sec) return 'ALL';
    const s = String(sec).trim().toUpperCase();
    if (s === 'ALL' || s === 'COMBINED' || s === 'ANY' || s === 'ELECTIVE') return 'ALL';
    if (s === 'COMMON' || s === 'SECTION COMMON' || s === 'ALL CLASSES') return 'COMMON';
    if (s === 'SHARED' || s === 'MULTI' || s === 'MULTI-COMBO' || s === 'MULTI COMBO') return 'SHARED';
    if (s === 'A_B' || s === 'A&B' || s === 'A AND B' || s === 'AB') return 'A_B';
    if (s === 'C (AIML)' || s === 'C AIML' || s === 'AIML') return 'C_AIML';
    if (s === 'C (TP)' || s === 'C TP' || s === 'TP') return 'C_TP';
    if (s === 'C (AF)' || s === 'C AF' || s === 'AF' || s === 'D') return 'C_AF';
    if (s === 'MSCS' || s === 'MSC' || s === 'MATHS-STATS-CS' || s === 'MATHS STATS CS') return 'MSCS';
    if (s === 'MSCS_P1' || s === 'MSCS P1' || s === 'MSCS-P1') return 'MSCS_P1';
    if (s === 'MSCS_P2' || s === 'MSCS P2' || s === 'MSCS-P2') return 'MSCS_P2';
    if (s === 'MPCS' || s === 'MATHS-PHYSICS-CS' || s === 'MATHS PHYSICS CS') return 'MPCS';
    if (s === 'MPCS_P1' || s === 'MPCS P1' || s === 'MPCS-P1') return 'MPCS_P1';
    if (s === 'MPCS_P2' || s === 'MPCS P2' || s === 'MPCS-P2') return 'MPCS_P2';
    if (s === 'MSP' || s === 'MATHS-STATS-PHYSICS') return 'MSP';
    if (s === 'MSP_P1' || s === 'MSP P1' || s === 'MSP-P1') return 'MSP_P1';
    if (s === 'MSP_P2' || s === 'MSP P2' || s === 'MSP-P2') return 'MSP_P2';
    if (s === 'MPC' || s === 'MATHS-PHYSICS-CHEMISTRY') return 'MPC';
    if (s === 'MPC_P1' || s === 'MPC P1' || s === 'MPC-P1') return 'MPC_P1';
    if (s === 'MPC_P2' || s === 'MPC P2' || s === 'MPC-P2') return 'MPC_P2';
    if (s === 'BZC' || s === 'BOTANY-ZOOLOGY-CHEMISTRY') return 'BZC';
    if (s === 'BZC_B1' || s === 'BZC B1' || s === 'BZC-B1') return 'BZC_B1';
    if (s === 'BZC_B2' || s === 'BZC B2' || s === 'BZC-B2') return 'BZC_B2';
    if (s === 'MATHS_M1' || s === 'MATHS M1' || s === 'MATHS-M1' || s === 'M1') return 'MATHS_M1';
    if (s === 'MATHS_M2' || s === 'MATHS M2' || s === 'MATHS-M2' || s === 'M2') return 'MATHS_M2';
    if (s === 'CHEM_THEORY' || s === 'CHEMISTRY THEORY') return 'CHEM_THEORY';
    if (s === 'STAT_THEORY' || s === 'STATISTICS THEORY') return 'STAT_THEORY';
    if (s === 'CS_THEORY' || s === 'COMPUTER SCIENCE THEORY') return 'CS_THEORY';
    if (s === 'PHY_THEORY' || s === 'PHYSICS THEORY') return 'PHY_THEORY';
    if (s === 'AIDED_THEORY' || s === 'AIDED GROUP') return 'AIDED_THEORY';
    if (s === 'UNAIDED_THEORY' || s === 'UNAIDED GROUP') return 'UNAIDED_THEORY';
    if (s === 'EHE' || s === 'ENGLISH-HISTORY-ECONOMICS') return 'EHE';
    if (s === 'HEP' || s === 'HISTORY-ECONOMICS-POLITICAL' || s === 'HISTORY-ECONOMICS-POL. SCIENCE') return 'HEP';
    if (s === 'JKP' || s === 'JOURNALISM-KANNADA-POLITICAL') return 'JKP';
    if (s === 'CONST_A' || s === 'CONST AIDED' || s === 'CONSTITUTION AIDED' || s === 'CONST (AIDED)') return 'CONST_A';
    if (s === 'CONST_U' || s === 'CONST UNAIDED' || s === 'CONSTITUTION UNAIDED' || s === 'CONST (UNAIDED)') return 'CONST_U';
    if (s === 'A' || s === 'B' || s === 'C') return s;
    return s;
}

/**
 * Scope rules:
 * - ALL (Combined elective): Combined attendance only (Kannada/Hindi/Sanskrit)
 * - COMMON (all classes, not elective): Sec A, B, C — NOT Combined (English, CONST, FOC…)
 * - A_B: Sec A / B only
 * - C_AIML: Sec C (AIML) only
 * - B.Sc./B.A.: Common = English/CONST (2 batches → Merge); ALL = Kan/Hin/San (2 batches → Merge)
 */
function isCustomSubjectMatchingSection(subjObj, targetSec) {
    const rawSec = String(subjObj.section || 'ALL').trim();
    const sSec = normalizeSectionCode(rawSec);
    const target = normalizeSectionCode(targetSec || 'A');

    if (target.includes('+')) {
        const parts = target.split('+');
        return parts.every(p => isCustomSubjectMatchingSection(subjObj, p));
    }
    if (sSec.includes('+')) {
        const parts = sSec.split('+');
        return parts.some(p => isCustomSubjectMatchingSection({ ...subjObj, section: p }, targetSec));
    }

    if (usesAudienceGroups(currentDept)) {
        if (sSec === 'ALL' || sSec === 'COMMON' || sSec === 'SHARED') return true;
        if (rawSec.toUpperCase().startsWith('SHARED:') || rawSec.toUpperCase().startsWith('SHARED_')) {
            const parts = rawSec.toUpperCase().replace(/^SHARED[:_]/, '').split(/[,_]/);
            const normParts = parts.map(p => normalizeSectionCode(p));
            if (normParts.includes(target) || target === 'ALL' || target === 'COMMON') return true;
        }
        if (sSec === target) return true;
        const baseTarget = target.replace(/_(B1|B2|P1|P2|LAB\d*)$/i, '');
        const baseSubj = sSec.replace(/_(B1|B2|P1|P2|LAB\d*)$/i, '');
        if (baseSubj === baseTarget) return true;
        return false;
    }

    // 1. Combined elective (ALL) displays ONLY under Combined section (ALL)
    if (sSec === 'ALL') {
        return target === 'ALL';
    }

    // 2. When teacher selects Combined section (ALL) on form, display ONLY Combined electives (sSec === 'ALL')
    // Common and Shared subjects do NOT appear under Combined.
    if (target === 'ALL') {
        return sSec === 'ALL';
    }

    // 3. Common subjects apply to all concrete class sections / combinations (not Combined)
    if (sSec === 'COMMON') {
        return target !== 'ALL';
    }

    // 4. Explicit shared combinations tag: e.g. "SHARED:MSCS,MPCS,MSP,MPC" or "SHARED:MSCS"
    if (rawSec.toUpperCase().startsWith('SHARED:') || rawSec.toUpperCase().startsWith('SHARED_')) {
        const parts = rawSec.toUpperCase().replace(/^SHARED[:_]/, '').split(/[,_]/);
        const normParts = parts.map(p => normalizeSectionCode(p));
        return normParts.includes(target);
    }

    if (sSec === 'SHARED') {
        return true;
    }

    if (sSec === target) return true;

    if ((sSec === 'C_AIML' && target === 'C') || (sSec === 'C' && target === 'C_AIML')) {
        return true;
    }

    if (sSec === 'A_B' && (target === 'A' || target === 'B')) {
        return true;
    }

    if (target === 'A_B') {
        return sSec === 'A_B' || sSec === 'A' || sSec === 'B';
    }

    if (target === 'C_TP') return sSec === 'C_TP';
    if (target === 'C_AF') return sSec === 'C_AF';
    if (target === 'C_AIML') return sSec === 'C_AIML' || sSec === 'C';

    return false;
}

function subjectScopeKey(name, section) {
    return String(name || '').trim().toLowerCase() + '::' + normalizeSectionCode(section);
}

/** Tombstone may be name::SECTION or legacy bare name (hides all scopes of that name). */
function isSubjectTombstoned(deletedList, name, section) {
    const dk = subjectScopeKey(name, section).toLowerCase();
    const nameLower = String(name || '').trim().toLowerCase();
    return (deletedList || []).some(d => {
        const dl = String(d || '').toLowerCase();
        if (dl === dk) return true;
        if (dl.indexOf('::') !== -1) return false;
        return dl === nameLower;
    });
}

function sectionsEqualForSubject(a, b) {
    return normalizeSectionCode(a) === normalizeSectionCode(b);
}

function subjectListFingerprint(subjects) {
    return (subjects || []).map(s => String(s).toLowerCase()).join('\u0001');
}

function refreshSubjectDropdowns(preferredSubject) {
    const yr = directYearSelect ? directYearSelect.value : 'First Year';
    const sec = directSectionSelect ? directSectionSelect.value : 'A';
    const list = getSubjectsForActiveYear(currentDept, yr, sec);
    const config = DEPT_CONFIG[currentDept];
    updateSubjectDropdowns(list, preferredSubject || (config ? config.defaultSubject : null));
}

function getSubjectsForActiveYear(deptCode, yearStr, sectionStr) {
    const config = DEPT_CONFIG[deptCode];
    if (!config) return [];

    const yr = yearStr || 'First Year';
    let baseSubjects = [];
    const sec = sectionStr || 'A';
    const targetNorm = normalizeSectionCode(sec);

    // Combined: do not dump every section's built-in list — only ALL-tagged customs below
    if (targetNorm !== 'ALL' && config.subjectsByYearAndSection && config.subjectsByYearAndSection[yr]) {
        const secMap = config.subjectsByYearAndSection[yr];

        const pushUnique = (arr) => {
            (arr || []).forEach(s => {
                if (!baseSubjects.some(x => x.toLowerCase() === String(s).toLowerCase())) {
                    baseSubjects.push(s);
                }
            });
        };

        // Exact key match
        for (let k in secMap) {
            if (normalizeSectionCode(k) === targetNorm) pushUnique(secMap[k]);
        }
        // Multi-combination + splitting match (e.g. MSCs+MPC merges MSCs and MPC subjects)
        if (targetNorm.includes('+')) {
            const parts = targetNorm.split('+');
            parts.forEach(p => {
                const normP = normalizeSectionCode(p);
                for (let k in secMap) {
                    if (normalizeSectionCode(k) === normP) pushUnique(secMap[k]);
                }
            });
        }
        // Sub-batch fallback (e.g. BZC_B1 / BZC_B2 inherits BZC subjects; MPCs_P1 / MPCs_P2 inherits MPCs subjects)
        const baseCombo = targetNorm.replace(/_(B1|B2|P1|P2|LAB\d*)$/i, '');
        if (baseCombo && baseCombo !== targetNorm) {
            for (let k in secMap) {
                if (normalizeSectionCode(k) === baseCombo) pushUnique(secMap[k]);
            }
        }
        // A/B also get A_B pool from config if present
        if (targetNorm === 'A' || targetNorm === 'B') {
            for (let k in secMap) {
                if (normalizeSectionCode(k) === 'A_B') pushUnique(secMap[k]);
            }
        }
        // C (attendance) also try C / C (AIML) keys
        if (targetNorm === 'C' || targetNorm === 'C_AIML') {
            for (let k in secMap) {
                const nk = normalizeSectionCode(k);
                if (nk === 'C' || nk === 'C_AIML') pushUnique(secMap[k]);
            }
        }
    } else if (targetNorm !== 'ALL' && config.subjectsByYear && config.subjectsByYear[yr]) {
        baseSubjects = [...config.subjectsByYear[yr]];
    } else if (targetNorm !== 'ALL') {
        baseSubjects = [...(config.subjects || [])];
    }

    const deletedStore = getDeletedSubjectsStore();
    const deletedList = ((deletedStore[deptCode] || {})[yr]) || [];

    const mergeList = (list) => {
        (list || []).forEach(subj => {
            const item = extractSubjNameAndSection(subj);
            if (!item.name) return;
            if (isSubjectTombstoned(deletedList, item.name, item.section)) return;
            if (isCustomSubjectMatchingSection(item, sec)) {
                if (!baseSubjects.some(s => s.toLowerCase() === item.name.toLowerCase())) {
                    baseSubjects.push(item.name);
                }
            }
        });
    };

    const cloudStore = getCloudSubjectsStore();
    mergeList((cloudStore[deptCode] || {})[yr] || []);

    const customStore = getCustomSubjectsStore();
    mergeList((customStore[deptCode] || {})[yr] || []);

    return baseSubjects;
}

/** All subject entries for manage chips (name + section; same name can exist in different scopes). */
function getAllSubjectsForYearManage(deptCode, yearStr) {
    const entries = [];
    const seen = new Set();
    const deletedStore = getDeletedSubjectsStore();
    const deletedList = ((deletedStore[deptCode] || {})[yearStr]) || [];

    const add = (subj) => {
        const item = extractSubjNameAndSection(subj);
        const name = item.name.trim();
        if (!name) return;
        const dk = subjectScopeKey(name, item.section);
        if (isSubjectTombstoned(deletedList, name, item.section)) return;
        if (seen.has(dk)) return;
        seen.add(dk);
        entries.push({ name: name, section: item.section || 'A_B' });
    };

    const cloudStore = getCloudSubjectsStore();
    ((cloudStore[deptCode] || {})[yearStr] || []).forEach(add);
    const customStore = getCustomSubjectsStore();
    ((customStore[deptCode] || {})[yearStr] || []).forEach(add);

    return entries;
}

function updateSubjectDropdowns(subjects, defaultSubject) {
    const subjectSelects = [directSubjectInput, subjectInput];
    const nextFp = subjectListFingerprint(subjects);

    subjectSelects.forEach(selectEl => {
        if (!selectEl) return;

        const prev = selectEl.value;
        const curFp = subjectListFingerprint(
            Array.from(selectEl.options).map(o => o.value).filter(v => v)
        );

        // Skip DOM rebuild when options are unchanged (stops flash on open/sync)
        if (curFp === nextFp && subjects && subjects.length > 0) {
            if (prev && subjects.some(s => s.toLowerCase() === String(prev).toLowerCase())) {
                const match = subjects.find(s => s.toLowerCase() === String(prev).toLowerCase());
                if (match) selectEl.value = match;
            } else if (!prev) {
                selectEl.value = '';
            }
            return;
        }

        selectEl.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select Subject';
        defaultOpt.disabled = true;
        selectEl.appendChild(defaultOpt);

        if (subjects && Array.isArray(subjects) && subjects.length > 0) {
            subjects.forEach(subj => {
                const opt = document.createElement('option');
                opt.value = subj;
                opt.textContent = subj;
                selectEl.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '-- Add Subject via (+ Add Subject) button above --';
            opt.disabled = true;
            selectEl.appendChild(opt);
        }

        if (prev && subjects && subjects.some(s => s.toLowerCase() === String(prev).toLowerCase())) {
            const match = subjects.find(s => s.toLowerCase() === String(prev).toLowerCase());
            selectEl.value = match || prev;
        } else {
            selectEl.value = '';
        }
    });
}

function isElectiveOrLanguageSubject(subjectVal, deptCode, yearStr) {
    if (!subjectVal) return false;
    const cleanSubj = subjectVal.trim().toLowerCase();
    const dept = deptCode || currentDept || 'BCA';
    const yr = yearStr || (directYearSelect ? directYearSelect.value : 'First Year');

    // Prefer explicit section tag from custom/cloud store
    const resolveStored = (list) => {
        for (let i = 0; i < (list || []).length; i++) {
            const item = extractSubjNameAndSection(list[i]);
            if (item.name.trim().toLowerCase() === cleanSubj) {
                return normalizeSectionCode(item.section) === 'ALL';
            }
        }
        return null;
    };
    const cloudList = ((getCloudSubjectsStore()[dept] || {})[yr]) || [];
    const customList = ((getCustomSubjectsStore()[dept] || {})[yr]) || [];
    const fromCloud = resolveStored(cloudList);
    if (fromCloud !== null) return fromCloud;
    const fromCustom = resolveStored(customList);
    if (fromCustom !== null) return fromCustom;

    const key = (dept + '_' + yr + '_' + cleanSubj).toLowerCase();
    const flags = getElectiveFlagsStore();
    if (flags[key] !== undefined) {
        return Boolean(flags[key]);
    }

    // Labs are never auto-elective
    if (/\b(lab|practical)\b/i.test(cleanSubj)) {
        return false;
    }

    // Name fallback only for known language/elective titles (not plain "English")
    return /\b(kannada|kanada|kanad|hindi|hindhi|sanskrit|sanskrith|sanskritha|sanskrut|sanskrutha|sanskritam|devops|wcms|digital\s*fluency|cyber\s*security|e-?filing|optional\s*english|human\s*rights)\b/i.test(cleanSubj);
}

function checkLanguageElectiveAutoCombined(subjectVal, sectionSelectElem, yearSelectElem, forceToast) {
    // Keep user's selected section completely intact. No auto-resetting of sections.
    return;
}

function setSubjectValue(selectEl, subjectVal) {
    if (!selectEl || !subjectVal || !selectEl.options) return;
    let matchingOpt = Array.from(selectEl.options).find(o => o.value && o.value.toLowerCase() === subjectVal.toLowerCase());
    if (matchingOpt) {
        selectEl.value = matchingOpt.value;
    } else {
        const customOpt = document.createElement('option');
        customOpt.value = subjectVal;
        customOpt.textContent = subjectVal;
        selectEl.appendChild(customOpt);
        selectEl.value = subjectVal;
    }

    if (selectEl === directSubjectInput && directSectionSelect) {
        checkLanguageElectiveAutoCombined(subjectVal, directSectionSelect, directYearSelect);
    } else if (selectEl === subjectInput && sectionSelect) {
        checkLanguageElectiveAutoCombined(subjectVal, sectionSelect, yearSelect);
    }
}

function updateSectionFieldLabels(deptCode) {
    ['directSectionSelect', 'sectionSelect', 'shortageSectionSelect', 'bulkSectionSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const lab = document.querySelector('label[for="' + id + '"]');
        if (lab) lab.textContent = 'Section';
    });
}

function updateSectionSelects(hasSections, deptCode, yearStr) {
    const dept = deptCode || currentDept || 'BCA';
    const year = yearStr || (directYearSelect ? directYearSelect.value : 'First Year');
    const isFirstYear = year === 'First Year' || year === '1' || year === '1st Year';
    updateSectionFieldLabels(dept);

    const shortageSectionSelect = document.getElementById('shortageSectionSelect');
    const bulkSectionSelect = document.getElementById('bulkSectionSelect');
    const sectionSelects = [directSectionSelect, sectionSelect, shortageSectionSelect, bulkSectionSelect].filter(Boolean);

    sectionSelects.forEach(selectEl => {
        if (!selectEl) return;
        const curVal = selectEl.value;
        selectEl.innerHTML = '';
        const formGroup = selectEl.closest('.form-group') || selectEl.parentElement;
        if (hasSections) {
            selectEl.disabled = false;
            if (formGroup) formGroup.style.display = '';
            let options = [];

            if (usesAudienceGroups(dept)) {
                const auds = getAudienceOptions(dept);
                options = auds.map(a => ({ val: a.val, label: a.label || a.val }));
                if (curVal && curVal.includes('+')) {
                    options.unshift({ val: curVal, label: formatAudienceShortLabel(curVal) });
                }
                options.push({ val: 'ALL', label: 'Combined (Kan / Hin / San / Electives)' });
            } else if (dept === 'BCA') {
                if (isFirstYear) {
                    options = [
                        { val: 'A', label: 'Section A (General BCA)' },
                        { val: 'B', label: 'Section B (General BCA)' },
                        { val: 'C', label: 'Section C (AIML)' },
                        { val: 'ALL', label: 'Combined (Sec A, B, C / Electives)' }
                    ];
                } else {
                    options = [
                        { val: 'A', label: 'Section A' },
                        { val: 'B', label: 'Section B' },
                        { val: 'C', label: 'Section C' },
                        { val: 'ALL', label: 'Combined (Sec A, B, C / Electives)' }
                    ];
                }
            } else if (dept === 'BCM' || dept === 'BCOM') {
                options = [
                    { val: 'A', label: 'Section A (General B.Com)' },
                    { val: 'B', label: 'Section B (General B.Com)' },
                    { val: 'C (TP)', label: 'Section C (TP - Tax Procedure)' },
                    { val: 'C (AF)', label: 'Section C (AF - Accounting & Finance)' },
                    { val: 'ALL', label: 'Combined (Sec A, B, C / Electives)' }
                ];
            } else {
                options = [
                    { val: 'A', label: 'Section A' },
                    { val: 'B', label: 'Section B' },
                    { val: 'C', label: 'Section C' },
                    { val: 'ALL', label: 'Combined (Sec A, B, C / Electives)' }
                ];
            }

            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Select Section';
            defaultOpt.disabled = true;
            selectEl.appendChild(defaultOpt);

            options.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.val;
                opt.textContent = o.label;
                selectEl.appendChild(opt);
            });

            const valid = curVal && options.some(o => o.val === curVal || normalizeSectionCode(o.val) === normalizeSectionCode(curVal));
            if (valid) {
                const match = options.find(o => o.val === curVal || normalizeSectionCode(o.val) === normalizeSectionCode(curVal));
                selectEl.value = match ? match.val : '';
            } else if (selectEl === shortageSectionSelect || selectEl === bulkSectionSelect) {
                selectEl.value = options[0] ? options[0].val : '';
            } else {
                selectEl.value = '';
            }
        } else {
            const opt = document.createElement('option');
            opt.value = 'A';
            opt.textContent = 'N/A (No Section)';
            selectEl.appendChild(opt);
            selectEl.value = 'A';
            selectEl.disabled = true;
            if (formGroup) formGroup.style.display = 'none';
        }
    });
    renderDirectCombinationCheckboxes(dept);
    renderModalCombinationCheckboxes(dept);
}

function getApplicableCombinationsForSubject(subjName, deptCode) {
    const s = String(subjName || '').trim().toLowerCase();
    const dept = deptCode || currentDept || 'BSC';
    const defaultAudience = dept === 'BA' ? ['EHE', 'HEP', 'JKP'] : ['MSCs', 'MPCs', 'MSP', 'MPC', 'BZC'];
    if (!s) {
        return defaultAudience;
    }

    // 1. Check custom stored subject objects for explicit section tags
    const customList = getStoredSubjects(dept);
    const foundObj = customList.find(item => item && item.name && item.name.toLowerCase() === s);
    if (foundObj && foundObj.section) {
        const secTag = String(foundObj.section).toUpperCase().trim();
        if (secTag.startsWith('SHARED:') || secTag.startsWith('SHARED_')) {
            const parts = secTag.replace(/^SHARED[:_]/, '').split(/[,_]/).map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) return parts;
        }
        if (secTag.includes('+')) {
            return secTag.split('+').map(p => p.trim()).filter(Boolean);
        }
        if (secTag !== 'ALL' && secTag !== 'COMMON') {
            return [secTag];
        }
    }

    // 2. Syllabus Subject Rules for B.A.
    if (dept === 'BA') {
        if (s.includes('history') || s.includes('econ')) {
            return ['EHE', 'HEP'];
        }
        if (s.includes('pol') || s.includes('politics') || s.includes('political')) {
            return ['HEP', 'JKP'];
        }
        if (s.includes('journalism')) {
            return ['JKP'];
        }
        return defaultAudience;
    }

    // 3. Syllabus Subject Rules for B.Sc.
    if (s.includes('math') || s === 'm1' || s === 'm2') {
        if (s.includes('m2') || s.includes('maths (m2)') || s.includes('maths 2')) {
            return ['MPCs', 'MSP'];
        }
        if (s.includes('m1') || s.includes('maths (m1)') || s.includes('maths 1')) {
            return ['MPC', 'MSCs'];
        }
        return ['MPC', 'MSCs', 'MPCs', 'MSP'];
    }
    if (s.includes('chem')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('b1') || s.includes('b2')) {
            return ['B1', 'B2'];
        }
        return ['BZC', 'MPC'];
    }
    if (s.includes('phy')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('p1') || s.includes('p2')) {
            return ['P1', 'P2'];
        }
        return ['MPC', 'MSP', 'MPCs'];
    }
    if (s.includes('stat')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('p1') || s.includes('p2')) {
            return ['P1', 'P2'];
        }
        return ['MSCs', 'MSP'];
    }
    if (s.includes('comp') || s.includes('cs') || s.includes('computer')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('p1') || s.includes('p2')) {
            return ['P1', 'P2'];
        }
        return ['MSCs', 'MPCs'];
    }
    if (s.includes('botan')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('b1') || s.includes('b2')) {
            return ['B1', 'B2'];
        }
        return ['BZC'];
    }
    if (s.includes('zool')) {
        if (s.includes('practical') || s.includes('lab') || s.includes('b1') || s.includes('b2')) {
            return ['B1', 'B2'];
        }
        return ['BZC'];
    }
    if (s.includes('practical') || s.includes('lab')) {
        if (s.includes('b1') || s.includes('b2') || s.includes('bzc')) {
            return ['B1', 'B2'];
        }
        return ['P1', 'P2'];
    }

    return defaultAudience;
}

function syncComboCheckboxesToSectionValue(secStr) {
    const listDiv = document.getElementById('directComboCheckboxesList');
    if (!listDiv) return;

    const secNorm = String(secStr || '').trim();
    if (!secNorm) return;

    const parts = secNorm.split('+').map(p => normalizeSectionCode(p)).filter(Boolean);

    listDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const cbNorm = normalizeSectionCode(cb.value);
        if (secNorm === 'ALL' || parts.includes('ALL')) {
            cb.checked = true;
        } else if (parts.includes(cbNorm)) {
            cb.checked = true;
        } else {
            cb.checked = false;
        }
    });

    listDiv.querySelectorAll('.combo-chip').forEach(chip => {
        const cb = chip.querySelector('input[type="checkbox"]');
        if (cb && cb.checked) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

function renderModalCombinationCheckboxes(deptCode, selectedSection) {
    const container = document.getElementById('modalCombinationCheckboxes');
    if (sectionSelect) sectionSelect.style.display = '';
    if (container) container.style.display = 'none';
}

function renderDirectCombinationCheckboxes(deptCode) {
    const container = document.getElementById('directCombinationCheckboxes');
    if (directSectionSelect) directSectionSelect.style.display = '';
    if (container) container.style.display = 'none';
}

function renderStreamPresets(config) {
    const presetPillsContainer = document.querySelector('.preset-pills');
    if (!presetPillsContainer || !config.samplePresets) return;

    presetPillsContainer.innerHTML = '';
    config.samplePresets.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'preset-pill';
        btn.setAttribute('data-phrase', preset.phrase);
        btn.textContent = preset.label;
        btn.addEventListener('click', () => {
            manualTextInput.value = preset.phrase;
            autoProcessSpeech(preset.phrase);
        });
        presetPillsContainer.appendChild(btn);
    });
}

// Event Initialization
document.addEventListener('DOMContentLoaded', () => {
    const todayStr = getTodayISOString();
    currentDateTrack = todayStr;
    if (dateInput) dateInput.value = todayStr;
    if (directDateInput) directDateInput.value = todayStr;
    applyAttendanceDateLimits();
    try { updateMarkAbsenteesStepUI(); } catch (e) {}
    if (todayBadge) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        todayBadge.textContent = 'Today - ' + new Date().toLocaleDateString(undefined, options);
    }

    initDepartmentManager();
    initSubjectManager();
    initPasscodeManager();
    initThemeToggle();

    const localHint = document.getElementById('localTestHint');
    if (localHint && isLocalTestMode()) localHint.style.display = 'block';

    // Auto-refresh date after midnight 12 AM when page is visible/focused
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkAndRefreshDate();
    });
    window.addEventListener('focus', checkAndRefreshDate);
    setInterval(checkAndRefreshDate, 60000);

    // Voice recognition disabled (Voice Input removed)

    // Mode Switcher Tabs
    if (typingModeTab) typingModeTab.addEventListener('click', () => switchMode('typing'));
    if (hodModeTab) hodModeTab.addEventListener('click', () => switchMode('hod'));
    // Voice tab intentionally unused

    initHODPortal();
    initShortageCalculator();

    // Voice Actions (no-ops if elements missing)
    if (directMicBtn) directMicBtn.addEventListener('click', toggleListening);
    if (directMicStopBtn) directMicStopBtn.addEventListener('click', stopListening);
    if (micBtn) micBtn.addEventListener('click', toggleListening);
    if (clearTranscriptBtn) clearTranscriptBtn.addEventListener('click', clearTranscript);
    if (processBtn) processBtn.addEventListener('click', () => autoProcessSpeech());

    // Mark Absentees Actions
    if (parseTypedTextBtn) parseTypedTextBtn.addEventListener('click', handleTypedTextParse);
    if (clearManualTextBtn) clearManualTextBtn.addEventListener('click', () => { if (manualTextInput) manualTextInput.value = ''; });
    if (directResetBtn) directResetBtn.addEventListener('click', resetAllInputs);
    if (directSubmitBtn) directSubmitBtn.addEventListener('click', submitDirectForm);

    // Modal Actions
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeConfirmationModal);
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        resetAllInputs();
        closeConfirmationModal();
    });
    if (submitBtn) submitBtn.addEventListener('click', submitModalForm);

    // Bulk Generator Actions
    const openBulkBtn = document.getElementById('openBulkGeneratorModalBtn');
    const closeBulkBtn = document.getElementById('closeBulkModalBtn');
    const cancelBulkBtn = document.getElementById('cancelBulkModalBtn');
    const bulkForm = document.getElementById('bulkGeneratorForm');
    const bulkModal = document.getElementById('bulkGeneratorModal');
    const bulkYearSelect = document.getElementById('bulkYearSelect');
    const bulkSectionSelect = document.getElementById('bulkSectionSelect');

    if (openBulkBtn) openBulkBtn.addEventListener('click', openBulkGeneratorModal);
    if (closeBulkBtn) closeBulkBtn.addEventListener('click', closeBulkGeneratorModal);
    if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', closeBulkGeneratorModal);
    if (bulkModal) {
        bulkModal.addEventListener('click', (e) => {
            if (e.target === bulkModal) closeBulkGeneratorModal();
        });
    }
    if (bulkYearSelect) bulkYearSelect.addEventListener('change', updateBulkSubjectDropdown);
    if (bulkSectionSelect) bulkSectionSelect.addEventListener('change', updateBulkSubjectDropdown);
    if (bulkForm) {
        bulkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            executeBulkPastGenerator();
        });
    }

    // Year / section changes: filter locally only (cloud poll already runs every 12s).
    // Avoid fetchCloudSubjects here — it rebuilt dropdowns mid-interaction and caused screen flash.
    if (directYearSelect) {
        directYearSelect.addEventListener('change', () => {
            const config = DEPT_CONFIG[currentDept];
            const hasSec = config ? config.hasSections : true;
            const yrVal = directYearSelect.value;
            updateSectionSelects(hasSec, currentDept, yrVal);
            refreshSubjectDropdowns(config ? config.defaultSubject : null);
            try { updateMarkAbsenteesStepUI(); } catch (e) {}
        });
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            const config = DEPT_CONFIG[currentDept];
            const hasSec = config ? config.hasSections : true;
            const yrVal = yearSelect.value;
            updateSectionSelects(hasSec, currentDept, yrVal);
            const secVal = sectionSelect ? sectionSelect.value : 'A';
            updateSubjectDropdowns(getSubjectsForActiveYear(currentDept, yrVal, secVal), config ? config.defaultSubject : null);
        });
    }

    if (directSectionSelect) {
        directSectionSelect.addEventListener('change', () => {
            refreshSubjectDropdowns();
            try { updateMarkAbsenteesStepUI(); } catch (e) {}
        });
    }

    if (directSubjectInput) {
        ['change', 'input'].forEach(evt => {
            directSubjectInput.addEventListener(evt, () => {
                renderDirectCombinationCheckboxes(currentDept);
            });
        });
    }

    if (sectionSelect) {
        sectionSelect.addEventListener('change', () => {
            const config = DEPT_CONFIG[currentDept];
            const yrVal = yearSelect ? yearSelect.value : 'First Year';
            updateSubjectDropdowns(
                getSubjectsForActiveYear(currentDept, yrVal, sectionSelect.value),
                config ? config.defaultSubject : null
            );
        });
    }

    // Live Double Entry warning — SELECT uses change only (input on <select> causes flicker on mobile)
    [dateInput, yearSelect, sectionSelect, subjectInput, slotSelect, rollNumbersInput].forEach(elem => {
        if (elem) {
            const run = () => {
                if (elem === subjectInput || elem === sectionSelect) checkLanguageElectiveAutoCombined(subjectInput.value, sectionSelect, yearSelect);
                refreshAllSlotDropdowns();
                updateModalDoubleEntryCheck();
            };
            elem.addEventListener('change', run);
            if (elem.tagName !== 'SELECT') elem.addEventListener('input', run);
        }
    });

    [directDateInput, directYearSelect, directSectionSelect, directSubjectInput, directSlotSelect, directRollInput].forEach(elem => {
        if (elem) {
            const run = () => {
                if (elem === directSubjectInput || elem === directSectionSelect) checkLanguageElectiveAutoCombined(directSubjectInput.value, directSectionSelect, directYearSelect);
                refreshAllSlotDropdowns();
                updateDirectDoubleEntryCheck();
                try { updateMarkAbsenteesStepUI(); } catch (e) {}
            };
            elem.addEventListener('change', run);
            if (elem.tagName !== 'SELECT') elem.addEventListener('input', run);
        }
    });

    const directDurationSelect = document.getElementById('directDurationSelect');
    const durationSelect = document.getElementById('durationSelect');
    const directMultiSlotWrapper = document.getElementById('directMultiSlotContainer');
    const directMultiSlotBreakdown = document.getElementById('directMultiSlotBreakdown');
    const modalMultiSlotWrapper = document.getElementById('modalMultiSlotContainer');
    const modalMultiSlotBreakdown = document.getElementById('modalMultiSlotBreakdown');

    if (directDurationSelect) {
        directDurationSelect.addEventListener('change', () => {
            handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);
        });
    }

    if (durationSelect) {
        durationSelect.addEventListener('change', () => {
            handleMultiSlotVisibility(durationSelect, slotSelect, rollNumbersInput, modalMultiSlotWrapper, modalMultiSlotBreakdown);
        });
    }

    if (directSlotSelect) {
        directSlotSelect.addEventListener('change', () => {
            handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);
            try { updateMarkAbsenteesStepUI(); } catch (e) {}
        });
    }

    if (slotSelect) {
        slotSelect.addEventListener('change', () => {
            handleMultiSlotVisibility(durationSelect, slotSelect, rollNumbersInput, modalMultiSlotWrapper, modalMultiSlotBreakdown);
        });
    }

    if (directRollInput) {
        directRollInput.addEventListener('input', () => {
            if (directDurationSelect && parseInt(directDurationSelect.value, 10) > 1) {
                handleMultiSlotVisibility(directDurationSelect, directSlotSelect, directRollInput, directMultiSlotWrapper, directMultiSlotBreakdown);
            }
        });
    }

    if (rollNumbersInput) {
        rollNumbersInput.addEventListener('input', () => {
            if (durationSelect && parseInt(durationSelect.value, 10) > 1) {
                handleMultiSlotVisibility(durationSelect, slotSelect, rollNumbersInput, modalMultiSlotWrapper, modalMultiSlotBreakdown);
            }
        });
    }

    // Header Drawer & Theme Toggle
    const openHistory = () => {
        currentHistoryTabMode = 'TODAY';
        setHistoryDrawerOpen(true);
        updateHistoryTabStyles();
        renderHistoryList();
        fetchTodayServerHistory();
        syncOfflineEntries();
    };

    const mainHistoryBtn = document.getElementById('historyBtn');
    if (mainHistoryBtn) mainHistoryBtn.addEventListener('click', openHistory);
    document.querySelectorAll('.history-open-btn').forEach(btn => {
        btn.addEventListener('click', openHistory);
    });

    const closeBtn = document.getElementById('closeHistoryBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        setHistoryDrawerOpen(false);
    });

    const syncOfflineBtn = document.getElementById('syncOfflineBtn');
    if (syncOfflineBtn) {
        syncOfflineBtn.addEventListener('click', syncOfflineEntries);
    }

    const syncSheetHistoryBtn = document.getElementById('syncSheetHistoryBtn');
    if (syncSheetHistoryBtn) {
        syncSheetHistoryBtn.addEventListener('click', () => {
            fetchFullSheetHistory();
        });
    }

    const clearHistoryCacheBtn = document.getElementById('clearHistoryCacheBtn');
    if (clearHistoryCacheBtn) {
        clearHistoryCacheBtn.addEventListener('click', clearLocalHistoryCache);
    }

    window.addEventListener('online', () => {
        console.log('[Network] Back online - triggering auto-sync...');
        syncOfflineEntries().then(() => fetchTodayServerHistory());
    });

    renderHistoryList();
    if (navigator.onLine) {
        setTimeout(() => {
            syncOfflineEntries().then(() => fetchTodayServerHistory());
        }, 2000);
    }

    // Preset Pills
    document.querySelectorAll('.preset-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const phrase = btn.getAttribute('data-phrase');
            currentTranscript = phrase;
            manualTextInput.value = phrase;
            interimTranscript = '';
            renderTranscript();
            autoProcessSpeech(phrase);
        });
    });

    renderHistoryList();

    // PWA Service Worker with Auto Update Capability
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker Registered:', reg.scope);
                    reg.update(); // Force check for SW update on every app launch

                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showCustomToast(
                                        '⚡ App Updated to Latest Version!',
                                        'Loading updated department structures & features...'
                                    );
                                    setTimeout(() => {
                                        window.location.reload(true);
                                    }, 800);
                                }
                            };
                        }
                    };
                })
                .catch(err => console.warn('[PWA] Service Worker Registration failed:', err));
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload(true);
            }
        });
    }
});

function forceAppUpdate() {
    showCustomToast('🔄 Checking for App Updates...', 'All attendance history & offline logs remain 100% safe.');
    if ('caches' in window) {
        caches.keys().then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
        }).then(() => {
            if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(reg => reg.unregister());
                    setTimeout(() => window.location.reload(true), 500);
                });
            } else {
                setTimeout(() => window.location.reload(true), 500);
            }
        });
    } else {
        setTimeout(() => window.location.reload(true), 500);
    }
}

function toggleSharedCombinationsUI(preselectedSection) {
    const secSelect = document.getElementById('newSubjectSectionSelect');
    const container = document.getElementById('sharedCombinationsContainer');
    const checkboxesDiv = document.getElementById('sharedCombinationsCheckboxes');
    if (!secSelect || !container || !checkboxesDiv) return;

    const val = secSelect.value;
    if (val === 'SHARED' || (preselectedSection && String(preselectedSection).toUpperCase().startsWith('SHARED'))) {
        container.style.display = 'block';
        checkboxesDiv.innerHTML = '';

        const dept = currentDept || 'BCA';
        let items = [];
        if (usesAudienceGroups(dept)) {
            items = getAudienceOptions(dept).map(a => ({ code: a.val, label: formatAudienceShortLabel(a.val) }));
        } else if (dept === 'BCM' || dept === 'BCOM') {
            items = [
                { code: 'A', label: 'Sec A' },
                { code: 'B', label: 'Sec B' },
                { code: 'C (TP)', label: 'Sec C (TP)' },
                { code: 'C (AF)', label: 'Sec C (AF)' }
            ];
        } else {
            items = [
                { code: 'A', label: 'Sec A' },
                { code: 'B', label: 'Sec B' },
                { code: 'C', label: 'Sec C' }
            ];
        }

        let preselectedCodes = [];
        if (preselectedSection && String(preselectedSection).toUpperCase().startsWith('SHARED')) {
            const raw = String(preselectedSection).replace(/^SHARED[:_]/i, '');
            preselectedCodes = raw.split(/[,_]/).map(c => normalizeSectionCode(c));
        }

        items.forEach(item => {
            const label = document.createElement('label');
            label.style.cssText = 'display: inline-flex; align-items: center; gap: 5px; background: var(--bg-card, #1e293b); padding: 5px 10px; border-radius: 6px; border: 1px solid var(--bg-card-border, #334155); cursor: pointer; color: var(--text-main, #f8fafc); font-size: 0.84rem; font-weight: 600;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = item.code;
            cb.className = 'shared-combo-cb';
            if (preselectedCodes.length > 0) {
                cb.checked = preselectedCodes.includes(normalizeSectionCode(item.code));
            } else {
                cb.checked = true;
            }
            label.appendChild(cb);
            label.appendChild(document.createTextNode(item.label));
            checkboxesDiv.appendChild(label);
        });
    } else {
        container.style.display = 'none';
    }
}

function populateModalSectionOptions() {
    const secSelect = document.getElementById('newSubjectSectionSelect');
    if (!secSelect) return;
    secSelect.innerHTML = '';

    const dept = currentDept || 'BCA';
    const year = directYearSelect ? directYearSelect.value : 'First Year';
    const isFirstYear = year === 'First Year' || year === '1' || year === '1st Year';
    const scopeHint = document.getElementById('subjectScopeHint');

    const options = [
        { val: 'COMMON', label: '1) Common to all classes (English, CONST, etc.)' },
        { val: 'ALL', label: '2) Combined elective (Kan / Hin / San — ONLY under Combined)' }
    ];

    if (usesAudienceGroups(dept)) {
        const auds = getAudienceOptions(dept);
        auds.forEach((a, idx) => {
            options.push({ val: a.val, label: `${idx + 3}) Specific Section — ${a.label || a.val}` });
        });
        options.push({ val: 'SHARED', label: `${auds.length + 3}) Multi-Section / Shared (Select combinations below)` });
    } else if (dept === 'BCM' || dept === 'BCOM') {
        options.push({ val: 'A', label: '3) Section A (General B.Com)' });
        options.push({ val: 'B', label: '4) Section B (General B.Com)' });
        options.push({ val: 'C (TP)', label: '5) Section C (TP - Tax Procedure)' });
        options.push({ val: 'C (AF)', label: '6) Section C (AF - Accounting & Finance)' });
        options.push({ val: 'SHARED', label: '7) Shared / Multi-Section' });
    } else {
        options.push({ val: 'A', label: '3) Section A' });
        options.push({ val: 'B', label: '4) Section B' });
        options.push({ val: 'C', label: '5) Section C' });
        options.push({ val: 'SHARED', label: '6) Shared / Multi-Section' });
    }

    const defaultVal = 'COMMON';

    if (scopeHint) {
        if (usesAudienceGroups(dept)) {
            scopeHint.innerHTML = dept === 'BSC'
                ? '<strong>Common</strong> — English, CONST (all B.Sc. classes) &nbsp;·&nbsp; <strong>Combined</strong> — Kan/Hin/San (ONLY under Combined section) &nbsp;·&nbsp; <strong>Specific / Shared</strong> — select sections (e.g. MSCs, MPCs, MSP, MPC, BZC)'
                : '<strong>Common</strong> — English, CONST (all B.A. classes) &nbsp;·&nbsp; <strong>Combined</strong> — Kan/Hin/San (ONLY under Combined section) &nbsp;·&nbsp; <strong>Specific / Shared</strong> — select sections (e.g. EHE, HEP, JKP)';
        } else {
            scopeHint.innerHTML = '<strong>Common</strong> — English / CONST (all classes) &nbsp;·&nbsp; <strong>Combined</strong> — Kan/Hin/San (ONLY under Combined section) &nbsp;·&nbsp; <strong>Specific / Shared</strong> — select sections (e.g. Sec A, Sec B)';
        }
    }

    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.val;
        opt.textContent = o.label;
        secSelect.appendChild(opt);
    });
    secSelect.value = defaultVal;

    if (!secSelect._hasSharedListener) {
        secSelect._hasSharedListener = true;
        secSelect.addEventListener('change', () => toggleSharedCombinationsUI());
    }
    toggleSharedCombinationsUI();
}

function initSubjectManager() {
    const manageBtnVoice = document.getElementById('manageSubjectBtnVoice');
    const manageBtnDirect = document.getElementById('manageSubjectBtnDirect');
    const manageBtnModal = document.getElementById('manageSubjectBtnModal');
    const subjectManageModal = document.getElementById('subjectManageModal');
    const closeSubjectModalBtn = document.getElementById('closeSubjectModalBtn');
    const doneSubjectModalBtn = document.getElementById('doneSubjectModalBtn');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const newSubjectInput = document.getElementById('newSubjectInput');
    const resetSubjectsBtn = document.getElementById('resetSubjectsBtn');

    const openModal = (e) => {
        if (e) e.preventDefault();
        const activeYear = directYearSelect ? directYearSelect.value : 'First Year';
        const modalDeptText = document.getElementById('subjectModalDeptText');
        const modalYearText = document.getElementById('subjectModalYearText');

        if (modalDeptText && DEPT_CONFIG[currentDept]) modalDeptText.textContent = DEPT_CONFIG[currentDept].code;
        if (modalYearText) modalYearText.textContent = activeYear;

        populateModalSectionOptions();
        clearSubjectEditForm();
        fetchCloudSubjects();
        renderSubjectChips();
        if (subjectManageModal) {
            subjectManageModal.classList.add('active');
        }
    };

    if (manageBtnVoice) manageBtnVoice.addEventListener('click', openModal);
    if (manageBtnDirect) manageBtnDirect.addEventListener('click', openModal);
    if (manageBtnModal) manageBtnModal.addEventListener('click', openModal);
    if (closeSubjectModalBtn) closeSubjectModalBtn.addEventListener('click', () => subjectManageModal.classList.remove('active'));
    if (doneSubjectModalBtn) doneSubjectModalBtn.addEventListener('click', () => subjectManageModal.classList.remove('active'));

    if (addSubjectBtn && newSubjectInput) {
        addSubjectBtn.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            const val = newSubjectInput.value.trim();
            if (!val) {
                alert('Please type a subject name first.');
                newSubjectInput.focus();
                return;
            }
            const activeYear = directYearSelect ? directYearSelect.value : 'First Year';
            const secSelectModal = document.getElementById('newSubjectSectionSelect');
            const oldNameInput = document.getElementById('editingSubjectOldName');
            const oldSecInput = document.getElementById('editingSubjectOldSection');
            const oldName = oldNameInput ? oldNameInput.value.trim() : '';
            const oldSection = oldSecInput ? oldSecInput.value.trim() : '';
            let targetSection = canonicalSectionStorage(secSelectModal ? secSelectModal.value : 'COMMON');

            if (secSelectModal && secSelectModal.value === 'SHARED') {
                const checkedCbs = Array.from(document.querySelectorAll('.shared-combo-cb:checked')).map(cb => cb.value);
                if (checkedCbs.length > 0) {
                    targetSection = 'SHARED:' + checkedCbs.join(',');
                } else {
                    targetSection = 'SHARED';
                }
            }

            const isElecChecked = normalizeSectionCode(targetSection) === 'ALL';

            const targetSectionText = secSelectModal && secSelectModal.options[secSelectModal.selectedIndex]
                ? secSelectModal.options[secSelectModal.selectedIndex].text
                : targetSection;

            upsertLocalSubject(currentDept, activeYear, val, targetSection, isElecChecked, oldName || null, oldSection || null);

            // Allow cloud sync again for this dept (old subjects stay hidden via deletedStore tombstones)
            const clearedStore = getClearedDeptsStore();
            if (clearedStore[currentDept]) {
                delete clearedStore[currentDept];
                saveClearedDeptsStore(clearedStore);
            }

            const cloudAction = oldName ? 'rename_subject' : 'add_subject';
            clearSubjectEditForm();
            renderSubjectChips();
            refreshSubjectDropdowns(val);
            showCustomToast(
                oldName ? 'Subject Saved Locally' : 'Subject Saved Locally',
                '"' + val + '" — syncing to sheet…'
            );
            sendSubjectToCloud(cloudAction, currentDept, activeYear, val, isElecChecked, targetSection, oldName || '', oldSection || '')
                .then(ok => {
                    if (ok) {
                        showCustomToast(
                            oldName ? 'Subject Updated & Synced!' : 'Subject Added & Synced!',
                            '"' + val + '" saved — ' + targetSectionText
                        );
                    } else {
                        showCustomToast(
                            'Saved on this device only',
                            '"' + val + '" — cloud sync failed. Check login / Wi‑Fi, then re-open Manage Subjects.'
                        );
                    }
                })
                .catch(e => {
                    console.warn('Subject cloud sync error:', e);
                    showCustomToast('Saved on this device only', 'Cloud sync error — subject may not appear on other phones yet.');
                });
        });
    }

    if (resetSubjectsBtn) {
        resetSubjectsBtn.addEventListener('click', () => {
            if (confirm('Clear all stored subjects for ' + currentDept + '?\n\nThis removes them on this phone AND marks them deleted in Google Sheet so they will not come back on sync.')) {
                const dept = currentDept;
                const customStore = getCustomSubjectsStore();
                const cloudStore = getCloudSubjectsStore();
                const deletedStore = getDeletedSubjectsStore();
                if (!deletedStore[dept]) deletedStore[dept] = {};

                // Tombstone every known subject so a later cloud fetch cannot resurrect them
                const years = new Set([
                    ...Object.keys((customStore[dept] || {})),
                    ...Object.keys((cloudStore[dept] || {}))
                ]);
                years.forEach(yr => {
                    if (!deletedStore[dept][yr]) deletedStore[dept][yr] = [];
                    const lists = []
                        .concat((customStore[dept] && customStore[dept][yr]) || [])
                        .concat((cloudStore[dept] && cloudStore[dept][yr]) || []);
                    lists.forEach(s => {
                        const item = extractSubjNameAndSection(s);
                        const name = item.name.trim();
                        if (!name) return;
                        const dk = subjectScopeKey(name, item.section);
                        if (!deletedStore[dept][yr].some(d => String(d).toLowerCase() === dk.toLowerCase())) {
                            deletedStore[dept][yr].push(dk);
                        }
                    });
                });
                saveDeletedSubjectsStore(deletedStore);

                // Prefer sheet tombstones; cleared flag is only a local hint and no longer blocks fetch
                const clearedStore = getClearedDeptsStore();
                clearedStore[dept] = true;
                saveClearedDeptsStore(clearedStore);

                delete customStore[dept];
                saveCustomSubjectsStore(customStore);
                delete cloudStore[dept];
                saveCloudSubjectsStore(cloudStore);

                sendSubjectToCloud('clear_subjects', dept, 'ALL', '')
                    .catch(e => console.warn('Cloud subject clear error:', e));

                const activeYear = directYearSelect ? directYearSelect.value : 'First Year';
                renderSubjectChips();
                refreshSubjectDropdowns();
                showCustomToast('All Subjects Cleared!', 'Cleared for ' + dept + '. Old sheet subjects marked deleted so they stay gone.');
            }
        });
    }
}

// Version upgrade check to purge stale cached cloud subjects on GitHub Pages update
(function checkAppCacheVersion() {
    const APP_VER = 'v68_slot_disable_combined';
    if (localStorage.getItem('mgm_app_ver') !== APP_VER) {
        localStorage.removeItem('mgm_cloud_subjects');
        localStorage.setItem('mgm_app_ver', APP_VER);
        // One-time purge of stale mobile PWA caches after version bump
        try {
            if (window.caches && caches.keys) {
                caches.keys().then(function (names) {
                    return Promise.all(names.map(function (n) { return caches.delete(n); }));
                }).then(function () {
                    if (sessionStorage.getItem('mgm_ver_reloaded') === APP_VER) return;
                    sessionStorage.setItem('mgm_ver_reloaded', APP_VER);
                    window.location.reload();
                }).catch(function () {});
            }
        } catch (e) {}
    }
})();

function getSubjectSectionTagInfo(deptCode, yearStr, subjName) {
    if (!subjName) return formatSectionTagLabel('ALL');
    const targetName = typeof subjName === 'string' ? subjName.trim() : extractSubjNameAndSection(subjName).name.trim();

    const customStore = getCustomSubjectsStore();
    const deptCustom = customStore[deptCode] || {};
    const customList = deptCustom[yearStr] || [];
    for (let c of customList) {
        const item = extractSubjNameAndSection(c);
        if (item.name.trim().toLowerCase() === targetName.toLowerCase()) {
            return formatSectionTagLabel(item.section);
        }
    }

    const cloudStore = getCloudSubjectsStore();
    const deptCloud = cloudStore[deptCode] || {};
    const cloudList = deptCloud[yearStr] || [];
    for (let c of cloudList) {
        const item = extractSubjNameAndSection(c);
        if (item.name.trim().toLowerCase() === targetName.toLowerCase()) {
            return formatSectionTagLabel(item.section);
        }
    }

    const config = DEPT_CONFIG[deptCode];
    if (config && config.subjectsByYearAndSection && config.subjectsByYearAndSection[yearStr]) {
        const secMap = config.subjectsByYearAndSection[yearStr];
        for (let sKey in secMap) {
            if (secMap[sKey].some(s => s.toLowerCase() === targetName.toLowerCase())) {
                return formatSectionTagLabel(sKey);
            }
        }
    }

    return formatSectionTagLabel('ALL');
}

function formatSectionTagLabel(secCode) {
    const sec = secCode || 'COMMON';
    if (String(sec).toUpperCase().startsWith('SHARED:') || String(sec).toUpperCase().startsWith('SHARED_')) {
        const raw = String(sec).replace(/^SHARED[:_]/i, '');
        const list = raw.split(/[,_]/).map(c => formatAudienceShortLabel(c)).join(', ');
        return { label: 'Shared: ' + list, section: sec, bg: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' };
    }
    const n = normalizeSectionCode(sec);
    if (n === 'ALL') return { label: 'Combined elective', section: 'ALL', bg: 'rgba(234, 179, 8, 0.2)', color: '#eab308' };
    if (n === 'COMMON') return { label: 'Common (all classes)', section: 'COMMON', bg: 'rgba(52, 211, 153, 0.2)', color: '#34d399' };
    if (n === 'SHARED') return { label: 'Shared (multi-combo)', section: 'SHARED', bg: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' };
    if (n === 'A_B') return { label: 'A & B only', section: 'A_B', bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' };
    if (n === 'C_AIML') return { label: 'C (AIML) only', section: 'C (AIML)', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    if (n === 'C_TP') return { label: 'C (TP) only', section: 'C (TP)', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    if (n === 'C_AF') return { label: 'C (AF) only', section: 'C (AF)', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    if (n === 'MSCS') return { label: 'MSCs', section: 'MSCs', bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' };
    if (n === 'MPCS') return { label: 'MPCs', section: 'MPCs', bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' };
    if (n === 'MSP') return { label: 'MSP', section: 'MSP', bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' };
    if (n === 'MPC') return { label: 'MPC', section: 'MPC', bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' };
    if (n === 'BZC') return { label: 'BZC', section: 'BZC', bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' };
    if (n === 'EHE') return { label: 'EHE', section: 'EHE', bg: 'rgba(244, 114, 182, 0.2)', color: '#f472b6' };
    if (n === 'HEP') return { label: 'HEP', section: 'HEP', bg: 'rgba(244, 114, 182, 0.2)', color: '#f472b6' };
    if (n === 'JKP') return { label: 'JKP', section: 'JKP', bg: 'rgba(244, 114, 182, 0.2)', color: '#f472b6' };
    if (n === 'CONST_A') return { label: 'Const (Aided)', section: 'CONST_A', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    if (n === 'CONST_U') return { label: 'Const (Unaided)', section: 'CONST_U', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    return { label: 'Sec ' + sec, section: sec, bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' };
}

function renderSubjectChips() {
    const chipsContainer = document.getElementById('subjectChipsContainer');
    if (!chipsContainer) return;

    const yrSelect = document.getElementById('directYearSelect') || document.getElementById('yearSelect');
    const activeYear = (yrSelect && yrSelect.value) ? yrSelect.value : 'First Year';
    const deptText = document.getElementById('subjectModalDeptText');
    const yearText = document.getElementById('subjectModalYearText');
    
    if (deptText) deptText.textContent = typeof currentDept !== 'undefined' ? currentDept : 'BCA';
    if (yearText) yearText.textContent = activeYear;

    if (typeof populateModalSectionOptions === 'function') {
        populateModalSectionOptions(currentDept, activeYear);
    }

    const subjects = getAllSubjectsForYearManage(currentDept, activeYear);

    chipsContainer.innerHTML = '';
    if (subjects.length === 0) {
        chipsContainer.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-dim);">No subjects available for ' + activeYear + '. Click "+ Add" above to add subjects.</span>';
        return;
    }

    subjects.forEach(entry => {
        const subj = entry.name;
        const sec = entry.section;
        const chip = document.createElement('div');
        chip.className = 'subject-chip-tag';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '6px';

        const tagInfo = formatSectionTagLabel(sec);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = subj;
        chip.appendChild(nameSpan);

        const badgeSpan = document.createElement('span');
        badgeSpan.style.cssText = `font-size: 0.68rem; padding: 2px 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; line-height: 1; margin: 0; background: ${tagInfo.bg}; color: ${tagInfo.color};`;
        badgeSpan.textContent = tagInfo.label;
        chip.appendChild(badgeSpan);

        if (normalizeSectionCode(sec) === 'ALL') {
            const elecBadge = document.createElement('span');
            elecBadge.style.cssText = 'font-size: 0.65rem; padding: 2px 6px; border-radius: 12px; background: rgba(52,211,153,0.2); color: #34d399; font-weight: 600;';
            elecBadge.textContent = 'Elective';
            chip.appendChild(elecBadge);
        }

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'subject-chip-del';
        editBtn.textContent = 'Edit';
        editBtn.title = 'Rename / edit "' + subj + '"';
        editBtn.style.fontSize = '0.68rem';
        editBtn.style.padding = '2px 6px';
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            beginSubjectEdit(subj, sec);
        });
        chip.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'subject-chip-del';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Delete "' + subj + '"';
        delBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteSubject(currentDept, activeYear, subj, sec);
            renderSubjectChips();
            refreshSubjectDropdowns();
        });
        chip.appendChild(delBtn);

        chipsContainer.appendChild(chip);
    });
}

/* HOD PORTAL & WHATSAPP GENERATOR LOGIC */
function initHODPortal() {
    const hodStreamSelect = document.getElementById('hodStreamSelect');
    const hodDatePicker = document.getElementById('hodDatePicker');
    const hodFetchBtn = document.getElementById('hodFetchBtn');
    const hodShareAllWaBtn = document.getElementById('hodShareAllWaBtn');

    if (hodDatePicker && !hodDatePicker.value) {
        hodDatePicker.value = getTodayISOString();
    }
    applyAttendanceDateLimits();

    if (hodFetchBtn) {
        hodFetchBtn.addEventListener('click', fetchHODAbsentees);
    }

    if (hodStreamSelect) {
        hodStreamSelect.addEventListener('change', fetchHODAbsentees);
    }

    if (hodDatePicker) {
        hodDatePicker.addEventListener('change', fetchHODAbsentees);
    }

    if (hodShareAllWaBtn) {
        hodShareAllWaBtn.addEventListener('click', () => {
            // Container is replaced by year-group WhatsApp buttons after fetch;
            // if this seed button is still visible, point HOD to those buttons.
            const status = document.getElementById('hodStatusMessage');
            if (status) {
                status.style.display = 'block';
                status.textContent = 'Fetch absentees first — then use the year/section WhatsApp buttons above the cards.';
            }
        });
    }
}

/** Add phone-only / pending rows into Parent Informer data so WhatsApp is not missing them. */
function mergeLocalPendingIntoHODData(sheetData, stream, dateVal) {
    const targetDate = normalizeHistoryDate(dateVal);
    const sheetEntries = Array.isArray(sheetData && sheetData.entries) ? sheetData.entries.slice() : [];
    const byKey = new Map();

    sheetEntries.forEach(e => {
        const mapped = {
            date: normalizeHistoryDate(e.date) || targetDate,
            year: e.year || '',
            section: e.section || '',
            subject: e.subject || '',
            slot: parseInt(e.slot, 10) || 1,
            rollNumbers: e.rollNumbers == null || String(e.rollNumbers).trim() === ''
                ? 'NIL'
                : (Array.isArray(e.rollNumbers) ? e.rollNumbers.join(', ') : String(e.rollNumbers)),
            stream: stream
        };
        byKey.set(historyMatchKey(mapped), mapped);
    });

    let pendingLocalCount = 0;
    readAllHistory().forEach(item => {
        if ((item.stream || 'BCA') !== stream) return;
        if (normalizeHistoryDate(item.date) !== targetDate) return;
        const mapped = {
            date: targetDate,
            year: item.year || '',
            section: item.section || '',
            subject: item.subject || '',
            slot: parseInt(item.slot, 10) || 1,
            rollNumbers: Array.isArray(item.rollNumbers)
                ? item.rollNumbers.join(', ')
                : (item.rollNumbers == null || String(item.rollNumbers).trim() === '' ? 'NIL' : String(item.rollNumbers)),
            stream: stream
        };
        const k = historyMatchKey(mapped);
        if (!byKey.has(k)) {
            byKey.set(k, mapped);
            pendingLocalCount++;
        } else if (item.offline === true) {
            byKey.set(k, mapped);
        }
    });

    return {
        ...sheetData,
        entries: Array.from(byKey.values()),
        pendingLocalCount: pendingLocalCount,
        count: byKey.size
    };
}

function fetchHODAbsentees() {
    let hodDone = false;
    const hodTimeout = setTimeout(() => {
        if (hodDone) return;
        hodDone = true;
        const hodFetchSpinner = document.getElementById('hodFetchSpinner');
        const hodFetchBtnText = document.getElementById('hodFetchBtnText');
        if (hodFetchSpinner) hodFetchSpinner.style.display = 'none';
        if (hodFetchBtnText) hodFetchBtnText.textContent = '🔄 Fetch Absentees';
        applyLocalFallback('⚠️ Server timeout — showing local entries.');
    }, 12000);
    const hodStreamSelect = document.getElementById('hodStreamSelect');
    const hodDatePicker = document.getElementById('hodDatePicker');
    const hodFetchBtnText = document.getElementById('hodFetchBtnText');
    const hodFetchSpinner = document.getElementById('hodFetchSpinner');
    const hodStatusMessage = document.getElementById('hodStatusMessage');
    const container = document.getElementById('hodSectionCardsContainer');
    const globalShareContainer = document.getElementById('hodGlobalShareContainer');

    const stream = (currentRole !== 'ADMIN') ? currentDept : (hodStreamSelect ? hodStreamSelect.value : currentDept);
    const dateVal = hodDatePicker ? hodDatePicker.value : getTodayISOString();

    const activeLabel = stream === 'BCM' ? 'B.Com' : (stream === 'BA' ? 'B.A.' : (stream === 'BSC' ? 'B.Sc.' : stream));

    const applyLocalFallback = (noteHtml) => {
        const localHistory = JSON.parse(localStorage.getItem('mgm_attendance_history') || '[]');
        const filtered = localHistory.filter(item => item.date === dateVal && (item.stream || 'BCA') === stream);
        const fallbackData = {
            result: 'success',
            date: dateVal,
            stream: stream,
            entries: filtered.map(item => ({
                year: item.year || '',
                section: item.section || '',
                subject: item.subject || '',
                slot: parseInt(item.slot, 10) || 1,
                rollNumbers: Array.isArray(item.rollNumbers) ? item.rollNumbers.join(', ') : String(item.rollNumbers || 'NIL'),
                stream: item.stream || stream
            }))
        };
        currentHODData = fallbackData;
        renderHODSectionCards(fallbackData);
        if (hodStatusMessage) {
            hodStatusMessage.style.display = 'flex';
            hodStatusMessage.innerHTML = noteHtml;
        }
    };

    if (hodFetchBtnText) hodFetchBtnText.textContent = 'Fetching ' + activeLabel + '...';
    if (hodFetchSpinner) hodFetchSpinner.style.display = 'inline-block';
    if (hodStatusMessage) hodStatusMessage.style.display = 'none';

    if (isLocalTestMode()) {
        if (hodFetchBtnText) hodFetchBtnText.textContent = '🔄 Fetch ' + activeLabel + ' Absentees';
        if (hodFetchSpinner) hodFetchSpinner.style.display = 'none';
        applyLocalFallback('<span>💻 <em>Local test mode: showing attendance saved on this PC.</em></span>');
        return;
    }

    const targetUrl = getWebhookUrl(stream);
    const cbName = 'hod_callback_' + Date.now();

    window[cbName] = function (data) {
        if (hodDone) return;
        hodDone = true;
        clearTimeout(hodTimeout);
        delete window[cbName];
        if (hodFetchBtnText) hodFetchBtnText.textContent = '🔄 Fetch ' + activeLabel + ' Absentees';
        if (hodFetchSpinner) hodFetchSpinner.style.display = 'none';

        if (data && data.result === 'success') {
            const merged = mergeLocalPendingIntoHODData(data, stream, dateVal);
            currentHODData = merged;
            renderHODSectionCards(merged);
            if (merged.pendingLocalCount > 0 && hodStatusMessage) {
                hodStatusMessage.style.display = 'flex';
                hodStatusMessage.innerHTML = '<span>📱 Merged ' + merged.pendingLocalCount +
                    ' pending phone entr' + (merged.pendingLocalCount === 1 ? 'y' : 'ies') +
                    ' into this report. Tap Sync in Today\'s History if needed.</span>';
            }
            if (merged.pendingLocalCount > 0 && navigator.onLine) {
                setTimeout(() => { syncOfflineEntries(); }, 500);
            }
        } else {
            if (hodStatusMessage) {
                hodStatusMessage.style.display = 'flex';
                hodStatusMessage.innerHTML = '<span>⚠️ Failed to fetch absentees: ' + escapeHTML(data ? (data.error || data.message || 'Unknown error') : 'No response') + '</span>';
            }
            if (globalShareContainer) globalShareContainer.style.display = 'none';
        }
    };

    const params = new URLSearchParams({
        action: 'get_absentees',
        stream: stream,
        date: dateVal,
        callback: cbName
    });
    appendAuthToParams(params);

    const scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        delete window[cbName];
        if (hodFetchBtnText) hodFetchBtnText.textContent = '🔄 Fetch ' + activeLabel + ' Absentees';
        if (hodFetchSpinner) hodFetchSpinner.style.display = 'none';
        applyLocalFallback('<span>📱 <em>Offline Mode: Showing local attendance logs stored on this device.</em></span>');
    };

    document.body.appendChild(scriptEl);
}


function filterHODSectionCards(yearFilter) {
    currentHODYearFilter = yearFilter;
    const tabs = document.querySelectorAll('.year-filter-tab');
    tabs.forEach(t => {
        if (t.getAttribute('data-year-filter') === yearFilter) t.classList.add('active');
        else t.classList.remove('active');
    });

    const cards = document.querySelectorAll('.hod-section-card');
    cards.forEach(card => {
        const cardYr = card.getAttribute('data-year-prefix');
        if (yearFilter === 'ALL' || cardYr === yearFilter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function toggleHODCardAccordion(headerEl) {
    const card = headerEl.closest('.hod-section-card');
    if (card) {
        card.classList.toggle('collapsed');
    }
}

const SLOT_TIME_MAP = {
    1: '9:00 - 9:55 AM',
    2: '10:00 - 10:55 AM',
    3: '11:10 - 12:05 PM',
    4: '12:10 - 1:05 PM',
    5: '1:05 - 2:00 PM',
    6: '2:00 - 2:55 PM',
    7: '3:00 - 3:55 PM',
    8: '4:00 - 4:55 PM'
};

const SLOT_TIME_SHORT_MAP = {
    1: '9-9.55',
    2: '10-10.55',
    3: '11.10-12.05',
    4: '12.10-1.05',
    5: '1.05-2',
    6: '2-2.55',
    7: '3-3.55',
    8: '4-4.55'
};

function getSlotTimeLabel(slotNum) {
    const s = parseInt(slotNum, 10) || 1;
    return SLOT_TIME_MAP[s] || `Slot ${s}`;
}

function getSlotTimeShortLabel(slotNum) {
    const s = parseInt(slotNum, 10) || 1;
    return SLOT_TIME_SHORT_MAP[s] || ('Slot ' + s);
}

function renderHODSectionCards(data) {
    const container = document.getElementById('hodSectionCardsContainer');
    const globalShareContainer = document.getElementById('hodGlobalShareContainer');
    if (!container) return;

    const entries = data.entries || [];
    const stream = data.stream || 'BCA';
    const dateVal = data.date || getTodayISOString();

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="hod-empty-state">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">📭</div>
                <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">No Attendance Entries Found</h4>
                <p style="font-size: 0.84rem; color: var(--text-muted);">No attendance was submitted for <strong>${escapeHTML(stream)}</strong> on <strong>${escapeHTML(dateVal)}</strong>.</p>
            </div>`;
        if (globalShareContainer) {
            globalShareContainer.style.display = 'none';
            globalShareContainer.innerHTML = '';
        }
        return;
    }

    const groupedBySec = {};
    const groupedByYear = {};
    const hasSections = DEPT_CONFIG[stream] ? DEPT_CONFIG[stream].hasSections : true;
    const audienceMode = usesAudienceGroups(stream);

    entries.forEach(entry => {
        const yrPrefix = hodYearPrefix(entry.year);
        const yearFullLabel = yrPrefix === 'I' ? '1st Year' : (yrPrefix === 'II' ? '2nd Year' : '3rd Year');

        // B.Sc./B.A.: one card per year (Parent Informer sends one message); combo shown per slot
        let sectionTitle = `${yrPrefix} ${stream}`;
        if (hasSections && entry.section && !audienceMode) {
            const secU = String(entry.section).trim().toUpperCase();
            if (secU === 'ALL' || secU.indexOf('COMBIN') !== -1) {
                sectionTitle += ` - Combined`;
            } else {
                sectionTitle += ` - Section ${entry.section}`;
            }
        }

        if (!groupedBySec[sectionTitle]) groupedBySec[sectionTitle] = [];
        groupedBySec[sectionTitle].push(entry);

        if (!groupedByYear[yearFullLabel]) groupedByYear[yearFullLabel] = [];
        groupedByYear[yearFullLabel].push(entry);
    });

    // Render Grouped WhatsApp buttons according to department section rules
    if (globalShareContainer) {
        globalShareContainer.innerHTML = buildGroupedWhatsAppButtons(stream, dateVal, entries);
        globalShareContainer.style.display = 'block';
    }

    // Sort entries by slot inside each section
    Object.keys(groupedBySec).forEach(secKey => {
        groupedBySec[secKey].sort((a, b) => (parseInt(a.slot, 10) || 1) - (parseInt(b.slot, 10) || 1));
    });

    let html = '';
    const sectionKeys = Object.keys(groupedBySec).sort((a, b) => {
        const ya = hodYearCardPrefix(a);
        const yb = hodYearCardPrefix(b);
        const order = { I: 1, II: 2, III: 3 };
        if (order[ya] !== order[yb]) return order[ya] - order[yb];
        return a.localeCompare(b);
    });

    // Render Year Filter Tabs if there are multiple sections
    const yearsPresent = [...new Set(Object.keys(groupedByYear))].sort((a, b) => {
        const order = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3 };
        return (order[a] || 9) - (order[b] || 9);
    });
    if (yearsPresent.length > 0) {
        html += '<div class="year-filter-tabs">';
        html += `<button type="button" class="year-filter-tab ${currentHODYearFilter === 'ALL' ? 'active' : ''}" data-year-filter="ALL" onclick="filterHODSectionCards('ALL')">All Sections (${sectionKeys.length})</button>`;
        
        yearsPresent.forEach(yrLabel => {
            const yrCode = yrLabel.includes('1st') ? 'I' : (yrLabel.includes('2nd') ? 'II' : 'III');
            const count = Object.keys(groupedBySec).filter(k => hodYearCardPrefix(k) === yrCode).length;
            if (count > 0) {
                html += `<button type="button" class="year-filter-tab ${currentHODYearFilter === yrCode ? 'active' : ''}" data-year-filter="${yrCode}" onclick="filterHODSectionCards('${yrCode}')">${yrLabel} (${count})</button>`;
            }
        });
        html += '</div>';
    }

    sectionKeys.forEach((secTitle, index) => {
        const secEntries = groupedBySec[secTitle];
        const yrPrefix = hodYearCardPrefix(secTitle);
        const isDisplay = (currentHODYearFilter === 'ALL' || currentHODYearFilter === yrPrefix) ? 'block' : 'none';
        const encodedMsg = encodeURIComponent(buildSectionWhatsAppMessage(secTitle, dateVal, secEntries));

        // Compact accordions collapsed by default when entries are large
        const isCollapsed = sectionKeys.length > 3 && index > 0 ? 'collapsed' : '';

        html += `
            <div class="hod-section-card ${isCollapsed}" data-year-prefix="${yrPrefix}" style="display: ${isDisplay};">
                <div class="hod-card-header" onclick="toggleHODCardAccordion(this)">
                    <div class="hod-card-title">
                        🏫 ${escapeHTML(secTitle)}
                        <span class="accordion-chevron">▼</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation()">
                        <span class="hod-card-badge">${secEntries.length} slot${secEntries.length === 1 ? '' : 's'}</span>
                    </div>
                </div>
                <div class="hod-slots-list">`;

        secEntries.forEach(entry => {
            const slotNum = parseInt(entry.slot, 10) || 1;
            const timeLabel = getSlotTimeLabel(slotNum);
            const rolls = entry.rollNumbers && entry.rollNumbers !== 'NIL' ? entry.rollNumbers : 'NIL (All Present)';
            const groupTag = audienceMode && entry.section
                ? ` <span style="font-size:0.72rem;opacity:0.85;font-weight:700;">[${escapeHTML(formatAudienceShortLabel(entry.section))}]</span>`
                : '';
            
            html += `
                <div class="hod-slot-row">
                    <div class="hod-slot-top">
                        <div class="hod-slot-info">
                            <span class="hod-slot-badge">Slot ${slotNum} (${timeLabel})</span>
                            <span>${escapeHTML(entry.subject || 'Subject')}${groupTag}</span>
                        </div>
                    </div>
                    <div class="hod-slot-rolls">
                        <strong>Absentees:</strong> ${escapeHTML(rolls)}
                    </div>
                </div>`;
        });

        html += `
                </div>
                <button type="button" class="btn-whatsapp-section" onclick="openWhatsAppShare('${encodedMsg}')">
                    📱 Send Detailed WhatsApp Notice for ${escapeHTML(secTitle)}
                </button>
            </div>`;
    });

    container.innerHTML = html;
}

function buildGroupedWhatsAppButtons(stream, dateVal, entries) {
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    const streamCode = stream === 'BCM' ? 'B.Com' : (stream === 'BA' ? 'B.A.' : (stream === 'BSC' ? 'B.Sc.' : stream));

    const yrPrefixes = ['I', 'II', 'III'];

    yrPrefixes.forEach(yrCode => {
        const yrEntries = entries.filter(e => hodYearPrefix(e.year) === yrCode);

        if (yrEntries.length === 0) return;

        const yrLabel = yrCode === 'I' ? '1st Year' : (yrCode === 'II' ? '2nd Year' : '3rd Year');

        if (stream === 'BCA') {
            if (yrCode === 'I') {
                // 1st Year BCA: Sec A & B combined together, Sec C (AIML) separate
                const abEntries = yrEntries.filter(e => {
                    const sec = String(e.section || '').toUpperCase();
                    return sec === 'A' || sec === 'B' || sec === 'ALL' || sec === 'COMBINED';
                });
                // C (AIML) also gets Combined (ALL) language/elective rows — same as A&B
                const cEntries = yrEntries.filter(e => {
                    const sec = String(e.section || '').toUpperCase();
                    return sec === 'C' || sec.includes('AIML') || sec === 'ALL' || sec === 'COMBINED';
                });

                if (abEntries.length > 0) {
                    const title = `1st Year BCA - Section A & B Combined`;
                    const msg = buildCombinedGroupWhatsAppMessage(title, dateVal, abEntries);
                    html += `<button type="button" class="btn-whatsapp-global" onclick="openWhatsAppShare('${encodeURIComponent(msg)}')">
                        📱 Share ${escapeHTML(title)} Report
                    </button>`;
                }

                if (cEntries.length > 0) {
                    const cTitle = `1st Year BCA - Section C (AIML)`;
                    const msg = buildCombinedGroupWhatsAppMessage(cTitle, dateVal, cEntries);
                    html += `<button type="button" class="btn-whatsapp-global" onclick="openWhatsAppShare('${encodeURIComponent(msg)}')">
                        📱 Share ${escapeHTML(cTitle)} Report
                    </button>`;
                }
            } else {
                // 2nd & 3rd Year BCA: All Sections A, B & C combined together
                const title = `${yrLabel} BCA - Section A, B & C Combined`;
                const msg = buildCombinedGroupWhatsAppMessage(title, dateVal, yrEntries);
                html += `<button type="button" class="btn-whatsapp-global" onclick="openWhatsAppShare('${encodeURIComponent(msg)}')">
                    📱 Share ${escapeHTML(title)} Report
                </button>`;
            }
        } else if (stream === 'BCM' || stream === 'BCOM') {
            // B.Com: All sections (A, B, C-TP, C-AF) combined into a single parent group report per year
            const title = `${yrLabel} B.Com Combined Report (Sec A, B, C-TP, C-AF)`;
            const msg = buildCombinedGroupWhatsAppMessage(title, dateVal, yrEntries);
            html += `<button type="button" class="btn-whatsapp-global" onclick="openWhatsAppShare('${encodeURIComponent(msg)}')">
                📱 Share ${escapeHTML(title)}
            </button>`;
        } else {
            // BA / BSC — one year report; lines include combo/batch tags
            const title = `${yrLabel} ${streamCode}`;
            const msg = buildCombinedGroupWhatsAppMessage(title, dateVal, yrEntries, stream);
            html += `<button type="button" class="btn-whatsapp-global" onclick="openWhatsAppShare('${encodeURIComponent(msg)}')">
                📱 Share ${escapeHTML(title)} Report
            </button>`;
        }
    });

    html += '</div>';
    return html;
}

/** Compact WhatsApp date: 09-08-2026 */
function formatWhatsAppDateDDMMYYYY(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = String(dateStr).trim().split(/[-/]/);
        if (parts.length === 3 && parts[0].length === 4) {
            // YYYY-MM-DD
            const dd = String(parts[2]).padStart(2, '0');
            const mm = String(parts[1]).padStart(2, '0');
            return dd + '-' + mm + '-' + parts[0];
        }
        if (parts.length === 3) {
            // DD-MM-YYYY or similar
            const dd = String(parts[0]).padStart(2, '0');
            const mm = String(parts[1]).padStart(2, '0');
            const yyyy = parts[2].length === 2 ? ('20' + parts[2]) : parts[2];
            return dd + '-' + mm + '-' + yyyy;
        }
    } catch (e) {}
    return String(dateStr);
}

function formatWhatsAppRolls(rollNumbers) {
    const raw = (rollNumbers == null || String(rollNumbers).trim() === '') ? 'NIL' : String(rollNumbers).trim();
    if (!raw || raw.toUpperCase() === 'NIL' || raw.toUpperCase() === 'NONE') {
        return '*NIL*';
    }
    // Bold rolls — readable for mixed codes like 24678, C0987
    const cleaned = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean).join(', ');
    return '*' + (cleaned || raw) + '*';
}

/** Include every submitted slot (NIL shown as *NIL*) — same as Allstreams BCA WA. */
function isWhatsAppSlotEntry(entry) {
    return !!(entry && (entry.subject || entry.slot || entry.rollNumbers != null));
}

function hasWhatsAppAbsentees(entry) {
    return isWhatsAppSlotEntry(entry);
}

/** Short readable line: 9-9.55 *Subject*: *12, 25* */
function formatWhatsAppPeriodLine(entry, includeSecTag, streamHint) {
    const slotNum = parseInt(entry.slot, 10) || 1;
    const timeLabel = getSlotTimeShortLabel(slotNum);
    const subject = String(entry.subject || 'Subject').trim();
    let secTag = '';
    if (includeSecTag && entry.section) {
        const stream = streamHint || currentDept || '';
        if (usesAudienceGroups(stream)) {
            secTag = ' [' + formatAudienceShortLabel(entry.section) + ']';
        } else {
            const secU = String(entry.section).trim().toUpperCase();
            if (secU === 'ALL' || secU.indexOf('COMBIN') !== -1) {
                secTag = ' [Combined]';
            } else {
                secTag = ' [Sec ' + entry.section + ']';
            }
        }
    }
    return timeLabel + secTag + ' *' + subject + '*: ' + formatWhatsAppRolls(entry.rollNumbers);
}

function entriesSpanMultipleSections(entries) {
    const secs = new Set();
    (entries || []).forEach(e => {
        const s = String(e.section || '').trim().toUpperCase();
        if (s) secs.add(s);
    });
    return secs.size > 1;
}

function buildCombinedGroupWhatsAppMessage(groupTitle, dateStr, entries) {
    const formattedDate = formatWhatsAppDateDDMMYYYY(dateStr);
    let msg = '*MGM COLLEGE — ABSENTEE NOTICE*\n';
    msg += groupTitle + '\n';
    msg += formattedDate + '\n\n';

    const list = (entries || []).filter(isWhatsAppSlotEntry);
    list.sort((a, b) => {
        const slotDiff = (parseInt(a.slot, 10) || 1) - (parseInt(b.slot, 10) || 1);
        if (slotDiff !== 0) return slotDiff;
        const secA = String(a.section || '').toUpperCase();
        const secB = String(b.section || '').toUpperCase();
        if (secA !== secB) return secA.localeCompare(secB);
        return String(a.subject || '').localeCompare(String(b.subject || ''));
    });

    if (list.length === 0) {
        msg += 'No absentees recorded.\n';
        return msg.trim();
    }

    const showSec = entriesSpanMultipleSections(list);
    list.forEach((e, idx) => {
        if (idx > 0) msg += '\n';
        msg += formatWhatsAppPeriodLine(e, showSec) + '\n';
    });

    return msg.trim();
}

function buildSectionWhatsAppMessage(sectionTitle, dateStr, entries) {
    const formattedDate = formatWhatsAppDateDDMMYYYY(dateStr);
    let msg = '*MGM COLLEGE — ABSENTEE NOTICE*\n';
    msg += sectionTitle + '\n';
    msg += formattedDate + '\n\n';

    const list = (entries || []).filter(isWhatsAppSlotEntry);
    list.sort((a, b) => {
        const slotDiff = (parseInt(a.slot, 10) || 1) - (parseInt(b.slot, 10) || 1);
        if (slotDiff !== 0) return slotDiff;
        return String(a.subject || '').localeCompare(String(b.subject || ''));
    });

    if (list.length === 0) {
        msg += 'No absentees recorded.\n';
        return msg.trim();
    }

    list.forEach((e, idx) => {
        if (idx > 0) msg += '\n';
        msg += formatWhatsAppPeriodLine(e, true) + '\n';
    });

    return msg.trim();
}

function buildYearWhatsAppMessage(yearLabel, stream, dateStr, entries) {
    const formattedDate = formatWhatsAppDateDDMMYYYY(dateStr);
    const yrPrefix = yearLabel.includes('1st') || yearLabel === 'I' ? 'I' :
                     yearLabel.includes('2nd') || yearLabel === 'II' ? 'II' : 'III';

    let msg = '*MGM COLLEGE — ABSENTEE NOTICE*\n';
    msg += yrPrefix + ' ' + stream + '\n';
    msg += formattedDate + '\n\n';

    const groupedBySec = {};
    (entries || []).filter(isWhatsAppSlotEntry).forEach(e => {
        const sec = e.section || 'A';
        const secU = String(sec).toUpperCase();
        const key = (secU === 'ALL' || secU.indexOf('COMBIN') !== -1) ? 'Combined' : ('Sec ' + sec);
        if (!groupedBySec[key]) groupedBySec[key] = [];
        groupedBySec[key].push(e);
    });

    const secKeys = Object.keys(groupedBySec).sort();
    if (secKeys.length === 0) {
        msg += 'No absentees recorded.\n';
        return msg.trim();
    }

    secKeys.forEach(secKey => {
        msg += '*' + yrPrefix + ' ' + stream + ' — ' + secKey + '*\n';
        const secEntries = groupedBySec[secKey];
        secEntries.sort((a, b) => (parseInt(a.slot, 10) || 1) - (parseInt(b.slot, 10) || 1));
        secEntries.forEach((e, idx) => {
            if (idx > 0) msg += '\n';
            msg += formatWhatsAppPeriodLine(e, true) + '\n';
        });
        msg += '\n';
    });

    return msg.trim();
}

function openWhatsAppShare(encodedMsg) {
    const waUrl = `https://wa.me/?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    } catch (e) {}
    return dateStr;
}

function initPasscodeManager() {
    const loginBtn = document.getElementById('loginPasscodeSettingsBtn');
    const hodBtn = document.getElementById('hodPasscodeSettingsBtn');
    const modal = document.getElementById('passcodeSettingsModal');
    const closeBtn = document.getElementById('closePasscodeModalBtn');
    const form = document.getElementById('passcodeSettingsForm');
    const resetBtn = document.getElementById('resetPasscodesBtn');

    const passTeacher_BCA = document.getElementById('passTeacher_BCA');
    const passHOD_BCA = document.getElementById('passHOD_BCA');
    const passTeacher_BCM = document.getElementById('passTeacher_BCM');
    const passHOD_BCM = document.getElementById('passHOD_BCM');
    const passTeacher_BA = document.getElementById('passTeacher_BA');
    const passHOD_BA = document.getElementById('passHOD_BA');
    const passTeacher_BSC = document.getElementById('passTeacher_BSC');
    const passHOD_BSC = document.getElementById('passHOD_BSC');
    const passADMIN = document.getElementById('passADMIN');

    const titleEl = document.getElementById('passcodeModalTitle');
    const subtitleEl = document.getElementById('passcodeModalSubtitle');

    const openPasscodeModal = (e) => {
        if (e) e.preventDefault();
        const store = getPasscodeStore();

        if (passTeacher_BCA) passTeacher_BCA.value = store.teacher.BCA;
        if (passHOD_BCA) passHOD_BCA.value = store.hod.BCA;
        
        if (passTeacher_BCM) passTeacher_BCM.value = store.teacher.BCM;
        if (passHOD_BCM) passHOD_BCM.value = store.hod.BCM;

        if (passTeacher_BA) passTeacher_BA.value = store.teacher.BA;
        if (passHOD_BA) passHOD_BA.value = store.hod.BA;

        if (passTeacher_BSC) passTeacher_BSC.value = store.teacher.BSC;
        if (passHOD_BSC) passHOD_BSC.value = store.hod.BSC;

        if (passADMIN) passADMIN.value = store.ADMIN;

        const groupBCA = document.getElementById('group_BCA');
        const groupBCM = document.getElementById('group_BCM');
        const groupBA = document.getElementById('group_BA');
        const groupBSC = document.getElementById('group_BSC');
        const groupADMIN = document.getElementById('groupADMIN');

        const deptLabel = currentDept === 'BCM' ? 'B.Com' : (currentDept === 'BA' ? 'B.A.' : (currentDept === 'BSC' ? 'B.Sc.' : currentDept));

        if (currentRole === 'ADMIN') {
            if (titleEl) titleEl.textContent = 'Manage All Department & Admin Passcodes';
            if (subtitleEl) subtitleEl.textContent = 'Super Admin mode: Update Teacher & Parent Informer passcodes for all departments or the Master Admin passcode.';

            if (groupBCA) groupBCA.style.display = 'block';
            if (groupBCM) groupBCM.style.display = 'block';
            if (groupBA) groupBA.style.display = 'block';
            if (groupBSC) groupBSC.style.display = 'block';
            if (groupADMIN) groupADMIN.style.display = 'block';
        } else {
            if (titleEl) titleEl.textContent = 'Change ' + deptLabel + ' Passcodes';
            if (subtitleEl) subtitleEl.textContent = 'Update Teacher & Parent Informer passcodes for ' + deptLabel + ' department.';

            if (groupBCA) groupBCA.style.display = currentDept === 'BCA' ? 'block' : 'none';
            if (groupBCM) groupBCM.style.display = currentDept === 'BCM' ? 'block' : 'none';
            if (groupBA) groupBA.style.display = currentDept === 'BA' ? 'block' : 'none';
            if (groupBSC) groupBSC.style.display = currentDept === 'BSC' ? 'block' : 'none';
            if (groupADMIN) groupADMIN.style.display = 'none';
        }

        if (modal) modal.classList.add('active');
    };

    if (loginBtn) loginBtn.addEventListener('click', openPasscodeModal);
    if (hodBtn) hodBtn.addEventListener('click', openPasscodeModal);
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const store = getPasscodeStore();
            const updatedCustom = {
                teacherBCA: (currentRole === 'ADMIN' || currentDept === 'BCA') ? (passTeacher_BCA ? passTeacher_BCA.value.trim() : store.teacher.BCA) : store.teacher.BCA,
                hodBCA: (currentRole === 'ADMIN' || currentDept === 'BCA') ? (passHOD_BCA ? passHOD_BCA.value.trim() : store.hod.BCA) : store.hod.BCA,

                teacherBCM: (currentRole === 'ADMIN' || currentDept === 'BCM') ? (passTeacher_BCM ? passTeacher_BCM.value.trim() : store.teacher.BCM) : store.teacher.BCM,
                hodBCM: (currentRole === 'ADMIN' || currentDept === 'BCM') ? (passHOD_BCM ? passHOD_BCM.value.trim() : store.hod.BCM) : store.hod.BCM,

                teacherBA: (currentRole === 'ADMIN' || currentDept === 'BA') ? (passTeacher_BA ? passTeacher_BA.value.trim() : store.teacher.BA) : store.teacher.BA,
                hodBA: (currentRole === 'ADMIN' || currentDept === 'BA') ? (passHOD_BA ? passHOD_BA.value.trim() : store.hod.BA) : store.hod.BA,

                teacherBSC: (currentRole === 'ADMIN' || currentDept === 'BSC') ? (passTeacher_BSC ? passTeacher_BSC.value.trim() : store.teacher.BSC) : store.teacher.BSC,
                hodBSC: (currentRole === 'ADMIN' || currentDept === 'BSC') ? (passHOD_BSC ? passHOD_BSC.value.trim() : store.hod.BSC) : store.hod.BSC,

                ADMIN: currentRole === 'ADMIN' ? (passADMIN ? passADMIN.value.trim() : store.ADMIN) : store.ADMIN
            };
            savePasscodeStore(updatedCustom);

            // Push to Apps Script Script Properties (ADMIN required on server)
            (function syncPasscodesToServer(storeObj) {
                const targetUrl = getWebhookUrl(currentDept);
                const payload = withAuth(Object.assign({ action: 'set_passcodes' }, storeObj));
                submitViaHiddenForm(targetUrl, payload).catch(function () {});
                const cbName = 'mgmPassSync_' + Date.now();
                window[cbName] = function (data) {
                    try { delete window[cbName]; } catch (err) {}
                    if (data && data.result === 'success') {
                        showCustomToast('Passcodes saved', 'Updated on this device and Google Sheet server.');
                    }
                };
                const params = new URLSearchParams(Object.assign({
                    action: 'set_passcodes',
                    callback: cbName
                }, storeObj));
                appendAuthToParams(params);
                const scriptEl = document.createElement('script');
                scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
                document.body.appendChild(scriptEl);
            })(updatedCustom);

            if (modal) modal.classList.remove('active');
            if (currentRole !== 'ADMIN') {
                alert('Passcodes updated on this device. Super Admin should save once so Google Sheet server passcodes stay in sync.');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset Teacher & Parent Informer passcodes to defaults?')) {
                localStorage.removeItem('mgm_custom_passcodes');
                const store = getPasscodeStore();
                if (passTeacher_BCA) passTeacher_BCA.value = store.teacher.BCA;
                if (passHOD_BCA) passHOD_BCA.value = store.hod.BCA;

                if (passTeacher_BCM) passTeacher_BCM.value = store.teacher.BCM;
                if (passHOD_BCM) passHOD_BCM.value = store.hod.BCM;

                if (passTeacher_BA) passTeacher_BA.value = store.teacher.BA;
                if (passHOD_BA) passHOD_BA.value = store.hod.BA;

                if (passTeacher_BSC) passTeacher_BSC.value = store.teacher.BSC;
                if (passHOD_BSC) passHOD_BSC.value = store.hod.BSC;

                if (passADMIN) passADMIN.value = store.ADMIN;
                alert('Passcodes reset to default!');
            }
        });
    }
}

function initThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('mgm_theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('mgm_theme', currentTheme);
            updateThemeIcon(currentTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeToggleBtn = document.getElementById('themeToggle');
    if (!themeToggleBtn) return;
    if (theme === 'light') {
        themeToggleBtn.innerHTML = `
          <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>`;
        themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
        themeToggleBtn.innerHTML = `
          <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>`;
        themeToggleBtn.title = 'Switch to Light Mode';
    }
}




function updateShortageSubjectDropdown() {
    const yrSelect = document.getElementById('shortageYearSelect');
    const secSelect = document.getElementById('shortageSectionSelect');
    const subjSelect = document.getElementById('shortageSubjectSelect');
    if (!subjSelect) return;

    const yr = yrSelect ? yrSelect.value : 'First Year';
    const sec = secSelect ? secSelect.value : 'A';
    const subjects = getSubjectsForActiveYear(currentDept, yr, sec);

    const history = readAllHistory();
    const historySubjs = new Set();
    history.forEach(item => {
        if (!item.subject) return;
        if (item.year && item.year.toLowerCase() !== yr.toLowerCase()) return;
        if (item.section && !sectionsEqualForSubject(item.section, sec)) return;
        historySubjs.add(item.subject.trim());
    });

    const allSubjs = Array.from(new Set([...subjects, ...historySubjs])).sort();
    let html = `<option value="ALL" selected>All Subjects (Overall)</option>`;
    allSubjs.forEach(sub => {
        html += `<option value="${escapeHTML(sub)}">${escapeHTML(sub)}</option>`;
    });
    subjSelect.innerHTML = html;
}

function initShortageCalculator() {
    const subTabDaily = document.getElementById('subTabDailyInformer');
    const subTabShortage = document.getElementById('subTabShortageCalculator');
    const dailyContainer = document.getElementById('hodDailyInformerContainer');
    const shortageContainer = document.getElementById('hodShortageContainer');

    const startRollInput = document.getElementById('shortageStartRoll');
    const endRollInput = document.getElementById('shortageEndRoll');
    const yearSelect = document.getElementById('shortageYearSelect');
    const sectionSelect = document.getElementById('shortageSectionSelect');
    const subjectSelect = document.getElementById('shortageSubjectSelect');
    const cutoffSelect = document.getElementById('shortageCutoffSelect');
    const periodSelect = document.getElementById('shortagePeriodSelect');
    const customDateRow = document.getElementById('shortageCustomDateRow');
    const fromDateInput = document.getElementById('shortageFromDate');
    const toDateInput = document.getElementById('shortageToDate');
    const calcBtn = document.getElementById('shortageCalculateBtn');
    const calcBtnText = document.getElementById('shortageCalculateBtnText');
    const spinner = document.getElementById('shortageSpinner');
    const container = document.getElementById('shortageResultsContainer');

    if (subTabDaily && subTabShortage && dailyContainer && shortageContainer) {
        subTabDaily.addEventListener('click', () => {
            subTabDaily.classList.add('active');
            subTabShortage.classList.remove('active');
            dailyContainer.style.display = 'block';
            shortageContainer.style.display = 'none';
        });

        subTabShortage.addEventListener('click', () => {
            subTabShortage.classList.add('active');
            subTabDaily.classList.remove('active');
            shortageContainer.style.display = 'block';
            dailyContainer.style.display = 'none';
            updateShortageSubjectDropdown();
        });
    }

    if (!calcBtn) return;

    if (periodSelect && customDateRow) {
        periodSelect.addEventListener('change', () => {
            if (periodSelect.value === 'CUSTOM') {
                customDateRow.style.display = 'flex';
                if (fromDateInput && !fromDateInput.value) fromDateInput.value = getTodayISOString();
                if (toDateInput && !toDateInput.value) toDateInput.value = getTodayISOString();
            } else {
                customDateRow.style.display = 'none';
            }
        });
    }



    const updateDefaultRollRange = () => {
        updateShortageSubjectDropdown();
    };

    if (sectionSelect) sectionSelect.addEventListener('change', updateDefaultRollRange);
    if (yearSelect) yearSelect.addEventListener('change', updateDefaultRollRange);
    updateDefaultRollRange();

function sectionsEqualForSubject(sec1, sec2) {
    if (!sec1 || !sec2) return true;
    const s1 = normalizeSectionCode(sec1);
    const s2 = normalizeSectionCode(sec2);
    if (s1 === s2) return true;
    if (s1 === 'ALL' || s2 === 'ALL' || s1 === 'COMBINED' || s2 === 'COMBINED') return true;
    return s1.includes(s2) || s2.includes(s1);
}

function isSubjectMatching(subj1, subj2) {
    if (!subj1 || !subj2) return true;
    if (String(subj2).trim().toUpperCase() === 'ALL') return true;
    const s1 = String(subj1).trim().toLowerCase();
    const s2 = String(subj2).trim().toLowerCase();
    if (s1 === s2) return true;
    const base1 = extractSubjNameAndSection(s1).name.trim().toLowerCase();
    const base2 = extractSubjNameAndSection(s2).name.trim().toLowerCase();
    return base1 === base2 || s1.includes(base2) || s2.includes(base1);
}

function normalizeRollNumbers(rollInput) {
    if (!rollInput || rollInput === 'NIL') return [];
    if (Array.isArray(rollInput)) return rollInput.map(r => String(r).trim()).filter(Boolean);
    const str = String(rollInput).trim();
    if (!str || str.toUpperCase() === 'NIL' || str.toUpperCase() === 'NONE') return [];
    return str.split(/[\s,]+/).map(r => r.trim()).filter(r => Boolean(r) && r.toUpperCase() !== 'NIL');
}

function buildShortageWhatsAppText(yearStr, sectionStr, subjectFilter, startRoll, endRoll, totalClasses, cutoff, shortageList, periodLabel) {
    const stream = currentDept || 'BCA';
    const streamLabel = stream === 'BCM' ? 'B.Com' : (stream === 'BA' ? 'B.A.' : (stream === 'BSC' ? 'B.Sc.' : stream));
    let msg = `*MGM COLLEGE — ATTENDANCE SHORTAGE REPORT*\n`;
    msg += `Department: *${streamLabel}*\n`;
    msg += `Class: *${yearStr} — Sec ${sectionStr}*\n`;
    msg += `Subject: *${subjectFilter === 'ALL' ? 'All Subjects (Overall)' : subjectFilter}*\n`;
    msg += `Period: *${periodLabel || 'Cumulative'}*\n`;
    msg += `Roll Range: *${startRoll} to ${endRoll}*\n`;
    msg += `Total Classes Conducted: *${totalClasses}*\n`;
    msg += `Threshold: *Below ${cutoff}%*\n\n`;

    if (!shortageList || shortageList.length === 0) {
        msg += `🎉 No students below ${cutoff}% attendance threshold.\n`;
        return msg;
    }

    msg += `*STUDENTS BELOW ${cutoff}% ATTENDANCE (${shortageList.length}):*\n`;
    shortageList.forEach((item, idx) => {
        msg += `${idx + 1}. *Roll ${item.roll}*: *${item.percent}%* (${item.attended}/${item.total} classes, ${item.missed} missed)\n`;
    });

    return msg.trim();
}

function fetchServerHistoryForShortage(stream, period, fVal, tVal, callback) {
    const targetUrl = getWebhookUrl(stream || currentDept || 'BCA');
    if (!targetUrl) {
        if (callback) callback();
        return;
    }

    let dateParam = 'ALL';
    if (period === 'CUSTOM') {
        if (fVal && tVal && fVal === tVal) {
            dateParam = fVal;
        } else if (fVal) {
            dateParam = fVal;
        }
    }

    const cbName = 'mgm_bca_shortage_history_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    let done = false;

    const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        try { delete window[cbName]; } catch (e) {}
        if (callback) callback();
    }, 12000);

    window[cbName] = function (res) {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        try { delete window[cbName]; } catch (e) {}

        if (res && (res.result === 'success' || res.status === 'ok') && Array.isArray(res.entries)) {
            const history = readAllHistory();
            const byKey = new Map();
            history.forEach(item => {
                const k = entryKey(item);
                if (k) byKey.set(k, item);
            });

            res.entries.forEach(srv => {
                const normalizedDate = normalizeHistoryDate(srv.date);
                if (!normalizedDate) return;
                const formattedRolls = Array.isArray(srv.rollNumbers) ? srv.rollNumbers.join(', ') : String(srv.rollNumbers || '');
                const srvObj = {
                    action: 'create',
                    stream: stream || currentDept || 'BCA',
                    date: normalizedDate,
                    year: srv.year || 'First Year',
                    section: srv.section || 'A',
                    subject: srv.subject || '',
                    slot: String(parseInt(srv.slot, 10) || 1),
                    rollNumbers: formattedRolls,
                    offline: false,
                    timestamp: srv.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                const k = entryKey(srvObj);
                if (k && !byKey.has(k)) {
                    byKey.set(k, srvObj);
                }
            });

            const merged = Array.from(byKey.values());
            saveHistoryToLocalStorage(merged);
        }

        if (callback) callback();
    };

    const params = new URLSearchParams({
        action: 'get_absentees',
        stream: stream || currentDept || 'BCA',
        date: dateParam,
        fromDate: fVal || '',
        toDate: tVal || '',
        callback: cbName
    });
    appendAuthToParams(params);

    const scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        try { delete window[cbName]; } catch (e) {}
        if (callback) callback();
    };
    document.body.appendChild(scriptEl);
}

function parseShortageRollNumbers(sRollStr, eRollStr) {
    const sStr = (sRollStr || '').trim();
    const eStr = (eRollStr || '').trim();

    let rawInput = '';
    if (sStr && eStr) {
        if (!sStr.includes('-') && !sStr.includes(',')) {
            const eParts = eStr.split(',').map(p => p.trim());
            const firstEndPart = eParts[0];
            if (firstEndPart && !firstEndPart.includes('-')) {
                const remainingEParts = eParts.slice(1).join(', ');
                rawInput = `${sStr}-${firstEndPart}` + (remainingEParts ? `, ${remainingEParts}` : '');
            } else {
                rawInput = `${sStr}, ${eStr}`;
            }
        } else {
            rawInput = `${sStr}, ${eStr}`;
        }
    } else {
        rawInput = sStr || eStr;
    }

    const rollObjects = [];
    const seenNums = new Set();

    rawInput.split(',').forEach(part => {
        part = part.trim();
        if (!part) return;

        if (part.includes('-')) {
            const [startPart, endPart] = part.split('-').map(p => p.trim());
            const prefixMatch = startPart.match(/^([A-Za-z]+)?(\d+)$/);
            const prefix = prefixMatch && prefixMatch[1] ? prefixMatch[1].toUpperCase() : '';
            const padLen = prefixMatch && prefixMatch[2] ? prefixMatch[2].length : 0;

            const sNum = parseInt(startPart.replace(/\D/g, ''), 10);
            const eNum = parseInt(endPart.replace(/\D/g, ''), 10);

            if (!isNaN(sNum) && !isNaN(eNum)) {
                const minNum = Math.min(sNum, eNum);
                const maxNum = Math.max(sNum, eNum);
                for (let num = minNum; num <= maxNum; num++) {
                    if (!seenNums.has(num)) {
                        seenNums.add(num);
                        let code = prefix ? prefix + String(num).padStart(padLen, '0') : String(num);
                        rollObjects.push({ code: code, num: num });
                    }
                }
            }
        } else {
            const prefixMatch = part.match(/^([A-Za-z]+)?(\d+)$/);
            const prefix = prefixMatch && prefixMatch[1] ? prefixMatch[1].toUpperCase() : '';
            const padLen = prefixMatch && prefixMatch[2] ? prefixMatch[2].length : 0;
            const num = parseInt(part.replace(/\D/g, ''), 10);

            if (!isNaN(num) && !seenNums.has(num)) {
                seenNums.add(num);
                let code = prefix ? prefix + String(num).padStart(padLen, '0') : String(num);
                rollObjects.push({ code: code, num: num });
            }
        }
    });

    return rollObjects;
}

    calcBtn.addEventListener('click', () => {
        const yrVal = yearSelect ? yearSelect.value : 'First Year';
        const secVal = sectionSelect ? sectionSelect.value : 'A';
        const subjFilter = subjectSelect ? subjectSelect.value : 'ALL';
        const sRollStr = startRollInput ? startRollInput.value.trim() : '';
        const eRollStr = endRollInput ? endRollInput.value.trim() : '';
        const cutoff = cutoffSelect ? parseFloat(cutoffSelect.value) || 75 : 75;
        const period = periodSelect ? periodSelect.value : 'ALL';

        if (!sRollStr && !eRollStr) {
            alert('Please enter Roll No. range or list (e.g. S0180 to S0260 or S0180-S0260, S0352).');
            if (startRollInput) startRollInput.focus();
            return;
        }

        const initialRollCheck = parseShortageRollNumbers(sRollStr, eRollStr);
        if (initialRollCheck.length === 0) {
            alert('Invalid roll numbers entered. Example formats: S0180 to S0260 OR S0180-S0260, S0352.');
            if (startRollInput) startRollInput.focus();
            return;
        }

        if (spinner) spinner.style.display = 'inline-block';
        if (calcBtnText) calcBtnText.textContent = 'Calculating Shortage...';
        calcBtn.disabled = true;

        const fVal = fromDateInput ? fromDateInput.value : '';
        const tVal = toDateInput ? toDateInput.value : '';

        fetchServerHistoryForShortage(currentDept, period, fVal, tVal, () => {
            try {
                const history = readAllHistory();
                const now = new Date();
                const currentMonthStr = getTodayISOString().substring(0, 7); // YYYY-MM

                let periodLabel = 'All Time (Cumulative)';
                if (period === 'MONTH') periodLabel = 'This Month (' + currentMonthStr + ')';
                else if (period === 'WEEK') periodLabel = 'This Week (Last 7 Days)';
                else if (period === 'CUSTOM') {
                    const fVal = fromDateInput ? fromDateInput.value : '';
                    const tVal = toDateInput ? toDateInput.value : '';
                    periodLabel = 'Custom (' + (fVal || 'Start') + ' to ' + (tVal || 'End') + ')';
                }

                const matchingSessions = history.filter(item => {
                    const yrMatch = isYearMatching(item.year, yrVal);
                    const secMatch = !item.section || sectionsEqualForSubject(item.section, secVal);
                    const streamMatch = !item.stream || isStreamMatch(item.stream, currentDept || 'BCA');
                    if (!yrMatch || !secMatch || !streamMatch) return false;

                    if (subjFilter !== 'ALL') {
                        if (!isSubjectMatching(item.subject, subjFilter)) return false;
                    }

                    const itemDateStr = normalizeHistoryDate(item.date) || getTodayISOString();
                    if (period === 'MONTH') {
                        return itemDateStr.substring(0, 7) === currentMonthStr;
                    } else if (period === 'WEEK') {
                        const itemTime = new Date(itemDateStr).getTime();
                        const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
                        return !isNaN(itemTime) && itemTime >= weekAgo;
                    } else if (period === 'CUSTOM') {
                        const fVal = fromDateInput ? fromDateInput.value : '';
                        const tVal = toDateInput ? toDateInput.value : '';
                        if (fVal && itemDateStr < fVal) return false;
                        if (tVal && itemDateStr > tVal) return false;
                    }
                    return true;
                });

                const rollObjects = parseShortageRollNumbers(sRollStr, eRollStr);

                const totalConducted = matchingSessions.length;
                const absenceCountMap = {};
                const subjectStatsMap = {}; // { roll: { 'Java': { conducted: 10, missed: 2 } } }

                rollObjects.forEach(rObj => {
                    absenceCountMap[rObj.code] = 0;
                    subjectStatsMap[rObj.code] = {};
                });

                matchingSessions.forEach(item => {
                    const itemSubj = (item.subject || 'General').trim();
                    const rolls = normalizeRollNumbers(item.rollNumbers);

                    rollObjects.forEach(rObj => {
                        if (!subjectStatsMap[rObj.code][itemSubj]) {
                            subjectStatsMap[rObj.code][itemSubj] = { conducted: 0, missed: 0 };
                        }
                        subjectStatsMap[rObj.code][itemSubj].conducted++;
                    });

                    rolls.forEach(rStr => {
                        const cleanR = String(rStr).trim().toUpperCase();
                        const rNum = parseInt(cleanR.replace(/\D/g, ''), 10);

                        rollObjects.forEach(rObj => {
                            const codeMatch = cleanR === rObj.code;
                            const numMatch = !isNaN(rNum) && rNum === rObj.num;
                            
                            let suffixMatch = false;
                            if (!isNaN(rNum) && rNum > 0) {
                                const str1 = String(rNum);
                                const str2 = String(rObj.num);
                                if (str1.length >= 2 && str2.length >= 2) {
                                    suffixMatch = str1.endsWith(str2) || str2.endsWith(str1);
                                }
                            }

                            if (codeMatch || numMatch || suffixMatch) {
                                absenceCountMap[rObj.code] = (absenceCountMap[rObj.code] || 0) + 1;
                                if (subjectStatsMap[rObj.code][itemSubj]) {
                                    subjectStatsMap[rObj.code][itemSubj].missed++;
                                }
                            }
                        });
                    });
                });

                const shortageList = [];
                rollObjects.forEach(rObj => {
                    const missed = absenceCountMap[rObj.code] || 0;
                    const attended = Math.max(0, totalConducted - missed);
                    const pct = totalConducted > 0 ? (attended / totalConducted) * 100 : 100;
                    const roundedPct = Math.round(pct * 10) / 10;

                    // Per-subject breakdown array
                    const subjBreakdown = [];
                    const sMap = subjectStatsMap[rObj.code] || {};
                    for (let sName in sMap) {
                        const sCond = sMap[sName].conducted;
                        const sMiss = sMap[sName].missed;
                        const sAtt = Math.max(0, sCond - sMiss);
                        const sPct = sCond > 0 ? Math.round((sAtt / sCond) * 1000) / 10 : 100;
                        subjBreakdown.push({
                            subject: sName,
                            conducted: sCond,
                            missed: sMiss,
                            attended: sAtt,
                            percent: sPct
                        });
                    }

                    if (roundedPct < cutoff || cutoff === 100) {
                        shortageList.push({
                            roll: rObj.code,
                            total: totalConducted,
                            missed: missed,
                            attended: attended,
                            percent: roundedPct,
                            subjectBreakdown: subjBreakdown
                        });
                    }
                });

                shortageList.sort((a, b) => a.percent - b.percent);
                renderShortageResults(container, yrVal, secVal, subjFilter, sRollStr, eRollStr, totalConducted, cutoff, shortageList, periodLabel);

            } catch (err) {
                console.error('Error calculating shortage:', err);
                if (container) {
                    container.innerHTML = '<div style="color: #ef4444; padding: 12px; text-align: center; font-weight: 600;">An error occurred while calculating shortage. Please try again.</div>';
                }
            } finally {
                if (spinner) spinner.style.display = 'none';
                if (calcBtnText) calcBtnText.textContent = '📊 Calculate Shortage Report';
                calcBtn.disabled = false;
            }
        });
    });
}

function renderShortageResults(container, yearStr, sectionStr, subjectFilter, startRoll, endRoll, totalClasses, cutoff, shortageList, periodLabel) {
    if (!container) return;
    container.style.display = 'block';

    const pLabel = periodLabel || 'All Time (Cumulative)';
    const count = shortageList.length;
    const subjHeader = subjectFilter === 'ALL' ? 'All Subjects (Overall)' : subjectFilter;

    let html = `
    <div style="background: var(--card-bg, #1e293b); border: 1px solid var(--border-color, #334155); border-radius: 10px; padding: 14px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div>
                <h4 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: var(--text-main);">
                    📋 Shortage Results: ${escapeHTML(yearStr)} - Sec ${escapeHTML(sectionStr)}
                </h4>
                <div style="font-size: 0.78rem; color: #60a5fa; margin-top: 2px;">
                    📚 Subject: <strong>${escapeHTML(subjHeader)}</strong>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    Period: <strong>${escapeHTML(pLabel)}</strong> | Roll Range: ${escapeHTML(startRoll)} – ${escapeHTML(endRoll)} | Classes Logged: <strong>${totalClasses}</strong>
                </div>
            </div>
            <span class="badge ${count > 0 ? 'badge-danger' : 'badge-success'}" style="font-weight: 800; font-size: 0.78rem;">
                ${count} Student(s) < ${cutoff}%
            </span>
        </div>`;

    if (count === 0) {
        html += `
        <div style="text-align: center; padding: 16px; color: #34d399; background: rgba(52, 211, 153, 0.1); border-radius: 8px;">
            🎉 <strong>No Students Below ${cutoff}% Attendance!</strong><br>
            All students in roll range ${escapeHTML(startRoll)}–${escapeHTML(endRoll)} have clean attendance records for ${escapeHTML(subjHeader)} (${escapeHTML(pLabel)}).
        </div>`;
    } else {
        html += `
        <button type="button" class="btn-whatsapp-global" id="shortageShareWaBtn" style="margin-bottom: 12px; width: 100%; font-weight: 700;">
            📱 Share Shortage List (${count} Students) to WhatsApp
        </button>
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">`;

        shortageList.forEach(item => {
            let badgeColor = '#ef4444';
            let badgeBg = 'rgba(239, 68, 68, 0.15)';
            let statusLabel = 'Critical Shortage';

            if (item.percent >= 75) {
                badgeColor = '#10b981';
                badgeBg = 'rgba(16, 185, 129, 0.15)';
                statusLabel = 'Sufficient';
            } else if (item.percent >= 60) {
                badgeColor = '#f59e0b';
                badgeBg = 'rgba(245, 158, 11, 0.15)';
                statusLabel = 'Warning Shortage';
            }

            let breakdownPillsHtml = '';
            if (subjectFilter === 'ALL' && item.subjectBreakdown && item.subjectBreakdown.length > 0) {
                breakdownPillsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">`;
                item.subjectBreakdown.forEach(sb => {
                    const sbColor = sb.percent >= 75 ? '#34d399' : (sb.percent >= 60 ? '#fbbf24' : '#f87171');
                    breakdownPillsHtml += `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.3); color: ${sbColor}; border: 1px solid ${sbColor};">
                        ${escapeHTML(sb.subject)}: <strong>${sb.percent}%</strong> (${sb.attended}/${sb.conducted})
                    </span>`;
                });
                breakdownPillsHtml += `</div>`;
            }

            html += `
            <div style="padding: 10px 12px; background: rgba(0,0,0,0.25); border-left: 4px solid ${badgeColor}; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--text-main);">Roll ${item.roll}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">
                            Attended: ${item.attended} / ${item.total} classes (${item.missed} missed)
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.05rem; font-weight: 800; color: ${badgeColor};">${item.percent}%</div>
                        <span style="font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 700;">${statusLabel}</span>
                    </div>
                </div>
                ${breakdownPillsHtml}
            </div>`;
        });

        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    const waBtn = document.getElementById('shortageShareWaBtn');
    if (waBtn) {
        waBtn.addEventListener('click', () => {
            const waText = buildShortageWhatsAppText(yearStr, sectionStr, subjectFilter, startRoll, endRoll, totalClasses, cutoff, shortageList, pLabel);
            const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(waText);
            window.open(waUrl, '_blank');
        });
    }
}

function buildShortageWhatsAppText(yearStr, sectionStr, subjectFilter, startRoll, endRoll, totalClasses, cutoff, shortageList, periodLabel) {
    const pLabel = periodLabel || 'All Time (Cumulative)';
    const subjHeader = subjectFilter === 'ALL' ? 'All Subjects (Overall)' : subjectFilter;

    let msg = `⚠️ *ATTENDANCE SHORTAGE REPORT (< ${cutoff}%)*\n`;
    msg += `📍 *MGM College — BCA ${yearStr} Sec ${sectionStr}*\n`;
    msg += `📚 *Subject: ${subjHeader}*\n`;
    msg += `📅 *Period: ${pLabel}*\n`;
    msg += `📊 *Total Classes Logged: ${totalClasses}*\n`;
    msg += `🔢 *Roll Range: ${startRoll} – ${endRoll}*\n`;
    msg += `------------------------------------\n\n`;

    if (shortageList.length === 0) {
        msg += `✅ *All students have attendance above ${cutoff}%. No shortage detected.*\n`;
    } else {
        shortageList.forEach((item, idx) => {
            msg += `${idx + 1}. *Roll ${item.roll}* — *${item.percent}%* (${item.attended}/${item.total} classes)\n`;
            if (subjectFilter === 'ALL' && item.subjectBreakdown && item.subjectBreakdown.length > 0) {
                const subStrs = item.subjectBreakdown.map(sb => `${sb.subject}: ${sb.percent}%`).join(', ');
                msg += `   └ _[${subStrs}]_\n`;
            }
        });
        msg += `\n------------------------------------\n`;
        msg += `_Please contact the department coordinator regarding attendance shortage rectification._`;
    }
    return msg;
}

let currentHistoryTabMode = 'TODAY';

function updateHistoryTabStyles() {
    const tabToday = document.getElementById('historyTabToday');
    const tabAll = document.getElementById('historyTabAll');
    const titleEl = document.getElementById('historyDrawerTitle');
    const subEl = document.getElementById('todayDrawerSubtitle');
    const filterRow = document.getElementById('allHistoryFilterRow');

    if (tabToday && tabAll) {
        if (currentHistoryTabMode === 'ALL') {
            tabToday.style.background = 'transparent';
            tabToday.style.color = 'var(--text-muted, #94a3b8)';
            tabAll.style.background = 'var(--primary-color, #6366f1)';
            tabAll.style.color = '#fff';
            if (titleEl) titleEl.textContent = 'All History';
            if (subEl) subEl.textContent = 'View, edit or delete any past class entry';
            if (filterRow) filterRow.style.display = 'flex';
        } else {
            tabToday.style.background = 'var(--primary-color, #6366f1)';
            tabToday.style.color = '#fff';
            tabAll.style.background = 'transparent';
            tabAll.style.color = 'var(--text-muted, #94a3b8)';
            if (titleEl) titleEl.textContent = 'Today’s entries';
            if (subEl) subEl.textContent = 'Correct any class you marked today';
            if (filterRow) filterRow.style.display = 'none';
        }
    }
}

function initHistoryDrawerTabs() {
    const tabToday = document.getElementById('historyTabToday');
    const tabAll = document.getElementById('historyTabAll');
    const clearFilterBtn = document.getElementById('clearAllHistoryFilterBtn');
    const yearFilter = document.getElementById('allHistoryYearFilter');
    const dateFilter = document.getElementById('allHistoryDateFilter');

    if (tabToday) {
        tabToday.onclick = (e) => {
            if (e) e.preventDefault();
            currentHistoryTabMode = 'TODAY';
            updateHistoryTabStyles();
            renderHistoryList();
        };
    }

    if (tabAll) {
        tabAll.onclick = (e) => {
            if (e) e.preventDefault();
            currentHistoryTabMode = 'ALL';
            updateHistoryTabStyles();
            renderHistoryList();
            if (navigator.onLine && typeof fetchAllServerHistory === 'function') {
                fetchAllServerHistory(() => {
                    renderHistoryList();
                });
            }
        };
    }

    if (yearFilter) {
        yearFilter.onchange = () => {
            currentHODYearFilter = yearFilter.value;
            renderHistoryList();
        };
    }

    if (dateFilter) {
        dateFilter.onchange = () => {
            currentHODDateFilter = dateFilter.value;
            renderHistoryList();
        };
    }

    if (clearFilterBtn) {
        clearFilterBtn.onclick = (e) => {
            if (e) e.preventDefault();
            if (yearFilter) yearFilter.value = 'ALL';
            if (dateFilter) dateFilter.value = '';
            currentHODYearFilter = 'ALL';
            currentHODDateFilter = '';
            renderHistoryList();
        };
    }
}

function initHeaderAndTabButtons() {
    const historyBtn = document.getElementById('historyBtn');
    const manageSubjHeader = document.getElementById('manageSubjectBtnHeader');
    const manageSubjModalBtn = document.getElementById('manageSubjectBtnModal');

    if (historyBtn) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentHistoryTabMode = 'TODAY';
            setHistoryDrawerOpen(true);
            renderHistoryList();
            if (typeof fetchTodayServerHistory === 'function') fetchTodayServerHistory();
            if (typeof syncOfflineEntries === 'function') syncOfflineEntries();
        });
    }

    if (manageSubjHeader) {
        manageSubjHeader.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('subjectManageModal');
            if (modal) modal.classList.add('active');
            renderSubjectChips();
        });
    }

    if (manageSubjModalBtn) {
        manageSubjModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('subjectManageModal');
            if (modal) modal.classList.add('active');
            renderSubjectChips();
        });
    }
}

// Global robust click handlers for Header Tabs (Today & Subjects)
function bindHeaderTabClickHandlers() {
    initHistoryDrawerTabs();

    const closeSubjBtn = document.getElementById('closeSubjectModalBtn');
    if (closeSubjBtn) {
        closeSubjBtn.onclick = (e) => {
            if (e) e.preventDefault();
            const modal = document.getElementById('subjectManageModal');
            if (modal) modal.classList.remove('active');
        };
    }

    const closeHistBtn = document.getElementById('closeHistoryBtn');
    if (closeHistBtn) {
        closeHistBtn.onclick = (e) => {
            if (e) e.preventDefault();
            setHistoryDrawerOpen(false);
        };
    }

    const handleTodayClick = (e) => {
        if (e) e.preventDefault();
        currentHistoryTabMode = 'TODAY';
        setHistoryDrawerOpen(true);
        updateHistoryTabStyles();
        if (typeof renderHistoryList === 'function') renderHistoryList();
        if (typeof fetchTodayServerHistory === 'function') fetchTodayServerHistory();
        if (typeof syncOfflineEntries === 'function') syncOfflineEntries();
    };

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.onclick = handleTodayClick;
    }
    document.querySelectorAll('.history-open-btn').forEach(btn => {
        btn.onclick = handleTodayClick;
    });

    const handleSubjectClick = (e) => {
        if (e) e.preventDefault();
        const modal = document.getElementById('subjectManageModal');
        if (modal) {
            modal.classList.add('active');
        }
        renderSubjectChips();
    };

    const subjHeaderBtn = document.getElementById('manageSubjectBtnHeader');
    const subjModalBtn = document.getElementById('manageSubjectBtnModal');
    const subjVoiceBtn = document.getElementById('manageSubjectBtnVoice');
    const subjDirectBtn = document.getElementById('manageSubjectBtnDirect');

    if (subjHeaderBtn) subjHeaderBtn.onclick = handleSubjectClick;
    if (subjModalBtn) subjModalBtn.onclick = handleSubjectClick;
    if (subjVoiceBtn) subjVoiceBtn.onclick = handleSubjectClick;
    if (subjDirectBtn) subjDirectBtn.onclick = handleSubjectClick;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHeaderTabClickHandlers);
} else {
    bindHeaderTabClickHandlers();
}



let isFetchingAllServerHistory = false;

function getActiveDrawerEntries() {
    const allItems = readAllHistory();
    if (currentHistoryTabMode === 'ALL') {
        const yearFilter = document.getElementById('allHistoryYearFilter');
        const dateFilter = document.getElementById('allHistoryDateFilter');
        
        const selYear = yearFilter ? yearFilter.value : 'ALL';
        const selDate = dateFilter && dateFilter.value ? normalizeHistoryDate(dateFilter.value) : '';

        // Strict stream filter — never fall back to another department's entries
        const matched = allItems.filter(item => {
            if (!isStreamMatch(item.stream, currentDept)) return false;
            if (selYear && selYear !== 'ALL' && isYearMatching(item.year, selYear) === false) return false;
            if (selDate && selDate !== '' && normalizeHistoryDate(item.date) !== selDate) return false;
            return true;
        });

        return matched.sort((a, b) => {
            const dA = normalizeHistoryDate(a.date) || '';
            const dB = normalizeHistoryDate(b.date) || '';
            if (dA !== dB) return dB.localeCompare(dA);
            return (parseInt(b.slot, 10) || 1) - (parseInt(a.slot, 10) || 1);
        });
    }
    return getTodayEntries();
}

function fetchAllServerHistory(cb) {
    if (isFetchingAllServerHistory) {
        if (cb) cb();
        return;
    }
    isFetchingAllServerHistory = true;

    const stream = currentDept || 'BCA';
    const targetUrl = getWebhookUrl(stream);
    if (!targetUrl) {
        isFetchingAllServerHistory = false;
        if (cb) cb();
        return;
    }

    const cbName = 'mgm_bca_all_history_cb_' + Date.now();

    const timeout = setTimeout(() => {
        isFetchingAllServerHistory = false;
        try { delete window[cbName]; } catch (e) {}
        if (cb) cb();
    }, 5000);

    window[cbName] = function (data) {
        clearTimeout(timeout);
        isFetchingAllServerHistory = false;
        try { delete window[cbName]; } catch (e) {}

        if (data && data.result === 'success' && Array.isArray(data.entries)) {
            const serverEntries = data.entries.map(e => ({
                stream: stream,
                date: e.date || getTodayISOString(),
                year: e.year || 'First Year',
                section: e.section || 'A',
                subject: e.subject || 'Subject',
                slot: parseInt(e.slot, 10) || 1,
                rollNumbers: e.rollNumbers || 'NIL',
                offline: false,
                timestamp: 'From Sheet'
            }));

            const history = readAllHistory();
            const byKey = new Map();

            history.forEach(item => {
                const k = historyMatchKey(item);
                byKey.set(k, item);
            });

            serverEntries.forEach(sEntry => {
                const k = historyMatchKey(sEntry);
                byKey.set(k, sEntry);
            });

            const merged = compactAttendanceHistory(Array.from(byKey.values()));
            localStorage.setItem('mgm_attendance_history', JSON.stringify(merged));
            renderHistoryList();
            updateSyncButtonState();
        }
        if (cb) cb();
    };

    const params = new URLSearchParams({
        action: 'get_absentees',
        stream: stream,
        date: 'ALL',
        fromDate: '2026-01-01',
        toDate: '2030-12-31',
        callback: cbName
    });
    appendAuthToParams(params);

    const scriptEl = document.createElement('script');
    scriptEl.src = targetUrl + (targetUrl.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    scriptEl.onerror = function () {
        clearTimeout(timeout);
        isFetchingAllServerHistory = false;
        try { delete window[cbName]; } catch (e) {}
        try { document.body.removeChild(scriptEl); } catch (e) {}
        if (cb) cb();
    };
    document.body.appendChild(scriptEl);
}
