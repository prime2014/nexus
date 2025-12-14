import { useNavigate, useLocation } from "react-router-dom";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", icon: "pi pi-home", path: "/" },
    { label: "Logs", icon: "pi pi-history", path: "/logs" },
    // { label: "Settings", icon: "pi pi-cog", path: "/settings" },
    

  ];

  return (
    <div
      style={{
        width: 220,
        height: "100vh",
        background: "#f5f5f5",
        position: "fixed",
        overflowY: "auto",
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ marginBottom: "2rem" }}>SerialScope</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {menuItems.map((item) => (
          <li
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              cursor: "pointer",
              padding: "0.75rem 1rem",
              marginBottom: "0.5rem",
              borderRadius: 4,
              background:
                location.pathname === item.path ? "#e0e0e0" : "transparent",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: location.pathname === item.path ? "bold" : "normal",
            }}
          >
            <i className={item.icon}></i>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
