import React from "react";
import { Typography } from "@cyberskill/genie-ui";
import { getFestivalById, type FestivalContent } from "@cyberskill/genie-content";

// Static param generation for static export
export function generateStaticParams() {
  return [{ id: "vu-lan" }, { id: "tet-nguyen-dan" }];
}

export default async function FestivalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let festival: FestivalContent | undefined;
  try {
    festival = getFestivalById(resolvedParams.id as any);
  } catch (e) {
    festival = undefined;
  }
  
  if (!festival) {
    return (
      <div className="p-4 pt-12 text-center pb-20 min-h-screen">
        <Typography variant="heading-2" className="text-red-500 mb-4">Không tìm thấy</Typography>
        <div className="text-gray-500">Không tìm thấy dịp lễ hội: {resolvedParams.id}</div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 pb-20 min-h-screen">
      <Typography variant="heading-2" className="text-primary mb-2">{festival.name}</Typography>
      <Typography variant="body-small" className="text-gray-500 mb-6">{festival.meaning}</Typography>
      
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <Typography variant="heading-3" className="text-gray-800 mb-2">Chi tiết</Typography>
        {festival.disclaimer && (
          <div className="bg-orange-50 text-orange-800 p-2 text-xs rounded mb-4 italic">
            {festival.disclaimer}
          </div>
        )}
        <div className="text-sm">
          {festival.checklist.map((t, i) => (
            <div key={i} className="mb-1">• {t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
