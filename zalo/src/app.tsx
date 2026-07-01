import React, { useEffect, useState } from "react";
import { App as ZMPApp, ZMPRouter, SnackbarProvider, AnimationRoutes, Route } from "zmp-ui";
import "zmp-ui/zaui.css";
import "./css/app.css";

// Pages
import HomePage from "./pages/home";
import CalendarPage from "./pages/calendar";
import ReminderListPage from "./pages/reminder-list";
import ReminderFormPage from "./pages/reminder-form";
import FestivalDetailPage from "./pages/festival-detail";
import SettingsPage from "./pages/settings";

const App = () => {
  return (
    <ZMPApp>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reminders" element={<ReminderListPage />} />
            <Route path="/reminder/new" element={<ReminderFormPage />} />
            <Route path="/reminder/:id" element={<ReminderFormPage />} />
            <Route path="/festival/:id" element={<FestivalDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </ZMPApp>
  );
};

export default App;
