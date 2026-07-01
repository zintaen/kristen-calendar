import React, { useEffect, useState } from "react";
import { Page, Header, Box, Text, List, Button, useNavigate } from "zmp-ui";
import { getReminders } from "../../lib/reminder-service";
import type { ZaloReminder } from "../../types";

const ReminderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ZaloReminder[]>([]);

  useEffect(() => {
    getReminders().then(setReminders);
  }, []);

  return (
    <Page>
      <Header title="Nhắc nhở" />
      <Box p={4}>
        <Button onClick={() => navigate("/reminder/new")} fullWidth>
          + Thêm nhắc nhở
        </Button>
      </Box>
      <List>
        {reminders.map(rem => (
          <List.Item
            key={rem.id}
            title={rem.title}
            subTitle={`${rem.lunarDay}/${rem.lunarMonth}`}
            onClick={() => navigate(`/reminder/${rem.id}`)}
          />
        ))}
        {reminders.length === 0 && (
          <Box p={4} className="text-center">
            <Text>Chưa có nhắc nhở nào.</Text>
          </Box>
        )}
      </List>
    </Page>
  );
};

export default ReminderListPage;
