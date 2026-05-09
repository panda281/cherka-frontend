import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "./components/Analytics";
import { Layout } from "./components/Layout";
import { EventDetailPage } from "./pages/EventDetailPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="event/:eventRef" element={<EventDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
