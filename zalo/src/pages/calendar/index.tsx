import React from "react";
import { Page, Header, Box, Text } from "zmp-ui";

const CalendarPage: React.FC = () => {
  return (
    <Page>
      <Header title="Lịch tháng" />
      <Box p={4}>
        <Text>Tính năng lịch tháng (Grid) sẽ hiển thị ở đây.</Text>
      </Box>
    </Page>
  );
};

export default CalendarPage;
