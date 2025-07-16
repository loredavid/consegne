import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Pianificazione from "./pages/Pianificazione";
import Richieste from "./pages/Richieste";
import StatoConsegne from "./pages/StatoConsegne";
import Posizioni from "./pages/Posizioni";
import Autista from "./pages/Autista";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pianificazione" element={<Pianificazione />} />
        <Route path="/richieste" element={<Richieste />} />
        <Route path="/stato-consegne" element={<StatoConsegne />} />
        <Route path="/posizioni" element={<Posizioni />} />
        <Route path="/autista" element={<Autista />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
