import { utils } from "@halo-dev/ui-shared";

const dayjs = utils.date.dayjs;

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

/** 以周一为一周起点的整月网格（固定 6 周，避免切换月份时高度跳动）。 */
export function buildMonthGrid(month: Date): CalendarDay[] {
  const current = dayjs(month);
  const firstDay = current.startOf("month");
  const offset = (firstDay.day() + 6) % 7;
  const start = firstDay.subtract(offset, "day");
  const today = dayjs().format("YYYY-MM-DD");

  return Array.from({ length: 42 }, (_, index) => {
    const date = start.add(index, "day");
    const dateText = date.format("YYYY-MM-DD");
    return {
      date: dateText,
      dayOfMonth: date.date(),
      inCurrentMonth: date.month() === current.month(),
      isToday: dateText === today,
    };
  });
}

export function toDateKey(date: string | Date | undefined | null) {
  if (!date) {
    return undefined;
  }
  return dayjs(date).format("YYYY-MM-DD");
}

export function formatTime(date: string | undefined) {
  return date ? dayjs(date).format("HH:mm") : "";
}

export function formatFull(date: string | undefined) {
  return utils.date.format(date);
}

export function isFuture(date: string | Date) {
  return dayjs(date).valueOf() > dayjs().valueOf();
}

export function monthLabel(month: Date) {
  return dayjs(month).format("YYYY 年 M 月");
}

export function addMonths(month: Date, amount: number) {
  return dayjs(month).add(amount, "month").toDate();
}

export function weekdays() {
  return ["一", "二", "三", "四", "五", "六", "日"];
}
