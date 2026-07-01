import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div style={{ padding: '20px', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
      <h1>Chính sách quyền riêng tư (Privacy Policy)</h1>
      <p><em>Phiên bản: 1.0.0 | Cập nhật lần cuối: 27/06/2026</em></p>
      
      <h2>1. Loại dữ liệu thu thập</h2>
      <ul>
        <li><strong>Dữ liệu lịch:</strong> Các sự kiện âm lịch, nhắc nhở (bao gồm cả Giỗ, Mùng Một, Rằm).</li>
        <li><strong>Dữ liệu phân tích:</strong> Thông tin sử dụng ứng dụng ở dạng tổng hợp (không định danh).</li>
      </ul>
      
      <h2>2. Mục đích xử lý</h2>
      <p>Chúng tôi xử lý dữ liệu của bạn chỉ với mục đích:</p>
      <ul>
        <li>Đồng bộ hóa dữ liệu giữa các thiết bị của bạn.</li>
        <li>Gửi thông báo nhắc nhở qua Zalo (ZNS).</li>
        <li>Tư vấn và gợi ý cá nhân hóa thông qua Trợ lý ảo AI (Genie).</li>
      </ul>
      <p><strong>Cam kết:</strong> Chúng tôi tuyệt đối KHÔNG bán, chia sẻ hoặc cung cấp dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc thương mại.</p>

      <h2>3. Thời gian lưu giữ</h2>
      <p>Dữ liệu của bạn được lưu giữ cho đến khi bạn chủ động xóa tài khoản hoặc yêu cầu thu hồi sự đồng ý (consent).</p>

      <h2>4. Quyền của người dùng</h2>
      <p>Theo Nghị định Bảo vệ Dữ liệu Cá nhân (PDPL), bạn có các quyền sau:</p>
      <ul>
        <li>Quyền được biết và truy cập dữ liệu của mình.</li>
        <li>Quyền chỉnh sửa hoặc xóa dữ liệu.</li>
        <li>Quyền thu hồi từng sự đồng ý một cách độc lập bất kỳ lúc nào trong phần Cài đặt.</li>
      </ul>

      <h2>5. Liên hệ CyberSkill</h2>
      <p>Nếu có thắc mắc hoặc yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ: <strong>privacy@cyberskill.vn</strong></p>
    </div>
  );
};
