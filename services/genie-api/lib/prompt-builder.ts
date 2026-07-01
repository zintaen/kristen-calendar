import { SYSTEM_PROMPT_BLOCK } from "./system-prompt";

import type { RemindersUpsertRow } from "../api/sync";

export interface GenieContext {
  lunarDate: string;
  upcomingEvent?: string;
  reminder?: RemindersUpsertRow;
  questionType: "phong_tuc_hoi_dap" | "goi_y_mam_cung" | "y_nghia_ngay" | "loi_nhac_ca_nhan_hoa";
}

export interface BuiltMessages {
  system: typeof SYSTEM_PROMPT_BLOCK[];
  messages: { role: "user"; content: string }[];
}

export function sanitizeQuestion(raw: string): string {
  // Loại bỏ các thông tin có vẻ là tên người theo sau các từ khóa nhạy cảm
  // VD: "giỗ ông Nguyễn Văn A", "giỗ bà Trần Thị B"
  let sanitized = raw;
  const piiPatterns = [
    /(giỗ|cúng|mộ)\s+(ông|bà|cụ|chú|bác|cô|dì|anh|chị|em)?\s*([A-ZĐ][\p{L}]*(?:\s+[A-ZĐ][\p{L}]*){1,3})/giu,
    /(0\d{9,10})/g // SĐT
  ];

  for (const pattern of piiPatterns) {
    sanitized = sanitized.replace(pattern, (match, p1) => {
      if (p1 && ['giỗ', 'cúng', 'mộ'].includes(p1.toLowerCase())) {
        return `${p1} [thong tin duoc an]`;
      }
      return "[thong tin duoc an]";
    });
  }

  return sanitized;
}

export function buildGenieMessages(
  context: GenieContext,
  question: string
): BuiltMessages {
  const sanitizedQuestion = sanitizeQuestion(question);
  
  let contextStr = `Hôm nay là: ${context.lunarDate}\n`;
  if (context.reminder) {
    const isRedacted = (context.reminder as any).titleRedacted;
    const titleStr = isRedacted ? "[Thong tin duoc an]" : context.reminder.title;
    contextStr += `Sự kiện: ${titleStr} (${context.reminder.type})\n`;
  } else if (context.upcomingEvent) {
    contextStr += `Sự kiện sắp tới: ${context.upcomingEvent}\n`;
  }
  contextStr += `Loại câu hỏi: ${context.questionType}\n\n`;

  return {
    system: [SYSTEM_PROMPT_BLOCK],
    messages: [
      {
        role: "user",
        content: `[CONTEXT]\n${contextStr}[/CONTEXT]\n\nCâu hỏi: ${sanitizedQuestion}`
      }
    ]
  };
}
