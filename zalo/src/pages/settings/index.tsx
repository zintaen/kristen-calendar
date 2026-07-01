import React, { useEffect, useState } from "react";
import { Page, Header, Box, Text, Switch, List } from "zmp-ui";
import { loadStorageData, saveSettings } from "../../lib/storage";
import { ConsentSheet } from "../../components/ConsentSheet";

const SettingsPage: React.FC = () => {
  const [znsEnabled, setZnsEnabled] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    loadStorageData().then(data => {
      setZnsEnabled(data.settings.znsEnabled);
      setGranted(data.settings.consentFlags.phoneGranted);
    });
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked && !granted) {
      setShowConsent(true);
    } else {
      updateZns(checked);
    }
  };

  const updateZns = async (enabled: boolean) => {
    setZnsEnabled(enabled);
    const data = await loadStorageData();
    data.settings.znsEnabled = enabled;
    await saveSettings(data.settings);
  };

  return (
    <Page>
      <Header title="Cài đặt" />
      <List>
        <List.Item
          title="Nhắc nhở qua Zalo (ZNS)"
          subTitle="Nhận tin nhắn Zalo khi đến ngày lễ/giỗ"
          suffix={<Switch checked={znsEnabled} onChange={(e) => handleToggle(e.target.checked)} />}
        />
      </List>
      
      <ConsentSheet 
        visible={showConsent} 
        onClose={() => setShowConsent(false)}
        onConsentGranted={() => {
          setGranted(true);
          updateZns(true);
        }}
      />
    </Page>
  );
};

export default SettingsPage;
