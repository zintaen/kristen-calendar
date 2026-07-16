import React, { useState } from 'react';
import type { ConsentFlags } from '../lib/consent-store';
import { PrivacyPolicy } from './PrivacyPolicy';

interface ConsentModalProps {
  onAccept: (flags: Partial<ConsentFlags>) => void;
  onDismiss: () => void;
  policyVersion: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept, onDismiss, policyVersion }) => {
  const [cloudSync, setCloudSync] = useState(false);
  const [genieAI, setGenieAI] = useState(false);
  const [znsReminder, setZnsReminder] = useState(false);
  const [analyticsUsage, setAnalyticsUsage] = useState(false);
  
  const [showPolicy, setShowPolicy] = useState(false);

  const handleConfirm = () => {
    onAccept({
      cloudSync,
      genieAI,
      znsReminder,
      analyticsUsage
    });
  };

  const handleRejectAll = () => {
    onAccept({
      cloudSync: false,
      genieAI: false,
      znsReminder: false,
      analyticsUsage: false
    });
    onDismiss();
  };

  if (showPolicy) {
    return (
      <div role="dialog" aria-modal="true" style={modalStyles.overlay}>
        <div style={modalStyles.container}>
          <button onClick={() => setShowPolicy(false)} style={modalStyles.backBtn}>← Quay lại</button>
          <div style={modalStyles.content}>
            <PrivacyPolicy />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" style={modalStyles.overlay}>
      <div style={modalStyles.container}>
        <h2>Quyền riêng tư của bạn là ưu tiên hàng đầu</h2>
        <p>
          Genie Âm Lịch (bản thương mại) tôn trọng quyền riêng tư của bạn theo luật PDPL. 
          Vui lòng chọn các quyền bạn cho phép chúng tôi sử dụng dữ liệu. 
          Bạn có thể thay đổi bất kỳ lúc nào trong phần Cài đặt.
        </p>
        
        <div style={modalStyles.options}>
          <label style={modalStyles.label}>
            <input 
              type="checkbox" 
              checked={cloudSync} 
              onChange={e => setCloudSync(e.target.checked)} 
            />
            Đồng bộ đám mây (Cloud Sync)
          </label>
          <label style={modalStyles.label}>
            <input 
              type="checkbox" 
              checked={genieAI} 
              onChange={e => setGenieAI(e.target.checked)} 
            />
            Trợ lý ảo AI (Genie)
          </label>
          <label style={modalStyles.label}>
            <input 
              type="checkbox" 
              checked={znsReminder} 
              onChange={e => setZnsReminder(e.target.checked)} 
            />
            Nhắc nhở qua Zalo (ZNS)
          </label>
          <label style={modalStyles.label}>
            <input 
              type="checkbox" 
              checked={analyticsUsage} 
              onChange={e => setAnalyticsUsage(e.target.checked)} 
            />
            Phân tích cải thiện ứng dụng (ẩn danh)
          </label>
        </div>

        <p>
          <button style={modalStyles.linkBtn} onClick={() => setShowPolicy(true)}>
            Xem Chính sách quyền riêng tư (v{policyVersion})
          </button>
        </p>

        <div style={modalStyles.actions}>
          <button 
            aria-label="Từ chối tất cả" 
            onClick={handleRejectAll} 
            style={modalStyles.buttonSecondary}
          >
            Từ chối tất cả
          </button>
          <button 
            aria-label="Xác nhận lựa chọn" 
            onClick={handleConfirm} 
            style={modalStyles.buttonPrimary}
          >
            Xác nhận lựa chọn
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  container: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  content: {
    overflowY: 'auto' as const,
  },
  options: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    margin: '16px 0',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '24px'
  },
  // Ensure both buttons have equal visual weight (size) as required by PDPL task
  buttonPrimary: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #6b21a8',
    backgroundColor: '#6b21a8',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  buttonSecondary: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#f3f4f6',
    color: '#333',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6b21a8',
    cursor: 'pointer',
    padding: '0 0 16px 0',
    textAlign: 'left' as const,
    fontWeight: 'bold'
  }
};
