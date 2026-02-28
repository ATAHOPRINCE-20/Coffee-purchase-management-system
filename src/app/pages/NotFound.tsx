import React from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Not Found" }]}>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-7xl mb-6">☕</div>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Page Not Found</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl hover:opacity-90"
          style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600 }}
        >
          <Home size={16} />
          Back to Dashboard
        </button>
      </div>
    </Layout>
  );
}
