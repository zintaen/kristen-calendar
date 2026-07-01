import type { FestivalContent, _InternalRecord } from "./types";

export const FESTIVALS: readonly FestivalContent[] = [
  {
    id: "mung-mot",
    name: "Mùng Một",
    lunarDay: 1,
    lunarMonth: null,    // lap lai vao ngay 1 am lich moi thang
    meaning: "Ngày đầu tháng âm lịch, cúng cầu an cho gia đình và thờ gia tiên, thần linh.",
    offerings: [
      "Hương",
      "Hoa (hoa cúc, hoa ly, hoặc hoa theo mùa)",
      "Trái cây ngũ quả",
      "Trà",
      "Bánh kẹo",
      "Đồ chay hoặc mặn tùy theo phong tục từng nhà"
    ],
    checklist: [
      "Chuẩn bị mâm cúng trước 12h trưa",
      "Thắp hương bàn thờ gia tiên",
      "Dọn dẹp bàn thờ sạch sẽ trước khi cúng"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ram",
    name: "Rằm",
    lunarDay: 15,
    lunarMonth: null,    // lap lai vao ngay 15 am lich moi thang
    meaning: "Ngày trăng tròn, lễ Phật và cúng gia tiên, cầu bình an cho gia đình.",
    offerings: [
      "Hương",
      "Hoa",
      "Ngũ quả",
      "Trà",
      "Đồ chay hoặc mặn"
    ],
    checklist: [
      "Thắp hương và cúng lễ trong ngày Rằm",
      "Có thể đi chùa lễ Phật nếu muốn"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "giao-thua",
    name: "Giao thừa",
    lunarDay: 30,
    lunarMonth: 12,     // dem 30 thang Chap (hoac dem 29 neu thang Chap khong du 30 ngay)
    meaning: "Thời khắc tiễn đưa năm cũ và đón chào năm mới, cúng lễ trời đất và gia tiên.",
    offerings: [
      "Gà luộc",
      "Xôi",
      "Bánh chưng (Bắc) hoặc bánh tét (Nam)",
      "Ngũ quả",
      "Hương đăng",
      "Mâm cúng trong nhà và ngoài trời (sân hoặc ban công)"
    ],
    checklist: [
      "Chuẩn bị hai mâm cúng: một trong nhà cho gia tiên, một ngoài trời cho trời đất",
      "Đúng 12h đêm thắp hương đón giao thừa",
      "Mở cửa đón không khí mới vào nhà"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "mung-mot-tet",
    name: "Mùng 1 Tết (Tết Nguyên Đán)",
    lunarDay: 1,
    lunarMonth: 1,
    meaning: "Tết Nguyên Đán, ngày lễ lớn nhất trong năm của người Việt, cúng tổ tiên và cầu may mắn năm mới.",
    offerings: [
      "Xôi",
      "Gà luộc",
      "Bánh chưng (Bắc) hoặc bánh tét (Nam)",
      "Hoa quả",
      "Mâm cao cỗ đầy theo điều kiện gia đình",
      "Cành mai (Nam) hoặc cành đào (Bắc)"
    ],
    checklist: [
      "Cúng gia tiên từ sáng sớm Mùng 1",
      "Mặc trang phục đẹp, tránh mặc đồ tối màu",
      "Chúc Tết ông bà cha mẹ và nhận lì xì",
      "Tránh quét nhà vào Mùng 1 (sợ quét hết may mắn)"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ong-cong-ong-tao",
    name: "Ông Công Ông Táo",
    lunarDay: 23,
    lunarMonth: 12,
    meaning: "Lễ tiễn Táo Quân về trời báo cáo với Ngọc Hoàng về việc làm của gia đình trong năm qua.",
    offerings: [
      "Cá chép sống (thả ra ao hồ, sông sau khi cúng) hoặc cá chép vàng mã",
      "Mũ áo Táo Quân (vàng mã)",
      "Mâm cỗ mặn hoặc chay",
      "Vàng mã",
      "Hương, hoa, trà"
    ],
    checklist: [
      "Cúng trước 12h trưa ngày 23 tháng Chạp",
      "Mua cá chép sống để thả nếu có điều kiện",
      "Đốt vàng mã mũ áo Táo Quân sau khi cúng xong",
      "Thả cá chép ra ao/sông sau lễ"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "ram-thang-gieng",
    name: "Rằm tháng Giêng (Tết Nguyên Tiêu)",
    lunarDay: 15,
    lunarMonth: 1,
    meaning: "\"Lễ quanh năm không bằng Rằm tháng Giêng\" - ngày Thượng nguyên, lễ Phật và cúng gia tiên lớn đầu năm.",
    offerings: [
      "Mâm cỗ chay hoặc mặn dâng Phật và gia tiên",
      "Ngũ quả",
      "Hương, hoa, đèn nến",
      "Xôi, chè"
    ],
    checklist: [
      "Đi chùa lễ Phật cầu an đầu năm",
      "Cúng gia tiên tại nhà",
      "Dọn dẹp bàn thờ và thay hoa mới"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "via-than-tai",
    name: "Vía Thần Tài",
    lunarDay: 10,
    lunarMonth: 1,
    meaning: "Ngày vía Thần Tài, đặc biệt quan trọng với người kinh doanh, cầu tài lộc và thuận lợi trong buôn bán.",
    offerings: [
      "Hoa (hoa cúc vàng hoặc hoa hồng đỏ)",
      "Trái cây",
      "Bộ tam sên (trứng luộc, miếng thịt luộc, tôm/cua luộc)",
      "Vàng mã",
      "Nhang đèn"
    ],
    checklist: [
      "Mua vàng (nhẫn, dây chuyền vàng nhỏ) vào buổi sáng sớm để cầu may",
      "Cúng Thần Tài tại nhà hoặc cửa hàng trước giờ mở cửa",
      "Trang trí bàn thờ Thần Tài sạch sẽ, tươm tất"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "thanh-minh",
    name: "Tết Thanh Minh",
    lunarDay: null,      // khong co ngay am co dinh; tinh tu tiet khi Thanh Minh (~4-6/4 duong lich)
    lunarMonth: null,    // CONTRACT: lunarDay:null => getFestivalByLunarDate se bo qua ban ghi nay
    meaning: "Tết tảo mộ, dịp con cháu thăm viếng, dọn dẹp mộ phần tổ tiên và tưởng nhớ nguồn cội.",
    offerings: [
      "Mâm cúng tại mộ tổ tiên: xôi, gà, hoa quả, hương đèn",
      "Vàng mã",
      "Hoa tươi"
    ],
    checklist: [
      "Đi tảo mộ, dọn dẹp cỏ dại và sửa sang mộ phần",
      "Thắp hương tại mộ và mời tổ tiên về hưởng lễ",
      "Cả gia đình quây quần, nhớ về tổ tiên"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; ngày chính xác tính theo tiết khí Thanh Minh, không phải ngày âm cố định."
  },
  {
    id: "gio-to-hung-vuong",
    name: "Giỗ Tổ Hùng Vương",
    lunarDay: 10,
    lunarMonth: 3,
    meaning: "Quốc lễ tưởng nhớ các vua Hùng - tổ tiên của người Việt Nam, ngày nghỉ lễ quốc gia.",
    offerings: [
      "Bánh chưng",
      "Bánh giầy",
      "Hương, hoa, ngũ quả"
    ],
    checklist: [
      "Thắp hương tưởng nhớ vua Hùng tại bàn thờ gia tiên",
      "Có thể tham gia lễ hội tại địa phương nếu có tổ chức"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "doan-ngo",
    name: "Tết Đoan Ngọ",
    lunarDay: 5,
    lunarMonth: 5,
    meaning: "\"Tết giết sâu bọ\", dịp trừ tà, giải nhiệt giữa mùa hè và giao mùa, tục ăn cơm rượu nếp để diệt sâu bọ trong người.",
    offerings: [
      "Cơm rượu nếp",
      "Bánh tro/bánh ú (phổ biến miền Trung và Nam)",
      "Mận, vải thiều (theo mùa)",
      "Hương, hoa, ngũ quả"
    ],
    checklist: [
      "Ăn cơm rượu nếp vào giờ Ngọ (11-13h) theo tục truyền",
      "Cúng gia tiên và thần linh trong ngày",
      "Hái lá thuốc sáng sớm (tục một số vùng)"
    ],
    regionVariants: [
      {
        region: "BAC",
        note: "Miền Bắc ăn cơm rượu nếp, mận, vải thiều; cúng đơn giản."
      },
      {
        region: "TRUNG",
        note: "Miền Trung có chè kê đặc trưng và bánh ú lá tre bên cạnh cơm rượu."
      },
      {
        region: "NAM",
        note: "Miền Nam ăn chè trôi nước và bánh xèo bên cạnh cơm rượu nếp."
      }
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "vu-lan",
    name: "Vu Lan / Rằm tháng Bảy",
    lunarDay: 15,
    lunarMonth: 7,
    meaning: "Lễ Vu Lan báo hiếu và Xá tội vong nhân (cúng cô hồn) - được coi là \"mâm cúng lớn nhất năm\" trong nhiều gia đình Việt.",
    offerings: [
      "Mâm cúng gia tiên: xôi, gà, hoa quả, hương đèn",
      "Mâm cúng chúng sinh/cô hồn: cháo loãng, gạo muối, bỏng ngô, khoai luộc, bánh kẹo, tiền vàng mã",
      "Phóng sinh (chim, cá) nếu có điều kiện",
      "Cơm chay"
    ],
    checklist: [
      "Cúng gia tiên trước (mâm mặn hoặc chay)",
      "Cúng cô hồn/chúng sinh ngoài sân hoặc vỉa hè sau khi cúng gia tiên",
      "Đi chùa lễ Phật cầu siêu và báo hiếu cha mẹ",
      "Cài hoa hồng lên ngực (hồng đỏ = cha mẹ còn sống; hồng trắng = đã mất)"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "trung-thu",
    name: "Tết Trung Thu",
    lunarDay: 15,
    lunarMonth: 8,
    meaning: "Tết đoàn viên và Tết thiếu nhi, ngày trăng tròn tháng 8, gia đình sum họp phá cỗ dưới trăng.",
    offerings: [
      "Bánh Trung Thu (bánh nướng, bánh dẻo)",
      "Mâm ngũ quả",
      "Cúng trăng ngoài trời"
    ],
    checklist: [
      "Chuẩn bị bánh Trung Thu và hoa quả để phá cỗ",
      "Tổ chức cho trẻ em rước đèn lồng tối 14 hoặc 15 tháng 8",
      "Gia đình sum họp phá cỗ dưới trăng"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  },
  {
    id: "dam-gio-ca-nhan",
    name: "Đám giỗ cá nhân",
    lunarDay: null,      // do nguoi dung nhap qua Reminder; khong co ngay am co dinh
    lunarMonth: null,
    meaning: "Ngày giỗ tưởng nhớ người thân đã mất trong gia đình, tổ chức mâm cỗ theo phong tục từng nhà.",
    offerings: [
      "Mâm cỗ gia đình theo phong tục (mặn hoặc chay theo sở thích người mất và gia đình)",
      "Món ăn yêu thích của người mất (nếu nhớ và có thể làm)",
      "Hương, hoa, hoa quả",
      "Vàng mã"
    ],
    checklist: [
      "Chuẩn bị mâm cỗ đúng ngày giỗ (ngày mất tính theo âm lịch)",
      "Mời họ hàng thân thiết đến giỗ nếu điều kiện cho phép",
      "Thắp hương tưởng nhớ người đã mất"
    ],
    disclaimer: "Tham khảo theo phong tục dân gian; cách cúng có thể khác nhau theo từng gia đình và vùng miền."
  }
] as const;
