export interface GenieContext {
  lunarDate: string;
  upcomingEvent?: string;
  questionType: "phong_tuc_hoi_dap" | "goi_y_mam_cung" | "y_nghia_ngay" | "loi_nhac_ca_nhan_hoa";
}

export interface GenieRequest {
  question: string;
  context: GenieContext;
  ttsRequested?: boolean;
}

export interface GenieResponse {
  answer: string;
  questionType: string;
  requestId: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

export interface GenieErrorResponse {
  error: "RATE_LIMITED" | "UPSTREAM_ERROR" | "INVALID_REQUEST" | "AUTH_ERROR";
  message: string;
  retryAfter?: number;
  retryable?: boolean;
  requestId: string;
}

export interface GenieClientOptions {
  apiBase?: string; // mặc định "/api/genie" or "http://localhost:4000/api/genie" for dev
}

export async function fetchGenie(
  request: GenieRequest,
  options?: GenieClientOptions
): Promise<GenieResponse> {
  const apiBase = options?.apiBase || "http://localhost:4000/api/genie";

  let response: Response;
  try {
    response = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass dummy auth for now
        "Authorization": "Bearer local-dev-user"
      },
      body: JSON.stringify(request)
    });
  } catch (error) {
    throw new Error("Lỗi mạng: Không thể kết nối tới máy chủ.");
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`Máy chủ trả về lỗi ${response.status}`);
    }

    if (errorData.error === "RATE_LIMITED" || errorData.error === "quota_exceeded") {
      const err: any = new Error(errorData.message || "Bạn đã hết lượt hỏi trong tháng.");
      err.code = "QUOTA_EXCEEDED";
      throw err;
    }
    
    if (errorData.error === "feature_not_allowed") {
      const err: any = new Error("Tính năng này yêu cầu nâng cấp.");
      err.code = "FEATURE_NOT_ALLOWED";
      throw err;
    }

    if (errorData.error === "UPSTREAM_ERROR") {
      throw new Error("Claude AI hiện đang quá tải. Vui lòng thử lại sau.");
    }

    throw new Error(errorData.message || "Đã có lỗi xảy ra.");
  }

  const data = await response.json() as GenieResponse;
  return data;
}
