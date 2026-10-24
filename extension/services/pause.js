export const PAUSE_ALARM = 'local-grayscale-pause';

export async function syncPause(api, state, now, save) {
  if (state.pauseUntil !== null && (!state.enabled || state.pauseUntil <= now)) {
    await save({ pauseUntil: null });
  }
  const until = state.enabled && state.pauseUntil > now ? state.pauseUntil : null;
  if (until === null) await api.alarms.clear(PAUSE_ALARM);
  else {
    const alarm = await api.alarms.get(PAUSE_ALARM);
    if (!alarm || alarm.scheduledTime !== until)
      await api.alarms.create(PAUSE_ALARM, { when: until });
  }
}
