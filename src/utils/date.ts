export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const nowISO = (): string => new Date().toISOString();

export const getMonthKey = (dateISO: string): string => dateISO.slice(0, 7);

export const getCurrentMonthKey = (): string => getMonthKey(todayISO());

export const getPreviousMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const getDaysElapsedInMonth = (dateISO: string): number => {
  const date = new Date(dateISO);
  return date.getDate();
};

export const getDaysInMonth = (monthKey: string): number => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

export const addDaysISO = (dateISO: string, days: number): string => {
  const date = new Date(dateISO);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const monthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-PE", {
    month: "short",
    year: "numeric",
  });
};
