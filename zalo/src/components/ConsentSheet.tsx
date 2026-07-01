import React, { useState, useEffect } from "react";
import { Sheet, Button, Text, Box } from "zmp-ui";
import { fetchUserInfo, fetchPhoneNumber } from "../lib/zalo-auth";
import { loadStorageData, saveSettings } from "../lib/storage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConsentGranted: () => void;
}

export const ConsentSheet: React.FC<Props> = ({ visible, onClose, onConsentGranted }) => {
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    setLoading(true);
    try {
      const data = await loadStorageData();
      
      // Prompt user for info + phone
      const userInfo = await fetchUserInfo();
      const phoneToken = await fetchPhoneNumber();

      // Save to local storage
      data.settings.displayName = userInfo.name;
      data.settings.phone = phoneToken; // Server will exchange this later
      data.settings.consentFlags = {
        userInfoGranted: true,
        phoneGranted: true,
      };
      
      await saveSettings(data.settings);
      onConsentGranted();
    } catch (e) {
      console.error("Consent failed", e);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} autoHeight>
      <Box p={4} className="text-center">
        <Text.Title>Cấp quyền ứng dụng</Text.Title>
        <Box mt={2} mb={6}>
          <Text>
            Để gửi nhắc nhở qua Zalo (ZNS) và hiển thị tên bạn, Genie Âm Lịch cần quyền truy cập 
            thông tin cơ bản và số điện thoại của bạn.
          </Text>
        </Box>
        <Button onClick={handleConsent} fullWidth loading={loading}>
          Đồng ý
        </Button>
      </Box>
    </Sheet>
  );
};
