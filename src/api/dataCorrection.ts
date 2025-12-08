import api from "./client";

export interface CorrectionParams {
  year: number;
  month: number;
  day: number;
  userId: number;
  stationId: number;
  beforeHour?: number;
  beforeMinute?: number;
}

export const runCorrection = async (params: CorrectionParams) => {
  const { data } = await api.post("/data-correction/correct-stations", params);
  return data;
};
