import React from "react";
import { GoodDayPicker } from "../../components/GoodDayPicker";

export default function GoodDayPickerPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8 md:py-12 pb-32">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-purple-900 tracking-tight">Ngày Tốt Cho Việc Lớn</h1>
          <p className="text-gray-600 mt-2 max-w-lg mx-auto">
            Khởi sự thuận lợi, vạn sự hanh thông. Chọn ngày Hoàng đạo phù hợp nhất cho dự định của bạn.
          </p>
        </div>

        <GoodDayPicker />
      </main>

      {/* Fixed bottom disclaimer banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-300 text-xs text-center py-3 px-4 z-50">
        <p className="max-w-4xl mx-auto">
          Thông tin này chỉ mang tính tham khảo theo phong thủy dân gian. Không phải tư vấn chuyên môn.
        </p>
      </div>
    </div>
  );
}
