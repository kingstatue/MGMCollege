/**
 * MGM College Voice & Text Attendance - Natural Language Data Parser
 * Extracts rollNumbers, section, year, subject, slot, and date from spoken or typed text.
 */

const NUMBER_WORDS = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24, 'twenty five': 25,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60
};

const COMMON_SUBJECTS = [
    // BCA Subjects (General & AIML) + language electives
    'English', 'Environmental Studies', 'Java', 'Database', 'DBMS', 'Database Management',
    'C++', 'C Programming', 'Python', 'Data Structures', 'Web Technology', 'Web Development',
    'Computer Networks', 'Operating Systems', 'Software Engineering', 'Mathematics',
    'Discrete Math', 'Cloud Computing', 'Cloud Computing Essentials', 'Cyber Security', 'Artificial Intelligence',
    'AI', 'Fundamentals of AI & ML', 'Python Programming for AI', 'Data Science & Visualization',
    'Database Systems for AI', 'Linux & Shell Scripting', 'Android Development', 'PHP', 'Computer Architecture', 'Soft Skills',
    // BSc Subjects (Core, Practicals & Skill Courses)
    'Physics', 'Chemistry', 'Statistics', 'Botany', 'Zoology', 'Computer Science',
    'Physics Practical', 'Chemistry Practical', 'Botany Practical', 'Zoology Practical', 'Statistics Lab', 'Computer Science Lab', 'Practicals - Maths',
    'Skill Physics', 'Skill Statistics', 'Skill Mathematics', 'Skill Computer Science', 'Skill Botany', 'Skill Zoology',
    'Discipline Elective', 'Foundation Course',
    'Kannada', 'Hindi', 'Sanskrit', 'Sanskrith', 'Sanskritha', 'Sanskrutha', 'Sanskritam'
];

// Slot Time Range mapping
const SLOT_TIME_PATTERNS = [
    { slot: 1, label: "9-9.55", regex: /\b9(?:[:.]00)?\s*(?:to|-)\s*9[:.]55\b|\bslot\s*1\b/i },
    { slot: 2, label: "10-10.55", regex: /\b10(?:[:.]00)?\s*(?:to|-)\s*10[:.]55\b|\bslot\s*2\b/i },
    { slot: 3, label: "11.10-12.05", regex: /\b11[:.]10\s*(?:to|-)\s*12[:.]05\b|\bslot\s*3\b/i },
    { slot: 4, label: "12.10-1.05", regex: /\b12[:.]10\s*(?:to|-)\s*1[:.]05\b|\bslot\s*4\b/i },
    { slot: 5, label: "1.05-2", regex: /\b1[:.]05\s*(?:to|-)\s*2(?:[:.]00)?\b|\bslot\s*5\b/i },
    { slot: 6, label: "2-2.55", regex: /\b2(?:[:.]00)?\s*(?:to|-)\s*2[:.]55\b|\bslot\s*6\b/i },
    { slot: 7, label: "3-3.55", regex: /\b3(?:[:.]00)?\s*(?:to|-)\s*3[:.]55\b|\bslot\s*7\b/i },
    { slot: 8, label: "4-4.55", regex: /\b4(?:[:.]00)?\s*(?:to|-)\s*4[:.]55\b|\bslot\s*8\b/i }
];

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTodayISO() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse input text (spoken or manually typed) into structured attendance data
 * @param {string} text 
 * @returns {object} { rollNumbers, year, section, subject, slot, date, rawText }
 */
