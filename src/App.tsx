import { Navigate, Route, Routes } from "react-router-dom";
import ControlPage from "./pages/ControlPage";
import DisplayPage from "./pages/DisplayPage";
export default function App() {
    return (
        <Routes>
            <Route path="/control" element={<ControlPage />} />
            <Route path="/display" element={<DisplayPage />} />
            <Route path="*" element={<Navigate to="/control" replace />} />
        </Routes>
    );
}
