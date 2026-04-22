const fs = require('fs');
const content = fs.readFileSync('src/pages/MyAttendancePage.jsx', 'utf8');

let newContent = content.replace(
  import { TableSkeleton, EmptyStateStandard, ErrorStateStandard } from '../components/DataStates';,
  import { TableSkeleton, EmptyStateStandard, ErrorStateStandard } from '../components/DataStates';\nimport { useTimezone } from '../context/TimezoneContext';
);

newContent = newContent.replace(
  const ui = useUIFeedback();,
  const ui = useUIFeedback();\n  const { formatDate: formatCtxDate, formatTime: formatCtxTime } = useTimezone();
);

newContent = newContent.replace(
  const formatDate = (dateStr) => {\n    return new Date(dateStr).toLocaleDateString('en-US', {\n      weekday: 'short',\n      month: 'short',\n      day: 'numeric',\n    });\n  };,
  const renderDate = (dateStr) => {\n    if (!dateStr) return '—';\n    return formatCtxDate(dateStr, {\n      weekday: 'short',\n      month: 'short',\n      day: 'numeric',\n    });\n  };
);

newContent = newContent.replace(
  const formatTime = (timeStr) => {\n    if (!timeStr) return '—';\n    return new Date(timeStr).toLocaleTimeString('en-US', {\n      hour: '2-digit',\n      minute: '2-digit',\n    });\n  };,
  const renderTime = (timeStr) => {\n    if (!timeStr) return '—';\n    return formatCtxTime(\1970-01-01T\\);\n  };
);

newContent = newContent.replace(
  const getMonthLabel = () => {\n    const date = new Date(dateRange.start);\n    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });\n  };,
  const getMonthLabel = () => {\n    return formatCtxDate(dateRange.start, { month: 'long', year: 'numeric' });\n  };
);

// We must also rename the formats inside the component UI
newContent = newContent.replace(/formatDate\(record\.date\)/g, 'renderDate(record.date)');
newContent = newContent.replace(/formatTime\(record\.first_entry\)/g, 'renderTime(record.first_entry)');
newContent = newContent.replace(/formatTime\(record\.last_exit\)/g, 'renderTime(record.last_exit)');

fs.writeFileSync('src/pages/MyAttendancePage.jsx', newContent);
