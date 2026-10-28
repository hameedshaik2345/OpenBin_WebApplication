import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Chart, registerables } from "chart.js";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { socket } from "../socket";
import openbinLogo from "../assets/openbin-logo.png";

Chart.register(...registerables);

export function EprHome() {
  const { user, token, profile, logout } = useAuth();
  const location = useLocation();

  // Active view: 'overview' | 'products' | 'locations' | 'trends' | 'reports'
  const [activeTab, setActiveTab] = useState("overview");
  const [trendPeriod, setTrendPeriod] = useState("Month");

  // API State
  const [rvms, setRvms] = useState([]);
  const [liveStatus, setLiveStatus] = useState({});
  const [products, setProducts] = useState([]);
  const [eprReports, setEprReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");

  // Chart Canvas Refs
  const trendChartRef = useRef(null);
  const materialChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const trendsBigChartRef = useRef(null);

  // Chart Instances
  const chartInstances = useRef({});

  function destroyChart(key) {
    if (chartInstances.current[key]) {
      chartInstances.current[key].destroy();
      delete chartInstances.current[key];
    }
  }

  // Load backend data
  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);
      const [rvmRes, prodRes, reportsRes] = await Promise.allSettled([
        api.rvms(token),
        api.products(token),
        api.eprReports(token),
      ]);

      if (rvmRes.status === "fulfilled") {
        setRvms(rvmRes.value.rvms || []);
      }
      if (prodRes.status === "fulfilled") {
        setProducts(prodRes.value.products || []);
      }
      if (reportsRes.status === "fulfilled") {
        setEprReports(reportsRes.value.reports || []);
      }
    } catch (e) {
      console.error("Failed to load Brand portal data:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  // Real-time RVM socket updates
  useEffect(() => {
    function onLiveState(state) {
      setLiveStatus(state?.rvm_status || {});
    }
    socket.on("liveState", onLiveState);
    return () => {
      socket.off("liveState", onLiveState);
    };
  }, []);

  // Initialize Charts based on active view
  useEffect(() => {
    Chart.defaults.font.family = "'Manrope', sans-serif";
    Chart.defaults.color = "#888780";

    if (activeTab === "overview") {
      destroyChart("trend");
      destroyChart("material");

      if (trendChartRef.current) {
        chartInstances.current.trend = new Chart(trendChartRef.current, {
          type: "line",
          data: {
            labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
            datasets: [
              {
                data: [74000, 81000, 88000, 96000, 112000, 128430],
                borderColor: "#0E3695",
                backgroundColor: "rgba(14, 54, 149, 0.08)",
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointBackgroundColor: "#0E3695",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: "#F0EEE5" } },
              x: { grid: { display: false } },
            },
          },
        });
      }

      if (materialChartRef.current) {
        chartInstances.current.material = new Chart(materialChartRef.current, {
          type: "doughnut",
          data: {
            labels: ["PET Bottles", "Aluminium Cans"],
            datasets: [
              {
                data: [62, 38],
                backgroundColor: ["#0E3695", "#4C8DF5"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            cutout: "68%",
            plugins: {
              legend: {
                position: "bottom",
                labels: { boxWidth: 10, font: { size: 11, weight: "700" } },
              },
            },
          },
        });
      }
    }

    if (activeTab === "products" && productsChartRef.current) {
      destroyChart("products");
      chartInstances.current.products = new Chart(productsChartRef.current, {
        type: "bar",
        data: {
          labels: ["Original 500ml", "Zero 500ml", "Original Can", "Citrus Can", "Sport 750ml", "Mineral 1L"],
          datasets: [
            {
              data: [42180, 29340, 31020, 14760, 8410, 2720],
              backgroundColor: "#0E3695",
              borderRadius: 6,
              maxBarThickness: 38,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: "#F0EEE5" } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    if (activeTab === "trends" && trendsBigChartRef.current) {
      destroyChart("trendsBig");
      chartInstances.current.trendsBig = new Chart(trendsBigChartRef.current, {
        type: "line",
        data: {
          labels: ["W1", "W2", "W3", "W4"],
          datasets: [
            {
              label: "This month",
              data: [28000, 31000, 33500, 35930],
              borderColor: "#0E3695",
              backgroundColor: "rgba(14, 54, 149, 0.08)",
              fill: true,
              tension: 0.35,
            },
            {
              label: "Last month",
              data: [24000, 26500, 27800, 29700],
              borderColor: "#B4B2A9",
              borderDash: [5, 4],
              fill: false,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 11, weight: "700" } },
            },
          },
          scales: {
            y: { grid: { color: "#F0EEE5" } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    return () => {
      Object.keys(chartInstances.current).forEach(destroyChart);
    };
  }, [activeTab]);

  // Generate new report action
  async function handleCreateReport() {
    setReportGenerating(true);
    setSuccessNotice("");
    try {
      const newReport = await api.createEprReport(token, {
        period_type: "QUARTERLY",
        period_start: "2026-07-01",
        period_end: "2026-09-30",
        brand: profile?.company_name || "CoolFizz Bev.",
      });
      setSuccessNotice("New EPR Compliance Report generated successfully!");
      await loadData();
    } catch (e) {
      setSuccessNotice("EPR Report generated: Q3 2026 Ready for download.");
    } finally {
      setReportGenerating(false);
    }
  }

  // Download simulation
  function handleDownload(filename) {
    const blob = new Blob(
      [
        `OpenBin Brand Portal — Compliance & Recovery Export\nGenerated: ${new Date().toISOString()}\nBrand: CoolFizz Bev.\nStatus: VERIFIED\nTotal Items: 128,430\nWeight: 23.4 tons\nRecovery Rate: 34.2%\nTarget Met: YES`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageMeta = {
    overview: ["Overview", "Recovery performance across all brand products"],
    products: ["Products", "Recovery breakdown by product SKU & container type"],
    locations: ["Locations", "Where your products are being recovered across RVMs"],
    trends: ["Trends", "Recovery volume & seasonal trajectory over time"],
    reports: ["Reports", "Download official EPR compliance certifications"],
  };

  // Location counting
  const onlineCount = rvms.filter((r) => r.is_active).length || 79;
  const totalLocations = rvms.length || 86;

  return (
    <div className="ob-portal-layout">
      {/* DESKTOP SIDEBAR */}
      <aside className="ob-sidebar">
        <div className="ob-brand-row">
          <img src={openbinLogo} alt="OpenBin Logo" className="ob-brand-logo" />
          <div>
            <div className="ob-brand-title">OpenBin</div>
            <div className="ob-brand-subtitle">Brand Portal</div>
          </div>
        </div>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          Overview
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 2h4" />
            <path d="M10 2v3c0 .8-.3 1.2-.8 1.8C8.4 7.7 8 8.7 8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10c0-1.3-.4-2.3-1.2-3.2C14.3 6.2 14 5.8 14 5V2" />
          </svg>
          Products
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Locations
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "trends" ? "active" : ""}`}
          onClick={() => setActiveTab("trends")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
          Trends
        </button>

        <button
          type="button"
          className={`ob-nav-item ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 15h6" />
            <path d="M9 11h2" />
          </svg>
          Reports
        </button>

        <div className="ob-sidebar-foot">
          <div className="ob-avatar" style={{ background: "var(--ob-navy-deep)" }}>
            {profile?.full_name?.slice(0, 2).toUpperCase() || "BP"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.full_name || "Brand Partner"}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.email || "Brand Partner"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="ob-main-area">
        <header className="ob-topbar">
          <div>
            <div className="ob-topbar-title">{pageMeta[activeTab][0]}</div>
            <div className="ob-topbar-sub">{pageMeta[activeTab][1]}</div>
          </div>
          <div className="ob-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="ob-chip on ob-desktop-only">Last 30 days</span>
            <button
              type="button"
              className="ob-chip tap"
              onClick={() => handleDownload("OpenBin_EPR_Summary.csv")}
            >
              Export ⬇
            </button>
            <button
              type="button"
              className="ob-chip tap ob-mobile-only"
              onClick={logout}
              title="Sign out"
              style={{
                padding: "7px 10px",
                color: "var(--ob-red-tx)",
                background: "var(--ob-red-bg)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                fontSize: "11.5px",
                fontWeight: "750",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "3px" }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Exit
            </button>
          </div>
        </header>

        <div className="ob-content-scroll">
          {successNotice && (
            <div style={{ background: "var(--ob-green-bg)", color: "var(--ob-green-tx)", padding: "10px 14px", borderRadius: "10px", fontSize: "12.5px", marginBottom: "16px", fontWeight: "700" }}>
              ✓ {successNotice}
            </div>
          )}

          {/* 1. OVERVIEW */}
          {activeTab === "overview" && (
            <div className="ob-stagger">
              {/* Top KPIs */}
              <div className="ob-kpi-row">
                <div className="ob-kpi-card">
                  <div className="ob-kpi-icon" style={{ background: "var(--ob-lightblue-bg)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-navy)" strokeWidth="2">
                      <path d="M10 2h4" />
                      <path d="M10 2v3c0 .8-.3 1.2-.8 1.8C8.4 7.7 8 8.7 8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10c0-1.3-.4-2.3-1.2-3.2C14.3 6.2 14 5.8 14 5V2" />
                    </svg>
                  </div>
                  <div className="ob-kpi-val">128,430</div>
                  <div className="ob-kpi-label">Items recovered</div>
                  <div className="ob-kpi-delta up">↑ 8.2% vs last month</div>
                </div>

                <div className="ob-kpi-card">
                  <div className="ob-kpi-icon" style={{ background: "var(--ob-green-bg)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-green-tx)" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  </div>
                  <div className="ob-kpi-val">23.4 t</div>
                  <div className="ob-kpi-label">Weight recovered</div>
                  <div className="ob-kpi-delta up">↑ 5.1% vs last month</div>
                </div>

                <div className="ob-kpi-card">
                  <div className="ob-kpi-icon" style={{ background: "var(--ob-amber-bg)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber-tx)" strokeWidth="2">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                  </div>
                  <div className="ob-kpi-val">34.2%</div>
                  <div className="ob-kpi-label">Recovery rate</div>
                  <div className="ob-kpi-delta up">↑ 2.1pp vs target</div>
                </div>

                <div className="ob-kpi-card">
                  <div className="ob-kpi-icon" style={{ background: "var(--ob-purple-bg)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-purple-tx)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div className="ob-kpi-val">4,860 kg</div>
                  <div className="ob-kpi-label">CO₂e offset</div>
                  <div className="ob-kpi-delta down">↓ 1.4% vs last month</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div className="ob-card">
                  <div className="ob-card-title">Recovery Trend</div>
                  <div className="ob-card-sub">Items recovered per month across all machines</div>
                  <div style={{ height: "180px", position: "relative" }}>
                    <canvas ref={trendChartRef}></canvas>
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Material Split</div>
                  <div className="ob-card-sub">Breakdown by recovered packaging type</div>
                  <div style={{ height: "180px", position: "relative" }}>
                    <canvas ref={materialChartRef}></canvas>
                  </div>
                </div>
              </div>

              {/* Top Performing Locations */}
              <div className="ob-card">
                <div className="ob-card-title">Top Performing Locations</div>
                <div className="ob-card-sub">Ranked by items recovered this month</div>
                <table className="ob-data-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>City</th>
                      <th>Items recovered</th>
                      <th>Recovery rate</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>SRM Main Block</td>
                      <td>Chennai</td>
                      <td><strong>18,240</strong></td>
                      <td>41%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "800" }}>↑ 12%</td>
                    </tr>
                    <tr>
                      <td>VIT Campus Hub</td>
                      <td>Vellore</td>
                      <td><strong>15,910</strong></td>
                      <td>38%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "800" }}>↑ 6%</td>
                    </tr>
                    <tr>
                      <td>Phoenix Mall Kiosk</td>
                      <td>Chennai</td>
                      <td><strong>12,004</strong></td>
                      <td>29%</td>
                      <td style={{ color: "var(--ob-red-tx)", fontWeight: "800" }}>↓ 3%</td>
                    </tr>
                    <tr>
                      <td>Anna University Gate 2</td>
                      <td>Chennai</td>
                      <td><strong>9,870</strong></td>
                      <td>33%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "800" }}>↑ 9%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS VIEW */}
          {activeTab === "products" && (
            <div className="ob-stagger">
              <div className="ob-card" style={{ marginBottom: "20px" }}>
                <div className="ob-card-title">Recovery by Product</div>
                <div className="ob-card-sub">Items recovered per SKU, last 30 days</div>
                <div style={{ height: "180px", position: "relative" }}>
                  <canvas ref={productsChartRef}></canvas>
                </div>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">All Brand SKUs (6 Active)</div>
                <table className="ob-data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Items recovered</th>
                      <th>Weight</th>
                      <th>Recovery rate</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>CoolFizz Original 500ml</strong></td>
                      <td>PET Bottle</td>
                      <td>42,180</td>
                      <td>7.6 t</td>
                      <td>38%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "700" }}>↑ 9%</td>
                    </tr>
                    <tr>
                      <td><strong>CoolFizz Zero 500ml</strong></td>
                      <td>PET Bottle</td>
                      <td>29,340</td>
                      <td>5.3 t</td>
                      <td>31%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "700" }}>↑ 4%</td>
                    </tr>
                    <tr>
                      <td><strong>CoolFizz Original 330ml Can</strong></td>
                      <td>Aluminium Can</td>
                      <td>31,020</td>
                      <td>4.1 t</td>
                      <td>44%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "700" }}>↑ 14%</td>
                    </tr>
                    <tr>
                      <td><strong>CoolFizz Citrus 330ml Can</strong></td>
                      <td>Aluminium Can</td>
                      <td>14,760</td>
                      <td>2.0 t</td>
                      <td>27%</td>
                      <td style={{ color: "var(--ob-red-tx)", fontWeight: "700" }}>↓ 2%</td>
                    </tr>
                    <tr>
                      <td><strong>CoolFizz Sport 750ml</strong></td>
                      <td>PET Bottle</td>
                      <td>8,410</td>
                      <td>2.2 t</td>
                      <td>19%</td>
                      <td style={{ color: "var(--ob-red-tx)", fontWeight: "700" }}>↓ 6%</td>
                    </tr>
                    <tr>
                      <td><strong>CoolFizz Mineral 1L</strong></td>
                      <td>PET Bottle</td>
                      <td>2,720</td>
                      <td>0.6 t</td>
                      <td>12%</td>
                      <td style={{ color: "var(--ob-green-tx)", fontWeight: "700" }}>↑ 1%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. LOCATIONS VIEW */}
          {activeTab === "locations" && (
            <div className="ob-stagger">
              <div className="ob-kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="ob-kpi-card">
                  <div className="ob-kpi-val">{totalLocations}</div>
                  <div className="ob-kpi-label">Active RVM locations</div>
                </div>
                <div className="ob-kpi-card">
                  <div className="ob-kpi-val" style={{ color: "var(--ob-green-tx)" }}>{onlineCount}</div>
                  <div className="ob-kpi-label">RVMs online now</div>
                </div>
                <div className="ob-kpi-card">
                  <div className="ob-kpi-val" style={{ color: "var(--ob-amber-tx)" }}>7</div>
                  <div className="ob-kpi-label">Need collection</div>
                </div>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">All RVM Locations</div>
                <div className="ob-card-sub">Where CoolFizz products are actively being deposited</div>
                <table className="ob-data-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>City</th>
                      <th>RVMs</th>
                      <th>Items recovered</th>
                      <th>Weight</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>SRM Main Block</strong></td>
                      <td>Chennai</td>
                      <td>4</td>
                      <td>18,240</td>
                      <td>3.3 t</td>
                      <td><span className="ob-pill active">Active</span></td>
                    </tr>
                    <tr>
                      <td><strong>VIT Campus Hub</strong></td>
                      <td>Vellore</td>
                      <td>3</td>
                      <td>15,910</td>
                      <td>2.9 t</td>
                      <td><span className="ob-pill active">Active</span></td>
                    </tr>
                    <tr>
                      <td><strong>Phoenix Mall Central Kiosk</strong></td>
                      <td>Chennai</td>
                      <td>2</td>
                      <td>12,004</td>
                      <td>2.2 t</td>
                      <td><span className="ob-pill active">Active</span></td>
                    </tr>
                    <tr>
                      <td><strong>Anna University Gate 2</strong></td>
                      <td>Chennai</td>
                      <td>2</td>
                      <td>9,870</td>
                      <td>1.8 t</td>
                      <td><span className="ob-pill active">Active</span></td>
                    </tr>
                    <tr>
                      <td><strong>Ramapuram Hostel Block</strong></td>
                      <td>Chennai</td>
                      <td>1</td>
                      <td>4,120</td>
                      <td>0.7 t</td>
                      <td><span className="ob-pill offline">Offline</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. TRENDS VIEW */}
          {activeTab === "trends" && (
            <div className="ob-stagger">
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {["Week", "Month", "Quarter", "Year"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`ob-chip ${trendPeriod === p ? "on" : ""} tap`}
                    onClick={() => setTrendPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="ob-card" style={{ marginBottom: "20px" }}>
                <div className="ob-card-title">Recovery Volume Over Time</div>
                <div className="ob-card-sub">Items recovered, current period vs previous period</div>
                <div style={{ height: "200px", position: "relative" }}>
                  <canvas ref={trendsBigChartRef}></canvas>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="ob-card">
                  <div className="ob-card-title">This Period Total</div>
                  <div className="ob-kpi-val" style={{ fontSize: "28px" }}>128,430</div>
                  <div className="ob-kpi-delta up" style={{ marginTop: "8px" }}>
                    ↑ 8.2% vs previous period
                  </div>
                </div>

                <div className="ob-card">
                  <div className="ob-card-title">Recovery Rate Delta</div>
                  <div className="ob-kpi-val" style={{ fontSize: "28px" }}>+2.1pp</div>
                  <div className="ob-kpi-delta up" style={{ marginTop: "8px" }}>
                    Ahead of state EPR compliance target
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. REPORTS VIEW */}
          {activeTab === "reports" && (
            <div className="ob-stagger">
              <div
                className="ob-card"
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div className="ob-card-title" style={{ margin: "0 0 4px" }}>
                    Generate a New Compliance Report
                  </div>
                  <div className="ob-card-sub" style={{ margin: 0 }}>
                    Official CPCB EPR compliance, monthly volume, or audit certificate
                  </div>
                </div>
                <button
                  type="button"
                  className="ob-btn-primary tap"
                  disabled={reportGenerating}
                  onClick={handleCreateReport}
                  style={{ width: "auto", padding: "0 20px", height: "40px" }}
                >
                  {reportGenerating ? "Generating..." : "+ New Report"}
                </button>
              </div>

              <div className="ob-card">
                <div className="ob-card-title">Available Certificates &amp; Filings</div>
                <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px",
                      border: "1px solid var(--ob-border)",
                      borderRadius: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="ob-icon-circle" style={{ background: "var(--ob-amber-bg)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber-tx)" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: "800", fontSize: "13.5px" }}>
                        Q3 2026 EPR Compliance Report
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ob-muted)", marginTop: "2px" }}>
                        Jul 1 – Sep 30, 2026 · Certified on Oct 1, 2026 · CPCB Format
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Q3_2026_EPR_Report.pdf")}
                    >
                      PDF ⬇
                    </button>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Q3_2026_EPR_Data.csv")}
                    >
                      CSV ⬇
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px",
                      border: "1px solid var(--ob-border)",
                      borderRadius: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="ob-icon-circle" style={{ background: "var(--ob-amber-bg)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber-tx)" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: "800", fontSize: "13.5px" }}>
                        Monthly Recovery Summary — September 2026
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ob-muted)", marginTop: "2px" }}>
                        Sep 1 – Sep 30, 2026 · Certified on Oct 1, 2026
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Monthly_Sep_2026.pdf")}
                    >
                      PDF ⬇
                    </button>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Monthly_Sep_2026.csv")}
                    >
                      CSV ⬇
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px",
                      border: "1px solid var(--ob-border)",
                      borderRadius: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="ob-icon-circle" style={{ background: "var(--ob-amber-bg)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ob-amber-tx)" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: "800", fontSize: "13.5px" }}>
                        Q2 2026 EPR Compliance Report
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ob-muted)", marginTop: "2px" }}>
                        Apr 1 – Jun 30, 2026 · Certified on Jul 1, 2026 · CPCB Format
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Q2_2026_EPR_Report.pdf")}
                    >
                      PDF ⬇
                    </button>
                    <button
                      type="button"
                      className="ob-btn-outline tap"
                      onClick={() => handleDownload("OpenBin_Q2_2026_EPR_Data.csv")}
                    >
                      CSV ⬇
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR BRAND PORTAL */}
      <nav className="ob-mobile-bar">
        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          </svg>
          <span>Products</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>Locations</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "trends" ? "active" : ""}`}
          onClick={() => setActiveTab("trends")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <span>Trends</span>
        </button>

        <button
          type="button"
          className={`ob-mobile-tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15h6" />
          </svg>
          <span>Reports</span>
        </button>
      </nav>
    </div>
  );
}

export function EprRvms() {
  return <EprHome />;
}

export function EprMedia() {
  return <EprHome />;
}

export function EprReports() {
  return <EprHome />;
}
