import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, users } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    const success = await login(mail, password);
    if (success) {
      setError("");
      const found = users.find(u => u.mail === mail && u.password === password);
      if (found) {
        if (found.role === "admin") navigate("/");
        else if (found.role === "autista") navigate("/autista");
        else if (found.role === "pianificatore") navigate("/pianificazione");
        else if (found.role === "richiedente") navigate("/richieste");
        else navigate("/");
      } else {
        navigate("/");
      }
    } else {
      setError("Email o password non corretti.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <div className="text-red-600 text-center mb-4">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={mail}
          onChange={e => setMail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 mb-6 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold">Accedi</button>
      </form>
    </div>
  );
}
