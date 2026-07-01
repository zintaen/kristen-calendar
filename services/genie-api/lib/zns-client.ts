export interface ZNSPayload {
  phone: string;             // số điện thoại người nhận (đã lấy qua OA API)
  templateId: string;        // ID template đã duyệt của Zalo OA
  templateData: {
    ten: string;             // tham số {tên}
    ngay_duong: string;      // tham số {ngày dương}, ví dụ "08/08/2025"
    dip: string;             // tham số {dịp}, ví dụ "Giỗ Bà Nội"
    ngay_am: string;         // tham số {ngày âm}, ví dụ "15/7 Ất Tỵ"
    [key: string]: string;   // các tham số phụ thêm nếu template mở rộng
  };
  trackingId?: string;       // để đối chiếu với zns_send_log.reminderId
}

export interface ZNSSendResult {
  success: boolean;
  zaloMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function sendZNS(payload: ZNSPayload, accessToken: string): Promise<ZNSSendResult> {
  // If configured to use a distributor, we'd route it differently here.
  // For now, implementing direct OA integration.
  try {
    const response = await fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": accessToken,
      },
      body: JSON.stringify({
        phone: payload.phone,
        template_id: payload.templateId,
        template_data: payload.templateData,
        tracking_id: payload.trackingId
      })
    });

    const data = await response.json();
    
    if (data.error === 0) {
      return {
        success: true,
        zaloMessageId: data.data?.message_id,
      };
    } else {
      return {
        success: false,
        errorCode: data.error?.toString(),
        errorMessage: data.message,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      errorCode: "network_error",
      errorMessage: error.message,
    };
  }
}
