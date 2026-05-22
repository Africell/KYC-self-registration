export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9995/FCDM_App/V1",
  API_LOGIN: import.meta.env.VITE_API_LOGIN ?? "",
} as const;