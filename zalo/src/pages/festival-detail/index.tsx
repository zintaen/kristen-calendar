import React from "react";
import { Page, Header, Box, Text } from "zmp-ui";
import { useParams } from "react-router-dom";
import { FESTIVALS } from "@cyberskill/genie-content";

const FestivalDetailPage: React.FC = () => {
  const { id } = useParams();
  const festival = FESTIVALS.find(f => f.id === id);

  return (
    <Page>
      <Header title={festival ? festival.name : "Chi tiết dịp lễ"} />
      <Box p={4}>
        {festival ? (
          <>
            <Text.Title>{festival.name}</Text.Title>
            <Box mt={2}><Text>{festival.meaning}</Text></Box>
          </>
        ) : (
          <Text>Không tìm thấy thông tin.</Text>
        )}
      </Box>
    </Page>
  );
};

export default FestivalDetailPage;
