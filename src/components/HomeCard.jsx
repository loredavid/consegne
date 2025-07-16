import { Link } from "react-router-dom";

export default function HomeCard({ title, desc, to, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md text-center">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-500 mb-4">{desc}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {icon}
        Vai a {title}
      </Link>
    </div>
  );
}
