const fs = require('fs');
const content = fs.readFileSync('src/pages/MyAttendancePage.jsx', 'utf8');

let lines = content.split('\n');

// 1. Insert imports
lines[8] = lines[8] + '\nimport { useTimezone } from \'../context/TimezoneContext\';';

// 2. Insert context variables
const uiIdx = lines.findIndex(l => l.includes('const ui = useUIFeedback();'));
if (uiIdx !== -1) {
  lines[uiIdx] = lines[uiIdx] + '\n  const { formatDate: formatCtxDate, formatTime: formatCtxTime } = useTimezone();';
}

// 3. Update formatDate implementation
const formatDateStartIdx = lines.findIndex(l => l.includes('const formatDate = (dateStr) => {'));
if (formatDateStartIdx !== -1) {
    let replacedFormatDate = false;
    for (let i = formatDateStartIdx; i < lines.length; i++) {
        if (lines[i].includes("return new Date(dateStr).toLocaleDateString('en-US', {")) {
            lines[i] = "    return formatCtxDate(dateStr, {";
            replacedFormatDate = true;
            break;
        }
    }
    if (replacedFormatDate) {
        lines[formatDateStartIdx] = lines[formatDateStartIdx].replace('formatDate', 'renderDate');
    }
}

// 4. Update formatTime implementation
const formatTimeStartIdx = lines.findIndex(l => l.includes('const formatTime = (timeStr) => {'));
if (formatTimeStartIdx !== -1) {
    let replacedFormatTimeStart = false;
    let endIdx = -1;
    for (let i = formatTimeStartIdx; i < lines.length; i++) {
        if (lines[i].includes("return new Date(timeStr).toLocaleTimeString('en-US', {")) {
           lines[i] = "    return formatCtxTime(\1970-01-01T\\);";
           lines[i+1] = ""; // remove hour
           lines[i+2] = ""; // remove minute
           lines[i+3] = ""; // remove });
           replacedFormatTimeStart = true;
           break;
        }
    }
    if (replacedFormatTimeStart) {
        lines[formatTimeStartIdx] = lines[formatTimeStartIdx].replace('formatTime', 'renderTime');
    }
}

// 5. Update getMonthLabel implementation
const getMonthLabelStartIdx = lines.findIndex(l => l.includes('const getMonthLabel = () => {'));
if (getMonthLabelStartIdx !== -1) {
    for (let i = getMonthLabelStartIdx; i < lines.length; i++) {
        if (lines[i].includes('const date = new Date(dateRange.start);')) {
            lines[i] = "";
        }
        if (lines[i].includes("return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });")) {
            lines[i] = "    return formatCtxDate(dateRange.start, { month: 'long', year: 'numeric' });";
            break;
        }
    }
}

// 6. Update JSX table replacements
let newContent = lines.join('\n');
newContent = newContent.replace(/formatDate\(record\.date\)/g, 'renderDate(record.date)');
newContent = newContent.replace(/formatTime\(record\.first_entry\)/g, 'renderTime(record.first_entry)');
newContent = newContent.replace(/formatTime\(record\.last_exit\)/g, 'renderTime(record.last_exit)');

fs.writeFileSync('src/pages/MyAttendancePage.jsx', newContent);
