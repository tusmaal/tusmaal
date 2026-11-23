const COMPLETION_MIN_WATCH_PCT = 30;

const getLessonDurationSeconds = (lessonRow, clientDurationSeconds) => {
  const mux = Number(lessonRow?.mux_duration_seconds || 0);
  if (mux > 0) return mux;

  const mins = Number(lessonRow?.duration_minutes || 0);
  if (mins > 0) return mins * 60;

  const client = Number(clientDurationSeconds || 0);
  return client > 0 ? client : 0;
};

const getLessonCompletionGate = (lessonRow, clientDurationSeconds) => {
  const contentType = (lessonRow?.content_type || '').toLowerCase();
  if (!new Set(['video', 'youtube']).has(contentType)) {
    return { requiredWatchSeconds: 0, totalDurationSeconds: 0 };
  }

  const totalDurationSeconds = getLessonDurationSeconds(lessonRow, clientDurationSeconds);
  const requiredWatchSeconds = totalDurationSeconds > 0
    ? Math.ceil(totalDurationSeconds * (COMPLETION_MIN_WATCH_PCT / 100))
    : 0;

  return { requiredWatchSeconds, totalDurationSeconds };
};

module.exports = { COMPLETION_MIN_WATCH_PCT, getLessonCompletionGate };