function parseAttendanceSpeech(text, activeDept) {
    const defaultDate = getTodayISO();
    const defaultSubj = (typeof DEPT_CONFIG !== 'undefined' && DEPT_CONFIG[activeDept]) ? DEPT_CONFIG[activeDept].defaultSubject : 'English';

    if (!text || typeof text !== 'string') {
        return { rollNumbers: [], year: '', section: '', subject: '', slot: '', date: defaultDate, rawText: '' };
    }

    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();

    // 0. Extract Date (Defaults to Today's Date YYYY-MM-DD; parses 'yesterday' or ISO date if spoken)
    let dateVal = defaultDate;
    if (lowerText.includes('yesterday')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateVal = `${yyyy}-${mm}-${dd}`;
    }

    // 1. Extract Year
    let year = '';
    if (/\b(3rd|third|final)\b/i.test(lowerText) || /3rd\s*yr/i.test(lowerText) || /bca\s*3/i.test(lowerText)) {
        year = 'Third Year';
    } else if (/\b(2nd|second)\b/i.test(lowerText) || /2nd\s*yr/i.test(lowerText) || /bca\s*2/i.test(lowerText)) {
        year = 'Second Year';
    } else if (/\b(1st|first)\b/i.test(lowerText) || /1st\s*yr/i.test(lowerText) || /bca\s*1/i.test(lowerText)) {
        year = 'First Year';
    }

    // 2. Extract Subject (Extracted before Section to check elective status accurately)
    let subject = '';
    for (const subj of COMMON_SUBJECTS) {
        const safeSubj = escapeRegex(subj.toLowerCase());
        if (new RegExp(`(?:\\b|\\s)${safeSubj}(?:\\b|\\s)`, 'i').test(lowerText) || lowerText.includes(subj.toLowerCase())) {
            subject = subj;
            break;
        }
    }
    if (!subject) {
        const subjPhrase = lowerText.match(/(?:subject|course)\s+([a-z0-9\s]+?)(?=\s+(?:slot|period|roll|section|year|absent)|$)/i);
        if (subjPhrase && subjPhrase[1]) {
            subject = capitalizeWords(subjPhrase[1].trim());
        }
    }

    // 3. Extract Section
    const ELECTIVE_LANG_REGEX = /\b(kannada|kanada|kanad|kan|hindi|hindhi|hind|hin|sanskrit|sanskrith|sanskritha|sanskrut|sanskrutha|sanskritam|sansk|sans|devops|wcms|ost|open\s*source|digital\s*fluency|cyber\s*security|e-?filing|journalism|optional\s*english|human\s*rights|elective)\b/i;
    const isLangOrElectiveSubj = ELECTIVE_LANG_REGEX.test(lowerText) || (subject && ELECTIVE_LANG_REGEX.test(subject));

    let section = '';
    if (isLangOrElectiveSubj && !/\b(sec\s*[a-d]|section\s*[a-d])\b/i.test(lowerText)) {
        section = 'ALL';
    } else {
        const sectionMatch = lowerText.match(/(?:section|sec|class)\s*([a-d]|all|combined)\b/i) || lowerText.match(/\b([a-d]|all|combined)\s*(?:section|sec)\b/i);
        if (sectionMatch) {
            const secVal = sectionMatch[1].toUpperCase();
            section = (secVal === 'COMBINED' || secVal === 'ALL') ? 'ALL' : secVal;
        } else {
            if (/\b(combined|all\s*sec|all\s*sections?)\b/i.test(lowerText)) section = 'ALL';
            else if (/\bsec\s*c\b|\bsection\s*c\b/i.test(lowerText) || /\b([1-3]\s*yr|[1-3](?:st|nd|rd)\s*year|bca)\s*c\b/i.test(lowerText) || /\bsec(?:tion)?\s*c\s*\(?aiml\)?\b|\baiml\b/i.test(lowerText)) section = 'C';
            else if (/\bsec\s*b\b|\bsection\s*b\b/i.test(lowerText) || /\b([1-3]\s*yr|[1-3](?:st|nd|rd)\s*year|bca)\s*b\b/i.test(lowerText)) section = 'B';
            else if (/\bsec\s*a\b|\bsection\s*a\b/i.test(lowerText) || /\b([1-3]\s*yr|[1-3](?:st|nd|rd)\s*year|bca)\s*a\b/i.test(lowerText)) section = 'A';
        }
    }

    // 4. Extract Slot (1 to 8 or explicit time range)
    let slot = '';
    for (const timePattern of SLOT_TIME_PATTERNS) {
        if (timePattern.regex.test(lowerText)) {
            slot = timePattern.slot;
            break;
        }
    }

    if (!slot) {
        const slotMatch = lowerText.match(/(?:slot|period|lecture|hour)\s*(?:no|number)?\s*([1-8])\b/i) || lowerText.match(/\b([1-8])(?:st|nd|rd|th)?\s*(?:slot|period|lecture|hour)\b/i);
        if (slotMatch) {
            slot = parseInt(slotMatch[1], 10);
        } else {
            for (let w in NUMBER_WORDS) {
                if (NUMBER_WORDS[w] <= 8) {
                    const reg = new RegExp(`(?:slot|period|lecture)\\s*${w}`, 'i');
                    if (reg.test(lowerText)) {
                        slot = NUMBER_WORDS[w];
                        break;
                    }
                }
            }
        }
    }

    // 5. Extract Roll Numbers
    let rollNumbers = [];
    
    // Explicit Range pattern (e.g. "roll 10 to 15" or "10 through 15")
    const rangeMatch = lowerText.match(/roll\s*(?:no|number|numbers)?s?\s*(\d+)\s*(?:to|through)\s*(\d+)/i);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && (end - start < 100)) {
            for (let i = start; i <= end; i++) {
                rollNumbers.push(i);
            }
        }
    }

    if (rollNumbers.length === 0) {
        let cleanForNumbers = lowerText;

        // Clean out time range strings like "10-10.55" or "11.10-12.05" so time numbers aren't confused with roll numbers
        cleanForNumbers = cleanForNumbers.replace(/\b\d{1,2}[:.]?\d{0,2}\s*-\s*\d{1,2}[:.]\d{2}\b/gi, '');
        cleanForNumbers = cleanForNumbers.replace(/\b\d{1,2}\s*(?:to|-)\s*\d{1,2}[:.]\d{2}\b/gi, '');

        // Clean out explicit slot phrasing like "slot 3" or "period 1"
        cleanForNumbers = cleanForNumbers.replace(/(?:slot|period|lecture|hour)\s*(?:no|number)?\s*([1-8])\b/gi, '');

        for (let word in NUMBER_WORDS) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            cleanForNumbers = cleanForNumbers.replace(regex, NUMBER_WORDS[word]);
        }

        const matches = cleanForNumbers.match(/\b\d+\b/g);
        if (matches) {
            matches.forEach(m => {
                const num = parseInt(m, 10);
                // Exclude single digit 1-8 matching slot if no roll keyword
                if (slot && num === slot && !cleanForNumbers.includes('roll') && !cleanForNumbers.includes('no') && num <= 8) {
                    return;
                }
                // Ignore standalone single digits 1, 2, 3 if year was matched and no 'roll' keyword
                if ((num >= 1 && num <= 3) && (lowerText.includes('year') || lowerText.includes('yr')) && !cleanForNumbers.includes('roll') && !cleanForNumbers.includes('no')) {
                    return;
                }
                if (!rollNumbers.includes(num)) {
                    rollNumbers.push(num);
                }
            });
        }
    }

    // 3.5 Extract End Slot / Duration for Multi-Hour Labs (1 hr, 2 hr, 3 hr, 4 hr or Slot 1 to 4)
    let endSlot = slot || 1;
    const multiSlotMatch = lowerText.match(/(?:slot|period|hour|lecture)s?\s*([1-8])\s*(?:to|through|-|and)\s*([1-8])\b/i);
    if (multiSlotMatch) {
        const sStart = parseInt(multiSlotMatch[1], 10);
        const sEnd = parseInt(multiSlotMatch[2], 10);
        if (!isNaN(sStart) && !isNaN(sEnd) && sStart <= sEnd) {
            slot = sStart;
            endSlot = sEnd;
        }
    } else {
        const durationMatch = lowerText.match(/\b([1-4])\s*(?:hr|hrs|hour|hours)\s*(?:lab|practical)?\b/i);
        if (durationMatch) {
            const hrs = parseInt(durationMatch[1], 10);
            if (hrs >= 1 && hrs <= 4) {
                const startS = slot || 1;
                endSlot = Math.min(8, startS + hrs - 1);
            }
        }
    }

    return {
        rollNumbers: rollNumbers,
        year: year || '',
        section: section || '',
        subject: subject || '',
        slot: slot || '',
        endSlot: endSlot || slot || '',
        date: dateVal,
        rawText: cleanText
    };
}

function capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseAttendanceSpeech, getTodayISO };
}
