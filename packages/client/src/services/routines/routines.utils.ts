import { m } from '@repo/i18n/client';
import { match } from 'ts-pattern';
import { ROUTINES } from './routines.constants';
import type { RoutinesScheduleTextParams } from '../../types/routines.types';
import type { Routine, RoutineSchedule } from '@repo/contracts/universal';

export function routinesScheduleText({ schedule, locale }: RoutinesScheduleTextParams): string {
  function routinesCronText(expression: string): string {
    const [minute, hour, day, month, weekday] = expression.trim().split(/\s+/u);

    if (!minute || !hour || !/^\d+$/u.test(minute) || !/^\d+$/u.test(hour) || day !== '*' || month !== '*') {
      return expression;
    }

    const time = clock.format(new Date(ROUTINES.anchorYear, 0, 1, Number(hour), Number(minute)));

    if (weekday === '*') {
      return m.rooms_routines_daily({ time });
    }

    if (weekday === ROUTINES.weekdays) {
      return m.rooms_routines_weekdays({ time });
    }

    if (weekday && /^[0-7]$/u.test(weekday)) {
      const sunday = new Date(ROUTINES.anchorYear, 0, ROUTINES.anchorSunday + (Number(weekday) % 7));

      return m.rooms_routines_weekly({ day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(sunday), time });
    }

    return expression;
  }

  const clock = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });

  return match(schedule)
    .with({ kind: 'once' }, ({ runAt }) => m.rooms_routines_once({
      date: new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(runAt),
      time: clock.format(runAt),
    }))
    .with({ kind: 'interval' }, ({ minutes }) => {
      const hours = minutes / ROUTINES.minutesPerHour;

      return match({ hours, minutes })
        .with({ hours: 1 }, () => m.rooms_routines_every_hour())
        .when(() => Number.isInteger(hours), () => m.rooms_routines_every_hours({ count: hours }))
        .with({ minutes: 1 }, () => m.rooms_routines_every_minute())
        .otherwise(() => m.rooms_routines_every_minutes({ count: minutes }));
    })
    .with({ kind: 'cron' }, ({ expression }) => routinesCronText(expression))
    .exhaustive();
}

export function routinesIsFailed({ lastRun }: Routine) {
  return lastRun?.status === 'unanswered';
}

export function routinesLastRunText({ lastRun }: Routine): string {
  return match(lastRun?.status)
    .with('unanswered', () => m.rooms_routines_failed())
    .with('done', () => m.rooms_routines_finished())
    .with('running', () => m.rooms_routines_running())
    .with(undefined, () => m.rooms_routines_not_run())
    .exhaustive();
}

export function routinesSections(routines: Routine[]) {
  const routinesIsPast = ({ nextRunAt, lastRun }: Routine) => nextRunAt === null && lastRun !== null;

  return [
    {
      title: m.rooms_routines_upcoming(),
      routines: routines
        .filter((routine) => !routinesIsPast(routine))
        .sort((a, b) => (a.nextRunAt ?? Number.MAX_SAFE_INTEGER) - (b.nextRunAt ?? Number.MAX_SAFE_INTEGER)),
    },
    {
      title: m.rooms_routines_past(),
      routines: routines
        .filter(routinesIsPast)
        .sort((a, b) => Number(routinesIsFailed(b)) - Number(routinesIsFailed(a)) || (b.lastRun?.startedAt ?? 0) - (a.lastRun?.startedAt ?? 0)),
    },
  ].filter((section) => section.routines.length > 0);
}

export function routinesScheduleDefault(kind: string): RoutineSchedule {
  return match(kind)
    .returnType<RoutineSchedule>()
    .with('once', () => ({ kind: 'once', runAt: Date.now() + ROUTINES.minutesPerHour * 60_000 }))
    .with('interval', () => ({ kind: 'interval', minutes: ROUTINES.minutesPerHour }))
    .otherwise(() => ({ kind: 'cron', expression: '0 9 * * *', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
}
