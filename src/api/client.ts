import axios from "axios";

declare const process: {
  env: {
    REACT_APP_API_BASE_URL?: string;
  };
};

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export default api;
