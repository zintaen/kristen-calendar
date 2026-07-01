import React from "react";
import { Page, Header, Box, Text, Button } from "zmp-ui";
import { useParams, useNavigate } from "react-router-dom";

const ReminderFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Page>
      <Header title={id ? "Sửa nhắc nhở" : "Thêm nhắc nhở"} />
      <Box p={4}>
        <Text>Form nhập liệu sẽ ở đây.</Text>
        <Box mt={4}>
          <Button onClick={() => navigate(-1)}>Lưu lại</Button>
        </Box>
      </Box>
    </Page>
  );
};

export default ReminderFormPage;
