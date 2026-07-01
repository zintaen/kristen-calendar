import { getDayQuality } from "../../src/dayquality";
import fs from "fs";
import path from "path";

const FIXTURES = [
  "2025-01-29", // Tet 2025
  ...Array.from({ length: 20 }, (_, i) => {
    const d = new Date("2022-12-01T00:00:00Z");
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  })
];

const results = FIXTURES.map(dStr => {
  const d = new Date(dStr + "T00:00:00Z");
  const q = getDayQuality(d);
  return {
    solarDate: dStr,
    expectedThanTrucNhat: q.thanTrucNhat,
    expectedIsHoangDao: q.isHoangDao,
    expectedTruc: q.truc.name,
    expectedSao28: q.sao28.name
  };
});

fs.writeFileSync(
  "./test/fixtures/dayquality-fixtures.json",
  JSON.stringify(results, null, 2)
);
console.log("Fixtures generated");
