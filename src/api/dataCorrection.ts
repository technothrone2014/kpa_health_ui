// dataCorrection.ts (frontend API)
import api from "./client";

export interface CorrectionParams {
  year: number;
  month: number;
  day: number;
  dayOperator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  userId: number | null;
  stationId: number | null;
  beforeHour?: number;
  beforeMinute?: number;
}

export const runCorrection = async (params: CorrectionParams) => {
  const { data } = await api.post("/data-correction/correct-stations", params);
  return data;
};