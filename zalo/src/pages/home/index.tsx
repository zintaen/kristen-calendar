import React, { useEffect, useState } from "react";
import { Page, Header, Text, Box, Button, useNavigate } from "zmp-ui";
import { todayLunar, todaySolar, canChiForJdn } from "../../lib/day-computer";
import { jdFromDate } from "@cyberskill/amlich-core";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [lunarDate, setLunarDate] = useState<any>(null);
  const [canChi, setCanChi] = useState<any>(null);

  useEffect(() => {
    const lunar = todayLunar();
    const solar = todaySolar();
    const jdn = jdFromDate(solar[0], solar[1], solar[2]);
    const cc = canChiForJdn(jdn);
    setLunarDate(lunar);
    setCanChi(cc);
  }, []);

  return (
    <Page className="bg-primary">
      <Header title="Hôm nay" showBackIcon={false} />
      <Box p={4} className="text-center">
        {lunarDate && canChi && (
          <>
            <Text size="xLarge" className="text-white" bold>
              {lunarDate[0]}/{lunarDate[1]}
            </Text>
            <Text className="text-white">
              Năm {lunarDate[2]} {lunarDate[3] === 1 ? "(Nhuận)" : ""}
            </Text>
            <Box mt={2}>
              <Text className="text-white">Ngày {canChi.label}</Text>
            </Box>
          </>
        )}
      </Box>
      <Box p={4} className="bg-white" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: "60vh" }}>
        <Text.Title>Sự kiện sắp tới</Text.Title>
        <Box mt={4} flex flexDirection="column" style={{ gap: 12 }}>
          <Button onClick={() => navigate("/calendar")} variant="secondary">Xem lịch tháng</Button>
          <Button onClick={() => navigate("/reminders")} variant="secondary">Quản lý nhắc nhở</Button>
          <Button onClick={() => navigate("/settings")} variant="secondary">Cài đặt ZNS</Button>
        </Box>
      </Box>
    </Page>
  );
};

export default HomePage;
