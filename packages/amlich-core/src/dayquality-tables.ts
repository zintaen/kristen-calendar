import type { ThanTrucNhat, GioInfo, Truc, Sao28 } from "./dayquality";

export const THAN_TRUC_NHAT_TABLE: readonly ThanTrucNhat[][] = [
  ["Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy"],
  ["Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang"],
  ["Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong"],
  ["Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh"],
  ["Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho"],
  ["Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh"],
  ["Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc"],
  ["Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao"],
  ["Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu"],
  ["Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran"],
  ["Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long","Nguyen Vu","Chu Tuoc","Bach Ho","Ngoc Duong","Kim Quy","Thanh Long"],
  ["Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong","Cau Tran","Thien Lao","Thien Hinh","Tu Menh","Bao Quang","Minh Duong"],
] as const;

export const GIO_HOANG_DAO_TABLE: readonly GioInfo[][] = [
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":true},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":true},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":false},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":false}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":false},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":true},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":true},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":false},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":false},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":true},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":true},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":false},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}],
  [{"canh":"Ty (23:00-01:00)","tuGio":"23:00","denGio":"01:00","isHoang":false},{"canh":"Suu (01:00-03:00)","tuGio":"01:00","denGio":"03:00","isHoang":true},{"canh":"Dan (03:00-05:00)","tuGio":"03:00","denGio":"05:00","isHoang":false},{"canh":"Meo (05:00-07:00)","tuGio":"05:00","denGio":"07:00","isHoang":false},{"canh":"Thin (07:00-09:00)","tuGio":"07:00","denGio":"09:00","isHoang":true},{"canh":"Ti (09:00-11:00)","tuGio":"09:00","denGio":"11:00","isHoang":false},{"canh":"Ngo (11:00-13:00)","tuGio":"11:00","denGio":"13:00","isHoang":true},{"canh":"Mui (13:00-15:00)","tuGio":"13:00","denGio":"15:00","isHoang":true},{"canh":"Than (15:00-17:00)","tuGio":"15:00","denGio":"17:00","isHoang":false},{"canh":"Dau (17:00-19:00)","tuGio":"17:00","denGio":"19:00","isHoang":false},{"canh":"Tuat (19:00-21:00)","tuGio":"19:00","denGio":"21:00","isHoang":true},{"canh":"Hoi (21:00-23:00)","tuGio":"21:00","denGio":"23:00","isHoang":true}]
] as const;

export const BASE_JDN_GIAC = 2459915;

export const TRUC_SUITABLE_AVOID: Record<Truc, { suitableFor: string[], avoidFor: string[] }> = {
  Kien: {
    suitableFor: ["Xuat hanh", "Giao dich", "Khai truong"],
    avoidFor: ["Dong tho", "Chon cat"]
  },
  Tru: {
    suitableFor: ["Don dep", "Giai han", "Chua benh"],
    avoidFor: ["Khai truong", "Ky hop dong", "Ket hon"]
  },
  Man: {
    suitableFor: ["Xay dung", "Cau tai", "Te tu"],
    avoidFor: ["Chua benh", "Kien tung", "Nham chuc"]
  },
  Binh: {
    suitableFor: ["Sua chua", "Di lai", "Lap ke hoach"],
    avoidFor: ["Chon cat", "To tung"]
  },
  Dinh: {
    suitableFor: ["Giao dich", "Xay dung", "Cau tai"],
    avoidFor: ["Kien tung", "Chua benh"]
  },
  Chap: {
    suitableFor: ["Trong trot", "Chon cat", "Xay dung"],
    avoidFor: ["Khai truong", "Xuat hanh"]
  },
  Pha: {
    suitableFor: ["Pha do", "Chua benh", "Trat tu"],
    avoidFor: ["Khai truong", "Giao dich", "Ket hon"]
  },
  Nguy: {
    suitableFor: ["Nghi ngoi", "Te tu"],
    avoidFor: ["Ket hon", "Xuat hanh", "Dong tho"]
  },
  Thanh: {
    suitableFor: ["Khai truong", "Ket hon", "Nhap hoc", "Giao dich"],
    avoidFor: ["Chon cat", "Pha do"]
  },
  Thu: {
    suitableFor: ["Thu hoach", "Cach ly", "Giai quyet no nan"],
    avoidFor: ["Khai truong", "Xuat hanh", "Ket hon"]
  },
  Khai: {
    suitableFor: ["Khai truong", "Xuat hanh", "Ket hon", "Mo khoa"],
    avoidFor: ["Chon cat", "Chua benh"]
  },
  Be: {
    suitableFor: ["Xay tuong", "Cat giau", "Lap di chuc"],
    avoidFor: ["Khai truong", "Ket hon", "Giao dich"]
  }
};

export const SAO_28_INFO_MAP: Record<Sao28, { rating: "tot"|"xau"|"binh", notes: string }> = {
  Giac: { rating: "tot", notes: "Tot cho viec xay dung, giao dich, thang tien" },
  Cang: { rating: "xau", notes: "Xau cho viec ket hon, xuat hanh" },
  De: { rating: "xau", notes: "Ky dong tho, xay dung" },
  Phong: { rating: "tot", notes: "Dai cat cho moi viec, dac biet la thi cu, hanh trinh" },
  Tam: { rating: "xau", notes: "Dai hung, ky cac viec lon nhu ket hon, giao dich" },
  Tinh: { rating: "binh", notes: "Tot cho cac viec the thao, quan trong, cong van" },
  Vo: { rating: "tot", notes: "Khai truong, nhap hoc, ban hang" },
  Quy: { rating: "xau", notes: "Thuong xau cho viec le nghia, quan trong" },
  Liu: { rating: "xau", notes: "Ky cac viec tang che, phat nguyen" },
  Tinh28: { rating: "xau", notes: "Xau cho cac viec xay dung, chuyen nha" },
  Chang: { rating: "binh", notes: "Thuong de nghi ngoi, ki viec lon" },
  I: { rating: "xau", notes: "Xau cho hau het cac viec lon, di chuyen" },
  Chan: { rating: "tot", notes: "Dai cat cho xay dung, ket hon, giao dich" },
  Goc: { rating: "tot", notes: "Tot cho viec khoa cu, thang quan, ket hon" },
  Lau: { rating: "tot", notes: "Tot cho viec khai truong, xep dat" },
  Vi28: { rating: "tot", notes: "Tot cho viec cau tai, khanh thanh, xay dung" },
  Mao28: { rating: "xau", notes: "Xau cho viec to tung, khien khich" },
  Tat: { rating: "tot", notes: "Dai cat cho the thao, kinh doanh" },
  Truy: { rating: "xau", notes: "Ki cac viec le hoi, di nuoc ngoai" },
  Cam: { rating: "tot", notes: "Tot cho van phong, thu tin, kinh doanh" },
  Giai: { rating: "binh", notes: "Trung binh, nen can trong moi viec" },
  Cu: { rating: "tot", notes: "Tot cho viec sua chua nha cua, nhung ky kien tung" },
  Phap: { rating: "tot", notes: "Hop viec cau tai, tho cung" },
  Khuy: { rating: "binh", notes: "Trung binh, tranh viec the thao mui nhon" },
  Luu28: { rating: "xau", notes: "Tranh viec tranh cai, phat an" },
  Nhat: { rating: "tot", notes: "Tot cho viec dung nha, giao dich" },
  Pi: { rating: "tot", notes: "Tot cho viec te tu, cat the, tuong tac" },
  Chan28: { rating: "xau", notes: "Dai hung, tranh viec cuoi hoi, nhap trach" }
};
